import {StrictMode, type ComponentType} from 'react';
import {createRoot} from 'react-dom/client';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import KitchenDashboard from './pages/KitchenDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import {ThemeProvider} from './context/ThemeContext';
import FirebaseSync from './components/FirebaseSync';
import './index.css';

// Sin BrowserRouter: cada URL la resuelve el backend PHP (config/paginas.php)
// y le dice a esta pagina, via data-pagina, que componente montar. Navegar
// entre paginas es una recarga normal (window.location.href), no un cambio
// de ruta en memoria.
const PAGINAS: Record<string, ComponentType> = {
  landing: Landing,
  login: Login,
  register: Register,
  'forgot-password': ForgotPassword,
  admin: AdminDashboard,
  client: ClientDashboard,
  kitchen: KitchenDashboard,
  delivery: DeliveryDashboard,
};

const contenedor = document.getElementById('app');

// En "npm run dev" (sin PHP de por medio) no hay data-pagina en el HTML de
// Vite; se puede forzar con ?pagina=admin en la URL para probar una pantalla.
const nombrePagina =
  contenedor?.dataset.pagina ||
  new URLSearchParams(window.location.search).get('pagina') ||
  'landing';

const Pagina = PAGINAS[nombrePagina] || Landing;

createRoot(contenedor!).render(
  <StrictMode>
    <ThemeProvider>
      <FirebaseSync />
      <Pagina />
    </ThemeProvider>
  </StrictMode>,
);
