package com.nfcsoft.sistem;

import android.content.Context;
import android.content.SharedPreferences;

public final class EmisionActiva {

    public static final String ACCION_REANUDAR = "com.nfcsoft.sistem.REANUDAR_EMISION";

    private static final String ARCHIVO = "emisora_activa";
    private static final String CLAVE_USUARIO = "usuario_id";
    private static final String CLAVE_SLUG = "slug";
    private static final String CLAVE_NOMBRE = "nombre";
    private static final String CLAVE_ACTIVA = "activa";
    private static final String CLAVE_REANUDA = "reanudar";

    private EmisionActiva() {
    }

    public static synchronized void guardar(Context contexto, String usuarioId, String slug, String nombre) {
        preferencias(contexto).edit()
                .putString(CLAVE_USUARIO, usuarioId)
                .putString(CLAVE_SLUG, slug)
                .putString(CLAVE_NOMBRE, nombre)
                .putBoolean(CLAVE_ACTIVA, true)
                .apply();
    }

    public static synchronized void marcarActiva(Context contexto, boolean activa) {
        preferencias(contexto).edit().putBoolean(CLAVE_ACTIVA, activa).apply();
    }

    public static synchronized boolean activa(Context contexto) {
        return preferencias(contexto).getBoolean(CLAVE_ACTIVA, false);
    }

    public static synchronized boolean reanuda(Context contexto) {
        return preferencias(contexto).getBoolean(CLAVE_REANUDA, true);
    }

    public static synchronized void reanudar(Context contexto, boolean reanudar) {
        preferencias(contexto).edit().putBoolean(CLAVE_REANUDA, reanudar).apply();
    }

    public static synchronized String usuarioId(Context contexto) {
        return preferencias(contexto).getString(CLAVE_USUARIO, null);
    }

    public static synchronized String slug(Context contexto) {
        return preferencias(contexto).getString(CLAVE_SLUG, null);
    }

    public static synchronized String nombre(Context contexto) {
        String nombre = preferencias(contexto).getString(CLAVE_NOMBRE, null);

        return nombre == null || nombre.isBlank() ? "tu tarjeta" : nombre;
    }

    public static synchronized void olvidar(Context contexto) {
        preferencias(contexto).edit()
                .remove(CLAVE_USUARIO)
                .remove(CLAVE_SLUG)
                .remove(CLAVE_NOMBRE)
                .putBoolean(CLAVE_ACTIVA, false)
                .apply();
    }

    private static SharedPreferences preferencias(Context contexto) {
        return contexto.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE);
    }
}
