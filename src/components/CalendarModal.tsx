import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
}

export function CalendarModal({ isOpen, onClose, selectedDate, onSelectDate }: CalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date());
  
  // Update currentDate when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentDate(selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date());
      setShowYearSelector(false);
    }
  }, [isOpen, selectedDate]);

  const [showYearSelector, setShowYearSelector] = useState(false);

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0, Sunday is 6
  const startDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(year, month, day);
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    onSelectDate(`${yyyy}-${mm}-${dd}`);
    onClose();
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#111111] rounded-[24px] w-full max-w-[320px] p-6 shadow-2xl border border-gray-100 dark:border-stone-800 flex flex-col"
        >
          {showYearSelector ? (
            <div className="flex flex-col h-[340px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Seleccionar Año</h3>
                <button onClick={() => setShowYearSelector(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white font-bold text-sm">Volver</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {years.map(y => (
                  <button
                    key={y}
                    onClick={() => {
                      setCurrentDate(new Date(y, month, 1));
                      setShowYearSelector(false);
                    }}
                    className={`w-full py-3 rounded-xl text-center font-bold text-sm transition-colors ${year === y ? 'bg-brand-orange text-white' : 'hover:bg-gray-100 dark:hover:bg-stone-800 text-gray-700 dark:text-stone-300'}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-stone-800 text-gray-500 dark:text-stone-400 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setShowYearSelector(true)} className="font-bold text-[16px] text-gray-900 dark:text-white hover:opacity-80 transition-opacity">
                  {monthNames[month]} <span className="text-gray-500 dark:text-stone-400 font-medium">{year}</span>
                </button>
                <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-stone-800 text-gray-500 dark:text-stone-400 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Days of week */}
              <div className="grid grid-cols-7 mb-4">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-[10px] font-bold text-gray-400 dark:text-stone-500 mb-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-y-2">
                {Array.from({ length: startDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isSelected = selectedDate && 
                                     new Date(selectedDate + 'T00:00:00').getDate() === day && 
                                     new Date(selectedDate + 'T00:00:00').getMonth() === month &&
                                     new Date(selectedDate + 'T00:00:00').getFullYear() === year;
                  const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                  return (
                    <div key={day} className="flex justify-center items-center h-10">
                      <button
                        onClick={() => handleSelectDay(day)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full text-[14px] font-bold transition-all
                          ${isSelected 
                            ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/30' 
                            : isToday 
                              ? 'text-brand-orange border border-brand-orange/30' 
                              : 'text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-800'
                          }
                        `}
                      >
                        {day}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer Buttons */}
              <div className="mt-8 pt-4 border-t border-gray-100 dark:border-stone-800/50 flex justify-between items-center">
                <button onClick={onClose} className="text-[12px] font-bold text-gray-500 hover:text-gray-900 dark:text-stone-400 dark:hover:text-white uppercase tracking-wider transition-colors px-2 py-1">
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    onSelectDate(`${yyyy}-${mm}-${dd}`);
                    onClose();
                  }} 
                  className="text-[12px] font-black text-brand-orange hover:bg-brand-orange/10 px-4 py-2 rounded-lg uppercase tracking-wider transition-colors"
                >
                  Ir a hoy
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
