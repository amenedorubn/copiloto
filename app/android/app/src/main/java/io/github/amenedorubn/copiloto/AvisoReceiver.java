package io.github.amenedorubn.copiloto;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Los avisos de Cocina: el tupper la noche antes, el bote de avena al salir... La web manda la
 * lista cada vez que baja el calendario (Cocina.avisosComida) y aqui se programan con
 * AlarmManager: suenan como notificacion aunque la app este cerrada. La lista se guarda para
 * volver a ponerla al reiniciar el movil (ArranqueReceiver). "En 30 min" la vuelve a poner.
 */
public class AvisoReceiver extends BroadcastReceiver {
    private static final String TAG = "Copiloto";
    static final String CANAL = "cocina";
    private static final String ACCION = "io.github.amenedorubn.copiloto.AVISO";
    private static final String PREFS = "avisos";

    @Override
    public void onReceive(Context c, Intent i) {
        String id = i.getStringExtra("id"), que = i.getStringExtra("que");
        if (id == null) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if ("hecho".equals(que)) {
            nm.cancel(id.hashCode());
            return;
        }
        String titulo = i.getStringExtra("titulo"), texto = i.getStringExtra("texto");
        if ("luego".equals(que)) {
            nm.cancel(id.hashCode());
            pon(c, id + ":luego", System.currentTimeMillis() + 30 * 60 * 1000L, titulo, texto);
            return;
        }
        muestra(c, id, titulo, texto);
    }

    static void muestra(Context c, String id, String titulo, String texto) {
        creaCanal(c);
        Intent abre = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (abre == null) abre = new Intent(c, MainActivity.class);
        abre.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, id.hashCode(), abre, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CANAL)
            .setSmallIcon(R.drawable.ic_stat_olla)
            .setContentTitle(titulo)
            .setContentText(texto)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(texto))
            .setContentIntent(pi)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(0xFFF08A4B)
            .addAction(0, "Hecho", accion(c, id, "hecho", titulo, texto))
            .addAction(0, "En 30 min", accion(c, id, "luego", titulo, texto));
        try {
            ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(id.hashCode(), b.build());
        } catch (Throwable e) {
            Log.e(TAG, "aviso", e);
        }
    }

    private static PendingIntent accion(Context c, String id, String que, String titulo, String texto) {
        Intent i = new Intent(c, AvisoReceiver.class).setAction(ACCION + "." + que)
            .putExtra("id", id).putExtra("que", que).putExtra("titulo", titulo).putExtra("texto", texto);
        return PendingIntent.getBroadcast(c, (id + que).hashCode(), i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static void creaCanal(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel ch = new NotificationChannel(CANAL, "Avisos de cocina", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("El tupper la noche antes, el bote de avena al salir");
        ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(ch);
    }

    private static PendingIntent alarma(Context c, String id, String titulo, String texto) {
        Intent i = new Intent(c, AvisoReceiver.class).setAction(ACCION).putExtra("id", id).putExtra("titulo", titulo).putExtra("texto", texto);
        return PendingIntent.getBroadcast(c, id.hashCode(), i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Un aviso a su hora (sin permiso de alarma exacta: puede llegar unos minutos tarde). */
    static void pon(Context c, String id, long cuando, String titulo, String texto) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = alarma(c, id, titulo, texto);
        if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cuando, pi);
        else am.set(AlarmManager.RTC_WAKEUP, cuando, pi);
    }

    /** La lista entera de la web ([{id, cuando, titulo, texto}]): quita los de antes y pone estos. */
    static int programa(Context c, String json) {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        int n = 0;
        try {
            JSONArray viejos = new JSONArray(p.getString("lista", "[]"));
            for (int k = 0; k < viejos.length(); k++) {
                JSONObject a = viejos.getJSONObject(k);
                if (am != null) am.cancel(alarma(c, a.getString("id"), a.optString("titulo"), a.optString("texto")));
            }
            JSONArray nuevos = new JSONArray(json == null ? "[]" : json), guardar = new JSONArray();
            long ahora = System.currentTimeMillis();
            for (int k = 0; k < nuevos.length(); k++) {
                JSONObject a = nuevos.getJSONObject(k);
                long cuando = a.optLong("cuando", 0);
                if (cuando <= ahora) continue;
                pon(c, a.getString("id"), cuando, a.optString("titulo", "Copiloto"), a.optString("texto", ""));
                guardar.put(a);
                n++;
            }
            p.edit().putString("lista", guardar.toString()).apply();
        } catch (Throwable e) {
            Log.e(TAG, "avisos", e);
        }
        return n;
    }

    /** Tras reiniciar el movil (o actualizar la app) las alarmas se pierden: se vuelven a poner. */
    static void reprograma(Context c) {
        programa(c, c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("lista", "[]"));
    }
}
