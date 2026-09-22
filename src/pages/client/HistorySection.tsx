import { AnimatePresence, motion } from 'motion/react';
import { Calendar, CheckCircle2, FileText, MapPin, RotateCcw, Search, ShoppingBag, Sparkles, Star, Truck, Wallet, X } from 'lucide-react';

import { formatCOP } from '../../lib/format';
import { Order, StoreConfig } from '../../store/almacenAplicacion';
import { UserProfileState } from '../ClientDashboard';

interface HistorySectionProps {
  orders: Order[];
  userProfile: UserProfileState;
  historySearch: string;
  setHistorySearch: (value: string) => void;
  historyFilter: 'all' | 'unrated' | 'rated';
  setHistoryFilter: (value: 'all' | 'unrated' | 'rated') => void;
  setActiveTab: (tab: string) => void;
  reviewingOrderId: string | null;
  setReviewingOrderId: (id: string | null) => void;
  reviewRating: number;
  setReviewRating: (rating: number) => void;
  reviewHoverRating: number;
  setReviewHoverRating: (rating: number) => void;
  reviewText: string;
  setReviewText: (text: string) => void;
  reviewTags: string[];
  setReviewTags: (tags: string[]) => void;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  showToast: (type: string, message: string, title?: string) => void;
  reorder: (order: Order) => void;
  viewingReceiptOrder: Order | null;
  setViewingReceiptOrder: (order: Order | null) => void;
  storeConfig: StoreConfig;
}

export default function HistorySection({
  orders, userProfile, historySearch, setHistorySearch, historyFilter, setHistoryFilter,
  setActiveTab, reviewingOrderId, setReviewingOrderId, reviewRating, setReviewRating,
  reviewHoverRating, setReviewHoverRating, reviewText, setReviewText, reviewTags, setReviewTags,
  updateOrder, showToast, reorder, viewingReceiptOrder, setViewingReceiptOrder, storeConfig,
}: HistorySectionProps) {
  const allDeliveredOrders = orders.filter(o => o.status === 'Entregado' || o.status === 'entregado');
  const historyList = allDeliveredOrders.length > 0 ? allDeliveredOrders : orders;

  const filteredHistory = historyList.filter(order => {
    const matchesSearch = !historySearch.trim() ||
      order.id.toLowerCase().includes(historySearch.toLowerCase()) ||
      (order.items || []).some((it) => it.name?.toLowerCase().includes(historySearch.toLowerCase()));

    if (historyFilter === 'rated') {
      return matchesSearch && Boolean(order.rating);
    }
    if (historyFilter === 'unrated') {
      return matchesSearch && !order.rating;
    }
    return matchesSearch;
  });

  const totalSpent = historyList.reduce((acc, o) => acc + (o.total || 0), 0);
  const unratedCount = historyList.filter(o => !o.rating).length;
  const feedbackTagsList = ['🍔 Delicioso', '🔥 Calientito', '⚡ Súper Rápido', '👑 Buena Porción', '🍟 Crujiente'];

  return (
    <div className="space-y-8">
      {/* Simple & Clean History Header */}
      <div className="bg-stone-900 dark:bg-[#151515] text-white p-6 sm:p-7 rounded-[28px] border border-stone-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Historial de Pedidos
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-md leading-relaxed">
            Consulta tus compras o repite pedidos en 1 clic.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-stone-800/80 px-5 py-3 rounded-2xl border border-stone-700/50 shrink-0 self-start sm:self-auto">
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Pedidos</span>
            <p className="text-lg font-black text-white">{historyList.length}</p>
          </div>
          <div className="w-px h-7 bg-stone-700" />
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Puntos</span>
            <p className="text-lg font-black text-brand-orange">{userProfile.points} pts</p>
          </div>
          <div className="w-px h-7 bg-stone-700" />
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Invertido</span>
            <p className="text-sm font-black text-emerald-400">{formatCOP(totalSpent)}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={historySearch}
            onChange={e => setHistorySearch(e.target.value)}
            placeholder="Buscar por # Orden o plato..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-[#151515] border border-gray-200 dark:border-stone-800 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-orange transition-all shadow-sm"
          />
          {historySearch && (
            <button
              onClick={() => setHistorySearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setHistoryFilter('all')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border ${
              historyFilter === 'all'
                ? 'bg-brand-orange text-white border-brand-orange shadow-sm'
                : 'bg-white dark:bg-[#151515] text-gray-600 dark:text-stone-300 border-gray-200 dark:border-stone-800 hover:border-brand-orange'
            }`}
          >
            Todos ({historyList.length})
          </button>
          <button
            onClick={() => setHistoryFilter('unrated')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
              historyFilter === 'unrated'
                ? 'bg-brand-orange text-white border-brand-orange shadow-sm'
                : 'bg-white dark:bg-[#151515] text-gray-600 dark:text-stone-300 border-gray-200 dark:border-stone-800 hover:border-brand-orange'
            }`}
          >
            <Star className="w-3.5 h-3.5" /> Pendientes ({unratedCount})
          </button>
          <button
            onClick={() => setHistoryFilter('rated')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border ${
              historyFilter === 'rated'
                ? 'bg-brand-orange text-white border-brand-orange shadow-sm'
                : 'bg-white dark:bg-[#151515] text-gray-600 dark:text-stone-300 border-gray-200 dark:border-stone-800 hover:border-brand-orange'
            }`}
          >
            Calificados ({historyList.length - unratedCount})
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-stone-800 flex items-center justify-center text-gray-400 mb-4">
            <RotateCcw className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {historySearch ? 'No se encontraron pedidos con ese criterio' : 'No tienes pedidos anteriores en esta categoría'}
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            Explora nuestras especialidades en el catálogo.
          </p>
          <button
            onClick={() => { setHistorySearch(''); setHistoryFilter('all'); setActiveTab('catalog'); }}
            className="mt-6 px-6 py-3 bg-brand-orange text-white rounded-full text-xs font-bold shadow-md hover:bg-[#e66500] transition-colors"
          >
            Ir al Menú
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredHistory.map(order => {
            const isReviewingThis = reviewingOrderId === order.id;
            const formattedDate = new Date(order.date).toLocaleDateString('es-CO', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-[#151515] rounded-[32px] border border-gray-100 dark:border-stone-800 shadow-sm p-6 sm:p-8 hover:shadow-md transition-all space-y-6"
              >
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-stone-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                        {order.id}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/40">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Entregado
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-300 font-semibold text-[11px]">
                        {order.paymentMethod === 'online' ? '💳 Pago Digital' : '💵 Efectivo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                      {order.address && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 truncate max-w-xs">
                            <MapPin className="w-3.5 h-3.5 text-brand-orange shrink-0" /> {order.address}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right flex sm:flex-col justify-between items-end">
                    <p className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                      {formatCOP(order.total)}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mt-0.5">
                      +{order.pointsEarned || Math.floor((order.total || 0) / 1000)} Puntos Ganados
                    </p>
                  </div>
                </div>

                {/* Items List with Custom Modifiers */}
                <div className="space-y-3 bg-gray-50/70 dark:bg-stone-900/40 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-stone-800/60">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Productos del Pedido
                  </span>
                  {(order.items || []).map((item, idx: number) => (
                    <div key={item.id || idx} className="flex items-start justify-between text-sm py-1.5 border-b border-gray-100 dark:border-stone-800 last:border-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-stone-200">
                          <span className="w-6 h-6 rounded-lg bg-brand-orange/10 text-brand-orange text-xs flex items-center justify-center font-black">
                            {item.quantity}x
                          </span>
                          <span>{item.name}</span>
                        </div>

                        {/* Customizations (SIN in red, EXTRA in green) */}
                        <div className="flex flex-wrap gap-1.5 pl-8">
                          {(item.removed || []).map((rem, rIdx: number) => (
                            <span key={rIdx} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800/40">
                              ✕ SIN {rem.name}
                            </span>
                          ))}
                          {(item.extras || []).map((ext, eIdx: number) => (
                            <span key={eIdx} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                              + EXTRA {ext.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <span className="font-bold text-gray-900 dark:text-white text-sm whitespace-nowrap pl-4">
                        {formatCOP(item.finalPrice || item.price || 0)}
                      </span>
                    </div>
                  ))}

                  {/* Driver metadata if available */}
                  {order.driverName && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-stone-800 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-brand-orange" />
                        Entregado por: <strong className="text-gray-800 dark:text-stone-200">{order.driverName}</strong>
                      </span>
                      {order.driverPlate && (
                        <span className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 font-mono text-[10px] font-bold">
                          {order.driverPlate}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Rating / Review Interactive Box */}
                <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-gray-100 dark:border-stone-800">
                  {order.rating ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tu Calificación</span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                          Reseña Verificada
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1 text-brand-orange">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= order.rating ? 'fill-current text-brand-orange' : 'text-gray-300 dark:text-stone-700'}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-gray-700 dark:text-stone-300">
                          {order.rating} de 5 estrellas
                        </span>
                      </div>
                      {order.reviewText && (
                        <p className="text-xs text-gray-600 dark:text-stone-400 italic bg-gray-50 dark:bg-stone-800/40 p-3 rounded-xl border border-gray-100 dark:border-stone-800">
                          "{order.reviewText}"
                        </p>
                      )}
                    </div>
                  ) : isReviewingThis ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-brand-orange uppercase tracking-wider">
                          ⭐ ¿Cómo estuvo tu pedido {order.id}?
                        </span>
                        <button
                          onClick={() => { setReviewingOrderId(null); setReviewRating(0); setReviewText(''); setReviewTags([]); }}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Cancelar
                        </button>
                      </div>

                      {/* Star selector */}
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onMouseEnter={() => setReviewHoverRating(star)}
                              onMouseLeave={() => setReviewHoverRating(0)}
                              onClick={() => setReviewRating(star)}
                              className="p-1 hover:scale-110 transition-transform"
                            >
                              <Star
                                className={`w-7 h-7 ${
                                  (reviewHoverRating || reviewRating) >= star
                                    ? 'fill-brand-orange text-brand-orange drop-shadow-sm'
                                    : 'text-gray-300 dark:text-stone-700'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-gray-700 dark:text-stone-300">
                          {reviewRating > 0 ? `${reviewRating} de 5 estrellas` : 'Toca para calificar'}
                        </span>
                      </div>

                      {/* Feedback chips */}
                      <div className="flex flex-wrap gap-2">
                        {feedbackTagsList.map((tag, tIdx) => {
                          const isSelected = reviewTags.includes(tag);
                          return (
                            <button
                              key={tIdx}
                              type="button"
                              onClick={() => {
                                if (isSelected) setReviewTags(reviewTags.filter(t => t !== tag));
                                else setReviewTags([...reviewTags, tag]);
                              }}
                              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all border ${
                                isSelected
                                  ? 'bg-brand-orange text-white border-brand-orange shadow-sm'
                                  : 'bg-gray-50 dark:bg-stone-800 text-gray-600 dark:text-stone-300 border-gray-200 dark:border-stone-700 hover:border-brand-orange'
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>

                      {/* Comment input */}
                      <textarea
                        value={reviewText}
                        onChange={e => setReviewText(e.target.value)}
                        placeholder="Cuéntanos más detalles (sabor, temperatura, tiempo de entrega)..."
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-gray-50 dark:bg-stone-800 text-xs text-gray-900 dark:text-white outline-none focus:border-brand-orange resize-none h-16"
                      />

                      <button
                        type="button"
                        disabled={reviewRating === 0}
                        onClick={() => {
                          if (reviewRating > 0) {
                            const finalComment = [reviewTags.join(' • '), reviewText.trim()].filter(Boolean).join(' - ');
                            updateOrder(order.id, { rating: reviewRating, reviewText: finalComment });
                            setReviewingOrderId(null);
                            setReviewRating(0);
                            setReviewText('');
                            setReviewTags([]);
                            showToast('success', '¡Gracias por calificar tu pedido!', 'Reseña Guardada');
                          }
                        }}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                          reviewRating > 0
                            ? 'bg-brand-orange text-white shadow-md hover:bg-[#e66500]'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-stone-800'
                        }`}
                      >
                        Enviar Calificación
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-800 dark:text-stone-200 block">
                          ¿Qué tal estuvo tu pedido?
                        </span>
                        <span className="text-[11px] text-gray-400">
                          Ayúdanos a seguir mejorando con tu opinión sincera.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingOrderId(order.id);
                          setReviewRating(5);
                          setReviewText('');
                          setReviewTags([]);
                        }}
                        className="px-4 py-2 rounded-xl bg-brand-orange/10 text-brand-orange text-xs font-bold hover:bg-brand-orange/20 transition-colors flex items-center gap-1.5"
                      >
                        <Star className="w-3.5 h-3.5 fill-brand-orange" /> Calificar Pedido
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setViewingReceiptOrder(order)}
                    className="flex-1 py-3 px-4 rounded-2xl bg-gray-50 dark:bg-stone-800 border border-gray-200 dark:border-stone-700 text-gray-700 dark:text-stone-300 font-bold text-xs hover:bg-gray-100 dark:hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-brand-orange" />
                    Ver Detalle del Pedido
                  </button>

                  <button
                    type="button"
                    onClick={() => reorder(order)}
                    className="flex-1 py-3 px-4 rounded-2xl bg-brand-orange text-white font-bold text-xs hover:bg-[#e66500] shadow-md shadow-brand-orange/20 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Recompra en 1 Clic (Pedir lo mismo)
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modern Order Details Modal */}
      <AnimatePresence>
        {viewingReceiptOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setViewingReceiptOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#18181b] w-full max-w-lg rounded-[28px] overflow-hidden shadow-2xl border border-gray-100 dark:border-stone-800 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 dark:border-stone-800 flex items-center justify-between bg-gray-50/50 dark:bg-stone-900/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Detalle del Pedido
                      </h3>
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-brand-orange text-white">
                        {viewingReceiptOrder.id}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-stone-400 mt-0.5">
                      {new Date(viewingReceiptOrder.date).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingReceiptOrder(null)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-stone-800 dark:hover:bg-stone-700 flex items-center justify-center text-gray-500 dark:text-stone-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">

                {/* Status & Delivery Summary Card */}
                <div className="bg-gray-50 dark:bg-stone-900/60 rounded-2xl p-4 border border-gray-100 dark:border-stone-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado del Pedido</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      (viewingReceiptOrder.status as string) === 'delivered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                      (viewingReceiptOrder.status as string) === 'on_way' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                      (viewingReceiptOrder.status as string) === 'in_prep' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                      'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                    }`}>
                      {(viewingReceiptOrder.status as string) === 'delivered' ? '✓ Entregado' :
                       (viewingReceiptOrder.status as string) === 'on_way' ? '🛵 En camino' :
                       (viewingReceiptOrder.status as string) === 'in_prep' ? '👨‍🍳 En preparación' :
                       '📋 Recibido'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200/60 dark:border-stone-800 text-xs">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-gray-500 dark:text-stone-400 text-[11px]">Dirección de entrega</p>
                        <p className="font-semibold text-gray-900 dark:text-white mt-0.5 leading-snug">
                          {viewingReceiptOrder.address || userProfile.address || 'Domicilio'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Wallet className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-gray-500 dark:text-stone-400 text-[11px]">Método de pago</p>
                        <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                          {viewingReceiptOrder.paymentMethod === 'online' ? 'Pago Digital' : 'Efectivo al Entregar'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Productos ({viewingReceiptOrder.items?.length || 0})
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {(viewingReceiptOrder.items || []).map((it, iIdx: number) => (
                      <div
                        key={iIdx}
                        className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-gray-100 dark:border-stone-800 shadow-sm flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-stone-800 text-gray-900 dark:text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {it.quantity}x
                            </span>
                            <div>
                              <h5 className="font-bold text-gray-900 dark:text-white text-sm">
                                {it.name}
                              </h5>
                              {it.isCustom && (
                                <span className="inline-block mt-1 text-[11px] font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-md">
                                  Hamburguesa Personalizada
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-bold text-gray-900 dark:text-white text-sm shrink-0">
                            {formatCOP(it.finalPrice || it.price || 0)}
                          </span>
                        </div>

                        {/* Personalizaciones */}
                        {((it.removed && it.removed.length > 0) || (it.extras && it.extras.length > 0)) && (
                          <div className="flex flex-wrap gap-1.5 pt-1 pl-10">
                            {(it.removed || []).map((r, rI: number) => (
                              <span
                                key={rI}
                                className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-100 dark:border-red-900/40"
                              >
                                Sin {r.name}
                              </span>
                            ))}
                            {(it.extras || []).map((e, eI: number) => (
                              <span
                                key={eI}
                                className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40"
                              >
                                + Extra {e.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="bg-gray-50 dark:bg-stone-900/60 rounded-2xl p-4 border border-gray-100 dark:border-stone-800/80 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-gray-600 dark:text-stone-300">
                    <span>Subtotal productos</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCOP(viewingReceiptOrder.subtotal || viewingReceiptOrder.total - storeConfig.shippingRate)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-gray-600 dark:text-stone-300">
                    <span>Costo de domicilio (tarifa plana)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCOP(viewingReceiptOrder.shipping || storeConfig.shippingRate)}
                    </span>
                  </div>

                  {viewingReceiptOrder.discount > 0 && (
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Descuento especial cumpleaños</span>
                      <span>-{formatCOP(viewingReceiptOrder.discount)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200 dark:border-stone-700/60 flex justify-between items-center text-base font-bold text-gray-900 dark:text-white">
                    <span>Total pagado</span>
                    <span className="text-xl font-black text-brand-orange">
                      {formatCOP(viewingReceiptOrder.total)}
                    </span>
                  </div>
                </div>

                {/* Points banner */}
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-amber-900 dark:text-amber-300 text-xs">
                  <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <span className="font-bold">¡Puntos acumulados!</span>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                      Sumaste <strong className="font-black text-amber-800 dark:text-amber-200">+{viewingReceiptOrder.pointsEarned || Math.floor((viewingReceiptOrder.total || 0) / 1000)} pts</strong> Copiway en este pedido.
                    </p>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 dark:border-stone-800 bg-gray-50 dark:bg-stone-900/50 flex gap-3">
                <button
                  onClick={() => {
                    reorder(viewingReceiptOrder);
                    setViewingReceiptOrder(null);
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-brand-orange hover:bg-[#e66500] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-brand-orange/20 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Repetir Pedido
                </button>
                <button
                  onClick={() => setViewingReceiptOrder(null)}
                  className="px-6 py-3.5 rounded-2xl bg-gray-200 hover:bg-gray-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-gray-800 dark:text-white font-bold text-xs transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
