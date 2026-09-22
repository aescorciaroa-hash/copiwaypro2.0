import { Utensils, Mail, Phone, MapPin, ArrowRight, Instagram, Facebook, Twitter } from 'lucide-react';
import { rutaBase } from '../servicios/api';

export default function Footer() {
  return (
    <footer className="mt-0">
      {/* Edge-to-edge CTA Box */}
      <div className="px-4 md:px-8 mb-[-120px] relative z-10 max-w-7xl mx-auto -mt-20">
        <div className="bg-brand-orange rounded-[2.5rem] p-8 sm:p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10 shadow-[0_20px_40px_rgba(255,112,0,0.3)] relative overflow-hidden">
           {/* Decorative elements */}
           <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3"></div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white max-w-xl leading-[1.15] tracking-normal relative z-10 text-center md:text-left">
            ¿Listo para probar <span className="text-black/80">el auténtico sabor?</span>
          </h2>

          <a
            href={rutaBase() + '/login'}
            className="w-full md:w-auto bg-gray-900 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-800 hover:-translate-y-1 hover:shadow-xl transition-all whitespace-nowrap flex items-center justify-center gap-2 relative z-10"
          >
            Pedir Ahora <ArrowRight className="w-5 h-5 shrink-0" />
          </a>
        </div>
      </div>

      {/* Main Footer */}
      <div className="bg-zinc-950 text-gray-400 pt-[180px] pb-12 px-6 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8">
          {/* Brand Col */}
          <div className="flex flex-col gap-6 md:col-span-4 lg:col-span-3">
            <a href={rutaBase() + '/'} className="flex items-center gap-2 text-white font-bold text-2xl">
              <Utensils className="w-7 h-7 text-brand-orange" />
              <span className="tracking-normal">CopiwayPRO</span>
            </a>
            <p className="text-sm leading-relaxed font-light max-w-sm">
              Hamburguer Copiway - Dark Kitchen especializada en hamburguesas artesanales de alta calidad con entrega directa a tu puerta.
            </p>
            <div className="flex gap-4 mt-2">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-orange hover:text-white transition-all text-gray-400">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-orange hover:text-white transition-all text-gray-400">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-orange hover:text-white transition-all text-gray-400">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-4 lg:col-span-2 lg:col-start-5">
            <h4 className="text-white font-semibold mb-6 tracking-wide text-sm">Compañía</h4>
            <ul className="flex flex-col gap-4 text-sm font-light">
              <li><a href="#nosotros" className="hover:text-brand-orange transition-colors">Sobre Nosotros</a></li>
              <li><a href="#menu" className="hover:text-brand-orange transition-colors">Nuestro Menú</a></li>
              <li><a href="#testimonios" className="hover:text-brand-orange transition-colors">Testimonios</a></li>
              <li><a href="#contacto" className="hover:text-brand-orange transition-colors">Contacto</a></li>
            </ul>
          </div>

          <div className="md:col-span-4 lg:col-span-2">
            <h4 className="text-white font-semibold mb-6 tracking-wide text-sm">Legal</h4>
            <ul className="flex flex-col gap-4 text-sm font-light">
              <li><a href="#" className="hover:text-brand-orange transition-colors">Política de Privacidad</a></li>
              <li><a href="#" className="hover:text-brand-orange transition-colors">Términos de Servicio</a></li>
              <li><a href="#" className="hover:text-brand-orange transition-colors">Política de Cookies</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="md:col-span-12 lg:col-span-3 lg:col-start-10">
            <h4 className="text-white font-semibold mb-6 tracking-wide text-sm">Suscríbete</h4>
            <p className="text-sm font-light mb-4">Recibe nuestras ofertas exclusivas y novedades en tu correo.</p>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); alert('Suscrito exitosamente.'); }}>
              <input 
                type="email" 
                placeholder="Tu email" 
                required 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-orange transition-colors"
              />
              <button 
                type="submit"
                className="bg-brand-orange hover:bg-[#e66500] text-white px-4 rounded-xl transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-20 pt-8 pb-8 md:pb-0 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-light">
          <p>© 2024 Hamburguer Copiway. Todos los derechos reservados.</p>
          <p className="opacity-50">Desarrollado con CopiwayPRO</p>
        </div>
      </div>
    </footer>
  );
}
