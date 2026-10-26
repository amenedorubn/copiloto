package io.github.amenedorubn.copiloto;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanRecord;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import android.util.Log;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * La bici de spinning (BODY BIKE Smart+ y cualquiera que hable Bluetooth estandar).
 *
 * Busca un aparato que anuncie potencia de ciclismo (Cycling Power, 0x1818) o
 * maquina de fitness (FTMS, 0x1826), o que se llame "BODY BIKE"; se conecta y se
 * suscribe a sus medidas. Aqui NO se interpreta nada: cada notificacion sale tal
 * cual hacia la web ({tipo, bytes}) y bici.js la lee. Asi la lectura se prueba con
 * node y un APK no hace falta para corregirla.
 *
 * Si la conexion se cae (te bajas de la bici, se duerme), reintenta solo con el
 * mismo aparato hasta que la web diga corta().
 */
@SuppressLint("MissingPermission") // los permisos los comprueba CopilotoPlugin antes de llamar
public class BiciBle {
    private static final String TAG = "CopilotoBici";
    static final UUID CPS = uuid16(0x1818);         // Cycling Power Service
    static final UUID CPS_MEDIDA = uuid16(0x2A63);  // Cycling Power Measurement
    static final UUID FTMS = uuid16(0x1826);        // Fitness Machine Service
    static final UUID FTMS_BICI = uuid16(0x2AD2);   // Indoor Bike Data
    static final UUID CCCD = uuid16(0x2902);

    /** Lo que BiciBle le cuenta al plugin. */
    interface Oyente {
        void biciVista(String id, String nombre, int rssi, boolean potencia, boolean ftms);
        void biciEstado(String estado, String nombre);
        void biciDatos(String tipo, int[] bytes);
    }

    private final Context ctx;
    private final Oyente oyente;
    private final Handler h = new Handler(Looper.getMainLooper());
    private BluetoothLeScanner escaner;
    private BluetoothGatt gatt;
    private String idActual;
    private String nombreActual = "";
    private boolean quiere = false;      // la web quiere estar conectada
    private boolean buscando = false;
    private boolean autoConecta = false; // la busqueda se conecta sola al primero que valga
    private int intentos = 0;

    BiciBle(Context c, Oyente o) {
        ctx = c.getApplicationContext();
        oyente = o;
    }

    static UUID uuid16(int x) {
        return UUID.fromString(String.format("0000%04x-0000-1000-8000-00805f9b34fb", x));
    }

    private BluetoothAdapter adaptador() {
        BluetoothManager m = (BluetoothManager) ctx.getSystemService(Context.BLUETOOTH_SERVICE);
        return m == null ? null : m.getAdapter();
    }

    /** "ok", "sin_bluetooth" o "apagado". */
    String disponible() {
        BluetoothAdapter a = adaptador();
        if (a == null) return "sin_bluetooth";
        if (!a.isEnabled()) return "apagado";
        return "ok";
    }

    /* ------------------------------- buscar ------------------------------- */

    private final ScanCallback alVer = new ScanCallback() {
        @Override
        public void onScanResult(int tipo, ScanResult r) {
            BluetoothDevice d = r.getDevice();
            ScanRecord sr = r.getScanRecord();
            String nombre = d.getName();
            if (nombre == null && sr != null) nombre = sr.getDeviceName();
            if (nombre == null) nombre = "";
            boolean pot = false, ftms = false;
            if (sr != null && sr.getServiceUuids() != null) {
                for (ParcelUuid u : sr.getServiceUuids()) {
                    if (CPS.equals(u.getUuid())) pot = true;
                    if (FTMS.equals(u.getUuid())) ftms = true;
                }
            }
            boolean bodyBike = nombre.toUpperCase().replace(" ", "").contains("BODYBIKE");
            if (!pot && !ftms && !bodyBike) return;
            oyente.biciVista(d.getAddress(), nombre, r.getRssi(), pot, ftms);
            if (autoConecta) {
                autoConecta = false;
                paraBusqueda();
                conecta(d.getAddress());
            }
        }

        @Override
        public void onScanFailed(int codigo) {
            buscando = false;
            oyente.biciEstado("error_busqueda", "" + codigo);
        }
    };

    /** Busca bicis durante unos segundos. Con auto, se conecta sola a la primera. */
    void busca(boolean auto) {
        BluetoothAdapter a = adaptador();
        if (a == null || !a.isEnabled()) {
            oyente.biciEstado(a == null ? "sin_bluetooth" : "apagado", "");
            return;
        }
        paraBusqueda();
        escaner = a.getBluetoothLeScanner();
        if (escaner == null) {
            oyente.biciEstado("apagado", "");
            return;
        }
        autoConecta = auto;
        buscando = true;
        ScanSettings s = new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build();
        // sin filtros: hay bicis que no anuncian el servicio y solo se reconocen por el nombre
        escaner.startScan(null, s, alVer);
        oyente.biciEstado("buscando", "");
        h.postDelayed(() -> {
            if (!buscando) return;
            paraBusqueda();
            if (gatt == null) oyente.biciEstado("no_encontrada", "");
        }, 15000);
    }

    void paraBusqueda() {
        if (buscando && escaner != null) {
            try {
                escaner.stopScan(alVer);
            } catch (Throwable e) {
                Log.w(TAG, "stopScan", e);
            }
        }
        buscando = false;
    }

    /* ------------------------------ conectar ------------------------------ */

    void conecta(String id) {
        BluetoothAdapter a = adaptador();
        if (a == null || id == null) return;
        quiere = true;
        idActual = id;
        intentos = 0;
        abre();
    }

    private void abre() {
        BluetoothAdapter a = adaptador();
        if (a == null || idActual == null || !quiere) return;
        cierraGatt();
        BluetoothDevice d = a.getRemoteDevice(idActual);
        nombreActual = d.getName() == null ? "" : d.getName();
        oyente.biciEstado("conectando", nombreActual);
        if (Build.VERSION.SDK_INT >= 23) gatt = d.connectGatt(ctx, false, alConectar, BluetoothDevice.TRANSPORT_LE);
        else gatt = d.connectGatt(ctx, false, alConectar);
    }

    void corta() {
        quiere = false;
        autoConecta = false;
        paraBusqueda();
        h.removeCallbacksAndMessages(null);
        cierraGatt();
        oyente.biciEstado("desconectada", nombreActual);
    }

    private void cierraGatt() {
        if (gatt != null) {
            try {
                gatt.disconnect();
                gatt.close();
            } catch (Throwable e) {
                Log.w(TAG, "close", e);
            }
            gatt = null;
        }
    }

    /** Las suscripciones van de una en una: Android no deja escribir dos descriptores a la vez. */
    private final List<BluetoothGattCharacteristic> pendientes = new ArrayList<>();

    private final BluetoothGattCallback alConectar = new BluetoothGattCallback() {
        @Override
        public void onConnectionStateChange(BluetoothGatt g, int status, int nuevo) {
            if (nuevo == BluetoothProfile.STATE_CONNECTED) {
                intentos = 0;
                h.post(g::discoverServices);
            } else if (nuevo == BluetoothProfile.STATE_DISCONNECTED) {
                if (!quiere) return;
                oyente.biciEstado("perdida", nombreActual);
                // reintenta: 2 s, 4 s, 8 s... hasta 30 s entre intentos
                int espera = Math.min(30000, 2000 << Math.min(4, intentos++));
                h.postDelayed(BiciBle.this::abre, espera);
            }
        }

        @Override
        public void onServicesDiscovered(BluetoothGatt g, int status) {
            pendientes.clear();
            BluetoothGattService f = g.getService(FTMS);
            BluetoothGattService p = g.getService(CPS);
            // FTMS trae velocidad; la potencia de ciclismo, vatios y cadencia. Se escuchan las dos.
            if (f != null && f.getCharacteristic(FTMS_BICI) != null) pendientes.add(f.getCharacteristic(FTMS_BICI));
            if (p != null && p.getCharacteristic(CPS_MEDIDA) != null) pendientes.add(p.getCharacteristic(CPS_MEDIDA));
            if (pendientes.isEmpty()) {
                oyente.biciEstado("sin_datos", nombreActual);
                return;
            }
            suscribeSiguiente(g);
        }

        @Override
        public void onDescriptorWrite(BluetoothGatt g, BluetoothGattDescriptor d, int status) {
            suscribeSiguiente(g);
        }

        @Override
        public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic c) {
            manda(c.getUuid(), c.getValue());
        }

        @Override
        public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic c, byte[] valor) {
            manda(c.getUuid(), valor);
        }
    };

    private void suscribeSiguiente(BluetoothGatt g) {
        if (pendientes.isEmpty()) {
            oyente.biciEstado("conectada", nombreActual);
            return;
        }
        BluetoothGattCharacteristic c = pendientes.remove(0);
        g.setCharacteristicNotification(c, true);
        BluetoothGattDescriptor d = c.getDescriptor(CCCD);
        if (d == null) {
            suscribeSiguiente(g);
            return;
        }
        byte[] on = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE;
        if (Build.VERSION.SDK_INT >= 33) g.writeDescriptor(d, on);
        else {
            d.setValue(on);
            g.writeDescriptor(d);
        }
    }

    private void manda(UUID u, byte[] v) {
        if (v == null) return;
        int[] b = new int[v.length];
        for (int i = 0; i < v.length; i++) b[i] = v[i] & 0xff;
        String tipo = FTMS_BICI.equals(u) ? "ftms" : (CPS_MEDIDA.equals(u) ? "potencia" : u.toString());
        oyente.biciDatos(tipo, b);
    }
}
