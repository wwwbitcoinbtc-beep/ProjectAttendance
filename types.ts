// types.ts

export type BeltColor = 'سفید' | 'نارنجی' | 'آبی' | 'زرد' | 'سبز' | 'قهوه ای' | 'مشکی';

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  mobile: string;
  belt: BeltColor;
  created_at?: string; // Supabase adds this
}

export interface AttendanceRecord {
  member_id: string; // Snake case for Supabase consistency
  present: boolean;
  date: string; // YYYY-MM-DD format (Gregorian for DB)
  id?: string;
  created_at?: string;
}

export type Role = 'senior' | 'shian';

// This represents our custom user profile data stored in the public.users table
export interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    mobile: string;
    role: Role;
    created_at?: string;
}
