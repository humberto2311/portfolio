package com.nfcsoft.sistem;

import android.content.Intent;
import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;

import java.util.Arrays;

public class EmisoraNfcService extends HostApduService {

    public static final String ACCION_TOQUE = "com.nfcsoft.sistem.TOQUE_ENTRANTE";

    private static final String AID_T4T = "D2760000850101";
    private static final String AID_PROPIA = "A0000000BFC10101";

    private static final byte[] OK = {(byte) 0x90, 0x00};
    private static final byte[] NO_EXISTE = {0x6A, (byte) 0x82};
    private static final byte[] INS_INVALIDA = {0x6D, 0x00};
    private static final byte[] FUERA_RANGO = {0x6B, 0x00};

    private static final byte[] CONTENEDOR_CAPACIDADES = {
            (byte) 0xE1, 0x10, 0x40, 0x00, 0x03, 0x00, 0x00, (byte) 0xFE,
            0x11, 0x00, 0x01, 0x40, 0x00, 0x00, 0x00
    };

    private static final int ARCHIVO_NINGUNO = 0;
    private static final int ARCHIVO_CAPACIDADES = 1;
    private static final int ARCHIVO_MENSAJE = 2;

    private int archivo = ARCHIVO_CAPACIDADES;
    private boolean emulaT4T = true;

    @Override
    public byte[] processCommandApdu(byte[] apdu, Bundle extras) {
        if (apdu == null || apdu.length < 4) {
            return INS_INVALIDA;
        }

        Emision.asegurar(this);

        int ins = apdu[1] & 0xFF;

        if (ins == 0xA4) {
            return seleccionar(apdu);
        }

        if (ins == 0xD6) {
            return escribe(apdu);
        }

        if (ins != 0xB0) {
            return INS_INVALIDA;
        }

        return leer(apdu);
    }

    @Override
    public void onDeactivated(int motivo) {
        archivo = ARCHIVO_CAPACIDADES;
        emulaT4T = true;

        entregaLoRecibido();
    }

    private byte[] escribe(byte[] apdu) {
        if (emulaT4T) {
            return OK;
        }

        int posicion = ((apdu[2] & 0xFF) << 8) | (apdu[3] & 0xFF);
        int largo = apdu.length > 4 ? (apdu[4] & 0xFF) : 0;

        if (largo > 0 && apdu.length >= 5 + largo) {
            Emision.escribe(posicion, Arrays.copyOfRange(apdu, 5, 5 + largo));
        }

        return OK;
    }

    private void entregaLoRecibido() {
        String contenido = Emision.cosecha();

        if (contenido == null) {
            return;
        }

        Intent aviso = new Intent(ACCION_TOQUE);
        aviso.putExtra("datos", contenido);
        aviso.putExtra("enlace", dentro(contenido, "\"enlace\":\""));

        try {
            sendBroadcast(aviso);
        } catch (Exception nadieEscucha) {
        }
    }

    private static String dentro(String texto, String clave) {
        int inicio = texto.indexOf(clave);

        if (inicio < 0) {
            return null;
        }

        int desde = inicio + clave.length();
        int hasta = texto.indexOf('"', desde);

        return hasta > desde ? texto.substring(desde, hasta) : null;
    }

    private byte[] seleccionar(byte[] apdu) {
        int p1 = apdu[2] & 0xFF;
        int largo = apdu.length > 4 ? (apdu[4] & 0xFF) : 0;

        if (largo <= 0 || apdu.length < 5 + largo) {
            return NO_EXISTE;
        }

        byte[] nombre = Arrays.copyOfRange(apdu, 5, 5 + largo);

        if (p1 == 0x04 || p1 == 0x0C) {
            if (coincideAid(AID_T4T, nombre)) {
                archivo = ARCHIVO_CAPACIDADES;
                emulaT4T = true;
                return OK;
            }
            if (coincideAid(AID_PROPIA, nombre)) {
                archivo = ARCHIVO_NINGUNO;
                emulaT4T = false;
                Emision.abrirSesion();
                return OK;
            }

            return NO_EXISTE;
        }

        if (p1 == 0x00 && emulaT4T && largo == 2) {
            int identificador = ((nombre[0] & 0xFF) << 8) | (nombre[1] & 0xFF);

            if (identificador == 0xE110) {
                archivo = ARCHIVO_CAPACIDADES;
                return OK;
            }
            if (identificador == 0xE111) {
                archivo = ARCHIVO_MENSAJE;
                return OK;
            }
        }

        return NO_EXISTE;
    }

    private byte[] leer(byte[] apdu) {
        byte[] contenido = contenido();
        if (contenido == null) {
            return NO_EXISTE;
        }

        int inicio = ((apdu[2] & 0xFF) << 8) | (apdu[3] & 0xFF);
        int pedido = apdu.length > 4 ? (apdu[4] & 0xFF) : 0;
        if (pedido == 0) {
            pedido = 256;
        }

        if (inicio >= contenido.length) {
            return FUERA_RANGO;
        }

        int disponible = Math.min(pedido, contenido.length - inicio);
        byte[] respuesta = new byte[disponible + 2];
        System.arraycopy(contenido, inicio, respuesta, 0, disponible);
        respuesta[disponible] = OK[0];
        respuesta[disponible + 1] = OK[1];

        return respuesta;
    }

    private byte[] contenido() {
        if (!emulaT4T) {
            return Emision.datos;
        }

        if (archivo == ARCHIVO_CAPACIDADES) {
            return CONTENEDOR_CAPACIDADES;
        }

        return Emision.ndef;
    }

    private static boolean coincideAid(String registrado, byte[] pedido) {
        String pedidoHex = getHexadecimal(pedido).toUpperCase();
        String registradoHex = registrado.toUpperCase();

        return pedidoHex.startsWith(registradoHex) || registradoHex.startsWith(pedidoHex);
    }

    private static String getHexadecimal(byte[] bytes) {
        StringBuilder texto = new StringBuilder(bytes.length * 2);

        for (byte b : bytes) {
            texto.append(String.format("%02X", b));
        }

        return texto.toString();
    }
}
