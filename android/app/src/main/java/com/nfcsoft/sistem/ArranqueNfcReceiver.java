package com.nfcsoft.sistem;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class ArranqueNfcReceiver extends BroadcastReceiver {

    private static final String ETIQUETA = "sistemNfc";

    @Override
    public void onReceive(Context contexto, Intent intento) {
        String accion = intento == null ? null : intento.getAction();

        boolean arranque = Intent.ACTION_BOOT_COMPLETED.equals(accion)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(accion)
                || EmisionActiva.ACCION_REANUDAR.equals(accion);

        if (!arranque) {
            return;
        }

        Emision.asegurar(contexto);

        if (!EmisionActiva.reanuda(contexto) || !Emision.hayTarjeta() || EmisionActiva.slug(contexto) == null) {
            Log.i(ETIQUETA, "no se reanuda la emision: " + accion);
            return;
        }

        Intent servicio = new Intent(contexto, EmisoraNfcResguardo.class);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                contexto.startForegroundService(servicio);
            } else {
                contexto.startService(servicio);
            }
        } catch (Exception error) {
            Log.w(ETIQUETA, "no se pudo reanudar la emision", error);
        }
    }
}
