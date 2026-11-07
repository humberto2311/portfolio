package com.nfcsoft.sistem;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public final class ConstruirNdef {

    private static final String[] PREFIJOS = {
            "",
            "http://www.",
            "https://www.",
            "http://",
            "https://",
            "tel:",
            "mailto:",
    };

    private ConstruirNdef() {
    }

    public static byte[] mensajeUri(String url) {
        if (url == null || url.isBlank()) return null;

        byte[] crudo = url.getBytes(StandardCharsets.UTF_8);

        int codigo = 0;
        byte[] resto = crudo;

        for (int i = PREFIJOS.length - 1; i >= 1; i--) {
            if (url.startsWith(PREFIJOS[i])) {
                codigo = i;
                resto = Arrays.copyOfRange(crudo, PREFIJOS[i].length(), crudo.length);
                break;
            }
        }

        int payload = resto.length + 1;
        if (payload > 255) return null;

        byte[] mensaje = new byte[5 + resto.length];
        mensaje[0] = (byte) 0xD1;
        mensaje[1] = 0x01;
        mensaje[2] = (byte) payload;
        mensaje[3] = 0x55;
        mensaje[4] = (byte) codigo;
        System.arraycopy(resto, 0, mensaje, 5, resto.length);

        return mensaje;
    }

    public static byte[] conLongitudDelante(byte[] mensaje) {
        byte[] archivo = new byte[mensaje.length + 2];
        archivo[0] = (byte) ((mensaje.length >> 8) & 0xFF);
        archivo[1] = (byte) (mensaje.length & 0xFF);
        System.arraycopy(mensaje, 0, archivo, 2, mensaje.length);
        return archivo;
    }
}
