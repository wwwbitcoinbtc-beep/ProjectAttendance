// services/auth.ts
import { UserProfile, Role } from '../types';
import { apiClient } from './supabase';

const SESSION_KEY = 'app_user_session';

/**
 * Logs in a user by calling a secure RPC function that checks credentials against the public.users table.
 * @param mobile - The user's mobile number.
 * @param password - The user's plaintext password.
 * @returns The user profile if login is successful.
 */
export const login = async (mobile: string, password: string): Promise<UserProfile> => {
    const { data } = await apiClient.post('/rpc/login', {
        mobile_arg: mobile,
        password_arg: password
    });

    if (!data || data.length === 0) {
        throw new Error("شماره موبایل یا رمز عبور نامعتبر است.");
    }
    
    // The RPC function is aliased to return camelCase fields directly
    const user = data[0] as UserProfile;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    
    return user;
};

/**
 * Logs out the current user by clearing the session storage.
 */
export const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
};

/**
 * Gets the current logged-in user from session storage.
 * @returns The user profile or null if not logged in.
 */
export const getCurrentUser = (): UserProfile | null => {
    const userJson = sessionStorage.getItem(SESSION_KEY);
    if (!userJson) return null;
    try {
        return JSON.parse(userJson) as UserProfile;
    } catch (e) {
        console.error("Failed to parse user session", e);
        return null;
    }
};

/**
 * Fetches all users from the database using axios.
 * @returns A list of all user profiles.
 */
export const getUsers = async (): Promise<UserProfile[]> => {
    const { data } = await apiClient.get('/users', {
        params: {
            select: 'id,first_name,last_name,role,mobile,created_at',
            order: 'created_at.asc'
        }
    });
    return data.map((u: any) => ({ ...u, firstName: u.first_name, lastName: u.last_name })) as UserProfile[];
};

/**
 * Adds a new user via a secure RPC function that hashes the password.
 * @param userData - The new user's data.
 * @returns The newly created user profile.
 */
export const addUser = async (userData: Omit<UserProfile, 'id'> & { password: string }): Promise<UserProfile> => {
    try {
        const { data } = await apiClient.post('/rpc/add_user', {
            first_name_arg: userData.firstName,
            last_name_arg: userData.lastName,
            mobile_arg: userData.mobile,
            password_arg: userData.password,
            role_arg: userData.role
        });

        if (!data || data.length === 0) {
            throw new Error("خطا: کاربر جدید ایجاد نشد.");
        }
        
        const newUser = data[0];
        // Manually map snake_case to camelCase
        return { ...newUser, firstName: newUser.first_name, lastName: newUser.last_name } as UserProfile;

    } catch (error: any) {
        // Handle specific, expected business logic errors
        if (error.message && error.message.includes('duplicate key value violates unique constraint "users_mobile_key"')) {
            throw new Error('این شماره موبایل قبلا ثبت شده است.');
        }
        // Re-throw other errors (like network errors, which will be formatted by the interceptor)
        throw error;
    }
};

/**
 * Updates a user's profile and optionally their password via a secure RPC function.
 * @param userId - The ID of the user to update.
 * @param userData - The data to update.
 * @returns The updated user profile.
 */
export const updateUserProfile = async (userId: string, userData: Partial<UserProfile> & { password?: string }): Promise<UserProfile> => {
     const { data } = await apiClient.post('/rpc/update_user_profile', {
        user_id_arg: userId,
        first_name_arg: userData.firstName,
        last_name_arg: userData.lastName,
        role_arg: userData.role,
        password_arg: userData.password || null // Pass null if password is not being changed
     });

     if (!data || data.length === 0) {
        throw new Error("خطا: کاربر ویرایش نشد.");
    }

    const updatedUser = data[0];
    return { ...updatedUser, firstName: updatedUser.first_name, lastName: updatedUser.last_name } as UserProfile;
};

/**
 * Deletes a user directly from the public.users table.
 * @param userId - The ID of the user to delete.
 */
export const deleteUser = async (userId: string) => {
    // This is now a simple DELETE request, as we are not interacting with auth.users
    await apiClient.delete(`/users?id=eq.${userId}`);
};
