import { AlertCircle, ArrowLeft, Banknote, Check, CheckCircle2, CreditCard, Landmark, Lock, MapPin, RotateCcw, ShoppingBag, Smartphone, Wallet } from 'lucide-react';

import { formatCOP } from '../../lib/format';
import { StoreConfig } from '../../store/almacenAplicacion';
import { CartItem, UserProfileState } from '../ClientDashboard';
import { CustomBurgerThumb } from './ingredientArt';

interface CheckoutSectionProps {
  setActiveTab: (tab: string) => void;
  userProfile: UserProfileState;
  setUserProfile: (profile: UserProfileState) => void;
  cart: CartItem[];
  cartSubtotal: number;
  FLAT_SHIPPING_RATE: number;
  isBirthday: boolean;
  birthdayDiscount: number;
  cartTotal: number;
  paymentMethod: 'online' | 'cash';
  setPaymentMethod: (method: 'online' | 'cash') => void;
  digitalBank: 'nequi' | 'daviplata' | 'bancolombia';
  setDigitalBank: (bank: 'nequi' | 'daviplata' | 'bancolombia') => void;
  paymentPhone: string;
  setPaymentPhone: (phone: string) => void;
  paymentStatus: 'idle' | 'processing' | 'success' | 'error';
  isStoreOpen: boolean;
  storeConfig: StoreConfig;
  handleCheckoutSubmit: () => void;
  simulationStep: string;
}

export default function CheckoutSection({
  setActiveTab, userProfile, setUserProfile, cart, cartSubtotal, FLAT_SHIPPING_RATE,
  isBirthday, birthdayDiscount, cartTotal, paymentMethod, setPaymentMethod, digitalBank,
  setDigitalBank, paymentPhone, setPaymentPhone, paymentStatus, isStoreOpen, storeConfig,
  handleCheckoutSubmit, simulationStep,
}: CheckoutSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setActiveTab('cart')} className="p-2 bg-white dark:bg-[#151515] rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-stone-900 transition-colors border border-gray-100 dark:border-stone-800">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-stone-400" />
        </button>
        <h2 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-white">Checkout</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          {/* Dirección de Entrega */}
          <div className="bg-white dark:bg-[#151515] p-6 md:p-8 rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Dirección de Entrega</h3>
                <p className="text-xs text-gray-500 dark:text-stone-400">¿A dónde llevamos tu pedido?</p>
              </div>
            </div>
            <input
              type="text"
              value={userProfile.address || ''}
              onChange={e => setUserProfile({...userProfile, address: e.target.value})}
              className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-stone-700 bg-gray-50 dark:bg-[#1c1c1c] outline-none focus:border-brand-orange focus:bg-white dark:focus:bg-[#2a2a2a] transition-all text-gray-900 dark:text-white font-medium"
              placeholder="Ej: Calle 10 # 5-20, Centro"
            />
          </div>

          {/* Método de Pago */}
          <div className="bg-white dark:bg-[#151515] p-6 md:p-8 rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Método de Pago</h3>
                <p className="text-xs text-gray-500 dark:text-stone-400">Elige cómo quieres pagar tu pedido</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentMethod('online')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-colors ${paymentMethod === 'online' ? 'border-brand-orange bg-brand-orange/5 text-brand-orange' : 'border-gray-200 dark:border-stone-700 text-gray-500 hover:border-gray-300'}`}
              >
                <CreditCard className="w-6 h-6" />
                <span className="font-bold text-sm">Pago Digital</span>
              </button>
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-colors ${paymentMethod === 'cash' ? 'border-brand-orange bg-brand-orange/5 text-brand-orange' : 'border-gray-200 dark:border-stone-700 text-gray-500 hover:border-gray-300'}`}
              >
                <Banknote className="w-6 h-6" />
                <span className="font-bold text-sm">Efectivo al Entregar</span>
              </button>
            </div>

            {paymentMethod === 'online' && (
              <div className="mt-6 p-6 rounded-[24px] border border-gray-100 dark:border-stone-800 bg-gray-50 dark:bg-[#1c1c1c] space-y-4 animate-in fade-in slide-in-from-top-4">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide">Selecciona tu Banco</h4>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setDigitalBank('nequi')}
                    className={`relative flex flex-col items-center gap-2 py-4 rounded-xl font-bold text-sm transition-all ${digitalBank === 'nequi' ? 'bg-[#390069] text-white ring-2 ring-offset-2 ring-[#390069] dark:ring-offset-[#151515] shadow-md' : 'bg-white dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-stone-700'}`}
                  >
                    {digitalBank === 'nequi' && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/25 flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center ${digitalBank === 'nequi' ? 'bg-white/20' : 'bg-[#390069]/10'}`}>
                      <Smartphone className={`w-5 h-5 ${digitalBank === 'nequi' ? 'text-white' : 'text-[#390069]'}`} />
                    </span>
                    Nequi
                  </button>
                  <button
                    onClick={() => setDigitalBank('daviplata')}
                    className={`relative flex flex-col items-center gap-2 py-4 rounded-xl font-bold text-sm transition-all ${digitalBank === 'daviplata' ? 'bg-[#e4002b] text-white ring-2 ring-offset-2 ring-[#e4002b] dark:ring-offset-[#151515] shadow-md' : 'bg-white dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-stone-700'}`}
                  >
                    {digitalBank === 'daviplata' && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/25 flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center ${digitalBank === 'daviplata' ? 'bg-white/20' : 'bg-[#e4002b]/10'}`}>
                      <Wallet className={`w-5 h-5 ${digitalBank === 'daviplata' ? 'text-white' : 'text-[#e4002b]'}`} />
                    </span>
                    Daviplata
                  </button>
                  <button
                    onClick={() => setDigitalBank('bancolombia')}
                    className={`relative flex flex-col items-center gap-2 py-4 rounded-xl font-bold text-sm transition-all ${digitalBank === 'bancolombia' ? 'bg-[#ffd200] text-gray-900 ring-2 ring-offset-2 ring-[#ffd200] dark:ring-offset-[#151515] shadow-md' : 'bg-white dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-stone-700'}`}
                  >
                    {digitalBank === 'bancolombia' && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-black/10 flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center ${digitalBank === 'bancolombia' ? 'bg-black/10' : 'bg-[#ffd200]/20'}`}>
                      <Landmark className={`w-5 h-5 ${digitalBank === 'bancolombia' ? 'text-gray-900' : 'text-[#b08d00] dark:text-[#ffd200]'}`} />
                    </span>
                    Bancolombia
                  </button>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Número de celular / cuenta</label>
                  <input
                    type="tel"
                    value={paymentPhone}
                    onChange={e => setPaymentPhone(e.target.value)}
                    placeholder="Ej: 300 123 4567"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-[#2a2a2a] outline-none focus:border-brand-orange transition-all text-gray-900 dark:text-white font-medium"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-stone-500 font-medium pt-1">
                  <Lock className="w-3 h-3" /> Conexión cifrada TLS · Tus datos nunca se guardan en nuestros servidores
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-[20px] text-sm flex gap-4 border border-blue-100 dark:border-blue-900/50">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">Punto de no retorno. Al confirmar el pago, la orden se enviará a cocina y no se admiten cambios ni cancelaciones.</p>
          </div>
        </div>

        {/* Resumen del Pedido */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-[#151515] p-8 rounded-[32px] border border-gray-100 dark:border-stone-800 h-fit space-y-6 sticky top-28 shadow-sm">
            <h3 className="font-bold text-[22px] text-gray-900 dark:text-white">Resumen del Pedido</h3>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 -mr-1">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 shrink-0 relative">
                    <div className="w-full h-full rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-gray-100 dark:border-stone-800">
                      {(item.image || item.product?.image) ? (
                        <img src={item.image || item.product?.image} alt={item.name} className="w-full h-full object-cover object-center" />
                      ) : item.stack && item.stack.length > 0 ? (
                        <CustomBurgerThumb ingredientNames={item.stack.map(s => s.name)} size={48} className="!rounded-none border-0" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-stone-800 text-gray-400">
                          <ShoppingBag className="w-5 h-5 opacity-50" />
                        </div>
                      )}
                    </div>
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-brand-orange text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white/90 dark:ring-black/60 shadow-sm">
                      {item.quantity || 1}
                    </span>
                  </div>
                  <p className="flex-1 min-w-0 text-sm font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                  <span className="text-sm font-bold text-gray-700 dark:text-stone-300 shrink-0">{formatCOP(item.finalPrice)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 dark:border-stone-800 pt-4 space-y-2">
              <div className="flex justify-between items-center text-[15px]">
                <span className="text-gray-500 font-medium">Subtotal</span>
                <span className="text-gray-900 dark:text-white font-bold">{formatCOP(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-[15px]">
                <span className="text-gray-500 font-medium">Envío (Tarifa Plana)</span>
                <span className="text-gray-900 dark:text-white font-bold">{formatCOP(FLAT_SHIPPING_RATE)}</span>
              </div>
              {isBirthday && (
                <div className="flex justify-between items-center text-[15px] text-[#10b981]">
                  <span className="font-medium">Descuento Cumpleaños</span>
                  <span className="font-bold">-{formatCOP(birthdayDiscount)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 dark:border-stone-800 pt-4 flex flex-wrap justify-between items-end gap-2">
              <span className="text-gray-500 font-bold text-[15px] whitespace-nowrap">Total a Pagar</span>
              <span className="text-[clamp(24px,5vw,32px)] leading-none font-bold text-brand-orange shrink-0 whitespace-nowrap">{formatCOP(cartTotal)}</span>
            </div>

            <div className="space-y-3 pt-2">
              {paymentStatus === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-[16px] text-sm text-center font-bold border border-red-100 dark:border-red-900/50">
                  Fondos insuficientes o transacción rechazada.
                </div>
              )}

              {paymentStatus === 'success' && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-[16px] text-sm text-center font-bold border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Pedido confirmado, enviando a cocina...
                </div>
              )}

              <button
                onClick={handleCheckoutSubmit}
                disabled={!isStoreOpen || storeConfig.isPaused || paymentStatus !== 'idle'}
                className="w-full bg-brand-orange text-white shadow-xl shadow-brand-orange/20 py-4 rounded-xl font-bold hover:bg-brand-orange/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg uppercase tracking-wide"
              >
                {paymentStatus === 'processing' ? (
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-bold">{simulationStep || 'Procesando...'}</span>
                  </div>
                ) : paymentStatus === 'success' ? (
                  <span className="text-sm font-bold">{simulationStep || '¡Completado!'}</span>
                ) : paymentStatus === 'error' ? (
                  <span className="text-sm font-bold">{simulationStep || 'Error en el pago'}</span>
                ) : (paymentMethod === 'online' ? 'Confirmar y Pagar' : 'Confirmar')}
              </button>

              {!isStoreOpen && !storeConfig.isPaused && (
                <p className="text-center text-red-500 font-bold text-sm">El local está cerrado en este momento.</p>
              )}
              {storeConfig.isPaused && (
                <p className="text-center text-red-500 font-bold text-sm">Cocina colapsada/Pausada. Volvemos en unos minutos.</p>
              )}

              <p className="text-center text-[11px] text-gray-400 font-medium pt-1">Pago seguro mediante pasarela encriptada SSL.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
