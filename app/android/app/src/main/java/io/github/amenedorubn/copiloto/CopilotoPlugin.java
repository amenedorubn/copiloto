package io.github.amenedorubn.copiloto;

import android.content.Context;
import android.content.res.AssetManager;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.os.Build;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;
import android.view.WindowManager;

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
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Lo nativo de Copiloto: la voz y la pantalla encendida.
 *
 * Voz: primero la neuronal que va dentro de la app (Piper "Miro", es-ES, con
 * sherpa-onnx: no necesita internet ni depende del motor de voz del movil).
 * Si no carga, la del sistema (TextToSpeech). En los dos casos pide el foco de
 * audio transitorio con atenuacion y con uso "guia de navegacion", como las
 * apps de navegacion: la musica baja mientras habla y vuelve sola al acabar.
 *
 * hablar() es una llamada de callback: responde {evento:"inicio"} cuando
 * empieza a sonar y despues una sola vez {evento:"fin"|"cortada"|"error"}.
 * Una frase nueva corta la anterior (como speechSynthesis.cancel + speak).
 */
@CapacitorPlugin(name = "Copiloto")
public class CopilotoPlugin extends Plugin {
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
    private TextToSpeech sistema;
    private volatile boolean sistemaListo = false;
    private volatile AudioTrack pista;

    private AudioManager audio;
    private AudioAttributes atributos;
    private Object foco; // AudioFocusRequest (API 26+)
    private final AudioManager.OnAudioFocusChangeListener escucha = cambio -> {};

    /** Una frase: su llamada, su turno y si ya se ha cerrado. */
    private static class Frase {
        final PluginCall call;
        final int turno;
        final AtomicBoolean cerrada = new AtomicBoolean(false);

        Frase(PluginCall c, int t) {
            call = c;
            turno = t;
        }
    }

    @Override
    public void load() {
        audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        atributos = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build();
        if (Build.VERSION.SDK_INT >= 26) {
            foco = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
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
        sistema = new TextToSpeech(getContext(), estado -> {
            if (estado != TextToSpeech.SUCCESS) return;
            int r = sistema.setLanguage(Locale.forLanguageTag("es-ES"));
            if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                sistema.setLanguage(Locale.forLanguageTag("es"));
            }
            sistema.setAudioAttributes(atributos);
            sistema.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String id) {
                    Frase f = delSistema.get(id);
                    if (f != null) emite(f, "inicio", null);
                }

                @Override
                public void onDone(String id) {
                    Frase f = delSistema.remove(id);
                    if (f == null) return;
                    if (f.turno == turno.get()) sueltaFoco();
                    cierra(f, "fin", null);
                }

                @Override
                public void onError(String id) {
                    Frase f = delSistema.remove(id);
                    if (f != null) cierra(f, "error", "sistema");
                }

                @Override
                public void onError(String id, int codigo) {
                    Frase f = delSistema.remove(id);
                    if (f != null) cierra(f, "error", "sistema " + codigo);
                }

                @Override
                public void onStop(String id, boolean interrumpida) {
                    Frase f = delSistema.remove(id);
                    if (f != null) cierra(f, "cortada", null);
                }
            });
            sistemaListo = true;
        });
    }

    /* ------------------------------ voz ------------------------------ */

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void hablar(PluginCall call) {
        call.setKeepAlive(true);
        final String texto = call.getString("texto", "");
        Float v = call.getFloat("velocidad", 1f);
        final float velocidad = Math.max(0.5f, Math.min(2f, v == null ? 1f : v));
        final Frase f = new Frase(call, turno.incrementAndGet());
        corta(); // la frase nueva corta la anterior
        if (texto == null || texto.trim().isEmpty()) {
            cierra(f, "fin", null);
            return;
        }
        hilo.execute(() -> {
            if (f.turno != turno.get()) {
                cierra(f, "cortada", null);
                return;
            }
            OfflineTts t = neural;
            if (t != null) {
                try {
                    suena(f, t.generate(texto, 0, velocidad));
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
            hablaSistema(f, texto, velocidad);
        });
    }

    @PluginMethod
    public void callar(PluginCall call) {
        turno.incrementAndGet();
        corta();
        sueltaFoco();
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

    private void suena(Frase f, GeneratedAudio a) throws InterruptedException {
        float[] m = a.getSamples();
        int sr = a.getSampleRate();
        if (m == null || m.length == 0) throw new IllegalStateException("frase vacia");
        if (f.turno != turno.get()) {
            cierra(f, "cortada", null);
            return;
        }
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
            pideFoco();
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
        if (!cortada) sueltaFoco();
        cierra(f, cortada ? "cortada" : "fin", null);
    }

    private void hablaSistema(Frase f, String texto, float velocidad) {
        if (!sistemaListo) {
            cierra(f, "error", "sin_voz");
            return;
        }
        String id = "f" + f.turno;
        delSistema.put(id, f);
        pideFoco();
        sistema.setSpeechRate(velocidad);
        if (sistema.speak(texto, TextToSpeech.QUEUE_FLUSH, null, id) != TextToSpeech.SUCCESS) {
            delSistema.remove(id);
            cierra(f, "error", "sistema");
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
        if (sistemaListo && !delSistema.isEmpty()) {
            try {
                sistema.stop();
            } catch (Throwable e) {
                // nada que parar
            }
        }
    }

    private void emite(Frase f, String evento, String error) {
        if (f.cerrada.get()) return;
        JSObject d = new JSObject();
        d.put("evento", evento);
        if (error != null) d.put("error", error);
        f.call.resolve(d);
    }

    private void cierra(Frase f, String evento, String error) {
        if (!f.cerrada.compareAndSet(false, true)) return;
        JSObject d = new JSObject();
        d.put("evento", evento);
        if (error != null) d.put("error", error);
        f.call.resolve(d);
        getBridge().releaseCall(f.call);
    }

    private void pideFoco() {
        if (audio == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            audio.requestAudioFocus((AudioFocusRequest) foco);
        } else {
            audio.requestAudioFocus(escucha, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
        }
    }

    private void sueltaFoco() {
        if (audio == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            if (foco != null) audio.abandonAudioFocusRequest((AudioFocusRequest) foco);
        } else {
            audio.abandonAudioFocus(escucha);
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
        turno.incrementAndGet();
        corta();
        sueltaFoco();
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
