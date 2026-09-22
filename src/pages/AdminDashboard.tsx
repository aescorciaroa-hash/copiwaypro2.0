import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  PieChart as PieChartIcon, LayoutDashboard, Utensils, Users, Settings, LogOut, 
  Mail, Sun, Moon, Plus, Minus, Maximize2, Minimize2, Edit2, Trash2, Eye, EyeOff, 
  TrendingUp, Bell, Package, Check, CheckCircle2, X, MapPin, Printer, Calculator, Menu, Search, MoreVertical, BookOpen, Layers, TriangleAlert, Wallet, PlusCircle, UserPlus, IdCard, Download, Filter, ChefHat, Wine, ChevronLeft, ChevronRight, User, ShoppingBag, Clock, ChevronDown,
  Phone, Lock, Shield, KeyRound, Copy, Share2, Sparkles, Activity, Flame, Star, Award, DollarSign, Truck, ArrowRight, AlertCircle, Box
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { formatCOP } from '../lib/format';

import { useStore, DEFAULT_MENU_CATEGORIES, Product, ProductComponent, Order, OrderItem, Staff, Client, NamedRef } from '../store/almacenAplicacion';
import { api, ApiError, irA } from '../servicios/api';
import { CustomSelect } from '../components/CustomSelect';
import { TimePickerModal } from '../components/TimePickerModal';
import { generateCierrePDF } from '../utils/generarCierrePdf';
import { ToastNotification, ToastData } from '../components/ToastNotification';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { soundFx } from '../utils/audio';



const RoutePolyline = ({ origin, destination, outerColor, innerColor, onRouteLoaded }: { origin: [number, number], destination: [number, number], outerColor: string, innerColor: string, onRouteLoaded?: (coords: [number, number][]) => void }) => {
  const [positions, setPositions] = React.useState<[number, number][]>([]);

  React.useEffect(() => {
    // Fetch route from OSRM (Open Source Routing Machine)
    fetch(`https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          setPositions(coords);
          if (onRouteLoaded) onRouteLoaded(coords);
        }
      })
      .catch(err => console.error("Error fetching route:", err));
  }, [origin, destination]);

  if (!positions.length) return null;

  return (
    <>
      {/* Outer Border */}
      <Polyline positions={positions} pathOptions={{ color: outerColor, weight: 8, lineCap: 'round', lineJoin: 'round', opacity: 1 }} />
      {/* Inner Line */}
      <Polyline positions={positions} pathOptions={{ color: innerColor, weight: 4, lineCap: 'round', lineJoin: 'round', opacity: 1 }} />
    </>
  );
};


const CustomZoomControl = () => {
  const map = useMap();
  return (
    <div className="absolute top-8 left-6 flex flex-col gap-2 z-[400] pointer-events-auto">
      <button 
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); map.zoomIn(); }}
        className="w-10 h-10 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm border border-gray-200 dark:border-white/10 hover:scale-110 transition-transform text-gray-700 dark:text-white"
        title="Acercar"
      >
        <Plus size={20} />
      </button>
      <button 
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); map.zoomOut(); }}
        className="w-10 h-10 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm border border-gray-200 dark:border-white/10 hover:scale-110 transition-transform text-gray-700 dark:text-white"
        title="Alejar"
      >
        <Minus size={20} />
      </button>

    </div>
  );
};


interface DriverMockOrder {
  id: string;
  client: string;
  address: string;
  status: string;
  items: string[];
  total: number;
  paymentMethod?: string;
  paymentStatus?: string;
}

interface DriverMockInfo {
  name: string;
  status: string;
  phone: string;
  plate: string;
  vehicle: string;
  orders: DriverMockOrder[];
}

interface ManualCustomIngredient extends ProductComponent {
  price?: number;
}

interface ManualOrderItem {
  id: string;
  product: Product;
  name: string;
  quantity: number;
  basePrice: number;
  finalPrice: number;
  removed: ManualCustomIngredient[];
  extras: ManualCustomIngredient[];
}

interface CashClosingReport {
  date: string;
  totalVentas: number;
  totalOrdenes: number;
  activeOrdersCount: number;
  desglose: { efectivo: number; digital: number };
  insumosConsumidos: Array<{ name: string; used: number; unit?: string }>;
  driverLiquidations: Array<{ driverName: string; ordersCount: number; cashCollected: number; baseCash: number; totalDue: number }>;
}

interface CierreData {
  date: string;
  totalVentas: number;
  totalOrdenes: number;
  activeOrdersCount: number;
  desglose: { efectivo: number; digital: number };
  insumosConsumidos: Array<{ name: string; used: number }>;
  liquidaciones: Array<{ driverName: string; ordersCount: number; cashCollected: number; base: number; totalDue: number }>;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-stone-800 p-3 rounded-[12px] shadow-lg">
        <p className="font-bold text-gray-900 dark:text-white mb-1">{label}</p>
        <p className="font-black text-brand-orange">
          {formatCOP(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('overview');
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const mainContentRef = useRef<HTMLDivElement | null>(null);

  const handleNavigateToOrders = (orderId?: string) => {
    setActiveTab('orders');
    if (orderId) {
      setHighlightedOrderId(orderId);
      // Wait for tab switch & render to complete
      setTimeout(() => {
        const targetElement = document.getElementById(`order-card-${orderId}`);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (mainContentRef.current) {
          mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);

      // Auto-clear highlight after 4 seconds
      setTimeout(() => {
        setHighlightedOrderId((current) => (current === orderId ? null : current));
      }, 4000);
    } else {
      // When clicking "Ver todas", start view from the very top
      setTimeout(() => {
        if (mainContentRef.current) {
          mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  };
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [selectedDriverInfo, setSelectedDriverInfo] = useState<DriverMockInfo | null>(null);
  const [selectedStaffInfo, setSelectedStaffInfo] = useState<Staff | null>(null);
  const [selectedClientInfo, setSelectedClientInfo] = useState<Client | null>(null);
  const [staffEditData, setStaffEditData] = useState({ 
    name: "", 
    phone: "", 
    email: "", 
    password: "", 
    role: "Ayudante de cocina", 
    plate: "", 
    vehicle: "", 
    active: true,
    baseCash: 0 as number | '' 
  });
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [copiedStaffCreds, setCopiedStaffCreds] = useState(false);

  const handleOpenStaffModal = (emp: Staff) => {
    setSelectedStaffInfo(emp);
    setStaffEditData({
      name: emp.name || "",
      phone: emp.phone || "",
      email: emp.email || "",
      password: emp.password || "",
      role: emp.role || "Ayudante de cocina",
      plate: emp.plate || "",
      vehicle: emp.vehicle || "",
      active: emp.active !== false,
      baseCash: emp.baseCash || 0
    });
    setShowStaffPassword(false);
    setCopiedStaffCreds(false);
  };

  // Sonido de alerta (HU-20)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showOrderAlert, setShowOrderAlert] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<'open' | 'close' | null>(null);

  // Estados Globales (Datos simulados)
  const { 
    products, addProduct, updateProduct, deleteProduct,
    inventory, addInventoryItem, updateInventoryStock, deleteInventoryItem,
    inventoryLogs,
    staff, addStaff, updateStaff, deleteStaff,
    orders, addOrder, updateOrderStatus, setOrders,
    clients, addClient, updateClient, deleteClient,
    storeConfig, updateStoreConfig,
    addCategory, removeCategory
  } = useStore();

  
  const [salesFilter, setSalesFilter] = useState('Esta semana');

  const getSalesData = () => {
    switch (salesFilter) {
      case 'Esta semana':
        return [
          { date: 'Lun', amount: 150000 },
          { date: 'Mar', amount: 200000 },
          { date: 'Mié', amount: 350000 },
          { date: 'Jue', amount: 180000 },
          { date: 'Vie', amount: 450000 },
          { date: 'Sáb', amount: 650000 },
          { date: 'Dom', amount: 500000 }
        ];
      case 'Semana pasada':
        return [
          { date: 'Lun', amount: 120000 },
          { date: 'Mar', amount: 180000 },
          { date: 'Mié', amount: 280000 },
          { date: 'Jue', amount: 150000 },
          { date: 'Vie', amount: 390000 },
          { date: 'Sáb', amount: 550000 },
          { date: 'Dom', amount: 480000 }
        ];
      case 'Este mes':
        return [
          { date: 'Semana 1', amount: 1850000 },
          { date: 'Semana 2', amount: 2100000 },
          { date: 'Semana 3', amount: 2450000 },
          { date: 'Semana 4', amount: 2200000 }
        ];
      case 'Hace un mes':
        return [
          { date: 'Semana 1', amount: 1650000 },
          { date: 'Semana 2', amount: 1800000 },
          { date: 'Semana 3', amount: 2050000 },
          { date: 'Semana 4', amount: 1950000 }
        ];
      default:
        return [];
    }
  };

  const salesData = getSalesData();

  
  // Ajustes

  const driversMockData: Record<number, DriverMockInfo> = {
    1: {
      name: 'Repartidor 1 - Carlos Mendoza',
      status: 'EN RUTA',
      phone: '+57 320 123 4567',
      plate: 'XYZ-123',
      vehicle: 'Motocicleta Honda',
      orders: [
        {
          id: '#1024',
          client: 'Ana Pérez',
          address: 'Calle 10 # 5-20, Centro',
          status: 'En camino',
          items: ['2x Hamburguesa Clásica', '1x Papas Fritas'],
          total: 45000,
        },
        {
          id: '#1025',
          client: 'Luis Sánchez',
          address: 'Carrera 15 # 8-45, Altico',
          status: 'Entregado',
          items: ['1x Pizza Hawaiana'],
          total: 35000,
        }
      ]
    },
    2: {
      name: 'Repartidor 2 - Miguel Torres',
      status: 'CARGANDO',
      phone: '+57 310 987 6543',
      plate: 'ABC-987',
      vehicle: 'Motocicleta Yamaha',
      orders: [
        {
          id: '#1026',
          client: 'María Gómez',
          address: 'Calle 20 # 10-15, Norte',
          status: 'Asignado',
          items: ['3x Hot Dog Especial', '2x Gaseosa 400ml'],
          total: 62000,
        }
      ]
    }
  };

  // Real-time automatic store status calculation
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const checkIsStoreOpen = () => {
    if (storeConfig.isOpen === false) return false;
    
    const now = currentTime;
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    const [openHours, openMinutes] = (storeConfig.openTime || '11:00').split(':').map(Number);
    const openTotalMinutes = openHours * 60 + openMinutes;

    const [closeHours, closeMinutes] = (storeConfig.closeTime || '23:00').split(':').map(Number);
    const closeTotalMinutes = closeHours * 60 + closeMinutes;

    if (closeTotalMinutes < openTotalMinutes) {
      return currentTotalMinutes >= openTotalMinutes || currentTotalMinutes <= closeTotalMinutes;
    } else {
      return currentTotalMinutes >= openTotalMinutes && currentTotalMinutes <= closeTotalMinutes;
    }
  };

  const isStoreAutomaticallyOpen = checkIsStoreOpen();

  // States from tabs
  const [newProduct, setNewProduct] = useState<{
    name: string;
    description: string;
    price: string;
    image: string;
    category: string;
    badge: string;
    active: boolean;
    ingredients: ProductComponent[];
    packaging: ProductComponent[];
  }>({
    name: '',
    description: '',
    price: '',
    image: '',
    category: 'Hamburguesas',
    badge: '',
    active: true,
    ingredients: [],
    packaging: []
  });
  const [tempIngredientName, setTempIngredientName] = useState('');
  const [tempPackagingName, setTempPackagingName] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState('Todas');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isInlineAddingCategory, setIsInlineAddingCategory] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState('');
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    stock: '',
    totalCost: '',
    unit: 'Unidades',
    category: 'General',
    supplier: '',
    notes: ''
  });
  const [newStaff, setNewStaff] = useState({ name: '', role: 'Ayudante de cocina', email: '', password: '', phone: '', plate: '', vehicle: '', baseCash: 0 as number | '' });
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualOrderClient, setManualOrderClient] = useState({ name: '', address: '', phone: '' });
  const [manualOrderItems, setManualOrderItems] = useState<ManualOrderItem[]>([]);
  const [manualSelectedProduct, setManualSelectedProduct] = useState<Product | null>(null);
  const [manualCustomRemoved, setManualCustomRemoved] = useState<ManualCustomIngredient[]>([]);
  const [manualCustomExtras, setManualCustomExtras] = useState<ManualCustomIngredient[]>([]);
  const [manualQuantity, setManualQuantity] = useState<number | ''>(1);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  const [editingAddressOrder, setEditingAddressOrder] = useState<Order | null>(null);
  const [newAddress, setNewAddress] = useState('');
  const [showAddressSuccess, setShowAddressSuccess] = useState(false);
  const [toastData, setToastData] = useState<ToastData | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = (type: ToastData['type'] = 'success', message: string, title?: string) => {
    setToastData({ type, message, title });
  };

  const handleUpdateAddress = async () => {
    if (editingAddressOrder && newAddress) {
      const { orders, setOrders } = useStore.getState();
      const targetId = editingAddressOrder.id;
      setOrders(orders.map(o => o.id === editingAddressOrder.id ? { ...o, address: newAddress } : o));
      setEditingAddressOrder(null);
      setNewAddress('');
      setShowAddressSuccess(true);
      showToast('info', 'La dirección de entrega fue actualizada correctamente.', 'Dirección Modificada');
      setTimeout(() => setShowAddressSuccess(false), 3000);
    }
  };

  const [showCierre, setShowCierre] = useState(false);
  const [cierreData, setCierreData] = useState<CierreData | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [inventoryHistorySearch, setInventoryHistorySearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffCurrentPage, setStaffCurrentPage] = useState(1);
  const staffItemsPerPage = 10;
  const [customerSearch, setCustomerSearch] = useState('');
  const [shippingRateInput, setShippingRateInput] = useState(storeConfig?.shippingRate?.toString() || '5000');
  const [profitMarginInput, setProfitMarginInput] = useState(storeConfig?.profitMargin !== undefined ? storeConfig.profitMargin.toString() : '30');
  
  useEffect(() => {
    if (storeConfig) {
      if (storeConfig.shippingRate !== undefined) {
        setShippingRateInput(storeConfig.shippingRate.toString());
      }
      if (storeConfig.profitMargin !== undefined) {
        setProfitMarginInput(storeConfig.profitMargin.toString());
      }
    }
  }, [storeConfig?.shippingRate, storeConfig?.profitMargin]);

  // Tecla Escape para salir de cualquier modal o del mapa expandido
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMapExpanded(false);
        setEditingAddressOrder(null);
        setViewingOrder(null);
        setSelectedDriverInfo(null);
        setSelectedStaffInfo(null);
        setSelectedClientInfo(null);
        setShowCierre(false);
        setShowPdfPreview(false);
        setShowManualForm(false);
        setIsInventoryModalOpen(false);
        setIsProductModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered Lists
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || (p.description || '').toLowerCase().includes(catalogSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedCatalogCategory === 'Todas') return true;

    const pCat = p.category || (
      p.name.toLowerCase().includes('hamburguesa') ? 'Hamburguesas de Pan' :
      p.name.toLowerCase().includes('perro') || p.name.toLowerCase().includes('salchicha') ? 'Perros Calientes' :
      p.name.toLowerCase().includes('salchipapa') ? 'Salchipapas' :
      p.name.toLowerCase().includes('patacón') ? 'Hamburguesas de Patacón' :
      'Otros'
    );
    if (pCat.toLowerCase() === selectedCatalogCategory.toLowerCase()) return true;
    if ((selectedCatalogCategory === 'Hamburguesas de Pan' || selectedCatalogCategory === 'Hamburguesas') && pCat.toLowerCase().includes('hamburguesa')) return true;
    return false;
  });
  const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(inventorySearch.toLowerCase()));
  const filteredStaff = staff.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()) || s.email.toLowerCase().includes(staffSearch.toLowerCase()));
  const staffTotalPages = Math.max(1, Math.ceil(filteredStaff.length / staffItemsPerPage));
  const paginatedStaff = filteredStaff.slice((staffCurrentPage - 1) * staffItemsPerPage, staffCurrentPage * staffItemsPerPage);
  const filteredInventoryLogs = inventoryLogs ? inventoryLogs.filter(log => log.itemName.toLowerCase().includes(inventoryHistorySearch.toLowerCase()) || log.reason.toLowerCase().includes(inventoryHistorySearch.toLowerCase())) : [];
  const filteredClients = clients ? clients.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)) : [];

  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const topProductsData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      (o.items || []).forEach((item: OrderItem) => {
        const name = item.product?.name || item.name || 'Producto';
        counts[name] = (counts[name] || 0) + (item.quantity || 1);
      });
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const totalUnits = entries.reduce((acc, curr) => acc + curr[1], 0);

    const palette = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#6b7280'];
    if (entries.length > 0 && totalUnits > 0) {
      return entries.slice(0, 4).map(([name, count], i) => ({
        name,
        value: Math.round((count / totalUnits) * 100),
        units: count,
        color: palette[i % palette.length]
      }));
    }
    return [
      { name: 'Hamburguesa Clásica', value: 45, units: 18, color: '#f97316' },
      { name: 'Papas Medianas', value: 30, units: 12, color: '#3b82f6' },
      { name: 'Gaseosa 500ml', value: 25, units: 10, color: '#9ca3af' }
    ];
  }, [orders]);


  const handleGenerarCierre = async () => {
    try {
      const report = await api.post<CashClosingReport>('/cash-closing');
      const newCierre = {
        date: new Date(report.date).toLocaleDateString('es-CO'),
        totalVentas: report.totalVentas,
        totalOrdenes: report.totalOrdenes,
        activeOrdersCount: report.activeOrdersCount,
        desglose: report.desglose,
        insumosConsumidos: report.insumosConsumidos.map((i) => ({ name: i.name, used: i.used })),
        liquidaciones: report.driverLiquidations.map((l) => ({
          driverName: l.driverName,
          ordersCount: l.ordersCount,
          cashCollected: l.cashCollected,
          base: l.baseCash,
          totalDue: l.totalDue
        }))
      };
      setCierreData(newCierre);
      setShowCierre(true);
    } catch (err) {
      showToast('danger', err instanceof ApiError ? err.message : 'No se pudo generar el cierre de caja.', 'Error');
    }
  };

  const descargarPDF = () => {
    if (!cierreData) return;
    try {
      setIsGeneratingPDF(true);
      const { download, blobUrl } = generateCierrePDF(cierreData, orders);
      setPdfPreviewUrl(blobUrl);
      download();
      showToast('cierre', 'Reporte PDF oficial generado y descargado', 'Descarga Completada');
      setTimeout(() => setIsGeneratingPDF(false), 300);
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast('danger', 'Error al generar el documento PDF', 'Error');
      setIsGeneratingPDF(false);
    }
  };

  const handleVerReporte = () => {
    if (!cierreData) return;
    try {
      const { blobUrl } = generateCierrePDF(cierreData, orders);
      setPdfPreviewUrl(blobUrl);
      setShowPdfPreview(true);
      showToast('info', 'Vista previa del informe contable cargada', 'Reporte Contable');
    } catch (error) {
      console.error("Error viewing PDF report:", error);
      showToast('danger', 'Error al abrir la vista previa del informe', 'Error');
    }
  };

  const confirmarCierre = async () => {
    // El archivado real ya ocurrió en el servidor al generar el cierre
    // (handleGenerarCierre); aquí solo refrescamos la lista desde la API.
    try {
      const fresh = await api.get<typeof orders>('/orders');
      setOrders(fresh);
    } catch {
      // Si falla el refresco, el próximo poll de sincronización lo corrige.
    }
    setShowCierre(false);
    showToast('cierre', 'El reporte de cierre de caja fue generado correctamente.', 'Cierre Generado');
  };

  const requestConfirmarCierre = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Cierre de Caja del Día',
      message: cierreData?.activeOrdersCount > 0 
        ? `Advertencia: Tienes ${cierreData.activeOrdersCount} órdenes activas aún sin entregar. Al confirmar el cierre, la caja se consolidará y el sistema se reiniciará para el siguiente turno.`
        : '¿Estás seguro de completar el cierre de caja de hoy? Se consolidarán los ingresos en efectivo y digitales, y se descontarán los insumos consumidos.',
      confirmText: 'Sí, cerrar caja',
      cancelText: 'Revisar detalles',
      type: 'warning',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        confirmarCierre();
      }
    });
  };

  // Real-time tracking of new orders to play chime alert (RF-27)
  const prevAdminOrdersCount = useRef<number>(orders.length);
  const initialAdminLoad = useRef<boolean>(true);

  useEffect(() => {
    if (initialAdminLoad.current) {
      initialAdminLoad.current = false;
      prevAdminOrdersCount.current = orders.length;
      return;
    }

    if (orders.length > prevAdminOrdersCount.current) {
      setShowOrderAlert(true);
      soundFx.playOrderBell();
      setTimeout(() => setShowOrderAlert(false), 5000);
    }
    prevAdminOrdersCount.current = orders.length;
  }, [orders]);

  // Cleanup hook para eliminar órdenes sin artículos
  useEffect(() => {
    const emptyOrders = orders.filter(o => !o.items || o.items.length === 0);
    emptyOrders.forEach(o => {
      if (useStore.getState().deleteOrder) {
        useStore.getState().deleteOrder(o.id);
      }
    });
  }, [orders]);

  const handleLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Cerrar Sesión de Administrador',
      message: '¿Estás seguro de que deseas salir del panel de administración de Hamburguer Copiway?',
      confirmText: 'Sí, cerrar sesión',
      cancelText: 'Permanecer',
      type: 'info',
      onConfirm: () => {
        api.post('/auth/logout').catch(() => {});
        showToast('warning', 'Cerraste sesión en el panel de administrador.', 'Sesión Finalizada');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        irA('/login');
      }
    });
  };



  // Vistas (Tabs)

  // HU-19: Analítica de Datos
  const renderOverview = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Tablero General</h2>
          <p className="text-gray-500 dark:text-stone-400 mt-1">Resumen en tiempo real.</p>
        </div>

      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
        {[
          { label: 'Ventas Totales', value: formatCOP(salesData.reduce((a, b) => a + b.amount, 0)), icon: <Wallet className="w-5 h-5 text-brand-orange" />, badge: '+12.5%', badgeColor: 'text-emerald-600 bg-emerald-50' },
          { label: 'Órdenes Hoy', value: orders.length, icon: <LayoutDashboard className="w-5 h-5 text-blue-500" />, badge: 'Hoy', badgeColor: 'text-gray-600 bg-gray-100' },
          { label: 'Ticket Promedio', value: formatCOP(orders.length ? salesData.reduce((a, b) => a + b.amount, 0) / orders.length : 0), icon: <TrendingUp className="w-5 h-5 text-gray-600" />, badge: 'Alto', badgeColor: 'text-brand-orange bg-orange-50' },
          { label: 'Empleados Activos', value: staff.filter(s => s.active).length, icon: <Users className="w-5 h-5 text-emerald-500" />, badge: '•', badgeColor: 'text-emerald-500 bg-transparent text-xl leading-none' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-sm py-4 px-4 sm:p-8 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-stone-800 flex items-center justify-center">
                {stat.icon}
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.badgeColor}`}>{stat.badge}</span>
            </div>
            <p className="text-gray-500 dark:text-stone-400 text-sm font-bold mb-1">{stat.label}</p>
            <p className="text-[clamp(1.1rem,4.5vw,1.875rem)] sm:text-3xl font-black text-gray-900 dark:text-white break-all sm:break-normal leading-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        <div className="lg:col-span-2 bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-sm p-6 sm:p-8 min-h-[480px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{salesFilter.includes('mes') ? 'Ventas Semanales' : 'Ventas Diarias'}</h3>
            
            <div className="w-48">
              <CustomSelect 
                value={salesFilter}
                onChange={setSalesFilter}
                options={[
                  { value: 'Esta semana', label: 'Esta semana' },
                  { value: 'Semana pasada', label: 'Semana pasada' },
                  { value: 'Este mes', label: 'Este mes' },
                  { value: 'Hace un mes', label: 'Hace un mes' }
                ]}
              />
            </div>
          </div>
          <div className="flex-1 min-w-0 min-h-[320px] flex items-center">
            {salesData.length === 0 ? (
              <div className="flex items-center justify-center h-full w-full text-gray-400 font-medium">No hay datos de ventas registrados.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                  <YAxis width={80} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value} />
                  <Tooltip cursor={false} content={<CustomTooltip />} />
                  <Bar dataKey="amount" fill="#f97316" activeBar={{ fill: "#ea580c" }} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-sm p-6 sm:p-8 min-h-[480px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Productos más vendidos</h3>
              <p className="text-xs text-gray-500 dark:text-stone-400 font-medium mt-0.5">Participación por volumen</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-brand-orange flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          
          <div className="h-[210px] w-full relative flex items-center justify-center my-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topProductsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={64}
                  outerRadius={84}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  onMouseEnter={(_, index) => setActivePieIndex(index)}
                  onMouseLeave={() => setActivePieIndex(null)}
                >
                  {topProductsData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      opacity={activePieIndex === null || activePieIndex === index ? 1 : 0.4}
                      className="transition-opacity duration-200 cursor-pointer"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Central Display Dinámico y Limpio */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center select-none">
              {activePieIndex !== null && topProductsData[activePieIndex] ? (
                <div className="animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center max-w-[120px]">
                  <span className="text-2xl font-black text-gray-900 dark:text-white leading-none tracking-tight">
                    {topProductsData[activePieIndex].value}%
                  </span>
                  <span className="text-[11px] font-bold text-gray-700 dark:text-stone-300 mt-1 truncate max-w-full leading-tight">
                    {topProductsData[activePieIndex].name}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-stone-500 font-medium">
                    {topProductsData[activePieIndex].units} unids
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center max-w-[120px]">
                  <span className="text-2xl font-black text-gray-900 dark:text-white leading-none tracking-tight">
                    {topProductsData[0]?.value || 0}%
                  </span>
                  <span className="text-[11px] font-bold text-gray-600 dark:text-stone-300 mt-1 truncate max-w-full leading-tight">
                    {topProductsData[0]?.name || 'Más vendido'}
                  </span>
                  <span className="text-[10px] font-semibold text-brand-orange uppercase tracking-wider">
                    Top #1
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Lista de leyenda interactiva */}
          <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-stone-800">
            {topProductsData.map((item, idx) => (
              <div 
                key={idx}
                onMouseEnter={() => setActivePieIndex(idx)}
                onMouseLeave={() => setActivePieIndex(null)}
                className={`flex items-center justify-between text-xs sm:text-sm p-2 rounded-xl transition-all cursor-pointer ${
                  activePieIndex === idx 
                    ? 'bg-gray-100/80 dark:bg-stone-800/80 font-bold' 
                    : 'hover:bg-gray-50 dark:hover:bg-stone-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0 shadow-xs" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <span className="text-gray-700 dark:text-stone-300 truncate">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-gray-400 dark:text-stone-500 font-medium">
                    {item.units} u
                  </span>
                  <span className="font-black text-gray-900 dark:text-white">
                    {item.value}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        {/* Órdenes Recientes */}
        <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-sm p-6 sm:p-7 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-orange" />
              <h3 className="font-bold text-sm tracking-wider uppercase text-gray-900 dark:text-white">Órdenes Recientes</h3>
            </div>
            <button 
              onClick={() => handleNavigateToOrders()} 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50/80 dark:bg-brand-orange/10 text-brand-orange hover:bg-brand-orange hover:text-white dark:hover:bg-brand-orange dark:hover:text-white text-xs font-bold transition-all duration-200 shadow-xs active:scale-95 group cursor-pointer border border-brand-orange/20 hover:border-transparent"
            >
              <span>Ver todas ({orders.length})</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          <div className="space-y-2.5">
            {orders.length > 0 ? (
              orders.slice(0, 5).map((ord) => (
                <div 
                  key={ord.id} 
                  onClick={() => handleNavigateToOrders(ord.id)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 dark:bg-stone-900/50 hover:bg-orange-50/50 dark:hover:bg-stone-900 transition-all border border-gray-100/80 dark:border-stone-800/80 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-stone-800 text-brand-orange flex items-center justify-center font-black text-xs shrink-0 shadow-sm border border-gray-100 dark:border-stone-700">
                      {ord.id.replace(/[^0-9]/g, '').slice(-2) || '#'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm truncate group-hover:text-brand-orange transition-colors">
                        {ord.client || ord.clientPhone || 'Cliente'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-stone-400 truncate flex items-center gap-1.5 mt-0.5">
                        <span className="truncate max-w-[140px] sm:max-w-[200px]">{ord.address}</span>
                        <span>•</span>
                        <span className={`font-bold ${
                          ord.status === 'Entregado' || ord.status === 'entregado' ? 'text-emerald-600 dark:text-emerald-400' :
                          ord.status === 'En Camino' ? 'text-blue-600 dark:text-blue-400' :
                          ord.status === 'Listos' ? 'text-purple-600 dark:text-purple-400' :
                          'text-brand-orange'
                        }`}>
                          {ord.status}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="font-black text-sm text-gray-900 dark:text-white block">{formatCOP(ord.total)}</span>
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-stone-500 uppercase">{ord.paymentMethod || 'Digital'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm font-medium">No hay órdenes activas registradas.</div>
            )}
          </div>
          <div className="pt-3.5 mt-4 border-t border-gray-100 dark:border-stone-800/80 flex items-center justify-between text-xs text-gray-500 dark:text-stone-400">
            <span>Total registradas en el turno:</span>
            <span className="font-bold text-gray-900 dark:text-white">{orders.length} órdenes</span>
          </div>
        </div>

        {/* Monitoreo Operativo y Despacho */}
        <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-sm p-6 sm:p-7 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-orange" />
                <h3 className="font-bold text-sm tracking-wider uppercase text-gray-900 dark:text-white">Despacho y Logística</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                En Vivo
              </span>
            </div>

            {/* Badges de Estado Operativo - Paleta Limpia y Minimalista */}
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100/80 dark:bg-stone-800/80 text-gray-700 dark:text-stone-300 flex items-center gap-1.5">
                <ChefHat className="w-3.5 h-3.5 text-brand-orange" />
                Cocina Operativa
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100/80 dark:bg-stone-800/80 text-gray-700 dark:text-stone-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-brand-orange" />
                <span>{orders.filter(o => o.status === 'En Preparación' || o.status === 'Pagado' || o.status === 'Pendiente').length} en cocina</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100/80 dark:bg-stone-800/80 text-gray-700 dark:text-stone-300 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-brand-orange" />
                <span>{orders.filter(o => o.status === 'En Camino').length} en ruta</span>
              </span>
            </div>

            {/* Barras de Capacidad y Eficiencia Refinadas */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="font-medium text-gray-600 dark:text-stone-400">Capacidad de Cocina</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {Math.min(100, Math.max(15, orders.filter(o => o.status !== 'Entregado' && o.status !== 'entregado').length * 15))}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-orange rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(15, orders.filter(o => o.status !== 'Entregado' && o.status !== 'entregado').length * 15))}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="font-medium text-gray-600 dark:text-stone-400">Disponibilidad de Repartidores</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {staff.filter(s => s.role === 'Domiciliario' && s.active).length > 0 
                      ? `${staff.filter(s => s.role === 'Domiciliario' && s.active).length} activos` 
                      : '0 activos'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${staff.filter(s => s.role === 'Domiciliario' && s.active).length > 0 ? 100 : 20}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Grid 2x2 de Indicadores Operativos Armoniosos */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-2xl bg-gray-50/70 dark:bg-stone-900/50 border border-gray-100 dark:border-stone-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-stone-800 text-gray-700 dark:text-stone-300 flex items-center justify-center shrink-0 shadow-xs border border-gray-100 dark:border-stone-700">
                  <Clock className="w-4 h-4 text-brand-orange" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-stone-400 font-medium truncate">Tiempo Promedio</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">25 - 35 min</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50/70 dark:bg-stone-900/50 border border-gray-100 dark:border-stone-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-stone-800 text-gray-700 dark:text-stone-300 flex items-center justify-center shrink-0 shadow-xs border border-gray-100 dark:border-stone-700">
                  <Package className="w-4 h-4 text-brand-orange" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-stone-400 font-medium truncate">Listos p/ Entrega</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {orders.filter(o => o.status === 'Listos').length} pedido(s)
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50/70 dark:bg-stone-900/50 border border-gray-100 dark:border-stone-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-stone-800 text-gray-700 dark:text-stone-300 flex items-center justify-center shrink-0 shadow-xs border border-gray-100 dark:border-stone-700">
                  <Truck className="w-4 h-4 text-brand-orange" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-stone-400 font-medium truncate">Tarifa Plana</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{formatCOP(storeConfig.shippingRate || 0)}</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50/70 dark:bg-stone-900/50 border border-gray-100 dark:border-stone-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-stone-800 text-gray-700 dark:text-stone-300 flex items-center justify-center shrink-0 shadow-xs border border-gray-100 dark:border-stone-700">
                  <Users className="w-4 h-4 text-brand-orange" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-stone-400 font-medium truncate">Domiciliarios</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {staff.filter(s => s.role === 'Domiciliario' && s.active).length} disponibles
                  </p>
                </div>
              </div>
            </div>

            {/* Monitor de Despacho en Vivo - Contenedor Neutro Limpio */}
            <div className="pt-1">
              <div className="p-3 rounded-2xl bg-gray-50/70 dark:bg-stone-900/50 border border-gray-100 dark:border-stone-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-gray-800 dark:text-stone-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                    Estado de Ruta Inmediata
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-stone-400">
                    {orders.filter(o => o.status === 'En Camino').length > 0 ? 'Entregas en curso' : 'Sin demoras'}
                  </span>
                </div>
                {orders.filter(o => o.status === 'En Camino').length > 0 ? (
                  <div className="space-y-1.5">
                    {orders.filter(o => o.status === 'En Camino').slice(0, 2).map((ord) => (
                      <div key={ord.id} className="flex items-center justify-between text-xs bg-white dark:bg-stone-800/80 px-2.5 py-1.5 rounded-xl border border-gray-100 dark:border-stone-700">
                        <span className="font-semibold text-gray-800 dark:text-stone-200 truncate max-w-[170px]">
                          {ord.client || ord.id}: {ord.address}
                        </span>
                        <span className="text-[10px] font-bold text-brand-orange bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md shrink-0">
                          En camino
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-stone-400">
                    Todos los domicilios asignados han sido entregados con éxito. Flota lista para nuevos pedidos.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3.5 mt-3 border-t border-gray-100 dark:border-stone-800/80 flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-stone-400 font-medium">Acceso logístico:</span>
            <button 
              onClick={() => setActiveTab('map')} 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-50/80 dark:bg-brand-orange/10 text-brand-orange hover:bg-brand-orange hover:text-white dark:hover:bg-brand-orange dark:hover:text-white text-xs font-bold transition-all duration-200 shadow-xs active:scale-95 group cursor-pointer border border-brand-orange/20 hover:border-transparent"
            >
              <MapPin className="w-3.5 h-3.5 text-brand-orange group-hover:text-white transition-colors" />
              <span>Ver Mapa de Rutas</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Monitor Logístico y Rutas de Despacho (Mapa Interactivo)
  const renderMap = () => {
    const kitchenCoords: [number, number] = [2.9273, -75.2819];
    const activeDeliveryOrders = orders.filter(o => o.status === 'En Camino' || o.status === 'Listos');
    const enCaminoOrders = orders.filter(o => o.status === 'En Camino');
    const listosOrders = orders.filter(o => o.status === 'Listos');
    const activeDrivers = staff.filter(s => s.role === 'Domiciliario' && s.active);

    const getOrderCoords = (order: Order, idx: number): [number, number] => {
      if (order.lat && order.lng) return [order.lat, order.lng];
      const points: [number, number][] = [
        [2.9345, -75.2890],
        [2.9215, -75.2750],
        [2.9410, -75.2920],
        [2.9180, -75.2900],
        [2.9310, -75.2720],
        [2.9480, -75.2830],
      ];
      return points[idx % points.length];
    };

    // Iconos personalizados con diseño limpio de Copiway
    const kitchenIcon = L.divIcon({
      html: `<div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
               <div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(249, 115, 22, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
               <div style="background: linear-gradient(135deg, #ea580c, #f97316); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.5); border: 3px solid white;">
                 <span style="font-size: 16px;">🍔</span>
               </div>
             </div>`,
      className: 'custom-kitchen-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const driverIcon = L.divIcon({
      html: `<div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
               <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5); border: 3px solid white;">
                 <span style="font-size: 15px;">🛵</span>
               </div>
             </div>`,
      className: 'custom-driver-marker',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const clientIcon = L.divIcon({
      html: `<div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
               <svg viewBox="0 0 32 32" style="width: 32px; height: 32px; filter: drop-shadow(0 3px 6px rgba(16, 185, 129, 0.5));">
                 <path d="M16 0c-5.5 0-10 4.5-10 10 0 7.5 10 22 10 22s10-14.5 10-22c0-5.5-4.5-10-10-10z" fill="#10b981"/>
                 <circle cx="16" cy="10" r="6" fill="#fff"/>
                 <circle cx="16" cy="10" r="3" fill="#10b981"/>
               </svg>
             </div>`,
      className: 'custom-client-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    return (
      <div className="space-y-6">
        {/* Header con navegación rápida */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#151515] p-6 rounded-[28px] border border-gray-100 dark:border-stone-800 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-stone-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-gray-700 dark:text-stone-200 hover:text-brand-orange transition-colors flex items-center justify-center cursor-pointer shrink-0"
              title="Volver al Tablero"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                  Despacho y Rutas
                </h2>
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  GPS Activo
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-stone-400 mt-0.5">
                Ubicación en tiempo real de domiciliarios.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleNavigateToOrders()}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-stone-800 hover:bg-gray-200 dark:hover:bg-stone-700 text-xs font-bold text-gray-800 dark:text-stone-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Utensils className="w-4 h-4 text-brand-orange" />
              <span>Ver Comandas</span>
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-brand-orange text-white text-xs font-bold hover:bg-[#e66500] transition-colors flex items-center justify-center gap-2 shadow-md shadow-brand-orange/20 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Gestionar Repartidores</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Indicadores Limpias */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-stone-800 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-stone-800 text-gray-700 dark:text-stone-300 flex items-center justify-center shrink-0 border border-gray-100 dark:border-stone-700">
              <Truck className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500 dark:text-stone-400">En Camino</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {enCaminoOrders.length} {enCaminoOrders.length === 1 ? 'pedido' : 'pedidos'}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-stone-800 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-stone-800 text-gray-700 dark:text-stone-300 flex items-center justify-center shrink-0 border border-gray-100 dark:border-stone-700">
              <Package className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500 dark:text-stone-400">Listos en Cocina</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {listosOrders.length} {listosOrders.length === 1 ? 'pedido' : 'pedidos'}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-stone-800 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-stone-800 text-gray-700 dark:text-stone-300 flex items-center justify-center shrink-0 border border-gray-100 dark:border-stone-700">
              <Users className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500 dark:text-stone-400">Repartidores Activos</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {activeDrivers.length} {activeDrivers.length === 1 ? 'activo' : 'activos'}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-stone-800 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-stone-800 text-gray-700 dark:text-stone-300 flex items-center justify-center shrink-0 border border-gray-100 dark:border-stone-700">
              <MapPin className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500 dark:text-stone-400">Tarifa de Envío</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {formatCOP(storeConfig.shippingRate || 5000)}
              </p>
            </div>
          </div>
        </div>

        {/* Layout Principal: Mapa Interactivo + Panel Lateral */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Mapa Leaflet */}
          <div className="lg:col-span-2 bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm p-4 sm:p-6 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-brand-orange flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                    Rutas de Entrega
                  </h3>
                </div>
              </div>

              {/* Leyenda */}
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-stone-300 font-medium">
                  <span className="w-3 h-3 rounded-full bg-brand-orange shadow-sm border border-white" />
                  Sede Central
                </span>
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-stone-300 font-medium">
                  <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm border border-white" />
                  En Ruta
                </span>
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-stone-300 font-medium">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm border border-white" />
                  Cliente
                </span>
              </div>
            </div>

            {/* Contenedor del Mapa */}
            <div className="h-[460px] sm:h-[520px] w-full rounded-[24px] overflow-hidden relative border border-gray-100 dark:border-stone-800">
              <MapContainer
                center={kitchenCoords}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  url={theme === 'dark' 
                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                  attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap'
                />

                <CustomZoomControl />

                {/* Marcador Sede Central Dark Kitchen */}
                <Marker position={kitchenCoords} icon={kitchenIcon}>
                  <Popup>
                    <div className="p-1 text-center">
                      <p className="font-black text-brand-orange text-sm mb-0.5">🍔 Cocina Principal</p>
                      <p className="text-[11px] font-bold text-gray-500 mt-1">Cra 5 # 10-20</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Marcadores de Domiciliarios */}
                {activeDrivers.filter(d => d.location).map(driver => (
                  <Marker 
                    key={driver.id}
                    position={driver.location as [number, number]}
                    icon={driverIcon}
                  >
                    <Popup>
                      <div className="p-1">
                        <p className="font-black text-blue-600 text-xs">🛵 {driver.name}</p>
                        <p className="text-[11px] text-gray-600">{driver.phone}</p>
                        <p className="text-[10px] font-bold text-emerald-600 mt-1">
                          {driver.currentOrderId ? `Entregando pedido ${driver.currentOrderId}` : 'En patrullaje / Disponible'}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Marcadores y Rutas para Órdenes Activas */}
                {activeDeliveryOrders.map((ord, idx) => {
                  const destCoords = getOrderCoords(ord, idx);
                  const isEnCamino = ord.status === 'En Camino';

                  return (
                    <React.Fragment key={ord.id}>
                      {/* Trazo de Ruta */}
                      {isEnCamino && (
                        <RoutePolyline
                          origin={kitchenCoords}
                          destination={destCoords}
                          outerColor="rgba(249, 115, 22, 0.4)"
                          innerColor="#f97316"
                        />
                      )}

                      {/* Marcador de Destino del Cliente */}
                      <Marker position={destCoords} icon={clientIcon}>
                        <Popup>
                          <div className="p-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-gray-900 text-xs">{ord.id}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isEnCamino ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {ord.status}
                              </span>
                            </div>
                            <p className="font-bold text-xs text-gray-800">{ord.client || 'Cliente Copiway'}</p>
                            <p className="text-[11px] text-gray-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-brand-orange" /> {ord.address}
                            </p>
                            <p className="text-[11px] font-black text-brand-orange">
                              Total: {formatCOP(ord.total || 0)}
                            </p>
                            {ord.driverName && (
                              <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                                🛵 Domiciliario: <strong>{ord.driverName}</strong>
                              </p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}
              </MapContainer>

              {/* Overlay informativo en la esquina del mapa */}
              <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg border border-gray-200/80 dark:border-stone-800 text-xs z-[400] pointer-events-auto">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-gray-900 dark:text-white">
                    {enCaminoOrders.length > 0 ? `${enCaminoOrders.length} entrega(s) en trayecto` : 'Central lista para despacho'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Lateral: Domiciliarios y Despachos Activos */}
          <div className="space-y-6">
            {/* Flota de Domiciliarios */}
            <div className="bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-orange" />
                  Flota de Domiciliarios
                </h3>
                <span className="text-xs font-bold text-gray-500 dark:text-stone-400">
                  {activeDrivers.length} total
                </span>
              </div>

              <div className="space-y-3">
                {activeDrivers.map((driver) => {
                  const assignedOrder = orders.find(o => o.status === 'En Camino' && o.driverName === driver.name);

                  return (
                    <div 
                      key={driver.id} 
                      className="p-3.5 rounded-2xl bg-gray-50/90 dark:bg-stone-900/60 border border-gray-100 dark:border-stone-800 transition-all hover:border-brand-orange/30"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <p className="font-bold text-sm text-gray-900 dark:text-white">{driver.name}</p>
                          <p className="text-xs text-gray-500 dark:text-stone-400">
                            {driver.vehicle || 'Motocicleta'} {driver.plate ? `• ${driver.plate}` : ''}
                          </p>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          assignedOrder 
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30' 
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30'
                        }`}>
                          {assignedOrder ? 'EN RUTA' : 'DISPONIBLE'}
                        </span>
                      </div>

                      {assignedOrder ? (
                        <div className="mt-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-gray-100 dark:border-stone-700 text-xs">
                          <p className="font-semibold text-gray-800 dark:text-stone-200 truncate">
                            Llevando: {assignedOrder.id} • {assignedOrder.client}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-stone-400 truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-brand-orange shrink-0" />
                            {assignedOrder.address}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
                          En espera de asignación de pedido en cocina.
                        </p>
                      )}

                      {driver.phone && (
                        <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-stone-800 flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-stone-400">{driver.phone}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const clean = driver.phone.replace(/\D/g, '');
                              window.open(`https://wa.me/${clean.startsWith('57') ? clean : '57' + clean}`, '_blank');
                            }}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1"
                          >
                            <Share2 className="w-3 h-3" /> WhatsApp
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {activeDrivers.length === 0 && (
                  <div className="p-6 text-center text-gray-500 dark:text-stone-400 text-xs">
                    <p>No hay domiciliarios registrados como activos.</p>
                    <button
                      onClick={() => setActiveTab('staff')}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-orange text-white text-xs font-bold hover:bg-brand-orange/90 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" /> Registrar Domiciliario
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Pedidos en Curso */}
            <div className="bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Despachos Recientes
                </h3>
                <span className="text-xs font-bold text-gray-500 dark:text-stone-400">
                  {activeDeliveryOrders.length} activos
                </span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {activeDeliveryOrders.map((ord) => (
                  <div 
                    key={ord.id}
                    className="p-3 rounded-2xl bg-gray-50/90 dark:bg-stone-900/60 border border-gray-100 dark:border-stone-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 dark:text-white">{ord.id}</span>
                        <span className="font-bold text-brand-orange">{formatCOP(ord.total || 0)}</span>
                      </div>
                      <p className="font-medium text-gray-700 dark:text-stone-300 truncate mt-0.5">{ord.client || 'Cliente'}</p>
                      <p className="text-[11px] text-gray-500 dark:text-stone-400 truncate">{ord.address}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddressOrder(ord);
                        setNewAddress(ord.address || '');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 hover:bg-gray-100 text-[11px] font-bold text-gray-700 dark:text-stone-300 shrink-0 cursor-pointer"
                      title="Editar dirección en curso"
                    >
                      <Edit2 className="w-3 h-3 inline mr-1" />
                      Dirección
                    </button>
                  </div>
                ))}

                {activeDeliveryOrders.length === 0 && (
                  <div className="p-4 text-center text-gray-500 dark:text-stone-400 text-xs italic">
                    No hay entregas en camino en este momento.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // HU-18: Gestión de Menú
  const renderMenu = () => {
    const handleAddProduct = () => {
      if (!newProduct.name || !newProduct.price) return;
      
      const prodName = newProduct.name;
      const priceVal = parseInt(newProduct.price) || 0;

      // Calcular costo de producción según insumos y empaques del inventario
      const ingredientsCost = (newProduct.ingredients || []).reduce((acc: number, ing: ProductComponent) => {
        const invItem = inventory.find(i => i.name.toLowerCase() === ing.name.toLowerCase());
        const uCost = ing.cost || (invItem?.unitCost || (invItem?.totalCost && invItem?.stock ? Math.round(invItem.totalCost / invItem.stock) : 0));
        const qty = ing.quantity || 1;
        return acc + (uCost * qty);
      }, 0);

      const packagingCost = (newProduct.packaging || []).reduce((acc: number, pkg: ProductComponent) => {
        const invItem = inventory.find(i => i.name.toLowerCase() === pkg.name.toLowerCase());
        const uCost = pkg.cost || (invItem?.unitCost || (invItem?.totalCost && invItem?.stock ? Math.round(invItem.totalCost / invItem.stock) : 0));
        const qty = pkg.quantity || 1;
        return acc + (uCost * qty);
      }, 0);

      const totalRecipeCost = ingredientsCost + packagingCost;

      const defaultImages: Record<string, string> = {
        'Hamburguesas': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
        'Hamburguesas de Patacón': 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=800',
        'Perros Calientes': 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&q=80&w=800',
        'Mazorcadas': 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&q=80&w=800',
        'Salchipapas': 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&q=80&w=800',
        'Chorizos': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800',
        'Bebidas': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=800'
      };

      const finalImg = newProduct.image || defaultImages[newProduct.category] || defaultImages['Hamburguesas'];

      if (editingProductId) {
        updateProduct(editingProductId, {
          name: newProduct.name,
          description: newProduct.description,
          price: priceVal,
          image: finalImg,
          category: newProduct.category || 'Hamburguesas',
          badge: newProduct.badge || '',
          costPrice: totalRecipeCost,
          active: newProduct.active,
          ingredients: newProduct.ingredients,
          packaging: newProduct.packaging
        });
        showToast('success', 'El cambio ha sido guardado correctamente.', 'Producto Actualizado');
        setEditingProductId(null);
      } else {
        addProduct({
          id: Math.random().toString(36).substr(2, 9),
          name: newProduct.name,
          description: newProduct.description,
          price: priceVal,
          active: newProduct.active,
          image: finalImg,
          category: newProduct.category || 'Hamburguesas',
          badge: newProduct.badge || '',
          costPrice: totalRecipeCost,
          ingredients: newProduct.ingredients,
          packaging: newProduct.packaging
        });
        showToast('success', 'Tu producto ha sido creado exitosamente.', 'Producto Publicado');
      }
      setNewProduct({
        name: '',
        description: '',
        price: '',
        image: '',
        category: 'Hamburguesas',
        badge: '',
        active: true,
        ingredients: [],
        packaging: []
      });
      setTempIngredientName('');
      setIsProductModalOpen(false);
    };

    const handleEditProduct = (product: Product) => {
      setEditingProductId(product.id);
      setNewProduct({
        name: product.name,
        description: product.description || '',
        price: product.price ? product.price.toString() : '',
        image: product.image || '',
        category: product.category || 'Hamburguesas',
        badge: product.badge || '',
        active: product.active ?? true,
        ingredients: (product.ingredients || []).map((ing: ProductComponent | string) =>
          typeof ing === 'string' ? { id: 'i' + Math.random().toString(36).substr(2,5), name: ing, quantity: 1 } : ing
        ),
        packaging: (product.packaging || []).map((pkg: ProductComponent | string) =>
          typeof pkg === 'string' ? { id: 'p' + Math.random().toString(36).substr(2,5), name: pkg, quantity: 1 } : pkg
        )
      });
      setIsProductModalOpen(true);
    };

    const toggleProductStatus = (id: string) => {
      const product = products.find(p => p.id === id);
      if (product) {
        updateProduct(id, { active: !product.active });
        showToast('info', product.active ? `"${product.name}" marcado como Oculto` : `"${product.name}" marcado como Disponible`, 'Estado del Producto');
      }
    };

    const updatePrice = (id: string, price: string) => {
      updateProduct(id, { price: parseInt(price) });
      showToast('info', `Precio actualizado a ${formatCOP(parseInt(price))}`, 'Catálogo');
    };

    const configuredCategories = (storeConfig.categories && storeConfig.categories.length > 0)
      ? storeConfig.categories
      : DEFAULT_MENU_CATEGORIES;

    const allCategoriesList: string[] = [];
    configuredCategories.forEach(c => {
      if (c && !allCategoriesList.includes(c)) allCategoriesList.push(c);
    });
    products.forEach(p => {
      if (p.category && !allCategoriesList.includes(p.category)) {
        allCategoriesList.push(p.category);
      }
    });

    const catalogFilterCategories = ['Todas', ...allCategoriesList];

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-[28px] font-black tracking-tight text-gray-900 dark:text-white mb-1">Catálogo</h2>
            <p className="text-gray-600 dark:text-stone-400 font-medium text-sm">Administra productos, precios y recetas.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button 
              type="button"
              onClick={() => setIsCategoryManagerOpen(true)}
              className="bg-white dark:bg-stone-800 text-gray-700 dark:text-stone-300 border border-gray-200 dark:border-stone-700 px-4 py-2.5 rounded-full font-bold flex items-center gap-2 hover:border-brand-orange hover:text-brand-orange transition-colors text-sm shadow-xs cursor-pointer"
            >
              <Layers className="w-4 h-4 text-brand-orange" />
              Gestionar Categorías
            </button>
            <button 
              onClick={() => {
                setEditingProductId(null);
                setNewProduct({ name: '', description: '', price: '', image: '', category: 'Hamburguesas', badge: '', active: true, ingredients: [], packaging: [] });
                setTempIngredientName('');
                setIsProductModalOpen(true);
              }}
              className="bg-brand-orange text-white px-5 py-2.5 rounded-full font-bold flex items-center gap-2 hover:bg-[#e66500] transition-colors shadow-sm text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Crear Producto
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4 w-full">
          <div className="flex items-center bg-gray-50 dark:bg-stone-900 border border-gray-100 dark:border-stone-800 rounded-xl px-4 py-3 w-full">
            <Search className="w-5 h-5 text-gray-500 dark:text-stone-400 mr-2" />
            <input 
              type="text" 
              placeholder="Buscar en el catálogo por nombre o descripción..." 
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-gray-800 dark:text-stone-300 placeholder-gray-500 font-medium" 
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
          {catalogFilterCategories.map(cat => {
            const count = cat === 'Todas' 
              ? products.length 
              : products.filter(p => {
                  const pCat = p.category || (
                    p.name.toLowerCase().includes('hamburguesa') ? 'Hamburguesas de Pan' :
                    p.name.toLowerCase().includes('perro') || p.name.toLowerCase().includes('salchicha') ? 'Perros Calientes' :
                    p.name.toLowerCase().includes('salchipapa') ? 'Salchipapas' :
                    p.name.toLowerCase().includes('patacón') ? 'Hamburguesas de Patacón' :
                    'Otros'
                  );
                  return pCat.toLowerCase() === cat.toLowerCase() ||
                         (cat === 'Hamburguesas de Pan' && pCat.toLowerCase().includes('hamburguesa')) ||
                         (cat === 'Hamburguesas' && pCat.toLowerCase().includes('hamburguesa'));
                }).length;

            const isSelected = selectedCatalogCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCatalogCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-brand-orange text-white border-brand-orange shadow-xs'
                    : 'bg-white dark:bg-stone-900 text-gray-600 dark:text-stone-300 border-gray-200 dark:border-stone-800 hover:border-brand-orange hover:text-brand-orange'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gray-100 dark:bg-stone-800 text-gray-500 dark:text-stone-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setIsCategoryManagerOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border border-dashed border-gray-300 dark:border-stone-700 text-gray-500 hover:border-brand-orange hover:text-brand-orange flex items-center gap-1"
            title="Crear o administrar categorías"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Categoría</span>
          </button>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 p-8">
            <Utensils className="w-12 h-12 text-gray-300 dark:text-stone-700 mb-4" />
            <p className="text-gray-500 font-medium">El catálogo está vacío. Crea tu primer producto.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 p-8 text-center">
            <Utensils className="w-12 h-12 text-gray-300 dark:text-stone-700 mb-3" />
            <p className="text-gray-700 dark:text-stone-300 font-bold mb-1">No hay productos en la categoría "{selectedCatalogCategory}"</p>
            <p className="text-xs text-gray-500 dark:text-stone-400">Puedes crear un producto asignado a esta categoría o seleccionar otra pestaña.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3 sm:gap-6">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 flex flex-col overflow-hidden relative shadow-sm hover:shadow-md transition-shadow">
                <button
                  onClick={() => toggleProductStatus(product.id)}
                  className={`absolute top-2 right-2 sm:top-4 sm:right-4 backdrop-blur-sm px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg shadow-sm z-10 transition-colors ${
                    product.active 
                      ? 'bg-white/95 dark:bg-black/90 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-stone-800' 
                      : 'bg-red-500/90 text-white hover:bg-red-600/90'
                  }`}
                >
                  {product.active ? 'Disponible' : 'Oculto'}
                </button>
                
                {product.image ? (
                  <div className="h-28 sm:h-48 w-full overflow-hidden bg-gray-100 dark:bg-stone-800 relative">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    {product.badge && (
                      <span className="absolute bottom-2 left-2 bg-brand-orange text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                        {product.badge === 'Más Vendido' && <Flame className="w-3 h-3 text-white" />}
                        {product.badge === 'Recomendado' && <Star className="w-3 h-3 text-white" />}
                        {product.badge === 'Nuevo' && <Sparkles className="w-3 h-3 text-white" />}
                        {product.badge === 'Especialidad' && <Award className="w-3 h-3 text-white" />}
                        {product.badge}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="h-28 sm:h-48 w-full bg-gray-100 dark:bg-stone-800 flex items-center justify-center relative">
                    <Utensils className="w-10 h-10 text-gray-300 dark:text-stone-600" />
                    {product.badge && (
                      <span className="absolute bottom-2 left-2 bg-brand-orange text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                        {product.badge}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="p-3 sm:p-6 flex flex-col flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 dark:text-white text-[14px] sm:text-xl leading-tight pr-1 sm:pr-4 line-clamp-2">{product.name}</h3>
                  </div>
                  {product.description && (
                    <p className="hidden sm:block text-sm text-gray-500 dark:text-stone-400 mb-6 line-clamp-3 leading-relaxed">
                      {product.description}
                    </p>
                  )}
                  {!product.description && <div className="hidden sm:block mb-6"></div>}
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="bg-gray-50 dark:bg-stone-900/50 text-brand-orange px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl font-bold text-[12px] sm:text-sm whitespace-nowrap">
                      $ {product.price.toLocaleString('es-CO')}
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button 
                        onClick={() => handleEditProduct(product)}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 flex items-center justify-center text-gray-500 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-700 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          const prodName = product.name;
                          const prodId = product.id;
                          setConfirmModal({
                            isOpen: true,
                            title: 'Eliminar Producto del Menú',
                            message: `¿Estás seguro de eliminar permanentemente "${prodName}" del catálogo de Hamburguer Copiway? Esta acción no se puede deshacer.`,
                            confirmText: 'Sí, eliminar',
                            cancelText: 'Cancelar',
                            type: 'danger',
                            onConfirm: () => {
                              deleteProduct(prodId);
                              showToast('danger', 'El producto fue eliminado del catálogo.', 'Producto Eliminado');
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            }
                          });
                        }}
                        className="w-10 h-10 rounded-xl bg-white dark:bg-stone-800 border border-red-200 dark:border-red-900/30 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Product Modal & Escandallo Studio */}
      <AnimatePresence>
        {isProductModalOpen && (() => {
          const sellingPrice = parseInt(newProduct.price) || 0;
          const ingredientsCost = (newProduct.ingredients || []).reduce((acc: number, ing: ProductComponent) => {
            const invItem = inventory.find(i => i.name.toLowerCase() === ing.name.toLowerCase());
            const uCost = ing.cost || (invItem?.unitCost || (invItem?.totalCost && invItem?.stock ? Math.round(invItem.totalCost / invItem.stock) : 0));
            const qty = ing.quantity || 1;
            return acc + (uCost * qty);
          }, 0);

          const packagingCost = (newProduct.packaging || []).reduce((acc: number, pkg: ProductComponent) => {
            const invItem = inventory.find(i => i.name.toLowerCase() === pkg.name.toLowerCase());
            const uCost = pkg.cost || (invItem?.unitCost || (invItem?.totalCost && invItem?.stock ? Math.round(invItem.totalCost / invItem.stock) : 0));
            const qty = pkg.quantity || 1;
            return acc + (uCost * qty);
          }, 0);

          const totalCost = ingredientsCost + packagingCost;
          const profit = sellingPrice - totalCost;
          const marginPercent = sellingPrice > 0 ? ((profit / sellingPrice) * 100).toFixed(1) : '0';

          const presetImages: Record<string, { label: string; url: string }[]> = {
            'Hamburguesas': [
              { label: 'Clásica Gourmet', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800' },
              { label: 'Doble Carne & Queso', url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&q=80&w=800' },
              { label: 'Tocineta BBQ', url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=800' },
            ],
            'Hamburguesas de Patacón': [
              { label: 'Patacón Mixto', url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=800' },
              { label: 'Patacón Criollo', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800' },
            ],
            'Perros Calientes': [
              { label: 'Perro Especial', url: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&q=80&w=800' },
              { label: 'Perro Americano', url: 'https://images.unsplash.com/photo-1627054234553-63251a37c02b?auto=format&fit=crop&q=80&w=800' },
            ],
            'Mazorcadas': [
              { label: 'Mazorcada Mixta', url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&q=80&w=800' },
              { label: 'Mazorcada Pollo & Tocineta', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800' },
            ],
            'Salchipapas': [
              { label: 'Salchipapa Salvaje', url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&q=80&w=800' },
              { label: 'Salchipapa Especial', url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&q=80&w=800' },
            ],
            'Chorizos': [
              { label: 'Chorizo Santarrosano', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800' }
            ],
            'Bebidas': [
              { label: 'Gaseosa 400ml', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=800' },
              { label: 'Jugo Natural', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=800' }
            ]
          };

          const availableCategories = (storeConfig.categories && storeConfig.categories.length > 0)
            ? storeConfig.categories
            : DEFAULT_MENU_CATEGORIES;

          const currentPresets = presetImages[newProduct.category] || [
            { label: 'Plato Especial', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800' },
            { label: 'Combo Delicioso', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800' },
            { label: 'Snack & Acompañamiento', url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&q=80&w=800' },
            { label: 'Bebida Refrescante', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=800' },
          ];

          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white dark:bg-[#151515] w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-gray-100 dark:border-stone-800"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-stone-800 flex items-center justify-between bg-white dark:bg-stone-900">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/40 text-brand-orange flex items-center justify-center font-bold shadow-xs">
                      <Utensils className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                        {editingProductId ? 'Editar Producto' : 'Nuevo Producto'}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-stone-400 font-medium mt-0.5">
                        Configura la información comercial, ingredientes de receta y costeo de rentabilidad
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsProductModalOpen(false);
                      setEditingProductId(null);
                      setNewProduct({ name: '', description: '', price: '', image: '', category: 'Hamburguesas', badge: '', active: true, ingredients: [], packaging: [] });
                    }}
                    className="w-9 h-9 rounded-full bg-gray-100 dark:bg-stone-800 border border-gray-200 dark:border-stone-700 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body: Dual Column */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Form & Escandallo (7 cols) */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-gray-50 dark:bg-stone-900/60 p-5 rounded-2xl border border-gray-100 dark:border-stone-800 space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-brand-orange">1. Información Comercial</h3>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-stone-300 mb-1.5">Nombre del Producto *</label>
                        <input 
                          type="text" 
                          value={newProduct.name} 
                          onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange transition-all font-semibold" 
                          placeholder="Ej: Hamburguesa Copiway Especial" 
                        />
                      </div>

                      {/* Dynamic Category Selector (Pills) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-bold text-gray-700 dark:text-stone-300">Categoría del Menú</label>
                          <button
                            type="button"
                            onClick={() => setIsInlineAddingCategory(!isInlineAddingCategory)}
                            className="text-[11px] font-bold text-brand-orange hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            {isInlineAddingCategory ? 'Cerrar' : 'Nueva Categoría'}
                          </button>
                        </div>

                        {isInlineAddingCategory && (
                          <div className="mb-3 p-3 bg-white dark:bg-stone-800 border border-orange-200 dark:border-orange-900/40 rounded-xl space-y-2">
                            <label className="block text-[11px] font-bold text-gray-600 dark:text-stone-300">
                              Crear nueva categoría para el menú:
                            </label>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={inlineCategoryName}
                                onChange={e => setInlineCategoryName(e.target.value)}
                                placeholder="Ej: Combos, Postres, Desgranados..."
                                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-stone-700 bg-gray-50 dark:bg-stone-900 text-xs text-gray-900 dark:text-white outline-none focus:border-brand-orange"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (inlineCategoryName.trim()) {
                                      const catName = inlineCategoryName.trim();
                                      addCategory(catName);
                                      setNewProduct({ ...newProduct, category: catName });
                                      setInlineCategoryName('');
                                      setIsInlineAddingCategory(false);
                                      showToast('success', 'La categoría se agregó correctamente al menú.', 'Categoría Creada');
                                    }
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (inlineCategoryName.trim()) {
                                    const catName = inlineCategoryName.trim();
                                    addCategory(catName);
                                    setNewProduct({ ...newProduct, category: catName });
                                    setInlineCategoryName('');
                                    setIsInlineAddingCategory(false);
                                    showToast('success', 'La categoría se agregó correctamente al menú.', 'Categoría Creada');
                                  }
                                }}
                                className="px-3 py-1.5 bg-brand-orange text-white text-xs font-bold rounded-lg hover:bg-[#e66500] transition-colors"
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {availableCategories.map(cat => {
                            const isSelected = newProduct.category === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setNewProduct({ ...newProduct, category: cat })}
                                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-center border truncate ${
                                  isSelected 
                                    ? 'bg-brand-orange text-white border-brand-orange shadow-xs' 
                                    : 'bg-white dark:bg-stone-800 text-gray-700 dark:text-stone-300 border-gray-200 dark:border-stone-700 hover:border-brand-orange/50'
                                }`}
                                title={cat}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selling Price */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-stone-300 mb-1.5">Precio de Venta ($ COP) *</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                          <input 
                            type="number" 
                            value={newProduct.price} 
                            onChange={e => setNewProduct({...newProduct, price: e.target.value})} 
                            className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-brand-orange" 
                            placeholder="Ej: 24000" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Image Selection */}
                    <div className="bg-gray-50 dark:bg-stone-900/60 p-5 rounded-2xl border border-gray-100 dark:border-stone-800 space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-brand-orange">2. Imagen del Producto</h3>
                      
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        <span className="text-xs font-bold text-gray-500 shrink-0">Fotos rápidas:</span>
                        {currentPresets.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setNewProduct({...newProduct, image: preset.url})}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                              newProduct.image === preset.url
                                ? 'bg-brand-orange text-white border-brand-orange'
                                : 'bg-white dark:bg-stone-800 text-gray-700 dark:text-stone-300 border-gray-200 dark:border-stone-700 hover:border-brand-orange'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newProduct.image}
                          onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                          placeholder="O pega una URL de imagen (https://...)"
                          className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-gray-900 dark:text-white outline-none focus:border-brand-orange"
                        />
                        <label className="px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 text-xs font-bold text-gray-700 dark:text-stone-300 hover:bg-gray-100 cursor-pointer flex items-center gap-1.5 transition-colors">
                          <Plus className="w-3.5 h-3.5" /> Subir
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={e => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setNewProduct({...newProduct, image: reader.result as string});
                                };
                                reader.readAsDataURL(file);
                              }
                            }} 
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Recipe / Escandallo Builder */}
                    <div className="bg-gray-50 dark:bg-stone-900/60 p-5 rounded-2xl border border-gray-100 dark:border-stone-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ChefHat className="w-4 h-4 text-brand-orange" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">3. Receta e Insumos (Escandallo)</h3>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange">
                          {newProduct.ingredients.length} {newProduct.ingredients.length === 1 ? 'insumo' : 'insumos'}
                        </span>
                      </div>

                      {/* Add Ingredient Bar */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 relative">
                          <input 
                            type="text" 
                            value={tempIngredientName}
                            onChange={(e) => setTempIngredientName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && tempIngredientName.trim()) {
                                e.preventDefault();
                                const invItem = inventory.find(i => i.name.toLowerCase() === tempIngredientName.trim().toLowerCase());
                                const uCost = invItem?.unitCost || (invItem?.totalCost && invItem?.stock ? Math.round(invItem.totalCost / invItem.stock) : 0);
                                const newIngs = [...(newProduct.ingredients || []), { 
                                  id: 'v' + Math.random().toString(36).substr(2,5), 
                                  name: tempIngredientName.trim(),
                                  quantity: 1,
                                  cost: uCost
                                }];
                                setNewProduct({
                                  ...newProduct, 
                                  ingredients: newIngs,
                                  description: newIngs.map(i => i.name).join(', ')
                                });
                                setTempIngredientName('');
                              }
                            }}
                            placeholder="Escribe insumo o pulsa agregar..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-gray-900 dark:text-white outline-none focus:border-brand-orange font-medium"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (tempIngredientName.trim()) {
                                const invItem = inventory.find(i => i.name.toLowerCase() === tempIngredientName.trim().toLowerCase());
                                const uCost = invItem?.unitCost || (invItem?.totalCost && invItem?.stock ? Math.round(invItem.totalCost / invItem.stock) : 0);
                                const newIngs = [...(newProduct.ingredients || []), { 
                                  id: 'v' + Math.random().toString(36).substr(2,5), 
                                  name: tempIngredientName.trim(),
                                  quantity: 1,
                                  cost: uCost
                                }];
                                setNewProduct({
                                  ...newProduct, 
                                  ingredients: newIngs,
                                  description: newIngs.map(i => i.name).join(', ')
                                });
                                setTempIngredientName('');
                              }
                            }}
                            disabled={!tempIngredientName.trim()}
                            className="px-3.5 py-2.5 rounded-xl bg-brand-orange text-white text-xs font-bold hover:bg-[#e66500] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Agregar
                          </button>
                        </div>
                      </div>

                      {/* Quick Select from Inventory */}
                      {inventory.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold text-gray-500 dark:text-stone-400 block mb-1.5">Añadir rápido desde inventario:</span>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white/60 dark:bg-stone-800/40 rounded-xl border border-gray-100 dark:border-stone-700/60">
                            {inventory
                              .filter(inv => inv.category !== 'Empaques & Desechables')
                              .map(inv => {
                              const alreadyAdded = (newProduct.ingredients || []).some(i => i.name.toLowerCase() === inv.name.toLowerCase());
                              const uCost = inv.unitCost || (inv.totalCost && inv.stock ? Math.round(inv.totalCost / inv.stock) : 0);
                              return (
                                <button
                                  key={inv.id}
                                  type="button"
                                  onClick={() => {
                                    if (alreadyAdded) {
                                      const idx = newProduct.ingredients.findIndex(i => i.name.toLowerCase() === inv.name.toLowerCase());
                                      const updated = [...newProduct.ingredients];
                                      updated[idx] = { ...updated[idx], quantity: (updated[idx].quantity || 1) + 1 };
                                      setNewProduct({ ...newProduct, ingredients: updated });
                                    } else {
                                      const newIngs = [...(newProduct.ingredients || []), { 
                                        id: 'i' + Math.random().toString(36).substr(2,5), 
                                        name: inv.name, 
                                        quantity: 1, 
                                        cost: uCost 
                                      }];
                                      setNewProduct({
                                        ...newProduct, 
                                        ingredients: newIngs,
                                        description: newIngs.map(i => i.name).join(', ')
                                      });
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 border ${
                                    alreadyAdded 
                                      ? 'bg-orange-50 dark:bg-orange-950/30 text-brand-orange border-orange-200 dark:border-orange-800'
                                      : 'bg-white dark:bg-stone-800 text-gray-700 dark:text-stone-300 border-gray-200 dark:border-stone-700 hover:border-brand-orange/60'
                                  }`}
                                >
                                  <Plus className="w-3 h-3 text-brand-orange" />
                                  <span>{inv.name}</span>
                                  <span className="text-[10px] text-gray-400 font-medium">({inv.stock} {inv.unit || 'un.'})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Ingredients List */}
                      <div className="space-y-2">
                        {newProduct.ingredients.length === 0 ? (
                          <div className="text-center py-6 border border-dashed border-gray-200 dark:border-stone-700 rounded-xl">
                            <Utensils className="w-6 h-6 text-gray-300 dark:text-stone-600 mx-auto mb-1.5" />
                            <p className="text-xs text-gray-500 dark:text-stone-400 font-medium">No has asignado insumos a esta receta.</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Selecciona del inventario arriba para calcular el costo de insumos.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {(newProduct.ingredients || []).map((ing: ProductComponent, idx: number) => {
                              const invItem = inventory.find(i => i.name.toLowerCase() === ing.name.toLowerCase());
                              const uCost = ing.cost || (invItem?.unitCost || (invItem?.totalCost && invItem?.stock ? Math.round(invItem.totalCost / invItem.stock) : 0));
                              const lineCost = uCost * (ing.quantity || 1);

                              return (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-stone-800 border border-gray-200/80 dark:border-stone-700 text-xs shadow-xs">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-brand-orange flex items-center justify-center font-bold shrink-0">
                                      <Package className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-gray-900 dark:text-white truncate">{ing.name}</p>
                                      <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-stone-400">
                                        <span>$ {uCost.toLocaleString('es-CO')} c/u</span>
                                        {invItem ? (
                                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">• Stock: {invItem.stock}</span>
                                        ) : (
                                          <span className="text-amber-500 font-semibold">• Manual</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    {/* Stepper */}
                                    <div className="flex items-center border border-gray-200 dark:border-stone-700 rounded-lg bg-gray-50 dark:bg-stone-900 overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newQty = Math.max(1, (ing.quantity || 1) - 1);
                                          const updated = [...newProduct.ingredients];
                                          updated[idx] = { ...updated[idx], quantity: newQty };
                                          setNewProduct({ ...newProduct, ingredients: updated });
                                        }}
                                        className="w-6 h-6 flex items-center justify-center text-gray-600 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 font-bold"
                                      >
                                        -
                                      </button>
                                      <span className="w-7 text-center font-bold text-xs text-gray-900 dark:text-white">
                                        {ing.quantity || 1}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newQty = (ing.quantity || 1) + 1;
                                          const updated = [...newProduct.ingredients];
                                          updated[idx] = { ...updated[idx], quantity: newQty };
                                          setNewProduct({ ...newProduct, ingredients: updated });
                                        }}
                                        className="w-6 h-6 flex items-center justify-center text-gray-600 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 font-bold"
                                      >
                                        +
                                      </button>
                                    </div>

                                    <span className="font-black text-gray-900 dark:text-white min-w-[70px] text-right">
                                      {formatCOP(lineCost)}
                                    </span>

                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newIngs = (newProduct.ingredients || []).filter((_, i) => i !== idx);
                                        setNewProduct({
                                          ...newProduct,
                                          ingredients: newIngs,
                                          description: newIngs.map(i => i.name).join(', ')
                                        });
                                      }}
                                      className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-colors"
                                      title="Eliminar insumo de la receta"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Total Recipe Cost Banner */}
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-stone-800 rounded-xl border border-gray-200 dark:border-stone-700 text-xs">
                        <span className="font-bold text-gray-600 dark:text-stone-400">Costo de insumos por porción:</span>
                        <span className="font-black text-sm text-gray-900 dark:text-white">{formatCOP(ingredientsCost)}</span>
                      </div>

                      <div className="pt-4 border-t border-gray-100 dark:border-stone-700/60 mt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center">
                            <Box className="w-4 h-4" />
                          </div>
                          <h4 className="text-[13px] font-black text-gray-900 dark:text-white uppercase tracking-tight">Desechables y Empaques</h4>
                        </div>

                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <input
                                type="text"
                                value={tempPackagingName}
                                onChange={(e) => setTempPackagingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (tempPackagingName.trim()) {
                                      const invItem = inventory.find(i => i.name.toLowerCase() === tempPackagingName.trim().toLowerCase());
                                      const uCost = invItem?.unitCost || (invItem?.totalCost && invItem?.stock ? Math.round(invItem.totalCost / invItem.stock) : 0);
                                      const newPkg = [...(newProduct.packaging || []), { 
                                        id: 'p' + Math.random().toString(36).substr(2,5), 
                                        name: tempPackagingName.trim(),
                                        quantity: 1,
                                        cost: uCost
                                      }];
                                      setNewProduct({
                                        ...newProduct, 
                                        packaging: newPkg
                                      });
                                      setTempPackagingName('');
                                    }
                                  }
                                }}
                                placeholder="Escribe empaque o desechable..."
                                className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500 font-medium"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (tempPackagingName.trim()) {
                                  const invItem = inventory.find(i => i.name.toLowerCase() === tempPackagingName.trim().toLowerCase());
                                  const uCost = invItem?.unitCost || (invItem?.totalCost && invItem?.stock ? Math.round(invItem.totalCost / invItem.stock) : 0);
                                  const newPkg = [...(newProduct.packaging || []), { 
                                    id: 'p' + Math.random().toString(36).substr(2,5), 
                                    name: tempPackagingName.trim(),
                                    quantity: 1,
                                    cost: uCost
                                  }];
                                  setNewProduct({
                                    ...newProduct, 
                                    packaging: newPkg
                                  });
                                  setTempPackagingName('');
                                }
                              }}
                              disabled={!tempPackagingName.trim()}
                              className="px-3.5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" /> Agregar
                            </button>
                          </div>

                          {/* Quick Select from Inventory for Packaging */}
                          {inventory.some(i => i.category === 'Empaques & Desechables') && (
                            <div className="mt-1">
                              <span className="text-[11px] font-bold text-gray-500 dark:text-stone-400 block mb-1.5">Añadir rápido desde inventario:</span>
                              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white/60 dark:bg-stone-800/40 rounded-xl border border-gray-100 dark:border-stone-700/60">
                                {inventory
                                  .filter(inv => inv.category === 'Empaques & Desechables')
                                  .map(inv => {
                                  const alreadyAdded = (newProduct.packaging || []).some(p => p.name.toLowerCase() === inv.name.toLowerCase());
                                  const uCost = inv.unitCost || (inv.totalCost && inv.stock ? Math.round(inv.totalCost / inv.stock) : 0);
                                  return (
                                    <button
                                      key={inv.id}
                                      type="button"
                                      onClick={() => {
                                        if (alreadyAdded) {
                                          const idx = newProduct.packaging.findIndex(p => p.name.toLowerCase() === inv.name.toLowerCase());
                                          const updated = [...newProduct.packaging];
                                          updated[idx] = { ...updated[idx], quantity: (updated[idx].quantity || 1) + 1 };
                                          setNewProduct({ ...newProduct, packaging: updated });
                                        } else {
                                          const newPkg = [...(newProduct.packaging || []), { 
                                            id: 'p' + Math.random().toString(36).substr(2,5), 
                                            name: inv.name, 
                                            quantity: 1, 
                                            cost: uCost 
                                          }];
                                          setNewProduct({ ...newProduct, packaging: newPkg });
                                        }
                                      }}
                                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                                        alreadyAdded 
                                          ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400 shadow-sm' 
                                          : 'bg-white border-gray-200 text-gray-600 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-400 hover:border-blue-400'
                                      }`}
                                    >
                                      {alreadyAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                      {inv.name}
                                      <span className="opacity-60 font-normal">({inv.stock} {inv.unit})</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Packaging List */}
                          <div className="space-y-2">
                            {(!newProduct.packaging || newProduct.packaging.length === 0) ? (
                              <div className="text-center py-6 border border-dashed border-gray-200 dark:border-stone-700 rounded-xl bg-gray-50/50 dark:bg-stone-900/30">
                                <Box className="w-6 h-6 text-gray-300 dark:text-stone-600 mx-auto mb-1.5" />
                                <p className="text-xs text-gray-500 dark:text-stone-400 font-medium">No has asignado empaques.</p>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {newProduct.packaging.map((pkg: ProductComponent, idx: number) => {
                                  const invItem = inventory.find(i => i.name.toLowerCase() === pkg.name.toLowerCase());
                                  const uCost = pkg.cost || (invItem?.unitCost || (invItem?.totalCost && invItem?.stock ? Math.round(invItem.totalCost / invItem.stock) : 0));
                                  const lineCost = uCost * (pkg.quantity || 1);

                                  return (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-stone-800 border border-gray-200/80 dark:border-stone-700 text-xs shadow-xs">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center font-bold shrink-0">
                                          <Box className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-bold text-gray-900 dark:text-white truncate">{pkg.name}</p>
                                          <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-stone-400">
                                            <span>$ {uCost.toLocaleString('es-CO')} c/u</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex items-center border border-gray-200 dark:border-stone-700 rounded-lg bg-gray-50 dark:bg-stone-900 overflow-hidden">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newQty = Math.max(1, (pkg.quantity || 1) - 1);
                                              const updated = [...newProduct.packaging];
                                              updated[idx] = { ...updated[idx], quantity: newQty };
                                              setNewProduct({ ...newProduct, packaging: updated });
                                            }}
                                            className="w-6 h-6 flex items-center justify-center text-gray-600 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 font-bold"
                                          >
                                            -
                                          </button>
                                          <span className="w-7 text-center font-bold text-xs text-gray-900 dark:text-white">
                                            {pkg.quantity || 1}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newQty = (pkg.quantity || 1) + 1;
                                              const updated = [...newProduct.packaging];
                                              updated[idx] = { ...updated[idx], quantity: newQty };
                                              setNewProduct({ ...newProduct, packaging: updated });
                                            }}
                                            className="w-6 h-6 flex items-center justify-center text-gray-600 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 font-bold"
                                          >
                                            +
                                          </button>
                                        </div>

                                        <span className="font-black text-gray-900 dark:text-white min-w-[70px] text-right">
                                          {formatCOP(lineCost)}
                                        </span>

                                        <button 
                                          type="button"
                                          onClick={() => {
                                            const newPkg = (newProduct.packaging || []).filter((_, i) => i !== idx);
                                            setNewProduct({ ...newProduct, packaging: newPkg });
                                          }}
                                          className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Total Recipe Cost Banner */}
                      <div className="flex flex-col gap-2 p-3 bg-brand-orange/5 dark:bg-brand-orange/10 rounded-xl border border-brand-orange/20 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-600 dark:text-stone-400">Costo de insumos:</span>
                          <span className="font-bold text-gray-900 dark:text-white">{formatCOP(ingredientsCost)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-600 dark:text-stone-400">Costo de empaques:</span>
                          <span className="font-bold text-gray-900 dark:text-white">{formatCOP(packagingCost)}</span>
                        </div>
                        <div className="pt-2 border-t border-brand-orange/20 flex items-center justify-between">
                          <span className="font-black text-gray-900 dark:text-white">COSTO TOTAL POR PORCIÓN:</span>
                          <span className="font-black text-base text-brand-orange">{formatCOP(totalCost)}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-stone-300 mb-1.5">Descripción para el Menú</label>
                        <textarea 
                          value={newProduct.description || ''} 
                          onChange={e => setNewProduct({...newProduct, description: e.target.value})} 
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-gray-900 dark:text-white outline-none focus:border-brand-orange resize-none h-16 font-medium" 
                          placeholder="Ej: Deliciosa carne artesanal 150g, queso fundido, tocineta ahumada y pan brioche recién horneado."
                        />
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Live Card Preview & Cost Analysis (5 cols) */}
                  <div className="lg:col-span-5 space-y-5">
                    
                    {/* Financial Analysis Box (Light/Dark Adapted & Simple) */}
                    <div className="bg-white dark:bg-stone-900 text-gray-900 dark:text-white p-5 rounded-3xl shadow-sm space-y-4 border border-gray-200 dark:border-stone-800">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-stone-800 pb-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-brand-orange" />
                          <span className="text-xs font-black tracking-wider uppercase text-gray-900 dark:text-white">Análisis de Rentabilidad</span>
                        </div>
                        <span className="text-[11px] bg-brand-orange/10 text-brand-orange font-bold px-2.5 py-0.5 rounded-full">
                          Tiempo Real
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-stone-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-stone-700/50">
                          <span className="text-[10px] text-gray-500 dark:text-stone-400 uppercase font-bold block">1. Costo de Insumos</span>
                          <p className="text-base font-black text-gray-900 dark:text-white mt-1">{formatCOP(totalCost)}</p>
                          <span className="text-[10px] text-gray-400 font-medium">Gasto en ingredientes</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-stone-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-stone-700/50">
                          <span className="text-[10px] text-gray-500 dark:text-stone-400 uppercase font-bold block">2. Precio de Venta</span>
                          <p className="text-base font-black text-brand-orange mt-1">{formatCOP(sellingPrice)}</p>
                          <span className="text-[10px] text-gray-400 font-medium">Cobro al cliente</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-stone-800/90 border border-orange-100 dark:border-stone-700 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-gray-500 dark:text-stone-400 uppercase font-bold block">Ganancia Neta por Unidad</span>
                          <p className={`text-xl font-black mt-0.5 ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {formatCOP(profit)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-500 dark:text-stone-400 uppercase font-bold block">Margen de Ganancia</span>
                          <span className={`text-sm font-black px-3 py-1 rounded-xl inline-block mt-0.5 border ${
                            parseFloat(marginPercent) >= 50 ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                            parseFloat(marginPercent) >= 30 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                            'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                          }`}>
                            {marginPercent}%
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-500 dark:text-stone-400 font-medium leading-relaxed">
                        {sellingPrice > 0 
                          ? `Por cada plato vendido a ${formatCOP(sellingPrice)}, obtienes ${formatCOP(profit)} libres tras descontar el valor de los insumos.`
                          : 'Ingresa el precio de venta para calcular la ganancia neta y el margen porcentual.'}
                      </p>
                    </div>

                    {/* Live Preview Card */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider">Vista Previa en Menú</span>
                        <span className="text-[10px] text-brand-orange font-bold">Vista del cliente</span>
                      </div>

                      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-gray-200 dark:border-stone-800 overflow-hidden shadow-md">
                        <div className="relative h-44 w-full bg-gray-100 dark:bg-stone-800 overflow-hidden">
                          <img 
                            src={newProduct.image || currentPresets[0]?.url} 
                            alt={newProduct.name || 'Preview'} 
                            className="w-full h-full object-cover"
                          />
                          {newProduct.badge && (
                            <span className="absolute top-3 left-3 bg-brand-orange text-white text-[11px] font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                              {newProduct.badge === 'Más Vendido' && <Flame className="w-3 h-3 text-white" />}
                              {newProduct.badge === 'Recomendado' && <Star className="w-3 h-3 text-white" />}
                              {newProduct.badge === 'Nuevo' && <Sparkles className="w-3 h-3 text-white" />}
                              {newProduct.badge === 'Especialidad' && <Award className="w-3 h-3 text-white" />}
                              {newProduct.badge}
                            </span>
                          )}
                        </div>

                        <div className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-orange">
                                {newProduct.category}
                              </span>
                              <h4 className="text-base font-black text-gray-900 dark:text-white leading-tight">
                                {newProduct.name || 'Nombre del Producto'}
                              </h4>
                            </div>
                            <span className="text-base font-black text-brand-orange">
                              {formatCOP(sellingPrice)}
                            </span>
                          </div>

                          <p className="text-xs text-gray-500 dark:text-stone-400 line-clamp-2">
                            {newProduct.description || (newProduct.ingredients.length > 0 ? 'Ingredientes: ' + newProduct.ingredients.map(i => i.name).join(', ') : 'Sin ingredientes asignados aún')}
                          </p>

                          <div className="pt-2 border-t border-gray-100 dark:border-stone-800 flex items-center justify-between">
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Disponible
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-brand-orange text-white text-xs font-bold">
                              + Agregar
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Footer Buttons */}
                <div className="p-5 border-t border-gray-100 dark:border-stone-800 bg-gray-50 dark:bg-stone-900/50 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsProductModalOpen(false);
                      setEditingProductId(null);
                      setNewProduct({ name: '', description: '', price: '', image: '', category: 'Hamburguesas', badge: '', active: true, ingredients: [], packaging: [] });
                    }}
                    className="flex-1 py-3.5 rounded-full font-bold transition-colors bg-white dark:bg-stone-800 text-gray-900 dark:text-white border border-gray-200 dark:border-stone-700 hover:bg-gray-50 dark:hover:bg-stone-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button"
                    onClick={handleAddProduct} 
                    className="flex-1 py-3.5 rounded-full font-bold transition-colors bg-brand-orange text-white shadow-lg shadow-brand-orange/20 hover:bg-[#e66500] cursor-pointer"
                  >
                    {editingProductId ? 'Guardar Cambios de Producto' : 'Guardar y Publicar en Menú'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Category Management Modal */}
      <AnimatePresence>
        {isCategoryManagerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#151515] w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-gray-100 dark:border-stone-800"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-stone-800 flex items-center justify-between bg-white dark:bg-stone-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/40 text-brand-orange flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                      Categorías del Menú
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-stone-400 font-medium">
                      Personaliza las categorías de la carta y la página web
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCategoryManagerOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-stone-800 border border-gray-200 dark:border-stone-700 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Form to Add Category */}
                <div className="bg-gray-50 dark:bg-stone-900/60 p-4 rounded-2xl border border-gray-100 dark:border-stone-800 space-y-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-stone-300">
                    Nueva Categoría
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryInput}
                      onChange={e => setNewCategoryInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newCategoryInput.trim()) {
                            addCategory(newCategoryInput.trim());
                            showToast('success', 'La categoría se agregó correctamente al menú.', 'Categoría Creada');
                            setNewCategoryInput('');
                          }
                        }
                      }}
                      placeholder="Ej: Combos Especiales, Postres, Desgranados..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCategoryInput.trim()) {
                          addCategory(newCategoryInput.trim());
                          showToast('success', 'La categoría se agregó correctamente al menú.', 'Categoría Creada');
                          setNewCategoryInput('');
                        }
                      }}
                      className="px-4 py-2.5 bg-brand-orange text-white text-xs font-bold rounded-xl hover:bg-[#e66500] transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar
                    </button>
                  </div>
                </div>

                {/* List of current categories */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-stone-400 mb-3">
                    Categorías Activas ({((storeConfig.categories && storeConfig.categories.length > 0) ? storeConfig.categories : DEFAULT_MENU_CATEGORIES).length})
                  </h4>
                  <div className="space-y-2">
                    {((storeConfig.categories && storeConfig.categories.length > 0) ? storeConfig.categories : DEFAULT_MENU_CATEGORIES).map(cat => {
                      const count = products.filter(p => {
                        const pCat = p.category || (
                          p.name.toLowerCase().includes('hamburguesa') ? 'Hamburguesas de Pan' :
                          p.name.toLowerCase().includes('perro') || p.name.toLowerCase().includes('salchicha') ? 'Perros Calientes' :
                          p.name.toLowerCase().includes('salchipapa') ? 'Salchipapas' :
                          p.name.toLowerCase().includes('patacón') ? 'Hamburguesas de Patacón' :
                          'Otros'
                        );
                        return pCat.toLowerCase() === cat.toLowerCase() ||
                               (cat === 'Hamburguesas de Pan' && pCat.toLowerCase().includes('hamburguesa')) ||
                               (cat === 'Hamburguesas' && pCat.toLowerCase().includes('hamburguesa'));
                      }).length;

                      return (
                        <div
                          key={cat}
                          className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-stone-900 border border-gray-100 dark:border-stone-800 shadow-xs hover:border-gray-200 dark:hover:border-stone-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-brand-orange"></span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{cat}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-400">
                              {count} {count === 1 ? 'producto' : 'productos'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Eliminar Categoría',
                                  message: `¿Estás seguro de eliminar la categoría "${cat}" del menú? Los productos asociados permanecerán en el sistema.`,
                                  confirmText: 'Eliminar',
                                  type: 'danger',
                                  onConfirm: () => {
                                    removeCategory(cat);
                                    if (selectedCatalogCategory === cat) {
                                      setSelectedCatalogCategory('Todas');
                                    }
                                    showToast('info', `Categoría "${cat}" eliminada`, 'Categorías');
                                  }
                                });
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar categoría"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 dark:border-stone-800 bg-gray-50 dark:bg-stone-900/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsCategoryManagerOpen(false)}
                  className="px-6 py-2.5 rounded-full font-bold bg-brand-orange text-white text-xs hover:bg-[#e66500] transition-colors cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>
    );
  };

  // HU-25: Inventario Express
  const renderInventory = () => {
    const handleAddItem = () => {
      if (!newItem.name.trim() || !newItem.stock) return;
      const stockNum = parseInt(newItem.stock) || 0;
      const totalCostNum = parseFloat(newItem.totalCost) || 0;
      const unitCostNum = stockNum > 0 && totalCostNum > 0 ? totalCostNum / stockNum : 0;
      const itemName = newItem.name.trim();
      const itemUnit = newItem.unit || 'Unidades';

      addInventoryItem({
        id: Date.now().toString(),
        name: itemName,
        stock: stockNum,
        totalCost: totalCostNum,
        unitCost: unitCostNum,
        unit: itemUnit,
        category: newItem.category || 'General',
        supplier: newItem.supplier?.trim() || '',
        notes: newItem.notes?.trim() || '',
        createdAt: new Date().toISOString()
      });

      showToast('inventory', 'El insumo ha sido guardado exitosamente.', 'Insumo Registrado');

      setNewItem({
        name: '',
        stock: '',
        totalCost: '',
        unit: 'Unidades',
        category: 'General',
        supplier: '',
        notes: ''
      });
      setIsInventoryModalOpen(false);
    };

    const addStock = (id: string, amountStr: string) => {
      const amount = parseInt(amountStr);
      if (isNaN(amount) || amount <= 0) return;
      const targetItem = inventory.find(i => i.id === id);
      updateInventoryStock(id, amount);
      showToast('inventory', 'La cantidad del insumo fue actualizada.', 'Stock Actualizado');
    };

    const criticalItemsCount = inventory.filter(i => (i.stock || 0) <= 10).length;
    const totalInventoryUnits = inventory.reduce((acc, curr) => acc + (curr.stock || 0), 0);
    const totalInventoryValuation = inventory.reduce((acc, curr) => {
      const uCost = curr.unitCost || (curr.totalCost && curr.stock ? curr.totalCost / curr.stock : 0);
      return acc + ((curr.stock || 0) * uCost);
    }, 0);

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
        {/* Header with Registrar Insumo button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-[28px] font-black tracking-tight text-gray-900 dark:text-white mb-2">Abastecimiento Express</h2>
            <p className="text-gray-600 dark:text-stone-400 font-medium">Actualización rápida de existencias.</p>
          </div>
          <button
            onClick={() => {
              setNewItem({
                name: '',
                stock: '',
                totalCost: '',
                unit: 'Unidades',
                category: 'General',
                supplier: '',
                notes: ''
              });
              setIsInventoryModalOpen(true);
            }}
            className="bg-brand-orange text-white px-6 py-3.5 rounded-full font-bold hover:bg-brand-orange/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20 whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Registrar Insumo
          </button>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center shrink-0">
              <TriangleAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">CRÍTICOS</p>
              <p className="font-black text-xl text-red-600 dark:text-red-400">{criticalItemsCount} {criticalItemsCount === 1 ? 'Ítem' : 'Ítems'}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">TOTAL EN EXISTENCIA</p>
              <p className="font-black text-xl text-gray-900 dark:text-white">{totalInventoryUnits} Uni. <span className="text-xs text-gray-400 font-normal">({inventory.length} tipos)</span></p>
            </div>
          </div>
          <div className="bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 text-brand-orange flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">VALORIZACIÓN TOTAL</p>
              <p className="font-black text-xl text-emerald-600 dark:text-emerald-400">{formatCOP(totalInventoryValuation)}</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-[#151515] rounded-full border border-gray-100 dark:border-stone-800 p-2 mb-8 shadow-sm">
          <div className="flex items-center px-4 py-2 w-full">
            <Search className="w-5 h-5 text-gray-400 dark:text-stone-500 mr-3 shrink-0" />
            <input 
              type="text" 
              placeholder="Buscar insumo por nombre o categoría..." 
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-gray-800 dark:text-stone-300 placeholder-gray-400 font-medium" 
            />
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-4">
          {filteredInventory.map(item => {
            const unitCost = item.unitCost || (item.totalCost && item.stock ? item.totalCost / item.stock : 0);
            const totalItemValuation = item.stock * unitCost;

            return (
              <div key={item.id} className="bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 p-6 md:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h3 className="font-bold text-xl text-gray-900 dark:text-white">{item.name}</h3>
                    {item.category && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-300">
                        {item.category}
                      </span>
                    )}
                    {item.unit && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 dark:bg-orange-900/20 text-brand-orange">
                        {item.unit}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 md:gap-4 flex-wrap text-sm text-gray-600 dark:text-stone-400">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.stock <= 10 ? 'bg-red-500' : (item.stock <= 30 ? 'bg-orange-500' : 'bg-emerald-500')}`}></div>
                      <span>Stock Actual: <strong className="text-gray-900 dark:text-white font-black text-base">{item.stock}</strong></span>
                    </div>

                    {unitCost > 0 && (
                      <>
                        <span className="text-gray-300 dark:text-stone-700 hidden sm:inline">•</span>
                        <span>Costo/u: <strong className="text-gray-900 dark:text-white font-bold">{formatCOP(unitCost)}</strong></span>
                        <span className="text-gray-300 dark:text-stone-700 hidden sm:inline">•</span>
                        <span>Valor en stock: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCOP(totalItemValuation)}</strong></span>
                      </>
                    )}

                    {item.supplier && (
                      <>
                        <span className="text-gray-300 dark:text-stone-700 hidden sm:inline">•</span>
                        <span className="text-xs text-gray-500 dark:text-stone-400">Prov: {item.supplier}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center border border-gray-200 dark:border-stone-700 rounded-full bg-white dark:bg-stone-900 overflow-hidden pr-4 pl-6 h-12">
                    <span className="text-xs font-bold text-gray-500 mr-3">CANT.</span>
                    <input 
                      type="number" 
                      id={`add-stock-${item.id}`}
                      className="w-12 text-lg font-black bg-transparent border-none outline-none text-center text-gray-900 dark:text-white"
                      defaultValue="0"
                      min="0"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const input = document.getElementById(`add-stock-${item.id}`) as HTMLInputElement;
                      if (input) {
                        const amount = parseInt(input.value);
                        if (isNaN(amount) || amount <= 0) return;
                        updateInventoryStock(item.id, -amount);
                        showToast('inventory', 'La cantidad del insumo fue actualizada.', 'Stock Actualizado');
                        input.value = '0';
                      }
                    }}
                    title="Registrar Merma / Restar"
                    className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shadow-sm shrink-0 cursor-pointer"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => {
                      const input = document.getElementById(`add-stock-${item.id}`) as HTMLInputElement;
                      if (input) {
                        addStock(item.id, input.value);
                        input.value = '0';
                      }
                    }}
                    title="Sumar al stock"
                    className="w-12 h-12 rounded-full bg-brand-orange flex items-center justify-center text-white hover:bg-brand-orange/90 transition-colors shadow-sm shrink-0 cursor-pointer"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => {
                      const itemName = item.name;
                      const itemId = item.id;
                      setConfirmModal({
                        isOpen: true,
                        title: 'Eliminar Insumo del Inventario',
                        message: `¿Estás seguro de eliminar el insumo "${itemName}"? Si forma parte de las recetas del menú, su disponibilidad automática se verá afectada.`,
                        confirmText: 'Sí, eliminar',
                        cancelText: 'Cancelar',
                        type: 'danger',
                        onConfirm: () => {
                          deleteInventoryItem(itemId);
                          showToast('danger', 'El insumo fue eliminado del inventario.', 'Insumo Eliminado');
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        }
                      });
                    }}
                    title="Eliminar insumo"
                    className="w-12 h-12 rounded-full border border-red-200 dark:border-red-900/30 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
          {inventory.length === 0 && (
             <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 p-8">
               <Package className="w-12 h-12 text-gray-300 dark:text-stone-700 mb-4" />
               <p className="text-gray-500 font-medium mb-4">El inventario está vacío. Registra los insumos comprados.</p>
               <button
                 onClick={() => setIsInventoryModalOpen(true)}
                 className="bg-brand-orange text-white px-6 py-3 rounded-full font-bold hover:bg-brand-orange/90 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
               >
                 <Plus className="w-5 h-5" /> Registrar Primer Insumo
               </button>
             </div>
          )}
        </div>

        {/* Modal de Registro de Insumo (Nueva Vista Formulario) */}
        <AnimatePresence>
          {isInventoryModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => setIsInventoryModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-2xl max-w-xl w-full overflow-hidden my-8"
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-6 md:p-8 border-b border-gray-100 dark:border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-brand-orange flex items-center justify-center shrink-0">
                      <PlusCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Registrar Nuevo Insumo</h3>
                      <p className="text-xs text-gray-500 dark:text-stone-400">Ingresa la cantidad adquirida y el costo total de compra.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsInventoryModalOpen(false)}
                    className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-stone-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-stone-300 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 md:p-8 space-y-5 max-h-[70vh] overflow-y-auto">
                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">
                      Nombre del Insumo <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={newItem.name} 
                      onChange={e => setNewItem({...newItem, name: e.target.value})} 
                      className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 dark:border-stone-700 bg-gray-50 dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:bg-white dark:focus:bg-stone-900 focus:ring-2 focus:ring-brand-orange/20 transition-all font-medium" 
                      placeholder="Ej: Pan Artesanal, Carne 150g, Queso Cheddar..." 
                    />
                  </div>

                  {/* Categoría y Unidad */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">
                        Categoría
                      </label>
                      <CustomSelect
                        value={newItem.category || 'General'}
                        onChange={val => setNewItem({...newItem, category: val})}
                        buttonClassName="py-3.5 px-5 rounded-2xl"
                        options={[
                          { value: 'General', label: 'General' },
                          { value: 'Panes', label: 'Panadería & Panes' },
                          { value: 'Carnes & Proteínas', label: 'Carnes & Proteínas' },
                          { value: 'Quesos & Lácteos', label: 'Quesos & Lácteos' },
                          { value: 'Verduras & Frescos', label: 'Verduras & Frescos' },
                          { value: 'Salsas & Aderezos', label: 'Salsas & Aderezos' },
                          { value: 'Acompañamientos', label: 'Acompañamientos' },
                          { value: 'Bebidas', label: 'Bebidas' },
                          { value: 'Empaques & Desechables', label: 'Empaques & Desechables' }
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">
                        Unidad de Medida
                      </label>
                      <CustomSelect
                        value={newItem.unit || 'Unidades'}
                        onChange={val => setNewItem({...newItem, unit: val})}
                        buttonClassName="py-3.5 px-5 rounded-2xl"
                        options={[
                          { value: 'Unidades', label: 'Unidades (u)' },
                          { value: 'Kilogramos (kg)', label: 'Kilogramos (kg)' },
                          { value: 'Gramos (g)', label: 'Gramos (g)' },
                          { value: 'Litros (L)', label: 'Litros (L)' },
                          { value: 'Mililitros (ml)', label: 'Mililitros (ml)' },
                          { value: 'Paquetes', label: 'Paquetes' },
                          { value: 'Cajas', label: 'Cajas' },
                          { value: 'Porciones', label: 'Porciones' }
                        ]}
                      />
                    </div>
                  </div>

                  {/* Cantidad y Costo Total */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">
                        Cantidad Comprada <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="number" 
                        min="1"
                        value={newItem.stock} 
                        onChange={e => setNewItem({...newItem, stock: e.target.value})} 
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 dark:border-stone-700 bg-gray-50 dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:bg-white dark:focus:bg-stone-900 transition-all font-bold" 
                        placeholder="Ej: 50" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">
                        Costo Total de Compra ($ COP)
                      </label>
                      <input 
                        type="number" 
                        min="0"
                        value={newItem.totalCost} 
                        onChange={e => setNewItem({...newItem, totalCost: e.target.value})} 
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 dark:border-stone-700 bg-gray-50 dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:bg-white dark:focus:bg-stone-900 transition-all font-bold" 
                        placeholder="Ej: 75000" 
                      />
                    </div>
                  </div>

                  {/* Preview del Costo Unitario Calculado */}
                  {parseFloat(newItem.stock) > 0 && parseFloat(newItem.totalCost) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/30 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-brand-orange uppercase tracking-wider">Costo Unitario Calculado</p>
                        <p className="text-lg font-black text-gray-900 dark:text-white">
                          {formatCOP(parseFloat(newItem.totalCost) / parseFloat(newItem.stock))} <span className="text-xs font-normal text-gray-500">/ {newItem.unit}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-stone-400">Total Facturado</p>
                        <p className="text-sm font-black text-brand-orange">{formatCOP(parseFloat(newItem.totalCost))}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Proveedor / Origen */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">
                      Proveedor u Origen <span className="text-xs font-normal text-gray-500">(Opcional)</span>
                    </label>
                    <input 
                      type="text" 
                      value={newItem.supplier} 
                      onChange={e => setNewItem({...newItem, supplier: e.target.value})} 
                      className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 dark:border-stone-700 bg-gray-50 dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:bg-white dark:focus:bg-stone-900 transition-all font-medium" 
                      placeholder="Ej: Distribuidora del Norte, Makro, Central de Abastos..." 
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 md:p-8 border-t border-gray-100 dark:border-stone-800 bg-gray-50 dark:bg-stone-900/50 flex gap-4">
                  <button
                    onClick={() => setIsInventoryModalOpen(false)}
                    className="flex-1 py-3.5 rounded-full font-bold transition-colors bg-white dark:bg-stone-800 text-gray-900 dark:text-white border border-gray-200 dark:border-stone-700 hover:bg-gray-100 dark:hover:bg-stone-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddItem}
                    disabled={!newItem.name.trim() || !newItem.stock}
                    className="flex-1 py-3.5 rounded-full font-bold transition-all bg-brand-orange text-white shadow-lg shadow-brand-orange/20 hover:bg-brand-orange/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> Guardar Insumo
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white mb-1">Historial de Movimientos</h2>
              <p className="text-sm text-gray-500 dark:text-stone-400">Registro de entradas y salidas de inventario.</p>
            </div>
            <div className="flex items-center border border-gray-200 dark:border-stone-800 rounded-full bg-white dark:bg-[#151515] overflow-hidden px-4 h-12 w-full md:w-auto shadow-sm">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input 
                type="text" 
                placeholder="Buscar por orden o producto..." 
                value={inventoryHistorySearch}
                onChange={(e) => setInventoryHistorySearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full text-gray-800 dark:text-stone-300 placeholder-gray-400 font-medium min-w-[250px]" 
              />
            </div>
          </div>
          
          
        <div className="bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-[#1A1A1A]/50 border-b border-gray-100 dark:border-stone-800 text-xs font-black text-gray-500 dark:text-stone-400 uppercase tracking-wider">
                  <th className="p-6">Fecha</th>
                  <th className="p-6">Insumo</th>
                  <th className="p-6">Tipo</th>
                  <th className="p-6">Cantidad</th>
                  <th className="p-6">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-stone-800">
                {filteredInventoryLogs.length > 0 ? filteredInventoryLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1A1A1A]/50 transition-colors">
                    <td className="p-6 text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(log.date).toLocaleString()}
                    </td>
                    <td className="p-6 text-sm text-gray-600 dark:text-stone-400 font-bold">{log.itemName}</td>
                    <td className="p-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        log.type === 'Entrada' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="p-6 text-sm font-black text-gray-900 dark:text-white">
                      {log.type === 'Entrada' ? '+' : '-'}{log.amount}
                    </td>
                    <td className="p-6 text-sm text-gray-500 dark:text-stone-500">{log.reason}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-500 font-medium">No hay registros de movimientos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile Cards for Inventory Logs */}
          <div className="md:hidden grid grid-cols-2 gap-3 p-3 border-t border-gray-100 dark:border-stone-800">
            {filteredInventoryLogs.length > 0 ? filteredInventoryLogs.map((log) => (
              <div key={log.id} className="bg-gray-50/50 dark:bg-[#1A1A1A]/50 border border-gray-100 dark:border-stone-800 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${log.type === 'Entrada' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-gray-900 dark:text-white text-[clamp(13px,3.5vw,14px)] line-clamp-2 leading-tight break-words">{log.itemName}</h4>
                  <span className={`shrink-0 text-xs font-black whitespace-nowrap ${log.type === 'Entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {log.type === 'Entrada' ? '+' : '-'}{log.amount}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 font-medium">
                  {new Date(log.date).toLocaleDateString()}
                </p>
                <p className="text-[clamp(11px,3vw,12px)] text-gray-600 dark:text-stone-400 line-clamp-2 mt-1 break-words">
                  {log.reason}
                </p>
              </div>
            )) : (
              <div className="col-span-2 text-center text-gray-500 font-medium py-8">No hay registros.</div>
            )}
          </div>

        </div>
        </div>
      </div>
    );
  };

  // HU-17 & HU-19: Gestión Humana
  const renderStaff = () => {
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
  };

  // HU-23, HU-24, HU-26: Pedidos Manuales y Configuración
  // Extracted manual order logic
  const manualOrderTotal = manualOrderItems.reduce((acc, item) => acc + item.finalPrice, 0);

  const handleAddProductToManualOrder = () => {
    if (!manualSelectedProduct) return;
    const prodName = manualSelectedProduct.name;
    const finalPrice = manualSelectedProduct.price * (manualQuantity as number || 1) + manualCustomExtras.reduce((acc, e) => acc + (e.price || 2000), 0) * (manualQuantity as number || 1);
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      product: manualSelectedProduct,
      name: manualSelectedProduct.name,
      quantity: (manualQuantity as number) || 1,
      basePrice: manualSelectedProduct.price,
      finalPrice,
      removed: manualCustomRemoved,
      extras: manualCustomExtras
    };
    setManualOrderItems([...manualOrderItems, newItem]);
    showToast('cart', `"${prodName}" añadido al pedido manual`, 'Pedido Manual');
    setManualSelectedProduct(null);
    setManualCustomRemoved([]);
    setManualCustomExtras([]);
    setManualQuantity(1);
  };

  const handleCreateManualOrder = () => {
    if (!manualOrderClient.address || manualOrderItems.length === 0) return;
    const orderId = `#MAN-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      id: orderId,
      status: 'Pagado',
      client: manualOrderClient.name || 'Cliente General',
      total: manualOrderTotal + storeConfig.shippingRate,
      subtotal: manualOrderTotal,
      shipping: storeConfig.shippingRate,
      items: manualOrderItems,
      address: manualOrderClient.address,
      phone: manualOrderClient.phone,
      date: new Date().toISOString()
    };
    addOrder(newOrder as unknown as Order);
    showToast('success', `Pedido manual ${orderId} creado y enviado a cocina`, 'Pedido Manual');
    setShowManualForm(false);
    setManualOrderClient({ name: '', address: '', phone: '' });
    setManualOrderItems([]);
  };

  const handleViewOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) setViewingOrder(order);
  };

  const renderOrders = () => {

    const pendientes = orders.filter(o => o.status === 'Pendiente' || o.status === 'Pagado').length;
    const enCocina = orders.filter(o => o.status === 'En Preparación').length;
    const listos = orders.filter(o => o.status === 'Listos').length;
    const enCamino = orders.filter(o => o.status === 'En Camino').length;

    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Órdenes en Tiempo Real</h2>
            <p className="text-gray-500 dark:text-stone-400 mt-1">Supervisa el flujo de cocina y repartos.</p>
          </div>
          <button onClick={() => setShowManualForm(!showManualForm)} className="bg-brand-orange text-white px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-[#e66500] transition-colors shadow-lg shadow-brand-orange/20">
            <Plus className="w-5 h-5" /> Registro Manual (Llamada/WhatsApp)
          </button>
        </div>

{/* Manual Order Modal now moved to end of renderOrders */}


        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
          <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 py-4 px-4 sm:p-8 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <span className="font-bold text-sm text-gray-600 dark:text-stone-400">Pendientes</span>
              <Bell className="w-5 h-5 text-brand-orange" />
            </div>
            <span className="text-3xl sm:text-4xl font-black mt-4 text-gray-900 dark:text-white">{String(pendientes).padStart(2, '0')}</span>
          </div>
          <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 py-4 px-4 sm:p-8 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <span className="font-bold text-sm text-gray-600 dark:text-stone-400">En Cocina</span>
              <Utensils className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-3xl sm:text-4xl font-black mt-4 text-gray-900 dark:text-white">{String(enCocina).padStart(2, '0')}</span>
          </div>
          <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 py-4 px-4 sm:p-8 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <span className="font-bold text-sm text-gray-600 dark:text-stone-400">Listos</span>
              <Check className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-3xl sm:text-4xl font-black mt-4 text-gray-900 dark:text-white">{String(listos).padStart(2, '0')}</span>
          </div>
          <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 py-4 px-4 sm:p-8 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <span className="font-bold text-sm text-gray-600 dark:text-stone-400">En Camino</span>
              <Package className="w-5 h-5 text-gray-500" />
            </div>
            <span className="text-3xl sm:text-4xl font-black mt-4 text-gray-900 dark:text-white">{String(enCamino).padStart(2, '0')}</span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 p-8 sm:p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-stone-800 text-brand-orange mx-auto flex items-center justify-center mb-4">
              <Utensils className="w-8 h-8" />
            </div>
            <h3 className="font-black text-xl text-gray-900 dark:text-white mb-1.5">No hay comandas activas en este momento</h3>
            <p className="text-sm text-gray-500 dark:text-stone-400 max-w-md mx-auto mb-6">
              Las órdenes realizadas por la web o ingresadas manualmente aparecerán aquí para control de cocina y despacho.
            </p>
            <button
              onClick={() => setShowManualForm(true)}
              className="bg-brand-orange text-white px-6 py-2.5 rounded-full text-sm font-bold inline-flex items-center gap-2 hover:bg-[#e66500] transition-colors shadow-md shadow-brand-orange/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Ingresar Orden Manual
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {orders.map(order => {
              let color = 'bg-gray-400 dark:bg-stone-600';
              let statusText = order.status.toUpperCase();
              if (order.status === 'Pendiente' || order.status === 'Pagado') { color = 'bg-brand-orange'; statusText = 'PENDIENTE'; }
              if (order.status === 'En Preparación') { color = 'bg-blue-500'; statusText = 'PREPARANDO'; }
              if (order.status === 'Listos') { color = 'bg-emerald-500'; statusText = 'LISTOS'; }
              if (order.status === 'En Camino') { color = 'bg-gray-500 dark:bg-stone-600'; statusText = 'EN CAMINO'; }
              const isHighlighted = highlightedOrderId === order.id;
              
              return (
                <div 
                  key={order.id} 
                  id={`order-card-${order.id}`}
                  className={`bg-white dark:bg-[#151515] rounded-[24px] border shadow-sm relative overflow-hidden flex flex-col justify-between group transition-all duration-300 ${
                    isHighlighted 
                      ? 'border-brand-orange ring-4 ring-brand-orange/30 shadow-xl shadow-brand-orange/20 scale-[1.02] z-10' 
                      : 'border-gray-100 dark:border-stone-800 hover:border-gray-200 dark:hover:border-stone-700'
                  }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${color}`}></div>
                  <div className="p-5 sm:p-6 pl-6 sm:pl-7 flex-1 flex flex-col justify-between">
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[11px] font-bold text-gray-500 dark:text-stone-400">Orden ID</p>
                          <h3 className="font-black text-lg text-brand-orange">{order.id}</h3>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider text-white ${color}`}>{statusText}</span>
                      </div>
                      
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-50 dark:bg-stone-800 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 dark:text-white text-xs">{order.clientPhone || 'Cliente Local'}</p>
                          <p className="text-xs text-gray-500 dark:text-stone-400 flex items-center gap-1.5 truncate">
                            <span className="truncate">{order.address}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingAddressOrder(order); setNewAddress(order.address); }}
                              disabled={order.status === 'Entregado'}
                              className={`p-0.5 rounded transition-colors shrink-0 ${order.status === 'Entregado' ? 'text-gray-300 dark:text-stone-700 cursor-not-allowed' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-stone-800 hover:text-brand-orange'}`}
                              title="Editar dirección"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </button>
                          </p>
                        </div>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="bg-gray-50 dark:bg-stone-900 rounded-xl p-3 border border-gray-100 dark:border-stone-800">
                          <p className="text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Detalle del Pedido</p>
                          <ul className="space-y-1.5">
                            {order.items.map((item: OrderItem, idx: number) => (
                              <li key={idx} className="text-xs">
                                <div className="font-bold text-gray-800 dark:text-stone-200 flex items-start gap-1.5">
                                  <span className="text-brand-orange font-black">{item.quantity}x</span>
                                  <span>{item.name}</span>
                                </div>
                                {item.modifications && item.modifications.length > 0 && (
                                  <ul className="mt-0.5 pl-4 space-y-0.5">
                                    {item.modifications.map((mod: string, mIdx: number) => (
                                      <li key={mIdx} className={`text-[10px] font-black ${
                                        mod.includes('SIN') ? 'text-red-500' : 
                                        mod.includes('EXTRA') ? 'text-emerald-500' : 'text-gray-500'
                                      }`}>
                                        {mod}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Domiciliario Asignado */}
                      {(order.driverName || order.status === 'En Camino') && (
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-orange-50/70 dark:bg-brand-orange/10 border border-brand-orange/20">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-brand-orange text-white flex items-center justify-center text-xs font-bold shrink-0">
                              🛵
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                                {order.driverName || 'Domiciliario Asignado'}
                              </p>
                              <p className="text-[10px] text-brand-orange font-bold truncate">
                                {order.driverPlate ? `Placa: ${order.driverPlate}` : 'En ruta de entrega'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-brand-orange/20 text-brand-orange shrink-0">
                            {order.status === 'Entregado' ? 'Completado' : 'En Camino'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3.5 mt-4 border-t border-gray-100 dark:border-stone-800 flex items-center justify-between">
                      <div className="text-xs font-medium text-gray-500 dark:text-stone-400 flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 dark:border-stone-600 flex items-center justify-center">
                          <div className="w-1 h-1 bg-gray-300 dark:bg-stone-600 rounded-full"></div>
                        </div> 
                        <span>{order.time ? `Hora: ${order.time}` : 'Turno actual'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleViewOrder(order.id)} 
                          className="w-9 h-9 rounded-full border border-gray-200 dark:border-stone-700 flex items-center justify-center text-gray-600 dark:text-stone-300 hover:bg-orange-50 dark:hover:bg-stone-800 hover:text-brand-orange hover:border-brand-orange/30 transition-all cursor-pointer shadow-xs" 
                          title="Ver detalles y domiciliario"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
          })}
        </div>
        )}
        
        <div className="mt-8 mb-4">
          <h3 className="font-black text-xl text-gray-900 dark:text-white mb-1">Mapa de Entregas</h3>
          <p className="text-sm text-gray-500 dark:text-stone-400">Visualiza a tus repartidores en tiempo real.</p>
        </div>
        
        <div className={`bg-[#f1f5f9] dark:bg-[#0f172a] p-8 relative overflow-hidden shadow-sm flex flex-col justify-between border border-gray-200 dark:border-stone-800 transition-all duration-300 ${isMapExpanded ? 'fixed inset-3 sm:inset-6 z-[500] rounded-[32px] sm:rounded-[40px] shadow-2xl ring-1 ring-black/20' : 'h-[300px] rounded-[32px]'}`}>
          {/* Botón flotante destacado para salir de pantalla completa */}
          {isMapExpanded && (
            <button 
              type="button"
              onClick={() => {
                setIsMapExpanded(false);
                setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
              }}
              className="absolute top-4 sm:top-6 right-4 sm:right-6 z-[600] flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/85 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-2xl backdrop-blur-md border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Minimize2 className="w-4 h-4 text-brand-orange" />
              <span>Salir de Pantalla Completa (ESC)</span>
            </button>
          )}

          {/* Interactive Leaflet Map for Neiva */}
          <div className="absolute inset-0 z-0 [&_.leaflet-container]:bg-transparent [&_.leaflet-control-container]:z-[500]">
            <MapContainer 
              center={[2.9273, -75.2818]} 
              zoom={15} 
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
              className="z-0"
            >
              <CustomZoomControl />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url={theme === 'dark' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
              />
              
              {/* Restaurant / Origin */}
              <Marker 
                position={[2.9273, -75.2818]} 
                icon={L.divIcon({
                  html: `<div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                           <svg viewBox="0 0 32 32" style="width: 32px; height: 32px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
                             <path d="M16 0c-5.5 0-10 4.5-10 10 0 7.5 10 22 10 22s10-14.5 10-22c0-5.5-4.5-10-10-10z" fill="#ea4335"/>
                             <circle cx="16" cy="10" r="6" fill="#fff"/>
                             <path d="M16 12.5c-.3 0-1.8-1.5-2.5-2.2-.8-.8-.8-2 0-2.8.8-.8 2-.8 2.8 0 .2.2.4.4.5.7.1-.3.3-.5.5-.7.8-.8 2-.8 2.8 0 .8.8.8 2 0 2.8-.7.7-2.2 2.2-2.5 2.2H16z" fill="#ea4335"/>
                           </svg>
                         </div>`,
                  className: 'custom-marker',
                  iconSize: [30, 30],
                  iconAnchor: [15, 30]
                })}
              >
                <Popup>Cocina Oculta - Hamburguer Copiway</Popup>
              </Marker>

              {/* Delivery Drivers */}
              {staff.filter(s => s.role === 'Domiciliario' && s.location).map(driver => {
                const driverOrder = orders.find(o => o.id === driver.currentOrderId);
                const hasDestination = driverOrder && driverOrder.address;
                return (
                  <Marker 
                    key={driver.id}
                    position={driver.location as [number, number]}
                    icon={L.divIcon({
                      html: `<div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                               <svg viewBox="0 0 32 32" style="width: 32px; height: 32px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
                                 <path d="M16 0c-5.5 0-10 4.5-10 10 0 7.5 10 22 10 22s10-14.5 10-22c0-5.5-4.5-10-10-10z" fill="#3b82f6"/>
                                 <circle cx="16" cy="10" r="6" fill="#fff"/>
                                 <path d="M16 12.5c-.3 0-1.8-1.5-2.5-2.2-.8-.8-.8-2 0-2.8.8-.8 2-.8 2.8 0 .2.2.4.4.5.7.1-.3.3-.5.5-.7.8-.8 2-.8 2.8 0 .8.8.8 2 0 2.8-.7.7-2.2 2.2-2.5 2.2H16z" fill="#3b82f6"/>
                               </svg>
                             </div>`,
                      className: 'custom-marker',
                      iconSize: [30, 30],
                      iconAnchor: [15, 30]
                    })}
                  >
                    <Popup>
                      <strong>{driver.name}</strong><br/>
                      Estado: {driver.currentOrderId ? 'En Ruta: ' + driver.currentOrderId : 'Disponible'}
                    </Popup>
                  </Marker>
                );
              })}

              {/* Delivery 1 Route */}
              <RoutePolyline 
                origin={[2.9273, -75.2818]} 
                destination={[2.9380, -75.2900]} 
                outerColor="#1e3a8a" 
                innerColor="#3b82f6" 
              />

              {/* Delivery 1 Driver Position */}
              <Marker 
                position={[2.9380, -75.2900]} 
                eventHandlers={{ click: () => setSelectedDriverInfo(driversMockData[1]) }}
                icon={L.divIcon({
                  html: `<div style="width: 24px; height: 24px; background-color: #3b82f6; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.6); cursor: pointer;"></div>`,
                  className: 'custom-marker',
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
                })}
              />
              
              {/* Delivery 2 Route */}
              <RoutePolyline 
                origin={[2.9273, -75.2818]} 
                destination={[2.9220, -75.2750]} 
                outerColor="#374151" 
                innerColor="#9ca3af" 
              />

              {/* Delivery 2 Driver Position */}
              <Marker 
                position={[2.9220, -75.2750]} 
                eventHandlers={{ click: () => setSelectedDriverInfo(driversMockData[2]) }}
                icon={L.divIcon({
                  html: `<div style="width: 24px; height: 24px; background-color: #6b7280; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); cursor: pointer;"></div>`,
                  className: 'custom-marker',
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
                })}
              />
            </MapContainer>
          </div>
          
          {!isMapExpanded && (
            <button 
              type="button"
              onClick={() => {
                setIsMapExpanded(true);
                setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
              }}
              title="Expandir mapa"
              className="absolute top-6 right-6 w-10 h-10 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer shadow-sm border border-gray-200 dark:border-white/10 z-[400] hover:scale-110 transition-transform pointer-events-auto text-gray-700 dark:text-white"
            >
              <Maximize2 size={18} />
            </button>
          )}
          
          <div className="flex gap-4 z-10 mt-auto overflow-x-auto pb-2 pointer-events-auto">
            <div 
              onClick={() => setSelectedDriverInfo(driversMockData[1])}
              className="bg-white/90 dark:bg-[#151515]/90 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 shadow-sm border border-blue-500/20 dark:border-blue-500/30 cursor-pointer hover:bg-white dark:hover:bg-black transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">{driversMockData[1].name.split(" - ")[1] || "Camilo"}</p>
                <p className="text-[9px] font-black text-blue-500 tracking-wider">EN RUTA</p>
              </div>
            </div>
            
            <div 
              onClick={() => setSelectedDriverInfo(driversMockData[2])}
              className="bg-white/90 dark:bg-[#151515]/90 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 shadow-sm border border-gray-200 dark:border-stone-800 cursor-pointer hover:bg-white dark:hover:bg-black transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gray-400 dark:bg-stone-700 text-white flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">{driversMockData[2].name.split(" - ")[1] || "Juan"}</p>
                <p className="text-[9px] font-black text-gray-500 dark:text-gray-400 tracking-wider">CARGANDO</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderClients = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Directorio de Clientes</h2>
        <p className="text-gray-500 dark:text-stone-400 mt-1">Base de datos de tus clientes registrados.</p>
      </div>

      <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80 min-w-0">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar cliente por nombre o teléfono..." 
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-brand-orange dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-[#1A1A1A]/50 border-b border-gray-100 dark:border-stone-800 text-xs font-black text-gray-500 dark:text-stone-400 uppercase tracking-wider">
                <th className="p-6">Nombre</th>
                <th className="p-6">Teléfono</th>
                <th className="p-6">Email</th>
                <th className="p-6 text-center">Pedidos</th>
                <th className="p-6 text-right">Total Gastado</th>
                <th className="p-6 text-center">Último Pedido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-stone-800">
              {filteredClients.length > 0 ? filteredClients.map((client) => (
                <tr key={client.id} onClick={() => setSelectedClientInfo(client)} className="hover:bg-gray-50/50 dark:hover:bg-[#1A1A1A]/50 transition-colors group cursor-pointer">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold text-lg">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">{client.name}</span>
                    </div>
                  </td>
                  <td className="p-6 text-sm font-medium text-gray-600 dark:text-stone-400">{client.phone}</td>
                  <td className="p-6 text-sm text-gray-500 dark:text-stone-500">{client.email || '-'}</td>
                  <td className="p-6 text-center">
                    <span className="inline-flex items-center justify-center bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-stone-300 px-3 py-1 rounded-full text-xs font-bold">
                      {client.ordersCount || 0}
                    </span>
                  </td>
                  <td className="p-6 text-right font-black text-gray-900 dark:text-white">
                    {formatCOP(client.totalSpent || 0)}
                  </td>
                  <td className="p-6 text-center text-sm font-medium text-gray-500 dark:text-stone-400">
                    {client.lastOrderDate ? new Date(client.lastOrderDate).toLocaleDateString() : '-'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-stone-400">
                    No hay clientes registrados en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile Cards for Clients */}
        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border-t border-gray-100 dark:border-stone-800">
          {filteredClients.length > 0 ? filteredClients.map((client) => (
            <div key={client.id} onClick={() => setSelectedClientInfo(client)} className="bg-gray-50/50 dark:bg-[#1A1A1A]/50 border border-gray-100 dark:border-stone-800 rounded-2xl p-5 flex flex-col gap-3 cursor-pointer hover:border-brand-orange/30 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold text-xl shrink-0">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 dark:text-white text-[clamp(14px,4vw,16px)] line-clamp-2 leading-tight break-words">{client.name}</h4>
                  <p className="text-[clamp(11px,3.5vw,14px)] font-medium text-gray-600 dark:text-stone-400 break-words">{client.phone}</p>
                </div>
              </div>
              {client.email && (
                <p className="text-[clamp(11px,3.5vw,14px)] text-gray-500 dark:text-stone-500 flex items-center gap-2 min-w-0">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">{client.email}</span>
                </p>
              )}
              <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-gray-200/50 dark:border-stone-800">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Pedidos</p>
                  <p className="font-black text-gray-900 dark:text-white text-lg">{client.ordersCount || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Total</p>
                  <p className="font-black text-brand-orange text-[clamp(16px,4vw,18px)] leading-none">{formatCOP(client.totalSpent || 0)}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-2 text-center text-gray-500 font-medium py-8">No se encontraron clientes.</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Ajustes</h2>
        <p className="text-gray-500 dark:text-stone-400 mt-1">Configuración general.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Columna Izquierda: Operación y Envíos */}
        <div className="space-y-6">
          {/* Tarifa Plana de Domicilio */}
          <div className="bg-white dark:bg-[#151515] rounded-[24px] md:rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm p-6 md:p-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-brand-orange" />
                Tarifa Plana de Domicilio
              </h3>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-orange-50 dark:bg-stone-900 text-brand-orange border border-brand-orange/20">
                Tarifa Única: {formatCOP(storeConfig.shippingRate || 0)}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-stone-400 mb-4">
              Costo fijo sumado automáticamente en el checkout del cliente.
            </p>

            {/* Presets de Tarifa */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-bold text-gray-400 dark:text-stone-500 uppercase tracking-wider">Sugeridos:</span>
              {[3000, 4000, 5000, 6000, 8000].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setShippingRateInput(rate.toString())}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    shippingRateInput === rate.toString()
                      ? 'bg-brand-orange text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700'
                  }`}
                >
                  ${rate.toLocaleString('es-CO')}
                </button>
              ))}
            </div>

            {/* Simulación de Cobro Checkout */}
            <div className="bg-orange-50/60 dark:bg-stone-900/60 rounded-2xl p-4 border border-brand-orange/20 mb-4 text-xs space-y-2">
              <div className="flex justify-between items-center text-gray-600 dark:text-stone-400">
                <span>Subtotal pedido (ejemplo):</span>
                <span className="font-semibold text-gray-800 dark:text-stone-200">$ 25.000</span>
              </div>
              <div className="flex justify-between items-center text-brand-orange font-medium">
                <span>+ Tarifa plana de domicilio:</span>
                <span className="font-bold">+ {formatCOP(parseFloat(shippingRateInput) || 0)}</span>
              </div>
              <div className="pt-2 border-t border-brand-orange/20 flex justify-between items-center font-bold text-gray-900 dark:text-white text-sm">
                <span>Total a pagar cliente:</span>
                <span className="text-brand-orange font-black">
                  {formatCOP(25000 + (parseFloat(shippingRateInput) || 0))}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full min-w-0">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                <input 
                  type="number" 
                  value={shippingRateInput} 
                  onChange={e => setShippingRateInput(e.target.value)} 
                  className="w-full pl-8 pr-4 py-3 rounded-[16px] border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900 text-gray-900 dark:text-white outline-none font-bold focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" 
                  placeholder="5000"
                />
              </div>
              <button 
                onClick={() => {
                  const rate = parseFloat(shippingRateInput) || 0;
                  updateStoreConfig({ shippingRate: rate });
                  showToast('config', 'La tarifa plana de domicilio ha sido guardada.', 'Tarifa Actualizada');
                }} 
                className="bg-brand-orange text-white px-7 py-3 rounded-full font-bold w-full sm:w-auto hover:bg-[#e66500] shadow-md shadow-brand-orange/20 transition-all cursor-pointer shrink-0"
              >
                Guardar
              </button>
            </div>
          </div>

          {/* Horario de Atención */}
          <div className="bg-white dark:bg-[#151515] rounded-[24px] md:rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm p-6 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-orange shrink-0" />
                <span className="truncate">Horario de Atención</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {/* Real-time automatic status indicator */}
                {storeConfig.isOpen && (
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${isStoreAutomaticallyOpen ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-stone-800 dark:text-stone-400'}`}>
                    {isStoreAutomaticallyOpen ? 'En Servicio' : 'Fuera de Horario'}
                  </span>
                )}
                <button 
                  onClick={() => {
                    const willBeOpen = !storeConfig.isOpen;
                    updateStoreConfig({ isOpen: willBeOpen });
                    showToast('config', willBeOpen ? 'Horario automático activado' : 'Local cerrado manualmente (Ignorando horario)', 'Estado del Local');
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${storeConfig.isOpen ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
                  title={storeConfig.isOpen ? "El sistema está respetando el horario automático" : "El local está forzado a Cerrado"}
                >
                  {storeConfig.isOpen ? 'Automático Activado' : 'Cerrado Manualmente'}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-stone-400 mb-6">
              Bloquea pagos automáticamente fuera del horario configurado.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full flex flex-col sm:flex-row gap-4 min-w-0">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-bold text-gray-700 dark:text-stone-300 mb-2">Apertura</label>
                  <button 
                    onClick={() => setShowTimePicker('open')}
                    className="w-full px-4 py-3 rounded-[16px] border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900 text-gray-900 dark:text-white outline-none font-bold flex justify-between items-center hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    <span>{storeConfig.openTime ? (() => {
                      const [h, m] = storeConfig.openTime.split(':');
                      const hour = parseInt(h);
                      const period = hour >= 12 ? 'p. m.' : 'a. m.';
                      const h12 = hour % 12 || 12;
                      return h12.toString().padStart(2, '0') + ':' + m + ' ' + period;
                    })() : 'Seleccionar...'}</span>
                    <Clock className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-bold text-gray-700 dark:text-stone-300 mb-2">Cierre</label>
                  <button 
                    onClick={() => setShowTimePicker('close')}
                    className="w-full px-4 py-3 rounded-[16px] border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900 text-gray-900 dark:text-white outline-none font-bold flex justify-between items-center hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    <span>{storeConfig.closeTime ? (() => {
                      const [h, m] = storeConfig.closeTime.split(':');
                      const hour = parseInt(h);
                      const period = hour >= 12 ? 'p. m.' : 'a. m.';
                      const h12 = hour % 12 || 12;
                      return h12.toString().padStart(2, '0') + ':' + m + ' ' + period;
                    })() : 'Seleccionar...'}</span>
                    <Clock className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <button 
                onClick={() => showToast('config', 'El horario de atención ha sido guardado correctamente.', 'Horario Actualizado')} 
                className="bg-brand-orange text-white px-7 py-3 rounded-full font-bold w-full sm:w-auto hover:bg-[#e66500] shadow-md shadow-brand-orange/20 transition-all cursor-pointer shrink-0"
              >
                Guardar
              </button>
            </div>
          </div>

          {/* Botón de Pánico (Pausa) */}
          <div className="bg-white dark:bg-[#151515] rounded-[24px] md:rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-red-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Pausa de Emergencia (Botón de Pánico)
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-stone-400 mb-6">
              Pausa la recepción de órdenes por contingencias, sin modificar los horarios oficiales.
            </p>
            <button 
              onClick={() => {
                const willBePaused = !storeConfig.isPaused;
                updateStoreConfig({ isPaused: willBePaused });
                showToast('config', willBePaused ? 'Recepción de pedidos pausada' : 'Recepción de pedidos reanudada', 'Estado del Local');
              }}
              className={`w-full py-4 rounded-[16px] font-black text-lg transition-colors flex items-center justify-center gap-2 ${storeConfig.isPaused ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : 'bg-gray-100 dark:bg-stone-900 text-gray-800 dark:text-stone-200 hover:bg-gray-200 dark:hover:bg-stone-800'}`}
            >
              <AlertCircle className="w-6 h-6" />
              {storeConfig.isPaused ? 'COCINA PAUSADA (Clic para Reanudar)' : 'PAUSAR RECEPCIÓN DE PEDIDOS'}
            </button>
          </div>
        </div>

        {/* Columna Derecha: Margen Comercial y Cierre de Caja */}
        <div className="space-y-6">
          {/* Margen de Ganancia (Creador Interactivo / Arma tu Burger) */}
          <div className="bg-white dark:bg-[#151515] rounded-[24px] md:rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm p-6 md:p-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-orange" />
                Margen de Ganancia (Arma tu Burger)
              </h3>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-brand-orange/10 text-brand-orange">
                Actual: {storeConfig.profitMargin ?? 30}%
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-stone-400 mb-4">
              Margen comercial aplicado sobre el costo de los insumos del Creador Interactivo.
            </p>

            {/* Presets rápidos */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-bold text-gray-400 dark:text-stone-500 uppercase tracking-wider">Sugeridos:</span>
              {[20, 30, 35, 40, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setProfitMarginInput(preset.toString())}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    profitMarginInput === preset.toString()
                      ? 'bg-brand-orange text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>

            {/* Simulación en vivo */}
            <div className="bg-orange-50/60 dark:bg-stone-900/60 rounded-2xl p-4 border border-brand-orange/20 mb-4 text-xs space-y-2">
              <div className="flex justify-between items-center text-gray-600 dark:text-stone-400">
                <span>Costo base de insumos (ejemplo):</span>
                <span className="font-semibold text-gray-800 dark:text-stone-200">$ 10.000</span>
              </div>
              <div className="flex justify-between items-center text-brand-orange font-medium">
                <span>Ganancia comercial ({profitMarginInput || 0}%):</span>
                <span>+ {formatCOP(Math.round(10000 * ((parseFloat(profitMarginInput) || 0) / 100)))}</span>
              </div>
              <div className="pt-2 border-t border-brand-orange/20 flex justify-between items-center font-bold text-gray-900 dark:text-white text-sm">
                <span>Precio final al cliente:</span>
                <span className="text-brand-orange font-black">
                  {formatCOP(Math.round(10000 * (1 + (parseFloat(profitMarginInput) || 0) / 100)))}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-stone-400 pt-1 leading-relaxed">
                💡 <strong>Rango recomendado:</strong> <strong>30% - 40%</strong> para cubrir costos sin encarecer el producto.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full min-w-0">
                <input 
                  type="number" 
                  min="0"
                  max="200"
                  value={profitMarginInput} 
                  onChange={e => setProfitMarginInput(e.target.value)} 
                  className="w-full pl-4 pr-10 py-3 rounded-[16px] border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900 text-gray-900 dark:text-white outline-none font-bold focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" 
                  placeholder="30"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
              </div>
              <button 
                onClick={() => {
                  const margin = parseFloat(profitMarginInput) >= 0 ? parseFloat(profitMarginInput) : 30;
                  updateStoreConfig({ profitMargin: margin });
                  showToast('config', 'El margen de ganancia ha sido guardado correctamente.', 'Margen Actualizado');
                }} 
                className="bg-brand-orange text-white px-7 py-3 rounded-full font-bold w-full sm:w-auto hover:bg-[#e66500] shadow-md shadow-brand-orange/20 transition-all cursor-pointer shrink-0"
              >
                Guardar Margen
              </button>
            </div>
          </div>

          {/* Reporte de Cierre de Caja */}
          <div className="bg-gradient-to-br from-[#1a1a1e] to-black rounded-[24px] md:rounded-[32px] border border-gray-800 shadow-sm p-6 md:p-8 text-white flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Calculator className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h3 className="font-bold text-xl mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Calculator className="w-5 h-5"/> 
                </div>
                Reporte de Cierre de Caja
              </h3>
              <p className="text-sm text-gray-300 mb-6 max-w-[320px]">
                Cruza ingresos digitales, cobro en efectivo y consumo exacto de insumos por receta.
              </p>
            </div>
            <button 
              onClick={handleGenerarCierre} 
              className="bg-white text-gray-900 w-full py-3.5 rounded-full font-black hover:bg-gray-100 transition-colors shadow-lg relative z-10 cursor-pointer"
            >
              Generar Cierre del Día
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const navItems = [
    { id: 'overview', label: 'Tablero Analítico', icon: LayoutDashboard },
    { id: 'orders', label: 'Comandas Activas', icon: Utensils },
    { id: 'map', label: 'Rutas & Zonas', icon: MapPin },
    { id: 'menu', label: 'Gestión de Menú', icon: BookOpen },
    { id: 'inventory', label: 'Inventario Express', icon: Package },
    { id: 'staff', label: 'Equipo y Personal', icon: Users },
    { id: 'clients', label: 'Directorio Clientes', icon: User },
    { id: 'settings', label: 'Ajustes y Caja', icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-gray-50/50 dark:bg-stone-950 text-gray-900 dark:text-gray-100 font-sans flex transition-colors duration-300 overflow-hidden relative">
      
      {/* Sidebar Admin */}
      
      {/* Desktop/Tablet Sidebar */}
      <aside className="lg:w-[280px] md:w-[88px] bg-white dark:bg-[#151515] border-r border-gray-100 dark:border-stone-800 flex-col hidden md:flex shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-screen sticky top-0 transition-all duration-300">
        <div className="h-24 flex items-center lg:px-8 md:px-0 md:justify-center lg:justify-start gap-3 mb-2 shrink-0 border-b border-gray-50 dark:border-stone-800/50">
          <div className="w-9 h-9 rounded-xl bg-brand-orange flex items-center justify-center shadow-lg shadow-brand-orange/20 shrink-0">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div className="hidden lg:block">
            <h1 className="font-black text-[22px] tracking-tight text-gray-900 dark:text-white leading-none">Copiway<span className="text-brand-orange">PRO</span></h1>
          </div>
        </div>
        <nav className="flex-1 px-3 lg:px-4 py-4 space-y-2 overflow-y-auto overflow-x-hidden min-w-0">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              className={`w-full flex items-center justify-center lg:justify-start gap-4 lg:px-5 px-0 py-3 lg:py-3 rounded-[16px] font-bold text-[14px] transition-all ${
                activeTab === item.id 
                  ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20' 
                  : 'text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-900 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <item.icon className="w-[20px] h-[20px] shrink-0" />
              <span className="text-left leading-tight whitespace-nowrap truncate hidden lg:block">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 lg:p-6 border-t border-gray-100 dark:border-stone-800 mt-auto shrink-0 flex justify-center lg:justify-start">
          <button onClick={handleLogout} title="Cerrar Sesión" className="flex items-center justify-center lg:justify-start gap-4 w-full lg:w-full font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 p-3 lg:px-4 lg:py-3 rounded-[16px] transition-colors text-sm">
            <LogOut className="w-6 h-6 shrink-0" />
            <span className="leading-tight text-left hidden lg:block">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay & Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden w-full h-[100dvh]"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-white dark:bg-[#151515] border-r border-gray-100 dark:border-stone-800 flex flex-col md:hidden shadow-2xl h-[100dvh]"
            >
              <div className="h-24 flex items-center justify-between px-8 mb-2 shrink-0 border-b border-gray-50 dark:border-stone-800/50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-orange flex items-center justify-center shadow-lg shadow-brand-orange/20 shrink-0">
                        <Layers className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-black text-[22px] tracking-tight text-gray-900 dark:text-white leading-none">Copiway<span className="text-brand-orange">PRO</span></h1>
                    </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-stone-800 text-gray-500">
                    <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto min-w-0">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-4 px-5 py-3 rounded-[16px] font-bold text-[14px] transition-all ${
                      activeTab === item.id 
                        ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20' 
                        : 'text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-900 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <item.icon className="w-[20px] h-[20px] shrink-0" />
                    <span className="text-left leading-tight whitespace-nowrap truncate">{item.label}</span>
                  </button>
                ))}
              </nav>
              
              <div className="p-6 border-t border-gray-100 dark:border-stone-800 mt-auto shrink-0">
                <button onClick={handleLogout} className="flex items-center gap-4 w-full font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 px-4 py-3 rounded-[16px] transition-colors text-sm">
                  <LogOut className="w-6 h-6 shrink-0" />
                  <span className="leading-tight text-left">Cerrar Sesión</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>


      {/* Área Principal */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative bg-gray-50/50 dark:bg-stone-950 min-w-0">
        <header className="h-[70px] md:h-24 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#0c0a09] flex items-center justify-between px-4 md:px-8 shrink-0 z-10 sticky top-0 transition-colors duration-300">
          
          <div className="flex items-center gap-4 w-full md:w-auto">
             <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-stone-900 text-gray-600 dark:text-stone-300 transition-colors">
                <Menu className="w-6 h-6" />
             </button>
          </div>

          <div className="flex items-center gap-4 md:gap-8 ml-auto">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-stone-900 text-gray-600 dark:text-stone-300 transition-colors relative">
                  <Bell className="w-5 h-5" />
                  {orders.filter(o => o.status === 'Pendiente' || o.status === 'Pagado').length > 0 && (
                    <span className="absolute top-0 right-0 w-[18px] h-[18px] bg-brand-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-stone-950">
                      {orders.filter(o => o.status === 'Pendiente' || o.status === 'Pagado').length}
                    </span>
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
                        </div>
                        <div className="max-h-[400px] overflow-y-auto p-2">
                          {orders.filter(o => o.status === 'Pendiente' || o.status === 'Pagado').length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center">
                              <Bell className="w-8 h-8 text-gray-300 dark:text-stone-700 mb-3" />
                              <p className="text-sm text-gray-500 dark:text-stone-400 font-medium">No hay órdenes nuevas</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {orders.filter(o => o.status === 'Pendiente' || o.status === 'Pagado').map(ord => (
                                <div 
                                  key={ord.id} 
                                  onClick={() => {
                                    setActiveTab('overview');
                                    setShowNotifications(false);
                                  }}
                                  className="w-full text-left p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group flex items-start gap-3"
                                >
                                  <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center shrink-0">
                                    <Package className="w-5 h-5 text-brand-orange" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-brand-orange transition-colors">
                                      Nuevo pedido de {ord.client || 'Cliente Copiway'}
                                    </p>
                                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{ord.address}</p>
                                    <p className="text-[10px] text-gray-400 mt-1 font-medium">{new Date(ord.date).toLocaleString()}</p>
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
              <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-stone-900 text-gray-600 dark:text-stone-300 transition-colors">
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>
        
        <div ref={mainContentRef} className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 w-full min-w-0">
          {/* Alerta de Stock Crítico */}
          {inventory.filter(i => i.stock > 0 && i.stock <= 10).length > 0 && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 flex items-start gap-4 shadow-sm animate-pulse">
              <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-red-800 dark:text-red-300 font-bold text-sm">⚠️ ALERTA PREVENTIVA: STOCK CRÍTICO</h4>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  Los siguientes insumos están a punto de agotarse. Reabastece pronto para evitar bloqueos en las ventas:
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {inventory.filter(i => i.stock > 0 && i.stock <= 10).map(item => (
                    <span key={item.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold rounded-lg border border-red-200 dark:border-red-800/50">
                      {item.name} <span className="text-red-500 dark:text-red-400">({item.stock} uds)</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="w-full">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'orders' && renderOrders()}
            {activeTab === 'map' && renderMap()}
            {activeTab === 'menu' && renderMenu()}
            {activeTab === 'inventory' && renderInventory()}
            {activeTab === 'staff' && renderStaff()}
            {activeTab === 'clients' && renderClients()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        </div>
      </main>

      
      {/* Modal de Cierre de Caja */}
      <AnimatePresence>
        {showCierre && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCierre(false)}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#151515] rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div id="cierre-modal-content" className="flex-1 flex flex-col min-h-0">
              <div className="p-8 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center bg-gray-50/50 dark:bg-stone-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-black text-xl text-gray-900 dark:text-white">Cierre de Caja</h2>
                    <p className="text-sm font-bold text-gray-500">{cierreData?.date}</p>
                  </div>
                </div>
                <button onClick={() => setShowCierre(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 bg-white dark:bg-[#151515] min-w-0 text-black dark:text-white">
    {cierreData?.activeOrdersCount > 0 && (
      <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">
        <h4 className="font-bold mb-1">Advertencia: Órdenes Activas</h4>
        <p className="text-sm">Tienes {cierreData.activeOrdersCount} órdenes activas. Si cierras la caja ahora, el sistema se reiniciará para el nuevo turno.</p>
      </div>
    )}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 dark:bg-stone-900 rounded-[24px] p-6 sm:p-8 border border-gray-100 dark:border-stone-800 overflow-hidden">
                    <p className="text-sm font-bold text-gray-500 mb-1">Total Ventas</p>
                    <p className="font-black text-[clamp(1.2rem,4vw,1.875rem)] sm:text-3xl text-gray-900 dark:text-white break-all sm:break-normal">{cierreData ? formatCOP(cierreData.totalVentas) : '$0'}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-stone-900 rounded-[24px] p-6 sm:p-8 border border-gray-100 dark:border-stone-800 overflow-hidden">
                    <p className="text-sm font-bold text-gray-500 mb-1">Total Órdenes</p>
                    <p className="font-black text-3xl text-gray-900 dark:text-white">{cierreData?.totalOrdenes}</p>
                  </div>
                </div>

                <div className="mb-8 bg-gray-50 dark:bg-stone-900 rounded-[24px] p-6 border border-gray-100 dark:border-stone-800">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-4 uppercase tracking-wider">{salesFilter.includes('mes') ? 'Estadísticas de Ventas (Mes)' : 'Estadísticas de Ventas (Semana)'}</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                        <YAxis width={80} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value} />
                        <Tooltip cursor={false} content={<CustomTooltip />} />
                        <Bar dataKey="amount" fill="#f97316" activeBar={{ fill: "#ea580c" }} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Desglose por Método de Pago</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-4 rounded-[16px] bg-gray-50 dark:bg-stone-900/50 border border-gray-100 dark:border-stone-800">
                        <span className="font-medium text-gray-600 dark:text-stone-300">Efectivo</span>
                        <span className="font-black text-gray-900 dark:text-white">{cierreData ? formatCOP(cierreData.desglose.efectivo) : '$0'}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 rounded-[16px] bg-gray-50 dark:bg-stone-900/50 border border-gray-100 dark:border-stone-800">
                        <span className="font-medium text-gray-600 dark:text-stone-300">Tarjetas / Transferencias</span>
                        <span className="font-black text-gray-900 dark:text-white">{cierreData ? formatCOP(cierreData.desglose.digital) : '$0'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Consumo de Insumos</h3>
                    <div className="bg-gray-50 dark:bg-stone-900/50 rounded-[20px] p-8 border border-gray-100 dark:border-stone-800">
                      <div className="space-y-3">
                        {cierreData?.insumosConsumidos.map((insumo, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-stone-300">{insumo.name}</span>
                            <span className="font-bold text-gray-900 dark:text-white">{insumo.used} unid.</span>
                          </div>
                        ))}
                        {(!cierreData?.insumosConsumidos || cierreData.insumosConsumidos.length === 0) && (
                          <p className="text-sm text-gray-500 italic">No hay datos de insumos consumidos hoy.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {cierreData?.liquidaciones && cierreData.liquidaciones.length > 0 && (
                    <div className="mt-8">
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Liquidación de Domiciliarios</h3>
                      <div className="bg-gray-50 dark:bg-stone-900/50 rounded-[20px] p-6 border border-gray-100 dark:border-stone-800">
                        <div className="space-y-4">
                          {cierreData.liquidaciones.map((liq, idx: number) => (
                            <div key={idx} className="bg-white dark:bg-[#151515] p-4 rounded-xl border border-gray-100 dark:border-stone-800">
                              <div className="flex justify-between items-center mb-3">
                                <span className="font-black text-gray-900 dark:text-white">{liq.driverName}</span>
                                <span className="text-xs bg-brand-orange/10 text-brand-orange px-2 py-1 rounded-lg font-bold">
                                  {liq.ordersCount} Entregas (Efectivo)
                                </span>
                              </div>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between text-gray-600 dark:text-stone-400">
                                  <span>Recaudo (Efectivo)</span>
                                  <span>{formatCOP(liq.cashCollected)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600 dark:text-stone-400">
                                  <span>Base Asignada</span>
                                  <span>{formatCOP(liq.base)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-stone-800 mt-2">
                                  <span>Total a Entregar</span>
                                  <span className="text-brand-orange">{formatCOP(liq.totalDue)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>

              <div className="p-6 sm:p-8 border-t border-gray-100 dark:border-stone-800 bg-gray-50/70 dark:bg-stone-900/50 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={requestConfirmarCierre}
                  className="flex-1 py-3.5 sm:py-4 px-6 rounded-2xl font-bold transition-all shadow-lg min-w-0 bg-brand-orange text-white hover:bg-[#e66500] shadow-brand-orange/20 cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Confirmar y Cerrar Caja</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleVerReporte}
                    className="flex-1 sm:flex-none px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-800 dark:text-stone-200 hover:bg-gray-100 dark:hover:bg-stone-700 cursor-pointer active:scale-[0.98]"
                    title="Ver Vista Previa del Reporte"
                  >
                    <Eye className="w-5 h-5 text-gray-600 dark:text-stone-300 shrink-0" />
                    <span>Ver</span>
                  </button>

                  <button 
                    type="button"
                    onClick={descargarPDF}
                    disabled={isGeneratingPDF}
                    className={`flex-1 sm:flex-none px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                      isGeneratingPDF 
                        ? 'bg-gray-400 text-white cursor-wait' 
                        : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-stone-200'
                    }`}
                  >
                    {isGeneratingPDF ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5 shrink-0" />
                        <span>Descargar PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Vista Previa del Reporte de Cierre */}
      <AnimatePresence>
        {showPdfPreview && cierreData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[15000] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
            onClick={() => setShowPdfPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#18181b] rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 dark:border-stone-800"
            >
              {/* Header Preview */}
              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center bg-gray-50/80 dark:bg-stone-900/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                      Vista Previa: Reporte de Cierre de Caja
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-stone-400">
                      Fecha: {cierreData.date} • Hamburguer Copiway
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPdfPreview(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-stone-800 dark:hover:bg-stone-700 flex items-center justify-center text-gray-500 dark:text-stone-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Document Paper Body */}
              <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-gray-100/60 dark:bg-[#0f0f12]">
                <div className="max-w-2xl mx-auto bg-white dark:bg-[#1f1f23] rounded-2xl shadow-sm border border-gray-200/80 dark:border-stone-800 p-6 sm:p-8 text-gray-900 dark:text-stone-100 space-y-6">
                  {/* Brand Header */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-brand-orange to-orange-600 text-white flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <h1 className="text-lg sm:text-xl font-black tracking-tight">HAMBURGUER COPIWAY</h1>
                      <p className="text-xs text-orange-100 font-medium">REPORTE OFICIAL DE CIERRE DE CAJA — DARK KITCHEN</p>
                    </div>
                    <div className="text-xs text-right sm:text-right font-medium text-orange-100">
                      {cierreData.date}
                    </div>
                  </div>

                  {cierreData.activeOrdersCount > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                      <TriangleAlert className="w-4 h-4 shrink-0" />
                      <span>Nota: Cierre ejecutado con {cierreData.activeOrdersCount} órdenes activas.</span>
                    </div>
                  )}

                  {/* Summary Grid */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-stone-400 mb-2.5">
                      Resumen General de Ingresos
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-stone-900 border border-gray-100 dark:border-stone-800">
                        <span className="text-xs text-gray-500 dark:text-stone-400 font-medium block">Total Ventas</span>
                        <span className="text-lg sm:text-xl font-black text-brand-orange block mt-1">
                          {formatCOP(cierreData.totalVentas)}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-stone-900 border border-gray-100 dark:border-stone-800">
                        <span className="text-xs text-gray-500 dark:text-stone-400 font-medium block">Total Órdenes</span>
                        <span className="text-lg sm:text-xl font-black text-gray-900 dark:text-white block mt-1">
                          {cierreData.totalOrdenes} pedidos
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-stone-900 border border-gray-100 dark:border-stone-800">
                        <span className="text-xs text-gray-500 dark:text-stone-400 font-medium block">Recaudo Efectivo</span>
                        <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                          {formatCOP(cierreData.desglose?.efectivo || 0)}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-stone-900 border border-gray-100 dark:border-stone-800">
                        <span className="text-xs text-gray-500 dark:text-stone-400 font-medium block">Digital / Transferencias</span>
                        <span className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 block mt-1">
                          {formatCOP(cierreData.desglose?.digital || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Insumos */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-stone-400 mb-2.5">
                      Consumo de Insumos (Escandallo)
                    </h4>
                    <div className="rounded-xl border border-gray-100 dark:border-stone-800 overflow-hidden text-xs">
                      <div className="bg-gray-100 dark:bg-stone-900 p-2.5 font-bold flex justify-between text-gray-700 dark:text-stone-300">
                        <span>Insumo / Ingrediente</span>
                        <span>Cantidad Consumida</span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-stone-800">
                        {cierreData.insumosConsumidos?.map((ins, i: number) => (
                          <div key={i} className="p-2.5 flex justify-between text-gray-700 dark:text-stone-300 bg-white dark:bg-[#1f1f23]">
                            <span>{ins.name}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{ins.used} u</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-stone-800 text-[11px] text-gray-400 dark:text-stone-500 flex justify-between items-center">
                    <span>Sistema de Automatización Copiway</span>
                    <span>Documento Válido de Turno</span>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-stone-800 bg-gray-50/80 dark:bg-stone-900/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPdfPreview(false)}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-600 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    descargarPDF();
                    setShowPdfPreview(false);
                  }}
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-orange text-white hover:bg-[#e66500] shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Archivo PDF</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Detalles del Repartidor */}
      <AnimatePresence>
        {selectedDriverInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
            onClick={() => setSelectedDriverInfo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#0a0a0a] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] shadow-2xl border border-gray-100 dark:border-stone-800 flex flex-col pb-8 md:pb-0"
            >
              <div className="p-8 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center bg-gray-50 dark:bg-[#151515] sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                    <User className="w-7 h-7 text-brand-orange" />
                    {selectedDriverInfo.name}
                  </h2>
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${selectedDriverInfo.status === 'EN RUTA' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-700 dark:bg-stone-800 dark:text-stone-300'}`}>
                      {selectedDriverInfo.status}
                    </span>
                    <span className="text-sm font-medium text-gray-600 dark:text-stone-400 flex items-center gap-1">
                      <IdCard className="w-4 h-4" /> {selectedDriverInfo.plate}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDriverInfo(null)}
                  className="w-10 h-10 rounded-full bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-stone-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 dark:bg-stone-900/50 p-4 rounded-[20px] border border-gray-100 dark:border-stone-800">
                    <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Vehículo</p>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedDriverInfo.vehicle}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-stone-900/50 p-4 rounded-[20px] border border-gray-100 dark:border-stone-800">
                    <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Teléfono</p>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedDriverInfo.phone}</p>
                  </div>
                </div>

                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-gray-400" />
                  Pedidos Asignados ({selectedDriverInfo.orders.length})
                </h3>
                
                <div className="space-y-4">
                  {selectedDriverInfo.orders.map((order, idx: number) => (
                    <div key={idx} className="border border-gray-200 dark:border-stone-800 rounded-[24px] p-6 bg-white dark:bg-[#151515] relative overflow-hidden group">
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${order.status === 'Entregado' ? 'bg-emerald-500' : 'bg-brand-orange'}`}></div>
                      
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-[clamp(16px,4vw,18px)] leading-none text-gray-900 dark:text-white">{order.id}</span>
                            <span className={`px-2.5 py-1 text-[10px] font-black tracking-wider rounded-full uppercase ${order.status === 'Entregado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900 dark:text-white">{order.client}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-[clamp(16px,4vw,18px)] leading-none text-gray-900 dark:text-white">{formatCOP(order.total)}</p>
                          {(!order.paymentMethod || order.paymentMethod === 'online' || order.paymentStatus === 'Pagado' || order.status === 'Pagado') ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Digital</span>
                          ) : (
                            <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wide">Efectivo</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center mb-4 bg-gray-50 dark:bg-stone-900 p-3 rounded-[16px]">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <p className="text-sm font-medium text-gray-700 dark:text-stone-300">{order.address}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {order.items.map((item: string, i: number) => (
                          <div key={i} className="text-sm text-gray-500 dark:text-stone-400 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-stone-700"></span>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

            {/* Modal Editar Dirección */}
      <AnimatePresence>
        {editingAddressOrder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setEditingAddressOrder(null); setNewAddress(''); }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#151515] rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-stone-800 flex flex-col p-6 sm:p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-xl text-gray-900 dark:text-white">Editar Dirección del Pedido {editingAddressOrder.id}</h3>
                  <p className="text-xs text-gray-500 dark:text-stone-400 mt-0.5">Actualiza el punto de entrega en tiempo real para el domiciliario</p>
                </div>
                <button 
                  type="button"
                  onClick={() => { setEditingAddressOrder(null); setNewAddress(''); }} 
                  className="w-9 h-9 rounded-full bg-gray-100 dark:bg-stone-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors shrink-0 cursor-pointer"
                  title="Cerrar ventana"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Dirección de Entrega</label>
                <input 
                  type="text"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  placeholder="Ej. Calle 84 # 46-20, Apto 301"
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => { setEditingAddressOrder(null); setNewAddress(''); }}
                  className="flex-1 bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 py-3.5 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleUpdateAddress}
                  disabled={!newAddress.trim() || newAddress === editingAddressOrder.address}
                  className="flex-1 bg-brand-orange text-white py-3.5 rounded-2xl font-bold hover:bg-[#e66500] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-brand-orange/20 cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Order Modal */}
      <AnimatePresence>
        {showManualForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#151515] w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                    Ingreso de Orden Manual
                  </h2>
                  <button 
                    onClick={() => setShowManualForm(false)}
                    className="w-10 h-10 rounded-full bg-gray-100 dark:bg-stone-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Cliente</label>
                  <input type="text" value={manualOrderClient.name} onChange={e => setManualOrderClient({...manualOrderClient, name: e.target.value})} className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" placeholder="Nombre del cliente" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Teléfono</label>
                  <input type="tel" value={manualOrderClient.phone} onChange={e => setManualOrderClient({...manualOrderClient, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" placeholder="Número de celular" />
                </div>
                <div className="flex-1 min-w-0 md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-stone-300 mb-2">Dirección de Entrega</label>
                  <input type="text" value={manualOrderClient.address} onChange={e => setManualOrderClient({...manualOrderClient, address: e.target.value})} className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" placeholder="Dirección completa" />
                </div>
              </div>

              {/* Added items list */}
              {manualOrderItems.length > 0 && (
                <div className="space-y-3 bg-gray-50 dark:bg-stone-900 p-4 rounded-[16px] border border-gray-100 dark:border-stone-800">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">Productos Añadidos:</h4>
                  {manualOrderItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white dark:bg-[#1a1a1e] p-3 rounded-[12px] shadow-sm border border-gray-100 dark:border-stone-800/50">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-brand-orange text-sm">{item.quantity}x</span>
                        <div>
                          <p className="font-bold text-sm text-gray-900 dark:text-white">{item.name}</p>
                          {(item.removed.length > 0 || item.extras.length > 0) && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {item.removed.map((r) => <span key={r.id} className="text-xs text-red-500 font-medium">- Sin {r.name}</span>)}
                              {item.extras.map((e) => <span key={e.id} className="text-xs text-emerald-500 font-medium">+ Extra {e.name}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-sm">{formatCOP(item.finalPrice)}</span>
                        <button onClick={() => setManualOrderItems(manualOrderItems.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-full transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Product selection block */}
              <div className="flex flex-col gap-4 border border-gray-100 dark:border-stone-800 rounded-[16px] p-5 relative">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">Añadir Producto</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-2 relative" id="product-dropdown-container">
                    <label className="block text-xs font-bold text-gray-700 dark:text-stone-300 mb-2">Seleccionar del Menú</label>
                    <div 
                      className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 cursor-pointer flex items-center justify-between"
                      onClick={() => {
                        const el = document.getElementById('product-dropdown');
                        if (el) el.classList.toggle('hidden');
                      }}
                    >
                      {manualSelectedProduct ? (
                        <div className="flex items-center gap-3">
                          <img src={manualSelectedProduct.image || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=200&h=200&auto=format&fit=crop"} alt="" className="w-6 h-6 rounded-md object-cover" />
                          <span>{manualSelectedProduct.name} - {formatCOP(manualSelectedProduct.price)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-- Elige un producto --</span>
                      )}
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                    
                    <div id="product-dropdown" className="hidden absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-stone-800 rounded-[16px] shadow-xl z-50 max-h-60 overflow-y-auto">
                      {products.filter(p => p.active).map(p => (
                        <div 
                          key={p.id}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-stone-800 cursor-pointer border-b border-gray-100 dark:border-stone-800/50 last:border-0"
                          onClick={() => {
                            setManualSelectedProduct(p);
                            setManualCustomRemoved([]);
                            setManualCustomExtras([]);
                            const el = document.getElementById('product-dropdown');
                            if (el) el.classList.add('hidden');
                          }}
                        >
                          <img src={p.image || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=200&h=200&auto=format&fit=crop"} alt="" className="w-10 h-10 rounded-[12px] object-cover" />
                          <div>
                            <p className="font-bold text-sm text-gray-900 dark:text-white">{p.name}</p>
                            <p className="text-xs text-brand-orange font-bold">{formatCOP(p.price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-stone-300 mb-2">Cantidad</label>
                    <input type="number" min="1" value={manualQuantity} onChange={e => setManualQuantity(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" />
                  </div>
                </div>

                {manualSelectedProduct && (
                  <div className="mt-2 space-y-4">
                    {/* Ingredients selector */}
                    {manualSelectedProduct.ingredients && manualSelectedProduct.ingredients.length > 0 && (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-700 dark:text-stone-300">Personalizar Ingredientes</label>
                        <div className="flex flex-wrap gap-2">
                          {manualSelectedProduct.ingredients.map((ing: ProductComponent) => {
                            const isRemoved = manualCustomRemoved.some(r => r.id === ing.id);
                            const isExtra = manualCustomExtras.some(e => e.id === ing.id);
                            
                            return (
                              <div key={ing.id} className="flex items-center gap-1 bg-gray-100 dark:bg-stone-800 rounded-full p-1 border border-gray-200 dark:border-stone-700">
                                <button 
                                  onClick={() => {
                                    if (isRemoved) setManualCustomRemoved(manualCustomRemoved.filter(r => r.id !== ing.id));
                                    else { setManualCustomRemoved([...manualCustomRemoved, ing]); setManualCustomExtras(manualCustomExtras.filter(e => e.id !== ing.id)); }
                                  }}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isRemoved ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-stone-700'}`}
                                >
                                  -
                                </button>
                                <span className={`text-xs font-medium px-2 ${isRemoved ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-stone-300'}`}>
                                  {ing.name}
                                </span>
                                <button 
                                  onClick={() => {
                                    if (isExtra) setManualCustomExtras(manualCustomExtras.filter(e => e.id !== ing.id));
                                    else { setManualCustomExtras([...manualCustomExtras, ing]); setManualCustomRemoved(manualCustomRemoved.filter(r => r.id !== ing.id)); }
                                  }}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isExtra ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-stone-700'}`}
                                >
                                  +
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <button onClick={handleAddProductToManualOrder} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-[12px] text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                      Agregar a la Orden
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t border-gray-100 dark:border-stone-800">
                <div className="flex gap-6 items-center">
                  <div className="text-sm">
                    <span className="text-gray-500">Subtotal: </span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCOP(manualOrderTotal)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Envío: </span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCOP(storeConfig.shippingRate)}</span>
                  </div>
                  <div className="text-lg">
                    <span className="text-gray-500">Total: </span>
                    <span className="font-black text-brand-orange">{formatCOP(manualOrderTotal + (manualOrderItems.length > 0 ? storeConfig.shippingRate : 0))}</span>
                  </div>
                </div>
                <button 
                  onClick={handleCreateManualOrder} 
                  disabled={manualOrderItems.length === 0 || !manualOrderClient.name}
                  className="bg-brand-orange text-white w-full md:w-auto px-8 py-3 rounded-[12px] font-bold hover:bg-[#e66500] disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4 md:mt-0"
                >
                  Enviar a Cocina
                </button>
              </div>
            </div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Alerta de Éxito de Ruta */}
      <AnimatePresence>
        {showAddressSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Ruta actualizada
          </motion.div>
        )}
      </AnimatePresence>

{/* Alerta Global de Nueva Orden (HU-20) */}
      {/* Modal Ver Detalles de Orden */}
      <AnimatePresence>
        {viewingOrder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingOrder(null)}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#151515] rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 dark:border-stone-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 flex items-center justify-between border-b border-gray-100 dark:border-stone-800 shrink-0">
                <div>
                  <h3 className="font-bold text-2xl text-gray-900 dark:text-white leading-tight">Orden {viewingOrder.id}</h3>
                  <p className="text-gray-500 font-medium">Detalles completos de la orden</p>
                </div>
                <button onClick={() => setViewingOrder(null)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-stone-800 flex items-center justify-center text-gray-500 dark:text-stone-400 hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-stone-900 p-4 rounded-2xl border border-gray-100 dark:border-stone-800">
                   <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-stone-400 mb-1">Estado</p>
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex ${
                        viewingOrder.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        viewingOrder.status === 'En Preparación' ? 'bg-blue-100 text-blue-800' :
                        (viewingOrder.status as string) === 'Listo para Entregar' ? 'bg-green-100 text-green-800' :
                        viewingOrder.status === 'Entregado' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {viewingOrder.status}
                      </span>
                   </div>
                   <div className="text-center border-x border-gray-200 dark:border-stone-700 px-2">
                      <p className="text-sm font-medium text-gray-500 dark:text-stone-400 mb-1">Pago</p>
                      {(!viewingOrder.paymentMethod || viewingOrder.paymentMethod === 'online' || viewingOrder.paymentStatus === 'Pagado' || viewingOrder.status === 'Pagado') ? (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold inline-flex bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                          Digital
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold inline-flex bg-brand-orange/10 text-brand-orange">
                          Efectivo
                        </span>
                      )}
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-medium text-gray-500 dark:text-stone-400 mb-1">Total</p>
                      <p className="text-lg font-black text-brand-orange">{formatCOP(viewingOrder.total)}</p>
                   </div>
                </div>

                <div>
                   <h4 className="font-bold text-gray-900 dark:text-white mb-4">Información del Cliente</h4>
                   <div className="space-y-3">
                     <p className="text-gray-600 dark:text-stone-300 flex items-center gap-2">
                        <Users className="w-4 h-4 shrink-0" /> <span className="font-medium text-gray-900 dark:text-white">{viewingOrder.client || 'Cliente General'}</span>
                     </p>
                     {viewingOrder.clientPhone && (
                       <p className="text-gray-600 dark:text-stone-300 flex items-center gap-2">
                          <span className="w-4 h-4 shrink-0 font-bold flex items-center justify-center text-[10px] border border-gray-400 rounded-full">TEL</span> <span className="font-medium">{viewingOrder.clientPhone}</span>
                       </p>
                     )}
                     <p className="text-gray-600 dark:text-stone-300 flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-1 shrink-0" /> <span className="font-medium">{viewingOrder.address}</span>
                     </p>
                     <p className="text-gray-600 dark:text-stone-300 flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0" /> <span className="font-medium">{new Date(viewingOrder.date || Date.now()).toLocaleString()}</span>
                     </p>
                   </div>
                </div>

                <div>
                   <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                     <span>Información del Domiciliario</span>
                     {(() => {
                       const live = orders.find(o => o.id === viewingOrder.id) || viewingOrder;
                       const dName = live.driverName || viewingOrder.driverName;
                       return dName ? (
                         <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                           Asignado
                         </span>
                       ) : (
                         <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                           Por Asignar
                         </span>
                       );
                     })()}
                   </h4>
                   {(() => {
                     const live = orders.find(o => o.id === viewingOrder.id) || viewingOrder;
                     const dName = live.driverName || viewingOrder.driverName;
                     const driverFromStaff = staff.find(s => s.name === dName || s.currentOrderId === live.id);
                     const phone = live.driverPhone || driverFromStaff?.phone || '3114567890';
                     const plate = live.driverPlate || driverFromStaff?.plate || 'CW-789';
                     const vehicle = live.driverVehicle || driverFromStaff?.vehicle || 'Moto Honda CB125';

                     if (dName) {
                       return (
                         <div className="bg-orange-50/50 dark:bg-stone-900 p-4 rounded-2xl border border-brand-orange/20 space-y-3">
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                               <div className="w-11 h-11 bg-brand-orange text-white rounded-xl flex items-center justify-center font-bold text-base shadow-sm">
                                 🛵
                               </div>
                               <div>
                                 <p className="font-black text-gray-900 dark:text-white text-base leading-tight">{dName}</p>
                                 <p className="text-xs text-brand-orange font-bold mt-0.5">Domiciliario Oficial Copiway</p>
                               </div>
                             </div>
                             <div className="text-right">
                               <span className="text-xs font-mono font-bold bg-white dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-stone-700 text-gray-800 dark:text-stone-200">
                                 {plate}
                               </span>
                             </div>
                           </div>

                           <div className="grid grid-cols-2 gap-2 pt-2 border-t border-brand-orange/10 text-xs">
                             <div className="text-gray-600 dark:text-stone-400">
                               <span className="block text-[10px] text-gray-400 dark:text-stone-500 uppercase font-bold">Vehículo</span>
                               <span className="font-semibold text-gray-800 dark:text-stone-200">{vehicle}</span>
                             </div>
                             <div className="text-gray-600 dark:text-stone-400">
                               <span className="block text-[10px] text-gray-400 dark:text-stone-500 uppercase font-bold">Teléfono</span>
                               <span className="font-semibold text-gray-800 dark:text-stone-200">{phone}</span>
                             </div>
                           </div>

                           <div className="flex items-center gap-2 pt-2">
                             <a
                               href={`https://wa.me/57${phone.replace(/\D/g, '')}`}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                             >
                               <span>WhatsApp</span>
                             </a>
                             <a
                               href={`tel:${phone}`}
                               className="py-2 px-3 bg-white dark:bg-stone-800 hover:bg-gray-100 dark:hover:bg-stone-700 text-gray-700 dark:text-stone-200 border border-gray-200 dark:border-stone-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                             >
                               <span>Llamar</span>
                             </a>
                           </div>
                         </div>
                       );
                     }

                     return (
                       <div className="bg-gray-50 dark:bg-stone-900 p-4 rounded-xl border border-gray-100 dark:border-stone-800 text-center py-5">
                         <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-stone-800 text-gray-400 flex items-center justify-center mx-auto mb-2">
                           <User className="w-4 h-4" />
                         </div>
                         <p className="text-sm font-bold text-gray-700 dark:text-stone-300">Aún no se ha asignado un repartidor</p>
                         <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
                           El pedido aparecerá en el módulo de Domiciliarios cuando cocina lo marque como "Listo" o cuando un domiciliario lo tome en su app.
                         </p>
                       </div>
                     );
                   })()}
                </div>

                <div>
                   <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" /> Artículos ({viewingOrder.items.length})
                   </h4>
                   <ul className="space-y-3">
                     {viewingOrder.items.map((item: OrderItem, idx: number) => (
                        <li key={idx} className="flex flex-col text-gray-800 dark:text-stone-200 bg-gray-50 dark:bg-stone-900 px-4 py-3 rounded-xl border border-gray-100 dark:border-stone-800">
                          <div className="flex justify-between w-full">
                            <span className="font-medium"><span className="text-brand-orange font-bold mr-2">{item.quantity}x</span> {item.name}</span>
                            {item.price && <span className="font-bold">{formatCOP(item.price * (item.quantity || 1))}</span>}
                          </div>
                          {item.modifications && item.modifications.length > 0 && (
                            <ul className="mt-2 space-y-1 pl-6">
                              {item.modifications.map((mod: string, mIdx: number) => (
                                <li key={mIdx} className="text-sm font-bold text-red-500">{mod}</li>
                              ))}
                            </ul>
                          )}
                        </li>
                     ))}
                   </ul>
                   
                   {(viewingOrder.subtotal || viewingOrder.shipping || viewingOrder.discount) && (
                     <div className="mt-4 border-t border-gray-200 dark:border-stone-700 pt-4 space-y-2">
                       {viewingOrder.subtotal && (
                         <div className="flex justify-between text-sm text-gray-600 dark:text-stone-400">
                           <span>Subtotal</span>
                           <span>{formatCOP(viewingOrder.subtotal)}</span>
                         </div>
                       )}
                       {viewingOrder.shipping && (
                         <div className="flex justify-between text-sm text-gray-600 dark:text-stone-400">
                           <span>Domicilio</span>
                           <span>{formatCOP(viewingOrder.shipping)}</span>
                         </div>
                       )}
                       {viewingOrder.discount > 0 && (
                         <div className="flex justify-between text-sm text-brand-orange font-bold">
                           <span>Descuento</span>
                           <span>-{formatCOP(viewingOrder.discount)}</span>
                         </div>
                       )}
                       <div className="flex justify-between text-lg font-black text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-stone-800">
                         <span>Total</span>
                         <span>{formatCOP(viewingOrder.total)}</span>
                       </div>
                     </div>
                   )}
                </div>
              </div>
              <div className="p-6 md:p-8 bg-gray-50 dark:bg-stone-900 border-t border-gray-100 dark:border-stone-800 shrink-0">
                <button 
                  onClick={() => setViewingOrder(null)}
                  className="w-full bg-black text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-sm"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerta Global de Nueva Orden (HU-20) */}
      <AnimatePresence>
        {showOrderAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 bg-brand-orange text-white shadow-2xl p-4 pr-6 rounded-[20px] w-[90%] max-w-md"
          >
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-lg">¡Nueva Orden Recibida!</p>
              <p className="text-sm font-medium text-white/90">El sistema procesó el pago y despachó a cocina.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      
      {/* Staff Modal - Perfil de Empleado (Diseño Tranquilo y Minimalista) */}
      <AnimatePresence>
        {selectedStaffInfo && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
            onClick={() => setSelectedStaffInfo(null)}
          >
            <motion.div 
              initial={{ scale: 0.96, opacity: 0, y: 16 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.96, opacity: 0, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#18181b] w-full max-w-lg rounded-3xl overflow-hidden shadow-xl border border-gray-100 dark:border-stone-800 flex flex-col my-6"
            >
              {/* Cabecera Limpia y Serena */}
              <div className="p-6 pb-5 flex items-center justify-between border-b border-gray-100 dark:border-stone-800">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-brand-orange border border-orange-100 dark:border-orange-900/30 flex items-center justify-center font-bold text-lg shrink-0">
                    {staffEditData.name ? staffEditData.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'EM'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {staffEditData.name || selectedStaffInfo.name}
                      </h3>
                      {staffEditData.active ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-stone-800 dark:text-stone-400">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-stone-400 mt-0.5">
                      {staffEditData.role} • ID: #{selectedStaffInfo.id ? selectedStaffInfo.id.slice(-6) : '000000'}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedStaffInfo(null)} 
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-stone-800 dark:hover:bg-stone-700 flex items-center justify-center text-gray-500 dark:text-stone-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenido del Formulario */}
              <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                
                {/* Nombre y Rol */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-stone-300 mb-1.5">
                      Nombre Completo
                    </label>
                    <input 
                      type="text" 
                      value={staffEditData.name} 
                      onChange={e => setStaffEditData({...staffEditData, name: e.target.value})} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-gray-50/50 dark:bg-stone-900/50 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:bg-white dark:focus:bg-stone-900 transition-colors" 
                      placeholder="Nombre del empleado"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-stone-300 mb-1.5">
                      Rol Operativo
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100/80 dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 h-[42px] items-center">
                      <button
                        type="button"
                        onClick={() => setStaffEditData({...staffEditData, role: 'Ayudante de cocina'})}
                        className={`h-full flex items-center justify-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          staffEditData.role === 'Ayudante de cocina'
                            ? 'bg-white dark:bg-stone-800 text-brand-orange shadow-sm border border-gray-200/80 dark:border-stone-700'
                            : 'text-gray-500 dark:text-stone-400 hover:text-gray-800 dark:hover:text-stone-200'
                        }`}
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>Cocina</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStaffEditData({...staffEditData, role: 'Domiciliario'})}
                        className={`h-full flex items-center justify-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          staffEditData.role === 'Domiciliario'
                            ? 'bg-white dark:bg-stone-800 text-brand-orange shadow-sm border border-gray-200/80 dark:border-stone-700'
                            : 'text-gray-500 dark:text-stone-400 hover:text-gray-800 dark:hover:text-stone-200'
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Domiciliario</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Correo y Teléfono */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-stone-300 mb-1.5">
                      Correo Electrónico
                    </label>
                    <input 
                      type="email" 
                      value={staffEditData.email} 
                      onChange={e => setStaffEditData({...staffEditData, email: e.target.value})} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-gray-50/50 dark:bg-stone-900/50 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:bg-white dark:focus:bg-stone-900 transition-colors" 
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-stone-300 mb-1.5">
                      Teléfono
                    </label>
                    <input 
                      type="tel" 
                      value={staffEditData.phone} 
                      onChange={e => setStaffEditData({...staffEditData, phone: e.target.value})} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-gray-50/50 dark:bg-stone-900/50 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:bg-white dark:focus:bg-stone-900 transition-colors" 
                      placeholder="300 123 4567"
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-stone-300">
                      Contraseña de Acceso
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
                        setStaffEditData({ ...staffEditData, password: randomPass });
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange hover:text-brand-orange/80 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3 h-3" /> Generar PIN aleatorio
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showStaffPassword ? "text" : "password"} 
                      value={staffEditData.password} 
                      onChange={e => setStaffEditData({...staffEditData, password: e.target.value})} 
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-gray-50/50 dark:bg-stone-900/50 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange focus:bg-white dark:focus:bg-stone-900 transition-colors" 
                      placeholder="Contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStaffPassword(!showStaffPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-stone-300 cursor-pointer"
                    >
                      {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Si es domiciliario: datos de transporte */}
                {staffEditData.role === 'Domiciliario' && (
                  <div className="space-y-3.5 p-3.5 rounded-2xl bg-gray-50 dark:bg-stone-900/40 border border-gray-100 dark:border-stone-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-stone-300 mb-1">
                          Placa
                        </label>
                        <input 
                          type="text" 
                          value={staffEditData.plate || ''} 
                          onChange={e => setStaffEditData({...staffEditData, plate: e.target.value.toUpperCase()})} 
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-semibold uppercase text-gray-900 dark:text-white outline-none focus:border-brand-orange" 
                          placeholder="ABC-123"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-stone-300 mb-1">
                          Vehículo
                        </label>
                        <input 
                          type="text" 
                          value={staffEditData.vehicle || ''} 
                          onChange={e => setStaffEditData({...staffEditData, vehicle: e.target.value})} 
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange" 
                          placeholder="Ej. Moto Honda"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-stone-300 mb-1">
                        Base Efectivo Asignada (Sencillo)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">$</span>
                        <input 
                          type="number" 
                          value={staffEditData.baseCash === 0 ? '' : staffEditData.baseCash} 
                          onChange={e => setStaffEditData({...staffEditData, baseCash: e.target.value === '' ? '' : parseInt(e.target.value)})} 
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-black text-gray-900 dark:text-white outline-none focus:border-brand-orange" 
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Estado de acceso */}
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-stone-900/40 border border-gray-100 dark:border-stone-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-stone-200">Estado de la cuenta</p>
                    <p className="text-[11px] text-gray-500 dark:text-stone-400">
                      {staffEditData.active ? 'Habilitado para iniciar sesión' : 'Desactivado (Soft delete, conserva historial)'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStaffEditData({ ...staffEditData, active: !staffEditData.active })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      staffEditData.active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-stone-700'
                    }`}
                  >
                    <span 
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        staffEditData.active ? 'translate-x-4' : 'translate-x-0'
                      }`} 
                    />
                  </button>
                </div>

                {/* Compartir por WhatsApp (Discreto y útil) */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-500 dark:text-stone-400">¿Notificar al empleado?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const text = `Hamburguer Copiway - Credenciales de Acceso\nHola ${staffEditData.name || selectedStaffInfo.name}, tus credenciales son:\nUsuario: ${staffEditData.email}\nContraseña: ${staffEditData.password}\nRol: ${staffEditData.role}`;
                        navigator.clipboard.writeText(text);
                        setCopiedStaffCreds(true);
                        setTimeout(() => setCopiedStaffCreds(false), 2500);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-stone-700 text-xs font-medium text-gray-700 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {copiedStaffCreds ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedStaffCreds ? 'Copiado' : 'Copiar datos'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const text = encodeURIComponent(`Hamburguer Copiway - Credenciales de Acceso\nHola ${staffEditData.name || selectedStaffInfo.name}, tus credenciales son:\nUsuario: ${staffEditData.email}\nContraseña: ${staffEditData.password}\nRol: ${staffEditData.role}`);
                        const phoneClean = (staffEditData.phone || '').replace(/\D/g, '');
                        window.open(`https://wa.me/${phoneClean ? (phoneClean.startsWith('57') ? phoneClean : '57' + phoneClean) : ''}?text=${text}`, '_blank');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/30 text-xs font-medium hover:bg-emerald-100/60 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Botones de Pie */}
              <div className="p-4 px-6 bg-gray-50/70 dark:bg-stone-900/40 border-t border-gray-100 dark:border-stone-800 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setSelectedStaffInfo(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-stone-400 hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    updateStaff(selectedStaffInfo.id, { 
                      name: staffEditData.name,
                      email: staffEditData.email, 
                      phone: staffEditData.phone, 
                      password: staffEditData.password,
                      role: staffEditData.role,
                      plate: staffEditData.plate,
                      vehicle: staffEditData.vehicle,
                      active: staffEditData.active,
                      baseCash: staffEditData.baseCash === '' ? 0 : staffEditData.baseCash
                    });
                    showToast('staff', 'Los datos del empleado han sido actualizados correctamente.', 'Colaborador Actualizado');
                    setSelectedStaffInfo(null);
                  }}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-brand-orange text-white hover:bg-brand-orange/90 transition-colors shadow-sm cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Modal */}
      <AnimatePresence>
        {selectedClientInfo && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#151515] w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 flex items-center justify-between border-b border-gray-100 dark:border-stone-800 shrink-0">
                <div>
                  <h3 className="font-bold text-2xl text-gray-900 dark:text-white leading-tight">Historial del Cliente</h3>
                  <p className="text-gray-500 font-medium">{selectedClientInfo.name} - {selectedClientInfo.phone}</p>
                </div>
                <button onClick={() => setSelectedClientInfo(null)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-stone-800 flex items-center justify-center text-gray-500 dark:text-stone-400 hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 md:p-8 space-y-4 overflow-y-auto">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Pedidos Realizados</h4>
                {orders.filter(o => o.clientPhone === selectedClientInfo.phone || o.client === selectedClientInfo.name).length === 0 ? (
                   <p className="text-gray-500 text-sm">No hay pedidos registrados.</p>
                ) : (
                   orders.filter(o => o.clientPhone === selectedClientInfo.phone || o.client === selectedClientInfo.name).map(o => (
                     <div key={o.id} className="border border-gray-100 dark:border-stone-800 p-4 rounded-xl">
                       <div className="flex justify-between items-start mb-2">
                         <span className="font-bold text-gray-900 dark:text-white">{o.id}</span>
                         <span className="font-bold text-brand-orange">{formatCOP(o.total)}</span>
                       </div>
                       <p className="text-sm text-gray-600 dark:text-stone-300">{new Date(o.date).toLocaleString()}</p>
                       <p className="text-sm text-gray-600 dark:text-stone-300 mt-2"><strong>Entregado por:</strong> {o.driverName || 'No asignado'}</p>
                     </div>
                   ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TimePickerModal
        isOpen={showTimePicker !== null}
        onClose={() => setShowTimePicker(null)}
        initialTime={showTimePicker === 'open' ? storeConfig.openTime : storeConfig.closeTime}
        onSave={(time) => {
          if (showTimePicker === 'open') {
            updateStoreConfig({ openTime: time });
            showToast('config', `Hora de apertura actualizada a ${time}`, 'Horario');
          } else if (showTimePicker === 'close') {
            updateStoreConfig({ closeTime: time });
            showToast('config', `Hora de cierre actualizada a ${time}`, 'Horario');
          }
        }}
      />

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

      <ToastNotification 
        toast={toastData} 
        onClose={() => setToastData(null)} 
      />
    </div>
  );
}
