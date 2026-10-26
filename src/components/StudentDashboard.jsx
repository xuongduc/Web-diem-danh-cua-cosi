
import React, {
  useState,
  useEffect,
  useCallback
} from 'react';

import { db, auth } from '../config/firebase';

import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';

import { signOut } from 'firebase/auth';

// Hỗ trợ cả timestamp cũ và mới
function toDate(value) {
  if (value && typeof value.toDate === 'function') {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    return new Date(value);
  }

  return new Date(NaN);
}

export default function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('attendance');

  const [userData, setUserData] = useState(null);
  const [history, setHistory] = useState([]);

  const [lessonContent, setLessonContent] = useState('');

  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState('');

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth() + 1
  );

  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );

  // Lấy hồ sơ học viên
  const fetchUserData = useCallback(async () => {
    const snapshot = await getDoc(
      doc(db, 'users', user.uid)
    );

    if (snapshot.exists()) {
      setUserData(snapshot.data());
    }
  }, [user.uid]);

  // Lấy lịch sử của chính học viên
  const fetchHistory = useCallback(async () => {
    const q = query(
      collection(db, 'attendance'),
      where('uid', '==', user.uid)
    );

    const snapshot = await getDocs(q);

    const records = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    records.sort(
      (a, b) =>
        toDate(b.timestamp).getTime() -
        toDate(a.timestamp).getTime()
    );

    setHistory(records);
  }, [user.uid]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        await Promise.all([
          fetchUserData(),
          fetchHistory()
        ]);
      } catch (err) {
        console.error(err);

        if (active) {
          setError('Không thể tải dữ liệu học viên.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [fetchUserData, fetchHistory]);

  // Điểm danh - thời gian do Firebase ghi nhận
  const handleCheckIn = async () => {
    if (checkingIn) return;

    const content = lessonContent.trim();

    if (!content || content.length > 2000) {
      alert('Vui lòng nhập nội dung từ 1 đến 2000 ký tự.');
      return;
    }

    setCheckingIn(true);

    let saved = false;

    try {
      await addDoc(collection(db, 'attendance'), {
        uid: user.uid,
        timestamp: serverTimestamp(),
        lessonContent: content
      });

      saved = true;
      setLessonContent('');

      // Sau khi ghi, tải lại lịch sử từ Firestore
      await fetchHistory();

      const now = new Date();
      setSelectedMonth(now.getMonth() + 1);
      setSelectedYear(now.getFullYear());

      alert('Điểm danh thành công!');
    } catch (err) {
      console.error(err);

      if (saved) {
        alert(
          'Đã lưu điểm danh, nhưng chưa tải lại được lịch sử.'
        );
      } else {
        alert(
          'Không thể xác nhận kết quả. Hãy kiểm tra lịch sử trước khi thử lại.'
        );
      }
    } finally {
      setCheckingIn(false);
    }
  };

  // Lọc theo tháng, năm
  const filteredHistory = history.filter(record => {
    const date = toDate(record.timestamp);

    return (
      !Number.isNaN(date.getTime()) &&
      date.getMonth() + 1 === selectedMonth &&
      date.getFullYear() === selectedYear
    );
  });

  const availableYears = [
    ...new Set([
      new Date().getFullYear(),
      ...history.map(record =>
        toDate(record.timestamp).getFullYear()
      ).filter(Number.isFinite)
    ])
  ].sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        {/* HEADER */}
        <div className="bg-blue-600 p-6 text-white flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold">
              {userData?.name || 'Học viên'}
            </h2>

            <p className="text-blue-100 text-sm break-all">
              {userData?.email || user.email}
            </p>
          </div>

          <button
            onClick={() => signOut(auth)}
            className="bg-blue-700 hover:bg-blue-800 text-sm px-3 py-2 rounded-lg"
          >
            Thoát
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-3 font-medium ${
              activeTab === 'attendance'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            Điểm danh
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 font-medium ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            Lịch sử học
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6">

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
              <button
                className="underline ml-2"
                onClick={async () => {
                  setLoading(true);
                  setError('');

                  try {
                    await Promise.all([
                      fetchUserData(),
                      fetchHistory()
                    ]);
                  } catch (err) {
                    console.error(err);
                    setError('Vẫn không thể tải dữ liệu.');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Thử lại
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-center text-gray-500 py-10">
              Đang tải dữ liệu...
            </p>
          ) : activeTab === 'attendance' ? (

            /* ĐIỂM DANH */
            <div>
              <div className="text-center mb-6">
                <p className="text-gray-500 mb-1">
                 Tổng số buổi đã học                
                </p>

                <p className="text-5xl font-black text-blue-600">
                 {history.length} 
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6 text-center">
                <p className="text-sm text-gray-600">
                  Lượt điểm danh đã lưu
                </p>

                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {history.length}
                </p>
              </div>

              <div className="mb-6">
                <label className="block font-semibold text-gray-700 mb-2 text-sm">
                  Nội dung bài học hôm nay
                  <span className="text-red-500"> *</span>
                </label>

                <textarea
                  value={lessonContent}
                  onChange={e => setLessonContent(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  disabled={checkingIn}
                  placeholder="Nhập nội dung bài học..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none disabled:bg-gray-100"
                />

                <p className="text-xs text-gray-400 text-right mt-1">
                  {lessonContent.length}/2000 ký tự
                </p>
              </div>

              <div className="text-center">
                <button
                  onClick={handleCheckIn}
                  disabled={
                    checkingIn ||
                    !lessonContent.trim()
                  }
                  className="w-40 h-40 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl shadow-lg transition flex justify-center items-center mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingIn ? 'Đang lưu...' : 'ĐIỂM DANH'}
                </button>

                <p className="text-xs text-gray-400 mt-4">
                  Ngày giờ được Firebase tự động ghi nhận
                </p>
              </div>
            </div>

          ) : (

            /* LỊCH SỬ HỌC */
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-5">
                Lịch sử học tập
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="block text-sm mb-2 text-gray-600">
                    Chọn tháng
                  </label>

                  <select
                    value={selectedMonth}
                    onChange={e =>
                      setSelectedMonth(Number(e.target.value))
                    }
                    className="w-full border rounded-lg p-3 bg-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Tháng {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-600">
                    Chọn năm
                  </label>

                  <select
                    value={selectedYear}
                    onChange={e =>
                      setSelectedYear(Number(e.target.value))
                    }
                    className="w-full border rounded-lg p-3 bg-white"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-5 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">
                    Lượt điểm danh trong tháng
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedMonth}/{selectedYear}
                  </p>
                </div>

                <p className="text-3xl font-bold text-blue-600">
                  {filteredHistory.length}
                </p>
              </div>

              {filteredHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Chưa có buổi học nào trong tháng này.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map(record => {
                    const date = toDate(record.timestamp);

                    return (
                      <div
                        key={record.id}
                        className="bg-gray-50 border rounded-lg p-4"
                      >
                        <div className="flex justify-between gap-3 mb-3">
                          <p className="font-semibold text-blue-600 text-sm">
                            {date.toLocaleDateString('vi-VN')}
                          </p>

                          <p className="font-mono text-gray-500 text-sm">
                            {date.toLocaleTimeString('vi-VN')}
                          </p>
                        </div>

                        <p className="text-xs font-semibold text-gray-500 mb-1">
                          Nội dung bài học
                        </p>

                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                          {record.lessonContent ||
                            'Chưa có nội dung'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
