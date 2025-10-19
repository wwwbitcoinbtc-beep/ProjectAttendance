// hooks/useShamsiDate.ts
import { useState, useCallback } from 'react';
import { getTodayShamsi, parseShamsi, formatToShamsi } from '../utils/date-formatter';

export const useShamsiDate = (initialDate?: string) => {
  const [date, setDate] = useState<string>(initialDate || getTodayShamsi());

  const setToday = useCallback(() => {
    setDate(getTodayShamsi());
  }, []);

  const changeDay = useCallback((amount: number) => {
    const gregDate = parseShamsi(date);
    if (gregDate) {
      gregDate.setDate(gregDate.getDate() + amount);
      setDate(formatToShamsi(gregDate));
    }
  }, [date]);

  const setPrevDay = useCallback(() => changeDay(-1), [changeDay]);
  const setNextDay = useCallback(() => changeDay(1), [changeDay]);

  return { date, setDate, setToday, setPrevDay, setNextDay };
};
