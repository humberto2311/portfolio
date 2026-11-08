package com.nfcsoft.sistem;

import android.content.Intent;
import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;
import android.util.Log;

import java.util.Arrays;

public class EmisoraNfcService extends HostApduService {

    public static final String ACCION_TOQUE = "com.nfcsoft.sistem.TOQUE_ENTRANTE";

    private static final String ETIQUETA = "sistemNfc";

    private static final String AID_T4T = "D2760000850101";
    static final String AID_PROPIA = "A0000000BFC10101";

    private static final String LEE_PROPIA = "propia";
    private static final String LEE_ETIQUETA = "etiqueta";

    private static final byte[] OK = {(byte) 0x90, 0x00};
    private static final byte[] NO_EXISTE = {0x6A, (byte) 0x82};
    private static final byte[] INS_INVALIDA = {0x6D, 0x00};
    private static final byte[] FUERA_RANGO = {0x6B, 0x00};

    private static final byte[] CONTENEDOR_CAPACIDADES = {
            0x00, 0x0F,
            0x20,
            0x00, (byte) 0xF7,
            0x00, (byte) 0xF7,
            0x01,
            (byte) 0xE1, 0x05,
            (byte) 0xE1, 0x04,
            0x7F, (byte) 0xF6,
            0x00
    };

    private static final int ARCHIVO_NINGUNO = 0;
    private static final int ARCHIVO_CAPACIDADES = 1;
    private static final int ARCHIVO_MENSAJE = 2;

    private int archivo = ARCHIVO_CAPACIDADES;
    private boolean emulaT4T = true;
    private boolean sesion = false;
    private boolean entregado = false;
    private int enviados = 0;
    private int total = 0;
    private String rol = "";

    @Override
    public byte[] processCommandApdu(byte[] apdu, Bundle extras) {
        byte[] respuesta = responde(apdu);

        Log.i(ETIQUETA, "entra " + hexadecimal(apdu) + " sale " + hexadecimal(respuesta)
                + " rol=" + rol + " enviados=" + enviados + "/" + total);

        return respuesta;
    }

    private byte[] responde(byte[] apdu) {
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
        Log.i(ETIQUETA, "desactivado motivo=" + motivo + " rol=" + rol
                + " enviados=" + enviados + "/" + total + " recibido=" + Emision.recibido());

        if (sesion && !entregado && (enviados > 0 || Emision.recibido() > 0)) {
            entrega();
        } else if (sesion && !entregado) {
            avisa("salio");
        }

        archivo = ARCHIVO_CAPACIDADES;
        emulaT4T = true;
        sesion = false;
        entregado = false;
        enviados = 0;
        total = 0;
        rol = "";

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

        Log.i(ETIQUETA, "cosecha=" + (contenido == null ? "nada" : contenido.length() + " caracteres"));

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
                abreSesion(LEE_ETIQUETA);
                return OK;
            }
            if (coincideAid(AID_PROPIA, nombre)) {
                archivo = ARCHIVO_NINGUNO;
                emulaT4T = false;
                abreSesion(LEE_PROPIA);
                return OK;
            }

            return NO_EXISTE;
        }

        if (p1 == 0x00 && emulaT4T && largo == 2) {
            int identificador = ((nombre[0] & 0xFF) << 8) | (nombre[1] & 0xFF);

            if (identificador == 0xE103 || identificador == 0xE110 || identificador == 0x0000) {
                archivo = ARCHIVO_CAPACIDADES;
                return OK;
            }
            if (identificador == 0xE104 || identificador == 0xE111
                    || identificador == 0x0001 || identificador == 0x0002 || identificador == 0x0003) {
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

        if (!emulaT4T || archivo == ARCHIVO_MENSAJE) {
            progreso(inicio + disponible, contenido.length);
        }

        return respuesta;
    }

    private void progreso(int hasta, int largoTotal) {
        total = largoTotal;
        enviados = Math.max(enviados, hasta);

        if (enviados >= total) {
            entrega();
            return;
        }

        avisa("enviando");
    }

    private void entrega() {
        if (entregado) {
            return;
        }

        entregado = true;
        total = Math.max(total, 1);
        enviados = total;

        avisa("enviado");
    }

    private void abreSesion(String origen) {
        rol = origen;

        if (sesion) {
            return;
        }

        sesion = true;
        entregado = false;
        enviados = 0;
        total = 0;

        Emision.abrirSesion();

        avisa("conectado");
    }

    private void avisa(String fase) {
        DispositivoNfcPlugin.enviaTransmision(rol, fase, enviados, total);
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

    private static String hexadecimal(byte[] bytes) {
        if (bytes == null) {
            return "null";
        }

        return getHexadecimal(bytes);
    }

    private static String getHexadecimal(byte[] bytes) {
        StringBuilder texto = new StringBuilder(bytes.length * 2);

        for (byte b : bytes) {
            texto.append(String.format("%02X", b));
        }

        return texto.toString();
    }
}
