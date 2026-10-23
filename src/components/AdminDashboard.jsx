import React, { useState, useEffect } from 'react';
import { db, auth } from '../config/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function AdminDashboard() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const snapshot = await getDocs(q);
    const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setStudents(studentData);
  };

  const updateSessions = async (studentId, currentSessions, change) => {
    const newSessions = currentSessions + change;
    if (newSessions < 0) return; // Không cho phép số âm
    
    await updateDoc(doc(db, 'users', studentId), {
      totalSessions: newSessions
    });
    fetchStudents(); // Cập nhật lại UI
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Học viên (Admin)</h1>
          <button onClick={() => signOut(auth)} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-md font-medium transition">
            Đăng xuất
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-3 border-b">Tên / Email</th>
                <th className="p-3 border-b text-center">Tổng số buổi</th>
                <th className="p-3 border-b text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <p className="font-semibold text-gray-800">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.email}</p>
                  </td>
                  <td className="p-3 text-center text-xl font-bold text-blue-600">
                    {student.totalSessions || 0}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => updateSessions(student.id, student.totalSessions || 0, -1)}
                        className="bg-red-100 text-red-700 w-8 h-8 rounded-full font-bold hover:bg-red-200"
                        disabled={(student.totalSessions || 0) <= 0}
                      >-</button>
                      <button 
                        onClick={() => updateSessions(student.id, student.totalSessions || 0, 1)}
                        className="bg-green-100 text-green-700 w-8 h-8 rounded-full font-bold hover:bg-green-200"
                      >+</button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan="3" className="text-center p-6 text-gray-500">Chưa có học viên nào trong hệ thống.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
