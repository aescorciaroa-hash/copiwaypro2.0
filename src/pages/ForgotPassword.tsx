import React, { useState } from 'react';
import { Utensils, Lock, ArrowLeft, ArrowRight, Sun, Moon, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useForm } from '../hooks/useForm';
import { api, ApiError, rutaBase } from '../servicios/api';

export default function ForgotPassword() {
  const { theme, toggleTheme } = useTheme();

  const [step, setStep] = useState<1 | 2>(1);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form for Step 1
  const form1 = useForm({
    initialValues: { identifier: '' },
    validationRules: {
      identifier: {
        required: true,
        requiredMessage: 'Ingresa tu correo o teléfono.',
      }
    },
    onSubmit: async (values) => {
      try {
        await api.post('/auth/forgot-password/request', { email: values.identifier });
        setStep(2);
      } catch (err) {
        form1.setFieldError('identifier', err instanceof ApiError ? err.message : 'No se pudo enviar el código. Intenta de nuevo.');
      }
    }
  });

  // Form for Step 2
  const form2 = useForm({
    initialValues: { code: '', newPassword: '', confirmPassword: '' },
    validationRules: {
      code: {
        required: true,
        requiredMessage: 'Ingresa el código de verificación.',
      },
      newPassword: {
        required: true,
        requiredMessage: 'Ingresa tu nueva contraseña.',
        minLength: 8,
        minLengthMessage: 'Mínimo 8 caracteres.'
      },
      confirmPassword: {
        required: true,
        requiredMessage: 'Confirma tu nueva contraseña.',
        matchField: 'newPassword',
        matchFieldMessage: 'Las contraseñas no coinciden.'
      }
    },
    onSubmit: async (values) => {
      try {
        await api.post('/auth/forgot-password/reset', {
          email: form1.values.identifier,
          code: values.code,
          newPassword: values.newPassword,
        });
        setResetSuccess(true);
      } catch (err) {
        form2.setFieldError('code', err instanceof ApiError ? err.message : 'No se pudo restablecer la contraseña.');
      }
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-6 relative overflow-hidden bg-gray-50 dark:bg-stone-950 transition-colors duration-100">
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
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_80%)]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] min-w-[800px] min-h-[800px] opacity-35 dark:opacity-25 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-brand-orange/30 blur-[80px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-[#ffb070]/20 blur-[90px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-blue-200/20 blur-[80px]"></div>
      </div>
      <div className="absolute inset-0 bg-white/70 dark:bg-stone-950/70 backdrop-blur-[6px] transition-colors duration-100"></div>
      
      <div className="absolute top-6 right-6 z-30">
        <button
          onClick={toggleTheme}
          type="button"
          className="p-3 rounded-full bg-white/80 dark:bg-stone-900/80 border border-black/5 dark:border-white/5 text-gray-500 dark:text-stone-400 hover:text-brand-orange dark:hover:text-brand-orange transition-all duration-100 shadow-md flex items-center justify-center cursor-pointer"
        >
          {theme === 'light' ? <Moon className="w-5 h-5 text-gray-600" /> : <Sun className="w-5 h-5 text-brand-orange" />}
        </button>
      </div>

      <div className="w-full max-w-[1040px] bg-white/90 dark:bg-stone-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_80px_-15px_rgba(255,112,0,0.1)] dark:shadow-[0_20px_80px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col lg:flex-row border border-white dark:border-stone-800/80 relative z-10 transition-all duration-100 ring-1 ring-black/5 dark:ring-white/10 hover:shadow-[0_30px_100px_-20px_rgba(255,112,0,0.15)] dark:hover:shadow-[0_30px_100px_-20px_rgba(0,0,0,0.6)]">
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

        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white dark:bg-stone-900 p-6 md:p-12 lg:p-16 transition-colors duration-100">
          <div className="w-full max-w-md">
            <a href={rutaBase() + '/login'} className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-stone-400 hover:text-brand-dark dark:hover:text-brand-orange mb-12 font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver a iniciar sesión
            </a>
            
            <h2 className="text-3xl font-bold tracking-normal text-gray-900 dark:text-white mb-2 transition-colors duration-100">Recuperar Contraseña</h2>
            <p className="text-gray-500 dark:text-stone-400 text-sm mb-10 transition-colors duration-100">
              {step === 1 ? 'Ingresa tus datos para recibir un código.' : 'Crea tu nueva contraseña.'}
            </p>

            {resetSuccess && (
              <div className="mb-6 p-4 rounded-[20px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-400 flex items-start gap-4 transition-all duration-150 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">¡Éxito!</h4>
                  <p className="text-xs mt-0.5 opacity-90">Tu contraseña ha sido actualizada.</p>
                </div>
              </div>
            )}

            {!resetSuccess && step === 1 && (
              <form onSubmit={form1.handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-stone-300 mb-2">Correo electrónico o número de celular</label>
                  <div className="relative group">
                    <input 
                      type="text"
                      name="identifier"
                      placeholder="ej. usuario@email.com o 3001234567"
                      value={form1.values.identifier}
                      onChange={form1.handleChange}
                      onBlur={form1.handleBlur}
                      className={`w-full bg-gray-50 dark:bg-[#1a1a1e] border rounded-[20px] px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#26262a] transition-all duration-100 ${
                        form1.touched.identifier && form1.errors.identifier 
                          ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                          : 'border-black/5 dark:border-white/5 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10'
                      }`}
                    />
                  </div>
                  {form1.touched.identifier && form1.errors.identifier && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {form1.errors.identifier}
                    </p>
                  )}
                </div>
                <button 
                  type="submit" 
                  disabled={form1.isSubmitting}
                  className="w-full mt-4 bg-brand-orange text-white rounded-[20px] py-4 font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-[#e66500] hover:shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5 disabled:opacity-55 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all duration-100"
                >
                  {form1.isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperación'} <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            )}

            {!resetSuccess && step === 2 && (
              <form onSubmit={form2.handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-stone-300 mb-2">Código de verificación</label>
                  <input 
                    type="text"
                    name="code"
                    placeholder="123456"
                    value={form2.values.code}
                    onChange={form2.handleChange}
                    onBlur={form2.handleBlur}
                    className={`w-full bg-gray-50 dark:bg-[#1a1a1e] border rounded-[20px] px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#26262a] transition-all duration-100 tracking-widest text-center ${
                      form2.touched.code && form2.errors.code 
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                        : 'border-black/5 dark:border-white/5 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10'
                    }`}
                  />
                  {form2.touched.code && form2.errors.code && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {form2.errors.code}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-stone-300 mb-2">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      name="newPassword"
                      placeholder="••••••••"
                      value={form2.values.newPassword}
                      onChange={form2.handleChange}
                      onBlur={form2.handleBlur}
                      className={`w-full bg-gray-50 dark:bg-[#1a1a1e] border rounded-[20px] px-4 pr-11 py-3 text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#26262a] transition-all duration-100 ${
                        form2.touched.newPassword && form2.errors.newPassword
                          ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                          : 'border-black/5 dark:border-white/5 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {form2.touched.newPassword && form2.errors.newPassword && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {form2.errors.newPassword}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-stone-300 mb-2">Confirmar contraseña</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder="••••••••"
                      value={form2.values.confirmPassword}
                      onChange={form2.handleChange}
                      onBlur={form2.handleBlur}
                      className={`w-full bg-gray-50 dark:bg-[#1a1a1e] border rounded-[20px] px-4 pr-11 py-3 text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#26262a] transition-all duration-100 ${
                        form2.touched.confirmPassword && form2.errors.confirmPassword
                          ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                          : 'border-black/5 dark:border-white/5 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {form2.touched.confirmPassword && form2.errors.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {form2.errors.confirmPassword}
                    </p>
                  )}
                </div>
                <button 
                  type="submit" 
                  disabled={form2.isSubmitting}
                  className="w-full mt-4 bg-brand-orange text-white rounded-[20px] py-4 font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-[#e66500] hover:shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5 disabled:opacity-55 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all duration-100"
                >
                  {form2.isSubmitting ? 'Guardando...' : 'Restablecer contraseña'}
                </button>
              </form>
            )}

            {resetSuccess && (
              <a
                href={rutaBase() + '/login'}
                className="w-full mt-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-[20px] py-4 font-bold tracking-wide flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all duration-100"
              >
                Volver a iniciar sesión
              </a>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
