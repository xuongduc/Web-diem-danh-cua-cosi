import React, { useState, useEffect } from 'react';
import { db, auth } from '../config/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('attendance');
  const [userData, setUserData] = useState(null);
  const [history, setHistory] = useState([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchHistory();
  }, [user.uid]);

  const fetchUserData = async () => {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) setUserData(docSnap.data());
  };

  const fetchHistory = async () => {
    const q = query(
      collection(db, 'attendance'), 
      where('uid', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    setHistory(snapshot.docs.map(d => d.data()));
  };

  const handleCheckIn = async () => {
    if (isCheckingIn) return;
    setIsCheckingIn(true);
    try {
      const now = new Date();
      const monthYear = `${now.getMonth() + 1}/${now.getFullYear()}`;
      
      // Lưu log điểm danh
      await addDoc(collection(db, 'attendance'), {
        uid: user.uid,
        timestamp: now.toISOString(),
        monthYear: monthYear
      });

      // Tăng tổng số buổi
      const newTotal = (userData?.totalSessions || 0) + 1;
      await updateDoc(doc(db, 'users', user.uid), { totalSessions: newTotal });
      
      alert("Điểm danh thành công!");
      fetchUserData();
      fetchHistory();
    } catch (error) {
      alert("Có lỗi xảy ra, vui lòng thử lại.");
    }
    setIsCheckingIn(false);
  };

  // Nhom lịch sử theo tháng
  const groupedHistory = history.reduce((acc, record) => {
    if (!acc[record.monthYear]) acc[record.monthYear] = [];
    acc[record.monthYear].push(record);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 p-6 text-white flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">{userData?.name || 'Học viên'}</h2>
            <p className="text-blue-100 text-sm">{userData?.email}</p>
          </div>
          <button onClick={() => signOut(auth)} className="text-sm bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded">
            Thoát
          </button>
        </div>

        <div className="flex border-b">
          <button 
            className={`flex-1 py-3 text-center font-medium ${activeTab === 'attendance' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('attendance')}
          >
            Điểm danh
          </button>
          <button 
            className={`flex-1 py-3 text-center font-medium ${activeTab === 'stats' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('stats')}
          >
            Thống kê
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'attendance' ? (
            <div className="text-center">
              <div className="mb-8">
                <p className="text-gray-500 mb-1">Tổng số buổi đã học</p>
                <p className="text-5xl font-black text-blue-600">{userData?.totalSessions || 0}</p>
              </div>
              <button 
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className="w-40 h-40 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl shadow-lg hover:shadow-xl transition flex items-center justify-center mx-auto disabled:opacity-50"
              >
                {isCheckingIn ? 'Đang xử lý...' : 'ĐIỂM DANH'}
              </button>
            </div>
          ) : (
            <div>
              {Object.keys(groupedHistory).length === 0 ? (
                <p className="text-center text-gray-500">Chưa có dữ liệu điểm danh.</p>
              ) : (
                Object.keys(groupedHistory).map(month => (
                  <div key={month} className="mb-6">
                    <h3 className="font-bold text-gray-700 border-b pb-2 mb-3">Tháng {month}</h3>
                    <ul className="space-y-2">
                      {groupedHistory[month].map((record, idx) => (
                        <li key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                          <span className="text-gray-600">
                            {new Date(record.timestamp).toLocaleDateString('vi-VN')}
                          </span>
                          <span className="font-mono text-gray-500">
                            {new Date(record.timestamp).toLocaleTimeString('vi-VN')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
