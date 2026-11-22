package com.nfcsoft.sistem;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;

import androidx.core.app.NotificationCompat;

public final class AvisoEmision {

    private static final String CANAL = "emisora_nfc";
    public static final int ID_AVISO = 4711;

    private AvisoEmision() {
    }

    public static void crearCanal(Context contexto) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationChannel canal = new NotificationChannel(
                CANAL,
                "Tarjeta NFC activa",
                NotificationManager.IMPORTANCE_LOW);

        canal.setDescription("Muestra qué tarjeta estás entregando por NFC.");
        canal.setShowBadge(false);

        NotificationManager gestor = contexto.getSystemService(NotificationManager.class);

        if (gestor != null) {
            gestor.createNotificationChannel(canal);
        }
    }

    public static Notification construir(Context contexto, String nombre) {
        crearCanal(contexto);

        Intent abrir = new Intent(contexto, MainActivity.class);
        abrir.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent destino = PendingIntent.getActivity(
                contexto,
                0,
                abrir,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(contexto, CANAL)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Tarjeta activa: " + nombre)
                .setContentText("Acerca tu teléfono a otro para entregarla.")
                .setContentIntent(destino)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setSilent(true)
                .build();
    }

    public static void mostrar(Context contexto, String nombre) {
        NotificationManager gestor = contexto.getSystemService(NotificationManager.class);

        if (gestor != null) {
            gestor.notify(ID_AVISO, construir(contexto, nombre));
        }
    }

    public static void retirar(Context contexto) {
        NotificationManager gestor = contexto.getSystemService(NotificationManager.class);

        if (gestor != null) {
            gestor.cancel(ID_AVISO);
        }
    }

    public static int tipoServicio() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            return ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE;
        }

        return 0;
    }
}
