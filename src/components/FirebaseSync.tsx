import { useEffect, useRef } from 'react';
import { useStore, Product, InventoryItem, Ingredient, Staff, Order, Client, StoreConfig } from '../store/almacenAplicacion';
import { api, fetchSync, setCsrfToken } from '../servicios/api';

interface SyncData {
  products?: Product[];
  settings?: StoreConfig;
  inventory?: InventoryItem[];
  ingredients?: Ingredient[];
  staff?: Staff[];
  orders?: Order[];
  clients?: Client[];
}

const POLL_INTERVAL_MS = 2500;

/**
 * Sustituye los onSnapshot de Firestore por polling corto con ETag contra
 * /api/sync (ver src/servicios/api.ts: fetchSync). Mantiene el mismo nombre y
 * posición en el árbol que el componente original, y llena el store
 * exactamente igual que antes — solo cambia el origen de los datos.
 */
export default function FirebaseSync() {
  const {
    setProducts, setInventory, setStaff, setOrders,
    setIngredients, setClients, setStoreConfig
  } = useStore();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;

    // window.__DATOS__ (inyectado por el layout PHP) ya trae el csrfToken y la
    // configuración de la tienda listos; evita la llamada extra a /auth/me que
    // se hacía aquí antes solo para obtener el token. En "npm run dev" (sin
    // PHP) no existe, así que se sigue pidiendo el token por API como antes.
    if (window.__DATOS__) {
      setCsrfToken(window.__DATOS__.csrfToken);
      if (window.__DATOS__.settings) setStoreConfig(window.__DATOS__.settings);
    } else {
      api.get<{ csrfToken: string }>('/auth/me')
        .then(res => setCsrfToken(res.csrfToken))
        .catch(() => { /* sin sesión activa: normal para visitantes/landing */ });
    }

    const poll = async () => {
      if (stoppedRef.current) return;
      try {
        const data = await fetchSync<SyncData>();
        if (data) {
          if (data.products) setProducts(data.products);
          if (data.settings) setStoreConfig(data.settings);
          if (data.inventory) setInventory(data.inventory);
          if (data.ingredients) setIngredients(data.ingredients);
          if (data.staff) setStaff(data.staff);
          if (data.orders) setOrders(data.orders);
          if (data.clients) setClients(data.clients);
        }
      } catch {
        // Error de red pasajero: se reintenta en el siguiente ciclo, sin romper la UI.
      } finally {
        if (!stoppedRef.current) {
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };

    poll();

    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [setProducts, setInventory, setStaff, setOrders, setIngredients, setClients, setStoreConfig]);

  return null;
}
