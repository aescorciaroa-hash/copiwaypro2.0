import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ToastNotification, ToastData } from '../components/ToastNotification';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ArrowLeft,  
  ChefHat, LogOut, Sun, Moon, Printer, CheckCircle2, AlertCircle, RefreshCw, Utensils, Volume2, VolumeX, Bell, Menu, X
 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useStore, Order } from '../store/almacenAplicacion';
import { soundFx } from '../utils/audio';
import { api, ApiError, irA } from '../servicios/api';

type KitchenOrderStatus = 'Pendiente' | 'En Preparación' | 'Listos' | 'Pagado';

export default function KitchenDashboard() {
  const { theme, toggleTheme } = useTheme();
  
  const { orders, updateOrderStatus, inventory, staff } = useStore();

  const [time, setTime] = useState(new Date());
  const [printError, setPrintError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => soundFx.isEnabled());
  const [showNewOrderAlert, setShowNewOrderAlert] = useState(false);
  const [newOrderAlertText, setNewOrderAlertText] = useState('');
  const [toastData, setToastData] = useState<ToastData | null>(null);

  const showToast = (type: ToastData['type'] = 'info', message: string, title?: string) => {
    setToastData({ type, message, title });
  };
  
  // Track previous orders to detect incoming ones
  const prevOrdersCountRef = useRef<number>(orders.length);
  const initialLoadRef = useRef<boolean>(true);

  // Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Inventory State
  const [showInventory, setShowInventory] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Escuchar nuevos pedidos en tiempo real para disparar sonido de comanda (RF-27 / RF-36)
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      prevOrdersCountRef.current = orders.length;
      return;
    }

    if (orders.length > prevOrdersCountRef.current) {
      const latestOrder = orders[0];
      const orderId = latestOrder ? latestOrder.id : 'Nuevo Pedido';
      setNewOrderAlertText(`¡Comanda ${orderId} recibida en cocina!`);
      setShowNewOrderAlert(true);
      soundFx.playOrderBell();
      setTimeout(() => setShowNewOrderAlert(false), 5000);
    }
    prevOrdersCountRef.current = orders.length;
  }, [orders]);

  const handleToggleSound = () => {
    const active = soundFx.toggleSound();
    setSoundEnabled(active);
    showToast('config', active ? 'Alertas sonoras activadas' : 'Alertas sonoras silenciadas', 'Sonido de Alertas');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const { user } = await api.post<{ user: { id: string; role: string } }>('/auth/login', {
        email: username,
        password,
      });
      if (user.role !== 'kitchen') {
        await api.post('/auth/logout').catch(() => {});
        setLoginError('Esta cuenta no tiene acceso al panel de cocina.');
        return;
      }
      setIsLoggedIn(true);
    } catch (err) {
      setLoginError(err instanceof ApiError ? err.message : 'Usuario o contraseña incorrectos.');
    }
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    type: 'info',
    onConfirm: () => {},
  });

  const handleLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Cerrar Sesión de Cocina',
      message: '¿Estás seguro de que deseas salir del panel de cocina de Hamburguer Copiway?',
      confirmText: 'Sí, cerrar sesión',
      cancelText: 'Permanecer',
      type: 'info',
      onConfirm: () => {
        api.post('/auth/logout').catch(() => {});
        showToast('warning', 'Cerraste sesión en el panel de cocina.', 'Sesión Finalizada');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsLoggedIn(false);
        setUsername('');
        setPassword('');
        irA('/login');
      }
    });
  };

  const getColumnOrders = (status: string) => {
    return orders
      .filter(o => {
        if (status === 'Pendientes') return o.status === 'Pendiente' || o.status === 'Pagado';
        if (status === 'En Preparación') return o.status === 'En Preparación';
        if (status === 'Listos') return o.status === 'Listos';
        return false;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const batchSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    const activeOrders = orders.filter(o => o.status === 'Pendiente' || o.status === 'Pagado' || o.status === 'En Preparación');
    activeOrders.forEach(order => {
      order.items.forEach(item => {
        if (!summary[item.name]) summary[item.name] = 0;
        summary[item.name] += item.quantity || 1;
      });
    });
    return Object.entries(summary).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  const moveOrder = (orderId: string, currentStatus: string) => {
    if (currentStatus === 'Pendientes') {
      updateOrderStatus(orderId, 'En Preparación');
      showToast('info', `El pedido #${orderId} pasó a preparación.`, 'Pedido en Preparación');
    }
    if (currentStatus === 'En Preparación') {
      updateOrderStatus(orderId, 'Listos');
      showToast('success', `El pedido #${orderId} está listo para despacho.`, 'Pedido Listo');
    }
  };

  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  const printSticker = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) setPreviewOrder(order);
  };

  const handleConfirmPrint = () => {
    if (Math.random() > 0.9) {
      setPrintError('Error de conexión con la impresora. Revise papel y conexión.');
      setTimeout(() => setPrintError(null), 4000);
    } else {
      showToast('cierre', 'Comanda del pedido enviada a impresión.', 'Ticket Impreso');
      window.print();
    }
    setPreviewOrder(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-stone-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#151515] rounded-[32px] p-10 border border-gray-100 dark:border-stone-800 shadow-2xl">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 rounded-[24px] bg-brand-orange flex items-center justify-center shadow-lg shadow-brand-orange/30 mb-6">
              <ChefHat className="w-10 h-10 text-white" />
            </div>
            <h1 className="font-black text-3xl text-gray-900 dark:text-white mb-2">Copiway<span className="text-brand-orange">PRO</span></h1>
            <p className="text-gray-500 dark:text-stone-400 font-medium">Panel de Cocina (KDS)</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2 ml-1">Usuario</label>
              <input 
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full h-16 px-6 rounded-2xl bg-gray-50 dark:bg-stone-900 border-2 border-gray-100 dark:border-stone-800 focus:border-brand-orange dark:focus:border-brand-orange outline-none transition-colors text-lg text-gray-900 dark:text-white font-medium"
                placeholder="Ej: cocina"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2 ml-1">Contraseña</label>
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-16 px-6 rounded-2xl bg-gray-50 dark:bg-stone-900 border-2 border-gray-100 dark:border-stone-800 focus:border-brand-orange dark:focus:border-brand-orange outline-none transition-colors text-lg text-gray-900 dark:text-white font-medium"
                placeholder="••••••••"
              />
            </div>
            
            {loginError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-bold text-center border border-red-100 dark:border-red-900/50">
                {loginError}
              </div>
            )}
            
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => irA('/login')}
                className="flex-1 h-16 bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Salir
              </button>
              <button 
                type="submit"
                className="flex-1 h-16 bg-brand-orange text-white rounded-2xl font-black text-xl hover:bg-brand-orange/90 transition-transform active:scale-95 shadow-xl shadow-brand-orange/20"
              >
                Entrar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-gray-50/50 dark:bg-stone-950 text-gray-900 dark:text-gray-100 font-sans flex transition-colors duration-300 overflow-hidden relative">
      <ToastNotification toast={toastData} onClose={() => setToastData(null)} />
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
      {/* Sidebar - Desktop */}
      <aside className="w-[280px] bg-white dark:bg-[#151515] border-r border-gray-100 dark:border-stone-800 flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[100dvh] sticky top-0 hidden lg:flex">
        <div className="h-24 flex items-center px-8 gap-3 mb-2 shrink-0 border-b border-gray-50 dark:border-stone-800/50 cursor-pointer" onClick={() => irA('/')}>
          <div className="w-9 h-9 rounded-xl bg-brand-orange flex items-center justify-center shadow-lg shadow-brand-orange/20 shrink-0">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-[22px] tracking-tight text-gray-900 dark:text-white leading-none">Copiway<span className="text-brand-orange">PRO</span></h1>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto min-w-0 custom-scrollbar">
          <button className="w-full flex items-center gap-4 px-5 py-4 rounded-full transition-all font-bold text-sm bg-brand-orange text-white shadow-lg shadow-brand-orange/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Pedidos
          </button>
        </nav>

        {/* Sidebar Inventory Alert */}
        <div className="px-4 pb-4">
          <div 
            className="flex flex-col bg-white dark:bg-[#151515] rounded-[16px] border border-gray-100 dark:border-stone-800 shadow-md overflow-hidden cursor-pointer transition-all"
            onClick={() => setShowInventory(!showInventory)}
          >
            <div className="flex flex-col gap-2 bg-red-50 dark:bg-red-900/10 px-4 py-3">
              <div className="flex justify-between items-center w-full">
                <span className="text-[11px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> INVENTARIO CRÍTICO
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition-transform ${showInventory ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
            
            <AnimatePresence>
              {showInventory && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-100 dark:border-stone-800 bg-white dark:bg-[#151515]"
                >
                  <div className="p-2">
                    {inventory.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-stone-900 rounded-xl transition-colors">
                        <span className="text-xs font-medium text-gray-700 dark:text-stone-300 truncate mr-2">{item.name}</span>
                        <span className={`text-xs font-black shrink-0 ${item.stock < 20 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {item.stock}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Batching Summary */}
        <div className="px-4 pb-4">
          <div className="flex flex-col bg-white dark:bg-[#151515] rounded-[16px] border border-gray-100 dark:border-stone-800 shadow-md overflow-hidden">
            <div className="bg-brand-orange/10 px-4 py-3">
              <span className="text-[11px] font-black text-brand-orange uppercase tracking-widest flex items-center gap-1.5">
                <ChefHat className="w-4 h-4" /> RESUMEN DE PREPARACIÓN
              </span>
            </div>
            <div className="p-2 max-h-[30vh] overflow-y-auto custom-scrollbar">
              {batchSummary.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No hay pedidos activos.</p>
              ) : (
                batchSummary.map(([itemName, count], idx) => (
                  <div key={idx} className="flex justify-between items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-stone-900 rounded-xl transition-colors">
                    <span className="text-xs font-medium text-gray-700 dark:text-stone-300 truncate mr-2">{itemName}</span>
                    <span className="text-xs font-black shrink-0 text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                      x{count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-stone-800 mt-auto shrink-0 space-y-4">
          <button onClick={toggleTheme} className="w-full flex items-center gap-4 text-gray-600 dark:text-stone-400 hover:bg-gray-100 dark:hover:bg-stone-800 px-4 py-3 rounded-[16px] transition-colors text-sm font-bold">
            {theme === 'dark' ? <Sun className="w-6 h-6 shrink-0" /> : <Moon className="w-6 h-6 shrink-0" />}
            <span className="leading-tight text-left">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-4 w-full font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 px-4 py-3 rounded-[16px] transition-colors text-sm">
            <LogOut className="w-6 h-6 shrink-0" />
            <span className="leading-tight text-left">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 z-[101] w-[280px] bg-white dark:bg-[#151515] border-r border-gray-100 dark:border-stone-800 flex flex-col lg:hidden shadow-2xl h-[100dvh]"
            >
              <div className="h-24 flex items-center justify-between px-8 mb-2 shrink-0 border-b border-gray-50 dark:border-stone-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-orange flex items-center justify-center shadow-lg shadow-brand-orange/20 shrink-0">
                    <ChefHat className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="font-black text-[22px] tracking-tight text-gray-900 dark:text-white leading-none">Copiway<span className="text-brand-orange">PRO</span></h1>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 rounded-full hover:bg-gray-100 dark:bg-stone-800 flex items-center justify-center text-gray-500">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              
              <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar min-w-0">
                <button className="w-full flex items-center gap-4 px-5 py-4 rounded-full bg-brand-orange text-white font-bold text-sm">
                  <Utensils className="w-5 h-5" />
                  Pedidos
                </button>
              </nav>

              <div className="p-6 border-t border-gray-100 dark:border-stone-800 mt-auto space-y-4">
                <button onClick={toggleTheme} className="w-full flex items-center gap-4 text-gray-600 dark:text-stone-400 hover:bg-gray-100 dark:hover:bg-stone-800 px-4 py-3 rounded-[16px] transition-colors text-sm font-bold">
                  {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                  <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
                </button>
                <button onClick={handleLogout} className="flex items-center gap-4 w-full font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 px-4 py-3 rounded-[16px] transition-colors text-sm">
                  <LogOut className="w-6 h-6" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative min-w-0">
        

        
        {/* Top Status Header */}
        <header className="shrink-0 bg-white dark:bg-[#151515] border-b border-gray-100 dark:border-stone-800 h-[70px] md:h-24 flex items-center justify-between px-4 md:px-8 z-10 sticky top-0 shadow-sm transition-colors">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl bg-gray-100 dark:bg-stone-800 flex items-center justify-center text-gray-500 hover:text-brand-orange transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden xs:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-3 md:px-5 py-2 md:py-2.5 rounded-full border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <span className="font-bold text-[10px] md:text-xs uppercase tracking-wider">Sistema en Línea</span>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 dark:bg-stone-900 text-gray-600 dark:text-gray-300 px-5 py-2.5 rounded-full border border-gray-200 dark:border-stone-700 shadow-sm">
              <RefreshCw className="w-3.5 h-3.5 text-brand-orange" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Tiempo prom: <strong className="text-gray-900 dark:text-white ml-1">8.5 min</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={handleToggleSound}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-2xl font-bold text-[10px] md:text-xs transition-colors border shadow-xs ${
                soundEnabled 
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 hover:bg-amber-100'
                  : 'bg-gray-100 dark:bg-stone-800 text-gray-500 dark:text-stone-400 border-gray-200 dark:border-stone-700'
              }`}
              title={soundEnabled ? 'Silenciar alertas sonoras' : 'Activar timbre sonoro de cocina'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-500 animate-pulse" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
              <span className="hidden md:inline">{soundEnabled ? 'Sonido Activo' : 'Silenciado'}</span>
            </button>

            <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 md:px-6 py-2 md:py-2.5 rounded-2xl shadow-lg shadow-gray-900/20 dark:shadow-white/10">
              <span className="font-black text-sm md:text-lg tracking-widest font-mono">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </header>

        {/* Banner flotante de Alerta Sonora / Visual (RF-27 / RF-36) */}
        <AnimatePresence>
          {showNewOrderAlert && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-20 md:top-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-brand-orange text-white px-4 md:px-6 py-2.5 md:py-3.5 rounded-2xl shadow-2xl border border-white/20 w-[90%] max-w-sm"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/20 flex items-center justify-center animate-bounce shrink-0">
                <Bell className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-[10px] md:text-sm uppercase tracking-wide truncate">¡NUEVA COMANDA EN COCINA!</p>
                <p className="text-[10px] md:text-xs text-white/90 font-medium truncate">{newOrderAlertText}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Kanban Board */}
        <main className="flex-1 overflow-x-auto lg:overflow-x-hidden overflow-y-hidden p-4 sm:p-6 lg:p-10 bg-gray-50/50 dark:bg-stone-950 snap-x lg:snap-none snap-mandatory min-w-0 custom-scrollbar">
          <div className="flex gap-4 sm:gap-6 h-full min-w-max lg:min-w-0 lg:grid lg:grid-cols-3">
            
            {/* Columna: Pendientes */}
            <div className="w-[85vw] sm:w-[320px] md:w-[380px] lg:w-auto shrink-0 lg:shrink snap-center h-full flex flex-col bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm overflow-hidden">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-[16px] flex items-center gap-3 text-gray-900 dark:text-stone-100">
                    Pendientes
                    <span className="bg-brand-orange text-white w-7 h-7 flex items-center justify-center rounded-full text-[14px] font-bold">{getColumnOrders('Pendientes').length}</span>
                  </h2>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4 min-w-0">
                <AnimatePresence>
                  {getColumnOrders('Pendientes').map(order => (
                    <OrderCard key={order.id} order={order} onMove={() => moveOrder(order.id, 'Pendientes')} onPrint={() => printSticker(order.id)} />
                  ))}
                </AnimatePresence>
                {getColumnOrders('Pendientes').length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-brand-orange/30"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    <p className="font-medium">Sin pedidos pendientes</p>
                  </div>
                )}
              </div>
            </div>

            {/* Columna: En Preparación */}
            <div className="w-[85vw] sm:w-[320px] md:w-[380px] lg:w-auto shrink-0 lg:shrink snap-center h-full flex flex-col bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm overflow-hidden">
              <div className="p-6 pb-4 bg-brand-orange dark:bg-brand-orange/90">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-[16px] flex items-center gap-3 text-white">
                    En Preparación
                    <span className="bg-white/20 text-white w-7 h-7 flex items-center justify-center rounded-full text-[14px] font-bold">{getColumnOrders('En Preparación').length}</span>
                  </h2>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80"><path d="M7 2v4"></path><path d="M12 2v4"></path><path d="M17 2v4"></path><rect x="3" y="10" width="18" height="8" rx="2"></rect><path d="M7 18v4"></path><path d="M17 18v4"></path></svg>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-6 pt-5 space-y-4 min-w-0">
                <AnimatePresence>
                  {getColumnOrders('En Preparación').map(order => (
                    <OrderCard key={order.id} order={order} onMove={() => moveOrder(order.id, 'En Preparación')} onPrint={() => printSticker(order.id)} />
                  ))}
                </AnimatePresence>
                
                {getColumnOrders('En Preparación').length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-brand-orange/30"><path d="M7 2v4"></path><path d="M12 2v4"></path><path d="M17 2v4"></path><rect x="3" y="10" width="18" height="8" rx="2"></rect><path d="M7 18v4"></path><path d="M17 18v4"></path></svg>
                    <p className="font-medium">Sin pedidos en curso</p>
                  </div>
                )}
              </div>
            </div>

            {/* Columna: Listos */}
            <div className="w-[85vw] sm:w-[320px] md:w-[380px] lg:w-auto shrink-0 lg:shrink snap-center h-full flex flex-col bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm overflow-hidden">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-[16px] flex items-center gap-3 text-brand-orange dark:text-brand-orange">
                    Listos
                    <span className="bg-brand-orange/10 text-brand-orange w-7 h-7 flex items-center justify-center rounded-full text-[14px] font-bold">{getColumnOrders('Listos').length}</span>
                  </h2>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-orange/50"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4 min-w-0">
                <AnimatePresence>
                  {getColumnOrders('Listos').map(order => (
                    <OrderCard key={order.id} order={order} onMove={() => moveOrder(order.id, 'Listos')} onPrint={() => printSticker(order.id)} isReady />
                  ))}
                </AnimatePresence>
                
                {getColumnOrders('Listos').length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-brand-orange/30"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <p className="font-medium">Sin pedidos listos</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>
        
        
      </div>

      {/* Pop-up de error de impresora (HU-32.2) */}
      <AnimatePresence>
        {printError && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-red-600 text-white shadow-2xl p-4 pr-6 rounded-[20px]"
          >
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-lg">Error de Hardware</p>
              <p className="text-sm font-medium text-white/90">{printError}</p>
            </div>
          </motion.div>
        )}
        
        {previewOrder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#151515] rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center bg-gray-50/50 dark:bg-stone-900/50">
                <h2 className="font-bold text-gray-900 dark:text-white">Vista Previa - Factura</h2>
                <button onClick={() => setPreviewOrder(null)} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors bg-white dark:bg-stone-800 rounded-full shadow-sm border border-gray-200 dark:border-stone-700">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="p-6 font-mono text-[13px] leading-tight space-y-4 max-h-[70vh] overflow-y-auto bg-[#fafafa] dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 shadow-inner">
                {/* Receipt Header */}
                <div className="text-center space-y-1 mb-4 flex flex-col items-center">
                  <div className="w-14 h-14 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-gray-900 mb-2">
                     <Utensils className="w-7 h-7" />
                  </div>
                  <h3 className="font-black text-xl tracking-widest uppercase">COPIWAY PRO</h3>
                  <p className="text-xs">NIT: 900.123.456-7</p>
                  <p className="text-xs">Cra 43 # 79-115, Barranquilla</p>
                  <p className="text-xs">Tel: (300) 123-4567</p>
                  <p className="text-xs font-bold mt-2">DOCUMENTO EQUIVALENTE POS</p>
                </div>

                <div className="border-t border-dashed border-gray-400 py-3 space-y-1">
                  <div className="flex justify-between">
                    <span>TICKET: <span className="font-bold">#{previewOrder.id}</span></span>
                    <span>{new Date(previewOrder.date || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CAJA: WEB APP</span>
                    <span>{new Date(previewOrder.date || Date.now()).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Customer Data */}
                <div className="border-t border-dashed border-gray-400 py-3 space-y-1">
                  <p><span className="font-bold">CLIENTE:</span> {previewOrder.client || 'Cliente Local'}</p>
                  {previewOrder.clientPhone && <p><span className="font-bold">TELÉFONO:</span> {previewOrder.clientPhone}</p>}
                  <p><span className="font-bold">DIRECCIÓN:</span> {previewOrder.address || 'Recogida en local'}</p>
                  {previewOrder.paymentMethod && <p><span className="font-bold">MÉTODO DE PAGO:</span> <span className="uppercase">{previewOrder.paymentMethod}</span></p>}
                </div>

                {/* Items */}
                <div className="border-t border-dashed border-gray-400 py-3 space-y-3">
                  <div className="flex justify-between font-bold text-xs pb-1 border-b border-gray-200 dark:border-stone-700">
                    <span className="w-8">CANT</span>
                    <span className="flex-1">DESCRIPCIÓN</span>
                    <span className="text-right">TOTAL</span>
                  </div>
                  {previewOrder.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <span className="w-8 font-bold">{item.quantity || 1}</span>
                        <span className="flex-1 font-bold uppercase pr-2">{item.name}</span>
                        <span className="text-right">${((item.finalPrice || item.price || 0) * (item.quantity || 1)).toLocaleString('es-CO')}</span>
                      </div>
                      {item.removed && item.removed.length > 0 && (
                        <div className="pl-8 text-xs text-red-600 dark:text-red-400 font-medium">
                          - SIN: {item.removed.map(r => r.name).join(', ')}
                        </div>
                      )}
                      {item.extras && item.extras.length > 0 && (
                        <div className="pl-8 text-xs text-green-700 dark:text-green-400 font-medium">
                          + EXTRAS: {item.extras.map(e => e.name).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Totals */}
                <div className="border-t border-dashed border-gray-400 py-3 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span>SUBTOTAL</span>
                    <span>${(previewOrder.subtotal || previewOrder.items.reduce((acc, item) => acc + (item.finalPrice || item.price || 0) * (item.quantity || 1), 0)).toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>TARIFA DE ENVÍO</span>
                    <span>${(previewOrder.shipping || (previewOrder.total - (previewOrder.subtotal || previewOrder.items.reduce((acc, item) => acc + (item.finalPrice || item.price || 0) * (item.quantity || 1), 0))) || 0).toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between items-center font-black text-base pt-2 mt-1 border-t border-gray-300 dark:border-stone-700">
                    <span>TOTAL A PAGAR</span>
                    <span>${(previewOrder.total || 0).toLocaleString('es-CO')}</span>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="border-t border-dashed border-gray-400 pt-4 pb-2 text-center text-xs space-y-2">
                  <p className="font-bold">¡GRACIAS POR SU PREFERENCIA!</p>
                  <p>Síguenos en IG: @copiway_pro</p>
                  <p>www.copiway.com</p>
                  
                  {/* Barcode Simulation */}
                  <div className="flex justify-center items-center h-10 mt-4 opacity-70">
                    <div className="w-1 h-full bg-current mx-[1px]"></div>
                    <div className="w-2 h-full bg-current mx-[1px]"></div>
                    <div className="w-1 h-full bg-current mx-[1px]"></div>
                    <div className="w-0.5 h-full bg-current mx-[1px]"></div>
                    <div className="w-3 h-full bg-current mx-[1px]"></div>
                    <div className="w-1 h-full bg-current mx-[1px]"></div>
                    <div className="w-2 h-full bg-current mx-[1px]"></div>
                    <div className="w-0.5 h-full bg-current mx-[1px]"></div>
                    <div className="w-2 h-full bg-current mx-[1px]"></div>
                    <div className="w-1 h-full bg-current mx-[1px]"></div>
                    <div className="w-1 h-full bg-current mx-[1px]"></div>
                    <div className="w-3 h-full bg-current mx-[1px]"></div>
                  </div>
                  <p className="text-[10px] tracking-[0.3em] mt-1 font-mono">{previewOrder.id}</p>
                </div>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-stone-900/50 border-t border-gray-100 dark:border-stone-800 flex gap-4">
                <button onClick={() => setPreviewOrder(null)} className="flex-1 py-3.5 rounded-[16px] font-bold text-gray-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 hover:bg-gray-50 dark:hover:bg-stone-700 transition-colors min-w-0">
                  Cancelar
                </button>
                <button onClick={handleConfirmPrint} className="flex-1 py-3.5 rounded-[16px] font-bold text-white bg-brand-orange hover:bg-brand-orange/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20 min-w-0">
                  <Printer className="w-5 h-5" /> Imprimir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Componente de Tarjeta de Orden
function OrderCard({ order, onMove, onPrint, isReady = false }: { order: Order, onMove: () => void, onPrint: () => void, isReady?: boolean }) {
  const isNew = order.status === 'Pendiente' && (Date.now() - new Date(order.date).getTime()) < 60000;
  
  const diffMinutes = Math.floor((Date.now() - new Date(order.date).getTime()) / 60000);
  const getRelativeTime = () => {
    if (diffMinutes < 1) return 'Hace instantes';
    return `Hace ${diffMinutes} min`;
  };

  const isSlaBreached = order.status === 'En Preparación' && diffMinutes >= 15;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
      className={`bg-white dark:bg-[#151515] rounded-[32px] p-6 shadow-sm flex flex-col relative overflow-hidden group transition-shadow ${isNew ? 'border-2 border-brand-orange shadow-brand-orange/20' : isSlaBreached ? 'border-2 border-red-500 bg-red-50 dark:bg-red-950/20 shadow-red-500/30 animate-pulse' : 'border border-gray-100 dark:border-stone-800'}`}
    >
      {isNew && (
        <span className="absolute top-0 right-0 bg-brand-orange text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">Nuevo</span>
      )}
      
      <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
        <div className="min-w-0">
          <h3 className={`font-bold text-[18px] leading-none whitespace-nowrap shrink-0 ${isSlaBreached ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{order.id}</h3>
          <p className={`text-[13px] font-medium mt-1.5 flex items-center gap-1.5 whitespace-nowrap ${isSlaBreached ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-500'}`}>
            <svg className={isSlaBreached ? 'animate-bounce shrink-0' : 'shrink-0'} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span className="truncate">{getRelativeTime()}</span>
          </p>
        </div>
        <div className="text-right shrink-0 max-w-[120px] sm:max-w-full">
          <p className="text-[12px] sm:text-sm font-bold text-gray-700 dark:text-stone-300 bg-gray-100 dark:bg-stone-800 px-3 py-1 rounded-full truncate whitespace-nowrap">{order.client || 'Cliente Local'}</p>
        </div>
      </div>

      <div className="flex-1 mb-6 min-w-0">
        <ul className="space-y-3">
          {order.items.map((item, idx) => (
            <li key={idx}>
              <div className="bg-gray-50 dark:bg-stone-800/30 rounded-2xl p-4 flex items-start gap-4 border border-gray-100 dark:border-stone-800/50">
                <span className="font-black text-brand-orange text-lg shrink-0 mt-0.5 whitespace-nowrap">{item.quantity}x</span>
                <div>
                  <span className="font-bold text-gray-900 dark:text-white text-[16px] leading-tight block mb-1">{item.name}</span>
                  
                  {/* HU-30: Alertas visuales (SIN/EXTRA) */}
                  {item.modifications && item.modifications.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {item.modifications.map((mod: string, mIdx: number) => {
                        const isSin = mod.toUpperCase().includes('SIN');
                        const isExtra = mod.toUpperCase().includes('EXTRA');
                        const textColor = isSin ? 'text-red-600 dark:text-red-400 font-bold' : isExtra ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-600 dark:text-gray-400 font-medium';
                        return (
                          <li key={mIdx} className={`text-[13px] italic flex items-center gap-1.5 ${textColor}`}>
                            {isSin && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>}
                            {isExtra && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>}
                            {!isSin && !isExtra && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50"></span>}
                            {mod}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {!isReady && (
        <div className="mt-auto">
          {(order.status === 'Pendiente' || order.status === 'Pagado') && (
            <button 
              onClick={onMove}
              className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-transform active:scale-95 bg-brand-orange text-white hover:bg-brand-orange/90 shadow-xl shadow-brand-orange/20"
            >
              Preparar
            </button>
          )}
          
          {order.status === 'En Preparación' && (
            <div className="flex gap-3">
              <button 
                onClick={onPrint}
                className="w-16 py-4 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors"
                title="Imprimir Tirilla"
              >
                <Printer className="w-6 h-6" />
              </button>
              <button 
                onClick={onMove}
                className="flex-1 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-transform active:scale-95 bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 min-w-0"
              >
                <CheckCircle2 className="w-6 h-6" />
                Marcar Listo
              </button>
            </div>
          )}
        </div>
      )}
      
      {isReady && (
        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-stone-800 text-center">
          <p className="font-bold text-gray-500 dark:text-stone-400 flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Esperando domiciliario
          </p>
        </div>
      )}
    </motion.div>
  );
}
