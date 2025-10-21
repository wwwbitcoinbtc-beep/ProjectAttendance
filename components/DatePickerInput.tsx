import React, { useState, useRef } from 'react';
import JalaliCalendar from './JalaliCalendar';
import { parseShamsi } from '../utils/date-formatter';

interface DatePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({ value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSelectDate = (date: string) => {
    onChange(date);
    setIsOpen(false);
  };
  
  // Basic validation on blur
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val && !parseShamsi(val)) {
          // If date is invalid, clear it.
          onChange('');
      }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        autoComplete="off"
      />
      {isOpen && (
        <div className="absolute z-20 mt-1">
          <JalaliCalendar 
            selectedDate={value} 
            onSelectDate={handleSelectDate}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default DatePickerInput;