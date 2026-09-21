import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Plus, Minus, ArrowRight, Flame, MapPin, Clock, Utensils, Star, Phone, Mail, ShieldCheck, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { useStore, DEFAULT_MENU_CATEGORIES } from '../store/almacenAplicacion';
import { formatCOP } from '../lib/format';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';


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

export default function Landing() {
  const { products, storeConfig } = useStore();
  const { theme } = useTheme();
  const [activeCategory, setActiveCategory] = useState('Todas');
  
  const visibleProducts = products.filter(p => p.active);
  
  // Custom categories created by admin or stored in storeConfig
  const configuredCategories = (storeConfig.categories && storeConfig.categories.length > 0)
    ? storeConfig.categories
    : DEFAULT_MENU_CATEGORIES;

  // Build unified list of all available categories
  const allCategories: string[] = [];
  configuredCategories.forEach(c => {
    if (c && !allCategories.includes(c)) allCategories.push(c);
  });
  visibleProducts.forEach(p => {
    if (p.category && !allCategories.includes(p.category)) {
      allCategories.push(p.category);
    }
  });

  // Only display categories in the tabs that either have active products or were explicitly configured
  const categoriesWithProducts = allCategories.filter(cat => 
    visibleProducts.some(p => {
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
    })
  );

  const categories = ['Todas', ...(categoriesWithProducts.length > 0 ? categoriesWithProducts : allCategories)];

  const filteredProducts = activeCategory === 'Todas' 
    ? visibleProducts 
    : visibleProducts.filter(p => {
        const pCat = p.category || (
          p.name.toLowerCase().includes('hamburguesa') ? 'Hamburguesas de Pan' :
          p.name.toLowerCase().includes('perro') || p.name.toLowerCase().includes('salchicha') ? 'Perros Calientes' :
          p.name.toLowerCase().includes('salchipapa') ? 'Salchipapas' :
          p.name.toLowerCase().includes('patacón') ? 'Hamburguesas de Patacón' :
          'Otros'
        );
        if (pCat.toLowerCase() === activeCategory.toLowerCase()) return true;
        if ((activeCategory === 'Hamburguesas de Pan' || activeCategory === 'Hamburguesas') && pCat.toLowerCase().includes('hamburguesa')) return true;
        return false;
      });

  const { orders } = useStore();
  const dynamicReviews = orders.filter(o => o.rating && o.reviewText).map((o, idx) => ({
    id: idx + 10,
    name: o.client || 'Cliente',
    role: 'Cliente verificado',
    rating: o.rating,
    comment: o.reviewText
  })).slice(0, 3);
  
  const reviews = dynamicReviews.length > 0 ? dynamicReviews : [
    { id: 1, name: 'Carlos M.', role: 'Cliente Frecuente', rating: 5, comment: 'Las mejores hamburguesas que he probado. Llegan súper rápido y el sabor es increíble.' },
    { id: 2, name: 'Laura Gómez', role: 'Cliente Nuevo', rating: 5, comment: 'Me encantó la posibilidad de armar mi pedido sin cebolla y llegó exactamente como lo pedí. ¡Recomendadísimos!' },
    { id: 3, name: 'Andrés P.', role: 'Cliente Frecuente', rating: 4, comment: 'Excelente servicio. El domiciliario muy amable y la comida llegó caliente.' }
  ];

  const getProductImage = (url?: string) => {
    let img = url || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800';
    if (img.includes('1594212202875-86ac56c66b88')) img = 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&q=80&w=800';
    if (img.includes('1628190772718-d748dc7ce31c')) img = 'https://images.unsplash.com/photo-1615719413546-198b25453f85?auto=format&fit=crop&q=80&w=800';
    if (img.includes('1599599811462-8cb2f8f74da0')) img = 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?auto=format&fit=crop&q=80&w=800';
    return img;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-stone-950 font-sans selection:bg-brand-orange/20 selection:text-brand-orange transition-colors duration-100">
      <Navbar />

      <main className="flex-1 min-w-0">
        {/* 1) HERO PRINCIPAL */}
        <section className="relative pt-40 pb-32 px-6 overflow-hidden min-h-[90vh] flex flex-col justify-center">
          <div className="absolute inset-0 z-0 overflow-hidden">
             <style>{`
                @keyframes slow-pan {
                  0% { transform: scale(1.0) translate(0, 0); }
                  100% { transform: scale(1.1) translate(-2%, -1%); }
                }
                .animate-pan {
                  animation: slow-pan 30s ease-in-out infinite alternate;
                }
             `}</style>
             <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0)_40%,#f9fafb_100%)] z-10 pointer-events-none opacity-100 dark:opacity-0 transition-opacity duration-300"></div>
             <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0)_40%,#0c0a09_100%)] z-10 pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-300"></div>
             {/* Text spotlight overlay */}
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.3)_40%,transparent_70%)] z-10 pointer-events-none"></div>
             <img 
               src="https://images.unsplash.com/photo-1550547660-d9450f859349?q=100&w=2400&auto=format&fit=crop" 
               alt="Hamburguesa jugosa Copiway" 
               className="w-full h-full object-cover object-[60%_center] animate-pan"
             />
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto text-center relative z-20 mt-4 md:mt-0"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl mb-8"
            >
              <span className="flex h-2 w-2 rounded-full bg-brand-orange animate-pulse shadow-[0_0_10px_rgba(255,112,0,0.8)]"></span>
              <span className="text-xs font-semibold text-white tracking-widest uppercase mb-px drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Directo a tu puerta</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="text-[clamp(2.5rem,8vw,4.5rem)] md:text-7xl font-bold break-words mb-8 leading-[1.1] text-white tracking-normal drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
            >
              Las Mejores Hamburguesas 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-[#ff9844] drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] dark:drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">de la Ciudad</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="text-lg md:text-xl text-gray-200 mb-10 max-w-3xl mx-auto leading-relaxed font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
            >
              Experimenta el auténtico sabor artesanal. Cocinamos al momento y te entregamos rápido, sin filas ni intermediarios.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link 
                to="/login"
                className="bg-brand-orange text-white px-8 py-4 rounded-full font-semibold flex items-center gap-2 hover:bg-[#e66500] hover:shadow-xl hover:shadow-brand-orange/30 hover:-translate-y-0.5 transition-all w-full sm:w-auto justify-center"
              >
                Hacer Pedido <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#menu" className="bg-white/10 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-full font-semibold flex items-center gap-2 hover:bg-white/20 hover:border-white/50 transition-all w-full sm:w-auto justify-center shadow-xl">
                <Utensils className="w-4 h-4 text-white/80" /> Ver Menú
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* 2) BARRA DE VALORES */}
        <section className="bg-white dark:bg-stone-900 py-20 px-6 border-b border-black/5 dark:border-white/5 relative z-30 transition-colors duration-300">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 dark:bg-stone-950/40 border border-black/5 dark:border-white/5 p-6 md:p-8 rounded-[24px] flex flex-col items-center text-center hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-brand-orange/10 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-brand-orange" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Entrega Rápida</h3>
              <p className="text-sm text-gray-500 dark:text-stone-400">Rastreo en tiempo real y tiempos de despacho optimizados.</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-stone-950/40 border border-black/5 dark:border-white/5 p-6 md:p-8 rounded-[24px] flex flex-col items-center text-center hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-brand-orange/10 rounded-full flex items-center justify-center mb-4">
                <Flame className="w-6 h-6 text-brand-orange" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Ingredientes Frescos</h3>
              <p className="text-sm text-gray-500 dark:text-stone-400">Carnes seleccionadas y vegetales frescos todos los días.</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-stone-950/40 border border-black/5 dark:border-white/5 p-6 md:p-8 rounded-[24px] flex flex-col items-center text-center hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-brand-orange/10 rounded-full flex items-center justify-center mb-4">
                <Utensils className="w-6 h-6 text-brand-orange" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Hecho al Momento</h3>
              <p className="text-sm text-gray-500 dark:text-stone-400">Directo de la parrilla a tu mesa, sin pre-cocidos.</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-stone-950/40 border border-black/5 dark:border-white/5 p-6 md:p-8 rounded-[24px] flex flex-col items-center text-center hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-brand-orange/10 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-brand-orange" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Pago 100% Seguro</h3>
              <p className="text-sm text-gray-500 dark:text-stone-400">Transacciones protegidas para que pidas con total confianza.</p>
            </div>
          </div>
        </section>

        {/* 3) NUESTRO MENÚ */}
        <section id="menu" className="py-32 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-brand-orange font-bold text-xs tracking-widest uppercase mb-4 block">OFERTA GASTRONÓMICA</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-normal">Nuestro Menú</h2>
            <p className="text-gray-500 dark:text-stone-400 mt-4 max-w-2xl mx-auto">
              Descubre nuestras opciones creadas con los mejores ingredientes y el auténtico sabor Copiway.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeCategory === cat 
                    ? 'bg-brand-orange text-white shadow-md' 
                    : 'bg-white dark:bg-stone-900 text-gray-600 dark:text-stone-300 border border-gray-200 dark:border-stone-800 hover:border-brand-orange hover:text-brand-orange'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-sm overflow-hidden hover:shadow-lg transition-shadow group flex flex-col">
                <div className="h-48 md:aspect-[16/10] bg-gray-100 dark:bg-stone-800 relative overflow-hidden">
                  <img src={getProductImage(product.image)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800'; }} />
                </div>
                <div className="p-6 flex flex-col flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{product.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-stone-400 mb-6 flex-1 line-clamp-3 min-w-0">
                    {product.description || 'Deliciosa opción preparada al momento con ingredientes frescos.'}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-bold text-[clamp(16px,4vw,20px)] text-brand-orange">{formatCOP(product.price)}</span>
                    <Link 
                      to="/login"
                      className="w-10 h-10 bg-brand-orange text-white rounded-full flex items-center justify-center hover:bg-[#e66500] hover:scale-105 transition-transform"
                      title="Pedir"
                    >
                      <Utensils className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-20 text-gray-500 dark:text-stone-400">
              No hay productos disponibles en esta categoría.
            </div>
          )}
        </section>

        {/* 4) NUESTRA HISTORIA */}
        <section id="nosotros" className="py-24 px-6 bg-gray-100/50 dark:bg-stone-900/30 border-y border-black/5 dark:border-white/5">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 w-full relative min-w-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4 pt-12">
                  <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop" alt="Hamburguesas" className="w-full h-48 md:h-64 object-cover rounded-[24px] shadow-lg" />
                  <img src="https://images.unsplash.com/photo-1520072959219-c595dc870360?q=80&w=600&auto=format&fit=crop" alt="Papas Fritas" className="w-full h-32 md:h-48 object-cover rounded-[24px] shadow-lg" />
                </div>
                <div className="space-y-4">
                  <img src="https://images.unsplash.com/photo-1586816001966-79b736744398?q=80&w=600&auto=format&fit=crop" alt="Chef preparando" className="w-full h-32 md:h-48 object-cover rounded-[24px] shadow-lg" />
                  <img src="https://images.unsplash.com/photo-1606131731446-5568d87113aa?q=80&w=600&auto=format&fit=crop" alt="Entrega Dark Kitchen" className="w-full h-48 md:h-64 object-cover rounded-[24px] shadow-lg" />
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-brand-orange rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,112,0,0.4)] border-4 border-white dark:border-stone-950">
                <Utensils className="w-10 h-10 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <span className="text-brand-orange font-bold text-xs tracking-widest uppercase mb-4 block">NUESTRA HISTORIA</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                Reinventando el sabor desde nuestra Dark Kitchen.
              </h2>
              <p className="text-lg text-gray-600 dark:text-stone-400 mb-10 leading-relaxed">
                Nacimos con una idea simple: entregar la mejor experiencia gastronómica sin las complicaciones de un restaurante tradicional. 
                Hamburguer Copiway opera como un hub culinario enfocado 100% en la calidad, la rapidez y tu satisfacción al recibir en casa.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-brand-orange mb-1 whitespace-nowrap">+10K</div>
                  <div className="text-[10px] sm:text-sm font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider leading-tight">Pedidos<br/>Entregados</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-brand-orange mb-1 whitespace-nowrap">99%</div>
                  <div className="text-[10px] sm:text-sm font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider leading-tight">Clientes<br/>Felices</div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <div className="text-2xl sm:text-3xl font-black text-brand-orange mb-1 whitespace-nowrap">3</div>
                  <div className="text-[10px] sm:text-sm font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider leading-tight">Años de<br/>Experiencia</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5) TESTIMONIOS */}
        <section id="testimonios" className="py-32 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-brand-orange font-bold text-xs tracking-widest uppercase mb-4 block">LO QUE DICEN DE NOSOTROS</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-normal">Clientes Satisfechos</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map(review => (
              <div key={review.id} className="bg-white dark:bg-[#151515] p-6 md:p-8 rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-sm relative">
                <div className="flex items-center gap-1 mb-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < review.rating ? 'text-brand-orange fill-brand-orange' : 'text-gray-300 dark:text-stone-700'}`} />
                  ))}
                </div>
                <p className="text-gray-600 dark:text-stone-300 italic mb-8 leading-relaxed">
                  "{review.comment}"
                </p>
                <div className="flex items-center gap-4 mt-auto">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-orange to-[#e66500] rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {review.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{review.name}</h4>
                    <span className="text-xs text-brand-orange font-medium uppercase tracking-wider">{review.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6) CONTÁCTANOS */}
        <section id="contacto" className="py-32 px-6 bg-white dark:bg-stone-900 border-t border-black/5 dark:border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-brand-orange font-bold text-xs tracking-widest uppercase mb-4 block">ESTAMOS PARA TI</span>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-normal">Contáctanos</h2>
              <p className="text-gray-500 dark:text-stone-400 mt-4 max-w-2xl mx-auto">
                ¿Tienes alguna duda o necesitas ayuda especial? Escríbenos o encuéntranos en nuestros canales de atención.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              <div className="bg-gray-50 dark:bg-[#151515] p-6 rounded-[24px] border border-gray-100 dark:border-stone-800 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-white dark:bg-stone-800 rounded-full flex items-center justify-center shadow-sm mb-4">
                  <MapPin className="w-5 h-5 text-brand-orange" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Dirección</h4>
                <p className="text-sm text-gray-500 dark:text-stone-400">Cocina Oculta - Centro<br/>Neiva, Huila</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-[#151515] p-6 rounded-[24px] border border-gray-100 dark:border-stone-800 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-white dark:bg-stone-800 rounded-full flex items-center justify-center shadow-sm mb-4">
                  <Clock className="w-5 h-5 text-brand-orange" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Horario</h4>
                <p className="text-sm text-gray-500 dark:text-stone-400">De {storeConfig.openTime} a {storeConfig.closeTime}<br/>Lunes a Domingo</p>
              </div>

              <div className="bg-gray-50 dark:bg-[#151515] p-6 rounded-[24px] border border-gray-100 dark:border-stone-800 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-white dark:bg-stone-800 rounded-full flex items-center justify-center shadow-sm mb-4">
                  <Phone className="w-5 h-5 text-brand-orange" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Teléfono</h4>
                <p className="text-sm text-gray-500 dark:text-stone-400">+57 300 123 4567<br/>Atención vía WhatsApp</p>
              </div>

              <div className="bg-gray-50 dark:bg-[#151515] p-6 rounded-[24px] border border-gray-100 dark:border-stone-800 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-white dark:bg-stone-800 rounded-full flex items-center justify-center shadow-sm mb-4">
                  <Mail className="w-5 h-5 text-brand-orange" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Email</h4>
                <p className="text-sm text-gray-500 dark:text-stone-400">hola@hamburguercopiway.com<br/>Soporte 24/7</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-auto lg:h-[500px]">
              {/* Formulario */}
              <div className="bg-gray-50 dark:bg-[#151515] p-8 rounded-[32px] border border-gray-100 dark:border-stone-800 flex flex-col justify-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Envíanos un mensaje</h3>
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Mensaje enviado exitosamente. Nos pondremos en contacto pronto.'); }}>
                  <div>
                    <input type="text" placeholder="Nombre completo" required className="w-full px-5 py-4 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white focus:outline-none focus:border-brand-orange transition-colors" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="email" placeholder="Correo electrónico" required className="w-full px-5 py-4 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white focus:outline-none focus:border-brand-orange transition-colors" />
                    <input type="tel" placeholder="Teléfono" required className="w-full px-5 py-4 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white focus:outline-none focus:border-brand-orange transition-colors" />
                  </div>
                  <div>
                    <textarea rows={4} placeholder="¿En qué te podemos ayudar?" required className="w-full px-5 py-4 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white focus:outline-none focus:border-brand-orange transition-colors resize-none"></textarea>
                  </div>
                  <button type="submit" className="w-full bg-brand-orange hover:bg-[#e66500] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md">
                    Enviar Mensaje <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
              
              {/* Mapa */}
              <div className="rounded-[32px] overflow-hidden border border-gray-100 dark:border-stone-800 h-[400px] lg:h-full relative z-0 [&_.leaflet-container]:bg-transparent [&_.leaflet-control-container]:z-[500]">
                <MapContainer 
                  center={[2.9273, -75.2818]} 
                  zoom={13} 
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                  className="z-0"
                >
                  <CustomZoomControl />
                  <TileLayer
                    url={theme === 'dark' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <Marker 
                    position={[2.9273, -75.2818]}
                    icon={L.divIcon({
                      html: `<div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                               <svg viewBox="0 0 32 32" style="width: 32px; height: 32px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
                                 <path d="M16 0c-5.5 0-10 4.5-10 10 0 7.5 10 22 10 22s10-14.5 10-22c0-5.5-4.5-10-10-10z" fill="#ff7000"/>
                                 <circle cx="16" cy="10" r="6" fill="#fff"/>
                                 <path d="M16 12.5c-.3 0-1.8-1.5-2.5-2.2-.8-.8-.8-2 0-2.8.8-.8 2-.8 2.8 0 .2.2.4.4.5.7.1-.3.3-.5.5-.7.8-.8 2-.8 2.8 0 .8.8.8 2 0 2.8-.7.7-2.2 2.2-2.5 2.2H16z" fill="#ff7000"/>
                               </svg>
                             </div>`,
                      className: 'custom-marker',
                      iconSize: [30, 30],
                      iconAnchor: [15, 30]
                    })}
                  >
                    <Popup>
                      <strong>Hamburguer Copiway</strong><br/>Dark Kitchen Central
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
