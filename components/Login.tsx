import React, { useState } from 'react';
import * as auth from '../services/auth';
import { UserProfile } from '../types';
import { ButtonSpinner } from './DataManagement';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!mobile || !password) {
      setError('لطفا شماره موبایل و رمز عبور را وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const user = await auth.login(mobile, password);
      onLoginSuccess(user);
    } catch (err: any) {
      // Handle the specific permission error with a user-friendly message
      if (err.message && err.message.toLowerCase().includes('permission denied')) {
        setError('اتصال به سرویس برقرار نشد. لطفاً با پشتیبانی تماس بگیرید.');
      } else {
        // Show other errors as they are (e.g., "Invalid credentials")
        setError(err.message || 'شماره موبایل یا رمز عبور نامعتبر است.');
      }
      console.error(err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100" dir="rtl">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800">ورود به سیستم</h2>
        
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 text-center">
              شماره موبایل
            </label>
            <input
              id="mobile"
              name="mobile"
              type="tel"
              autoComplete="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center"
              placeholder="09123456789"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password"className="block text-sm font-medium text-gray-700 text-center">
              رمز عبور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          
          {error && <p className="text-sm text-center text-red-600">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {loading ? <ButtonSpinner /> : 'ورود'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;