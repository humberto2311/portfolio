package com.nfcsoft.sistem;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ComponentName;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.cardemulation.CardEmulation;
import android.nfc.tech.IsoDep;
import android.nfc.tech.Ndef;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@CapacitorPlugin(name = "DispositivoNfc")
public class DispositivoNfcPlugin extends Plugin {

    private static final int SOLICITUD = 4711;
    private static final int MAXIMO_DATOS = Emision.MAXIMO_DATOS;
    private static final int TROZO_ESCRITURA = 0xE0;
    private static final String ETIQUETA = "sistemNfc";
    private static final int VENTANA_DE_LECTURA = 60;

    private static final byte[] AID_PROPIA = {
            (byte) 0xA0, 0x00, 0x00, 0x00, (byte) 0xBF, (byte) 0xC1, 0x01, 0x01
    };

    private static final byte[] AID_T4T = {
            (byte) 0xD2, 0x76, 0x00, 0x00, (byte) 0x85, 0x01, 0x01
    };

    private static final byte[] ARCHIVO_MENSAJE = {
            0x00, (byte) 0xA4, 0x00, 0x0C, 0x02, (byte) 0xE1, 0x04
    };

    private static DispositivoNfcPlugin instancia;
    private static volatile String rutaPendiente;

    private NfcAdapter adaptador;
    private PluginCall esperaPermisos;
    private BroadcastReceiver registroToque;
    private final Handler temporizador = new Handler(Looper.getMainLooper());
    private Runnable cierreDeLectura;
    private volatile boolean leyendo;

    @Override
    public void load() {
        instancia = this;
        adaptador = NfcAdapter.getDefaultAdapter(getActivity());
        Emision.asegurar(getContext());

        registroToque = new BroadcastReceiver() {
            @Override
            public void onReceive(Context contexto, Intent intento) {
                entregaToque(intento);
            }
        };

        ContextCompat.registerReceiver(
                getContext(), registroToque, new IntentFilter(EmisoraNfcService.ACCION_TOQUE),
                ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    protected void handleOnDestroy() {
        if (registroToque != null) {
            try {
                getContext().unregisterReceiver(registroToque);
            } catch (Exception yaFuera) {
            }

            registroToque = null;
        }

        super.handleOnDestroy();
    }

    private void entregaToque(Intent intento) {
        String datos = intento.getStringExtra("datos");

        if (datos == null || datos.isBlank()) {
            return;
        }

        JSObject toque = new JSObject();
        toque.put("datos", datos);
        toque.put("enlace", intento.getStringExtra("enlace"));
        toque.put("origen", "EMISION");
        toque.put("procedencia", "TARJETA");

        notifyListeners("toque", toque);
    }

    @PluginMethod
    public void informacion(PluginCall call) {
        Emision.asegurar(getContext());

        JSObject datos = new JSObject();
        datos.put("marca", Build.BRAND);
        datos.put("fabricante", Build.MANUFACTURER);
        datos.put("modelo", Build.MODEL);
        datos.put("sistema", "Android");
        datos.put("versionSistema", Build.VERSION.RELEASE);
        datos.put("api", Build.VERSION.SDK_INT);
        datos.put("tieneNfc", adaptador != null);
        datos.put("nfcActivado", adaptador != null && adaptador.isEnabled());
        datos.put("emulacionDisponible", emulacionDisponible());
        datos.put("emitiendo", Emision.hayTarjeta());
        datos.put("enlace", Emision.enlace == null ? "" : Emision.enlace);
        datos.put("permisos", permisos());

        call.resolve(datos);
    }

    @PluginMethod
    public void solicitarPermisos(PluginCall call) {
        String[] faltantes = permisosFaltantes();

        if (faltantes.length == 0) {
            call.resolve(permisos());
            return;
        }

        esperaPermisos = call;
        ActivityCompat.requestPermissions(getActivity(), faltantes, SOLICITUD);
    }

    @PluginMethod
    public void empezarEmision(PluginCall call) {
        Emision.asegurar(getContext());

        String enlace = call.getString("enlace");
        String datos = call.getString("datos");

        if (enlace == null || enlace.isBlank()) {
            enlace = Emision.enlace;
        }

        String url = enlace == null || enlace.isBlank() ? null : enlace.trim();
        byte[] mensaje = url == null ? null : ConstruirNdef.mensajeUri(url);
        byte[] archivo = mensaje == null ? null : ConstruirNdef.conLongitudDelante(mensaje);
        byte[] contenido = (datos == null ? "" : datos).getBytes(StandardCharsets.UTF_8);

        if (url == null && contenido.length == 0) {
            call.reject("No hay tarjeta que emitir: crea o selecciona una tarjeta primero.");
            return;
        }

        if (contenido.length > MAXIMO_DATOS) {
            contenido = Arrays.copyOf(contenido, MAXIMO_DATOS);
        }

        Emision.guardar(getContext(), url, archivo, contenido);

        JSObject resultado = new JSObject();
        resultado.put("enlace", url == null ? "" : url);
        resultado.put("bytes", archivo == null ? 0 : archivo.length);
        resultado.put("emulacionDisponible", emulacionDisponible());
        resultado.put("sinEnlace", url == null);

        call.resolve(resultado);
    }

    @PluginMethod
    public void detenerEmision(PluginCall call) {
        Emision.guardar(getContext(), null, null, null);
        call.resolve();
    }

    @PluginMethod
    public void empezarLectura(PluginCall call) {
        if (adaptador == null) {
            call.reject("Este teléfono no tiene NFC.");
            return;
        }

        if (!adaptador.isEnabled()) {
            call.reject("Activa el NFC en el teléfono para poder leer.");
            return;
        }

        int banderas = NfcAdapter.FLAG_READER_NFC_A
                | NfcAdapter.FLAG_READER_NFC_B
                | NfcAdapter.FLAG_READER_NFC_F
                | NfcAdapter.FLAG_READER_NFC_V
                | NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK;

        try {
            adaptador.enableReaderMode(getActivity(), alDescubrir, banderas, null);
        } catch (IllegalStateException error) {
            call.reject("Este teléfono no pudo ponerse a leer.");
            return;
        }

        int segundos = call.getInt("segundos", VENTANA_DE_LECTURA);

        leyendo = true;
        cierreDeLectura = () -> cierraLectura("ventana");
        temporizador.postDelayed(cierreDeLectura, Math.max(5, segundos) * 1000L);

        JSObject resultado = new JSObject();
        resultado.put("leyendo", true);
        resultado.put("segundos", Math.max(5, segundos));
        call.resolve(resultado);
    }

    @PluginMethod
    public void pararLectura(PluginCall call) {
        cierraLectura("pedido");
        call.resolve();
    }

    private void cierraLectura(String motivo) {
        if (cierreDeLectura != null) {
            temporizador.removeCallbacks(cierreDeLectura);
            cierreDeLectura = null;
        }

        if (!leyendo) {
            return;
        }

        leyendo = false;

        try {
            adaptador.disableReaderMode(getActivity());
        } catch (Exception yaSinLectura) {
        }

        Log.i(ETIQUETA, "lectura cerrada por " + motivo);

        JSObject aviso = new JSObject();
        aviso.put("motivo", motivo);
        notifyListeners("lecturaCerrada", aviso);
    }

    @Override
    protected void handleOnPause() {
        cierraLectura("salida");
        super.handleOnPause();
    }

    @PluginMethod
    public void estado(PluginCall call) {
        Emision.asegurar(getContext());

        JSObject datos = new JSObject();
        datos.put("tieneNfc", adaptador != null);
        datos.put("nfcActivado", adaptador != null && adaptador.isEnabled());
        datos.put("emulacionSoportada", emulacionDisponible());
        datos.put("tarjetaCargada", Emision.hayTarjeta());
        datos.put("leyendo", leyendo);

        ComponentName servicio = new ComponentName(getContext(), EmisoraNfcService.class);

        if (adaptador == null) {
            datos.put("categoriaSoportada", false);
            datos.put("emisionPropia", false);
            datos.put("aids", new ArrayList<String>());
            call.resolve(datos);
            return;
        }

        CardEmulation emisora = CardEmulation.getInstance(adaptador);
        List<String> aids = emisora.getAidsForService(servicio, CardEmulation.CATEGORY_OTHER);
        List<String> propias = aids == null ? new ArrayList<>() : aids;

        datos.put("categoriaSoportada", !propias.isEmpty());
        datos.put("emisionPropia", propias.contains(EmisoraNfcService.AID_PROPIA));
        datos.put("esLaPredeterminada", emisora.isDefaultServiceForCategory(servicio, CardEmulation.CATEGORY_OTHER));
        datos.put("aids", propias);

        call.resolve(datos);
    }

    private final NfcAdapter.ReaderCallback alDescubrir = tag -> {
        JSObject toque = new JSObject();

        Log.i(ETIQUETA, "descubierto " + String.join("+", nombresDe(tag.getTechList())));

        try {
            if (IsoDep.get(tag) != null) {
                leeIsoDep(toque, tag);
            }

            if (!toque.has("enlace") && Ndef.get(tag) != null) {
                leeNdef(toque, tag);
            }

            if (toque.has("enlace") || toque.has("texto")) {
                toque.remove("error");
            }
        } catch (Exception error) {
            Log.w(ETIQUETA, "lector falla", error);
            toque.put("error", error.getMessage() == null ? "No se pudo leer." : error.getMessage());
        }

        if (!toque.has("enlace") && !toque.has("datos") && !toque.has("error")) {
            toque.put("error", "El otro teléfono no respondió como tarjeta.");
        }

        toque.put("origen", toque.has("enlace") || toque.has("datos") ? "EMISION" : "DESCONOCIDO");

        Log.i(ETIQUETA, "toque: enlace=" + toque.optString("enlace", "-")
                + " datos=" + toque.optString("datos", "-").length()
                + " entregada=" + toque.optBoolean("entregada")
                + " error=" + toque.optString("error", "-"));

        notifyListeners("toque", toque);
    };

    private static List<String> nombresDe(String[] tecnicas) {
        List<String> cortos = new ArrayList<>();

        for (String tecnica : tecnicas) {
            int punto = tecnica.lastIndexOf('.');
            cortos.add(punto >= 0 ? tecnica.substring(punto + 1) : tecnica);
        }

        return cortos;
    }

    private void leeNdef(JSObject toque, android.nfc.Tag tag) throws Exception {
        Ndef ndef = Ndef.get(tag);
        ndef.connect();
        NdefMessage mensaje = ndef.getCachedNdefMessage();

        if (mensaje == null) {
            mensaje = ndef.getNdefMessage();
        }

        if (mensaje != null) {
            rellenaRegistros(toque, mensaje);
        }

        ndef.close();
    }

    private void rellenaRegistros(JSObject toque, NdefMessage mensaje) {
        for (NdefRecord registro : mensaje.getRecords()) {
            if (toque.has("enlace") && toque.has("texto")) {
                return;
            }

            if (registro.getTnf() == NdefRecord.TNF_WELL_KNOWN
                    && Arrays.equals(registro.getType(), NdefRecord.RTD_URI)) {
                Uri uri = registro.toUri();
                if (uri != null) {
                    toque.put("enlace", uri.toString());
                }
                continue;
            }

            if (registro.getTnf() == NdefRecord.TNF_WELL_KNOWN
                    && Arrays.equals(registro.getType(), NdefRecord.RTD_TEXT)) {
                byte[] payload = registro.getPayload();

                if (payload.length > 0) {
                    int idioma = payload[0] & 0x3F;

                    if (payload.length > idioma + 1) {
                        toque.put("texto", new String(payload, idioma + 1, payload.length - idioma - 1, StandardCharsets.UTF_8));
                    }
                }
            }
        }
    }

    private void leeIsoDep(JSObject toque, android.nfc.Tag tag) throws Exception {
        IsoDep iso = IsoDep.get(tag);
        iso.connect();
        iso.setTimeout(4000);

        byte[] respuesta = iso.transceive(seleccionAid(AID_PROPIA));

        Log.i(ETIQUETA, "select propia -> " + estado(respuesta));

        if (!terminaEnExito(respuesta)) {
            leeComoEtiqueta(toque, iso);

            if (!toque.has("enlace")) {
                toque.put("error", "El otro teléfono no tiene una tarjeta lista para entregar.");
            }

            iso.close();
            return;
        }

        List<Byte> acumulado = new ArrayList<>();
        int posicion = 0;

        while (acumulado.size() < MAXIMO_DATOS) {
            byte[] lectura = {
                    0x00, (byte) 0xB0,
                    (byte) ((posicion >> 8) & 0xFF), (byte) (posicion & 0xFF),
                    (byte) 0xF0
            };

            byte[] trozo = iso.transceive(lectura);

            if (!terminaEnExito(trozo) || trozo.length <= 2) {
                break;
            }

            for (int i = 0; i < trozo.length - 2; i++) {
                acumulado.add(trozo[i]);
            }

            if (trozo.length - 2 < 0xF0) {
                break;
            }

            posicion += trozo.length - 2;
        }

        if (acumulado.isEmpty()) {
            leeComoEtiqueta(toque, iso);
        }

        toque.put("entregada", dejaLaMia(iso));
        iso.close();

        if (!acumulado.isEmpty()) {
            byte[] crudo = new byte[acumulado.size()];

            for (int i = 0; i < acumulado.size(); i++) {
                crudo[i] = acumulado.get(i);
            }

            String contenido = new String(crudo, StandardCharsets.UTF_8);
            toque.put("datos", contenido);

            int inicio = contenido.indexOf("\"enlace\":\"");

            if (inicio >= 0) {
                int desde = inicio + 10;
                int hasta = contenido.indexOf('"', desde);

                if (hasta > desde) {
                    toque.put("enlace", contenido.substring(desde, hasta));
                }
            }
        }
    }

    private static byte[] seleccionAid(byte[] aid) {
        byte[] apdu = new byte[5 + aid.length];
        apdu[0] = 0x00;
        apdu[1] = (byte) 0xA4;
        apdu[2] = 0x04;
        apdu[4] = (byte) aid.length;
        System.arraycopy(aid, 0, apdu, 5, aid.length);

        return apdu;
    }

    private static byte[] envia(IsoDep iso, byte[] apdu) throws Exception {
        byte[] respuesta = iso.transceive(apdu);

        Log.i(ETIQUETA, "lee >> " + hexadecimal(apdu) + "  << " + estado(respuesta));

        return terminaEnExito(respuesta) ? Arrays.copyOfRange(respuesta, 0, respuesta.length - 2) : null;
    }

    private static String estado(byte[] respuesta) {
        if (respuesta == null || respuesta.length < 2) {
            return "nula";
        }

        return String.format("%02X%02X",
                respuesta[respuesta.length - 2] & 0xFF, respuesta[respuesta.length - 1] & 0xFF);
    }

    private static String hexadecimal(byte[] bytes) {
        StringBuilder texto = new StringBuilder();

        for (byte b : bytes) {
            texto.append(String.format("%02X", b));
        }

        return texto.toString();
    }

    private static byte[] leePosicion(IsoDep iso, int inicio, int largo) throws Exception {
        return envia(iso, new byte[]{
                0x00, (byte) 0xB0,
                (byte) ((inicio >> 8) & 0xFF), (byte) (inicio & 0xFF),
                (byte) largo
        });
    }

    private void leeComoEtiqueta(JSObject toque, IsoDep iso) {
        try {
            if (envia(iso, seleccionAid(AID_T4T)) == null || envia(iso, ARCHIVO_MENSAJE) == null) {
                return;
            }

            byte[] cabecera = leePosicion(iso, 0, 2);

            if (cabecera == null || cabecera.length < 2) {
                return;
            }

            int total = ((cabecera[0] & 0xFF) << 8) | (cabecera[1] & 0xFF);

            if (total <= 0 || total > MAXIMO_DATOS) {
                return;
            }

            byte[] mensaje = new byte[total];
            int leido = 0;

            while (leido < total) {
                byte[] trozo = leePosicion(iso, 2 + leido, Math.min(0xF0, total - leido));

                if (trozo == null || trozo.length == 0) {
                    return;
                }

                int copiar = Math.min(trozo.length, total - leido);
                System.arraycopy(trozo, 0, mensaje, leido, copiar);
                leido += copiar;
            }

            rellenaRegistros(toque, new NdefMessage(mensaje));
        } catch (Exception noEsEtiqueta) {
        }
    }

    private boolean dejaLaMia(IsoDep iso) {
        Emision.asegurar(getContext());

        byte[] propio = Emision.datos;

        if (propio == null || propio.length == 0) {
            return false;
        }

        try {
            if (envia(iso, seleccionAid(AID_PROPIA)) == null) {
                return false;
            }
            for (int posicion = 0; posicion < propio.length; posicion += TROZO_ESCRITURA) {
                int largo = Math.min(TROZO_ESCRITURA, propio.length - posicion);

                byte[] pedido = new byte[5 + largo];
                pedido[0] = 0x00;
                pedido[1] = (byte) 0xD6;
                pedido[2] = (byte) ((posicion >> 8) & 0xFF);
                pedido[3] = (byte) (posicion & 0xFF);
                pedido[4] = (byte) largo;
                System.arraycopy(propio, posicion, pedido, 5, largo);

                if (!terminaEnExito(iso.transceive(pedido))) {
                    Log.i(ETIQUETA, "write en " + posicion + " rechazada");
                    return false;
                }
            }

            Log.i(ETIQUETA, "escribi " + propio.length + " bytes en el otro teléfono");

            return true;
        } catch (Exception elOtroNoAcepta) {
            return false;
        }
    }

    private static boolean terminaEnExito(byte[] respuesta) {
        return respuesta != null && respuesta.length >= 2
                && (respuesta[respuesta.length - 2] & 0xFF) == 0x90
                && (respuesta[respuesta.length - 1] & 0xFF) == 0x00;
    }

    private boolean emulacionDisponible() {
        if (adaptador == null) {
            return false;
        }

        try {
            return getContext().getPackageManager()
                    .hasSystemFeature("android.hardware.nfc.hce");
        } catch (Exception error) {
            return false;
        }
    }

    private JSObject permisos() {
        JSObject resultado = new JSObject();

        for (String permiso : permisosRequeridos()) {
            resultado.put(nombreCorto(permiso), concedido(permiso));
        }

        return resultado;
    }

    private boolean concedido(String permiso) {
        return ContextCompat.checkSelfPermission(getContext(), permiso) == PackageManager.PERMISSION_GRANTED;
    }

    private String[] permisosFaltantes() {
        List<String> lista = new ArrayList<>();

        for (String permiso : permisosRequeridos()) {
            if (!concedido(permiso)) {
                lista.add(permiso);
            }
        }

        return lista.toArray(new String[0]);
    }

    private static String[] permisosRequeridos() {
        List<String> lista = new ArrayList<>();

        lista.add(Manifest.permission.CAMERA);
        lista.add(Manifest.permission.READ_CONTACTS);
        lista.add(Manifest.permission.WRITE_CONTACTS);
        lista.add(Manifest.permission.ACCESS_FINE_LOCATION);
        lista.add(Manifest.permission.ACCESS_COARSE_LOCATION);

        if (Build.VERSION.SDK_INT >= 33) {
            lista.add(Manifest.permission.POST_NOTIFICATIONS);
            lista.add(Manifest.permission.READ_MEDIA_IMAGES);
            lista.add(Manifest.permission.READ_MEDIA_VIDEO);
        } else {
            lista.add(Manifest.permission.READ_EXTERNAL_STORAGE);
        }

        if (Build.VERSION.SDK_INT >= 31) {
            lista.add(Manifest.permission.BLUETOOTH_SCAN);
            lista.add(Manifest.permission.BLUETOOTH_CONNECT);
        } else {
            lista.add(Manifest.permission.BLUETOOTH);
            lista.add(Manifest.permission.BLUETOOTH_ADMIN);
        }

        return lista.toArray(new String[0]);
    }

    private static String nombreCorto(String permiso) {
        int punto = permiso.lastIndexOf('.');
        return punto >= 0 ? permiso.substring(punto + 1) : permiso;
    }

    @PluginMethod
    public void rutaPendiente(PluginCall call) {
        String ruta = rutaPendiente == null ? "" : rutaPendiente;
        rutaPendiente = null;

        JSObject resultado = new JSObject();
        resultado.put("ruta", ruta);
        call.resolve(resultado);
    }

    static void enviaTransmision(String rol, String fase, int enviados, int total) {
        DispositivoNfcPlugin plugin = instancia;

        if (plugin == null) {
            return;
        }

        JSObject aviso = new JSObject();
        aviso.put("rol", rol);
        aviso.put("fase", fase);
        aviso.put("enviados", enviados);
        aviso.put("total", total);

        plugin.temporizador.post(() -> plugin.notifyListeners("transmision", aviso));
    }

    static void anotaEnlace(String ruta) {
        rutaPendiente = ruta;

        DispositivoNfcPlugin plugin = instancia;

        if (plugin == null) {
            return;
        }

        JSObject aviso = new JSObject();
        aviso.put("ruta", ruta);
        plugin.notifyListeners("enlace", aviso);
    }

    static void entregaResultados(int solicitud, String[] permisos, int[] resultados) {
        if (instancia == null || instancia.esperaPermisos == null || solicitud != SOLICITUD) {
            return;
        }

        PluginCall call = instancia.esperaPermisos;
        instancia.esperaPermisos = null;
        call.resolve(instancia.permisos());
    }
}
