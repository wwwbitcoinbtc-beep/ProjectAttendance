import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Role } from '../types';
import * as auth from '../services/auth';
import Modal, { ConfirmModal } from './Modal';
import { toPersianDigits } from '../utils/persian-utils';
import Spinner, { ButtonSpinner } from './DataManagement';
import Pagination from './Pagination';

interface UserManagementProps {
    currentUser: UserProfile;
    onUsersChange: () => void;
}

const ITEMS_PER_PAGE = 10;
const ASSIGNABLE_ROLES: Role[] = ['senior', 'shian'];

const getRoleDisplayName = (role: Role) => {
    switch(role) {
        case 'senior': return 'ارشد';
        case 'shian': return 'شیهان';
        default: return role;
    }
};

const UserForm: React.FC<{
    user?: UserProfile | null;
    onSave: (userData: any) => Promise<void>;
    onCancel: () => void;
}> = ({ user, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        mobile: '',
        password: '',
        role: 'senior' as Role,
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isEditing = !!user;

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName,
                lastName: user.lastName,
                mobile: user.mobile,
                password: '', // Don't show existing password
                role: user.role,
            });
        } else {
            setFormData({ firstName: '', lastName: '', mobile: '', password: '', role: 'senior' as Role });
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value as Role }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isEditing && !formData.password) {
            setError('رمز عبور برای کاربر جدید الزامی است.');
            return;
        }
        if (!isEditing && !formData.mobile) {
            setError('شماره موبایل برای کاربر جدید الزامی است.');
            return;
        }

        setLoading(true);
        try {
            await onSave({ ...formData, id: user?.id });
            onCancel(); // Close modal on success
        } catch (err: any) {
            setError(err.message || 'خطایی رخ داد.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            {error && <p className="text-sm text-center text-red-600 bg-red-100 p-2 rounded">{error}</p>}
            <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">نام</label>
                <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">نام خانوادگی</label>
                <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-gray-700">شماره موبایل (برای ورود)</label>
                <input type="tel" name="mobile" id="mobile" value={formData.mobile} onChange={handleChange} disabled={isEditing} required={!isEditing} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"/>
                 {isEditing && <p className="text-xs text-gray-500 mt-1">شماره موبایل ورود کاربر، قابل ویرایش نیست.</p>}
            </div>
             <div>
                <label htmlFor="password"className="block text-sm font-medium text-gray-700">رمز عبور</label>
                <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required={!isEditing} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder={isEditing ? 'برای تغییر، رمز جدید را وارد کنید' : ''} />
            </div>
            <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">نقش</label>
                <select name="role" id="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                    {ASSIGNABLE_ROLES.map(role => (
                        <option key={role} value={role}>{getRoleDisplayName(role)}</option>
                    ))}
                </select>
            </div>
            <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">انصراف</button>
                <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 min-w-[120px] flex justify-center items-center">
                    {loading ? <ButtonSpinner /> : (user ? 'ذخیره تغییرات' : 'افزودن کاربر')}
                </button>
            </div>
        </form>
    );
};

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, onUsersChange }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const fetchedUsers = await auth.getUsers();
            setUsers(fetchedUsers);
        } catch(e) {
            console.error("Failed to fetch users", e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        if (!searchQuery) {
            return users;
        }
        return users.filter(user =>
            `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [users, searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredUsers.slice(startIndex, endIndex);
    }, [filteredUsers, currentPage]);

    const openAddModal = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const openEditModal = (user: UserProfile) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSave = async (userData: any) => {
        if (userData.id) { // Editing
            await auth.updateUserProfile(userData.id, {
                firstName: userData.firstName,
                lastName: userData.lastName,
                role: userData.role,
                password: userData.password || undefined // Pass undefined if empty
            });
        } else { // Adding
            await auth.addUser({
                firstName: userData.firstName,
                lastName: userData.lastName,
                mobile: userData.mobile,
                password: userData.password,
                role: userData.role
            });
        }
        await fetchUsers();
        onUsersChange();
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            await auth.deleteUser(userToDelete.id);
            setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));
            onUsersChange();
            setUserToDelete(null); // Close modal on success
        } catch (e: any) {
            console.error("Failed to delete user:", e);
            alert(`خطا در حذف کاربر: ${e.message}`);
        } finally {
            setIsDeleting(false);
        }
    };
    
    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6" dir="rtl">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">مدیریت کاربران</h2>
                <button
                    onClick={openAddModal}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    افزودن کاربر جدید
                </button>
            </div>
            
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="جستجوی نام کاربر..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            
            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره موبایل</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نقش</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedUsers.length === 0 ? (
                           <tr>
                                <td colSpan={4} className="text-center py-8 text-gray-500">
                                    {searchQuery ? 'هیچ کاربری با این مشخصات یافت نشد.' : 'هیچ کاربری یافت نشد.'}
                                </td>
                            </tr>
                        ) : (
                            paginatedUsers.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{toPersianDigits(user.mobile)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getRoleDisplayName(user.role)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2 space-x-reverse">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                disabled={user.id === currentUser?.id}
                                                className="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                            >
                                                ویرایش
                                            </button>
                                            <button
                                                onClick={() => setUserToDelete(user)}
                                                disabled={user.id === currentUser?.id}
                                                className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                            >
                                                حذف
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingUser ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}
            >
                <UserForm
                    user={editingUser}
                    onSave={handleSave}
                    onCancel={closeModal}
                />
            </Modal>

            <ConfirmModal
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleConfirmDelete}
                isProcessing={isDeleting}
                title="تایید حذف کاربر"
                message={
                    <p>آیا از حذف کاربر <strong>{`${userToDelete?.firstName} ${userToDelete?.lastName}`}</strong> اطمینان دارید؟</p>
                }
            />
        </div>
    );
};

export default UserManagement;