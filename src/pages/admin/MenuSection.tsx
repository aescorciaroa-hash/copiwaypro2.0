import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Award, Box, Check, ChefHat, Edit2, Flame, ImageIcon, Layers, Package, Plus, Search, Sparkles, Star, Trash2, TrendingUp, Upload, Utensils, X
} from 'lucide-react';

import { formatCOP } from '../../lib/format';
import { DEFAULT_MENU_CATEGORIES, Product, ProductComponent, InventoryItem, StoreConfig } from '../../store/almacenAplicacion';
import { ToastData } from '../../components/ToastNotification';
import { ConfirmModalState } from '../AdminDashboard';
import { ApiError, subirArchivo } from '../../servicios/api';

export interface NewProductState {
  name: string;
  description: string;
  price: string;
  image: string;
  category: string;
  badge: string;
  active: boolean;
  ingredients: ProductComponent[];
  packaging: ProductComponent[];
}

interface MenuSectionProps {
  products: Product[];
  filteredProducts: Product[];
  inventory: InventoryItem[];
  storeConfig: StoreConfig;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (category: string) => Promise<void>;
  removeCategory: (category: string) => Promise<void>;
  newProduct: NewProductState;
  setNewProduct: React.Dispatch<React.SetStateAction<NewProductState>>;
  tempIngredientName: string;
  setTempIngredientName: React.Dispatch<React.SetStateAction<string>>;
  tempPackagingName: string;
  setTempPackagingName: React.Dispatch<React.SetStateAction<string>>;
  editingProductId: string | null;
  setEditingProductId: React.Dispatch<React.SetStateAction<string | null>>;
  isProductModalOpen: boolean;
  setIsProductModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCategoryManagerOpen: boolean;
  setIsCategoryManagerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCatalogCategory: string;
  setSelectedCatalogCategory: React.Dispatch<React.SetStateAction<string>>;
  newCategoryInput: string;
  setNewCategoryInput: React.Dispatch<React.SetStateAction<string>>;
  isInlineAddingCategory: boolean;
  setIsInlineAddingCategory: React.Dispatch<React.SetStateAction<boolean>>;
  inlineCategoryName: string;
  setInlineCategoryName: React.Dispatch<React.SetStateAction<string>>;
  catalogSearch: string;
  setCatalogSearch: React.Dispatch<React.SetStateAction<string>>;
  showToast: (type: ToastData['type'], message: string, title?: string) => void;
  setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalState>>;
}

export default function MenuSection({
  products,
  filteredProducts,
  inventory,
  storeConfig,
  addProduct,
  updateProduct,
  deleteProduct,
  addCategory,
  removeCategory,
  newProduct,
  setNewProduct,
  tempIngredientName,
  setTempIngredientName,
  tempPackagingName,
  setTempPackagingName,
  editingProductId,
  setEditingProductId,
  isProductModalOpen,
  setIsProductModalOpen,
  isCategoryManagerOpen,
  setIsCategoryManagerOpen,
  selectedCatalogCategory,
  setSelectedCatalogCategory,
  newCategoryInput,
  setNewCategoryInput,
  isInlineAddingCategory,
  setIsInlineAddingCategory,
  inlineCategoryName,
  setInlineCategoryName,
  catalogSearch,
  setCatalogSearch,
  showToast,
  setConfirmModal,
}: MenuSectionProps) {
    // Sube la foto al servidor (public/uploads/productos/) y guarda solo su
    // URL en newProduct.image -- antes se guardaba la imagen completa en
    // base64 directo en el estado/BD, lo que reventaba la columna 'imagen'
    // (VARCHAR(255)) con cualquier foto real.
    const [isUploadingImage, setIsUploadingImage] = React.useState(false);
    const handleImageFileSelected = async (file: File) => {
      setIsUploadingImage(true);
      try {
        const { url } = await subirArchivo('/uploads/product-image', 'image', file);
        setNewProduct({...newProduct, image: url});
      } catch (err) {
        const mensaje = err instanceof ApiError ? err.message : 'No se pudo subir la imagen.';
        showToast('danger', mensaje, 'No se Subió la Imagen');
      } finally {
        setIsUploadingImage(false);
      }
    };

    const handleAddProduct = async () => {
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

      try {
        if (editingProductId) {
          await updateProduct(editingProductId, {
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
          await addProduct({
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
      } catch (err) {
        const mensaje = err instanceof ApiError
          ? (err.errors ? Object.values(err.errors)[0][0] : err.message)
          : 'No se pudo guardar el producto.';
        showToast('danger', mensaje, editingProductId ? 'No se Actualizó el Producto' : 'No se Creó el Producto');
      }
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

          const availableCategories = (storeConfig.categories && storeConfig.categories.length > 0)
            ? storeConfig.categories
            : DEFAULT_MENU_CATEGORIES;

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

                      {newProduct.image ? (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-stone-700 group">
                          <img src={newProduct.image} alt="Producto" className="w-full h-36 object-cover" />
                          <button
                            type="button"
                            onClick={() => setNewProduct({...newProduct, image: ''})}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                            title="Quitar imagen"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <label className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                            {isUploadingImage ? 'Subiendo...' : <><Upload className="w-4 h-4 mr-1.5" /> Cambiar Foto</>}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUploadingImage}
                              onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  handleImageFileSelected(e.target.files[0]);
                                }
                                e.target.value = '';
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      ) : (
                        <label className={`flex flex-col items-center justify-center gap-2 h-36 rounded-xl border-2 border-dashed transition-colors ${isUploadingImage ? 'border-brand-orange text-brand-orange cursor-wait' : 'border-gray-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-500 dark:text-stone-400 hover:border-brand-orange hover:text-brand-orange cursor-pointer'}`}>
                          <Upload className={`w-6 h-6 ${isUploadingImage ? 'animate-pulse' : ''}`} />
                          <span className="text-sm font-bold">{isUploadingImage ? 'Subiendo imagen...' : 'Subir Imagen'}</span>
                          {!isUploadingImage && <span className="text-[11px]">PNG o JPG</span>}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingImage}
                            onChange={e => {
                              if (e.target.files && e.target.files[0]) {
                                handleImageFileSelected(e.target.files[0]);
                              }
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
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
                        <div className="relative h-44 w-full bg-gray-100 dark:bg-stone-800 overflow-hidden flex items-center justify-center">
                          {newProduct.image ? (
                            <img
                              src={newProduct.image}
                              alt={newProduct.name || 'Preview'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-gray-400 dark:text-stone-600">
                              <ImageIcon className="w-8 h-8" />
                              <span className="text-[11px] font-bold">Sin imagen</span>
                            </div>
                          )}
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
                                  onConfirm: async () => {
                                    try {
                                      await removeCategory(cat);
                                      if (selectedCatalogCategory === cat) {
                                        setSelectedCatalogCategory('Todas');
                                      }
                                      showToast('info', `Categoría "${cat}" eliminada`, 'Categorías');
                                    } catch (err) {
                                      const mensaje = err instanceof ApiError ? err.message : 'No se pudo eliminar la categoría.';
                                      showToast('danger', mensaje, 'No se Eliminó la Categoría');
                                    } finally {
                                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                    }
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
}
