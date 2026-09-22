export {};

declare global {
  interface DatosIniciales {
    usuario: Record<string, unknown> | null;
    rol: string | null;
    csrfToken: string;
    settings: {
      openTime: string;
      closeTime: string;
      isOpen?: boolean;
      isPaused?: boolean;
      shippingRate: number;
      profitMargin?: number;
      categories?: string[];
    };
  }

  interface Window {
    /**
     * Ruta base bajo la que corre la app (p.ej. '/copiwaypro'), inyectada por
     * app/Views/layouts/cabecera.php. Vacío si la app vive en la raíz del host.
     */
    __APP_BASE__?: string;
    /**
     * Estado inicial inyectado por el mismo layout PHP (usuario en sesión,
     * rol, csrfToken, configuración de la tienda), para evitar una llamada
     * extra al montar. No existe en "npm run dev" (sin PHP de por medio).
     */
    __DATOS__?: DatosIniciales;
  }
}
