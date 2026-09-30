package io.github.amenedorubn.copiloto;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Al encender el movil o al actualizar la app, los avisos de Cocina vuelven a su hora. */
public class ArranqueReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String a = i == null ? null : i.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)) AvisoReceiver.reprograma(c);
    }
}
