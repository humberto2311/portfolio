package com.nfcsoft.sistem;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import androidx.core.content.ContextCompat;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DispositivoNfcPlugin.class);
        super.onCreate(savedInstanceState);
        anotaEnlace(getIntent());
        AvisoEmision.crearCanal(this);
        reanudaEmision();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        setIntent(intent);
        anotaEnlace(intent);

        super.onNewIntent(intent);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        DispositivoNfcPlugin.entregaResultados(requestCode, permissions, grantResults);
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    private void reanudaEmision() {
        Emision.asegurar(this);

        if (!EmisionActiva.reanuda(this) || !Emision.hayTarjeta() || EmisionActiva.slug(this) == null) {
            return;
        }

        ContextCompat.startForegroundService(this, new Intent(this, EmisoraNfcResguardo.class));
    }

    private void anotaEnlace(Intent intento) {
        Uri datos = intento == null ? null : intento.getData();

        if (datos == null || !esTarjeta(datos.getPath())) {
            return;
        }

        String consulta = datos.getQuery();

        DispositivoNfcPlugin.anotaEnlace(datos.getPath() + (consulta == null || consulta.isEmpty() ? "" : "?" + consulta));
    }

    private static boolean esTarjeta(String ruta) {
        return ruta != null && ruta.startsWith("/tarjeta/");
    }
}
