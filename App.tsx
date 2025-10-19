import React, { useState, useEffect, useCallback } from 'react';
import { Member, AttendanceRecord, UserProfile } from './types';
import * as db from './services/db';
import * as auth from './services/auth';
import AttendanceSheet from './components/AttendanceSheet';
import MemberList from './components/MemberList';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import Spinner from './components/DataManagement';

type Tab = 'attendance' | 'members' | 'users';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('attendance');

  // Check for existing session on initial load
  useEffect(() => {
    const user = auth.getCurrentUser();
    setCurrentUser(user);
    setLoading(false);
  }, []);

  // Fetch data when user logs in
  useEffect(() => {
    if (currentUser) {
      fetchMembers();
    }
  }, [currentUser]);
  
  const fetchMembers = async () => {
    try {
      const fetchedMembers = await db.getMembers();
      setMembers(fetchedMembers);
    } catch (error) {
      console.error("Failed to fetch members", error);
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    auth.logout();
    setCurrentUser(null);
    setMembers([]);
    setActiveTab('attendance');
  };

  const handleAddMember = async (memberData: Omit<Member, 'id'>) => {
    try {
        const newMember = await db.addMember(memberData);
        setMembers(prev => [...prev, newMember].sort((a,b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime()));
    } catch(e) {
        alert("خطا در افزودن عضو جدید.");
        throw e; // Re-throw to be caught by the form
    }
  };

  const handleUpdateMember = async (updatedMember: Member) => {
    try {
        const returnedMember = await db.updateMember(updatedMember);
        setMembers(prev => prev.map(m => m.id === returnedMember.id ? returnedMember : m));
    } catch(e) {
        alert("خطا در ویرایش عضو.");
        throw e; // Re-throw to be caught by the form
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
        await db.deleteMember(memberId);
        setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch(e: any) {
        console.error("Failed to delete member:", e);
        alert(`خطا در حذف عضو: ${e.message}`);
        throw e; // Re-throw to allow modal to handle loading state
    }
  };
  
  const handleUsersChange = useCallback(() => {
    // If the current user was edited, refresh their data in the session
    const updatedUser = auth.getCurrentUser();
    if (currentUser && updatedUser && currentUser.id === updatedUser.id) {
       setCurrentUser(updatedUser);
    }
  }, [currentUser]);


  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }
  
  const renderContent = () => {
    switch (activeTab) {
      case 'attendance':
        return (
          <AttendanceSheet
            userRole={currentUser.role}
            members={members}
          />
        );
      case 'members':
        return (
          <MemberList
            userRole={currentUser.role}
            members={members}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
          />
        );
      case 'users':
        if (currentUser.role === 'shian') {
          return <UserManagement currentUser={currentUser} onUsersChange={handleUsersChange} />;
        }
        return null;
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-right">
              <h1 className="text-xl font-bold text-gray-800">
                خوش آمدید، {currentUser.firstName} {currentUser.lastName}
              </h1>
              <p className="text-sm text-gray-500">
                نقش شما: {currentUser.role === 'shian' ? 'شیان' : 'ارشد'}
              </p>
            </div>
            <nav className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'attendance' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                حضور و غیاب
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'members' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                مدیریت اعضا
              </button>
              {currentUser.role === 'shian' && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'users' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                  مدیریت کاربران
                </button>
              )}
               <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-100"
                >
                  خروج
                </button>
            </nav>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;