import React, { useState, useEffect, useMemo } from 'react';
import { Member, BeltColor, Role } from '../types';
import Modal, { ConfirmModal } from './Modal';
import { toPersianDigits } from '../utils/persian-utils';
import { ButtonSpinner } from './DataManagement';
import Pagination from './Pagination';
import { parseShamsi, formatToShamsi } from '../utils/date-formatter';
import DatePickerInput from './DatePickerInput';

interface MemberListProps {
  userRole: Role;
  members: Member[];
  onAddMember: (memberData: Omit<Member, 'id'>) => Promise<void>;
  onUpdateMember: (updatedMember: Member) => Promise<void>;
  onDeleteMember: (memberId: string) => Promise<void>;
}

const ITEMS_PER_PAGE = 20;

const BELT_COLORS_ORDERED: BeltColor[] = ['سفید', 'زرد', 'نارنجی', 'سبز', 'آبی', 'قهوه ای', 'مشکی'];

const BELT_COLOR_MAP: Record<BeltColor, string> = {
  'سفید': '#FFFFFF',
  'زرد': '#FBBF24',
  'نارنجی': '#F97316',
  'سبز': '#22C55E',
  'آبی': '#3B82F6',
  'قهوه ای': '#A16207',
  'مشکی': '#111827',
};

const getInsuranceStatus = (member: Member): { text: string; colorClass: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date

    if (member.insuranceStartDate && member.insuranceEndDate) {
        const startDate = new Date(member.insuranceStartDate);
        const endDate = new Date(member.insuranceEndDate);
        if (today >= startDate && today <= endDate) {
            return { text: 'دارد', colorClass: 'bg-green-100 text-green-800' };
        }
    }
    
    // In all other cases (expired or not set)
    return { text: 'ندارد', colorClass: 'bg-red-100 text-red-800' };
};

const MemberForm: React.FC<{
    member?: Member | null;
    onSave: (memberData: Omit<Member, 'id'> | Member) => Promise<void>;
    onCancel: () => void;
}> = ({ member, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        nationalId: '',
        mobile: '',
        belt: 'سفید' as BeltColor,
        insuranceStartDate: '', // Shamsi date string
        insuranceEndDate: '', // Shamsi date string
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (member) {
            setFormData({
                firstName: member.firstName,
                lastName: member.lastName,
                nationalId: member.nationalId || '',
                mobile: member.mobile || '',
                belt: member.belt,
                insuranceStartDate: member.insuranceStartDate ? formatToShamsi(new Date(member.insuranceStartDate)) : '',
                insuranceEndDate: member.insuranceEndDate ? formatToShamsi(new Date(member.insuranceEndDate)) : '',
            });
        } else {
            // Reset for new member
            setFormData({
                firstName: '',
                lastName: '',
                nationalId: '',
                mobile: '',
                belt: 'سفید' as BeltColor,
                insuranceStartDate: '',
                insuranceEndDate: '',
            });
        }
    }, [member]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Convert Shamsi dates to Gregorian for DB
            const startDateGregorian = formData.insuranceStartDate ? parseShamsi(formData.insuranceStartDate)?.toISOString().split('T')[0] : undefined;
            const endDateGregorian = formData.insuranceEndDate ? parseShamsi(formData.insuranceEndDate)?.toISOString().split('T')[0] : undefined;

            const payload = { 
                ...formData,
                insuranceStartDate: startDateGregorian,
                insuranceEndDate: endDateGregorian
            };

            if (member) {
                await onSave({ ...member, ...payload });
            } else {
                await onSave(payload);
            }
            onCancel(); // Close modal on success
        } catch (error) {
            // Error is handled/alerted in App.tsx.
            console.error("Failed to save member:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">نام</label>
                    <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">نام خانوادگی</label>
                    <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                 <div>
                    <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700">کد ملی</label>
                    <input type="text" name="nationalId" id="nationalId" value={formData.nationalId} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <div>
                    <label htmlFor="mobile" className="block text-sm font-medium text-gray-700">شماره موبایل</label>
                    <input type="tel" name="mobile" id="mobile" value={formData.mobile} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                 <div>
                    <label htmlFor="belt" className="block text-sm font-medium text-gray-700">کمربند</label>
                    <select name="belt" id="belt" value={formData.belt} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                        {BELT_COLORS_ORDERED.map(color => (
                            <option key={color} value={color}>{color}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="border-t pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="insuranceStartDate" className="block text-sm font-medium text-gray-700">تاریخ شروع بیمه (شمسی)</label>
                    <DatePickerInput
                        value={formData.insuranceStartDate}
                        onChange={(date) => setFormData(prev => ({...prev, insuranceStartDate: date}))}
                        placeholder="تاریخ را انتخاب کنید"
                    />
                </div>
                <div>
                    <label htmlFor="insuranceEndDate" className="block text-sm font-medium text-gray-700">تاریخ پایان بیمه (شمسی)</label>
                    <DatePickerInput
                        value={formData.insuranceEndDate}
                        onChange={(date) => setFormData(prev => ({...prev, insuranceEndDate: date}))}
                        placeholder="تاریخ را انتخاب کنید"
                    />
                </div>
            </div>
            <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">انصراف</button>
                <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 min-w-[120px] flex justify-center items-center">
                    {loading ? <ButtonSpinner /> : (member ? 'ذخیره تغییرات' : 'افزودن عضو')}
                </button>
            </div>
        </form>
    );
};

const MemberList: React.FC<MemberListProps> = ({
  userRole,
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) {
      return members;
    }
    return members.filter(member =>
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [members, searchQuery]);

  // Reset page to 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);

  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredMembers.slice(startIndex, endIndex);
  }, [filteredMembers, currentPage]);


  const openAddModal = () => {
    setEditingMember(null);
    setIsModalOpen(true);
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMember(null);
  };

  const handleSave = (memberData: Omit<Member, 'id'> | Member): Promise<void> => {
    if ('id' in memberData) {
      return onUpdateMember(memberData);
    } else {
      return onAddMember(memberData);
    }
  };

  const handleConfirmDelete = async () => {
    if (memberToDelete) {
      setIsDeleting(true);
      try {
        await onDeleteMember(memberToDelete.id);
        setMemberToDelete(null); // Close modal on success
      } catch (error) {
        // Error is alerted in the parent component
        console.error("Delete failed, handled in parent.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">مدیریت اعضا</h2>
        <button
            onClick={openAddModal}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
            افزودن عضو جدید
        </button>
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
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام خانوادگی</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کمربند</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">وضعیت بیمه</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedMembers.length === 0 ? (
                <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'هیچ عضوی با این مشخصات یافت نشد.' : 'هیچ عضوی یافت نشد.'}
                    </td>
                </tr>
            ) : (
                paginatedMembers.map(member => {
                  const insuranceStatus = getInsuranceStatus(member);
                  return (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.firstName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.lastName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <span
                          className="w-4 h-4 rounded-full ml-2 border border-gray-300"
                          style={{ backgroundColor: BELT_COLOR_MAP[member.belt] }}
                          aria-label={`رنگ کمربند: ${member.belt}`}
                        ></span>
                        {member.belt}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${insuranceStatus.colorClass}`}>
                          {insuranceStatus.text}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2 space-x-reverse">
                            <button
                                onClick={() => openEditModal(member)}
                                className="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors"
                            >
                                ویرایش
                            </button>
                            <button
                                onClick={() => setMemberToDelete(member)}
                                className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
                            >
                                حذف
                            </button>
                        </div>
                    </td>
                  </tr>
                  );
                })
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
        title={editingMember ? 'ویرایش عضو' : 'افزودن عضو جدید'}
      >
        <MemberForm
          member={editingMember}
          onSave={handleSave}
          onCancel={closeModal}
        />
      </Modal>
      
      <ConfirmModal
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleConfirmDelete}
        isProcessing={isDeleting}
        title="تایید حذف عضو"
        message={
            <p>
                آیا از حذف عضو <strong>{`${memberToDelete?.firstName} ${memberToDelete?.lastName}`}</strong> اطمینان دارید؟
                <br />
                <span className="text-sm text-gray-600 mt-2 block">تمام رکوردهای حضور و غیاب او نیز حذف خواهد شد.</span>
            </p>
        }
      />
    </div>
  );
};

export default MemberList;