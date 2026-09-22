import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // Lee el mismo .env que usa el backend PHP (sin prefijo VITE_ obligatorio),
  // solo para el proxy de desarrollo -- nunca queda un dominio fijo en el bundle.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Sin carpeta de assets estáticos propia (no hay 'public/' de origen distinta
    // del destino de build); evita que Vite trate public/ como ambas cosas a la vez.
    publicDir: false,
    build: {
      // Compila directamente a la carpeta que sirve el front controller PHP.
      // emptyOutDir:false es critico: public/ ya contiene index.php y .htaccess
      // (el backend), que Vite NO debe borrar al reconstruir el frontend.
      outDir: 'public',
      emptyOutDir: false,
      rollupOptions: {
        output: {
          // Nombres FIJOS (sin hash) y un solo archivo (sin chunks ni manifest):
          // la plantilla PHP (app/Views/layouts) referencia estos nombres
          // directamente y agrega ?v=filemtime() para el cache-busting.
          entryFileNames: 'assets/main.js',
          assetFileNames: (info) => {
            if (info.name && info.name.endsWith('.css')) {
              return 'assets/main.css';
            }
            return 'assets/[name][extname]';
          },
          inlineDynamicImports: true,
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // En desarrollo, las llamadas a /api/* se redirigen al backend PHP (por
      // defecto el servidor embebido en localhost:8000 -- ver start.bat).
      // Cambia VITE_API_PROXY_TARGET en .env si usas Apache/subcarpeta en su lugar.
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
