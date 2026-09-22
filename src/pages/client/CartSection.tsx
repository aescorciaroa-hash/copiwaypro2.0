import React from 'react';
import { AlertCircle, ShoppingBag, ShoppingCart, Trash2 } from 'lucide-react';

import { formatCOP } from '../../lib/format';
import { Product, StoreConfig } from '../../store/almacenAplicacion';
import { ToastData } from '../../components/ToastNotification';
import { CartItem, SyncedIngredient, ConfirmModalState } from '../ClientDashboard';

interface CartSectionProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  products: Product[];
  storeConfig: StoreConfig;
  isStoreOpen: boolean;
  isCheckingOut: boolean;
  isBirthday: string | boolean;
  cartSubtotal: number;
  birthdayDiscount: number;
  cartTotal: number;
  FLAT_SHIPPING_RATE: number;
  setActiveTab: (tab: string) => void;
  setEditingCartItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setBuilderStack: React.Dispatch<React.SetStateAction<SyncedIngredient[]>>;
  setSelectedProduct: React.Dispatch<React.SetStateAction<Product | null>>;
  setCustomRemoved: React.Dispatch<React.SetStateAction<import('../../store/almacenAplicacion').ProductComponent[]>>;
  setCustomExtras: React.Dispatch<React.SetStateAction<SyncedIngredient[]>>;
  setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalState>>;
  showToast: (type: ToastData['type'], message: string, title?: string) => void;
}

export default function CartSection({
  cart,
  setCart,
  products,
  storeConfig,
  isStoreOpen,
  isCheckingOut,
  isBirthday,
  cartSubtotal,
  birthdayDiscount,
  cartTotal,
  FLAT_SHIPPING_RATE,
  setActiveTab,
  setEditingCartItemId,
  setBuilderStack,
  setSelectedProduct,
  setCustomRemoved,
  setCustomExtras,
  setConfirmModal,
  showToast,
}: CartSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 mb-8">
        <div className="flex items-end gap-3">
          <h2 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-white">Tu Carrito</h2>
          {cart.length > 0 && <span className="text-gray-500 font-medium mb-1.5">{cart.length} artículo{cart.length > 1 ? 's' : ''} seleccionado{cart.length > 1 ? 's' : ''}</span>}
        </div>
        {cart.length > 0 && !isCheckingOut && (
          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Vaciar Carrito',
                message: '¿Estás seguro de que deseas eliminar todos los productos de tu carrito de compras?',
                confirmText: 'Sí, vaciar carrito',
                cancelText: 'Conservar',
                type: 'danger',
                onConfirm: () => {
                  setCart([]);
                  showToast('danger', 'Se han eliminado todos los productos del carrito', 'Carrito Copiway');
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
              });
            }}
            className="text-xs font-bold text-red-500 hover:text-red-700 dark:hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Vaciar Carrito
          </button>
        )}
      </div>
      
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-sm p-6 ">
          <ShoppingCart className="w-16 h-16 text-gray-300 dark:text-stone-700 mb-4" />
          <h3 className="text-lg font-medium text-gray-500 dark:text-stone-400">Tu carrito está vacío</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {cart.map((item, idx) => (
              <div key={item.id} className="bg-white dark:bg-[#151515] p-6 rounded-[24px] border border-gray-100 dark:border-stone-800 flex gap-6 shadow-sm">
                <div className="w-24 h-24 rounded-2xl bg-black/5 dark:bg-white/5 overflow-hidden shrink-0 relative">
     {(item.image || item.product?.image) ? (
       <img src={item.image || item.product?.image} alt={item.name} className="w-full h-full object-cover" />
     ) : (
       <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-stone-800 text-gray-400">
          <ShoppingBag className="w-8 h-8 opacity-50" />
       </div>
     )}
  </div>
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div className="min-w-0 flex-1 pr-2">
                      <h4 className="font-bold text-[18px] text-gray-900 dark:text-white truncate">{item.name}</h4>
                      <p className="text-gray-500 text-[13px] mt-1 line-clamp-2">{item.isCustom ? "Armada a tu gusto" : (item.product?.description || "Preparación clásica")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-lg text-gray-900 dark:text-white">{formatCOP(item.finalPrice)}</div>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="flex items-center bg-gray-50 dark:bg-stone-800 rounded-full p-1 border border-gray-100 dark:border-stone-700">
                         <button onClick={() => setCart(cart.map(c => c.id === item.id ? { ...c, quantity: Math.max(1, (c.quantity || 1) - 1) } : c))} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-stone-700 text-gray-600 dark:text-stone-300 font-bold transition-colors">-</button>
                         <span className="w-8 text-center font-bold text-[14px] text-gray-900 dark:text-white">{item.quantity || 1}</span>
                         <button onClick={() => setCart(cart.map(c => c.id === item.id ? { ...c, quantity: (c.quantity || 1) + 1 } : c))} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-stone-700 text-gray-600 dark:text-stone-300 font-bold transition-colors">+</button>
                       </div>
                       <button onClick={() => {
    setEditingCartItemId(item.id);
    if (item.isCustom) {
      setBuilderStack(item.stack || []);
      setActiveTab('builder');
    } else {
      setSelectedProduct(item.product || products.find(p => p.name === item.name));
      setCustomRemoved(item.removed || []);
      setCustomExtras(item.extras || []);
      // Stay on current tab to show modal over cart
    }
  }} className="text-[13px] font-bold text-gray-600 dark:text-stone-400 hover:text-gray-900 dark:hover:text-white transition-colors underline decoration-gray-300 dark:decoration-stone-600 underline-offset-4">Modificar</button>
                    </div>
                    {!isCheckingOut && (
                      <button 
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: 'Eliminar del Carrito',
                            message: `¿Deseas eliminar "${item.name}" de tu pedido?`,
                            confirmText: 'Sí, eliminar',
                            cancelText: 'Conservar',
                            type: 'danger',
                            onConfirm: () => {
                              setCart(cart.filter(c => c.id !== item.id));
                              showToast('danger', `"${item.name}" eliminado del carrito`, 'Carrito Copiway');
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            }
                          });
                        }} 
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2.5 rounded-xl transition-colors cursor-pointer"
                        title="Eliminar del carrito"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-[#151515] p-8 rounded-[32px] border border-gray-100 dark:border-stone-800 h-fit space-y-6 sticky top-28 shadow-sm">
              <h3 className="font-bold text-[22px] text-gray-900 dark:text-white">Resumen de Pago</h3>
              
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center gap-4"><span className="text-gray-500 font-medium text-[15px] whitespace-nowrap">Subtotal</span><span className="text-gray-900 dark:text-white font-bold whitespace-nowrap">{formatCOP(cartSubtotal)}</span></div>
                <div className="flex justify-between items-center gap-4"><span className="text-gray-500 font-medium text-[15px] whitespace-nowrap">Envío</span><span className="text-gray-900 dark:text-white font-bold whitespace-nowrap">{formatCOP(FLAT_SHIPPING_RATE)}</span></div>
                {isBirthday && (
                  <div className="flex justify-between items-center gap-4 text-[#10b981]">
                    <span className="font-medium text-[15px]">Descuento Cumpleaños</span>
                    <span className="font-bold shrink-0">-{formatCOP(birthdayDiscount)}</span>
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-100 dark:border-stone-800 pt-6 flex flex-wrap justify-between items-end gap-2">
                <span className="text-gray-500 font-bold text-[15px] whitespace-nowrap">Total Final</span>
                <span className="text-[clamp(24px,5vw,32px)] leading-none font-bold text-brand-orange shrink-0 whitespace-nowrap">{formatCOP(cartTotal)}</span>
              </div>

              {!isCheckingOut && (
                <>
                  {!isStoreOpen && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-[16px] text-sm flex gap-3 border border-red-100 dark:border-red-900/50 mb-2">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="font-bold">El restaurante está cerrado. Horario de atención: {storeConfig.openTime} a {storeConfig.closeTime}.</p>
                    </div>
                  )}
                  <button 
                    onClick={() => setActiveTab('checkout')} 
                    disabled={!isStoreOpen}
                    className="w-full bg-brand-orange text-white py-4 rounded-xl font-bold mt-4 hover:bg-brand-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm text-[15px] uppercase tracking-wide"
                  >
                    Ir a Pagar
                  </button>
                </>
              )}
              
              <div className="text-center pt-2">
                <p className="text-[11px] text-gray-400 font-medium">Pago seguro mediante pasarela encriptada SSL.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
