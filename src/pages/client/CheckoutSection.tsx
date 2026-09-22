import { AlertCircle, Banknote, CheckCircle2, CreditCard, RotateCcw } from 'lucide-react';

import { formatCOP } from '../../lib/format';
import { StoreConfig } from '../../store/almacenAplicacion';
import { CartItem, UserProfileState } from '../ClientDashboard';

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
    <div className="space-y-6  mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setActiveTab('cart')} className="p-2 bg-white dark:bg-[#151515] rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-stone-900 transition-colors border border-gray-100 dark:border-stone-800">
          <RotateCcw className="w-5 h-5 text-gray-600 dark:text-stone-400 -rotate-90" />
        </button>
        <h2 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-white">Checkout</h2>
      </div>

      <div className="bg-white dark:bg-[#151515] p-8 rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm space-y-8">
        <div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white border-b border-gray-100 dark:border-stone-800 pb-4 mb-4">Dirección de Entrega</h3>
          <input
            type="text"
            value={userProfile.address || ''}
            onChange={e => setUserProfile({...userProfile, address: e.target.value})}
            className="w-full px-4 py-3 rounded-md border border-gray-100 dark:border-stone-700 bg-white dark:bg-[#151515] outline-none focus:border-brand-orange transition-all text-gray-900 dark:text-white font-medium"
            placeholder="Ej: Calle 10 # 5-20, Centro"
          />
        </div>

        <div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white border-b border-gray-100 dark:border-stone-800 pb-4 mb-4">Resumen del Pedido</h3>
          <div className="space-y-4">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center text-gray-700 dark:text-stone-300 font-medium">
                <span>{item.quantity}x {item.name}</span>
                <span>{formatCOP(item.finalPrice)}</span>
              </div>
            ))}
            <div className="pt-4 border-t border-gray-100 dark:border-stone-800 space-y-2">
              <div className="flex justify-between items-center text-gray-500">
                <span>Subtotal</span>
                <span>{formatCOP(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>Envío (Tarifa Plana)</span>
                <span>{formatCOP(FLAT_SHIPPING_RATE)}</span>
              </div>
              {isBirthday && (
                <div className="flex justify-between items-center text-[#10b981]">
                  <span>Descuento Cumpleaños</span>
                  <span>-{formatCOP(birthdayDiscount)}</span>
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-gray-100 dark:border-stone-800 flex justify-between items-center">
              <span className="font-black text-xl text-gray-900 dark:text-white">Total a Pagar</span>
              <span className="font-black text-[clamp(20px,5vw,24px)] leading-none text-brand-orange">{formatCOP(cartTotal)}</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 dark:border-stone-800">
          <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-4">Método de Pago</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setPaymentMethod('online')}
              className={`p-4 rounded-[20px] border-2 flex flex-col items-center gap-2 transition-colors ${paymentMethod === 'online' ? 'border-brand-orange bg-brand-orange/5 text-brand-orange' : 'border-gray-200 dark:border-stone-700 text-gray-500 hover:border-gray-300'}`}
            >
              <CreditCard className="w-6 h-6" />
              <span className="font-bold text-sm">Pago Digital</span>
            </button>
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`p-4 rounded-[20px] border-2 flex flex-col items-center gap-2 transition-colors ${paymentMethod === 'cash' ? 'border-brand-orange bg-brand-orange/5 text-brand-orange' : 'border-gray-200 dark:border-stone-700 text-gray-500 hover:border-gray-300'}`}
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
                  className={`py-3 rounded-xl font-bold text-sm transition-colors ${digitalBank === 'nequi' ? 'bg-[#390069] text-white' : 'bg-white dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-stone-700'}`}
                >
                  Nequi
                </button>
                <button
                  onClick={() => setDigitalBank('daviplata')}
                  className={`py-3 rounded-xl font-bold text-sm transition-colors ${digitalBank === 'daviplata' ? 'bg-[#e4002b] text-white' : 'bg-white dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-stone-700'}`}
                >
                  Daviplata
                </button>
                <button
                  onClick={() => setDigitalBank('bancolombia')}
                  className={`py-3 rounded-xl font-bold text-sm transition-colors ${digitalBank === 'bancolombia' ? 'bg-[#ffd200] text-gray-900' : 'bg-white dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-stone-700'}`}
                >
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
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-[20px] text-sm flex gap-4 border border-blue-100 dark:border-blue-900/50">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">Punto de no retorno. Al confirmar el pago, la orden se enviará a cocina y no se admiten cambios ni cancelaciones.</p>
          </div>

          {paymentStatus === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-[20px] text-sm text-center font-bold border border-red-100 dark:border-red-900/50">
              Fondos insuficientes o transacción rechazada.
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-[20px] text-sm text-center font-bold border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center gap-2">
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
            <p className="text-center text-red-500 font-bold mt-2">El local está cerrado en este momento.</p>
          )}
          {storeConfig.isPaused && (
            <p className="text-center text-red-500 font-bold mt-2">Cocina colapsada/Pausada. Volvemos en unos minutos.</p>
          )}
        </div>
      </div>
    </div>
  );
}
