export {};

declare global {
  interface Window {
    /**
     * Ruta base bajo la que corre la app (p.ej. '/copiwaypro'), inyectada por
     * public/spa.php. Vacío si la app vive en la raíz del host.
     */
    __APP_BASE__?: string;
  }
}
