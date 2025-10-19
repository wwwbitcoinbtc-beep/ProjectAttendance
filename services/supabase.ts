// services/supabase.ts
import axios from 'axios';

// Make TypeScript aware of the global axios object from the CDN
declare global {
    interface Window {
        axios: typeof axios;
    }
}

const supabaseUrl = 'https://yeagteblhgyvhusejtxl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllYWd0ZWJsaGd5dmh1c2VqdHhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNjQyNjYsImV4cCI6MjA3Mzk0MDI2Nn0.pIb7pDUSssOFDsAf-XjkrNKocep1Jz3a0f9c4hFR3_Y';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided.");
}

// Create a configured axios instance
export const apiClient = window.axios.create({
  baseURL: `${supabaseUrl}/rest/v1`,
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  },
});

// Add a response interceptor to handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Axios API Error:', {
        message: error.message,
        url: error.config.url,
        response: error.response?.data,
    });
    
    // Create a more user-friendly error message from Supabase's response
    const errorMessage = error.response?.data?.message || 'خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.';
    
    // Throw a new error with the cleaner message to be caught by the calling function
    return Promise.reject(new Error(errorMessage));
  }
);