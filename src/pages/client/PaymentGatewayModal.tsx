import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Landmark, Lock, ShieldCheck, Smartphone, Wallet, XCircle } from 'lucide-react';

import { formatCOP } from '../../lib/format';

export type GatewayStep = 'idle' | 'connecting' | 'waiting' | 'verifying' | 'approved' | 'declined';

interface BankBrand {
  name: string;
  color: string;
  textColor: string;
  icon: typeof Smartphone;
}

const BANKS: Record<'nequi' | 'daviplata' | 'bancolombia', BankBrand> = {
  nequi: { name: 'Nequi', color: '#390069', textColor: '#ffffff', icon: Smartphone },
  daviplata: { name: 'Daviplata', color: '#e4002b', textColor: '#ffffff', icon: Wallet },
  bancolombia: { name: 'Bancolombia', color: '#ffd200', textColor: '#111111', icon: Landmark },
};

const PASOS: GatewayStep[] = ['connecting', 'waiting', 'verifying', 'approved'];

interface PaymentGatewayModalProps {
  step: GatewayStep;
  bank: 'nequi' | 'daviplata' | 'bancolombia';
  phone: string;
  amount: number;
  declineReason?: string;
}

export default function PaymentGatewayModal({ step, bank, phone, amount, declineReason }: PaymentGatewayModalProps) {
  const brand = BANKS[bank];
  const BrandIcon = brand.icon;
  const maskedPhone = phone.length >= 4 ? `${'*'.repeat(Math.max(phone.length - 4, 0))}${phone.slice(-4)}` : phone;

  // Referencia de transaccion: una por intento de pago (se regenera cada vez
  // que arranca un nuevo ciclo 'connecting'), como en una pasarela real.
  const [reference, setReference] = useState('');
  useEffect(() => {
    if (step === 'connecting') {
      const azar = Math.floor(100000 + Math.random() * 900000);
      setReference(`COP-${azar}`);
    }
  }, [step]);

  const pasoActualIndex = step === 'declined' ? PASOS.indexOf('verifying') : PASOS.indexOf(step);
  const fallo = step === 'declined';

  return (
    <AnimatePresence>
      {step !== 'idle' && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl bg-white dark:bg-[#151515]"
          >
            <div style={{ backgroundColor: brand.color, color: brand.textColor }} className="px-6 py-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <BrandIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-lg leading-tight">{brand.name}</p>
                <p className="text-xs opacity-80 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Pasarela de pagos segura
                </p>
              </div>
            </div>

            {/* Barra de comercio/monto, como en una pasarela real */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-stone-800 flex items-center justify-between gap-3 bg-gray-50/80 dark:bg-white/[0.02]">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-stone-500">Pagando a</p>
                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">CopiwayPRO</p>
                {reference && <p className="text-[11px] text-gray-400 dark:text-stone-500 font-mono mt-0.5">Ref. {reference}</p>}
              </div>
              <p className="font-black text-lg text-gray-900 dark:text-white shrink-0">{formatCOP(amount)}</p>
            </div>

            {/* Progreso de la transaccion */}
            <div className="px-6 pt-4 flex items-center gap-1.5">
              {PASOS.map((p, i) => {
                const completado = i <= pasoActualIndex;
                const color = fallo && i === pasoActualIndex ? '#ef4444' : brand.color;
                return (
                  <div
                    key={p}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${completado ? '' : 'bg-gray-200 dark:bg-stone-800'}`}
                    style={completado ? { backgroundColor: color } : undefined}
                  />
                );
              })}
            </div>

            <div className="p-8 flex flex-col items-center text-center gap-5 min-h-[260px] justify-center">
              {step === 'connecting' && (
                <>
                  <div className="w-16 h-16 rounded-full border-4 border-gray-200 dark:border-stone-700 flex items-center justify-center relative">
                    <Lock className="w-6 h-6 text-gray-400" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${brand.color} transparent transparent transparent` }} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Conectando con {brand.name}</p>
                    <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">Estableciendo un canal seguro y cifrado...</p>
                  </div>
                </>
              )}

              {step === 'waiting' && (
                <>
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-stone-800 flex items-center justify-center">
                      <Smartphone className="w-8 h-8 text-gray-500 dark:text-stone-300" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: brand.color }} />
                      <span className="relative inline-flex rounded-full h-4 w-4" style={{ backgroundColor: brand.color }} />
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Solicitud enviada a tu celular</p>
                    <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">Abre tu app {brand.name} en el número {maskedPhone} y aprueba el pago de <span className="font-bold text-gray-700 dark:text-stone-200">{formatCOP(amount)}</span>.</p>
                  </div>
                  <div className="w-full bg-gray-50 dark:bg-stone-900 rounded-xl p-3 flex items-center gap-3 border border-gray-100 dark:border-stone-800">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: brand.color }} />
                    <p className="text-xs font-medium text-gray-500 dark:text-stone-400 text-left">Esperando aprobación del usuario...</p>
                  </div>
                </>
              )}

              {step === 'verifying' && (
                <>
                  <div className="w-16 h-16 rounded-full border-4 border-gray-200 dark:border-stone-700 border-t-transparent animate-spin" style={{ borderTopColor: brand.color }} />
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Verificando transacción</p>
                    <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">Confirmando el pago con {brand.name}...</p>
                  </div>
                </>
              )}

              {step === 'approved' && (
                <>
                  <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                    <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                  </motion.div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">¡Pago Aprobado!</p>
                    <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">{formatCOP(amount)} pagados con {brand.name}. Enviando tu pedido a cocina...</p>
                  </div>
                </>
              )}

              {step === 'declined' && (
                <>
                  <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                    <XCircle className="w-16 h-16 text-red-500" />
                  </motion.div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Pago Rechazado</p>
                    <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">{declineReason || 'La transacción fue rechazada por el banco. Intenta de nuevo.'}</p>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 dark:border-stone-800 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 dark:text-stone-500 font-medium">
              <Lock className="w-3 h-3" /> Conexión cifrada TLS · Cumplimiento PCI DSS
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
