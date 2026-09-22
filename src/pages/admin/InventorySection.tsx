import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Minus, Package, Plus, PlusCircle, Search, Trash2, TriangleAlert, Wallet, X
} from 'lucide-react';

import { formatCOP } from '../../lib/format';
import { InventoryItem, InventoryLog } from '../../store/almacenAplicacion';
import { ToastData } from '../../components/ToastNotification';
import { CustomSelect } from '../../components/CustomSelect';
import { ConfirmModalState } from '../AdminDashboard';

export interface NewInventoryItemState {
  name: string;
  stock: string;
  totalCost: string;
  unit: string;
  category: string;
  supplier: string;
  notes: string;
}

interface InventorySectionProps {
  inventory: InventoryItem[];
  filteredInventory: InventoryItem[];
  filteredInventoryLogs: InventoryLog[];
  addInventoryItem: (item: InventoryItem) => Promise<void>;
  updateInventoryStock: (id: string, amount: number) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  newItem: NewInventoryItemState;
  setNewItem: React.Dispatch<React.SetStateAction<NewInventoryItemState>>;
  isInventoryModalOpen: boolean;
  setIsInventoryModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  inventorySearch: string;
  setInventorySearch: React.Dispatch<React.SetStateAction<string>>;
  inventoryHistorySearch: string;
  setInventoryHistorySearch: React.Dispatch<React.SetStateAction<string>>;
  showToast: (type: ToastData['type'], message: string, title?: string) => void;
  setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalState>>;
}

export default function InventorySection({
  inventory,
  filteredInventory,
  filteredInventoryLogs,
  addInventoryItem,
  updateInventoryStock,
  deleteInventoryItem,
  newItem,
  setNewItem,
  isInventoryModalOpen,
  setIsInventoryModalOpen,
  inventorySearch,
  setInventorySearch,
  inventoryHistorySearch,
  setInventoryHistorySearch,
  showToast,
  setConfirmModal,
}: InventorySectionProps) {
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
}
