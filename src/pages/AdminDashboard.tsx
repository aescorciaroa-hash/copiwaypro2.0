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
import OverviewSection from './admin/OverviewSection';
import MapSection from './admin/MapSection';
import MenuSection from './admin/MenuSection';
import InventorySection from './admin/InventorySection';
import StaffSection from './admin/StaffSection';
import OrdersSection from './admin/OrdersSection';
import ClientsSection from './admin/ClientsSection';
import SettingsSection from './admin/SettingsSection';



export const RoutePolyline = ({ origin, destination, outerColor, innerColor, onRouteLoaded }: { origin: [number, number], destination: [number, number], outerColor: string, innerColor: string, onRouteLoaded?: (coords: [number, number][]) => void }) => {
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


export const CustomZoomControl = () => {
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


export interface DriverMockOrder {
  id: string;
  client: string;
  address: string;
  status: string;
  items: string[];
  total: number;
  paymentMethod?: string;
  paymentStatus?: string;
}

export interface DriverMockInfo {
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

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
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

export const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
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
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
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
            {activeTab === 'overview' && (
              <OverviewSection
                orders={orders}
                staff={staff}
                storeConfig={storeConfig}
                salesData={salesData}
                salesFilter={salesFilter}
                setSalesFilter={setSalesFilter}
                topProductsData={topProductsData}
                activePieIndex={activePieIndex}
                setActivePieIndex={setActivePieIndex}
                handleNavigateToOrders={handleNavigateToOrders}
                setActiveTab={setActiveTab}
              />
            )}
            {activeTab === 'orders' && (
              <OrdersSection
                orders={orders}
                staff={staff}
                theme={theme}
                driversMockData={driversMockData}
                highlightedOrderId={highlightedOrderId}
                isMapExpanded={isMapExpanded}
                setIsMapExpanded={setIsMapExpanded}
                setSelectedDriverInfo={setSelectedDriverInfo}
                showManualForm={showManualForm}
                setShowManualForm={setShowManualForm}
                setEditingAddressOrder={setEditingAddressOrder}
                setNewAddress={setNewAddress}
                handleViewOrder={handleViewOrder}
              />
            )}
            {activeTab === 'map' && (
              <MapSection
                orders={orders}
                staff={staff}
                theme={theme}
                storeConfig={storeConfig}
                setActiveTab={setActiveTab}
                handleNavigateToOrders={handleNavigateToOrders}
                setEditingAddressOrder={setEditingAddressOrder}
                setNewAddress={setNewAddress}
              />
            )}
            {activeTab === 'menu' && (
              <MenuSection
                products={products}
                filteredProducts={filteredProducts}
                inventory={inventory}
                storeConfig={storeConfig}
                addProduct={addProduct}
                updateProduct={updateProduct}
                deleteProduct={deleteProduct}
                addCategory={addCategory}
                removeCategory={removeCategory}
                newProduct={newProduct}
                setNewProduct={setNewProduct}
                tempIngredientName={tempIngredientName}
                setTempIngredientName={setTempIngredientName}
                tempPackagingName={tempPackagingName}
                setTempPackagingName={setTempPackagingName}
                editingProductId={editingProductId}
                setEditingProductId={setEditingProductId}
                isProductModalOpen={isProductModalOpen}
                setIsProductModalOpen={setIsProductModalOpen}
                isCategoryManagerOpen={isCategoryManagerOpen}
                setIsCategoryManagerOpen={setIsCategoryManagerOpen}
                selectedCatalogCategory={selectedCatalogCategory}
                setSelectedCatalogCategory={setSelectedCatalogCategory}
                newCategoryInput={newCategoryInput}
                setNewCategoryInput={setNewCategoryInput}
                isInlineAddingCategory={isInlineAddingCategory}
                setIsInlineAddingCategory={setIsInlineAddingCategory}
                inlineCategoryName={inlineCategoryName}
                setInlineCategoryName={setInlineCategoryName}
                catalogSearch={catalogSearch}
                setCatalogSearch={setCatalogSearch}
                showToast={showToast}
                setConfirmModal={setConfirmModal}
              />
            )}
            {activeTab === 'inventory' && (
              <InventorySection
                inventory={inventory}
                filteredInventory={filteredInventory}
                filteredInventoryLogs={filteredInventoryLogs}
                addInventoryItem={addInventoryItem}
                updateInventoryStock={updateInventoryStock}
                deleteInventoryItem={deleteInventoryItem}
                newItem={newItem}
                setNewItem={setNewItem}
                isInventoryModalOpen={isInventoryModalOpen}
                setIsInventoryModalOpen={setIsInventoryModalOpen}
                inventorySearch={inventorySearch}
                setInventorySearch={setInventorySearch}
                inventoryHistorySearch={inventoryHistorySearch}
                setInventoryHistorySearch={setInventoryHistorySearch}
                showToast={showToast}
                setConfirmModal={setConfirmModal}
              />
            )}
            {activeTab === 'staff' && (
              <StaffSection
                staff={staff}
                filteredStaff={filteredStaff}
                paginatedStaff={paginatedStaff}
                staffTotalPages={staffTotalPages}
                staffCurrentPage={staffCurrentPage}
                setStaffCurrentPage={setStaffCurrentPage}
                staffSearch={staffSearch}
                setStaffSearch={setStaffSearch}
                addStaff={addStaff}
                updateStaff={updateStaff}
                deleteStaff={deleteStaff}
                newStaff={newStaff}
                setNewStaff={setNewStaff}
                showStaffPassword={showStaffPassword}
                setShowStaffPassword={setShowStaffPassword}
                handleOpenStaffModal={handleOpenStaffModal}
                showToast={showToast}
                setConfirmModal={setConfirmModal}
              />
            )}
            {activeTab === 'clients' && (
              <ClientsSection
                filteredClients={filteredClients}
                customerSearch={customerSearch}
                setCustomerSearch={setCustomerSearch}
                setSelectedClientInfo={setSelectedClientInfo}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsSection
                storeConfig={storeConfig}
                updateStoreConfig={updateStoreConfig}
                isStoreAutomaticallyOpen={isStoreAutomaticallyOpen}
                shippingRateInput={shippingRateInput}
                setShippingRateInput={setShippingRateInput}
                profitMarginInput={profitMarginInput}
                setProfitMarginInput={setProfitMarginInput}
                setShowTimePicker={setShowTimePicker}
                handleGenerarCierre={handleGenerarCierre}
                showToast={showToast}
              />
            )}
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
