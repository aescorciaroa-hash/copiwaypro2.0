import React, { useState } from 'react';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { ArrowLeft, Users, CheckCircle2, Sun, Moon, AlertCircle, Check, User, Mail, Phone, Lock, UserPlus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useForm } from '../hooks/useForm';
import { api, ApiError, irA, rutaBase } from '../servicios/api';

export default function Register() {
  const { theme, toggleTheme } = useTheme();
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldError,
  } = useForm({
    initialValues: {
      nombres: '',
      apellidos: '',
      email: '',
      telefono: '',
      nacimiento: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
    validationRules: {
      nombres: {
        required: true,
        requiredMessage: 'Introduce tus nombres.',
      },
      apellidos: {
        required: true,
        requiredMessage: 'Introduce tus apellidos.',
      },
      email: {
        required: true,
        requiredMessage: 'El correo electrónico es obligatorio.',
        email: true,
        emailMessage: 'Por favor, introduce una dirección de correo válida.',
      },
      telefono: {
        required: true,
        requiredMessage: 'El teléfono es obligatorio.',
        minLength: 10,
        minLengthMessage: 'El número de teléfono debe tener al menos 10 dígitos.',
        pattern: /^[0-9+\s-()]+$/,
        patternMessage: 'Ingresa un formato de número telefónico válido.',
      },
      nacimiento: {
        required: true,
        requiredMessage: 'La fecha de nacimiento es obligatoria.',
      },
      password: {
        required: true,
        requiredMessage: 'La contraseña es obligatoria.',
        minLength: 8,
        minLengthMessage: 'Debe contener un mínimo de 8 caracteres.',
      },
      confirmPassword: {
        required: true,
        requiredMessage: 'Por favor, confirma tu contraseña.',
        matchField: 'password',
        matchFieldMessage: 'Las contraseñas no coinciden.',
      },
      terms: {
        mustBeTrue: true,
        mustBeTrueMessage: 'Debes aceptar la política de tratamiento de datos para continuar.',
      },
    },
    onSubmit: async (formValues) => {
      try {
        const { user } = await api.post<{ user: { id: string } }>('/auth/register', {
          name: `${formValues.nombres} ${formValues.apellidos}`,
          email: formValues.email,
          phone: formValues.telefono,
          birthday: formValues.nacimiento,
          password: formValues.password,
          confirmPassword: formValues.confirmPassword,
          terms: formValues.terms,
        });

        localStorage.setItem('copiway_auth_user_id', user.id);
        localStorage.setItem('copiway_auth_role', 'client');
        setSubmitSuccess(true);
        setTimeout(() => {
          setSubmitSuccess(false);
          irA('/client');
        }, 1500);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          setFieldError('email', 'Este correo o teléfono ya está registrado. Inicia sesión o recupera tu contraseña.');
          return;
        }
        if (err instanceof ApiError && err.errors) {
          const firstField = Object.keys(err.errors)[0];
          if (firstField) setFieldError(firstField as keyof typeof values, err.errors[firstField][0]);
          return;
        }
        setFieldError('email', err instanceof ApiError ? err.message : 'No se pudo completar el registro.');
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
        <div className="absolute top-1/4 right-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full bg-brand-orange/30 blur-[80px]"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full bg-[#ffb070]/20 blur-[90px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] md:w-[400px] h-[250px] md:h-[400px] rounded-full bg-blue-200/20 blur-[80px]"></div>
      </div>

      {/* Overlay to soften - Lightweight blur for fluid toggling */}
      <div className="absolute inset-0 bg-white/70 dark:bg-stone-950/70 backdrop-blur-[6px] transition-colors duration-100"></div>

      {/* Floating Theme Switcher */}
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

      <div className="w-full max-w-[1100px] bg-white/90 dark:bg-stone-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_80px_-15px_rgba(255,112,0,0.1)] dark:shadow-[0_20px_80px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col lg:flex-row-reverse border border-white dark:border-stone-800/80 relative z-10 transition-all duration-100 ring-1 ring-black/5 dark:ring-white/10 hover:shadow-[0_30px_100px_-20px_rgba(255,112,0,0.15)] dark:hover:shadow-[0_30px_100px_-20px_rgba(0,0,0,0.6)]">
        
        {/* Image styling - top image on mobile, sidebar on large screens */}
        <div className="flex lg:w-[45%] bg-zinc-950 relative flex-col justify-center p-8 lg:p-14 text-white overflow-hidden min-h-[200px] lg:min-h-[auto]">
          <div className="absolute inset-0 opacity-100">
            <img 
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000&auto=format&fit=crop" 
              alt="Restaurant Interior"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/60 lg:bg-gradient-to-t"></div>
          </div>

          <div className="relative z-10 max-w-md mx-auto text-center flex flex-col justify-center h-full">
            <div className="w-12 h-12 lg:w-16 lg:h-16 bg-brand-orange/20 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-8 border border-brand-orange/30">
              <Users className="w-6 h-6 lg:w-8 lg:h-8 text-brand-orange" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-2 lg:mb-4 text-white tracking-normal">
              ¡Sabor que <br className="hidden lg:block"/><span className="text-brand-orange">Conecta!</span>
            </h2>
            <p className="text-sm lg:text-base text-zinc-300 lg:text-zinc-400 leading-relaxed mb-0 lg:mb-10 font-light hidden sm:block">
              Pide tus favoritas en segundos y sigue tu orden hasta tu puerta.
            </p>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[20px] p-6 text-left space-y-5 hidden lg:block">
              <div className="flex items-center gap-4">
                <div className="bg-brand-orange rounded-full p-1 shadow-[0_0_15px_rgba(255,112,0,0.4)]">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-white">Pide rápido y fácil</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-brand-orange rounded-full p-1 shadow-[0_0_15px_rgba(255,112,0,0.4)]">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-white">Monitorea tu pedido</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-brand-orange rounded-full p-1 shadow-[0_0_15px_rgba(255,112,0,0.4)]">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-white">Ofertas exclusivas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Left side - Form */}
        <div className="w-full lg:w-[55%] flex items-center justify-center bg-white dark:bg-stone-900 p-6 md:p-12 lg:p-16 transition-colors duration-100">
          
          <div className="w-full max-w-lg">
            <a href={rutaBase() + '/'} className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-stone-400 hover:text-brand-dark dark:hover:text-brand-orange mb-10 font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver al inicio
            </a>

            <h2 className="text-3xl font-bold tracking-normal tracking-normal text-gray-900 dark:text-white mb-2 transition-colors duration-100">Crear Cuenta</h2>
            <p className="text-gray-500 dark:text-stone-400 text-sm mb-10 transition-colors duration-100">Regístrate para pedir en Copiway.</p>

            {submitSuccess && (
              <div className="mb-6 p-4 rounded-[20px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-400 flex items-start gap-4 transition-all duration-150 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">¡Registro Completado!</h4>
                  <p className="text-xs mt-0.5 opacity-90">Tu cuenta para <strong>{values.email}</strong> ha sido creada de manera exitosa. ¡Bienvenido a Copiway!</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-stone-300 mb-2 transition-colors duration-100">Nombres</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      name="nombres"
                      placeholder="Ej. Juan Carlos"
                      value={values.nombres}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full bg-gray-50 dark:bg-[#1a1a1e] border rounded-[20px] pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#26262a] transition-all duration-100 ${
                        touched.nombres && errors.nombres 
                          ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                          : 'border-black/5 dark:border-white/5 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10'
                      }`}
                    />
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                      touched.nombres && errors.nombres 
                        ? 'text-red-500' 
                        : 'text-gray-400 group-focus-within:text-brand-orange'
                    }`}>
                      <User className="w-5 h-5" />
                    </div>
                  </div>
                  {touched.nombres && errors.nombres && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium transition-all duration-100">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errors.nombres}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-stone-300 mb-2 transition-colors duration-100">Apellidos</label>
                  <input 
                    type="text" 
                    name="apellidos"
                    placeholder="Ej. Pérez Rodríguez"
                    value={values.apellidos}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full bg-gray-50 dark:bg-[#1a1a1e] border rounded-[20px] px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#26262a] transition-all duration-100 ${
                      touched.apellidos && errors.apellidos 
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                        : 'border-black/5 dark:border-white/5 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10'
                    }`}
                  />
                  {touched.apellidos && errors.apellidos && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium transition-all duration-100">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errors.apellidos}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-stone-300 mb-2 transition-colors duration-100">Correo Electrónico</label>
                <div className="relative group">
                  <input 
                    type="email" 
                    name="email"
                    placeholder="correo@ejemplo.com"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full bg-gray-50 dark:bg-[#1a1a1e] border rounded-[20px] pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#26262a] transition-all duration-100 ${
                      touched.email && errors.email 
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                        : 'border-black/5 dark:border-white/5 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10'
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-stone-300 mb-2 transition-colors duration-100">Teléfono</label>
                  <div className="relative group">
                    <input 
                      type="tel" 
                      name="telefono"
                      placeholder="Ej. 300 123 4567"
                      value={values.telefono}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full bg-gray-50 dark:bg-[#1a1a1e] border rounded-[20px] pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#26262a] transition-all duration-100 ${
                        touched.telefono && errors.telefono 
                          ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                          : 'border-black/5 dark:border-white/5 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10'
                      }`}
                    />
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                      touched.telefono && errors.telefono 
                        ? 'text-red-500' 
                        : 'text-gray-400 group-focus-within:text-brand-orange'
                    }`}>
                      <Phone className="w-5 h-5" />
                    </div>
                  </div>
                  {touched.telefono && errors.telefono && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium transition-all duration-100">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errors.telefono}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-stone-300 mb-2 transition-colors duration-100">Fecha de Nacimiento</label>
                  <CustomDatePicker 
                    name="nacimiento"
                    value={values.nacimiento}
                    onChange={handleChange as unknown as (e: { target: { name: string; value: string } }) => void}
                    className={`w-full bg-gray-50 dark:bg-[#1a1a1e] border rounded-[20px] px-4 py-3 text-sm outline-none focus:bg-white dark:focus:bg-[#26262a] transition-all duration-100 ${
                      errors.nacimiento && touched.nacimiento 
                        ? 'border-red-500' 
                        : 'border-gray-200 dark:border-white/5 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20'
                    }`}
                  />
                  {touched.nacimiento && errors.nacimiento && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium transition-all duration-100">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errors.nacimiento}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-stone-300 mb-2 transition-colors duration-100">Contraseña</label>
                  <div className="relative group">
                    <input 
                      type="password" 
                      name="password"
                      placeholder="••••••••"
                      value={values.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full bg-gray-50 dark:bg-[#1a1a1e] border rounded-[20px] pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#26262a] transition-all duration-100 tracking-widest placeholder:tracking-normal ${
                        touched.password && errors.password 
                          ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                          : 'border-black/5 dark:border-white/5 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10'
                      }`}
                    />
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                      touched.password && errors.password 
                        ? 'text-red-500' 
                        : 'text-gray-400 group-focus-within:text-brand-orange'
                    }`}>
                      <Lock className="w-5 h-5" />
                    </div>
                  </div>
                  {touched.password && errors.password && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium transition-all duration-100">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errors.password}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-stone-300 mb-2 transition-colors duration-100">Confirmar</label>
                  <div className="relative group">
                    <input 
                      type="password" 
                      name="confirmPassword"
                      placeholder="••••••••"
                      value={values.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full bg-gray-50 dark:bg-[#1a1a1e] border rounded-[20px] pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#26262a] transition-all duration-100 tracking-widest placeholder:tracking-normal ${
                        touched.confirmPassword && errors.confirmPassword 
                          ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                          : 'border-black/5 dark:border-white/5 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10'
                      }`}
                    />
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                      touched.confirmPassword && errors.confirmPassword 
                        ? 'text-red-500 font-bold' 
                        : 'text-brand-orange'
                    }`}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium transition-all duration-100">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-start gap-4 pt-4">
                  <div className={`relative flex items-center justify-center w-5 h-5 mt-0.5 rounded border bg-white dark:bg-[#1a1a1e] shrink-0 overflow-hidden transition-colors ${touched.terms && errors.terms ? 'border-red-500' : 'border-gray-300 dark:border-white/10'}`}>
                    <input 
                      type="checkbox" 
                      id="terms" 
                      name="terms"
                      checked={values.terms}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 m-0" 
                    />
                    <div className={`w-full h-full flex items-center justify-center transition-all duration-200 ${values.terms ? 'bg-brand-orange text-white' : 'bg-transparent text-transparent'}`}>
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </div>
                  </div>
                  <label htmlFor="terms" className="text-sm text-gray-500 dark:text-stone-400 leading-relaxed cursor-pointer select-none">
                    Acepto los <a href="#" className="font-semibold text-gray-800 dark:text-gray-200 hover:text-brand-orange transition-colors">términos de servicio</a> y la <a href="#" className="font-semibold text-gray-800 dark:text-gray-200 hover:text-brand-orange transition-colors">política de tratamiento de datos</a>.
                  </label>
                </div>
                {touched.terms && errors.terms && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium transition-all duration-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errors.terms}
                  </p>
                )}
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full mt-4 bg-brand-orange text-white rounded-[20px] py-4 font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-[#e66500] hover:shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5 disabled:opacity-55 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all duration-100"
              >
                {isSubmitting ? (
                  <>Registrando...</>
                ) : (
                  <>
                    Completar Registro <UserPlus className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 text-center text-sm">
              <span className="text-gray-500 dark:text-stone-400">¿Ya tienes una cuenta registrada? </span>
              <a href={rutaBase() + '/login'} className="font-semibold text-brand-dark dark:text-stone-200 hover:text-brand-orange transition-colors">Inicia sesión aquí</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Register component ends above
