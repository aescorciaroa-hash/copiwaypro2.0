import React from 'react';
import {
  ChefHat, ChevronLeft, ChevronRight, Download, Eye, EyeOff, Filter, IdCard, Package, Search, User, UserPlus
} from 'lucide-react';

import { Staff } from '../../store/almacenAplicacion';
import { ToastData } from '../../components/ToastNotification';
import { CustomSelect } from '../../components/CustomSelect';
import { ConfirmModalState } from '../AdminDashboard';

export interface NewStaffState {
  name: string;
  role: string;
  email: string;
  password: string;
  phone: string;
  plate: string;
  vehicle: string;
  baseCash: number | '';
}

interface StaffSectionProps {
  staff: Staff[];
  filteredStaff: Staff[];
  paginatedStaff: Staff[];
  staffTotalPages: number;
  staffCurrentPage: number;
  setStaffCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  staffSearch: string;
  setStaffSearch: React.Dispatch<React.SetStateAction<string>>;
  addStaff: (employee: Staff) => Promise<void>;
  updateStaff: (id: string, updates: Partial<Staff>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  newStaff: NewStaffState;
  setNewStaff: React.Dispatch<React.SetStateAction<NewStaffState>>;
  showStaffPassword: boolean;
  setShowStaffPassword: React.Dispatch<React.SetStateAction<boolean>>;
  handleOpenStaffModal: (emp: Staff) => void;
  showToast: (type: ToastData['type'], message: string, title?: string) => void;
  setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalState>>;
}

export default function StaffSection({
  staff,
  filteredStaff,
  paginatedStaff,
  staffTotalPages,
  staffCurrentPage,
  setStaffCurrentPage,
  staffSearch,
  setStaffSearch,
  addStaff,
  updateStaff,
  deleteStaff,
  newStaff,
  setNewStaff,
  showStaffPassword,
  setShowStaffPassword,
  handleOpenStaffModal,
  showToast,
  setConfirmModal,
}: StaffSectionProps) {
    const handleAddStaff = () => {
      if (!newStaff.name || !newStaff.email || !newStaff.password) return;
      const staffName = newStaff.name;
      const staffRole = newStaff.role;
      addStaff({ ...newStaff, baseCash: newStaff.baseCash === '' ? 0 : newStaff.baseCash, id: Date.now().toString(), active: true });
      showToast('staff', 'El empleado ha sido creado exitosamente.', 'Colaborador Registrado');
      setNewStaff({ name: '', role: 'Ayudante de cocina', email: '', password: '', phone: '', plate: '', vehicle: '', baseCash: 0 });
    };

    const handleSoftDelete = (id: string) => {
      const target = staff.find(s => s.id === id);
      const name = target?.name || 'este colaborador';
      setConfirmModal({
        isOpen: true,
        title: 'Dar de Baja a Empleado',
        message: `¿Estás seguro de revocar el acceso a "${name}"? Su cuenta quedará inactiva para iniciar sesión, pero se preservará su historial de turnos y entregas en el sistema.`,
        confirmText: 'Sí, dar de baja',
        cancelText: 'Cancelar',
        type: 'warning',
        onConfirm: () => {
          updateStaff(id, { active: false });
          showToast('warning', 'El acceso del empleado fue revocado.', 'Colaborador Dado de Baja');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    };

    const handleHardDelete = (id: string) => {
      const target = staff.find(s => s.id === id);
      const name = target?.name || 'este colaborador';
      setConfirmModal({
        isOpen: true,
        title: 'Eliminar Empleado Permanentemente',
        message: `¿Estás seguro de eliminar por completo el registro de "${name}"? Esta acción borrará permanentemente sus credenciales.`,
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar',
        type: 'danger',
        onConfirm: () => {
          deleteStaff(id);
          showToast('danger', `Colaborador "${name}" eliminado definitivamente`, 'Gestión Humana');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    };

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
          <div>
            <h2 className="text-[28px] font-black tracking-tight text-gray-900 dark:text-white mb-2">Colaboradores</h2>
            <p className="text-gray-600 dark:text-stone-400 font-medium">Administra tu equipo y sus accesos.</p>
          </div>
          <div className="bg-white dark:bg-[#151515] rounded-full border border-gray-100 dark:border-stone-800 px-6 py-3 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-brand-orange flex items-center justify-center shrink-0">
              <IdCard className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">TOTAL PERSONAL</p>
              <p className="font-black text-[clamp(16px,4vw,18px)] leading-none text-gray-900 dark:text-white leading-none">{staff.length} Activos</p>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          
          {/* Column 1: Add new staff */}
          <div className="bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 p-6 md:p-8 shadow-sm h-fit">
            <div className="flex items-center gap-3 mb-6">
              <UserPlus className="w-6 h-6 text-brand-orange" />
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Registrar Nuevo<br/>Empleado</h3>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Nombre Completo</label>
                <input type="text" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} className="w-full px-5 py-3 rounded-full border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all" placeholder="Ej. Roberto Gómez" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Email Corporativo</label>
                <input type="email" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} className="w-full px-5 py-3 rounded-full border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all" placeholder="roberto@copiway.com" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Número de Celular</label>
                <input type="tel" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} className="w-full px-5 py-3 rounded-full border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all" placeholder="Ej. 300 123 4567" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Contraseña Provisoria</label>
                <div className="relative">
                  <input type={showStaffPassword ? "text" : "password"} value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} className="w-full px-5 py-3 rounded-full border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all pr-12" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowStaffPassword(!showStaffPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">
                    {showStaffPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Rol en el Establecimiento</label>
                <CustomSelect
                  value={newStaff.role}
                  onChange={(val) => setNewStaff({ ...newStaff, role: val })}
                  options={[
                    { value: 'Ayudante de cocina', label: 'Ayudante de cocina' },
                    { value: 'Domiciliario', label: 'Domiciliario' }
                  ]}
                />
              </div>
              
              {newStaff.role === 'Domiciliario' && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Placa</label>
                      <input 
                        type="text" 
                        value={newStaff.plate || ''} 
                        onChange={e => setNewStaff({...newStaff, plate: e.target.value.toUpperCase()})} 
                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange transition-all uppercase" 
                        placeholder="Ej. XYZ-123" 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Vehículo</label>
                      <input 
                        type="text" 
                        value={newStaff.vehicle || ''} 
                        onChange={e => setNewStaff({...newStaff, vehicle: e.target.value})} 
                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange transition-all" 
                        placeholder="Ej. Moto Honda" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Base Efectivo Asignada</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                      <input 
                        type="number" 
                        value={newStaff.baseCash === 0 ? '' : newStaff.baseCash} 
                        onChange={e => setNewStaff({...newStaff, baseCash: e.target.value === '' ? '' : parseInt(e.target.value)})} 
                        className="w-full pl-10 pr-5 py-3 rounded-2xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-black text-gray-900 dark:text-white outline-none focus:border-brand-orange transition-all" 
                        placeholder="0" 
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Sencillo entregado para vueltas al iniciar el turno.</p>
                  </div>
                </div>
              )}
              <button 
                onClick={handleAddStaff} 
                disabled={!newStaff.name || !newStaff.email || !newStaff.password}
                className="w-full bg-brand-orange text-white px-6 py-3.5 rounded-full font-bold hover:bg-brand-orange/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                Crear Cuenta
              </button>
            </div>
          </div>
          
          {/* Column 2: List */}
          <div className="bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 md:px-8 py-6 border-b border-gray-100 dark:border-stone-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Lista de Personal</h3>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center border border-gray-200 dark:border-stone-700 rounded-full bg-gray-50 dark:bg-stone-900/50 px-4 py-2 flex-1 md:w-64 min-w-0">
                  <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Buscar empleado..." 
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm w-full text-gray-800 dark:text-stone-300 placeholder-gray-500 font-medium" 
                  />
                </div>
                <button className="w-10 h-10 rounded-full border border-gray-200 dark:border-stone-700 flex items-center justify-center text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-900 transition-colors shrink-0">
                  <Filter className="w-4 h-4" />
                </button>
                <button className="w-10 h-10 rounded-full border border-gray-200 dark:border-stone-700 flex items-center justify-center text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-900 transition-colors shrink-0">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full min-w-[600px] text-left">
                <thead className="bg-gray-50 dark:bg-stone-900/40 border-b border-gray-100 dark:border-stone-800">
                  <tr>
                    <th className="px-8 py-4 font-bold text-sm text-gray-500 dark:text-stone-400">Nombre y Contacto</th>
                    <th className="px-8 py-4 font-bold text-sm text-gray-500 dark:text-stone-400">Rol</th>
                    <th className="px-8 py-4 font-bold text-sm text-gray-500 dark:text-stone-400">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500 font-medium">No hay empleados registrados.</td>
                    </tr>
                  ) : paginatedStaff.map(emp => (
                    <tr key={emp.id} onClick={() => handleOpenStaffModal(emp)} className="border-b border-gray-100 dark:border-stone-800/50 hover:bg-gray-50/50 dark:hover:bg-stone-900/20 transition-colors cursor-pointer">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm shrink-0">
                            {emp.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white mb-0.5">{emp.name}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-stone-400 truncate">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-stone-300 font-medium text-sm">
                          {emp.role === 'Ayudante de cocina' ? <ChefHat className="w-4 h-4 text-gray-400" /> : 
                           emp.role === 'Domiciliario' ? <Package className="w-4 h-4 text-gray-400" /> : 
                           <User className="w-4 h-4 text-gray-400" />}
                          {emp.role}
                        </div>
                      </td>
                      <td className="px-8 py-5 flex items-center justify-between">
                        {emp.active ? (
                          <span className="px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200/50 dark:border-green-800/50 rounded-full text-[11px] font-bold tracking-wide uppercase">Activo</span>
                        ) : (
                          <span className="px-3 py-1 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200/50 dark:border-red-800/50 rounded-full text-[11px] font-bold tracking-wide uppercase">Inactivo</span>
                        )}
                        {emp.active ? (
                          <button onClick={(e) => { e.stopPropagation(); handleSoftDelete(emp.id); }} className="text-red-400 hover:text-red-600 ml-4 font-bold text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Dar de baja</button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleHardDelete(emp.id); }} className="text-red-600 hover:text-red-800 ml-4 font-bold text-sm px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors">Eliminar Permanente</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards for Staff */}
            <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
              {staff.length === 0 ? (
                <div className="text-center text-gray-500 font-medium py-8">No hay empleados registrados.</div>
              ) : paginatedStaff.map(emp => (
                <div key={emp.id} onClick={() => handleOpenStaffModal(emp)} className="bg-gray-50/50 dark:bg-stone-900/20 border border-gray-100 dark:border-stone-800 rounded-2xl p-4 flex flex-col gap-4 cursor-pointer hover:border-brand-orange/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm shrink-0">
                      {emp.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 dark:text-white mb-0.5 truncate">{emp.name}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-stone-400 truncate">{emp.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-stone-300 font-medium text-xs">
                      {emp.role === 'Ayudante de cocina' ? <ChefHat className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : 
                       emp.role === 'Domiciliario' ? <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : 
                       <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                      <span className="truncate">{emp.role}</span>
                    </div>
                    {emp.active ? (
                      <span className="px-2.5 py-1 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200/50 dark:border-green-800/50 rounded-full text-[10px] font-bold tracking-wide uppercase shrink-0 whitespace-nowrap">Activo</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200/50 dark:border-red-800/50 rounded-full text-[10px] font-bold tracking-wide uppercase shrink-0 whitespace-nowrap">Inactivo</span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-gray-200/50 dark:border-stone-800">
                    {emp.active ? (
                      <button onClick={(e) => { e.stopPropagation(); handleSoftDelete(emp.id); }} className="w-full text-center text-red-500 font-bold text-sm py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Dar de baja</button>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); handleHardDelete(emp.id); }} className="w-full text-center text-red-600 font-bold text-sm py-2 rounded-xl bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors">Eliminar Permanente</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Pagination */}
            <div className="p-6 border-t border-gray-100 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
              <p className="text-xs font-medium text-gray-500">Mostrando {paginatedStaff.length} de {filteredStaff.length} colaboradores encontrados</p>
              <div className="flex items-center gap-1 sm:gap-2">
                <button 
                  onClick={() => setStaffCurrentPage(Math.max(1, staffCurrentPage - 1))}
                  disabled={staffCurrentPage === 1}
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-stone-700 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: staffTotalPages }).map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setStaffCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition-colors ${staffCurrentPage === i + 1 ? 'bg-brand-orange text-white font-bold' : 'border border-gray-200 dark:border-stone-700 text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-800'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setStaffCurrentPage(Math.min(staffTotalPages, staffCurrentPage + 1))}
                  disabled={staffCurrentPage === staffTotalPages}
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-stone-700 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}
