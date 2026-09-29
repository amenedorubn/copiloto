package io.github.amenedorubn.copiloto;

import android.content.Context;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.Locale;

/**
 * El informe de cada salida, que se guarda solo: una linea por cosa que pasa (servicio,
 * GPS, pantalla, voz, batería, web) y, al lado, el Diario de voz de la web. Vive en
 * Android/data/io.github.amenedorubn.copiloto/files/informes (se saca por USB) y se
 * puede compartir desde Ajustes. Se guardan los 20 ultimos.
 */
final class Informe {
    private static final String TAG = "Copiloto";
    private static File actual;
    private static Writer w;

    private Informe() {}

    static File carpeta(Context c) {
        File base = c.getExternalFilesDir(null);
        if (base == null) base = c.getFilesDir();
        File d = new File(base, "informes");
        if (!d.isDirectory() && !d.mkdirs()) Log.w(TAG, "sin carpeta de informes");
        return d;
    }

    static synchronized void abre(Context c) {
        cierra();
        try {
            File d = carpeta(c);
            String n = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss", Locale.ROOT).format(new Date());
            actual = new File(d, n + ".txt");
            w = new OutputStreamWriter(new FileOutputStream(actual, true), StandardCharsets.UTF_8);
            limpia(d);
        } catch (Throwable e) {
            Log.e(TAG, "informe", e);
            w = null;
        }
    }

    static synchronized void linea(String tipo, String texto) {
        Log.i(TAG, tipo + ": " + texto);
        if (w == null) return;
        try {
            w.write(new SimpleDateFormat("HH:mm:ss", Locale.ROOT).format(new Date()) + "  " + tipo + "  " + texto + "\n");
            w.flush();
        } catch (Throwable e) {
            Log.e(TAG, "informe", e);
        }
    }

    /** El Diario de voz de la web, entero, junto al informe (se reescribe cada vez). */
    static synchronized void diario(String json) {
        if (actual == null || json == null) return;
        File f = new File(actual.getParentFile(), actual.getName().replace(".txt", "_diario.json"));
        try (Writer d = new OutputStreamWriter(new FileOutputStream(f, false), StandardCharsets.UTF_8)) {
            d.write(json);
        } catch (Throwable e) {
            Log.e(TAG, "diario", e);
        }
    }

    static synchronized void cierra() {
        if (w != null) {
            try {
                w.close();
            } catch (Throwable e) {
                // ya cerrado
            }
        }
        w = null;
    }

    static synchronized boolean abierto() {
        return w != null;
    }

    /** Los archivos del ultimo informe (el .txt y su diario, si lo hay), del mas nuevo. */
    static File[] ultimo(Context c) {
        File[] fs = carpeta(c).listFiles((d, n) -> n.endsWith(".txt"));
        if (fs == null || fs.length == 0) return new File[0];
        Arrays.sort(fs, (a, b) -> b.getName().compareTo(a.getName()));
        File t = fs[0], j = new File(t.getParentFile(), t.getName().replace(".txt", "_diario.json"));
        return j.exists() ? new File[] { t, j } : new File[] { t };
    }

    private static void limpia(File d) {
        File[] fs = d.listFiles((x, n) -> n.endsWith(".txt"));
        if (fs == null || fs.length <= 20) return;
        Arrays.sort(fs, (a, b) -> b.getName().compareTo(a.getName()));
        for (int i = 20; i < fs.length; i++) {
            File j = new File(d, fs[i].getName().replace(".txt", "_diario.json"));
            if (!fs[i].delete() || (j.exists() && !j.delete())) Log.w(TAG, "no se borra " + fs[i]);
        }
    }
}
