import React from 'react';
import { toPersianDigits } from '../utils/persian-utils';
import { parseShamsi } from '../utils/date-formatter';

interface JalaliDatePickerProps {
  date: string;
  setPrevDay: () => void;
  setNextDay: () => void;
  setToday: () => void;
}

const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  date,
  setPrevDay,
  setNextDay,
  setToday,
}) => {
  const gregDate = parseShamsi(date);
  
  if (!gregDate) {
      return (
          <div className="text-center text-red-500 p-4">
              تاریخ نامعتبر است.
          </div>
      )
  }

  const formattedDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(gregDate);

  return (
    <div className="flex items-center justify-center space-x-4 my-4 p-2 rounded-lg bg-gray-100 shadow-sm" dir="rtl">
      <button onClick={setNextDay} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
        روز بعد
      </button>
      <div className="flex flex-col items-center min-w-[250px]">
        <span className="text-lg font-semibold text-gray-800">{toPersianDigits(formattedDate)}</span>
        <button onClick={setToday} className="text-sm text-blue-600 hover:underline">
          برو به امروز
        </button>
      </div>
      <button onClick={setPrevDay} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
        روز قبل
      </button>
    </div>
  );
};

export default JalaliDatePicker;
