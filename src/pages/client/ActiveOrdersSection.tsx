import React from 'react';
import { ChefHat, MessageCircle, PackageCheck, Plus, Receipt, ShoppingBag, ShoppingCart, Smartphone, Truck } from 'lucide-react';

import { formatCOP, orderCode } from '../../lib/format';
import { Order, Product } from '../../store/almacenAplicacion';
import { CustomBurgerThumb } from './ingredientArt';

interface ActiveOrdersSectionProps {
  activeOrders: Order[];
  setSelectedOrderInfo: (order: Order | null) => void;
  setActiveTab: (tab: string) => void;
  catalog: Product[];
}

const STATUS_STEPS = ['Pendiente', 'En Preparación', 'Listos', 'En Camino'] as const;

const STATUS_LABELS: Record<string, string> = {
  'Pendiente': 'Recibido',
  'Pagado': 'Recibido',
  'En Preparación': 'Cocina',
  'Listos': 'Listo',
  'En Camino': 'En Camino',
};

const STATUS_ICONS: Record<string, typeof Receipt> = {
  'Pendiente': Receipt,
  'En Preparación': ChefHat,
  'Listos': PackageCheck,
  'En Camino': Truck,
};

export default function ActiveOrdersSection({
  activeOrders, setSelectedOrderInfo, setActiveTab, catalog,
}: ActiveOrdersSectionProps) {
  return (
    <div className="space-y-6 relative h-full">
      <h2 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-white mb-8">Órdenes Activas</h2>
      {activeOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-sm p-6 ">
          <ShoppingBag className="w-16 h-16 text-gray-300 dark:text-stone-700 mb-4" />
          <h3 className="text-lg font-medium text-gray-500 dark:text-stone-400">No tienes órdenes en curso</h3>
        </div>
      ) : (
        <div className="space-y-6 ">
          {activeOrders.map(order => {
            const currentIndex = STATUS_STEPS.indexOf(order.status === 'Pagado' ? 'Pendiente' : (order.status as typeof STATUS_STEPS[number]));
            const previewItems = order.items.slice(0, 4);
            const extraItems = order.items.length - previewItems.length;

            return (
              <div key={order.id} className="relative bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-sm overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-brand-orange to-orange-300" />

                <div className="p-6 md:p-8 pl-7 md:pl-9">
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 bg-brand-orange text-white px-3 py-1 rounded-lg font-black text-sm tracking-wide shadow-sm shadow-brand-orange/30">
                          <Receipt className="w-3.5 h-3.5" /> {orderCode(order.id)}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedOrderInfo(order); }} className="text-xs bg-brand-orange/10 text-brand-orange px-3 py-1.5 rounded-full font-bold hover:bg-brand-orange/20 transition-colors flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" /> Detalles
                        </button>
                      </div>
                      {/* Miniaturas de los productos del pedido */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex -space-x-2.5">
                          {previewItems.map((item, idx) => {
                            const catProduct = catalog.find(p => p.id === (item.productId || item.id) || p.name.toLowerCase() === (item.name || '').toLowerCase());
                            const itemImage = item.product?.image || catProduct?.image;
                            return (
                            <div key={item.id || idx} className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-[#151515] bg-gray-100 dark:bg-stone-800 overflow-hidden shrink-0">
                              {itemImage ? (
                                <img src={itemImage} alt={item.name} className="w-full h-full object-cover" />
                              ) : item.extras && item.extras.length > 0 ? (
                                <CustomBurgerThumb ingredientNames={item.extras.map(e => e.name)} size={32} className="!rounded-none border-0" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <ShoppingBag className="w-3.5 h-3.5 opacity-60" />
                                </div>
                              )}
                            </div>
                            );
                          })}
                          {extraItems > 0 && (
                            <div className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-[#151515] bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center text-[10px] font-black shrink-0">
                              +{extraItems}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-stone-500 font-medium">
                          {order.items.length} producto{order.items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-[clamp(18px,4vw,22px)] text-gray-900 dark:text-white">{formatCOP(order.total)}</p>
                      {order.deliveryPin && (
                        <div className="mt-2 bg-gradient-to-br from-brand-orange/15 to-orange-500/5 px-4 py-2 rounded-xl border border-dashed border-brand-orange/40 inline-block text-left">
                          <p className="text-[10px] text-brand-orange font-bold uppercase tracking-wider">PIN de Entrega</p>
                          <p className="text-xl font-black text-brand-orange tracking-[0.2em] leading-tight">{order.deliveryPin}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 pb-2 w-full">
                    <div className="flex justify-between items-start w-full">
                      {STATUS_STEPS.map((s, idx, arr) => {
                        const isDone = currentIndex > idx;
                        const isCurrent = currentIndex === idx;
                        const isActive = currentIndex >= idx;
                        const StepIcon = STATUS_ICONS[s];

                        return (
                          <React.Fragment key={s}>
                            <div className="flex flex-col items-center gap-2 relative z-10 shrink-0">
                              <div className="relative">
                                {isCurrent && (
                                  <span className="absolute inset-0 rounded-full bg-brand-orange/40 animate-ping" />
                                )}
                                <div className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-500 shadow-sm ${isActive ? 'bg-brand-orange text-white ring-4 ring-brand-orange/15' : 'bg-[#e5e5e5] dark:bg-stone-700 text-gray-400 dark:text-stone-500'}`}>
                                  <StepIcon className="w-4 h-4" />
                                </div>
                              </div>
                              <span className={`text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${isActive ? 'text-brand-orange' : 'text-gray-400'}`}>{STATUS_LABELS[s]}</span>
                            </div>
                            {idx < arr.length - 1 && (
                              <div className="flex-1 h-1.5 mt-4 mx-2 bg-[#f0f0f0] dark:bg-stone-800 rounded-full overflow-hidden shrink min-w-[20px]">
                                <div className="h-full bg-gradient-to-r from-brand-orange to-orange-400 transition-all duration-1000 ease-out" style={{ width: isDone ? '100%' : '0%' }}></div>
                              </div>
                            )}
                          </React.Fragment>
                        );
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
                            const msg = encodeURIComponent(`¡Hola! Te escribo respecto a mi pedido de Hamburguer Copiway (${orderCode(order.id)}).`);
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
              </div>
            );
          })}
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
