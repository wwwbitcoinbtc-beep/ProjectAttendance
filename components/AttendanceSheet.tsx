import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Member, AttendanceRecord, Role } from '../types';
import { formatToShamsi, parseShamsi } from '../utils/date-formatter';
import { toPersianDigits } from '../utils/persian-utils';
import * as db from '../services/db';
import Spinner from './DataManagement';

interface AttendanceSheetProps {
  userRole: Role;
  members: Member[];
}

const getPracticeDays = (weekStartDate: Date): string[] => {
  const practiceDays: string[] = [];
  const practiceDayOffsets = [1, 3, 5]; // Sunday, Tuesday, Thursday

  for (const offset of practiceDayOffsets) {
    const currentDate = new Date(weekStartDate);
    currentDate.setDate(weekStartDate.getDate() + offset);
    // Convert to YYYY-MM-DD Gregorian for DB queries
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    practiceDays.push(`${y}-${m}-${d}`);
  }
  return practiceDays;
};

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dayOfWeek = d.getDay();
    const daysToSubtract = (dayOfWeek + 1) % 7;
    d.setDate(d.getDate() - daysToSubtract);
    return d;
};


const AttendanceSheet: React.FC<AttendanceSheetProps> = ({ userRole, members }) => {
  const [weekStartDate, setWeekStartDate] = useState(getStartOfWeek(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const practiceDaysGregorian = useMemo(() => getPracticeDays(weekStartDate), [weekStartDate]);
  const practiceDaysShamsi = useMemo(() => practiceDaysGregorian.map(d => formatToShamsi(new Date(d))), [practiceDaysGregorian]);

  const fetchAttendance = useCallback(async () => {
    if (members.length === 0) return;
    setLoading(true);
    try {
        const records = await db.getAttendanceForDates(practiceDaysGregorian);
        setAttendance(records);
    } catch (e) {
        console.error("Failed to fetch attendance", e);
    } finally {
        setLoading(false);
    }
  }, [practiceDaysGregorian, members.length]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) {
        return members;
    }
    return members.filter(member =>
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [members, searchQuery]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, boolean>(); // Key: "memberId-date"
    for (const record of attendance) {
        map.set(`${record.member_id}-${record.date}`, record.present);
    }
    return map;
  }, [attendance]);

  const handleToggle = useCallback(async (memberId: string, dateGregorian: string) => {
    const key = `${memberId}-${dateGregorian}`;
    const isPresent = attendanceMap.get(key) ?? false;

    // Optimistically update UI
    const newAttendance = [...attendance];
    const existingRecordIndex = newAttendance.findIndex(r => r.member_id === memberId && r.date === dateGregorian);
    
    if (isPresent) {
      // Is present, so mark as absent (remove record from local state)
      if (existingRecordIndex > -1) {
          newAttendance.splice(existingRecordIndex, 1);
      }
    } else {
      // Is absent, so mark as present (add record to local state)
      const newRecord = { member_id: memberId, date: dateGregorian, present: true };
       if (existingRecordIndex > -1) { // Should not happen, but for safety
          newAttendance[existingRecordIndex] = newRecord;
      } else {
          newAttendance.push(newRecord);
      }
    }
    setAttendance(newAttendance);

    // Sync with DB
    try {
      if (isPresent) {
        // Mark as absent -> DELETE the record
        await db.deleteSingleAttendance(memberId, dateGregorian);
      } else {
        // Mark as present -> UPSERT with present: true
        await db.upsertAttendance([{ member_id: memberId, date: dateGregorian, present: true }]);
      }
    } catch (e) {
      alert("خطا در ذخیره حضور و غیاب. لطفا دوباره تلاش کنید.");
      // Revert UI on failure
      fetchAttendance();
    }
  }, [attendanceMap, fetchAttendance, attendance]);
  
  const changeWeek = (amount: number) => {
      const newStartDate = new Date(weekStartDate);
      newStartDate.setDate(newStartDate.getDate() + amount * 7);
      setWeekStartDate(newStartDate);
  };
  
  const getWeeklySummary = (memberId: string) => {
    let present = 0;
    practiceDaysGregorian.forEach(date => {
        if(attendanceMap.get(`${memberId}-${date}`)) {
            present++;
        }
    });
    const absent = practiceDaysGregorian.length - present;
    return { present, absent };
  };

  if (members.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500" dir="rtl">
        <h2 className="text-xl font-semibold mb-2">لیست اعضا خالی است</h2>
        <p>برای مشاهده لیست حضور و غیاب، ابتدا از بخش "مدیریت اعضا" یک عضو اضافه کنید.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">برگه حضور و غیاب هفتگی</h2>
        <div className="flex items-center gap-2">
            <button onClick={() => changeWeek(1)} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">هفته بعد &larr;</button>
            <span className="text-lg font-semibold text-gray-700 whitespace-nowrap">
                {toPersianDigits(practiceDaysShamsi[0])} تا {toPersianDigits(practiceDaysShamsi[practiceDaysShamsi.length - 1])}
            </span>
            <button onClick={() => changeWeek(-1)} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">&rarr; هفته قبل</button>
        </div>
      </div>
      
      <div className="mb-4">
        <input
            type="text"
            placeholder="جستجوی نام عضو..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">نام عضو</th>
              {practiceDaysGregorian.map(date => (
                <th key={date} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-pre-line">
                  {toPersianDigits(new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(new Date(date)))}
                  {'\n'}
                  <span className="font-normal normal-case">{toPersianDigits(formatToShamsi(new Date(date)))}</span>
                </th>
              ))}
              {searchQuery && <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">خلاصه هفته</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
             {loading ? (
                <tr>
                    <td colSpan={practiceDaysGregorian.length + (searchQuery ? 2 : 1)} className="py-8">
                        <div className="flex justify-center">
                            <Spinner />
                        </div>
                    </td>
                </tr>
             ) : filteredMembers.length === 0 ? (
                <tr><td colSpan={practiceDaysGregorian.length + (searchQuery ? 2 : 1)} className="text-center py-8 text-gray-500">هیچ عضوی یافت نشد.</td></tr>
            ) : (
              filteredMembers.map(member => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky right-0 bg-white hover:bg-gray-50 z-10">{`${member.firstName} ${member.lastName}`}</td>
                  {practiceDaysGregorian.map(date => {
                    const isPresent = attendanceMap.get(`${member.id}-${date}`) ?? false;
                    return (
                      <td key={`${member.id}-${date}`} className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleToggle(member.id, date)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-colors cursor-pointer hover:opacity-80
                            ${isPresent ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
                          `}
                        >
                          {isPresent ? '✓' : '✗'}
                        </button>
                      </td>
                    );
                  })}
                  {searchQuery && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex flex-col">
                            <span className="text-green-600 font-semibold">{toPersianDigits(getWeeklySummary(member.id).present)} حضور</span>
                            <span className="text-red-600 font-semibold">{toPersianDigits(getWeeklySummary(member.id).absent)} غیبت</span>
                        </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceSheet;