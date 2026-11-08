package com.nfcsoft.sistem;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import java.nio.charset.StandardCharsets;

public final class Emision {

    public static final int MAXIMO_DATOS = 4096;

    private static final String ARCHIVO = "emisora_nfc";
    private static final String CLAVE_ENLACE = "enlace";
    private static final String CLAVE_NDEF = "ndef";
    private static final String CLAVE_DATOS = "datos";

    public static volatile byte[] ndef = null;
    public static volatile byte[] datos = null;
    public static volatile String enlace = null;

    private static boolean cargado = false;
    private static byte[] entrante = null;
    private static int llenado = 0;

    private Emision() {
    }

    public static synchronized void asegurar(Context contexto) {
        if (cargado) return;

        SharedPreferences preferencias = contexto.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE);

        enlace = preferencias.getString(CLAVE_ENLACE, null);
        ndef = decodificar(preferencias.getString(CLAVE_NDEF, null));
        datos = decodificar(preferencias.getString(CLAVE_DATOS, null));
        cargado = true;
    }

    public static synchronized void guardar(Context contexto, String url, byte[] mensaje, byte[] contenido) {
        enlace = url;
        ndef = mensaje;
        datos = contenido;
        cargado = true;

        contexto.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE).edit()
                .putString(CLAVE_ENLACE, url)
                .putString(CLAVE_NDEF, codificar(mensaje))
                .putString(CLAVE_DATOS, codificar(contenido))
                .apply();
    }

    public static synchronized void abrirSesion() {
        entrante = null;
        llenado = 0;
    }

    public static synchronized void escribe(int posicion, byte[] trozo) {
        if (trozo == null || trozo.length == 0 || posicion < 0 || posicion >= MAXIMO_DATOS) {
            return;
        }

        if (entrante == null) {
            entrante = new byte[MAXIMO_DATOS];
        }

        int disponible = Math.min(trozo.length, MAXIMO_DATOS - posicion);
        System.arraycopy(trozo, 0, entrante, posicion, disponible);

        if (posicion + disponible > llenado) {
            llenado = posicion + disponible;
        }
    }

    public static synchronized int recibido() {
        return llenado;
    }

    public static synchronized String cosecha() {
        if (entrante == null || llenado == 0) {
            return null;
        }

        String contenido = new String(entrante, 0, llenado, StandardCharsets.UTF_8).trim();
        abrirSesion();

        if (!contenido.startsWith("{") || !contenido.contains("\"usuarioId\"")) {
            return null;
        }

        return contenido;
    }

    public static boolean hayTarjeta() {
        return ndef != null || (datos != null && datos.length > 0);
    }

    private static String codificar(byte[] bytes) {
        return bytes == null ? null : Base64.encodeToString(bytes, Base64.NO_WRAP);
    }

    private static byte[] decodificar(String texto) {
        if (texto == null || texto.isEmpty()) return null;

        try {
            return Base64.decode(texto, Base64.NO_WRAP);
        } catch (IllegalArgumentException corrupto) {
            return null;
        }
    }
}
