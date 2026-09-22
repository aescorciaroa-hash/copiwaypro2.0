import React from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
  Bell, Check, Eye, MapPin, Maximize2, Minimize2, Package, Plus, Utensils
} from 'lucide-react';

import { Order, OrderItem, Staff } from '../../store/almacenAplicacion';
import { CustomZoomControl, RoutePolyline, DriverMockInfo } from '../AdminDashboard';

interface OrdersSectionProps {
  orders: Order[];
  staff: Staff[];
  theme: string;
  driversMockData: Record<number, DriverMockInfo>;
  highlightedOrderId: string | null;
  isMapExpanded: boolean;
  setIsMapExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedDriverInfo: React.Dispatch<React.SetStateAction<DriverMockInfo | null>>;
  showManualForm: boolean;
  setShowManualForm: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingAddressOrder: React.Dispatch<React.SetStateAction<Order | null>>;
  setNewAddress: React.Dispatch<React.SetStateAction<string>>;
  handleViewOrder: (orderId: string) => void;
}

export default function OrdersSection({
  orders,
  staff,
  theme,
  driversMockData,
  highlightedOrderId,
  isMapExpanded,
  setIsMapExpanded,
  setSelectedDriverInfo,
  showManualForm,
  setShowManualForm,
  setEditingAddressOrder,
  setNewAddress,
  handleViewOrder,
}: OrdersSectionProps) {

    const pendientes = orders.filter(o => o.status === 'Pendiente' || o.status === 'Pagado').length;
    const enCocina = orders.filter(o => o.status === 'En Preparación').length;
    const listos = orders.filter(o => o.status === 'Listos').length;
    const enCamino = orders.filter(o => o.status === 'En Camino').length;

    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Órdenes en Tiempo Real</h2>
            <p className="text-gray-500 dark:text-stone-400 mt-1">Supervisa el flujo de cocina y repartos.</p>
          </div>
          <button onClick={() => setShowManualForm(!showManualForm)} className="bg-brand-orange text-white px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-[#e66500] transition-colors shadow-lg shadow-brand-orange/20">
            <Plus className="w-5 h-5" /> Registro Manual (Llamada/WhatsApp)
          </button>
        </div>

{/* Manual Order Modal now moved to end of renderOrders */}


        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
          <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 py-4 px-4 sm:p-8 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <span className="font-bold text-sm text-gray-600 dark:text-stone-400">Pendientes</span>
              <Bell className="w-5 h-5 text-brand-orange" />
            </div>
            <span className="text-3xl sm:text-4xl font-black mt-4 text-gray-900 dark:text-white">{String(pendientes).padStart(2, '0')}</span>
          </div>
          <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 py-4 px-4 sm:p-8 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <span className="font-bold text-sm text-gray-600 dark:text-stone-400">En Cocina</span>
              <Utensils className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-3xl sm:text-4xl font-black mt-4 text-gray-900 dark:text-white">{String(enCocina).padStart(2, '0')}</span>
          </div>
          <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 py-4 px-4 sm:p-8 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <span className="font-bold text-sm text-gray-600 dark:text-stone-400">Listos</span>
              <Check className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-3xl sm:text-4xl font-black mt-4 text-gray-900 dark:text-white">{String(listos).padStart(2, '0')}</span>
          </div>
          <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 py-4 px-4 sm:p-8 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <span className="font-bold text-sm text-gray-600 dark:text-stone-400">En Camino</span>
              <Package className="w-5 h-5 text-gray-500" />
            </div>
            <span className="text-3xl sm:text-4xl font-black mt-4 text-gray-900 dark:text-white">{String(enCamino).padStart(2, '0')}</span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 p-8 sm:p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-stone-800 text-brand-orange mx-auto flex items-center justify-center mb-4">
              <Utensils className="w-8 h-8" />
            </div>
            <h3 className="font-black text-xl text-gray-900 dark:text-white mb-1.5">No hay comandas activas en este momento</h3>
            <p className="text-sm text-gray-500 dark:text-stone-400 max-w-md mx-auto mb-6">
              Las órdenes realizadas por la web o ingresadas manualmente aparecerán aquí para control de cocina y despacho.
            </p>
            <button
              onClick={() => setShowManualForm(true)}
              className="bg-brand-orange text-white px-6 py-2.5 rounded-full text-sm font-bold inline-flex items-center gap-2 hover:bg-[#e66500] transition-colors shadow-md shadow-brand-orange/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Ingresar Orden Manual
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {orders.map(order => {
              let color = 'bg-gray-400 dark:bg-stone-600';
              let statusText = order.status.toUpperCase();
              if (order.status === 'Pendiente' || order.status === 'Pagado') { color = 'bg-brand-orange'; statusText = 'PENDIENTE'; }
              if (order.status === 'En Preparación') { color = 'bg-blue-500'; statusText = 'PREPARANDO'; }
              if (order.status === 'Listos') { color = 'bg-emerald-500'; statusText = 'LISTOS'; }
              if (order.status === 'En Camino') { color = 'bg-gray-500 dark:bg-stone-600'; statusText = 'EN CAMINO'; }
              const isHighlighted = highlightedOrderId === order.id;
              
              return (
                <div 
                  key={order.id} 
                  id={`order-card-${order.id}`}
                  className={`bg-white dark:bg-[#151515] rounded-[24px] border shadow-sm relative overflow-hidden flex flex-col justify-between group transition-all duration-300 ${
                    isHighlighted 
                      ? 'border-brand-orange ring-4 ring-brand-orange/30 shadow-xl shadow-brand-orange/20 scale-[1.02] z-10' 
                      : 'border-gray-100 dark:border-stone-800 hover:border-gray-200 dark:hover:border-stone-700'
                  }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${color}`}></div>
                  <div className="p-5 sm:p-6 pl-6 sm:pl-7 flex-1 flex flex-col justify-between">
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[11px] font-bold text-gray-500 dark:text-stone-400">Orden ID</p>
                          <h3 className="font-black text-lg text-brand-orange">{order.id}</h3>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider text-white ${color}`}>{statusText}</span>
                      </div>
                      
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-50 dark:bg-stone-800 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 dark:text-white text-xs">{order.clientPhone || 'Cliente Local'}</p>
                          <p className="text-xs text-gray-500 dark:text-stone-400 flex items-center gap-1.5 truncate">
                            <span className="truncate">{order.address}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingAddressOrder(order); setNewAddress(order.address); }}
                              disabled={order.status === 'Entregado'}
                              className={`p-0.5 rounded transition-colors shrink-0 ${order.status === 'Entregado' ? 'text-gray-300 dark:text-stone-700 cursor-not-allowed' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-stone-800 hover:text-brand-orange'}`}
                              title="Editar dirección"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </button>
                          </p>
                        </div>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="bg-gray-50 dark:bg-stone-900 rounded-xl p-3 border border-gray-100 dark:border-stone-800">
                          <p className="text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Detalle del Pedido</p>
                          <ul className="space-y-1.5">
                            {order.items.map((item: OrderItem, idx: number) => (
                              <li key={idx} className="text-xs">
                                <div className="font-bold text-gray-800 dark:text-stone-200 flex items-start gap-1.5">
                                  <span className="text-brand-orange font-black">{item.quantity}x</span>
                                  <span>{item.name}</span>
                                </div>
                                {item.modifications && item.modifications.length > 0 && (
                                  <ul className="mt-0.5 pl-4 space-y-0.5">
                                    {item.modifications.map((mod: string, mIdx: number) => (
                                      <li key={mIdx} className={`text-[10px] font-black ${
                                        mod.includes('SIN') ? 'text-red-500' : 
                                        mod.includes('EXTRA') ? 'text-emerald-500' : 'text-gray-500'
                                      }`}>
                                        {mod}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Domiciliario Asignado */}
                      {(order.driverName || order.status === 'En Camino') && (
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-orange-50/70 dark:bg-brand-orange/10 border border-brand-orange/20">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-brand-orange text-white flex items-center justify-center text-xs font-bold shrink-0">
                              🛵
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                                {order.driverName || 'Domiciliario Asignado'}
                              </p>
                              <p className="text-[10px] text-brand-orange font-bold truncate">
                                {order.driverPlate ? `Placa: ${order.driverPlate}` : 'En ruta de entrega'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-brand-orange/20 text-brand-orange shrink-0">
                            {order.status === 'Entregado' ? 'Completado' : 'En Camino'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3.5 mt-4 border-t border-gray-100 dark:border-stone-800 flex items-center justify-between">
                      <div className="text-xs font-medium text-gray-500 dark:text-stone-400 flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 dark:border-stone-600 flex items-center justify-center">
                          <div className="w-1 h-1 bg-gray-300 dark:bg-stone-600 rounded-full"></div>
                        </div> 
                        <span>{order.time ? `Hora: ${order.time}` : 'Turno actual'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleViewOrder(order.id)} 
                          className="w-9 h-9 rounded-full border border-gray-200 dark:border-stone-700 flex items-center justify-center text-gray-600 dark:text-stone-300 hover:bg-orange-50 dark:hover:bg-stone-800 hover:text-brand-orange hover:border-brand-orange/30 transition-all cursor-pointer shadow-xs" 
                          title="Ver detalles y domiciliario"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
          })}
        </div>
        )}
        
        <div className="mt-8 mb-4">
          <h3 className="font-black text-xl text-gray-900 dark:text-white mb-1">Mapa de Entregas</h3>
          <p className="text-sm text-gray-500 dark:text-stone-400">Visualiza a tus repartidores en tiempo real.</p>
        </div>
        
        <div className={`bg-[#f1f5f9] dark:bg-[#0f172a] p-8 relative overflow-hidden shadow-sm flex flex-col justify-between border border-gray-200 dark:border-stone-800 transition-all duration-300 ${isMapExpanded ? 'fixed inset-3 sm:inset-6 z-[500] rounded-[32px] sm:rounded-[40px] shadow-2xl ring-1 ring-black/20' : 'h-[300px] rounded-[32px]'}`}>
          {/* Botón flotante destacado para salir de pantalla completa */}
          {isMapExpanded && (
            <button 
              type="button"
              onClick={() => {
                setIsMapExpanded(false);
                setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
              }}
              className="absolute top-4 sm:top-6 right-4 sm:right-6 z-[600] flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/85 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-2xl backdrop-blur-md border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Minimize2 className="w-4 h-4 text-brand-orange" />
              <span>Salir de Pantalla Completa (ESC)</span>
            </button>
          )}

          {/* Interactive Leaflet Map for Neiva */}
          <div className="absolute inset-0 z-0 [&_.leaflet-container]:bg-transparent [&_.leaflet-control-container]:z-[500]">
            <MapContainer 
              center={[2.9273, -75.2818]} 
              zoom={15} 
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
              className="z-0"
            >
              <CustomZoomControl />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url={theme === 'dark' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
              />
              
              {/* Restaurant / Origin */}
              <Marker 
                position={[2.9273, -75.2818]} 
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
                <Popup>Cocina Oculta - Hamburguer Copiway</Popup>
              </Marker>

              {/* Delivery Drivers */}
              {staff.filter(s => s.role === 'Domiciliario' && s.location).map(driver => {
                const driverOrder = orders.find(o => o.id === driver.currentOrderId);
                const hasDestination = driverOrder && driverOrder.address;
                return (
                  <Marker 
                    key={driver.id}
                    position={driver.location as [number, number]}
                    icon={L.divIcon({
                      html: `<div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                               <svg viewBox="0 0 32 32" style="width: 32px; height: 32px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
                                 <path d="M16 0c-5.5 0-10 4.5-10 10 0 7.5 10 22 10 22s10-14.5 10-22c0-5.5-4.5-10-10-10z" fill="#3b82f6"/>
                                 <circle cx="16" cy="10" r="6" fill="#fff"/>
                                 <path d="M16 12.5c-.3 0-1.8-1.5-2.5-2.2-.8-.8-.8-2 0-2.8.8-.8 2-.8 2.8 0 .2.2.4.4.5.7.1-.3.3-.5.5-.7.8-.8 2-.8 2.8 0 .8.8.8 2 0 2.8-.7.7-2.2 2.2-2.5 2.2H16z" fill="#3b82f6"/>
                               </svg>
                             </div>`,
                      className: 'custom-marker',
                      iconSize: [30, 30],
                      iconAnchor: [15, 30]
                    })}
                  >
                    <Popup>
                      <strong>{driver.name}</strong><br/>
                      Estado: {driver.currentOrderId ? 'En Ruta: ' + driver.currentOrderId : 'Disponible'}
                    </Popup>
                  </Marker>
                );
              })}

              {/* Delivery 1 Route */}
              <RoutePolyline 
                origin={[2.9273, -75.2818]} 
                destination={[2.9380, -75.2900]} 
                outerColor="#1e3a8a" 
                innerColor="#3b82f6" 
              />

              {/* Delivery 1 Driver Position */}
              <Marker 
                position={[2.9380, -75.2900]} 
                eventHandlers={{ click: () => setSelectedDriverInfo(driversMockData[1]) }}
                icon={L.divIcon({
                  html: `<div style="width: 24px; height: 24px; background-color: #3b82f6; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.6); cursor: pointer;"></div>`,
                  className: 'custom-marker',
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
                })}
              />
              
              {/* Delivery 2 Route */}
              <RoutePolyline 
                origin={[2.9273, -75.2818]} 
                destination={[2.9220, -75.2750]} 
                outerColor="#374151" 
                innerColor="#9ca3af" 
              />

              {/* Delivery 2 Driver Position */}
              <Marker 
                position={[2.9220, -75.2750]} 
                eventHandlers={{ click: () => setSelectedDriverInfo(driversMockData[2]) }}
                icon={L.divIcon({
                  html: `<div style="width: 24px; height: 24px; background-color: #6b7280; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); cursor: pointer;"></div>`,
                  className: 'custom-marker',
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
                })}
              />
            </MapContainer>
          </div>
          
          {!isMapExpanded && (
            <button 
              type="button"
              onClick={() => {
                setIsMapExpanded(true);
                setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
              }}
              title="Expandir mapa"
              className="absolute top-6 right-6 w-10 h-10 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer shadow-sm border border-gray-200 dark:border-white/10 z-[400] hover:scale-110 transition-transform pointer-events-auto text-gray-700 dark:text-white"
            >
              <Maximize2 size={18} />
            </button>
          )}
          
          <div className="flex gap-4 z-10 mt-auto overflow-x-auto pb-2 pointer-events-auto">
            <div 
              onClick={() => setSelectedDriverInfo(driversMockData[1])}
              className="bg-white/90 dark:bg-[#151515]/90 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 shadow-sm border border-blue-500/20 dark:border-blue-500/30 cursor-pointer hover:bg-white dark:hover:bg-black transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">{driversMockData[1].name.split(" - ")[1] || "Camilo"}</p>
                <p className="text-[9px] font-black text-blue-500 tracking-wider">EN RUTA</p>
              </div>
            </div>
            
            <div 
              onClick={() => setSelectedDriverInfo(driversMockData[2])}
              className="bg-white/90 dark:bg-[#151515]/90 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 shadow-sm border border-gray-200 dark:border-stone-800 cursor-pointer hover:bg-white dark:hover:bg-black transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gray-400 dark:bg-stone-700 text-white flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">{driversMockData[2].name.split(" - ")[1] || "Juan"}</p>
                <p className="text-[9px] font-black text-gray-500 dark:text-gray-400 tracking-wider">CARGANDO</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}
