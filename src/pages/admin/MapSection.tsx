import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  ChevronLeft, Utensils, Users, Truck, Package, MapPin, Share2, Plus, Edit2
} from 'lucide-react';

import { formatCOP } from '../../lib/format';
import { Order, Staff } from '../../store/almacenAplicacion';
import { RoutePolyline, CustomZoomControl } from '../AdminDashboard';

interface MapSectionProps {
  orders: Order[];
  staff: Staff[];
  theme: string;
  storeConfig: { shippingRate?: number };
  setActiveTab: (tab: string) => void;
  handleNavigateToOrders: (orderId?: string) => void;
  setEditingAddressOrder: (order: Order | null) => void;
  setNewAddress: (address: string) => void;
}

export default function MapSection({
  orders,
  staff,
  theme,
  storeConfig,
  setActiveTab,
  handleNavigateToOrders,
  setEditingAddressOrder,
  setNewAddress,
}: MapSectionProps) {
    const kitchenCoords: [number, number] = [2.9273, -75.2819];
    const activeDeliveryOrders = orders.filter(o => o.status === 'En Camino' || o.status === 'Listos');
    const enCaminoOrders = orders.filter(o => o.status === 'En Camino');
    const listosOrders = orders.filter(o => o.status === 'Listos');
    const activeDrivers = staff.filter(s => s.role === 'Domiciliario' && s.active);

    const getOrderCoords = (order: Order, idx: number): [number, number] => {
      if (order.lat && order.lng) return [order.lat, order.lng];
      const points: [number, number][] = [
        [2.9345, -75.2890],
        [2.9215, -75.2750],
        [2.9410, -75.2920],
        [2.9180, -75.2900],
        [2.9310, -75.2720],
        [2.9480, -75.2830],
      ];
      return points[idx % points.length];
    };

    // Iconos personalizados con diseño limpio de Copiway
    const kitchenIcon = L.divIcon({
      html: `<div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
               <div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(249, 115, 22, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
               <div style="background: linear-gradient(135deg, #ea580c, #f97316); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.5); border: 3px solid white;">
                 <span style="font-size: 16px;">🍔</span>
               </div>
             </div>`,
      className: 'custom-kitchen-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const driverIcon = L.divIcon({
      html: `<div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
               <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5); border: 3px solid white;">
                 <span style="font-size: 15px;">🛵</span>
               </div>
             </div>`,
      className: 'custom-driver-marker',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const clientIcon = L.divIcon({
      html: `<div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
               <svg viewBox="0 0 32 32" style="width: 32px; height: 32px; filter: drop-shadow(0 3px 6px rgba(16, 185, 129, 0.5));">
                 <path d="M16 0c-5.5 0-10 4.5-10 10 0 7.5 10 22 10 22s10-14.5 10-22c0-5.5-4.5-10-10-10z" fill="#10b981"/>
                 <circle cx="16" cy="10" r="6" fill="#fff"/>
                 <circle cx="16" cy="10" r="3" fill="#10b981"/>
               </svg>
             </div>`,
      className: 'custom-client-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    return (
      <div className="space-y-6">
        {/* Header con navegación rápida */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#151515] p-6 rounded-[28px] border border-gray-100 dark:border-stone-800 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-stone-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-gray-700 dark:text-stone-200 hover:text-brand-orange transition-colors flex items-center justify-center cursor-pointer shrink-0"
              title="Volver al Tablero"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                  Despacho y Rutas
                </h2>
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  GPS Activo
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-stone-400 mt-0.5">
                Ubicación en tiempo real de domiciliarios.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleNavigateToOrders()}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-stone-800 hover:bg-gray-200 dark:hover:bg-stone-700 text-xs font-bold text-gray-800 dark:text-stone-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Utensils className="w-4 h-4 text-brand-orange" />
              <span>Ver Comandas</span>
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-brand-orange text-white text-xs font-bold hover:bg-[#e66500] transition-colors flex items-center justify-center gap-2 shadow-md shadow-brand-orange/20 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Gestionar Repartidores</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Indicadores Limpias */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-stone-800 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-stone-800 text-gray-700 dark:text-stone-300 flex items-center justify-center shrink-0 border border-gray-100 dark:border-stone-700">
              <Truck className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500 dark:text-stone-400">En Camino</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {enCaminoOrders.length} {enCaminoOrders.length === 1 ? 'pedido' : 'pedidos'}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-stone-800 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-stone-800 text-gray-700 dark:text-stone-300 flex items-center justify-center shrink-0 border border-gray-100 dark:border-stone-700">
              <Package className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500 dark:text-stone-400">Listos en Cocina</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {listosOrders.length} {listosOrders.length === 1 ? 'pedido' : 'pedidos'}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-stone-800 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-stone-800 text-gray-700 dark:text-stone-300 flex items-center justify-center shrink-0 border border-gray-100 dark:border-stone-700">
              <Users className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500 dark:text-stone-400">Repartidores Activos</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {activeDrivers.length} {activeDrivers.length === 1 ? 'activo' : 'activos'}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-stone-800 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-stone-800 text-gray-700 dark:text-stone-300 flex items-center justify-center shrink-0 border border-gray-100 dark:border-stone-700">
              <MapPin className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500 dark:text-stone-400">Tarifa de Envío</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {formatCOP(storeConfig.shippingRate || 5000)}
              </p>
            </div>
          </div>
        </div>

        {/* Layout Principal: Mapa Interactivo + Panel Lateral */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Mapa Leaflet */}
          <div className="lg:col-span-2 bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm p-4 sm:p-6 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-brand-orange flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                    Rutas de Entrega
                  </h3>
                </div>
              </div>

              {/* Leyenda */}
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-stone-300 font-medium">
                  <span className="w-3 h-3 rounded-full bg-brand-orange shadow-sm border border-white" />
                  Sede Central
                </span>
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-stone-300 font-medium">
                  <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm border border-white" />
                  En Ruta
                </span>
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-stone-300 font-medium">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm border border-white" />
                  Cliente
                </span>
              </div>
            </div>

            {/* Contenedor del Mapa */}
            <div className="h-[460px] sm:h-[520px] w-full rounded-[24px] overflow-hidden relative border border-gray-100 dark:border-stone-800">
              <MapContainer
                center={kitchenCoords}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  url={theme === 'dark'
                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                  attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap'
                />

                <CustomZoomControl />

                {/* Marcador Sede Central Dark Kitchen */}
                <Marker position={kitchenCoords} icon={kitchenIcon}>
                  <Popup>
                    <div className="p-1 text-center">
                      <p className="font-black text-brand-orange text-sm mb-0.5">🍔 Cocina Principal</p>
                      <p className="text-[11px] font-bold text-gray-500 mt-1">Cra 5 # 10-20</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Marcadores de Domiciliarios */}
                {activeDrivers.filter(d => d.location).map(driver => (
                  <Marker
                    key={driver.id}
                    position={driver.location as [number, number]}
                    icon={driverIcon}
                  >
                    <Popup>
                      <div className="p-1">
                        <p className="font-black text-blue-600 text-xs">🛵 {driver.name}</p>
                        <p className="text-[11px] text-gray-600">{driver.phone}</p>
                        <p className="text-[10px] font-bold text-emerald-600 mt-1">
                          {driver.currentOrderId ? `Entregando pedido ${driver.currentOrderId}` : 'En patrullaje / Disponible'}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Marcadores y Rutas para Órdenes Activas */}
                {activeDeliveryOrders.map((ord, idx) => {
                  const destCoords = getOrderCoords(ord, idx);
                  const isEnCamino = ord.status === 'En Camino';

                  return (
                    <React.Fragment key={ord.id}>
                      {/* Trazo de Ruta */}
                      {isEnCamino && (
                        <RoutePolyline
                          origin={kitchenCoords}
                          destination={destCoords}
                          outerColor="rgba(249, 115, 22, 0.4)"
                          innerColor="#f97316"
                        />
                      )}

                      {/* Marcador de Destino del Cliente */}
                      <Marker position={destCoords} icon={clientIcon}>
                        <Popup>
                          <div className="p-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-gray-900 text-xs">{ord.id}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isEnCamino ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {ord.status}
                              </span>
                            </div>
                            <p className="font-bold text-xs text-gray-800">{ord.client || 'Cliente Copiway'}</p>
                            <p className="text-[11px] text-gray-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-brand-orange" /> {ord.address}
                            </p>
                            <p className="text-[11px] font-black text-brand-orange">
                              Total: {formatCOP(ord.total || 0)}
                            </p>
                            {ord.driverName && (
                              <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                                🛵 Domiciliario: <strong>{ord.driverName}</strong>
                              </p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}
              </MapContainer>

              {/* Overlay informativo en la esquina del mapa */}
              <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg border border-gray-200/80 dark:border-stone-800 text-xs z-[400] pointer-events-auto">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-gray-900 dark:text-white">
                    {enCaminoOrders.length > 0 ? `${enCaminoOrders.length} entrega(s) en trayecto` : 'Central lista para despacho'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Lateral: Domiciliarios y Despachos Activos */}
          <div className="space-y-6">
            {/* Flota de Domiciliarios */}
            <div className="bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-orange" />
                  Flota de Domiciliarios
                </h3>
                <span className="text-xs font-bold text-gray-500 dark:text-stone-400">
                  {activeDrivers.length} total
                </span>
              </div>

              <div className="space-y-3">
                {activeDrivers.map((driver) => {
                  const assignedOrder = orders.find(o => o.status === 'En Camino' && o.driverName === driver.name);

                  return (
                    <div
                      key={driver.id}
                      className="p-3.5 rounded-2xl bg-gray-50/90 dark:bg-stone-900/60 border border-gray-100 dark:border-stone-800 transition-all hover:border-brand-orange/30"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <p className="font-bold text-sm text-gray-900 dark:text-white">{driver.name}</p>
                          <p className="text-xs text-gray-500 dark:text-stone-400">
                            {driver.vehicle || 'Motocicleta'} {driver.plate ? `• ${driver.plate}` : ''}
                          </p>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          assignedOrder
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30'
                        }`}>
                          {assignedOrder ? 'EN RUTA' : 'DISPONIBLE'}
                        </span>
                      </div>

                      {assignedOrder ? (
                        <div className="mt-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-gray-100 dark:border-stone-700 text-xs">
                          <p className="font-semibold text-gray-800 dark:text-stone-200 truncate">
                            Llevando: {assignedOrder.id} • {assignedOrder.client}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-stone-400 truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-brand-orange shrink-0" />
                            {assignedOrder.address}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
                          En espera de asignación de pedido en cocina.
                        </p>
                      )}

                      {driver.phone && (
                        <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-stone-800 flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-stone-400">{driver.phone}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const clean = driver.phone.replace(/\D/g, '');
                              window.open(`https://wa.me/${clean.startsWith('57') ? clean : '57' + clean}`, '_blank');
                            }}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1"
                          >
                            <Share2 className="w-3 h-3" /> WhatsApp
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {activeDrivers.length === 0 && (
                  <div className="p-6 text-center text-gray-500 dark:text-stone-400 text-xs">
                    <p>No hay domiciliarios registrados como activos.</p>
                    <button
                      onClick={() => setActiveTab('staff')}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-orange text-white text-xs font-bold hover:bg-brand-orange/90 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" /> Registrar Domiciliario
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Pedidos en Curso */}
            <div className="bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Despachos Recientes
                </h3>
                <span className="text-xs font-bold text-gray-500 dark:text-stone-400">
                  {activeDeliveryOrders.length} activos
                </span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {activeDeliveryOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3 rounded-2xl bg-gray-50/90 dark:bg-stone-900/60 border border-gray-100 dark:border-stone-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 dark:text-white">{ord.id}</span>
                        <span className="font-bold text-brand-orange">{formatCOP(ord.total || 0)}</span>
                      </div>
                      <p className="font-medium text-gray-700 dark:text-stone-300 truncate mt-0.5">{ord.client || 'Cliente'}</p>
                      <p className="text-[11px] text-gray-500 dark:text-stone-400 truncate">{ord.address}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddressOrder(ord);
                        setNewAddress(ord.address || '');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 hover:bg-gray-100 text-[11px] font-bold text-gray-700 dark:text-stone-300 shrink-0 cursor-pointer"
                      title="Editar dirección en curso"
                    >
                      <Edit2 className="w-3 h-3 inline mr-1" />
                      Dirección
                    </button>
                  </div>
                ))}

                {activeDeliveryOrders.length === 0 && (
                  <div className="p-4 text-center text-gray-500 dark:text-stone-400 text-xs italic">
                    No hay entregas en camino en este momento.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}
