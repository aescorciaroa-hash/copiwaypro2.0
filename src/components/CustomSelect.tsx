import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
}

export function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Seleccionar...', 
  className = '',
  buttonClassName = ''
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-gray-50/70 dark:bg-stone-900/50 hover:bg-gray-100/70 dark:hover:bg-stone-900 cursor-pointer flex justify-between items-center transition-all text-sm outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/30 ${isOpen ? 'border-brand-orange ring-1 ring-brand-orange/30' : ''} ${buttonClassName}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`flex items-center gap-2 truncate ${!selectedOption ? 'text-gray-400 dark:text-stone-500' : 'text-gray-900 dark:text-white font-medium'}`}>
          {selectedOption?.icon}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-stone-400 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-brand-orange' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-[1050] w-full mt-1.5 bg-white dark:bg-[#1f1f23] border border-gray-100 dark:border-stone-800 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden"
          >
            <div className="py-1 max-h-56 overflow-auto scrollbar-thin">
              {options.map((option) => (
                <div
                  key={option.value}
                  className={`px-3.5 py-2.5 text-xs sm:text-sm cursor-pointer flex items-center justify-between transition-colors ${
                    value === option.value 
                      ? 'bg-brand-orange/10 dark:bg-brand-orange/20 text-brand-orange font-semibold' 
                      : 'text-gray-700 dark:text-stone-200 hover:bg-gray-50 dark:hover:bg-stone-800'
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <span className="flex items-center gap-2 truncate">
                    {option.icon}
                    {option.label}
                  </span>
                  {value === option.value && <Check className="w-4 h-4 text-brand-orange shrink-0 ml-2" />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

