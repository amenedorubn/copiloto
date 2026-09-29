package io.github.amenedorubn.copiloto;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * El GPS del entreno con la pantalla apagada (como OpenTracks o Strava): un servicio en
 * primer plano con su notificacion fija. Las posiciones las da Android (LocationManager)
 * y se pasan a la web, que hace todo lo demas como siempre (enganche a la ruta, avisos).
 *
 * Con la pantalla apagada el WebView sigue corriendo (Capacitor no lo pausa), pero sus
 * temporizadores van frenados: la web vuelve a pintar con cada posicion que llega. Si aun
 * asi la web deja de responder (no llega su "latido"), el servicio lo dice en voz alta.
 *
 * La notificacion enseña lo que manda la web (km, tiempo, ritmo) con dos botones:
 * Pausa/Seguir y "¿Como voy?". Todo lo que pasa se apunta en el informe de la salida.
 */
public class CarreraService extends Service {
    private static final String TAG = "Copiloto";
    static final String CANAL = "carrera";
    static final int ID = 7;
    static final String EMPIEZA = "empieza", PAUSA = "pausa", COMO_VOY = "comovoy";
    /** Posiciones de prueba por USB: solo las puede mandar adb (hace falta el permiso DUMP). */
    static final String PRUEBA = "io.github.amenedorubn.copiloto.PRUEBA_GPS";

    /** Quien recibe lo que pasa (el plugin). */
    interface Oyente {
        void posicion(Location l, boolean prueba);

        void accion(String que);

        void pantalla(boolean encendida);

        void avisoNativo(String texto);
    }

    static volatile CarreraService vivo;
    static volatile Oyente oyente;

    private final Handler h = new Handler(Looper.getMainLooper());
    private LocationManager lm;
    private PowerManager.WakeLock cerrojo;
    private boolean escuchando = false;
    private long ultimoGps = 0, ultimaRed = 0, ultimoLatido = 0, ultimoParado = 0, inicio = 0;
    private int fixesMin = 0, fixesTotal = 0;
    private float accMin = 0;
    private long latidoMax = 0;
    private boolean corriendo = false, pausado = false, avisadoSinGps = false;
    private String titulo = "GPS en marcha", texto = "Buscando señal…";
    private long ultimaNoti = 0;

    // prueba por USB: una ruta recorrida a un ritmo, cada segundo
    private List<double[]> rutaPrueba = null;
    private double sPrueba = 0, ritmoPrueba = 400;
    private final Random azar = new Random();

    private final LocationListener gps = new Oyendo(false);
    private final LocationListener red = new Oyendo(true);

    private class Oyendo implements LocationListener {
        final boolean esRed;

        Oyendo(boolean r) {
            esRed = r;
        }

        @Override
        public void onLocationChanged(Location l) {
            if (rutaPrueba != null) return; // en la prueba solo cuenta la ruta inventada
            long ahora = SystemClock.elapsedRealtime();
            if (esRed) {
                ultimaRed = ahora;
                if (ahora - ultimoGps < 10000) return; // la de red, solo hasta que haya GPS
            } else {
                if (ultimoGps == 0) Informe.linea("gps", "primera posición · " + Math.round(l.getAccuracy()) + " m");
                ultimoGps = ahora;
            }
            entrega(l, false);
        }

        @Override
        public void onStatusChanged(String p, int s, Bundle b) {}

        @Override
        public void onProviderEnabled(String p) {
            Informe.linea("gps", p + " encendido");
        }

        @Override
        public void onProviderDisabled(String p) {
            Informe.linea("gps", p + " APAGADO en Ajustes");
        }
    }

    private void entrega(Location l, boolean prueba) {
        fixesMin++;
        fixesTotal++;
        accMin += l.getAccuracy();
        avisadoSinGps = false;
        Oyente o = oyente;
        if (o != null) o.posicion(l, prueba);
    }

    private final BroadcastReceiver pantalla = new BroadcastReceiver() {
        @Override
        public void onReceive(Context c, Intent i) {
            boolean on = Intent.ACTION_SCREEN_ON.equals(i.getAction());
            Informe.linea("pantalla", on ? "encendida" : "apagada");
            Oyente o = oyente;
            if (o != null) o.pantalla(on);
        }
    };

    private final BroadcastReceiver prueba = new BroadcastReceiver() {
        @Override
        public void onReceive(Context c, Intent i) {
            empiezaPrueba(i);
        }
    };

    /** Cada 10 s: resumen para el informe, GPS perdido y web parada. */
    private final Runnable vigila = new Runnable() {
        private int vueltas = 0;

        @Override
        public void run() {
            long ahora = SystemClock.elapsedRealtime();
            if (++vueltas % 6 == 0) {
                Informe.linea("gps", fixesMin + " posiciones/min" + (fixesMin > 0 ? " · " + Math.round(accMin / fixesMin) + " m" : "")
                    + " · web: " + (latidoMax / 1000) + " s máx sin latido" + " · batería " + bateria() + " %");
                fixesMin = 0;
                accMin = 0;
                latidoMax = 0;
            }
            long ultimo = Math.max(ultimoGps, rutaPrueba != null ? ahora : 0);
            if (corriendo && !pausado && ultimo > 0 && ahora - ultimo > 20000 && !avisadoSinGps) {
                avisadoSinGps = true;
                Informe.linea("gps", "sin posiciones desde hace " + ((ahora - ultimo) / 1000) + " s");
            }
            if (corriendo && !pausado && ultimoLatido > 0 && ahora - ultimoLatido > 45000 && ahora - ultimoParado > 180000) {
                ultimoParado = ahora;
                Informe.linea("web", "PARADA: " + ((ahora - ultimoLatido) / 1000) + " s sin latido");
                Oyente o = oyente;
                if (o != null) o.avisoNativo("Aviso de Copiloto: la app se ha quedado parada. Enciende la pantalla.");
            }
            h.postDelayed(this, 10000);
        }
    };

    private final Runnable pasoPrueba = new Runnable() {
        private long antes = 0;

        @Override
        public void run() {
            if (rutaPrueba == null) return;
            long ahora = SystemClock.elapsedRealtime();
            double dt = antes == 0 ? 1 : Math.min(3, (ahora - antes) / 1000.0);
            antes = ahora;
            double v = 1000.0 / ritmoPrueba;
            if (corriendo && !pausado) sPrueba += v * dt;
            double[] p = puntoPrueba(sPrueba);
            Location l = new Location("prueba");
            double ex = (azar.nextDouble() - 0.5) * 8, ey = (azar.nextDouble() - 0.5) * 8;
            l.setLatitude(p[0] + ey / 110574.0);
            l.setLongitude(p[1] + ex / (111320.0 * Math.cos(Math.toRadians(p[0]))));
            l.setAccuracy(6f);
            l.setSpeed((float) (corriendo && !pausado ? v + (azar.nextDouble() - 0.5) * 0.5 : 0));
            l.setTime(System.currentTimeMillis());
            l.setElapsedRealtimeNanos(SystemClock.elapsedRealtimeNanos());
            entrega(l, true);
            h.postDelayed(this, 1000);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        creaCanal();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String a = intent == null ? null : intent.getAction();
        if (PAUSA.equals(a) || COMO_VOY.equals(a)) {
            Informe.linea("notificación", PAUSA.equals(a) ? (pausado ? "seguir" : "pausa") : "¿cómo voy?");
            Oyente o = oyente;
            if (o != null) o.accion(a);
            return START_NOT_STICKY;
        }
        if (vivo == this) return START_NOT_STICKY; // ya estaba en marcha
        try {
            Notification n = notificacion();
            if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            else startForeground(ID, n);
        } catch (Throwable e) {
            // sin permiso de ubicacion Android no deja: la web sigue con el GPS del navegador
            Log.e(TAG, "servicio GPS", e);
            stopSelf();
            return START_NOT_STICKY;
        }
        vivo = this;
        inicio = SystemClock.elapsedRealtime();
        Informe.abre(this);
        Informe.linea("servicio", "empieza · batería " + bateria() + " % · app " + version());
        Informe.linea("móvil", Build.MANUFACTURER + " " + Build.MODEL + " · Android " + Build.VERSION.RELEASE + " · WebView " + webView());
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        cerrojo = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "copiloto:carrera");
        cerrojo.setReferenceCounted(false);
        cerrojo.acquire(8 * 3600 * 1000L);
        escucha();
        ContextCompat.registerReceiver(this, pantalla, filtroPantalla(), ContextCompat.RECEIVER_NOT_EXPORTED);
        ContextCompat.registerReceiver(this, prueba, new IntentFilter(PRUEBA), Manifest.permission.DUMP, null, ContextCompat.RECEIVER_EXPORTED);
        h.postDelayed(vigila, 10000);
        return START_NOT_STICKY;
    }

    private static IntentFilter filtroPantalla() {
        IntentFilter f = new IntentFilter(Intent.ACTION_SCREEN_OFF);
        f.addAction(Intent.ACTION_SCREEN_ON);
        return f;
    }

    private void escucha() {
        if (escuchando || lm == null) return;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            Informe.linea("gps", "sin permiso de ubicación");
            return;
        }
        try {
            if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER))
                lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 0f, gps, Looper.getMainLooper());
            else Informe.linea("gps", "el GPS está apagado en Ajustes");
            if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER))
                lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 2000L, 0f, red, Looper.getMainLooper());
            escuchando = true;
        } catch (SecurityException | IllegalArgumentException e) {
            Log.e(TAG, "gps", e);
            Informe.linea("gps", "no arranca: " + e.getMessage());
        }
    }

    @Override
    public void onDestroy() {
        if (vivo == this) vivo = null;
        h.removeCallbacksAndMessages(null);
        rutaPrueba = null;
        try {
            if (lm != null) {
                lm.removeUpdates(gps);
                lm.removeUpdates(red);
            }
        } catch (Throwable e) {
            // ya quitado
        }
        try {
            unregisterReceiver(pantalla);
            unregisterReceiver(prueba);
        } catch (Throwable e) {
            // no estaba
        }
        if (cerrojo != null && cerrojo.isHeld()) cerrojo.release();
        long min = (SystemClock.elapsedRealtime() - inicio) / 60000;
        Informe.linea("servicio", "para · batería " + bateria() + " % · " + min + " min · " + fixesTotal + " posiciones");
        Informe.cierra();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /* ------------------------ lo que manda la web ------------------------ */

    /** La web: en que va la carrera y que enseñar. Tambien es su latido. */
    void actualiza(boolean corre, boolean pausa, String t, String x) {
        long ahora = SystemClock.elapsedRealtime();
        if (ultimoLatido > 0) latidoMax = Math.max(latidoMax, ahora - ultimoLatido);
        ultimoLatido = ahora;
        boolean estado = corre != corriendo || pausa != pausado;
        if (estado) {
            Informe.linea("carrera", (!corre ? "sin empezar" : pausa ? "en pausa" : "en marcha") + " · batería " + bateria() + " %");
        }
        boolean cambia = estado || !igual(t, titulo) || !igual(x, texto);
        corriendo = corre;
        pausado = pausa;
        if (t != null) titulo = t;
        if (x != null) texto = x;
        // la notificacion, como mucho cada 2 s (salvo pausa/seguir, que va al momento)
        if (cambia && (estado || ahora - ultimaNoti > 2000)) {
            ultimaNoti = ahora;
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            try {
                nm.notify(ID, notificacion());
            } catch (Throwable e) {
                Log.e(TAG, "notificacion", e);
            }
        }
    }

    private static boolean igual(String a, String b) {
        return a == null ? b == null : a.equals(b);
    }

    /** La version del WebView (Chrome) que pinta la web: cambia sola con Play y puede cambiar cosas. */
    private static String webView() {
        try {
            android.content.pm.PackageInfo p = Build.VERSION.SDK_INT >= 26 ? android.webkit.WebView.getCurrentWebViewPackage() : null;
            return p == null ? "?" : p.versionName;
        } catch (Throwable e) {
            return "?";
        }
    }

    private String version() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Throwable e) {
            return "?";
        }
    }

    int bateria() {
        BatteryManager b = (BatteryManager) getSystemService(Context.BATTERY_SERVICE);
        return b == null ? -1 : b.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
    }

    /* ---------------------------- notificacion ---------------------------- */

    private void creaCanal() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel c = new NotificationChannel(CANAL, "Entreno en marcha", NotificationManager.IMPORTANCE_DEFAULT);
        c.setDescription("Km, tiempo y ritmo mientras corres, con pausa y «¿Cómo voy?»");
        c.setSound(null, null);
        c.enableVibration(false);
        c.setShowBadge(false);
        c.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        nm.createNotificationChannel(c);
    }

    private PendingIntent accion(String a, int n) {
        Intent i = new Intent(this, CarreraService.class).setAction(a);
        return PendingIntent.getService(this, n, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private Notification notificacion() {
        Intent abre = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (abre == null) abre = new Intent(this, MainActivity.class);
        abre.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, abre, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CANAL)
            .setSmallIcon(R.drawable.ic_stat_copiloto)
            .setContentTitle(titulo)
            .setContentText(texto)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(texto))
            .setContentIntent(pi)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(0xFF2FC46A)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        if (corriendo) {
            b.addAction(0, pausado ? "Seguir" : "Pausa", accion(PAUSA, 1));
            if (!pausado) b.addAction(0, "¿Cómo voy?", accion(COMO_VOY, 2));
        }
        return b.build();
    }

    /* ------------------------- prueba por USB -------------------------
       adb shell am broadcast -a io.github.amenedorubn.copiloto.PRUEBA_GPS
           --es gpx rutas/6K_ZAPATOCA.gpx --es ritmo 400 [--es desde 0] | --es parar 1
       Recorre esa ruta (de la web que va en el APK) al ritmo dicho, en s/km.          */

    private void empiezaPrueba(Intent i) {
        if (i.getStringExtra("parar") != null) {
            rutaPrueba = null;
            h.removeCallbacks(pasoPrueba);
            Informe.linea("prueba", "fin");
            return;
        }
        String gpx = i.getStringExtra("gpx");
        if (gpx == null) return;
        try (InputStream in = getAssets().open("public/" + gpx)) {
            String s = new String(leeTodo(in), StandardCharsets.UTF_8);
            Matcher m = Pattern.compile("<trkpt[^>]*lat=\"([-0-9.]+)\"[^>]*lon=\"([-0-9.]+)\"").matcher(s);
            List<double[]> r = new ArrayList<>();
            double acum = 0;
            double[] ant = null;
            while (m.find()) {
                double la = Double.parseDouble(m.group(1)), lo = Double.parseDouble(m.group(2));
                if (ant != null) acum += metros(ant[0], ant[1], la, lo);
                double[] p = { la, lo, acum };
                r.add(p);
                ant = p;
            }
            if (r.size() < 2) throw new IllegalStateException("ruta vacia");
            ritmoPrueba = num(i.getStringExtra("ritmo"), 400);
            sPrueba = num(i.getStringExtra("desde"), 0);
            rutaPrueba = r;
            h.removeCallbacks(pasoPrueba);
            h.post(pasoPrueba);
            Informe.linea("prueba", gpx + " a " + (int) ritmoPrueba + " s/km desde " + (int) sPrueba + " m (" + Math.round(acum) + " m)");
        } catch (Throwable e) {
            Log.e(TAG, "prueba", e);
            Informe.linea("prueba", "no arranca: " + e.getMessage());
        }
    }

    private double[] puntoPrueba(double s) {
        List<double[]> r = rutaPrueba;
        double total = r.get(r.size() - 1)[2];
        s = Math.max(0, Math.min(total, s));
        for (int k = 1; k < r.size(); k++) {
            double[] a = r.get(k - 1), b = r.get(k);
            if (b[2] >= s) {
                double f = b[2] > a[2] ? (s - a[2]) / (b[2] - a[2]) : 0;
                return new double[] { a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f };
            }
        }
        double[] u = r.get(r.size() - 1);
        return new double[] { u[0], u[1] };
    }

    private static double num(String s, double def) {
        try {
            return s == null ? def : Double.parseDouble(s.trim().replace(',', '.'));
        } catch (NumberFormatException e) {
            return def;
        }
    }

    static double metros(double la1, double lo1, double la2, double lo2) {
        double R = 6371000, f1 = Math.toRadians(la1), f2 = Math.toRadians(la2);
        double df = f2 - f1, dl = Math.toRadians(lo2 - lo1);
        double a = Math.sin(df / 2) * Math.sin(df / 2) + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        return 2 * R * Math.asin(Math.sqrt(a));
    }

    private static byte[] leeTodo(InputStream in) throws java.io.IOException {
        java.io.ByteArrayOutputStream o = new java.io.ByteArrayOutputStream();
        byte[] b = new byte[16384];
        int n;
        while ((n = in.read(b)) > 0) o.write(b, 0, n);
        return o.toByteArray();
    }
}
