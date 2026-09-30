package io.github.amenedorubn.copiloto;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.location.Location;
import android.net.Uri;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;
import android.view.WindowManager;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.content.pm.PackageInfoCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.k2fsa.sherpa.onnx.GeneratedAudio;
import com.k2fsa.sherpa.onnx.OfflineTts;
import com.k2fsa.sherpa.onnx.OfflineTtsConfig;
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig;
import com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Lo nativo de Copiloto: la voz, la pantalla encendida, el GPS con la pantalla apagada
 * (CarreraService), el informe de cada salida (Informe) y el APK nuevo sin cable.
 *
 * Voz: la del movil (TextToSpeech, la que el usuario tiene elegida) o la neuronal
 * que va dentro de la app (Piper "Miro", es-ES, con sherpa-onnx), segun pida la web.
 * Si la elegida no esta, la otra. En los dos casos pide el foco de
 * audio transitorio y con uso "guia de navegacion", como las apps de navegacion:
 * la musica baja (o se pausa, si se elige asi) mientras habla y vuelve sola al
 * acabar. El foco se retiene desde el pitido hasta el final de la frase y se
 * suelta un poco despues, para que la musica no suba y baje entre medias.
 *
 * hablar() es una llamada de callback: responde {evento:"inicio"} cuando
 * empieza a sonar y despues una sola vez {evento:"fin"|"cortada"|"error"}.
 * Una frase nueva corta la anterior (como speechSynthesis.cancel + speak).
 */
@CapacitorPlugin(name = "Copiloto")
public class CopilotoPlugin extends Plugin implements CarreraService.Oyente {
    private static final String TAG = "Copiloto";
    private static final String VOZ = "voz";
    private static final String MODELO = VOZ + "/es_ES-miro-high.onnx";
    private static final String TOKENS = VOZ + "/tokens.txt";
    private static final String DATOS = VOZ + "/espeak-ng-data";

    private final ExecutorService hilo = Executors.newSingleThreadExecutor();
    private final AtomicInteger turno = new AtomicInteger();
    private final Map<String, Frase> delSistema = new ConcurrentHashMap<>();

    private volatile OfflineTts neural;
    private volatile String estadoNeural = "cargando";
    private volatile TextToSpeech sistema;
    private volatile boolean sistemaListo = false;
    private volatile AudioTrack pista;

    private AudioManager audio;
    private AudioAttributes atributos;
    private Object focoBaja; // AudioFocusRequest (API 26+): la musica baja
    private Object focoPausa; // AudioFocusRequest (API 26+): la musica se pausa y sigue sola
    private Object focoTenido; // con cual se tiene ahora (null: sin foco)
    private final AudioManager.OnAudioFocusChangeListener escucha = cambio -> {};
    private final Handler principal = new Handler(Looper.getMainLooper());
    private final Runnable sueltaFocoTarea = this::sueltaFocoYa;
    private final ExecutorService sonidos = Executors.newSingleThreadExecutor();
    private final ExecutorService descargas = Executors.newSingleThreadExecutor();
    private boolean permisosPedidos = false;
    private Boolean enBloqueo = null;

    /** Una frase: su llamada, su turno y si ya se ha cerrado. */
    private static class Frase {
        final PluginCall call;
        final int turno;
        final AtomicBoolean cerrada = new AtomicBoolean(false);
        String texto = "";
        float velocidad = 1f;
        int musica = 0;

        Frase(PluginCall c, int t) {
            call = c;
            turno = t;
        }
    }

    @Override
    public void load() {
        CarreraService.oyente = this;
        audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        atributos = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build();
        if (Build.VERSION.SDK_INT >= 26) {
            focoBaja = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(atributos)
                .setOnAudioFocusChangeListener(escucha)
                .build();
            focoPausa = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(atributos)
                .setOnAudioFocusChangeListener(escucha)
                .build();
        }
        // la voz carga despues de que arranque la app y sin quitarle CPU (en un movil lento
        // o en el emulador, cargarla a la vez que el WebView llegaba a bloquear el arranque)
        hilo.execute(() -> {
            android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_BACKGROUND);
            try {
                Thread.sleep(2500);
                cargaNeural();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_DEFAULT);
            }
        });
        iniciaSistema();
    }

    /** La voz del movil (TextToSpeech). Se vuelve a crear si falla: Android puede cerrar su motor. */
    private void iniciaSistema() {
        final TextToSpeech[] tts = new TextToSpeech[1];
        tts[0] = new TextToSpeech(getContext(), estado -> {
            if (estado != TextToSpeech.SUCCESS) return;
            TextToSpeech s = tts[0];
            int r = s.setLanguage(Locale.forLanguageTag("es-ES"));
            if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                s.setLanguage(Locale.forLanguageTag("es"));
            }
            s.setAudioAttributes(atributos);
            s.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String id) {
                    Frase f = delSistema.get(id);
                    if (f != null) emite(f, "inicio", null);
                }

                @Override
                public void onDone(String id) {
                    if (id != null && id.startsWith("aviso")) {
                        sueltaFocoLuego();
                        return;
                    }
                    Frase f = delSistema.remove(id);
                    if (f == null) return;
                    if (f.turno == turno.get()) sueltaFocoLuego();
                    cierra(f, "fin", null);
                }

                @Override
                public void onError(String id) {
                    Frase f = delSistema.remove(id);
                    if (f != null) fallaSistema(f, "sistema");
                }

                @Override
                public void onError(String id, int codigo) {
                    Frase f = delSistema.remove(id);
                    if (f != null) fallaSistema(f, "sistema " + codigo);
                }

                @Override
                public void onStop(String id, boolean interrumpida) {
                    Frase f = delSistema.remove(id);
                    if (f != null) cierra(f, "cortada", null);
                }
            });
            sistema = s;
            sistemaListo = true;
        });
        if (sistema == null) sistema = tts[0];
    }

    private long ultimoReinicio = 0;

    /**
     * La voz del movil fallo (30/09: la primera frase de la salida dio error y la web se paso
     * al audio, que corta Spotify). Esa frase la dice Miro, si esta, y el motor del movil se
     * vuelve a arrancar (como mucho una vez cada 30 s) para las siguientes.
     */
    private void fallaSistema(Frase f, String error) {
        if (Informe.abierto()) Informe.linea("voz", "la del móvil falla (" + error + "): la dice Miro y se reinicia");
        reiniciaSistema();
        final OfflineTts t = neural;
        if (t != null && f.turno == turno.get() && !f.cerrada.get()) {
            hilo.execute(() -> {
                try {
                    suena(f, t.generate(f.texto, 0, f.velocidad), f.musica);
                } catch (Throwable e) {
                    Log.e(TAG, "voz neuronal tras fallo", e);
                    cierra(f, "error", error);
                }
            });
            return;
        }
        cierra(f, "error", error);
    }

    private synchronized void reiniciaSistema() {
        long ahora = System.currentTimeMillis();
        if (ahora - ultimoReinicio < 30000) return;
        ultimoReinicio = ahora;
        final TextToSpeech viejo = sistema;
        sistemaListo = false;
        principal.post(() -> {
            try {
                if (viejo != null) viejo.shutdown();
            } catch (Throwable e) {
                // ya cerrado
            }
            sistema = null;
            iniciaSistema();
        });
    }

    /* ------------------------------ voz ------------------------------ */

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void hablar(PluginCall call) {
        call.setKeepAlive(true);
        final String texto = call.getString("texto", "");
        Float v = call.getFloat("velocidad", 1f);
        final float velocidad = Math.max(0.5f, Math.min(2f, v == null ? 1f : v));
        final int musica = modo(call);
        final boolean delMovil = !"miro".equals(call.getString("voz", "miro"));
        final Frase f = new Frase(call, turno.incrementAndGet());
        f.texto = texto == null ? "" : texto;
        f.velocidad = velocidad;
        f.musica = musica;
        if (Informe.abierto()) Informe.linea("voz", "pide «" + corto(texto) + "» · " + (delMovil ? "móvil" : "miro"));
        corta(); // la frase nueva corta la anterior
        if (texto == null || texto.trim().isEmpty()) {
            cierra(f, "fin", null);
            return;
        }
        retenFoco(musica); // la musica baja ya, mientras se genera la frase
        hilo.execute(() -> {
            if (f.turno != turno.get()) {
                cierra(f, "cortada", null);
                return;
            }
            if (delMovil && sistemaListo) { // la voz del movil, si esta lista
                hablaSistema(f, texto, velocidad, musica);
                return;
            }
            OfflineTts t = neural;
            if (t != null) {
                try {
                    suena(f, t.generate(texto, 0, velocidad), musica);
                    return;
                } catch (Throwable e) {
                    Log.e(TAG, "voz neuronal: frase", e);
                    if (f.cerrada.get()) return;
                }
            }
            if (f.turno != turno.get()) {
                cierra(f, "cortada", null);
                return;
            }
            hablaSistema(f, texto, velocidad, musica);
        });
    }

    @PluginMethod
    public void callar(PluginCall call) {
        turno.incrementAndGet();
        corta();
        sueltaFocoLuego(); // si detras viene otra frase (cancel + speak), la musica no llega a subir
        call.resolve();
    }

    /** El pitido de los avisos (el mismo que el de la web), con la musica bajada. */
    @PluginMethod
    public void tono(PluginCall call) {
        final boolean sube = !Boolean.FALSE.equals(call.getBoolean("sube", true));
        retenFoco(modo(call));
        sonidos.execute(() -> {
            try {
                suenaTono(sube);
            } catch (Throwable e) {
                Log.e(TAG, "tono", e);
            } finally {
                sueltaFocoLuego(); // la voz llega medio segundo despues y lo vuelve a retener
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void estado(PluginCall call) {
        JSObject d = new JSObject();
        d.put("neural", estadoNeural);
        d.put("sistema", sistemaListo);
        d.put("voz", "Miro (es-ES)");
        call.resolve(d);
    }

    private void suena(Frase f, GeneratedAudio a, int musica) throws InterruptedException {
        float[] m = a.getSamples();
        int sr = a.getSampleRate();
        if (m == null || m.length == 0) throw new IllegalStateException("frase vacia");
        if (f.turno != turno.get()) {
            cierra(f, "cortada", null);
            return;
        }
        realza(m, sr);
        AudioTrack t = new AudioTrack.Builder()
            .setAudioAttributes(atributos)
            .setAudioFormat(new AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                .setSampleRate(sr)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build())
            .setBufferSizeInBytes(m.length * 4)
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build();
        try {
            t.write(m, 0, m.length, AudioTrack.WRITE_BLOCKING);
            pista = t;
            retenFoco(musica);
            t.play();
            emite(f, "inicio", null);
            long limite = System.currentTimeMillis() + (m.length * 1000L) / sr + 2000;
            while (f.turno == turno.get() && t.getPlaybackHeadPosition() < m.length && System.currentTimeMillis() < limite) {
                Thread.sleep(15);
            }
        } finally {
            if (pista == t) pista = null;
            try {
                t.stop();
            } catch (Throwable e) {
                // ya estaba parada
            }
            t.release();
        }
        boolean cortada = f.turno != turno.get();
        if (!cortada) sueltaFocoLuego();
        cierra(f, cortada ? "cortada" : "fin", null);
    }

    /**
     * La voz de Piper sale muy baja: unos -35 dBFS de voz, 30 dB por debajo del pitido, y con
     * musica no se oia. Se normaliza, se comprime (umbral -28 dB, 4:1, ataque 2 ms, suelta
     * 80 ms) y se limita suave: queda en unos -13 dBFS de voz con los picos a -0,3 dB.
     * (Medido en el PC con el mismo modelo: +22 a +25 dB.)
     */
    static void realza(float[] m, int sr) {
        float pico = 0f;
        for (float v : m) pico = Math.max(pico, Math.abs(v));
        if (pico < 1e-4f) return;
        final double ga = Math.exp(-1.0 / (sr * 0.002)), gs = Math.exp(-1.0 / (sr * 0.08));
        final double umbral = Math.pow(10, -28 / 20.0), inv = 1.0 / 4.0;
        double env = 0, max = 0;
        for (int i = 0; i < m.length; i++) {
            double v = m[i] / pico, a = Math.abs(v);
            env = a > env ? ga * env + (1 - ga) * a : gs * env + (1 - gs) * a;
            if (env > umbral) v *= (umbral * Math.pow(env / umbral, inv)) / env;
            m[i] = (float) v;
            max = Math.max(max, Math.abs(v));
        }
        if (max < 1e-6) return;
        final double G = 1.5, t = Math.tanh(G);
        for (int i = 0; i < m.length; i++) m[i] = (float) (Math.tanh(G * m[i] / max) / t * 0.97);
    }

    private void hablaSistema(Frase f, String texto, float velocidad, int musica) {
        TextToSpeech s = sistema;
        if (!sistemaListo || s == null) {
            fallaSistema(f, "sin_voz");            // reiniciandose: esta frase, con Miro
            return;
        }
        String id = "f" + f.turno;
        delSistema.put(id, f);
        retenFoco(musica);
        s.setSpeechRate(velocidad);
        if (s.speak(texto, TextToSpeech.QUEUE_FLUSH, null, id) != TextToSpeech.SUCCESS) {
            delSistema.remove(id);
            fallaSistema(f, "sistema");
        }
    }

    /** Para lo que este sonando (la frase se cierra como "cortada" en su hilo). */
    private void corta() {
        AudioTrack p = pista;
        if (p != null) {
            try {
                p.pause();
            } catch (Throwable e) {
                // ya liberada
            }
        }
        TextToSpeech s = sistema;
        if (sistemaListo && s != null && !delSistema.isEmpty()) {
            try {
                s.stop();
            } catch (Throwable e) {
                // nada que parar
            }
        }
    }

    private static String corto(String t) {
        if (t == null) return "";
        t = t.replace("\n", " ");
        return t.length() > 90 ? t.substring(0, 88) + "…" : t;
    }

    private void emite(Frase f, String evento, String error) {
        if (f.cerrada.get()) return;
        if (Informe.abierto()) Informe.linea("voz", "suena");
        JSObject d = new JSObject();
        d.put("evento", evento);
        if (error != null) d.put("error", error);
        f.call.resolve(d);
    }

    private void cierra(Frase f, String evento, String error) {
        if (!f.cerrada.compareAndSet(false, true)) return;
        if (Informe.abierto()) Informe.linea("voz", evento + (error != null ? " (" + error + ")" : ""));
        // fin o error de la ultima frase: la musica vuelve (si la corta otra, esa ya retiene el foco)
        if (!"cortada".equals(evento) && f.turno == turno.get()) sueltaFocoLuego();
        JSObject d = new JSObject();
        d.put("evento", evento);
        if (error != null) d.put("error", error);
        f.call.resolve(d);
        getBridge().releaseCall(f.call);
    }

    static final int BAJA = 0, PAUSA = 1, NADA = 2;

    /** Lo que se hace con la musica: "pausa", "nada" (la voz por encima) o, por defecto, bajarla. */
    private static int modo(PluginCall call) {
        if (Boolean.TRUE.equals(call.getBoolean("sinFoco", false))) return NADA;
        return Boolean.TRUE.equals(call.getBoolean("pausa", false)) ? PAUSA : BAJA;
    }

    /** Pide el foco (o cambia de "bajar" a "pausar") y anula una suelta pendiente. Sin foco, lo suelta. */
    private synchronized void retenFoco(int modo) {
        if (modo == NADA) {
            if (focoTenido != null) sueltaFocoLuego();
            return;
        }
        final boolean pausa = modo == PAUSA;
        principal.removeCallbacks(sueltaFocoTarea);
        if (audio == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            Object quiero = pausa ? focoPausa : focoBaja;
            if (focoTenido == quiero) return;
            if (focoTenido != null) audio.abandonAudioFocusRequest((AudioFocusRequest) focoTenido);
            int r = audio.requestAudioFocus((AudioFocusRequest) quiero);
            if (r != AudioManager.AUDIOFOCUS_REQUEST_GRANTED && Informe.abierto()) Informe.linea("voz", "Android no da el foco de audio (" + r + ")");
            focoTenido = quiero;
        } else {
            Integer quiero = pausa ? AudioManager.AUDIOFOCUS_GAIN_TRANSIENT : AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK;
            if (quiero.equals(focoTenido)) return;
            audio.requestAudioFocus(escucha, AudioManager.STREAM_MUSIC, quiero);
            focoTenido = quiero;
        }
    }

    /** Suelta el foco dentro de 1,2 s, salvo que antes llegue otro pitido o frase: entre avisos
     *  seguidos la musica se queda baja en vez de subir y bajar cada vez. */
    private void sueltaFocoLuego() {
        principal.removeCallbacks(sueltaFocoTarea);
        principal.postDelayed(sueltaFocoTarea, 1200);
    }

    private synchronized void sueltaFocoYa() {
        principal.removeCallbacks(sueltaFocoTarea);
        if (audio == null || focoTenido == null) return;
        if (Build.VERSION.SDK_INT >= 26) audio.abandonAudioFocusRequest((AudioFocusRequest) focoTenido);
        else audio.abandonAudioFocus(escucha);
        focoTenido = null;
    }

    /** El pitido de la web (wavURL): barrido de 0,3 s, 880->1320 Hz si va bien y 760->520 si no. */
    private void suenaTono(boolean sube) throws InterruptedException {
        final int sr = 8000;
        final double dur = 0.30, f0 = sube ? 880 : 760, f1 = sube ? 1320 : 520;
        final int n = (int) (sr * dur);
        float[] m = new float[n];
        for (int k = 0; k < n; k++) {
            double f = f0 + (f1 - f0) * k / (sr * dur);
            double e = Math.min(1, Math.min(k / (sr * 0.01), (sr * dur - k) / (sr * 0.03)));
            m[k] = (float) (0.79 * e * Math.sin(2 * Math.PI * f * k / sr));
        }
        AudioTrack t = new AudioTrack.Builder()
            .setAudioAttributes(atributos)
            .setAudioFormat(new AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                .setSampleRate(sr)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build())
            .setBufferSizeInBytes(n * 4)
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build();
        try {
            t.write(m, 0, n, AudioTrack.WRITE_BLOCKING);
            t.play();
            long limite = System.currentTimeMillis() + 1000;
            while (t.getPlaybackHeadPosition() < n && System.currentTimeMillis() < limite) Thread.sleep(10);
        } finally {
            try {
                t.stop();
            } catch (Throwable e) {
                // ya estaba parado
            }
            t.release();
        }
    }

    /* ------------------------- voz neuronal ------------------------- */

    private void cargaNeural() {
        try {
            AssetManager am = getContext().getAssets();
            String[] hay = am.list(VOZ);
            if (hay == null || hay.length == 0) {
                estadoNeural = "no_incluida";
                return;
            }
            File datos = copiaDatos(am);
            OfflineTtsVitsModelConfig vits = new OfflineTtsVitsModelConfig();
            vits.setModel(MODELO);
            vits.setTokens(TOKENS);
            vits.setDataDir(datos.getAbsolutePath());
            OfflineTtsModelConfig modelo = new OfflineTtsModelConfig();
            modelo.setVits(vits);
            modelo.setNumThreads(2);
            modelo.setProvider("cpu");
            modelo.setDebug(false);
            OfflineTtsConfig config = new OfflineTtsConfig();
            config.setModel(modelo);
            OfflineTts t = new OfflineTts(am, config);
            t.generate("Listo.", 0, 1f); // la primera frase de verdad no paga el arranque
            neural = t;
            estadoNeural = "lista";
        } catch (Throwable e) {
            estadoNeural = "fallo";
            Log.e(TAG, "voz neuronal", e);
        }
    }

    /** espeak-ng necesita sus datos en disco: se copian de la app una vez por instalacion. */
    private File copiaDatos(AssetManager am) throws Exception {
        File destino = new File(getContext().getFilesDir(), "espeak-ng-data");
        long instalada = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).lastUpdateTime;
        File marca = new File(destino, ".copiado-" + instalada);
        if (marca.exists()) return destino;
        borra(destino);
        copia(am, DATOS, destino);
        if (!marca.createNewFile()) Log.w(TAG, "sin marca de copia");
        return destino;
    }

    private void copia(AssetManager am, String ruta, File destino) throws Exception {
        String[] hijos = am.list(ruta);
        if (hijos != null && hijos.length > 0) {
            if (!destino.isDirectory() && !destino.mkdirs()) throw new IllegalStateException("no se crea " + destino);
            for (String h : hijos) copia(am, ruta + "/" + h, new File(destino, h));
            return;
        }
        try (InputStream in = am.open(ruta)) {
            File padre = destino.getParentFile();
            if (padre != null && !padre.isDirectory() && !padre.mkdirs()) throw new IllegalStateException("no se crea " + padre);
            try (OutputStream out = new FileOutputStream(destino)) {
                byte[] b = new byte[16384];
                int n;
                while ((n = in.read(b)) > 0) out.write(b, 0, n);
            }
        } catch (FileNotFoundException vacia) {
            // carpeta vacia: no hay nada que copiar
            if (!destino.isDirectory() && !destino.mkdirs()) Log.w(TAG, "carpeta vacia " + ruta);
        }
    }

    private static void borra(File f) {
        File[] hijos = f.listFiles();
        if (hijos != null) for (File h : hijos) borra(h);
        if (f.exists() && !f.delete()) Log.w(TAG, "no se borra " + f);
    }

    /* ------------------- GPS con la pantalla apagada ------------------- */

    /** Enciende o apaga el servicio del GPS. Sin permiso de ubicacion: "sin_permiso". */
    @PluginMethod
    public void gps(PluginCall call) {
        Context c = getContext();
        if (!Boolean.TRUE.equals(call.getBoolean("activo", true))) {
            c.stopService(new Intent(c, CarreraService.class));
            enCarrera(false);
            call.resolve();
            return;
        }
        if (ContextCompat.checkSelfPermission(c, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            call.reject("sin_permiso");
            return;
        }
        pidePermisos();
        try {
            ContextCompat.startForegroundService(c, new Intent(c, CarreraService.class).setAction(CarreraService.EMPIEZA));
            call.resolve();
        } catch (Throwable e) {
            Log.e(TAG, "gps", e);
            call.reject("no_arranca");
        }
    }

    /** Si el servicio esta en marcha de verdad (Android puede no dejarle arrancar). */
    @PluginMethod
    public void gpsEstado(PluginCall call) {
        JSObject d = new JSObject();
        d.put("vivo", CarreraService.vivo != null);
        call.resolve(d);
    }

    /** La web cuenta como va: lo que sale en la notificacion. Es tambien su latido. */
    @PluginMethod
    public void carrera(PluginCall call) {
        boolean corre = Boolean.TRUE.equals(call.getBoolean("corriendo", false));
        boolean pausa = Boolean.TRUE.equals(call.getBoolean("pausado", false));
        CarreraService s = CarreraService.vivo;
        if (s != null) s.actualiza(corre, pausa, call.getString("titulo"), call.getString("texto"));
        enCarrera(corre && s != null);
        call.resolve();
    }

    /**
     * Con la carrera en marcha: la web no se congela con la pantalla apagada (WebViewVivo)
     * y el boton de encendido enseña la app sin desbloquear.
     */
    private void enCarrera(boolean si) {
        if (enBloqueo != null && enBloqueo == si) return;
        enBloqueo = si;
        Informe.linea("web", si ? "sigue viva con la pantalla apagada" : "normal");
        getActivity().runOnUiThread(() -> {
            if (getBridge().getWebView() instanceof WebViewVivo) ((WebViewVivo) getBridge().getWebView()).mantenVisible(si);
            if (Build.VERSION.SDK_INT >= 27) getActivity().setShowWhenLocked(si);
        });
    }

    /** Avisos (una vez por instalacion): las notificaciones y que Android no la duerma. */
    private void pidePermisos() {
        if (permisosPedidos) return;
        permisosPedidos = true;
        try {
            if (Build.VERSION.SDK_INT >= 33
                && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(getActivity(), new String[] { Manifest.permission.POST_NOTIFICATIONS }, 4711);
                return; // la bateria, la siguiente vez
            }
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            SharedPreferences p = getContext().getSharedPreferences("copiloto", Context.MODE_PRIVATE);
            String pkg = getContext().getPackageName();
            if (Build.VERSION.SDK_INT >= 23 && !pm.isIgnoringBatteryOptimizations(pkg) && !p.getBoolean("bateriaPedida", false)) {
                p.edit().putBoolean("bateriaPedida", true).apply();
                Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + pkg));
                getActivity().startActivity(i);
            }
        } catch (Throwable e) {
            Log.e(TAG, "permisos", e);
        }
    }

    @Override
    public void posicion(Location l, boolean prueba) {
        JSObject d = new JSObject();
        d.put("lat", l.getLatitude());
        d.put("lon", l.getLongitude());
        d.put("acc", l.hasAccuracy() ? l.getAccuracy() : 50);
        if (l.hasSpeed()) d.put("vel", l.getSpeed());
        if (l.hasAltitude()) d.put("alt", l.getAltitude());
        if (l.hasBearing()) d.put("rumbo", l.getBearing());
        d.put("t", l.getTime() > 0 ? l.getTime() : System.currentTimeMillis());
        if (prueba) d.put("prueba", true);
        notifyListeners("posicion", d);
    }

    @Override
    public void accion(String que) {
        JSObject d = new JSObject();
        d.put("que", que);
        notifyListeners("accion", d);
    }

    @Override
    public void pantalla(boolean encendida) {
        JSObject d = new JSObject();
        d.put("encendida", encendida);
        notifyListeners("pantalla", d);
    }

    /** Lo dice el propio servicio cuando la web no responde (con la voz del movil). */
    @Override
    public void avisoNativo(String texto) {
        if (!sistemaListo) return;
        turno.incrementAndGet();
        corta();
        TextToSpeech s = sistema;
        if (s == null) return;
        retenFoco(PAUSA);
        s.setSpeechRate(1f);
        s.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "aviso" + System.currentTimeMillis());
    }

    /* ------------------------ avisos de Cocina ------------------------ */

    /** La lista de avisos ({lista:[{id, cuando, titulo, texto}]}): sustituye a la anterior. */
    @PluginMethod
    public void avisos(PluginCall call) {
        com.getcapacitor.JSArray l = call.getArray("lista");
        int n = AvisoReceiver.programa(getContext(), l == null ? "[]" : l.toString());
        JSObject d = new JSObject();
        d.put("programados", n);
        call.resolve(d);
    }

    /* ------------------------ informe de la salida ------------------------ */

    /** Una linea de la web ({tipo, texto}) o su Diario de voz entero ({diario}). */
    @PluginMethod
    public void informe(PluginCall call) {
        String diario = call.getString("diario");
        if (diario != null) Informe.diario(diario);
        String t = call.getString("texto");
        if (t != null) Informe.linea(call.getString("tipo", "web"), t);
        call.resolve();
    }

    /** Comparte el ultimo informe (y su diario) por WhatsApp, correo... */
    @PluginMethod
    public void compartirInforme(PluginCall call) {
        java.io.File[] fs = Informe.ultimo(getContext());
        if (fs.length == 0) {
            call.reject("sin_informe");
            return;
        }
        try {
            ArrayList<Uri> us = new ArrayList<>();
            for (java.io.File f : fs) us.add(FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f));
            Intent i = new Intent(Intent.ACTION_SEND_MULTIPLE).setType("text/plain")
                .putParcelableArrayListExtra(Intent.EXTRA_STREAM, us)
                .putExtra(Intent.EXTRA_SUBJECT, "Informe de Copiloto " + fs[0].getName().replace(".txt", ""))
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(i, "Informe de la salida"));
            JSObject d = new JSObject();
            d.put("nombre", fs[0].getName());
            call.resolve(d);
        } catch (Throwable e) {
            Log.e(TAG, "compartir", e);
            call.reject("no_se_comparte");
        }
    }

    /* --------------------------- APK sin cable --------------------------- */

    /** La version del APK instalado (lo nativo; la web puede ir por delante). */
    @PluginMethod
    public void apk(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            PackageInfo pi = pm.getPackageInfo(getContext().getPackageName(), 0);
            JSObject d = new JSObject();
            d.put("version", pi.versionName);
            d.put("codigo", PackageInfoCompat.getLongVersionCode(pi));
            d.put("puedeInstalar", Build.VERSION.SDK_INT < 26 || pm.canRequestPackageInstalls());
            call.resolve(d);
        } catch (Throwable e) {
            call.reject("sin_version");
        }
    }

    /**
     * Baja el APK nuevo ({url, checksum, version}), comprueba su SHA-256 y abre el instalador
     * de Android, que pregunta "¿Actualizar?". Responde {evento:"progreso", pct} mientras baja
     * y al final "instalando", "permiso" (hay que permitir instalar apps de Copiloto) o "error".
     */
    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void instalaApk(PluginCall call) {
        call.setKeepAlive(true);
        final String url = call.getString("url", "");
        final String suma = call.getString("checksum", "");
        final String v = call.getString("version", "nueva").replaceAll("[^0-9.]", "");
        final Context c = getContext();
        if (!url.startsWith("https://") || !suma.matches("[0-9a-fA-F]{64}")) {
            finApk(call, "error", "sin_url");
            return;
        }
        if (Build.VERSION.SDK_INT >= 26 && !c.getPackageManager().canRequestPackageInstalls()) {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + c.getPackageName()));
            getActivity().startActivity(i);
            finApk(call, "permiso", null);
            return;
        }
        descargas.execute(() -> {
            java.io.File d = new java.io.File(c.getCacheDir(), "apk");
            borra(d);
            if (!d.mkdirs()) Log.w(TAG, "sin carpeta apk");
            java.io.File f = new java.io.File(d, "copiloto-" + v + ".apk");
            HttpURLConnection con = null;
            try {
                con = (HttpURLConnection) new URL(url).openConnection();
                con.setConnectTimeout(20000);
                con.setReadTimeout(30000);
                con.setInstanceFollowRedirects(true);
                if (con.getResponseCode() != 200) throw new IllegalStateException("http " + con.getResponseCode());
                long total = con.getContentLengthLong(), hecho = 0;
                int pctAnt = -1;
                MessageDigest sha = MessageDigest.getInstance("SHA-256");
                try (InputStream in = con.getInputStream(); OutputStream out = new FileOutputStream(f)) {
                    byte[] b = new byte[65536];
                    int n;
                    while ((n = in.read(b)) > 0) {
                        out.write(b, 0, n);
                        sha.update(b, 0, n);
                        hecho += n;
                        int pct = total > 0 ? (int) (hecho * 100 / total) : -1;
                        if (pct != pctAnt && pct % 2 == 0) {
                            pctAnt = pct;
                            JSObject p = new JSObject();
                            p.put("evento", "progreso");
                            p.put("pct", pct);
                            call.resolve(p);
                        }
                    }
                }
                StringBuilder hex = new StringBuilder();
                for (byte x : sha.digest()) hex.append(String.format(Locale.ROOT, "%02x", x));
                if (!hex.toString().equalsIgnoreCase(suma)) throw new IllegalStateException("suma");
                Uri u = FileProvider.getUriForFile(c, c.getPackageName() + ".fileprovider", f);
                Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(u, "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().runOnUiThread(() -> {
                    try {
                        getActivity().startActivity(i);
                        finApk(call, "instalando", null);
                    } catch (Throwable e) {
                        Log.e(TAG, "instalador", e);
                        finApk(call, "error", "instalador");
                    }
                });
            } catch (Throwable e) {
                Log.e(TAG, "apk", e);
                if (!f.delete()) Log.w(TAG, "apk a medias");
                finApk(call, "error", "suma".equals(e.getMessage()) ? "suma" : "descarga");
            } finally {
                if (con != null) con.disconnect();
            }
        });
    }

    private void finApk(PluginCall call, String evento, String error) {
        JSObject d = new JSObject();
        d.put("evento", evento);
        if (error != null) d.put("error", error);
        call.resolve(d);
        getBridge().releaseCall(call);
    }

    /* ------------------------ pantalla encendida ------------------------ */

    @PluginMethod
    public void pantalla(PluginCall call) {
        final boolean encendida = Boolean.TRUE.equals(call.getBoolean("encendida", true));
        getActivity().runOnUiThread(() -> {
            if (encendida) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        // sin la web el GPS no sirve de nada: al volver a abrir, la carrera se retoma sola
        if (CarreraService.oyente == this) CarreraService.oyente = null;
        try {
            getContext().stopService(new Intent(getContext(), CarreraService.class));
        } catch (Throwable e) {
            // no estaba
        }
        descargas.shutdown();
        turno.incrementAndGet();
        corta();
        sueltaFocoYa();
        sonidos.shutdown();
        try {
            if (sistema != null) sistema.shutdown();
        } catch (Throwable e) {
            // ya cerrada
        }
        hilo.execute(() -> {
            OfflineTts t = neural;
            neural = null;
            if (t != null) t.release();
        });
        hilo.shutdown();
    }
}
