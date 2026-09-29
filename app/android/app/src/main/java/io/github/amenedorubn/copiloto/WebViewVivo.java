package io.github.amenedorubn.copiloto;

import android.content.Context;
import android.util.AttributeSet;
import android.view.View;

import com.getcapacitor.CapacitorWebView;

/**
 * El WebView de Capacitor, pero que con un entreno en marcha sigue "a la vista" aunque la
 * pantalla se apague o se cambie de app. Probado en el OnePlus: con la pantalla apagada el
 * WebView congela la pagina al minuto (ni avisos ni km), aunque el proceso siga vivo y le
 * lleguen las posiciones. Asi la web corre como con la pantalla encendida.
 * Lo pone res/layout/capacitor_bridge_layout_main.xml (el mismo nombre que el de Capacitor).
 */
public class WebViewVivo extends CapacitorWebView {
    private int real = View.VISIBLE;
    private boolean mantener = false;

    public WebViewVivo(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    protected void onWindowVisibilityChanged(int visibility) {
        real = visibility;
        super.onWindowVisibilityChanged(mantener ? View.VISIBLE : visibility);
    }

    /** true mientras corres (en el hilo principal); al terminar vuelve a lo que haya de verdad. */
    void mantenVisible(boolean si) {
        if (si == mantener) return;
        mantener = si;
        super.onWindowVisibilityChanged(si ? View.VISIBLE : real);
    }
}
