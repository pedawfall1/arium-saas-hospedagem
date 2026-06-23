import React, { forwardRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import { format, parse } from 'date-fns';
import { Calendar } from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";

registerLocale('pt-BR', ptBR);

export interface AriumDatePickerProps {
  value?: string;
  onChange?: (dateStr: string) => void;
  placeholder?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  excludeDates?: Date[];
}

export const AriumDatePicker = forwardRef<any, AriumDatePickerProps>(({ 
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  required = false,
  minDate,
  maxDate,
  className,
  excludeDates
}, ref) => {
  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : null;

  return (
    <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
      <DatePicker
        selected={selectedDate}
        onChange={(date: Date | null) => {
          if (onChange) {
            onChange(date ? format(date, 'yyyy-MM-dd') : '');
          }
        }}
        dateFormat="dd/MM/yyyy"
        locale="pt-BR"
        placeholderText={placeholder}
        required={required}
        minDate={minDate}
        maxDate={maxDate}
        excludeDates={excludeDates}
        className={`arium-datepicker-input ${className || ''}`}
        wrapperClassName="w-full"
      />
      <Calendar 
        size={16} 
        color="var(--text)" 
        style={{ 
          position: 'absolute', 
          right: '16px', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          pointerEvents: 'none',
          opacity: 0.8
        }} 
      />
    </div>
  );
});

AriumDatePicker.displayName = 'AriumDatePicker';
