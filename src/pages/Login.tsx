import React, { useState } from 'react';
import { Utensils, Lock, ArrowLeft, ArrowRight, Sun, Moon, AlertCircle, CheckCircle2, Check, Mail, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useForm } from '../hooks/useForm';
import { api, ApiError, irA, rutaBase } from '../servicios/api';

export default function Login() {
  const { theme, toggleTheme } = useTheme();
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit
  } = useForm({
    initialValues: {
      email: '',
      password: '',
      remember: false,
    },
    validationRules: {
      email: {
        required: true,
        requiredMessage: 'Introduce tu correo para iniciar sesión.',
        email: true,
        emailMessage: 'Ingresa un correo electrónico con formato válido (ej. usuario@dominio.com).'
      },
      password: {
        required: true,
        requiredMessage: 'La contraseña es obligatoria para ingresar.',
        minLength: 8,
        minLengthMessage: 'La contraseña debe tener una longitud mínima de 8 caracteres.'
      }
    },
    onSubmit: async (formValues) => {
      setLoginError(null);

      try {
        const { user } = await api.post<{ user: { id: string; role: string } }>('/auth/login', {
          email: formValues.email,
          password: formValues.password,
        });

        // Se conserva una copia en localStorage solo para el comportamiento
        // visual actual (p.ej. lecturas síncronas en otros componentes); la
        // sesión real vive en la cookie HttpOnly que puso el servidor.
        localStorage.setItem('copiway_auth_user_id', user.id);
        localStorage.setItem('copiway_auth_role', user.role);

        setSubmitSuccess(true);
        setTimeout(() => {
          const routes: Record<string, string> = {
            admin: '/admin',
            kitchen: '/kitchen',
            delivery: '/delivery',
            client: '/client',
          };
          irA(routes[user.role] || '/client');
        }, 1500);
      } catch (err) {
        setLoginError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión. Intenta de nuevo.');
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-6 relative overflow-hidden bg-gray-50 dark:bg-stone-950 transition-colors duration-100">
      {/* Impressive Modern Background */}
      <style>{`
        .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .dark .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(255,255,255,0.015) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.015) 1px, transparent 1px);
        }
      `}</style>

      {/* Base Grid */}
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_80%)]"></div>

      {/* Glowing Orbs - High Performance Static Version */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full min-w-full min-h-full opacity-35 dark:opacity-25 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full bg-brand-orange/30 blur-[80px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full bg-[#ffb070]/20 blur-[90px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] md:w-[400px] h-[250px] md:h-[400px] rounded-full bg-blue-200/20 blur-[80px]"></div>
      </div>

      {/* Overlay to soften - Lightweight blur for fluid toggling */}
      <div className="absolute inset-0 bg-white/70 dark:bg-stone-950/70 backdrop-blur-[6px] transition-colors duration-100"></div>

      {/* Floating corner theme selector */}
      <div className="absolute top-6 right-6 z-30">
        <button
          onClick={toggleTheme}
          type="button"
          className="p-3 rounded-full bg-white/80 dark:bg-stone-900/80 border border-black/5 dark:border-white/5 text-gray-500 dark:text-stone-400 hover:text-brand-orange dark:hover:text-brand-orange transition-all duration-100 shadow-md flex items-center justify-center cursor-pointer"
          title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
        >
          {theme === 'light' ? <Moon className="w-5 h-5 text-gray-600" /> : <Sun className="w-5 h-5 text-brand-orange" />}
        </button>
      </div>

      <div className="w-full max-w-[1040px] bg-white/90 dark:bg-stone-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_80px_-15px_rgba(255,112,0,0.1)] dark:shadow-[0_20px_80px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col lg:flex-row border border-white dark:border-stone-800/80 relative z-10 transition-all duration-100 ring-1 ring-black/5 dark:ring-white/10 hover:shadow-[0_30px_100px_-20px_rgba(255,112,0,0.15)] dark:hover:shadow-[0_30px_100px_-20px_rgba(0,0,0,0.6)]">
        
        {/* Left side styling for large screens - visible as sidebar */}
        <div className="hidden lg:flex lg:w-1/2 bg-zinc-950 relative flex-col justify-between p-14 text-white">
          <div className="absolute inset-0 opacity-100">
            <img 
              src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000&auto=format&fit=crop" 
              alt="Gourmet Burger"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/60"></div>
          </div>

          <div className="relative z-10">
            <a href={rutaBase() + '/'} className="inline-flex items-center gap-2 font-bold text-xl text-white mb-20 hover:text-brand-orange transition-colors">
              <Utensils className="w-6 h-6 flex-shrink-0 text-brand-orange" />
              <span>CopiwayPRO</span>
            </a>

            <h1 className="text-5xl font-bold leading-[1.15] mb-6 tracking-normal">
              El Corazón de tu <br/><span className="text-brand-orange">Cocina</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-md leading-relaxed font-light">
              Todo lo que necesitas para que tus hamburguesas lleguen perfectas. Controla comandas, organiza despachos y haz crecer tu Dark Kitchen sin estrés.
            </p>
          </div>

          <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[20px] p-6 mt-16 max-w-md">
            <div className="flex items-center gap-6">
              <div className="w-10 h-10 rounded-full bg-brand-orange/20 flex items-center justify-center shrink-0 border border-brand-orange/30">
                <Lock className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Conexión Segura</h4>
                <p className="text-sm text-zinc-400 mt-0.5">Tus datos y los de tus clientes protegidos.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white dark:bg-stone-900 p-6 md:p-12 lg:p-16 transition-colors duration-100">
          
          <div className="w-full max-w-md">
            <a href={rutaBase() + '/'} className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-stone-400 hover:text-brand-dark dark:hover:text-brand-orange mb-12 font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver al inicio
            </a>

            <h2 className="text-3xl font-bold tracking-normal tracking-normal text-gray-900 dark:text-white mb-2 transition-colors duration-100">Iniciar Sesión</h2>
            <p className="text-gray-500 dark:text-stone-400 text-sm mb-10 transition-colors duration-100">Ingresa tus credenciales para continuar</p>

            {submitSuccess && (
              <div className="mb-6 p-4 rounded-[20px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-400 flex items-start gap-4 transition-all duration-150 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">¡Ingreso Exitoso!</h4>
                  <p className="text-xs mt-0.5 opacity-90">Se han validado tus credenciales para <strong>{values.email}</strong>. Redirigiendo...</p>
                </div>
              </div>
            )}
            
            {loginError && (
              <div className="mb-6 p-4 rounded-[20px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/30 text-red-800 dark:text-red-400 flex items-start gap-4 transition-all duration-150 animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Error de acceso</h4>
                  <p className="text-xs mt-0.5 opacity-90">{loginError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-stone-300 mb-2 transition-colors duration-100">Correo Electrónico</label>
                <div className="relative group">
                  <input 
                    type="email" 
                    name="email"
                    placeholder="ejemplo@correo.com"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full bg-gray-50 dark:bg-stone-900 border rounded-[20px] pl-11 pr-4 py-3.5 text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#1a1a1e] transition-all duration-100 ${
                      touched.email && errors.email 
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                        : 'border-gray-200 dark:border-stone-800 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10'
                    }`}
                  />
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                    touched.email && errors.email 
                      ? 'text-red-500' 
                      : 'text-gray-400 group-focus-within:text-brand-orange'
                  }`}>
                    <Mail className="w-5 h-5" />
                  </div>
                </div>
                {touched.email && errors.email && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium transition-all duration-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-stone-300 transition-colors duration-100">Contraseña</label>
                  <a href={rutaBase() + '/forgot-password'} className="text-sm font-medium text-brand-orange hover:text-[#e66500] transition-colors">¿Olvidaste tu contraseña?</a>
                </div>
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="••••••••"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full bg-gray-50 dark:bg-stone-900 border rounded-[20px] pl-11 pr-11 py-3.5 text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#1a1a1e] transition-all duration-100 tracking-widest placeholder:tracking-normal ${
                      touched.password && errors.password
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border-gray-200 dark:border-stone-800 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10'
                    }`}
                  />
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                    touched.password && errors.password
                      ? 'text-red-500'
                      : 'text-gray-400 group-focus-within:text-brand-orange'
                  }`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium transition-all duration-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className="relative flex items-center justify-center w-5 h-5 rounded border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1a1a1e] shrink-0 overflow-hidden transition-colors">
                  <input 
                    type="checkbox" 
                    id="remember" 
                    name="remember"
                    checked={values.remember}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 m-0" 
                  />
                  <div className={`w-full h-full flex items-center justify-center transition-all duration-200 ${values.remember ? 'bg-brand-orange text-white' : 'bg-transparent text-transparent'}`}>
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </div>
                </div>
                <label htmlFor="remember" className="text-sm font-medium text-gray-700 dark:text-stone-300 cursor-pointer select-none transition-colors duration-100">
                  Recordar mi sesión en este equipo
                </label>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-brand-orange text-white rounded-[20px] py-4 font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-[#e66500] hover:shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5 disabled:opacity-55 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all duration-100 mt-4"
              >
                {isSubmitting ? (
                  <>Iniciando sesión...</>
                ) : (
                  <>
                    Entrar al Sistema <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-12 text-center text-sm">
              <span className="text-gray-500 dark:text-stone-400 transition-colors duration-100">¿Aún no tienes una cuenta?</span>
              <br />
              <a href={rutaBase() + '/register'} className="font-semibold text-brand-dark dark:text-stone-200 hover:text-brand-orange dark:hover:text-brand-orange transition-colors mt-2 inline-block">
                Regístrate como cliente <ArrowRight className="w-4 h-4 inline-block ml-1 align-text-bottom" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Login component ends above
