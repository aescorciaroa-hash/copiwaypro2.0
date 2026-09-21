import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (time: string) => void;
  initialTime: string; // HH:mm format
}

export function TimePickerModal({ isOpen, onClose, onSave, initialTime }: TimePickerModalProps) {
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [selecting, setSelecting] = useState<'hours' | 'minutes'>('hours');

  useEffect(() => {
    if (initialTime && isOpen) {
      const [h, m] = initialTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        setPeriod(h >= 12 ? 'PM' : 'AM');
        setHours(h % 12 || 12);
        setMinutes(m);
      }
    }
  }, [initialTime, isOpen]);

  const handleSave = () => {
    let h = hours;
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    
    const formattedHours = h.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    
    onSave(`${formattedHours}:${formattedMinutes}`);
    onClose();
  };

  const getClockNumbers = () => {
    const numbers = [];
    const count = selecting === 'hours' ? 12 : 12;
    
    for (let i = 1; i <= count; i++) {
      let displayValue = selecting === 'hours' ? i : (i === 12 ? 0 : i * 5);
      
      const angle = (i * 30) - 90;
      const rad = angle * (Math.PI / 180);
      const radius = 95;
      const x = radius * Math.cos(rad);
      const y = radius * Math.sin(rad);

      const isSelected = (selecting === 'hours' && hours === displayValue) || (selecting === 'minutes' && minutes === displayValue);

      numbers.push(
        <button
          key={i}
          className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-sm font-medium transition-colors z-20 ${
            isSelected
              ? 'text-gray-900 dark:text-white font-bold'
              : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-white/10'
          }`}
          style={{ transform: `translate(${x + 120}px, ${y + 120}px)` }}
          onClick={() => {
            if (selecting === 'hours') {
              setHours(displayValue);
              setSelecting('minutes');
            } else {
              setMinutes(displayValue);
            }
          }}
        >
          {displayValue}
        </button>
      );
    }
    return numbers;
  };

  const getHandAngle = () => {
    if (selecting === 'hours') {
      return hours * 30; // 12 is 360, same as 0
    } else {
      return minutes * 6; // 60 minutes = 360 degrees
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-[#111111] rounded-[32px] p-8 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-white/10"
          >
            {/* Header / Time Display */}
            <div className="flex justify-center items-center gap-4 mb-8">
              <div className="flex items-baseline gap-1">
                <button 
                  onClick={() => setSelecting('hours')}
                  className={`text-5xl font-black transition-colors ${selecting === 'hours' ? 'text-brand-orange' : 'text-gray-300 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400'}`}
                >
                  {hours.toString().padStart(2, '0')}
                </button>
                <span className="text-5xl font-black text-gray-300 dark:text-gray-500">:</span>
                <button 
                  onClick={() => setSelecting('minutes')}
                  className={`text-5xl font-black transition-colors ${selecting === 'minutes' ? 'text-gray-900 dark:text-white' : 'text-gray-300 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400'}`}
                >
                  {minutes.toString().padStart(2, '0')}
                </button>
              </div>
              
              <div className="flex flex-col bg-gray-100 dark:bg-white/5 rounded-xl overflow-hidden border border-gray-200 dark:border-white/5">
                <button 
                  onClick={() => setPeriod('AM')}
                  className={`px-3 py-2 text-xs font-bold transition-colors ${period === 'AM' ? 'bg-brand-orange text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                >
                  AM
                </button>
                <button 
                  onClick={() => setPeriod('PM')}
                  className={`px-3 py-2 text-xs font-bold transition-colors ${period === 'PM' ? 'bg-brand-orange text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Clock Face */}
            <div className="relative w-[240px] h-[240px] mx-auto bg-gray-50 dark:bg-black/40 rounded-full border border-gray-200 dark:border-white/5 mb-8">
              {/* Hand */}
              <div 
                className="absolute z-10 w-0.5 bg-brand-orange transition-transform duration-300 ease-out"
                style={{ 
                  height: '95px',
                  bottom: '50%',
                  left: 'calc(50% - 1px)',
                  transformOrigin: 'bottom center',
                  transform: `rotate(${getHandAngle()}deg)`
                }}
              >
                {/* Hand End Circle - Hollow Ring */}
                <div 
                  className="absolute rounded-full border-[2px] border-brand-orange bg-transparent" 
                  style={{ top: '-16px', left: '-15px', width: '32px', height: '32px' }} 
                />
              </div>
              
              {/* Center Dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-brand-orange z-20" />

              {/* Numbers */}
              {getClockNumbers()}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <button 
                onClick={onClose}
                className="px-6 py-3 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-3 bg-brand-orange text-white rounded-xl text-sm font-bold hover:bg-[#e66500] transition-colors shadow-lg shadow-brand-orange/20"
              >
                ACEPTAR
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}