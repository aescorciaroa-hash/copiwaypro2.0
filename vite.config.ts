import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, Plugin} from 'vite';

// Vite siempre escribe una copia transformada de index.html en outDir (es su
// entrada de build por defecto) -- pero esa index.html es solo la plantilla
// de "npm run dev" y NUNCA debe servirse en produccion: no tiene data-pagina
// ni window.__APP_BASE__/__DATOS__ (eso lo inyecta app/Views/layouts/cabecera.php).
// Si queda en public/, Apache puede preferirla sobre index.php al resolver el
// directory index, rompiendo rutaBase() (login sin el prefijo de subcarpeta,
// 404). Se borra despues de cada build para que public/ solo tenga el front
// controller PHP + los assets compilados.
function borrarIndexHtmlDelBuild(outDir: string): Plugin {
  return {
    name: 'borrar-index-html-post-build',
    closeBundle() {
      const destino = path.resolve(outDir, 'index.html');
      if (fs.existsSync(destino)) {
        fs.unlinkSync(destino);
      }
    },
  };
}

export default defineConfig(({mode}) => {
  // Lee el mismo .env que usa el backend PHP (sin prefijo VITE_ obligatorio),
  // solo para el proxy de desarrollo -- nunca queda un dominio fijo en el bundle.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './',
    plugins: [react(), tailwindcss(), borrarIndexHtmlDelBuild('public')],
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
