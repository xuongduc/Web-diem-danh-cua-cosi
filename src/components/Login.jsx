
import React, { useState } from 'react';

import {
  auth,
  googleProvider,
  db
} from '../config/firebase';

import {
  signInWithPopup,
  signOut
} from 'firebase/auth';

import {
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

export default function Login() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;

    setLoading(true);

    try {
      // Đăng nhập Google
      const result = await signInWithPopup(
        auth,
        googleProvider
      );

      const user = result.user;

      if (!user.email) {
        throw new Error('Tài khoản Google không có email.');
      }

      // Kiểm tra hồ sơ Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      // Chỉ tạo hồ sơ nếu chưa tồn tại
      if (!userSnap.exists()) {
        const isAdmin =
          !!ADMIN_EMAIL &&
          user.email.toLowerCase() ===
            ADMIN_EMAIL.toLowerCase() &&
          user.emailVerified === true;

        await setDoc(userRef, {
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          role: isAdmin ? 'admin' : 'student',
          totalSessions: 0
        });

        console.log('Đã tạo hồ sơ:', user.uid);
      } else {
        console.log('Hồ sơ đã tồn tại:', user.uid);
      }

    } catch (error) {
      console.error('Lỗi đăng nhập:', error);

      let message = 'Đăng nhập thất bại. Vui lòng thử lại.';

      if (error.code === 'permission-denied') {
        message =
          'Không có quyền truy cập Firestore. ' +
          'Vui lòng kiểm tra Security Rules.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = 'Bạn đã đóng cửa sổ đăng nhập.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message =
          'Domain chưa được cho phép trong Firebase Authentication.';
      }

      alert(message);

      // Tránh giữ trạng thái đăng nhập chưa hoàn chỉnh.
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error('Lỗi đăng xuất:', signOutError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="p-8 bg-white rounded-xl shadow-md text-center max-w-sm w-full">

        <h2 className="text-2xl font-bold mb-3 text-gray-800">
          Hệ thống Điểm danh
        </h2>

        <p className="text-gray-500 text-sm mb-6">
          Đăng nhập bằng Google để tiếp tục
        </p>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? 'Đang đăng nhập...'
            : 'Đăng nhập bằng Google'}
        </button>

      </div>
    </div>
  );
}
