import React, { useState, useEffect, useMemo } from 'react';
import { CalendarModal } from "../components/CalendarModal";
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, Settings, ShoppingBag, Calendar, 
  Sun, Moon, Utensils, LayoutGrid, RotateCcw, 
  ShoppingCart, Gift, AlertCircle, CheckCircle2, Trash2, X,
  ChefHat, Minus, Plus, MessageCircle, Star, Smartphone, Layers, CreditCard, Banknote,
  Flame, Sparkles, Award, Search, MapPin, Truck, FileText, Wallet, Bell
} from 'lucide-react';

import { formatCOP } from '../lib/format';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { useStore, Product, ProductComponent, Order } from '../store/almacenAplicacion';
import { api, ApiError, irA } from '../servicios/api';
import { ToastNotification, ToastData } from '../components/ToastNotification';
import { ConfirmDialog } from '../components/ConfirmDialog';
import CatalogSection from './client/CatalogSection';
import BuilderSection from './client/BuilderSection';
import CartSection from './client/CartSection';
import CheckoutSection from './client/CheckoutSection';
import ActiveOrdersSection from './client/ActiveOrdersSection';
import HistorySection from './client/HistorySection';
import ProfileSection from './client/ProfileSection';

export interface SyncedIngredient {
  id: string;
  name: string;
  rawCost: number;
  price: number;
  category: string;
  stock: number;
  unit: string;
}

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
}

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'promo' | 'system' | 'order';
}

export interface UserProfileState {
  name: string;
  email: string;
  phone: string;
  birthday: string;
  points: number;
  address: string;
  notifications: UserNotification[];
}

export interface CartItem {
  id: string;
  isCustom?: boolean;
  product?: Product;
  name?: string;
  basePrice?: number;
  price?: number;
  finalPrice?: number;
  quantity?: number;
  image?: string;
  removed?: ProductComponent[];
  extras?: SyncedIngredient[];
  stack?: SyncedIngredient[];
}

export default function ClientDashboard() {
  const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('catalog');
  const [showDeliveryNotification, setShowDeliveryNotification] = useState<string | null>(null);
  const [selectedOrderInfo, setSelectedOrderInfo] = useState<Order | null>(null);
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewHoverRating, setReviewHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'unrated' | 'rated'>('all');
  const [viewingReceiptOrder, setViewingReceiptOrder] = useState<Order | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Perfil del Usuario
  const [userProfile, setUserProfile] = useState<UserProfileState>({
    name: 'Andrés Escorcia',
    email: 'andres@example.com',
    phone: '3001234567',
    birthday: '1995-10-15',
    points: 150,
    address: 'Calle 10 # 5-20, Centro',
    notifications: [
      {
        id: 'n1',
        title: '¡Feliz Cumpleaños! 🎂',
        message: 'Como regalo de cumpleaños, tienes un 15% de descuento automático en tu carrito válido por hoy.',
        date: new Date().toISOString(),
        read: false,
        type: 'promo'
      },
      {
        id: 'n2',
        title: 'Puntos Acumulados 🌟',
        message: 'Has ganado 150 puntos por tu última compra. ¡Sigue así!',
        date: new Date(Date.now() - 86400000).toISOString(),
        read: false,
        type: 'system'
      }
    ]
  });
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState('Todas');

  // Datos Simulados & Sincronización en Tiempo Real
  const { products, ingredients, inventory, orders, addOrder, updateOrderStatus, storeConfig, updateStoreConfig, updateOrder, clients, updateClient } = useStore();
  const catalog = products.filter(p => p.active);
  
  const orderHistory = orders.filter(o => o.status === 'Entregado' || o.status === 'entregado');
  const activeOrders = orders.filter(o => o.status !== 'Entregado' && o.status !== 'entregado' && o.status !== 'Pagado');
  const [toastMessage, setToastMessage] = useState<ToastData | null>(null);

  // Reloj en vivo para actualizar automáticamente el estado del local cada 15 segundos
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);
  
  // HU-11: Alternador para simular negocio abierto/cerrado basado en horario en tiempo real
  const checkIsStoreOpen = () => {
    if (storeConfig.isOpen === false) return false; // Manual override del administrador
    
    const now = currentTime;
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    const [openHours, openMinutes] = (storeConfig.openTime || '11:00').split(':').map(Number);
    const openTotalMinutes = openHours * 60 + openMinutes;

    const [closeHours, closeMinutes] = (storeConfig.closeTime || '23:00').split(':').map(Number);
    const closeTotalMinutes = closeHours * 60 + closeMinutes;

    if (closeTotalMinutes < openTotalMinutes) {
      // Abre en la noche y cierra en la madrugada (ej: 18:00 a 02:00)
      return currentTotalMinutes >= openTotalMinutes || currentTotalMinutes <= closeTotalMinutes;
    } else {
      return currentTotalMinutes >= openTotalMinutes && currentTotalMinutes <= closeTotalMinutes;
    }
  };
  
  const isStoreOpen = checkIsStoreOpen();

  // Margen de Ganancia configurado por el Administrador (porcentaje ej. 30%)
  const profitMargin = storeConfig?.profitMargin !== undefined ? storeConfig.profitMargin : 30;

  // Sincronización automática de ingredientes con el Inventario y cálculo de PVP transparente por insumo
  const syncedIngredients = useMemo(() => {
    const defaultIngredientMap: Record<string, { baseCost: number; category: string }> = {
      'Pan de Hamburguesa': { baseCost: 1500, category: 'base' },
      'Pan de Perro': { baseCost: 1200, category: 'base' },
      'Patacón': { baseCost: 2000, category: 'base' },
      'Carne 120g': { baseCost: 4000, category: 'extra' },
      'Salchicha': { baseCost: 2500, category: 'extra' },
      'Tocineta': { baseCost: 3500, category: 'extra' },
      'Queso Cheddar': { baseCost: 2500, category: 'extra' },
      'Lechuga': { baseCost: 800, category: 'vegetal' },
      'Tomate': { baseCost: 800, category: 'vegetal' },
      'Cebolla': { baseCost: 800, category: 'vegetal' }
    };

    const combined: SyncedIngredient[] = [];
    const seenNames = new Set<string>();

    const sourceList = ingredients.length > 0 ? ingredients : Object.entries(defaultIngredientMap).map(([name, val], idx) => ({
      id: `ing-${idx}`,
      name,
      price: val.baseCost,
      category: val.category,
      stock: 50
    }));

    sourceList.forEach(ing => {
      const normName = (ing.name || '').trim().toLowerCase();
      const invMatch = inventory.find(inv => 
        inv.id === ing.id || 
        (inv.name || '').trim().toLowerCase() === normName ||
        (inv.name || '').toLowerCase().includes(normName) ||
        normName.includes((inv.name || '').toLowerCase())
      );

      const actualStock = invMatch !== undefined ? invMatch.stock : (ing.stock !== undefined ? ing.stock : 50);
      const baseCost = invMatch?.unitCost || ing.price || defaultIngredientMap[ing.name]?.baseCost || 1500;
      
      // Aplicar el porcentaje de ganancia directamente al PVP de cada insumo individual
      const pvpPrice = Math.round((baseCost * (1 + profitMargin / 100)) / 100) * 100;

      seenNames.add(normName);
      combined.push({
        id: ing.id || (invMatch ? invMatch.id : normName),
        name: ing.name,
        rawCost: baseCost,
        price: pvpPrice,
        category: ing.category || (invMatch?.category ? invMatch.category.toLowerCase() : 'extra'),
        stock: actualStock,
        unit: invMatch?.unit || 'Und'
      });
    });

    // Añadir cualquier insumo creado en el módulo de Inventario que no estuviese en la lista base
    inventory.forEach(inv => {
      const normName = (inv.name || '').trim().toLowerCase();
      if (!seenNames.has(normName)) {
        seenNames.add(normName);
        const baseCost = inv.unitCost || 2000;
        const pvpPrice = Math.round((baseCost * (1 + profitMargin / 100)) / 100) * 100;
        
        let cat = 'extra';
        if (normName.includes('pan') || normName.includes('patac')) cat = 'base';
        else if (normName.includes('lechuga') || normName.includes('tomate') || normName.includes('cebolla') || normName.includes('pepinillo')) cat = 'vegetal';

        combined.push({
          id: inv.id,
          name: inv.name,
          rawCost: baseCost,
          price: pvpPrice,
          category: cat,
          stock: inv.stock,
          unit: inv.unit || 'Und'
        });
      }
    });

    return combined;
  }, [ingredients, inventory, profitMargin]);
  
  // Estado del Creador Interactivo
  const [builderStack, setBuilderStack] = useState<SyncedIngredient[]>([]);
  
  // Estado del Carrito (HU-15 Persistencia)
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('olio_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const currentUserId = localStorage.getItem('copiway_auth_user_id');
  const isInitialMount = React.useRef(true);

  useEffect(() => {
    if (currentUserId && currentUserId !== 'guest' && clients.length > 0) {
      const client = clients.find(c => c.id === currentUserId);
      if (client) {
        setUserProfile(prev => ({
          ...prev,
          name: client.name || prev.name,
          email: client.email || prev.email,
          phone: client.phone || prev.phone,
          address: client.address || prev.address,
          birthday: client.birthday || prev.birthday,
          points: client.points || prev.points,
          notifications: client.notifications || prev.notifications
        }));
        if (client.cart) setCart(client.cart as CartItem[]);
      }
    }
  }, [currentUserId, clients.length]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (currentUserId && currentUserId !== 'guest') {
       updateClient(currentUserId, {
         name: userProfile.name,
         email: userProfile.email,
         phone: userProfile.phone,
         birthday: userProfile.birthday,
         address: userProfile.address,
         cart: cart
       });
    } else {
       localStorage.setItem('olio_cart', JSON.stringify(cart));
    }
  }, [cart, userProfile.name, userProfile.email, userProfile.phone, userProfile.birthday, userProfile.address]);

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle'|'processing'|'success'|'error'>('idle');
  const [simulationStep, setSimulationStep] = useState<string>('');

  const showToast = (type: ToastData['type'] = 'cart', message: string, title?: string) => {
    setToastMessage({ type, message, title });
  };

  // Estado del Modal de Personalización (HU-08)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customRemoved, setCustomRemoved] = useState<ProductComponent[]>([]);
  const [customExtras, setCustomExtras] = useState<SyncedIngredient[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');
  const [digitalBank, setDigitalBank] = useState<'nequi' | 'daviplata' | 'bancolombia'>('nequi');
  const [paymentPhone, setPaymentPhone] = useState('');

  // Tarifa plana de envío (HU-10)
  const FLAT_SHIPPING_RATE = storeConfig.shippingRate;

  const handleLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas salir de tu cuenta en Hamburguer Copiway?',
      confirmText: 'Sí, cerrar sesión',
      cancelText: 'Permanecer',
      type: 'info',
      onConfirm: () => {
        api.post('/auth/logout').catch(() => {});
        showToast('warning', 'Cerraste sesión de tu cuenta.', 'Sesión Finalizada');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        // HU-15: Limpieza de seguridad al cerrar sesión
        localStorage.removeItem('olio_cart');
        irA('/login');
      }
    });
  };

  // -- Utilidades Financieras y de Cumpleaños --
  const getTodayMD = () => {
    const d = new Date();
    return `${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  // HU-04: Descuento de cumpleaños
  const isBirthday = userProfile.birthday && userProfile.birthday.slice(5, 10) === getTodayMD();

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.finalPrice * (item.quantity || 1)), 0);
  const birthdayDiscount = isBirthday ? cartSubtotal * 0.15 : 0; // 15% de descuento
  const cartTotal = cartSubtotal - birthdayDiscount + (cart.length > 0 ? FLAT_SHIPPING_RATE : 0);

  // -- Manejadores --
  const openCustomizer = (product: Product) => {
    setSelectedProduct(product);
    setCustomRemoved([]);
    setCustomExtras([]);
  };

  const addToCartFromCatalog = () => {
    if (!selectedProduct) return;
    const finalPrice = selectedProduct.price + customExtras.reduce((s, e) => s + (e.price || 2000), 0);
    
    if (editingCartItemId) {
      setCart(cart.map(c => c.id === editingCartItemId ? {
        ...c,
        product: selectedProduct,
        name: selectedProduct.name,
        basePrice: selectedProduct.price,
        finalPrice,
        removed: customRemoved,
        extras: customExtras
      } : c));
      setEditingCartItemId(null);
    } else {
      const newItem = {
        id: Math.random().toString(36).substr(2, 9),
        isCustom: false,
        product: selectedProduct,
        name: selectedProduct.name,
        basePrice: selectedProduct.price,
        finalPrice,
        quantity: 1,
        removed: customRemoved,
        extras: customExtras
      };
      setCart([...cart, newItem]);
    }
    
    setSelectedProduct(null);
    setCustomRemoved([]);
    setCustomExtras([]);
    showToast('cart', editingCartItemId ? `${selectedProduct.name} actualizado en el carrito` : `${selectedProduct.name} añadido al carrito`, 'Carrito Copiway');
  };

  // HU-09: Modificar carrito antes de procesar cobro (Punto de no retorno)
  const handleCheckoutSubmit = () => {
    if (paymentMethod === 'online' && !paymentPhone) {
      showToast('warning', 'Ingresa un número de cuenta o celular para procesar el pago digital.', 'Datos Incompletos');
      return;
    }
    
    if (!isStoreOpen) {
      showToast('danger', 'El local se encuentra cerrado en este momento. Transacción pausada.', 'Horario de Atención');
      setIsCheckingOut(false);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: paymentMethod === 'online' ? 'Confirmar Pago y Envío a Cocina' : 'Confirmar Pedido en Efectivo',
      message: `¿Confirmar tu pedido por ${formatCOP(cartTotal)}? Al confirmarse, pasará directamente a preparación en cocina y entrará en el punto de no retorno (no se admiten cancelaciones ni modificaciones).`,
      confirmText: paymentMethod === 'online' ? 'Sí, pagar y enviar' : 'Sí, confirmar pedido',
      cancelText: 'Revisar pedido',
      type: 'warning',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        processPayment();
      }
    });
  };

  const processPayment = () => {
    setPaymentStatus('processing');
    
    if (paymentMethod === 'online') {
      setSimulationStep('Conectando con ' + (digitalBank === 'nequi' ? 'Nequi' : digitalBank === 'daviplata' ? 'Daviplata' : 'Bancolombia') + '...');
      setTimeout(() => {
        setSimulationStep('Esperando aprobación en tu celular...');
        setTimeout(() => {
          completePayment();
        }, 3000);
      }, 2000);
    } else {
      setTimeout(() => {
        completePayment();
      }, 1000);
    }
  };

  const completePayment = () => {
    if (Math.random() > 0.2 || paymentMethod === 'cash') {
      setSimulationStep(paymentMethod === 'online' ? '¡Pago aprobado exitosamente!' : '¡Pedido confirmado!');
      setTimeout(async () => {
        // HU-04: Acumulación de puntos
        const pointsEarned = Math.floor(cartTotal);

        const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();
        const newOrder = {
          id: '#ORD-' + Math.floor(1000 + Math.random() * 9000),
          client: userProfile.name,
          date: new Date().toISOString(),
          items: [...cart],
          subtotal: cartSubtotal,
          discount: birthdayDiscount,
          shipping: FLAT_SHIPPING_RATE,
          total: cartTotal,
          pointsEarned,
          status: 'Pendiente' as const, // Global Store status
          paymentMethod: paymentMethod,
          paymentStatus: paymentMethod === 'online' ? 'Pagado' : 'Pendiente Efectivo',
          address: userProfile.address || 'Dirección Cliente Predeterminada',
          clientPhone: userProfile.phone,
          deliveryPin
        };

        try {
          await addOrder(newOrder as unknown as Order);
        } catch (err) {
          // El servidor rechazó el pedido (tienda cerrada, sin stock, pago no
          // confirmado, etc.) — se muestra el motivo real en vez de fingir éxito.
          const message = err instanceof ApiError ? err.message : 'No se pudo procesar tu pedido. Intenta de nuevo.';
          setPaymentStatus('error');
          setSimulationStep(message);
          showToast('danger', message, 'Pedido no procesado');
          setTimeout(() => setPaymentStatus('idle'), 2500);
          return;
        }

        setPaymentStatus('success');
        setUserProfile(prev => ({ ...prev, points: prev.points + pointsEarned }));
        showToast('success', '¡Pedido confirmado! Tu orden ha sido enviada a cocina.', 'Copiway - Pedido Recibido');

        // Bloqueo y envío a cocina
        setTimeout(() => {
          setCart([]);
          setIsCheckingOut(false);
          setPaymentStatus('idle');
          setSimulationStep('');
          setActiveTab('activeOrders');
        }, 2000);
      }, 1000);
    } else {
      // Pago rechazado, se mantiene editable
      setSimulationStep('El pago fue rechazado. Intenta de nuevo.');
      setPaymentStatus('error');
      showToast('danger', 'El pago fue rechazado por el banco. Intenta de nuevo.', 'Pago no procesado');
      setTimeout(() => {
        setPaymentStatus('idle');
        setSimulationStep('');
      }, 3000);
    }
  };

  // RF-08: Recompra en 1 clic con comprobación exhaustiva de stock
  const reorder = (order: Order) => {
    if (!order || !order.items || order.items.length === 0) {
      showToast('warning', 'No se encontraron artículos en la orden previa.', 'Recompra');
      return;
    }

    const unavailableItems: string[] = [];

    // Verificar cada ítem del pedido contra catálogo e inventario
    for (const item of order.items) {
      if (item.isCustom) {
        // Validar ingredientes y extras de la hamburguesa personalizada
        const stackItems = item.stack || item.extras || [];
        for (const ing of stackItems) {
          const invMatch = inventory.find(i => 
            i.id === ing.id || 
            (i.name && ing.name && i.name.trim().toLowerCase() === ing.name.trim().toLowerCase())
          );
          if (invMatch && invMatch.stock <= 0) {
            unavailableItems.push(ing.name || 'Ingrediente personalizado');
          }
        }
      } else {
        // Validar si el producto de catálogo existe y está activo
        const catProduct = catalog.find(p => p.id === item.id || p.name.toLowerCase() === item.name.toLowerCase());
        if (!catProduct || catProduct.active === false) {
          unavailableItems.push(item.name || 'Producto del menú');
        } else if (catProduct.ingredients && catProduct.ingredients.length > 0) {
          // Validar insumos base de la receta no excluidos
          const removedNames = (item.removed || []).map((r) => ((r.name || r) as string).toLowerCase());
          for (const baseIng of catProduct.ingredients) {
            const ingName = (typeof baseIng === 'string' ? baseIng : baseIng.name || '').toLowerCase();
            if (!removedNames.includes(ingName)) {
              const invMatch = inventory.find(i => (i.name || '').toLowerCase() === ingName);
              if (invMatch && invMatch.stock <= 0) {
                unavailableItems.push(`${catProduct.name} (${invMatch.name} agotado)`);
              }
            }
          }
        }
      }
    }

    if (unavailableItems.length > 0) {
      showToast(
        'warning', 
        `No se puede duplicar el pedido: ${unavailableItems.slice(0, 2).join(', ')} ${unavailableItems.length > 2 ? `y ${unavailableItems.length - 2} más ` : ''}se encuentran actualmente agotados.`, 
        'Stock No Disponible'
      );
      return;
    }
    
    setConfirmModal({
      isOpen: true,
      title: 'Repetir Pedido Anterior',
      message: `¿Deseas duplicar los ${order.items.length} artículos del pedido ${order.id} y añadirlos a tu carrito actual?`,
      confirmText: 'Sí, agregar al carrito',
      cancelText: 'Cancelar',
      type: 'info',
      onConfirm: () => {
        // Clonación de la orden histórica al carrito actual con precios actualizados
        const clonedItems = order.items.map((i) => ({
          ...i,
          id: Math.random().toString(36).substr(2, 9),
          finalPrice: Number(i.finalPrice) || Number(i.price) || Number(i.basePrice) || 0
        }));
        setCart([...cart, ...clonedItems] as CartItem[]);
        showToast('cart', '¡Pedido duplicado y listo en tu carrito!', 'Recompra en 1-Clic');
        setActiveTab('cart');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // HU-14: Calificar orden
  
  // Escuchar si un pedido acaba de ser entregado
  useEffect(() => {
    const recentDelivered = orders.find(o => 
      (o.clientPhone === userProfile.phone || o.client === userProfile.name) && 
      (o.status === 'Entregado' || o.status === 'entregado') && 
      !o.rating
    );
    if (recentDelivered && !sessionStorage.getItem('notified_' + recentDelivered.id)) {
      setShowDeliveryNotification(recentDelivered.id);
      sessionStorage.setItem('notified_' + recentDelivered.id, 'true');
    }
  }, [orders, userProfile]);
  
  const handleReviewSubmit = () => {
    if (reviewingOrderId && reviewRating > 0) {
      updateOrder(reviewingOrderId, { rating: reviewRating, reviewText });
      setReviewingOrderId(null);
      setReviewRating(0);
      setReviewText('');
      showToast('success', '¡Muchas gracias! Tu reseña y calificación han sido enviadas.', 'Reseña Registrada');
    }
  };


  return (
    <>
      {/* Notificación de Pedido Entregado */}
      <AnimatePresence>
        {showDeliveryNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-2xl border-2 border-brand-orange w-[90%] max-w-md cursor-pointer"
            onClick={() => {
              setReviewingOrderId(showDeliveryNotification);
              setShowDeliveryNotification(null);
              setActiveTab('history');
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="bg-brand-orange/20 p-2 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-brand-orange" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 dark:text-white">¡Tu pedido ha llegado!</p>
                <p className="text-sm text-gray-500 dark:text-stone-400">Cuéntanos, ¿cómo estuvo tu comida?</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowDeliveryNotification(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Reseña */}
      <AnimatePresence>
        {reviewingOrderId && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#151515] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl p-8"
            >
              <h3 className="font-bold text-2xl text-center mb-6 text-gray-900 dark:text-white">Califica tu Experiencia</h3>
              
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star} 
                    onMouseEnter={() => setReviewHoverRating(star)}
                    onMouseLeave={() => setReviewHoverRating(0)}
                    onClick={() => setReviewRating(star)}
                    className="hover:scale-110 transition-transform focus:outline-none"
                  >
                    <Star 
                      className={`w-10 h-10 transition-colors ${(reviewHoverRating || reviewRating) >= star ? 'text-brand-orange fill-current' : 'text-gray-300 dark:text-stone-600'}`} 
                    />
                  </button>
                ))}
              </div>

              <textarea 
                placeholder="Opcional: Escribe una breve reseña (ej. ¡La hamburguesa estaba deliciosa!)"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full bg-gray-50 dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-xl p-4 text-sm text-gray-900 dark:text-white h-24 mb-6 resize-none focus:outline-none focus:border-brand-orange"
              />

              <div className="flex gap-4">
                <button 
                  onClick={() => { setReviewingOrderId(null); setReviewRating(0); setReviewText(''); }}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 dark:bg-stone-800 dark:text-stone-400"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleReviewSubmit}
                  disabled={reviewRating === 0}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-brand-orange disabled:opacity-50 transition-opacity"
                >
                  Enviar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      
      {/* Modal de Detalles del Pedido */}
      <AnimatePresence>
        {selectedOrderInfo && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedOrderInfo(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#151515] w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-2xl text-gray-900 dark:text-white">Detalles del Pedido</h3>
                <button onClick={() => setSelectedOrderInfo(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-stone-900 p-4 rounded-2xl">
                  <p className="text-sm text-gray-500 font-medium mb-1">ID del Pedido</p>
                  <p className="font-bold text-gray-900 dark:text-white text-lg">{selectedOrderInfo.id}</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-stone-900 p-4 rounded-2xl">
                  <p className="text-sm text-gray-500 font-medium mb-2">Información del Repartidor</p>
                  {selectedOrderInfo.status === 'En Camino' || selectedOrderInfo.status === 'Entregado' || selectedOrderInfo.status === 'entregado' ? (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-stone-800 rounded-full flex items-center justify-center">
                        <Star className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{selectedOrderInfo.driverName || 'Repartidor Asignado'}</p>
                        <p className="text-sm text-gray-500">{selectedOrderInfo.status}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="font-bold text-gray-900 dark:text-white">Aún no se ha asignado un repartidor.</p>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-stone-900 p-4 rounded-2xl">
                  <p className="text-sm text-gray-500 font-medium mb-2">Resumen de Pago</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-600 dark:text-stone-400">Método de Pago</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrderInfo.paymentMethod === 'cash' ? 'Efectivo' : selectedOrderInfo.paymentMethod === 'nequi' ? 'Nequi' : selectedOrderInfo.paymentMethod === 'bancolombia' ? 'Bancolombia' : selectedOrderInfo.paymentMethod === 'daviplata' ? 'DaviPlata' : 'Digital / No especificado'}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-600 dark:text-stone-400">Estado de Pago</span>
                      <span className="text-green-600 uppercase tracking-wider">{selectedOrderInfo.paymentMethod === 'cash' ? 'Pago al Entregar' : 'Pagado'}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-stone-800 my-2 pt-2 flex justify-between font-bold text-lg">
                      <span className="text-gray-900 dark:text-white">Total</span>
                      <span className="text-brand-orange">{formatCOP(selectedOrderInfo.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-stone-900 p-4 rounded-2xl">
                  <p className="text-sm text-gray-500 font-medium mb-3">Productos</p>
                  <div className="space-y-3">
                    {selectedOrderInfo.items.map((item, idx: number) => (
                      <div key={item.id || idx} className="flex justify-between text-sm font-medium">
                        <span className="text-gray-900 dark:text-white">{item.quantity}x {item.name}</span>
                        <span className="text-gray-900 dark:text-white">{formatCOP(item.finalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-gray-50/50 dark:bg-stone-950 text-gray-900 dark:text-gray-100 font-sans flex transition-colors duration-300">
      {/* Barra Lateral (Sidebar) */}
      <aside className="w-[280px] bg-white dark:bg-[#151515] border-r border-gray-100 dark:border-stone-800 flex-col hidden md:flex shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-colors duration-300 h-screen sticky top-0">
        <div className="h-24 flex items-center px-8 gap-3 mb-2 shrink-0 border-b border-gray-50 dark:border-stone-800/50 cursor-pointer" onClick={() => irA('/')}>
          <div className="w-9 h-9 rounded-xl bg-brand-orange flex items-center justify-center shadow-lg shadow-brand-orange/20 shrink-0">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-[22px] tracking-tight text-gray-900 dark:text-white leading-none">Copiway<span className="text-brand-orange">PRO</span></h1>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto min-w-0">
          <NavItem key="catalog" id="catalog" icon={Utensils} label="Explorar Menú" active={activeTab} set={setActiveTab} />
          <NavItem key="builder" id="builder" icon={Plus} label="Creador Interactivo" active={activeTab} set={setActiveTab} />
          <NavItem key="cart" id="cart" icon={ShoppingCart} label="Carrito de Pedidos" active={activeTab} set={setActiveTab} badge={cart.length} />
          <NavItem key="activeOrders" id="activeOrders" icon={CheckCircle2} label="Órdenes Activas" active={activeTab} set={setActiveTab} badge={activeOrders.length} />
          <NavItem key="history" id="history" icon={RotateCcw} label="Historial y Recompras" active={activeTab} set={setActiveTab} />
          <NavItem key="profile" id="profile" icon={Settings} label="Mi Perfil" active={activeTab} set={setActiveTab} />
        </nav>

        <div className="p-6 border-t border-gray-100 dark:border-stone-800 mt-auto shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-4 w-full font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 px-4 py-3 rounded-[16px] transition-colors text-sm">
            <LogOut className="w-6 h-6 shrink-0" />
            <span className="leading-tight text-left">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-gray-50/50 dark:bg-stone-950 pb-20 md:pb-0 min-w-0">
        <header className="h-[70px] md:h-24 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#0c0a09] flex items-center justify-between px-4 sm:px-6 md:px-10 shrink-0 sticky top-0 z-50 transition-colors duration-300">
          <div className="flex items-center gap-2">
            <div className="md:hidden w-8 h-8 rounded-lg bg-brand-orange flex items-center justify-center shadow-lg shadow-brand-orange/20 shrink-0 cursor-pointer" onClick={() => irA('/')}>
              <Layers className="w-4 h-4 text-white" />
            </div>
             {activeTab === 'profile' && <h1 className="text-[18px] md:text-[22px] font-bold text-gray-900 dark:text-white hidden sm:block">Gestión de Cuenta</h1>}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Indicador Moderno en Vivo del Estado del Local (Dark Kitchen) */}
            <div className="relative group">
              <button 
                onClick={() => updateStoreConfig({ isOpen: !storeConfig.isOpen })}
                title="Haz clic para alternar estado manual (Modo Prueba / Admin)"
                className={`flex items-center gap-2 px-3.5 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-bold transition-all border shadow-sm ${
                  isStoreOpen 
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20' 
                    : 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                }`}
              >
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  {isStoreOpen ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </>
                  ) : (
                    <>
                      <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </>
                  )}
                </span>
                <span className="tracking-wide">{isStoreOpen ? 'Cocina Abierta' : 'Cocina Cerrada'}</span>
                <span className="text-[10px] font-normal opacity-70 hidden lg:inline-block border-l border-current pl-2 ml-0.5">
                  {isStoreOpen ? `${storeConfig.openTime || '11:00'} - ${storeConfig.closeTime || '23:00'}` : `Abre ${storeConfig.openTime || '11:00'}`}
                </span>
              </button>
            </div>

            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="w-10 h-10 relative flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-stone-300 transition-colors">
                <Bell className="w-5 h-5" />
                {userProfile.notifications?.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-orange rounded-full border-2 border-white dark:border-[#0c0a09]"></span>
                )}
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowNotifications(false)}
                      className="fixed inset-0 z-40"
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-[320px] sm:w-[380px] bg-white dark:bg-[#151515] rounded-[24px] shadow-2xl border border-gray-100 dark:border-stone-800 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center bg-gray-50/50 dark:bg-stone-900/50">
                        <h3 className="font-bold text-gray-900 dark:text-white">Notificaciones</h3>
                        {userProfile.notifications?.some(n => !n.read) && (
                          <button 
                            onClick={() => {
                              const updated = userProfile.notifications?.map(n => ({ ...n, read: true })) || [];
                              setUserProfile({ ...userProfile, notifications: updated });
                            }}
                            className="text-[11px] font-bold text-brand-orange hover:text-brand-orange/80 uppercase tracking-wide"
                          >
                            Marcar todo leído
                          </button>
                        )}
                      </div>
                      <div className="max-h-[400px] overflow-y-auto p-2">
                        {(!userProfile.notifications || userProfile.notifications.length === 0) ? (
                          <div className="p-8 text-center flex flex-col items-center justify-center">
                            <Bell className="w-8 h-8 text-gray-300 dark:text-stone-700 mb-3" />
                            <p className="text-sm text-gray-500 dark:text-stone-400 font-medium">No tienes notificaciones</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {userProfile.notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(notif => (
                              <div 
                                key={notif.id} 
                                onClick={() => {
                                  if (!notif.read) {
                                    const updated = userProfile.notifications?.map(n => n.id === notif.id ? { ...n, read: true } : n) || [];
                                    setUserProfile({ ...userProfile, notifications: updated });
                                  }
                                }}
                                className={`p-3 rounded-2xl cursor-pointer transition-colors flex gap-3 ${notif.read ? 'hover:bg-gray-50 dark:hover:bg-stone-900/50' : 'bg-brand-orange/5 dark:bg-brand-orange/10 hover:bg-brand-orange/10 dark:hover:bg-brand-orange/20'}`}
                              >
                                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${notif.read ? 'bg-gray-100 dark:bg-stone-800 text-gray-500' : 'bg-brand-orange/20 text-brand-orange'}`}>
                                  {notif.type === 'promo' ? <Gift className="w-5 h-5" /> : notif.type === 'order' ? <Truck className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                                </div>
                                <div>
                                  <p className={`text-sm ${notif.read ? 'text-gray-700 dark:text-stone-300' : 'font-bold text-gray-900 dark:text-white'}`}>{notif.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-stone-400 mt-0.5 leading-snug">{notif.message}</p>
                                  <p className="text-[10px] text-gray-400 mt-1.5">{new Date(notif.date).toLocaleDateString()} {new Date(notif.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-stone-300 transition-colors">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 min-w-0">
          <div className="max-w-[1600px] mx-auto w-full">
            {activeTab === 'catalog' && (
              <CatalogSection
                catalog={catalog}
                orderHistory={orderHistory}
                inventory={inventory}
                storeConfig={storeConfig}
                catalogCategory={catalogCategory}
                setCatalogCategory={setCatalogCategory}
                openCustomizer={openCustomizer}
                reorder={reorder}
              />
            )}
            {activeTab === 'builder' && (
              <BuilderSection
                builderStack={builderStack}
                setBuilderStack={setBuilderStack}
                syncedIngredients={syncedIngredients}
                cart={cart}
                setCart={setCart}
                editingCartItemId={editingCartItemId}
                setEditingCartItemId={setEditingCartItemId}
                setActiveTab={setActiveTab}
                showToast={showToast}
              />
            )}
            {activeTab === 'cart' && (
              <CartSection
                cart={cart}
                setCart={setCart}
                products={products}
                storeConfig={storeConfig}
                isStoreOpen={isStoreOpen}
                isCheckingOut={isCheckingOut}
                isBirthday={isBirthday}
                cartSubtotal={cartSubtotal}
                birthdayDiscount={birthdayDiscount}
                cartTotal={cartTotal}
                FLAT_SHIPPING_RATE={FLAT_SHIPPING_RATE}
                setActiveTab={setActiveTab}
                setEditingCartItemId={setEditingCartItemId}
                setBuilderStack={setBuilderStack}
                setSelectedProduct={setSelectedProduct}
                setCustomRemoved={setCustomRemoved}
                setCustomExtras={setCustomExtras}
                setConfirmModal={setConfirmModal}
                showToast={showToast}
              />
            )}
            {activeTab === 'checkout' && (
              <CheckoutSection
                setActiveTab={setActiveTab}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                cart={cart}
                cartSubtotal={cartSubtotal}
                FLAT_SHIPPING_RATE={FLAT_SHIPPING_RATE}
                isBirthday={isBirthday}
                birthdayDiscount={birthdayDiscount}
                cartTotal={cartTotal}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                digitalBank={digitalBank}
                setDigitalBank={setDigitalBank}
                paymentPhone={paymentPhone}
                setPaymentPhone={setPaymentPhone}
                paymentStatus={paymentStatus}
                isStoreOpen={isStoreOpen}
                storeConfig={storeConfig}
                handleCheckoutSubmit={handleCheckoutSubmit}
                simulationStep={simulationStep}
              />
            )}
            {activeTab === 'activeOrders' && (
              <ActiveOrdersSection
                activeOrders={activeOrders}
                setSelectedOrderInfo={setSelectedOrderInfo}
                setActiveTab={setActiveTab}
              />
            )}
            {activeTab === 'history' && (
              <HistorySection
                orders={orders}
                userProfile={userProfile}
                historySearch={historySearch}
                setHistorySearch={setHistorySearch}
                historyFilter={historyFilter}
                setHistoryFilter={setHistoryFilter}
                setActiveTab={setActiveTab}
                reviewingOrderId={reviewingOrderId}
                setReviewingOrderId={setReviewingOrderId}
                reviewRating={reviewRating}
                setReviewRating={setReviewRating}
                reviewHoverRating={reviewHoverRating}
                setReviewHoverRating={setReviewHoverRating}
                reviewText={reviewText}
                setReviewText={setReviewText}
                reviewTags={reviewTags}
                setReviewTags={setReviewTags}
                updateOrder={updateOrder}
                showToast={showToast}
                reorder={reorder}
                viewingReceiptOrder={viewingReceiptOrder}
                setViewingReceiptOrder={setViewingReceiptOrder}
                storeConfig={storeConfig}
              />
            )}
            {activeTab === 'profile' && (
              <ProfileSection
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                setShowCalendar={setShowCalendar}
                showToast={showToast}
                setShowPasswordModal={setShowPasswordModal}
                handleLogout={handleLogout}
              />
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/80 dark:bg-[#0c0a09]/80 backdrop-blur-lg border-t border-gray-200 dark:border-white/5 flex items-center justify-around z-[100] px-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] pb-safe">
        <MobileNavItem id="catalog" icon={Utensils} active={activeTab} set={setActiveTab} label="Menú" />
        <MobileNavItem id="builder" icon={Plus} active={activeTab} set={setActiveTab} label="Crear" />
        <MobileNavItem id="cart" icon={ShoppingCart} active={activeTab} set={setActiveTab} badge={cart.length} label="Carrito" />
        <MobileNavItem id="activeOrders" icon={CheckCircle2} active={activeTab} set={setActiveTab} badge={activeOrders.length} label="Pedidos" />
        <MobileNavItem id="profile" icon={Settings} active={activeTab} set={setActiveTab} label="Perfil" />
      </div>


      {/* HU-13: Toast Overlay */}
      <ToastNotification toast={toastMessage} onClose={() => setToastMessage(null)} />

      {/* HU-08: Modal de Exclusión/Adición Interactiva */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setSelectedProduct(null)} className="absolute inset-0 bg-stone-900/60 dark:bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{opacity:0, scale:0.95, y:20}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:0.95, y:20}} className="relative bg-white dark:bg-[#151515] rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 dark:border-stone-800">
              <div className="p-6 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center bg-gray-50/50 dark:bg-stone-800/20">
                <div>
                  <h3 className="font-black text-2xl">{selectedProduct.name}</h3>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="p-3 hover:bg-gray-200 dark:hover:bg-stone-800 rounded-full transition-colors bg-black/5 dark:bg-white/5"><X className="w-5 h-5"/></button>
              </div>
                
              <div className="p-6 space-y-8 max-h-[60vh] overflow-y-auto">
                {/* HU-08.1: Exclusión (SIN) */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2"><Minus className="w-4 h-4"/> Retirar Ingredientes</h4>
                  {selectedProduct.ingredients && selectedProduct.ingredients.length > 0 ? (
                    <div className="space-y-3">
                      {selectedProduct.ingredients.map((ing) => {
                        const isRemoved = customRemoved.find(r => r.id === ing.id);
                        return (
                          <div key={ing.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-stone-800 rounded-[20px] bg-white dark:bg-[#151515] shadow-sm">
                            <span className={`font-medium ${isRemoved ? 'line-through text-gray-400' : 'text-gray-700 dark:text-stone-300'}`}>{ing.name}</span>
                            <button 
                              onClick={() => {
                                if (isRemoved) setCustomRemoved(customRemoved.filter(r => r.id !== ing.id));
                                else setCustomRemoved([...customRemoved, ing]);
                              }}
                              className={`px-4 py-2 text-sm rounded-[20px] font-bold transition-colors ${isRemoved ? 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'}`}
                            >
                              {isRemoved ? 'Revertir' : 'Quitar (Sin)'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-black/[0.02] dark:bg-white/[0.02]/50 rounded-[20px] border border-gray-100 dark:border-stone-800 text-sm font-medium text-gray-500">Este producto base no tiene restricciones.</div>
                  )}
                </div>

                {/* HU-08.2: Adición (EXTRA) sincronizada con inventario */}
                <div className="space-y-4 pt-4">
                  <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Añadir Extras</h4>
                  {syncedIngredients.filter(i => i.category === 'extra' || i.category === 'carnes' || i.category === 'lacteos' || i.category === 'embutidos').length > 0 ? (
                    <div className="space-y-3">
                      {syncedIngredients.filter(i => i.category === 'extra' || i.category === 'carnes' || i.category === 'lacteos' || i.category === 'embutidos').map(extra => {
                        const isAdded = customExtras.find(e => e.id === extra.id);
                        const isOutOfStock = extra.stock !== undefined && extra.stock <= 0;
                        return (
                          <div key={extra.id} className={`flex items-center justify-between p-4 border border-gray-100 dark:border-stone-800 rounded-[20px] bg-white dark:bg-[#151515] shadow-sm ${isOutOfStock ? 'opacity-50' : ''}`}>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-800 dark:text-stone-200">{extra.name}</p>
                                {isOutOfStock && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">AGOTADO</span>
                                )}
                              </div>
                              <p className="text-sm font-black text-brand-orange mt-0.5">+{formatCOP(extra.price)}</p>
                            </div>
                            <button 
                              disabled={isOutOfStock && !isAdded}
                              onClick={() => {
                                if (isAdded) setCustomExtras(customExtras.filter(e => e.id !== extra.id));
                                else setCustomExtras([...customExtras, extra]);
                              }}
                              className={`px-4 py-2 text-sm rounded-[20px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isAdded ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-md hover:bg-gray-800 dark:hover:bg-gray-100'}`}
                            >
                              {isAdded ? 'Quitar' : isOutOfStock ? 'Agotado' : 'Añadir Extra'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-black/[0.02] dark:bg-white/[0.02]/50 rounded-[20px] border border-gray-100 dark:border-stone-800 text-sm font-medium text-gray-500">No hay extras en inventario actualmente.</div>
                  )}
                </div>

              </div>
                
              <div className="p-6 border-t border-gray-100 dark:border-stone-800 bg-gray-50 dark:bg-[#151515]">
                <button 
                  onClick={addToCartFromCatalog}
                  className="w-full bg-brand-orange text-white py-4 rounded-[20px] font-black text-lg hover:bg-brand-orange/90 flex justify-between px-8 shadow-xl shadow-brand-orange/20 transition-all active:scale-[0.98]"
                >
                  <span>{editingCartItemId ? 'Actualizar Pedido' : 'Confirmar Selección'}</span>
                  <span>{formatCOP(selectedProduct.price + customExtras.reduce((s, e) => s + (e.price || 2000), 0))}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Cambio de Contraseña */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setShowPasswordModal(false)} className="absolute inset-0 bg-stone-900/60 dark:bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{opacity:0, scale:0.95, y:20}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:0.95, y:20}} className="relative bg-white dark:bg-[#151515] rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-stone-800">
              <div className="p-6 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center">
                <h3 className="font-bold text-xl text-gray-900 dark:text-white">Cambiar Contraseña</h3>
                <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-full transition-colors"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Contraseña Actual</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-[#151515] text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Nueva Contraseña</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-[#151515] text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Confirmar Nueva Contraseña</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-[#151515] text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all text-gray-900 dark:text-white" />
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-stone-800 flex gap-4">
                <button onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors min-w-0">Cancelar</button>
                <button onClick={() => { setShowPasswordModal(false); showToast('info', 'Contraseña actualizada exitosamente'); }} className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-brand-orange hover:bg-brand-orange/90 transition-colors shadow-md min-w-0">Actualizar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CalendarModal isOpen={showCalendar} onClose={() => setShowCalendar(false)} selectedDate={userProfile.birthday} onSelectDate={(date) => setUserProfile({...userProfile, birthday: date})} />
      
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
    </div>
    </>
  );
}

interface NavItemProps {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: string;
  set: (id: string) => void;
  badge?: number;
}

function NavItem({ id, icon: Icon, label, active, set, badge }: NavItemProps) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => set(id)}
      className={`w-full flex items-center justify-between px-5 py-4 rounded-[16px] transition-all font-bold text-[14px] ${isActive ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20' : 'text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-900 hover:text-gray-900 dark:hover:text-white'}`}
    >
      <div className="flex items-center gap-4">
        <Icon className={`w-[22px] h-[22px] shrink-0 ${isActive ? 'text-white' : 'text-gray-400 dark:text-stone-500'}`} />
        <span className="text-left leading-tight whitespace-pre-line">{label}</span>
      </div>
      {badge > 0 && (
        <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black shrink-0 ${isActive ? 'bg-white text-brand-orange' : 'bg-brand-orange text-white'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function MobileNavItem({ id, icon: Icon, active, set, badge, label }: NavItemProps) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => set(id)}
      className={`relative flex flex-col items-center justify-center min-w-[64px] h-full transition-all ${isActive ? 'text-brand-orange' : 'text-gray-400 dark:text-stone-500'}`}
    >
      <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-brand-orange/10 scale-110' : ''}`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className={`text-[10px] font-bold mt-1 transition-all ${isActive ? 'opacity-100 scale-100' : 'opacity-70 scale-95'}`}>{label}</span>
      {badge > 0 && (
        <span className="absolute top-2 right-3 w-4 h-4 flex items-center justify-center rounded-full bg-brand-orange text-white text-[9px] font-black shadow-sm ring-2 ring-white dark:ring-[#0c0a09]">
          {badge}
        </span>
      )}
    </button>
  );
}
