import { Calendar, Gift, LogOut } from 'lucide-react';

import { UserProfileState } from '../ClientDashboard';

interface ProfileSectionProps {
  userProfile: UserProfileState;
  setUserProfile: (profile: UserProfileState) => void;
  setShowCalendar: (show: boolean) => void;
  showToast: (type: string, message: string, title?: string) => void;
  setShowPasswordModal: (show: boolean) => void;
  handleLogout: () => void;
}

export default function ProfileSection({
  userProfile, setUserProfile, setShowCalendar, showToast, setShowPasswordModal, handleLogout,
}: ProfileSectionProps) {
  return (
    <div className="space-y-8 ">
      <div className="bg-brand-orange p-8 rounded-[32px] text-white flex items-center justify-between shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-white/80 font-bold mb-3 tracking-wider uppercase text-[12px]">Fidelidad y Recompensas</p>
          <h3 className="text-6xl font-bold tracking-tight">{userProfile.points} <span className="text-3xl font-medium tracking-normal opacity-80">pts</span></h3>
        </div>
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center relative z-10 shadow-inner">
          <Gift className="w-12 h-12 text-brand-orange" />
        </div>
      </div>

      <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 p-8 space-y-6 shadow-sm">
        <h3 className="font-bold text-[clamp(16px,4vw,20px)] border-b border-gray-100 dark:border-stone-800 pb-4 text-gray-900 dark:text-white">Información Personal</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-[14px] font-bold text-gray-700 dark:text-stone-300 mb-2">Nombre Completo</label>
            <input
              type="text"
              value={userProfile.name}
              onChange={e => setUserProfile({...userProfile, name: e.target.value})}
              className="w-full px-4 py-3 rounded-md border border-gray-100 dark:border-stone-700 bg-white dark:bg-[#151515] outline-none focus:border-brand-orange transition-all text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-[14px] font-bold text-gray-700 dark:text-stone-300 mb-2">Correo Electrónico</label>
            <input
              type="email"
              value={userProfile.email || ''}
              onChange={e => setUserProfile({...userProfile, email: e.target.value})}
              className="w-full px-4 py-3 rounded-md border border-gray-100 dark:border-stone-700 bg-white dark:bg-[#151515] outline-none focus:border-brand-orange transition-all text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-[14px] font-bold text-gray-700 dark:text-stone-300 mb-2">Teléfono Móvil</label>
            <input
              type="tel"
              value={userProfile.phone}
              onChange={e => setUserProfile({...userProfile, phone: e.target.value})}
              className="w-full px-4 py-3 rounded-md border border-gray-100 dark:border-stone-700 bg-white dark:bg-[#151515] outline-none focus:border-brand-orange transition-all text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-[14px] font-bold text-gray-700 dark:text-stone-300 mb-2">Dirección Predeterminada</label>
            <input
              type="text"
              value={userProfile.address || ''}
              onChange={e => setUserProfile({...userProfile, address: e.target.value})}
              className="w-full px-4 py-3 rounded-md border border-gray-100 dark:border-stone-700 bg-white dark:bg-[#151515] outline-none focus:border-brand-orange transition-all text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-[14px] font-bold text-gray-700 dark:text-stone-300 mb-2">Fecha de Nacimiento</label>
            <button
              type="button"
              onClick={() => setShowCalendar(true)}
              className="w-full px-4 py-3 text-left rounded-md border border-gray-100 dark:border-stone-700 bg-white dark:bg-[#151515] outline-none focus:border-brand-orange transition-all text-gray-900 dark:text-white flex justify-between items-center"
            >
              <span className={userProfile.birthday ? "text-gray-900 dark:text-white font-medium" : "text-gray-400"}>
                {userProfile.birthday || 'Selecciona una fecha'}
              </span>
              <Calendar className="w-5 h-5 text-gray-400" />
            </button>
            <div className="mt-4 flex gap-3 items-center text-[13px] font-medium text-brand-orange bg-brand-orange/10 dark:bg-brand-orange/10 p-4 rounded-md border border-brand-orange/20">
              <Gift className="w-5 h-5 shrink-0" />
              <span>Configura tu fecha para activar tu 15% de descuento en tu cumpleaños.</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-stone-800">
          <button
            onClick={() => showToast('info', 'No se guardó ninguna modificación.', 'Cambios Descartados')}
            className="px-6 py-2.5 rounded-md font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 transition-colors text-[14px]"
          >
            Descartar
          </button>
          <button
            onClick={() => showToast('success', 'Tus datos personales se guardaron correctamente.', 'Perfil Actualizado')}
            className="px-6 py-2.5 rounded-md font-bold text-white bg-brand-orange hover:bg-brand-orange/90 transition-colors text-[14px]"
          >
            Guardar Cambios
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 p-8 space-y-6 shadow-sm">
        <h3 className="font-bold text-[clamp(16px,4vw,20px)] border-b border-gray-100 dark:border-stone-800 pb-4 text-gray-900 dark:text-white">Seguridad</h3>
        <div className="space-y-4">
          <p className="text-[14px] text-gray-600 dark:text-stone-400">Protege tu cuenta y actualiza tu contraseña cuando lo necesites.</p>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-6 py-2.5 rounded-md font-bold text-brand-orange bg-brand-orange/10 hover:bg-brand-orange/20 transition-colors text-[14px]"
          >
            Cambiar Contraseña
          </button>
        </div>
      </div>

      {/* Cerrar Sesión (Visible solo en mobile dentro del perfil) */}
      <div className="md:hidden bg-red-50 dark:bg-red-950/20 rounded-[24px] border border-red-100 dark:border-red-900/30 p-8 space-y-4 shadow-sm">
        <h3 className="font-bold text-[clamp(16px,4vw,20px)] text-red-700 dark:text-red-400">Sesión</h3>
        <p className="text-sm text-red-600 dark:text-red-400/80">¿Deseas salir de tu cuenta?</p>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-red-700 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 transition-all uppercase tracking-widest text-xs"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
