// services/db.ts
import { Member, AttendanceRecord } from '../types';
import { apiClient } from './supabase'; // Changed from supabase client to apiClient

// Member Functions
export const getMembers = async (): Promise<Member[]> => {
  const { data } = await apiClient.get('/members', {
      params: {
          select: '*,insurance_start_date,insurance_end_date',
          order: 'created_at.asc'
      }
  });
  return data.map((m: any) => ({
      id: m.id,
      firstName: m.first_name,
      lastName: m.last_name,
      nationalId: m.national_id,
      mobile: m.mobile,
      belt: m.belt,
      created_at: m.created_at,
      insuranceStartDate: m.insurance_start_date,
      insuranceEndDate: m.insurance_end_date,
  })) as Member[];
};

export const addMember = async (memberData: Omit<Member, 'id'>): Promise<Member> => {
    const payload = {
        first_name: memberData.firstName,
        last_name: memberData.lastName,
        national_id: memberData.nationalId,
        mobile: memberData.mobile,
        belt: memberData.belt,
        insurance_start_date: memberData.insuranceStartDate || null,
        insurance_end_date: memberData.insuranceEndDate || null,
    };
    const { data } = await apiClient.post('/members', payload, {
        headers: {
            'Prefer': 'return=representation'
        }
    });
    const newMember = data[0];
    return { 
        ...newMember, 
        firstName: newMember.first_name, 
        lastName: newMember.last_name, 
        nationalId: newMember.national_id, 
        mobile: newMember.mobile,
        insuranceStartDate: newMember.insurance_start_date,
        insuranceEndDate: newMember.insurance_end_date,
    } as Member;
};

export const updateMember = async (updatedMember: Member): Promise<Member> => {
    const { id, ...memberData } = updatedMember;
     const payload = {
        first_name: memberData.firstName,
        last_name: memberData.lastName,
        national_id: memberData.nationalId,
        mobile: memberData.mobile,
        belt: memberData.belt,
        insurance_start_date: memberData.insuranceStartDate || null,
        insurance_end_date: memberData.insuranceEndDate || null,
    };
    const { data } = await apiClient.patch(`/members?id=eq.${id}`, payload, {
        headers: {
            'Prefer': 'return=representation'
        }
    });
    const returnedMember = data[0];
    return { 
        ...returnedMember, 
        firstName: returnedMember.first_name, 
        lastName: returnedMember.last_name, 
        nationalId: returnedMember.national_id, 
        mobile: returnedMember.mobile,
        insuranceStartDate: returnedMember.insurance_start_date,
        insuranceEndDate: returnedMember.insurance_end_date,
    } as Member;
};

const deleteAttendanceForMember = async (memberId: string): Promise<void> => {
    await apiClient.delete(`/attendance?member_id=eq.${memberId}`);
};

export const deleteMember = async (memberId: string): Promise<void> => {
    // First, delete related attendance records to prevent foreign key constraint errors.
    await deleteAttendanceForMember(memberId);
    // Then, delete the member itself.
    await apiClient.delete(`/members?id=eq.${memberId}`);
};

// Attendance Functions
export const getAttendanceForDates = async (dates: string[]): Promise<AttendanceRecord[]> => {
    const { data } = await apiClient.get('/attendance', {
        params: {
            select: '*',
            date: `in.(${dates.join(',')})`
        }
    });
    return data;
};

export const upsertAttendance = async (records: Pick<AttendanceRecord, 'member_id' | 'date' | 'present'>[]): Promise<void> => {
    await apiClient.post('/attendance', records, {
        headers: {
            'Prefer': 'resolution=merge-duplicates'
        }
    });
};

/**
 * Deletes a single attendance record for a specific member on a specific date.
 * @param memberId The member's ID.
 * @param date The Gregorian date string (YYYY-MM-DD).
 */
export const deleteSingleAttendance = async (memberId: string, date: string): Promise<void> => {
    await apiClient.delete(`/attendance?member_id=eq.${memberId}&date=eq.${date}`);
};

/**
 * Fetches all attendance records for a specific member within a given date range.
 * @param memberId The ID of the member.
 * @param startDate The start date of the range (YYYY-MM-DD Gregorian).
 * @param endDate The end date of the range (YYYY-MM-DD Gregorian).
 * @returns A promise that resolves to an array of attendance records.
 */
export const getAttendanceForMemberInRange = async (memberId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> => {
    const { data } = await apiClient.get('/attendance', {
        params: {
            select: '*',
            member_id: `eq.${memberId}`,
            date: `gte.${startDate},lte.${endDate}`,
            order: 'date.asc'
        }
    });
    return data;
};

/**
 * Fetches all attendance records for a specific member.
 * @param memberId The ID of the member.
 * @returns A promise that resolves to an array of all attendance records for that member.
 */
export const getAllAttendanceForMember = async (memberId: string): Promise<AttendanceRecord[]> => {
    const { data } = await apiClient.get('/attendance', {
        params: {
            select: '*',
            member_id: `eq.${memberId}`,
            order: 'date.asc'
        }
    });
    return data;
};