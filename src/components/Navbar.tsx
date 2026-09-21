import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Utensils, ArrowRight, Sun, Moon, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav 
        className={`pointer-events-auto relative w-full max-w-5xl bg-zinc-950/90 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/20 transition-all duration-300 ease-in-out ${
          isOpen ? 'rounded-[2rem] py-5 px-6' : 'rounded-full h-[72px] py-0 px-3'
        } flex flex-col justify-center overflow-hidden`}
      >
        {/* Animated Edge Glows */}
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className={`absolute inset-x-10 -bottom-px h-px bg-gradient-to-r from-transparent via-brand-orange/40 to-transparent transition-all duration-300 ${isOpen ? 'opacity-0' : 'opacity-100'}`}></div>

        {/* Header content bar */}
        <div className={`w-full flex items-center justify-between ${isOpen ? 'pb-4 border-b border-white/5' : 'h-full'}`}>
          <Link 
            to="/" 
            onClick={(e) => {
              handleLinkClick();
              if (window.location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-2.5 pl-3 text-white font-bold text-lg md:text-xl hover:scale-105 transition-transform origin-left"
          >
            <div className="bg-gradient-to-br from-brand-orange to-[#e66500] w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,112,0,0.4)] relative">
              <Utensils className="w-4.5 h-4.5 md:w-5 md:h-5 text-white relative z-10" />
              <div className="absolute inset-0 bg-brand-orange blur-md opacity-50 rounded-full"></div>
            </div>
            <span className="tracking-normal text-white">CopiwayPRO</span>
          </Link>
          
          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8 text-gray-400 font-medium text-sm">
            <a href="#menu" className="hover:text-white transition-colors flex flex-col group/nav relative">
              <span>Menú</span>
              <span className="h-[2px] w-0 bg-brand-orange rounded-full absolute -bottom-1 left-0 group-hover/nav:w-full transition-all duration-300"></span>
            </a>
            <a href="#nosotros" className="hover:text-white transition-colors flex flex-col group/nav relative">
              <span>Nosotros</span>
              <span className="h-[2px] w-0 bg-brand-orange rounded-full absolute -bottom-1 left-0 group-hover/nav:w-full transition-all duration-300"></span>
            </a>
            <a href="#testimonios" className="hover:text-white transition-colors flex flex-col group/nav relative">
              <span>Testimonios</span>
              <span className="h-[2px] w-0 bg-brand-orange rounded-full absolute -bottom-1 left-0 group-hover/nav:w-full transition-all duration-300"></span>
            </a>
            <a href="#contacto" className="hover:text-white transition-colors flex flex-col group/nav relative">
              <span>Contacto</span>
              <span className="h-[2px] w-0 bg-brand-orange rounded-full absolute -bottom-1 left-0 group-hover/nav:w-full transition-all duration-300"></span>
            </a>
          </div>

          {/* Action buttons on the right */}
          <div className="flex items-center gap-2 pr-2">
            {/* Theme Toggler */}
            <button
              onClick={toggleTheme}
              className="p-2 md:p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center pointer-events-auto shadow-inner"
              title={theme === 'light' ? 'Activar Modo Oscuro' : 'Activar Modo Claro'}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-zinc-300" />
              ) : (
                <Sun className="w-4 h-4 text-brand-orange animate-pulse" />
              )}
            </button>

            {/* Desktop only CTA */}
            <Link 
              to="/login"
              className="hidden md:flex relative overflow-hidden bg-brand-orange text-white px-6 py-2.5 rounded-full font-bold text-sm items-center gap-2 hover:shadow-[0_0_25px_rgba(255,112,0,0.6)] hover:-translate-y-0.5 transition-all duration-300 active:scale-95 group/btn"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span className="relative z-10 tracking-wide">Ingresar</span> 
              <ArrowRight className="w-4 h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform duration-300" />
            </Link>

            {/* Mobile menu Toggle Hamburger (hidden on md+) */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center pointer-events-auto"
              aria-label="Toggle Navigation Menu"
            >
              {isOpen ? (
                <X className="w-4 h-4 text-white" />
              ) : (
                <Menu className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Area */}
        {isOpen && (
          <div className="md:hidden flex flex-col gap-4 pt-4 text-gray-400 font-medium text-sm">
            {/* Single horizontal row container (una sola casilla) */}
            <div className="grid grid-cols-4 bg-white/5 border border-white/10 rounded-[20px] p-1.5 gap-1 text-center">
              <a 
                href="#menu" 
                onClick={handleLinkClick}
                className="text-gray-300 hover:text-brand-orange py-2.5 rounded-[20px] hover:bg-white/10 transition-all duration-200 text-[10px] font-semibold flex items-center justify-center"
              >
                Menú
              </a>
              <a 
                href="#nosotros" 
                onClick={handleLinkClick}
                className="text-gray-300 hover:text-brand-orange py-2.5 rounded-[20px] hover:bg-white/10 transition-all duration-200 text-[10px] font-semibold flex items-center justify-center"
              >
                Nosotros
              </a>
              <a 
                href="#testimonios" 
                onClick={handleLinkClick}
                className="text-gray-300 hover:text-brand-orange py-2.5 rounded-[20px] hover:bg-white/10 transition-all duration-200 text-[10px] font-semibold flex items-center justify-center"
              >
                Reseñas
              </a>
              <a 
                href="#contacto" 
                onClick={handleLinkClick}
                className="text-gray-300 hover:text-brand-orange py-2.5 rounded-[20px] hover:bg-white/10 transition-all duration-200 text-[10px] font-semibold flex items-center justify-center"
              >
                Contacto
              </a>
            </div>
            
            <Link 
              to="/login"
              onClick={handleLinkClick}
              className="relative overflow-hidden bg-brand-orange text-white w-full py-3 rounded-[20px] font-bold text-sm flex items-center justify-center gap-1.5 shadow-[0_4px_15px_rgba(255,112,0,0.3)] hover:shadow-[0_4px_25px_rgba(255,112,0,0.6)] transition-all duration-300 active:scale-95 group/btn mt-1"
            >
              <span className="relative z-10 tracking-wide">Ingresar</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
}
