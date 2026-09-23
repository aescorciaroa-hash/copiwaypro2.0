import React from 'react';
import { CheckCircle2, MessageCircle, Plus, ShoppingCart, Smartphone } from 'lucide-react';

import { formatCOP } from '../../lib/format';
import { Order } from '../../store/almacenAplicacion';

interface ActiveOrdersSectionProps {
  activeOrders: Order[];
  setSelectedOrderInfo: (order: Order | null) => void;
  setActiveTab: (tab: string) => void;
}

export default function ActiveOrdersSection({
  activeOrders, setSelectedOrderInfo, setActiveTab,
}: ActiveOrdersSectionProps) {
  return (
    <div className="space-y-6 relative h-full">
      <h2 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-white mb-8">Órdenes Activas</h2>
      {activeOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-sm p-6 ">
          <CheckCircle2 className="w-16 h-16 text-gray-300 dark:text-stone-700 mb-4" />
          <h3 className="text-lg font-medium text-gray-500 dark:text-stone-400">No tienes órdenes en curso</h3>
        </div>
      ) : (
        <div className="space-y-6 ">
          {activeOrders.map(order => (
            <div key={order.id} className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-sm p-8">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <div className="flex items-center gap-3">
    <h3 className="font-bold text-[clamp(16px,4vw,20px)] text-gray-900 dark:text-white">{order.id}</h3>
    <button onClick={(e) => { e.stopPropagation(); setSelectedOrderInfo(order); }} className="text-xs bg-brand-orange/10 text-brand-orange px-3 py-1.5 rounded-full font-bold hover:bg-brand-orange/20 transition-colors flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> Detalles</button>
  </div>
                  <p className="text-[13px] text-gray-500 font-medium mt-1">Llegando en ~25 min</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[clamp(16px,4vw,20px)] text-gray-900 dark:text-white">{formatCOP(order.total)}</p>
                  {order.deliveryPin && (
                    <div className="mt-1 bg-brand-orange/10 px-3 py-1.5 rounded-lg border border-brand-orange/20 inline-block text-left">
                      <p className="text-[10px] text-brand-orange font-bold uppercase">PIN de Entrega</p>
                      <p className="text-lg font-black text-brand-orange tracking-widest">{order.deliveryPin}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 pb-2 w-full">
                <div className="flex justify-between items-start w-full">
                  {['Pendiente', 'En Preparación', 'Listos', 'En Camino'].map((s, idx, arr) => {
                    const statusLabels: Record<string, string> = {
                      'Pendiente': 'Recibido',
                      'Pagado': 'Recibido',
                      'En Preparación': 'Cocina',
                      'Listos': 'Listo',
                      'En Camino': 'En Camino'
                    };
                    const currentIndex = ['Pendiente', 'En Preparación', 'Listos', 'En Camino'].indexOf(order.status === 'Pagado' ? 'Pendiente' : order.status);
                    const isActive = currentIndex >= idx;
                    const isLineActive = currentIndex > idx;

                    return (
                      <React.Fragment key={s}>
                        <div className="flex flex-col items-center gap-2 relative z-10 shrink-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-500 shadow-sm ${isActive ? 'bg-brand-orange text-white border-2 border-white' : 'bg-[#e5e5e5] dark:bg-stone-700 text-transparent'}`}>
                            {isActive && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                          <span className={`text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${isActive ? 'text-brand-orange' : 'text-gray-400'}`}>{statusLabels[s]}</span>
                        </div>
                        {idx < arr.length - 1 && (
                          <div className="flex-1 h-1.5 mt-3 mx-2 bg-[#f0f0f0] dark:bg-stone-800 rounded-full overflow-hidden shrink min-w-[20px] min-w-0">
                            <div className="h-full bg-brand-orange transition-all duration-1000 ease-out" style={{ width: isLineActive ? '100%' : '0%' }}></div>
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>

                {/* Delivery Driver Info when En Camino */}
                {order.status === 'En Camino' && (
                  <div className="mt-6 p-4 rounded-2xl bg-orange-50/60 dark:bg-stone-900/60 border border-orange-200/60 dark:border-stone-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-brand-orange text-white flex items-center justify-center font-black shadow-md shadow-brand-orange/20">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-brand-orange">Domiciliario en Camino</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                          {order.driverName || 'Repartidor de Copiway'}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-stone-400">
                          {order.driverVehicle || 'Motocicleta'} • Placa: <span className="font-mono font-bold text-gray-700 dark:text-stone-300">{order.driverPlate || 'CW-789'}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const phone = (order.driverPhone || '3114567890').replace(/\D/g, '');
                        const msg = encodeURIComponent(`¡Hola! Te escribo respecto a mi pedido de Hamburguer Copiway (${order.id}).`);
                        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-brand-orange text-white font-bold text-xs hover:bg-[#e66500] shadow-sm flex items-center justify-center gap-2 transition-colors shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" /> Contactar Domiciliario
                    </button>
                  </div>
                )}

              </div>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => setActiveTab('catalog')}
        className="fixed bottom-10 right-10 w-16 h-16 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-orange/30 transition-all hover:scale-105 z-40"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}
