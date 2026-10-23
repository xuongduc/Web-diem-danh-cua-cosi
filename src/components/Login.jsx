import React from 'react';
import { auth, googleProvider, db } from '../config/firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function Login() {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Kiểm tra xem user đã có trong DB chưa
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Lấy admin email từ biến môi trường, bảo mật tuyệt đối
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
        const role = user.email === adminEmail ? 'admin' : 'student';
        
        await setDoc(userRef, {
          email: user.email,
          name: user.displayName,
          role: role,
          totalSessions: 0,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      alert("Đăng nhập thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md text-center max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Hệ thống Điểm danh</h2>
        <button 
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded hover:bg-blue-700 transition flex items-center justify-center gap-2"
        >
          Đăng nhập bằng Google
        </button>
      </div>
    </div>
  );
}
