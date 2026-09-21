import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomDatePickerProps {
  value: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
  name: string;
  className?: string;
  placeholder?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, name, className, placeholder = "Seleccionar fecha" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date(value || new Date().setFullYear(new Date().getFullYear() - 18)));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const generateDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isSelected = value === dateStr;
      
      days.push(
        <button
          key={i}
          type="button"
          onClick={() => {
            onChange({ target: { name, value: dateStr } });
            setIsOpen(false);
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
            isSelected 
              ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20' 
              : 'text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-800'
          }`}
        >
          {i}
        </button>
      );
    }
    return days;
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };
  
  const changeYear = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(newDate.getFullYear() + offset);
    setCurrentDate(newDate);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between cursor-pointer ${className}`}
      >
        <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-stone-500'}>
          {value || placeholder}
        </span>
        <CalendarIcon className="w-5 h-5 text-gray-400 dark:text-stone-500" />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 p-4 bg-white dark:bg-[#151515] border border-gray-100 dark:border-stone-800 shadow-xl rounded-2xl w-[280px] origin-top-left"
          >
            <div className="flex items-center justify-between mb-4">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); changeYear(-1); }} 
                className="p-1 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-lg text-gray-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="font-bold text-gray-900 dark:text-white text-sm">
                {currentDate.getFullYear()}
              </div>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); changeYear(1); }} 
                className="p-1 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-lg text-gray-400 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); changeMonth(-1); }} 
                className="p-1 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-lg text-gray-500 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="font-bold text-brand-orange">
                {monthNames[currentDate.getMonth()]}
              </div>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); changeMonth(1); }} 
                className="p-1 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-lg text-gray-500 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
                <div key={i} className="w-8 h-8 flex items-center justify-center text-xs font-bold text-gray-400">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {generateDays()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
