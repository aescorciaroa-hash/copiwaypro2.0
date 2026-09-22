import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ToastNotification, ToastData } from '../components/ToastNotification';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ArrowLeft, Map as MapIcon,  
  MapPin, LogOut, Navigation, Phone, CheckCircle, CheckCircle2, MessageCircle, AlertCircle, Utensils, Plus, Minus, X, Target
, Sun, Moon } from 'lucide-react';
import { useStore, Order } from '../store/almacenAplicacion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatCOP } from '../lib/format';
import { api, ApiError, irA } from '../servicios/api';

const RoutePolyline = ({ origin, destination, outerColor, innerColor, onRouteLoaded }: { origin: [number, number], destination: [number, number], outerColor: string, innerColor: string, onRouteLoaded?: (coords: [number, number][]) => void }) => {
  const [positions, setPositions] = React.useState<[number, number][]>([]);

  React.useEffect(() => {
    fetch(`https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
          setPositions(coords);
          if (onRouteLoaded) onRouteLoaded(coords);
        }
      })
      .catch(err => {
        console.warn("Error fetching route, falling back to straight line:", err);
        const fallbackCoords = [origin, destination];
        setPositions(fallbackCoords);
        if (onRouteLoaded) onRouteLoaded(fallbackCoords);
      });
  }, [origin, destination]);

  if (!positions.length) return null;

  return (
    <>
      <Polyline positions={positions} pathOptions={{ color: outerColor, weight: 8, lineCap: 'round', lineJoin: 'round', opacity: 1 }} />
      <Polyline positions={positions} pathOptions={{ color: innerColor, weight: 4, lineCap: 'round', lineJoin: 'round', opacity: 1 }} />
    </>
  );
};


function MapEffect({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

const CustomZoomControl = () => {
  const map = useMap();
  return (
    <div className="absolute top-8 left-6 flex flex-col gap-2 z-[400] pointer-events-auto">
      <button 
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); map.zoomIn(); }}
        className="w-10 h-10 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm border border-gray-200 dark:border-white/10 hover:scale-110 transition-transform text-gray-700 dark:text-white"
        title="Acercar"
      >
        <Plus size={20} />
      </button>
      <button 
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); map.zoomOut(); }}
        className="w-10 h-10 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm border border-gray-200 dark:border-white/10 hover:scale-110 transition-transform text-gray-700 dark:text-white"
        title="Alejar"
      >
        <Minus size={20} />
      </button>
    </div>
  );
};

export default function DeliveryDashboard() {
    const { theme, toggleTheme } = useTheme();

  const { orders, updateOrder, updateOrderStatus, staff, updateStaff, confirmDelivery } = useStore();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [toastData, setToastData] = useState<ToastData | null>(null);

  const showToast = (type: ToastData['type'] = 'info', message: string, title?: string) => {
    setToastData({ type, message, title });
  };
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinTargetOrder, setPinTargetOrder] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [isAvailable, setIsAvailable] = useState(true);
  const [acceptedOrders, setAcceptedOrders] = useState<string[]>([]);

  // Filter deliveries
  // If disconnected, only show already accepted ones, else show all Listos and En Camino
  const deliveries = orders.filter(o => 
    (o.status === 'Listos' || o.status === 'En Camino') &&
    (isAvailable || acceptedOrders.includes(o.id) || o.status === 'En Camino')
  );

  const [activeRoute, setActiveRoute] = useState<any | null>(null);

  const [mapCenter, setMapCenter] = useState<[number, number]>([2.9273, -75.2818]);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (activeRoute) {
      const searchAddress = async () => {
        try {
          const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(activeRoute.address + ', Neiva, Huila'));
          const data = await res.json();
          if (data && data.length > 0) {
            const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            setDestCoords(coords as [number, number]);
            setMapCenter(coords as [number, number]);
            if (loggedInUserId) {
              updateStaff(loggedInUserId, { currentOrderId: activeRoute.id, destCoords: coords as [number, number] });
            }
          }
        } catch(e) {}
      };
      searchAddress();
    } else {
      setDestCoords(null);
    }
  }, [activeRoute]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const { user } = await api.post<{ user: { id: string; role: string } }>('/auth/login', {
        email: username,
        password,
      });
      if (user.role !== 'delivery') {
        await api.post('/auth/logout').catch(() => {});
        setLoginError('Esta cuenta no tiene acceso al panel de domiciliarios.');
        return;
      }
      setLoggedInUserId(user.id);
      setIsLoggedIn(true);
    } catch (err) {
      setLoginError(err instanceof ApiError ? err.message : 'Usuario o contraseña incorrectos.');
    }
  };

  
  useEffect(() => {
    let watchId: number;
    let simInterval: number;

    if (isLoggedIn && loggedInUserId) {
      let isUsingMock = false;
      let currentMockLoc: [number, number] = [2.9273, -75.2818];

      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            isUsingMock = false;
            const { latitude, longitude } = position.coords;
            setMapCenter([latitude, longitude]);
            updateStaff(loggedInUserId, { location: [latitude, longitude] });
          },
          (error) => {
            isUsingMock = true;
            console.warn('Error tracking location, using mock fallback:', error);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        isUsingMock = true;
      }

      // Fallback Simulator
      simInterval = window.setInterval(() => {
        if (isUsingMock) {
           // If there is an active route and dest coords, move towards it
           if (activeRoute && destCoords && activeRoute.status === 'En Camino') {
             const latDiff = destCoords[0] - currentMockLoc[0];
             const lonDiff = destCoords[1] - currentMockLoc[1];
             // Move 2% of the remaining distance every 2 seconds to simulate driving smoothly
             currentMockLoc = [currentMockLoc[0] + latDiff * 0.02, currentMockLoc[1] + lonDiff * 0.02];
           } else {
             // Idle at kitchen (slightly offset so it doesn't overlap perfectly with the burger icon)
             currentMockLoc = [2.9274, -75.2817];
           }
           setMapCenter(currentMockLoc);
           updateStaff(loggedInUserId, { location: currentMockLoc });
        }
      }, 2000);
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (simInterval) clearInterval(simInterval);
    };
  }, [isLoggedIn, loggedInUserId, updateStaff, activeRoute, destCoords]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    type: 'info',
    onConfirm: () => {},
  });

  const handleLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Cerrar Sesión de Domiciliario',
      message: '¿Estás seguro de que deseas salir del panel de domiciliario de Hamburguer Copiway?',
      confirmText: 'Sí, cerrar sesión',
      cancelText: 'Permanecer',
      type: 'info',
      onConfirm: () => {
        api.post('/auth/logout').catch(() => {});
        showToast('warning', 'Cerraste sesión en el panel de domiciliario.', 'Sesión Finalizada');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsLoggedIn(false);
        setUsername('');
        setPassword('');
        irA('/login');
      }
    });
  };

  const takeOrder = (orderId: string) => {
    if (acceptedOrders.length >= 3 && !acceptedOrders.includes(orderId)) {
      alert('Has alcanzado el límite máximo de 3 pedidos simultáneos en tu ruta.');
      return;
    }
    if (!acceptedOrders.includes(orderId)) {
      setAcceptedOrders([...acceptedOrders, orderId]);
      showToast('info', `Tomaste el pedido #${orderId}. Prepárate para iniciar la ruta.`, 'Pedido Asignado');
    }
    const currentDriver = staff.find(s => s.id === loggedInUserId) || staff.find(s => s.role === 'Domiciliario') || {
      id: loggedInUserId || 'dom-1',
      name: username ? (username.charAt(0).toUpperCase() + username.slice(1)) : 'Carlos Mendoza (Domiciliario)',
      phone: '3114567890',
      plate: 'CW-789',
      vehicle: 'Moto Honda CB125'
    };

    updateOrder(orderId, {
      driverName: currentDriver.name,
      driverPhone: currentDriver.phone,
      driverPlate: currentDriver.plate || 'CW-789',
      driverVehicle: currentDriver.vehicle || 'Moto'
    });

    if (loggedInUserId) {
      updateStaff(loggedInUserId, { currentOrderId: orderId });
    }
  };

  const startTrip = (orderId: string) => {
    const currentDriver = staff.find(s => s.id === loggedInUserId) || staff.find(s => s.role === 'Domiciliario') || {
      id: loggedInUserId || 'dom-1',
      name: username ? (username.charAt(0).toUpperCase() + username.slice(1)) : 'Carlos Mendoza (Domiciliario)',
      phone: '3114567890',
      plate: 'CW-789',
      vehicle: 'Moto Honda CB125'
    };

    if (loggedInUserId) {
      updateStaff(loggedInUserId, { currentOrderId: orderId });
    }
    updateOrder(orderId, { 
      status: 'En Camino', 
      driverName: currentDriver.name,
      driverPhone: currentDriver.phone,
      driverPlate: currentDriver.plate || 'CW-789',
      driverVehicle: currentDriver.vehicle || 'Moto'
    });
    const order = deliveries.find(d => d.id === orderId);
    if (order) {
      setActiveRoute({ 
        ...order, 
        status: 'En Camino', 
        driverName: currentDriver.name,
        driverPhone: currentDriver.phone,
        driverPlate: currentDriver.plate,
        driverVehicle: currentDriver.vehicle
      });
      showToast('cart', `Ruta hacia ${order.address} iniciada.`, 'Ruta Iniciada');
    }
  };

  const markDelivered = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order?.deliveryPin) {
      setPinTargetOrder(orderId);
      setPinInput('');
      setPinError('');
      setShowPinModal(true);
      return;
    }
    
    executeDelivery(orderId);
  };

  const executeDelivery = async (orderId: string, pin?: string): Promise<boolean> => {
    // Regla 8: el PIN se verifica en el servidor, no solo en el navegador.
    if (pin) {
      try {
        await confirmDelivery(orderId, pin);
      } catch (err) {
        setPinError(err instanceof ApiError ? err.message : 'No se pudo confirmar la entrega.');
        return false;
      }
    } else {
      updateOrderStatus(orderId, 'Entregado');
    }

    if (loggedInUserId) {
      updateStaff(loggedInUserId, { currentOrderId: '', destCoords: null });
    }
    setAcceptedOrders(prev => prev.filter(id => id !== orderId));
    showToast('success', `El pedido #${orderId} fue entregado con éxito.`, 'Pedido Entregado');
    if (activeRoute?.id === orderId) setActiveRoute(null);
    return true;
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-stone-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-[#151515] rounded-[32px] p-8 border border-gray-100 dark:border-stone-800 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-[24px] bg-brand-orange flex items-center justify-center shadow-lg shadow-brand-orange/30 mb-6">
              <Navigation className="w-10 h-10 text-white" />
            </div>
            <h1 className="font-black text-2xl text-gray-900 dark:text-white mb-1">Copiway<span className="text-brand-orange">PRO</span></h1>
            <p className="text-gray-500 dark:text-stone-400 font-medium text-sm">Panel de Domiciliario</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2 ml-1">Usuario</label>
              <input 
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full h-14 px-5 rounded-2xl bg-gray-50 dark:bg-stone-900 border-2 border-gray-100 dark:border-stone-800 focus:border-brand-orange dark:focus:border-brand-orange outline-none transition-colors text-gray-900 dark:text-white font-medium"
                placeholder="Ej: domicilio"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2 ml-1">Contraseña</label>
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-14 px-5 rounded-2xl bg-gray-50 dark:bg-stone-900 border-2 border-gray-100 dark:border-stone-800 focus:border-brand-orange dark:focus:border-brand-orange outline-none transition-colors text-gray-900 dark:text-white font-medium"
                placeholder="••••••••"
              />
            </div>
            
            {loginError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-bold text-center border border-red-100 dark:border-red-900/50">
                {loginError}
              </div>
            )}
            
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => irA('/login')}
                className="flex-1 h-14 bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Salir
              </button>
              <button 
                type="submit"
                className="flex-1 h-14 bg-brand-orange text-white rounded-2xl font-black text-lg hover:bg-brand-orange/90 transition-transform active:scale-95 shadow-xl shadow-brand-orange/20"
              >
                Entrar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const renderMap = () => {
    if (!activeRoute) {
      return (
        <div className="w-full h-full bg-black/5 dark:bg-white/5 rounded-[24px] flex flex-col items-center justify-center p-6 text-center border border-black/5 dark:border-white/10">
          <MapPin className="w-16 h-16 text-gray-300 dark:text-stone-600 mb-4" />
          <h3 className="font-bold text-gray-500 dark:text-stone-400 text-lg">Sin ruta activa</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-xs">Selecciona un pedido para ver su ruta.</p>
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-[#f1f5f9] dark:bg-[#0f172a] rounded-[32px] overflow-hidden relative border border-gray-200 dark:border-stone-800 shadow-inner">
        <div className="absolute inset-0 z-0 [&_.leaflet-container]:bg-transparent [&_.leaflet-control-container]:z-[500]">
          <MapContainer 
            center={mapCenter} 
            zoom={15} 
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            className="z-0"
          >
            <CustomZoomControl />
            <MapEffect center={mapCenter} />
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url={theme === 'dark' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
            />
            
            <Marker 
              position={destCoords || mapCenter} 
              icon={L.divIcon({
                html: `<div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                         <svg viewBox="0 0 32 32" style="width: 32px; height: 32px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
                           <path d="M16 0c-5.5 0-10 4.5-10 10 0 7.5 10 22 10 22s10-14.5 10-22c0-5.5-4.5-10-10-10z" fill="#ea4335"/>
                           <circle cx="16" cy="10" r="6" fill="#fff"/>
                           <path d="M16 12.5c-.3 0-1.8-1.5-2.5-2.2-.8-.8-.8-2 0-2.8.8-.8 2-.8 2.8 0 .2.2.4.4.5.7.1-.3.3-.5.5-.7.8-.8 2-.8 2.8 0 .8.8.8 2 0 2.8-.7.7-2.2 2.2-2.5 2.2H16z" fill="#ea4335"/>
                         </svg>
                       </div>`,
                className: 'custom-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
              })}
            >
              <Popup>Hamburguer Copiway</Popup>
            </Marker>
            
            <RoutePolyline 
               origin={[2.9273, -75.2818]} 
               destination={[2.9380, -75.2900]} 
               outerColor="#1e3a8a" 
               innerColor="#3b82f6" 
             />
            <Marker 
              position={[2.9380, -75.2900]} 
              icon={L.divIcon({
                html: `<div style="width: 24px; height: 24px; background-color: #3b82f6; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.6); cursor: pointer;"></div>`,
                className: 'custom-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              })}
            />
            {destCoords && (
                <Polyline 
                  positions={[mapCenter, destCoords]} 
                  pathOptions={{ color: '#ea4335', weight: 4, dashArray: '10, 10' }} 
                />
              )}
            </MapContainer>
        </div>
        
                <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none">
          <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur rounded-[24px] p-4 shadow-lg border border-gray-100 dark:border-stone-700 pointer-events-auto">
            <div className="flex items-start gap-4">
              <div className="bg-brand-orange/20 p-2 rounded-[16px] mt-1">
                <MapPin className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Destino</p>
                <p className="font-black text-lg">{activeRoute.address}</p>
                <p className="text-sm text-gray-500 font-medium">Llegada est: 12 mins</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pointer-events-auto">
            {activeRoute.status === 'En Camino' && (
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    showToast('info', 'Abriendo ruta en el mapa...', 'Navegación');
                    window.open(`https://waze.com/ul?q=${encodeURIComponent(activeRoute.address + ', Neiva, Huila')}`, '_blank');
                  }}
                  className="flex-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors border border-blue-200 dark:border-blue-800/50"
                >
                  <MapIcon className="w-5 h-5" /> Waze
                </button>
                <button 
                  onClick={() => {
                    showToast('info', 'Abriendo ruta en el mapa...', 'Navegación');
                    window.open(`https://maps.google.com/?q=${encodeURIComponent(activeRoute.address + ', Neiva, Huila')}`, '_blank');
                  }}
                  className="flex-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors border border-green-200 dark:border-green-800/50"
                >
                  <Navigation className="w-5 h-5" /> Maps
                </button>
              </div>
            )}
            
            {activeRoute.status === 'En Camino' && (
              <button 
                onClick={() => markDelivered(activeRoute.id)}
                className="w-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-md py-4 rounded-[24px] font-black text-lg flex items-center justify-center gap-2 shadow-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                <CheckCircle2 className="w-6 h-6" /> Marcar Entregado
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[100dvh] w-full bg-gray-50/50 dark:bg-stone-950 text-gray-900 dark:text-gray-100 font-sans flex flex-col transition-colors duration-300 overflow-hidden relative">
      
      <ToastNotification toast={toastData} onClose={() => setToastData(null)} />
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Cabecera Móvil - Solo visible en celulares */}
      <header className="md:hidden px-6 py-3 border-b border-gray-100 dark:border-stone-800/50 flex flex-col shrink-0 bg-white dark:bg-[#151515] z-30 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => irA('/')}>
              <div className="w-8 h-8 rounded-xl bg-brand-orange flex items-center justify-center shadow-lg shadow-brand-orange/20 shrink-0">
                <Navigation className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-black text-lg tracking-tight text-gray-900 dark:text-white leading-none">Copiway<span className="text-brand-orange">PRO</span></h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleTheme}
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-stone-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-brand-orange dark:hover:text-brand-orange transition-colors"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button 
                onClick={handleLogout}
                className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 dark:text-stone-400">Estado</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isAvailable} onChange={() => setIsAvailable(!isAvailable)} />
              <div className="w-10 h-5.5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-orange"></div>
              <span className={`ml-2 text-xs font-bold ${isAvailable ? 'text-brand-orange' : 'text-gray-500'}`}>
                {isAvailable ? 'Disponible' : 'Desconectado'}
              </span>
            </label>
          </div>
      </header>

      <div className="flex-1 flex flex-col-reverse md:flex-row overflow-hidden relative">

      <aside className="w-full md:w-[400px] flex-1 md:flex-none border-r border-gray-100 dark:border-stone-800 bg-white dark:bg-[#151515] flex flex-col shrink-0 overflow-hidden min-w-0">
        
        {/* Cabecera Desktop - Solo visible en laptops */}
        <header className="hidden md:flex px-8 py-5 border-b border-gray-50 dark:border-stone-800/50 flex-col shrink-0 sticky top-0 bg-white dark:bg-[#151515] z-10">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => irA('/')}>
              <div className="w-9 h-9 rounded-xl bg-brand-orange flex items-center justify-center shadow-lg shadow-brand-orange/20 shrink-0">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-black text-[22px] tracking-tight text-gray-900 dark:text-white leading-none">Copiway<span className="text-brand-orange">PRO</span></h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleTheme}
                className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-stone-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-brand-orange dark:hover:text-brand-orange transition-colors"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button 
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-600 dark:text-stone-400">Estado</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isAvailable} onChange={() => setIsAvailable(!isAvailable)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-orange"></div>
              <span className={`ml-3 text-sm font-bold ${isAvailable ? 'text-brand-orange' : 'text-gray-500'}`}>
                {isAvailable ? 'Disponible' : 'Desconectado'}
              </span>
            </label>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-0 custom-scrollbar">
          <h2 className="font-black text-gray-800 dark:text-stone-200 px-2 pb-2">Pedidos Disponibles</h2>
          {deliveries.length === 0 ? (
            <div className="text-center py-10">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No hay entregas asignadas en este momento.</p>
            </div>
          ) : (
            deliveries.map(order => {
              const isAccepted = acceptedOrders.includes(order.id);
              const isActive = activeRoute?.id === order.id;
              const isOnlinePayment = (order as any).paymentMethod === 'online' || (order as any).paymentStatus === 'Pagado' || (order as any).status === 'Pagado'; // Fallback logic
              
              return (
                <div 
                  key={order.id} 
                  className={`p-5 rounded-[24px] border transition-all overflow-hidden ${
                    isActive 
                      ? 'bg-brand-orange/5 border-brand-orange shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none' 
                      : 'bg-white dark:bg-[#151515] border-gray-100 dark:border-stone-800 hover:border-brand-orange/50'
                  }`}
                >
                  {!isOnlinePayment && (
                    <div className="bg-brand-orange text-white text-center py-2 -mx-5 -mt-5 mb-4 font-black uppercase tracking-wide text-sm shadow-md animate-pulse whitespace-nowrap">
                      ¡Cobrar en Efectivo: {formatCOP(order.total)}!
                    </div>
                  )}
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-black text-lg whitespace-nowrap">{order.id}</h3>
                      <p className="text-xs font-bold bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded text-gray-600 dark:text-stone-300 mt-1 inline-block truncate max-w-full whitespace-nowrap">
                        {order.status === 'Listos' ? (isAccepted ? 'Recepcionado' : 'Listo para recoger') : order.status}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-[clamp(16px,4vw,18px)] block leading-none whitespace-nowrap">{formatCOP(order.total)}</span>
                      {isOnlinePayment ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide whitespace-nowrap">Pagado (Digital)</span>
                      ) : (
                        <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wide whitespace-nowrap">Efectivo</span>
                      )}
                    </div>
                  </div>
                  
                  
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-stone-300 line-clamp-2">
                      <MapPin className="w-4 h-4 inline-block mr-1 text-gray-400" /> {order.address}
                    </p>
                  </div>

                  {/* Order items preview */}
                  {order.items && order.items.length > 0 && (
                    <div className="mb-3.5 p-2.5 rounded-xl bg-gray-50 dark:bg-stone-800/60 border border-gray-100 dark:border-stone-800 text-xs text-gray-600 dark:text-stone-300 space-y-1">
                      {order.items.map((it: any, iIdx: number) => (
                        <div key={iIdx} className="flex justify-between items-center">
                          <span className="font-semibold">{it.quantity}x {it.name}</span>
                          <span className="text-[11px] text-gray-400">{formatCOP(it.finalPrice || it.price || 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {order.status === 'En Camino' && (
                    <div className="mb-4 flex flex-col gap-2">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const phone = (order.clientPhone || '').replace(/\D/g, '');
                          const message = encodeURIComponent(`¡Hola! Soy el domiciliario de Copiway PRO. Voy en camino con tu pedido ${order.id}. ¿Me podrías dar indicaciones exactas para llegar o confirmar si estás disponible?`);
                          window.open(`https://wa.me/${phone}?text=${message}`, '_blank'); 
                        }}
                        className="w-full border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 py-2.5 rounded-[12px] text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" /> Contactar Cliente
                      </button>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            showToast('info', 'Abriendo ruta en el mapa...', 'Navegación');
                            window.open(`https://waze.com/ul?q=${encodeURIComponent(order.address + ', Neiva, Huila')}`, '_blank'); 
                          }}
                          className="flex-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 py-2.5 rounded-[12px] text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-blue-200 dark:border-blue-800/50"
                        >
                          <MapIcon className="w-4 h-4" /> Waze
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            showToast('info', 'Abriendo ruta en el mapa...', 'Navegación');
                            window.open(`https://maps.google.com/?q=${encodeURIComponent(order.address + ', Neiva, Huila')}`, '_blank'); 
                          }}
                          className="flex-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 py-2.5 rounded-[12px] text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-green-200 dark:border-green-800/50"
                        >
                          <Navigation className="w-4 h-4" /> Maps
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {order.status === 'Listos' && !isAccepted && (
                    <button 
                      onClick={() => takeOrder(order.id)}
                      className="w-full bg-brand-orange/10 text-brand-orange hover:bg-brand-orange hover:text-white py-3 rounded-[16px] font-bold transition-colors"
                    >
                      Tomar Pedido
                    </button>
                  )}
                  
                  {order.status === 'Listos' && isAccepted && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setActiveRoute(order)}
                        disabled={isActive}
                        className="flex-1 bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 py-3 rounded-[16px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors min-w-0"
                      >
                        <Target className="w-4 h-4" /> Mapa
                      </button>
                      <button 
                        onClick={() => startTrip(order.id)}
                        className="flex-[2] bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-3 rounded-[16px] font-bold transition-colors shadow-lg"
                      >
                        Iniciar Ruta (En Camino)
                      </button>
                    </div>
                  )}

                  {order.status === 'En Camino' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setActiveRoute(order)}
                        disabled={isActive}
                        className="flex-1 bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 py-3 rounded-[16px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors min-w-0"
                      >
                        <Target className="w-4 h-4" /> Mapa
                      </button>
                      <button 
                        onClick={() => markDelivered(order.id)}
                        className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-[16px] font-bold transition-colors shadow-md flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Marcar Entregado
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      <main className="w-full h-[45vh] shrink-0 md:flex-1 md:h-full md:p-6 bg-gray-50/50 dark:bg-stone-950 relative min-w-0">
        {renderMap()}
      </main>

      {/* Modal de PIN de Entrega */}
      {showPinModal && pinTargetOrder && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                Validar Entrega
              </h3>
              <button 
                onClick={() => setShowPinModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-stone-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-stone-400 mb-6 text-center">
              Pídele al cliente el <strong className="text-brand-orange">PIN de 4 dígitos</strong> para confirmar la entrega del pedido <span className="whitespace-nowrap">#{pinTargetOrder}</span>.
            </p>

            <input
              type="text"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="0 0 0 0"
              className="w-full text-center text-3xl font-black tracking-[0.5em] pl-[0.5em] py-4 rounded-2xl bg-gray-50 dark:bg-stone-950 border-2 border-gray-200 dark:border-stone-800 focus:border-brand-orange dark:focus:border-brand-orange outline-none mb-4 text-gray-900 dark:text-white"
            />
            
            {pinError && (
              <p className="text-sm text-red-500 font-bold mb-4 text-center">{pinError}</p>
            )}

            <button
              onClick={async () => {
                const order = orders.find(o => o.id === pinTargetOrder);
                if (pinInput === order?.deliveryPin) {
                  const ok = await executeDelivery(pinTargetOrder, pinInput);
                  if (ok) setShowPinModal(false);
                } else {
                  setPinError('PIN incorrecto. Intenta nuevamente.');
                  setPinInput('');
                }
              }}
              disabled={pinInput.length !== 4}
              className="w-full bg-brand-orange text-white font-bold py-4 rounded-2xl hover:bg-[#e66500] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Confirmar Entrega
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
