package com.nfcsoft.sistem;

import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.nfc.NfcAdapter;
import android.nfc.cardemulation.CardEmulation;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;

public class EmisoraNfcResguardo extends Service {

    private static final String ETIQUETA = "sistemNfc";

    @Override
    public int onStartCommand(Intent intento, int banderas, int arranque) {
        Emision.asegurar(this);
        EmisionActiva.marcarActiva(this, true);

        String nombre = EmisionActiva.nombre(this);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(AvisoEmision.ID_AVISO, AvisoEmision.construir(this, nombre), AvisoEmision.tipoServicio());
        } else {
            startForeground(AvisoEmision.ID_AVISO, AvisoEmision.construir(this, nombre));
        }

        Log.i(ETIQUETA, "emision reanudada con la tarjeta " + EmisionActiva.slug(this));

        revisarPredeterminada();

        return START_STICKY;
    }

    private void revisarPredeterminada() {
        NfcAdapter adaptador = NfcAdapter.getDefaultAdapter(this);

        if (adaptador == null) {
            return;
        }

        CardEmulation emisora = CardEmulation.getInstance(adaptador);
        boolean esLaMia = emisora.isDefaultServiceForCategory(
                new android.content.ComponentName(this, EmisoraNfcService.class),
                CardEmulation.CATEGORY_OTHER);

        Log.i(ETIQUETA, "emisora predeterminada=" + esLaMia);
    }

    @Override
    public void onDestroy() {
        EmisionActiva.marcarActiva(this, false);
        AvisoEmision.retirar(this);
        Log.i(ETIQUETA, "emision reanudada detenida");

        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intento) {
        return null;
    }
}
