import React from 'react';
import { ChefHat, Plus, RotateCcw, X } from 'lucide-react';

import { formatCOP } from '../../lib/format';
import { CartItem, SyncedIngredient } from '../ClientDashboard';

interface BuilderSectionProps {
  builderStack: SyncedIngredient[];
  setBuilderStack: React.Dispatch<React.SetStateAction<SyncedIngredient[]>>;
  syncedIngredients: SyncedIngredient[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  editingCartItemId: string | null;
  setEditingCartItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveTab: (tab: string) => void;
  showToast: (type: import('../../components/ToastNotification').ToastData['type'], message: string, title?: string) => void;
}

export default function BuilderSection({
  builderStack,
  setBuilderStack,
  syncedIngredients,
  cart,
  setCart,
  editingCartItemId,
  setEditingCartItemId,
  setActiveTab,
  showToast,
}: BuilderSectionProps) {
  const getIngredientVisual = (name: string, index: number, variant: 'top' | 'bottom' | 'standard' = 'standard') => {
    const zIndex = 15 + index;
    const lower = (name || '').toLowerCase();

    // 1. Pan de Hamburguesa
    if (lower.includes('hamburguesa')) {
      if (variant === 'top') {
        return (
          <div key={`top-bun-${index}`} style={{ zIndex: 100 }} className="relative w-[230px] h-[64px] flex flex-col items-center drop-shadow-xl transition-all select-none mb-[-6px]">
            <div className="w-full h-full bg-gradient-to-b from-[#e89e3a] via-[#cf8122] to-[#ab5e12] rounded-t-[115px] rounded-b-[20px] shadow-[inset_0_-8px_16px_rgba(0,0,0,0.35)] border-b-2 border-[#8a4708] relative overflow-hidden">
              <div className="absolute top-2 left-6 w-36 h-7 bg-white/25 rounded-full blur-md transform -rotate-6"></div>
              {/* Sesame seeds */}
              <div className="absolute top-3 left-14 w-2 h-3 bg-[#fff3dc] rounded-full rotate-45 shadow-[0_1px_2px_rgba(0,0,0,0.3)]"></div>
              <div className="absolute top-3 left-28 w-2 h-3 bg-[#fff3dc] rounded-full -rotate-12 shadow-[0_1px_2px_rgba(0,0,0,0.3)]"></div>
              <div className="absolute top-4 right-20 w-2 h-3 bg-[#fff3dc] rounded-full rotate-25 shadow-[0_1px_2px_rgba(0,0,0,0.3)]"></div>
              <div className="absolute top-8 left-9 w-2 h-3 bg-[#fff3dc] rounded-full rotate-75 shadow-[0_1px_2px_rgba(0,0,0,0.3)]"></div>
              <div className="absolute top-7 left-24 w-2 h-3 bg-[#fff3dc] rounded-full -rotate-45 shadow-[0_1px_2px_rgba(0,0,0,0.3)]"></div>
              <div className="absolute top-9 right-14 w-2 h-3 bg-[#fff3dc] rounded-full rotate-12 shadow-[0_1px_2px_rgba(0,0,0,0.3)]"></div>
              <div className="absolute top-9 right-28 w-2 h-3 bg-[#fff3dc] rounded-full -rotate-20 shadow-[0_1px_2px_rgba(0,0,0,0.3)]"></div>
            </div>
          </div>
        );
      }
      return (
        <div key={`bot-bun-${index}`} style={{ zIndex: 5 }} className="relative w-[220px] h-[36px] flex flex-col items-center drop-shadow-md transition-all select-none mt-[-2px]">
          <div className="w-full h-[18px] bg-[#faebd7] rounded-t-[14px] border-t border-[#deb887] shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] flex items-center justify-center">
            <div className="w-[90%] h-[2px] bg-[#d2b48c]/40 rounded-full"></div>
          </div>
          <div className="w-full h-[20px] -mt-1 bg-gradient-to-b from-[#cf8122] to-[#9c510e] rounded-b-[26px] shadow-[inset_0_-4px_8px_rgba(0,0,0,0.3)] border-b border-[#733a08]"></div>
        </div>
      );
    }

    // 2. Pan de Perro
    if (lower.includes('perro')) {
      if (variant === 'top') {
        return (
          <div key={`top-dog-${index}`} style={{ zIndex: 100 }} className="relative w-[250px] h-[46px] flex flex-col items-center drop-shadow-xl transition-all select-none mb-[-5px]">
            <div className="w-full h-full bg-gradient-to-b from-[#e89f3e] via-[#d18424] to-[#a85e13] rounded-t-[30px] rounded-b-[16px] shadow-[inset_0_-6px_12px_rgba(0,0,0,0.3)] border-b-2 border-[#8a4708] relative overflow-hidden">
              <div className="absolute top-1.5 left-10 w-44 h-4 bg-white/25 rounded-full blur-sm"></div>
            </div>
          </div>
        );
      }
      return (
        <div key={`bot-dog-${index}`} style={{ zIndex: 5 }} className="relative w-[245px] h-[34px] flex flex-col items-center drop-shadow-md transition-all select-none mt-[-2px]">
          <div className="w-full h-[16px] bg-[#faebd7] rounded-t-[10px] border-t border-[#deb887]"></div>
          <div className="w-full h-[20px] -mt-1 bg-gradient-to-b from-[#cf8122] to-[#964f0e] rounded-b-[22px] border-b border-[#733a08]"></div>
        </div>
      );
    }

    // 3. Patacón
    if (lower.includes('patac')) {
      return (
        <div key={`patacon-${index}-${variant}`} style={{ zIndex }} className="relative w-[224px] h-[28px] flex items-center justify-center drop-shadow-md transition-all select-none my-[-4px]">
          <div className="w-full h-full bg-gradient-to-b from-[#e5b238] via-[#c49216] to-[#8f6406] rounded-[20px] border-2 border-[#734e02] shadow-[inset_0_2px_5px_rgba(255,255,255,0.3),inset_0_-2px_5px_rgba(0,0,0,0.4)] relative flex items-center justify-around px-4">
            <div className="w-2 h-2 bg-[#614101] rounded-full opacity-60"></div>
            <div className="w-1.5 h-1.5 bg-[#614101] rounded-full opacity-60"></div>
            <div className="w-2 h-2 bg-[#614101] rounded-full opacity-60"></div>
            <div className="w-1.5 h-1.5 bg-[#614101] rounded-full opacity-60"></div>
            <div className="absolute top-1 left-6 w-32 h-1 bg-white/30 rounded-full blur-[0.5px]"></div>
          </div>
        </div>
      );
    }

    // 4. Carne
    if (lower.includes('carne')) {
      return (
        <div key={`carne-${index}`} style={{ zIndex }} className="relative w-[220px] h-[34px] flex flex-col items-center drop-shadow-lg transition-all select-none my-[-4px]">
          <div className="w-full h-full bg-gradient-to-b from-[#4a2411] via-[#33180b] to-[#200c04] rounded-[18px] border border-[#240e04] shadow-[inset_0_3px_6px_rgba(255,255,255,0.1),inset_0_-3px_6px_rgba(0,0,0,0.5)] relative overflow-hidden flex items-center justify-around px-4">
            <div className="w-1.5 h-full bg-[#170802] rotate-12 opacity-80 shadow-sm"></div>
            <div className="w-1.5 h-full bg-[#170802] rotate-12 opacity-80 shadow-sm"></div>
            <div className="w-1.5 h-full bg-[#170802] rotate-12 opacity-80 shadow-sm"></div>
            <div className="w-1.5 h-full bg-[#170802] rotate-12 opacity-80 shadow-sm"></div>
            <div className="w-1.5 h-full bg-[#170802] rotate-12 opacity-80 shadow-sm"></div>
            <div className="absolute top-1 left-8 w-24 h-1.5 bg-white/20 rounded-full blur-[1px]"></div>
          </div>
        </div>
      );
    }

    // 5. Pollo
    if (lower.includes('pollo') || lower.includes('pechuga') || lower.includes('crispy')) {
      return (
        <div key={`pollo-${index}`} style={{ zIndex }} className="relative w-[220px] h-[30px] flex items-center justify-center drop-shadow-md transition-all select-none my-[-4px]">
          <div className="w-full h-full bg-gradient-to-b from-[#e39a32] via-[#bd7513] to-[#8c4f03] rounded-[16px] border border-[#7a4200] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)] relative flex items-center justify-around px-3 overflow-hidden">
            <div className="w-2 h-1 bg-[#fff1cc] rounded-full rotate-45"></div>
            <div className="w-2 h-1 bg-[#fff1cc] rounded-full -rotate-12"></div>
            <div className="w-2 h-1 bg-[#fff1cc] rounded-full rotate-30"></div>
            <div className="w-2 h-1 bg-[#fff1cc] rounded-full -rotate-45"></div>
            <div className="absolute top-1 inset-x-4 h-1 bg-white/20 rounded-full"></div>
          </div>
        </div>
      );
    }

    // 6. Queso Cheddar
    if (lower.includes('cheddar') || lower.includes('queso')) {
      return (
        <div key={`queso-${index}`} style={{ zIndex }} className="relative w-[224px] h-[24px] flex items-center justify-center drop-shadow-md transition-all select-none my-[-5px]">
          <div className="w-[95%] h-[16px] bg-gradient-to-b from-[#ffc837] to-[#f69d12] rounded-[12px] border border-[#e08906] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] relative">
            <div className="absolute -bottom-2 left-6 w-5 h-4 bg-gradient-to-b from-[#f69d12] to-[#d87c04] rounded-b-[10px] shadow-sm"></div>
            <div className="absolute -bottom-3 right-10 w-6 h-5 bg-gradient-to-b from-[#f69d12] to-[#d87c04] rounded-b-[12px] shadow-sm"></div>
            <div className="absolute -bottom-1.5 left-24 w-4 h-3 bg-gradient-to-b from-[#f69d12] to-[#d87c04] rounded-b-[8px]"></div>
            <div className="absolute top-1 left-4 w-32 h-1 bg-white/40 rounded-full"></div>
          </div>
        </div>
      );
    }

    // 7. Tocineta
    if (lower.includes('tocineta') || lower.includes('bacon')) {
      return (
        <div key={`tocineta-${index}`} style={{ zIndex }} className="relative w-[224px] h-[22px] flex items-center justify-center gap-2 drop-shadow-md transition-all select-none my-[-4px]">
          <div className="w-[105px] h-[16px] bg-gradient-to-r from-[#8b1e16] via-[#c24538] to-[#8b1e16] rounded-md border border-[#6b140d] shadow-inner relative overflow-hidden transform -rotate-3">
            <div className="absolute inset-y-0 left-3 w-3 bg-[#e8aba6]/90 skew-x-12"></div>
            <div className="absolute inset-y-0 right-4 w-3 bg-[#e8aba6]/90 skew-x-12"></div>
            <div className="absolute top-0 inset-x-0 h-1 bg-white/20"></div>
          </div>
          <div className="w-[105px] h-[16px] bg-gradient-to-r from-[#8b1e16] via-[#c24538] to-[#8b1e16] rounded-md border border-[#6b140d] shadow-inner relative overflow-hidden transform rotate-2">
            <div className="absolute inset-y-0 left-4 w-3 bg-[#e8aba6]/90 -skew-x-12"></div>
            <div className="absolute inset-y-0 right-3 w-3 bg-[#e8aba6]/90 -skew-x-12"></div>
            <div className="absolute top-0 inset-x-0 h-1 bg-white/20"></div>
          </div>
        </div>
      );
    }

    // 8. Lechuga
    if (lower.includes('lechuga')) {
      return (
        <div key={`lechuga-${index}`} style={{ zIndex }} className="relative w-[234px] h-[26px] flex items-center justify-center drop-shadow-md transition-all select-none my-[-4px]">
          <div className="w-full h-[18px] bg-gradient-to-r from-[#5ea832] via-[#78cb43] to-[#5ea832] rounded-[16px] border border-[#43801f] shadow-inner relative flex items-center justify-around px-2">
            <div className="w-8 h-4 -top-1.5 -left-1 absolute bg-[#75c93e] rounded-full border border-[#3e781d] shadow-sm"></div>
            <div className="w-10 h-4 -top-2 left-10 absolute bg-[#83d94a] rounded-full border border-[#3e781d] shadow-sm"></div>
            <div className="w-12 h-4 -top-1 left-24 absolute bg-[#75c93e] rounded-full border border-[#3e781d] shadow-sm"></div>
            <div className="w-10 h-4 -top-2 right-10 absolute bg-[#83d94a] rounded-full border border-[#3e781d] shadow-sm"></div>
            <div className="w-8 h-4 -top-1.5 -right-1 absolute bg-[#75c93e] rounded-full border border-[#3e781d] shadow-sm"></div>
          </div>
        </div>
      );
    }

    // 9. Tomate
    if (lower.includes('tomate')) {
      return (
        <div key={`tomate-${index}`} style={{ zIndex }} className="relative w-[220px] h-[26px] flex items-center justify-center gap-3 drop-shadow-md transition-all select-none my-[-4px]">
          <div className="w-[100px] h-[22px] bg-gradient-to-b from-[#e32424] to-[#b31414] rounded-full border-2 border-[#940d0d] shadow-inner relative flex items-center justify-center overflow-hidden">
            <div className="w-[70%] h-[60%] flex justify-between items-center px-1">
              <div className="w-4 h-2.5 bg-[#820b0b] rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-[#ffd700] rounded-full"></div>
              </div>
              <div className="w-4 h-2.5 bg-[#820b0b] rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-[#ffd700] rounded-full"></div>
              </div>
            </div>
            <div className="absolute top-0.5 left-2 w-10 h-1 bg-white/40 rounded-full blur-[0.5px]"></div>
          </div>
          <div className="w-[100px] h-[22px] bg-gradient-to-b from-[#e32424] to-[#b31414] rounded-full border-2 border-[#940d0d] shadow-inner relative flex items-center justify-center overflow-hidden">
            <div className="w-[70%] h-[60%] flex justify-between items-center px-1">
              <div className="w-4 h-2.5 bg-[#820b0b] rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-[#ffd700] rounded-full"></div>
              </div>
              <div className="w-4 h-2.5 bg-[#820b0b] rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-[#ffd700] rounded-full"></div>
              </div>
            </div>
            <div className="absolute top-0.5 left-2 w-10 h-1 bg-white/40 rounded-full blur-[0.5px]"></div>
          </div>
        </div>
      );
    }

    // 10. Cebolla
    if (lower.includes('cebolla')) {
      return (
        <div key={`cebolla-${index}`} style={{ zIndex }} className="relative w-[214px] h-[22px] flex items-center justify-center drop-shadow-md transition-all select-none my-[-4px]">
          <div className="w-[90px] h-[18px] border-[3px] border-[#ede0ee] border-b-[#c49bc6] rounded-[50%] bg-[#f7f0f7]/40 shadow-sm transform -rotate-6"></div>
          <div className="w-[85px] h-[18px] -ml-6 border-[3px] border-[#ede0ee] border-b-[#c49bc6] rounded-[50%] bg-[#f7f0f7]/40 shadow-sm transform rotate-6"></div>
        </div>
      );
    }

    // 11. Salchicha / Chorizo
    if (lower.includes('salchicha') || lower.includes('chorizo')) {
      return (
        <div key={`salchicha-${index}`} style={{ zIndex }} className="relative w-[226px] h-[28px] flex items-center justify-center gap-2 drop-shadow-md transition-all select-none my-[-4px]">
          <div className="w-[105px] h-[24px] bg-gradient-to-b from-[#b82a1d] via-[#941c11] to-[#6b0f07] rounded-full border border-[#520a04] relative flex items-center justify-around px-2">
            <div className="w-1 h-3 bg-[#420601] rotate-45 rounded-full"></div>
            <div className="w-1 h-3 bg-[#420601] rotate-45 rounded-full"></div>
            <div className="w-1 h-3 bg-[#420601] rotate-45 rounded-full"></div>
            <div className="absolute top-1 left-2 w-16 h-1 bg-white/25 rounded-full blur-[0.5px]"></div>
          </div>
          <div className="w-[105px] h-[24px] bg-gradient-to-b from-[#b82a1d] via-[#941c11] to-[#6b0f07] rounded-full border border-[#520a04] relative flex items-center justify-around px-2">
            <div className="w-1 h-3 bg-[#420601] rotate-45 rounded-full"></div>
            <div className="w-1 h-3 bg-[#420601] rotate-45 rounded-full"></div>
            <div className="w-1 h-3 bg-[#420601] rotate-45 rounded-full"></div>
            <div className="absolute top-1 left-2 w-16 h-1 bg-white/25 rounded-full blur-[0.5px]"></div>
          </div>
        </div>
      );
    }

    // 12. Papas fosforito / Ripio
    if (lower.includes('papa') || lower.includes('ripio') || lower.includes('fosforito')) {
      return (
        <div key={`papas-${index}`} style={{ zIndex }} className="relative w-[220px] h-[22px] flex items-center justify-center drop-shadow-md transition-all select-none my-[-4px]">
          <div className="w-[92%] h-[16px] bg-gradient-to-b from-[#f2cb55] to-[#c79b1e] rounded-full border border-[#ad820c] relative flex flex-wrap items-center justify-around px-2 overflow-hidden shadow-inner">
            <div className="w-5 h-1 bg-[#fff2a8] rotate-12 rounded-sm shadow-xs"></div>
            <div className="w-6 h-1 bg-[#fff2a8] -rotate-12 rounded-sm shadow-xs"></div>
            <div className="w-5 h-1 bg-[#fff2a8] rotate-45 rounded-sm shadow-xs"></div>
            <div className="w-6 h-1 bg-[#fff2a8] -rotate-25 rounded-sm shadow-xs"></div>
            <div className="w-5 h-1 bg-[#fff2a8] rotate-12 rounded-sm shadow-xs"></div>
          </div>
        </div>
      );
    }

    // 13. Huevo
    if (lower.includes('huevo')) {
      return (
        <div key={`huevo-${index}`} style={{ zIndex }} className="relative w-[218px] h-[26px] flex items-center justify-center drop-shadow-md transition-all select-none my-[-4px]">
          <div className="w-full h-[20px] bg-gradient-to-b from-[#ffffff] to-[#ede8e1] rounded-full border border-[#d6cbbe] shadow-inner relative flex items-center justify-center">
            <div className="w-10 h-7 bg-gradient-to-b from-[#ffa500] to-[#ff7700] rounded-full border border-[#e66c00] shadow-[0_2px_4px_rgba(0,0,0,0.2)] relative">
              <div className="absolute top-1 left-2 w-3 h-2 bg-white/60 rounded-full blur-[0.5px]"></div>
            </div>
            <div className="absolute right-3 w-4 h-1 bg-[#a3703c] rounded-full"></div>
          </div>
        </div>
      );
    }

    // Default Fallback
    return (
      <div key={`ing-${index}`} style={{ zIndex }} className="relative w-[200px] h-[20px] flex items-center justify-center drop-shadow-md transition-all select-none my-[-3px]">
        <div className="w-full h-[14px] bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 rounded-full border border-amber-800 shadow-inner flex items-center justify-center">
          <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">{name}</span>
        </div>
      </div>
    );
  };

  // HU-06: Creador Interactivo de Hamburguesas
  
  const renderBurgerLayerWithStock = (name: string, index: number, variant: 'top' | 'bottom' | 'standard' = 'standard', isOutOfStock: boolean = false) => {
    const layer = getIngredientVisual(name, index, variant);
    if (!layer || !React.isValidElement(layer)) return layer;
    
    if (isOutOfStock) {
      const layerElem = layer as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
      return React.cloneElement(layerElem, {
         className: (layerElem.props.className || '') + ' cursor-not-allowed',
         children: (
           <>
             {layerElem.props.children}
             <div className="absolute inset-[-4px] z-50 backdrop-grayscale-[0.8] bg-white/40 flex items-center justify-center pointer-events-none rounded-[inherit]">
                <span className="bg-red-600 text-white text-[10px] sm:text-[11px] font-black px-2 sm:px-3 py-0.5 rounded shadow-xl tracking-widest border border-red-500 transform -rotate-12 opacity-100">AGOTADO</span>
             </div>
           </>
         )
      });
    }
    return layer;
  };
    const burgerBun = builderStack.find(ing => (ing.name || '').toLowerCase().includes('hamburguesa'));
    const dogBun = builderStack.find(ing => (ing.name || '').toLowerCase().includes('perro'));
    const pataconBun = builderStack.find(ing => (ing.name || '').toLowerCase().includes('patac'));

    // Fillings in bottom-to-top order (reverse of stack for natural burger layering)
    const fillings = builderStack.filter(ing => 
      !ing.name.toLowerCase().includes('hamburguesa') && 
      !ing.name.toLowerCase().includes('perro') && 
      !ing.name.toLowerCase().includes('patac')
    );

    // Cada ingrediente en syncedIngredients ya tiene aplicado su PVP transparente con el margen de ganancia configurado
    const finalCustomPrice = builderStack.reduce((acc, curr) => acc + (curr.price || 0), 0);
    const totalLayers = builderStack.length;

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-white">Arma tu Burger</h2>
            <p className="text-[15px] text-gray-600 dark:text-stone-400 mt-1">Personaliza capa por capa.</p>
          </div>
          {builderStack.length > 0 && (
            <button 
              onClick={() => setBuilderStack([])}
              className="text-gray-700 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 transition-colors font-medium text-[14px] bg-white dark:bg-[#151515] px-5 py-2 rounded-xl border border-gray-200 dark:border-stone-700 shadow-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-gray-400" />
              Reiniciar
            </button>
          )}
        </div>
        
        {syncedIngredients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-stone-800 shadow-sm p-6">
            <ChefHat className="w-16 h-16 text-gray-300 dark:text-stone-700 mb-4" />
            <h3 className="text-lg font-medium text-gray-500 dark:text-stone-400">No hay ingredientes disponibles</h3>
            <p className="text-sm text-gray-400 mt-2">Nuestros cocineros están reabasteciendo la cocina.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
            {/* Visual Burger Canvas / Stage */}
            <div className="lg:col-span-8 bg-white dark:bg-[#151515] rounded-[28px] border border-gray-100 dark:border-stone-800 flex flex-col items-center justify-between p-6 relative overflow-hidden shadow-sm">
              {/* Header Info */}
              <div className="w-full flex justify-between items-center z-20">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {totalLayers} {totalLayers === 1 ? 'Ingrediente' : 'Ingredientes'} en tu creación
                </span>
                {finalCustomPrice > 0 && (
                  <span className="px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-black">
                    Precio: {formatCOP(finalCustomPrice)}
                  </span>
                )}
              </div>

              {/* Burger Stack Stage */}
              <div className="flex-1 w-full flex flex-col items-center justify-center py-6 min-h-[340px] relative">
                {builderStack.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center max-w-sm">
                    <div className="w-16 h-16 mb-3 border-2 border-dashed border-brand-orange/40 rounded-full flex items-center justify-center bg-brand-orange/5 text-brand-orange">
                      <Plus className="w-7 h-7" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-base">Comienza a armar</h4>
                    <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">Selecciona tus ingredientes en la lista lateral para ver cómo toma forma.</p>
                  </div>
                ) : (
                  <div 
                    className="flex flex-col items-center justify-center transition-transform duration-300 ease-out py-4"
                    style={{
                      transform: `scale(${Math.max(0.68, 1 - (builderStack.length > 5 ? (builderStack.length - 5) * 0.04 : 0))})`,
                      transformOrigin: 'center bottom'
                    }}
                  >
                    {/* TOP BUN / PATACÓN */}
                    {burgerBun && renderBurgerLayerWithStock('Pan de Hamburguesa', 99, 'top', (burgerBun?.stock ?? 1) <= 0)}
                    {dogBun && renderBurgerLayerWithStock('Pan de Perro', 99, 'top', (dogBun?.stock ?? 1) <= 0)}
                    {pataconBun && renderBurgerLayerWithStock('Patacón', 99, 'top', (pataconBun?.stock ?? 1) <= 0)}

                    {/* FILLINGS (reversed: most recently added at the top) */}
                    {[...fillings].reverse().map((ing, idx) => (
                      <React.Fragment key={`${ing.id || ing.name}-${idx}`}>
                        {renderBurgerLayerWithStock(ing.name, idx, 'standard', (ing.stock ?? 1) <= 0)}
                      </React.Fragment>
                    ))}

                    {/* BOTTOM BUN / PATACÓN */}
                    {burgerBun && renderBurgerLayerWithStock('Pan de Hamburguesa', 0, 'bottom', (burgerBun?.stock ?? 1) <= 0)}
                    {dogBun && renderBurgerLayerWithStock('Pan de Perro', 0, 'bottom', (dogBun?.stock ?? 1) <= 0)}
                    {pataconBun && renderBurgerLayerWithStock('Patacón', 0, 'bottom', (pataconBun?.stock ?? 1) <= 0)}

                    {/* GOURMET WOODEN SERVING BOARD */}
                    <div className="w-[270px] h-[14px] bg-gradient-to-r from-[#6b4226] via-[#8B5A2B] to-[#5c381e] rounded-full shadow-lg border-t border-[#a0683a] relative mt-2 flex items-center justify-center">
                      <div className="w-[85%] h-[2px] bg-white/20 rounded-full blur-[1px]"></div>
                    </div>
                    {/* Shadow under plate */}
                    <div className="w-[230px] h-[10px] bg-black/20 dark:bg-black/40 rounded-full blur-md -mt-1"></div>
                  </div>
                )}
              </div>

              {/* Active Layers Tray */}
              {builderStack.length > 0 && (
                <div className="w-full pt-3 border-t border-gray-100 dark:border-stone-800 flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                  <span className="text-[11px] font-bold text-gray-400 uppercase shrink-0">Capas:</span>
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    {builderStack.map((ing, sIdx) => (
                      <span 
                        key={sIdx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-stone-800 text-gray-800 dark:text-stone-200 text-xs font-semibold shrink-0"
                      >
                        {ing.name} ({formatCOP(ing.price)})
                        <button
                          type="button"
                          onClick={() => setBuilderStack(builderStack.filter((_, i) => i !== sIdx))}
                          className="hover:text-red-500 ml-0.5"
                          title="Eliminar capa"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ingredients Selection Sidebar */}
            <div className="lg:col-span-4 flex flex-col h-full min-h-0">
              <div className="bg-white dark:bg-[#151515] rounded-[28px] border border-gray-100 dark:border-stone-800 shadow-sm p-6 flex flex-col h-full overflow-hidden min-h-0">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-stone-800 shrink-0">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Ingredientes</h3>
                  <span className="text-xs font-semibold text-gray-400">Toca para agregar</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-w-0 min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-stone-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {syncedIngredients.map(ing => (
                    <button 
                      key={ing.id} 
                      onClick={() => setBuilderStack([...builderStack, ing])}
                      disabled={ing.stock !== undefined && ing.stock <= 0}
                      className="w-full text-left bg-gray-50/60 dark:bg-stone-900/50 hover:bg-gray-100 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-200/60 dark:border-stone-800 p-3 rounded-2xl flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-brand-orange/10 dark:bg-brand-orange/20 text-brand-orange flex items-center justify-center shrink-0 group-hover:bg-brand-orange group-hover:text-white transition-colors">
                          <Plus className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight truncate">{ing.name}</p>
                          <p className="text-xs text-brand-orange font-bold mt-0.5 whitespace-nowrap">+{formatCOP(ing.price)}</p>
                        </div>
                      </div>
                      {ing.stock !== undefined && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
                          ing.stock <= 0 
                            ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400' 
                            : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {ing.stock <= 0 ? 'AGOTADO' : `${ing.stock} DISP.`}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-stone-800 shrink-0">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-500 font-medium text-sm">Total:</span>
                    <span className="text-xl font-black text-brand-orange">{formatCOP(finalCustomPrice)}</span>
                  </div>
                  <button 
                    disabled={builderStack.length === 0 || builderStack.some(ing => (ing.stock ?? 1) <= 0)}
                    onClick={() => {
                      const total = finalCustomPrice;
                      
                      if (editingCartItemId) {
                        setCart(cart.map(c => c.id === editingCartItemId ? {
                          ...c,
                          price: total,
                          finalPrice: total,
                          extras: builderStack,
                          stack: builderStack
                        } : c));
                        setEditingCartItemId(null);
                        showToast('info', 'Hamburguesa actualizada');
                      } else {
                        setCart([...cart, {
                          id: Date.now().toString(),
                          isCustom: true,
                          name: 'Hamburguesa Personalizada',
                          price: total,
                          finalPrice: total,
                          quantity: 1,
                          image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=800',
                          removed: [],
                          extras: builderStack,
                          stack: builderStack
                        }]);
                        showToast('info', 'Hamburguesa personalizada agregada al carrito');
                      }
                      
                      setBuilderStack([]);
                      setActiveTab('cart');
                    }}
                    className="w-full bg-brand-orange hover:bg-[#e66500] text-white py-3.5 rounded-2xl font-bold text-sm tracking-wide uppercase disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-orange/20 transition-all"
                  >
                    {editingCartItemId ? 'Actualizar Pedido' : 'Agregar al Carrito'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
}
