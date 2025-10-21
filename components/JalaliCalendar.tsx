import React, { useState, useMemo, useEffect } from 'react';
import { toPersianDigits } from '../utils/persian-utils';

declare const jalaali: any;

interface JalaliCalendarProps {
  selectedDate?: string; // Shamsi YYYY-MM-DD
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

const PERSIAN_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const PERSIAN_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const JalaliCalendar: React.FC<JalaliCalendarProps> = ({ selectedDate, onSelectDate, onClose }) => {
  const today = jalaali.toJalaali(new Date());
  
  const getInitialView = () => {
    if (selectedDate) {
        const parts = selectedDate.split('-').map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
            return { year: parts[0], month: parts[1] };
        }
    }
    return { year: today.jy, month: today.jm };
  };

  const [viewYear, setViewYear] = useState(getInitialView().year);
  const [viewMonth, setViewMonth] = useState(getInitialView().month);
  
  // If selectedDate prop changes, update the view
  useEffect(() => {
      const { year, month } = getInitialView();
      setViewYear(year);
      setViewMonth(month);
  }, [selectedDate]);


  const changeMonth = (amount: number) => {
    let newMonth = viewMonth + amount;
    let newYear = viewYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setViewMonth(newMonth);
    setViewYear(newYear);
  };

  const calendarGrid = useMemo(() => {
    if(!jalaali.isValidJalaaliDate(viewYear, viewMonth, 1)) return [];

    const monthLength = jalaali.jalaaliMonthLength(viewYear, viewMonth);
    const firstDayGregorian = jalaali.toGregorian(viewYear, viewMonth, 1);
    const firstDayWeekday = (new Date(firstDayGregorian.gy, firstDayGregorian.gm - 1, firstDayGregorian.gd).getDay() + 1) % 7;

    const days = [];
    
    for (let i = 0; i < firstDayWeekday; i++) {
      days.push(null);
    }

    for (let i = 1; i <= monthLength; i++) {
      days.push(i);
    }
    return days;
  }, [viewYear, viewMonth]);
  
  const [selectedY, selectedM, selectedD] = selectedDate ? selectedDate.split('-').map(Number) : [0, 0, 0];

  return (
    <div className="relative p-2 bg-white border rounded-lg shadow-lg w-72" dir="rtl">
       <button
          type="button"
          onClick={onClose}
          className="absolute top-1 left-1 z-10 p-1 text-gray-400 hover:text-gray-600 bg-white rounded-full"
          aria-label="بستن تقویم"
      >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>

      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </button>
        <div className="font-semibold text-gray-800">{PERSIAN_MONTHS[viewMonth - 1]} {toPersianDigits(viewYear)}</div>
        <button type="button" onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
        {PERSIAN_WEEKDAYS_SHORT.map(day => <div key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {calendarGrid.map((day, index) => {
          if (!day) return <div key={`empty-${index}`}></div>;
          
          const isSelected = selectedY === viewYear && selectedM === viewMonth && selectedD === day;
          const isToday = today.jy === viewYear && today.jm === viewMonth && today.jd === day;
          
          const dayString = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          return (
            <button
              type="button"
              key={day}
              onClick={() => onSelectDate(dayString)}
              className={`
                w-9 h-9 flex items-center justify-center rounded-full transition-colors
                ${isSelected ? 'bg-blue-500 text-white font-bold' : ''}
                ${!isSelected && isToday ? 'border border-blue-500 text-blue-600' : ''}
                ${!isSelected ? 'text-gray-700 hover:bg-blue-100' : ''}
              `}
            >
              {toPersianDigits(day)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default JalaliCalendar;