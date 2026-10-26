
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';

import { db, auth } from '../config/firebase';

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

import {
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
const MAX_IMPORT = 400;

// Đọc cả timestamp mới và dữ liệu ISO cũ
function toDate(value) {
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return new Date(NaN);
}

// Chuyển ngày và giờ nhập thành Date
function parseLocalDate(dateString, timeString = '09:00') {
  if (
    typeof dateString !== 'string' ||
    typeof timeString !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateString) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeString)
  ) {
    throw new Error('Ngày hoặc giờ không đúng định dạng.');
  }

  const [y, m, d] = dateString.split('-').map(Number);
  const [h, min] = timeString.split(':').map(Number);

  const date = new Date(y, m - 1, d, h, min);

  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d ||
    date.getHours() !== h ||
    date.getMinutes() !== min
  ) {
    throw new Error('Ngày hoặc giờ không hợp lệ.');
  }

  return date;
}

function makeRecord(uid, date, content) {
  return {
    uid,
    timestamp: Timestamp.fromDate(date),
    lessonContent: content.trim()
  };
}

function validContent(content) {
  return (
    typeof content === 'string' &&
    content.trim().length > 0 &&
    content.trim().length <= 2000
  );
}

function localDateString() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
}

export default function AdminDashboard() {
  const [authUser, setAuthUser] = useState(undefined);

  const [students, setStudents] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);

  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('history');

  // Bộ lọc tháng và năm
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );

  // Thêm một buổi
  const [lessonDate, setLessonDate] = useState(localDateString);
  const [lessonTime, setLessonTime] = useState('09:00');
  const [lessonContent, setLessonContent] = useState('');

  // Nhập nhiều buổi
  const [jsonInput, setJsonInput] = useState('');

  const isAdmin =
    !!ADMIN_EMAIL &&
    authUser?.email?.toLowerCase() ===
      ADMIN_EMAIL.toLowerCase() &&
    authUser?.emailVerified === true;

  // Theo dõi xác thực
  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setAuthUser(user);
    });
  }, []);

  // Tải toàn bộ dữ liệu Admin được phép xem
  const fetchData = useCallback(async () => {
    const [studentSnapshot, attendanceSnapshot] =
      await Promise.all([
        getDocs(
          query(
            collection(db, 'users'),
            where('role', '==', 'student')
          )
        ),
        getDocs(collection(db, 'attendance'))
      ]);

    const studentData = studentSnapshot.docs
      .map(item => ({
        id: item.id,
        ...item.data()
      }))
      .filter(student =>
        student.email?.toLowerCase() !==
        ADMIN_EMAIL?.toLowerCase()
      );

    studentData.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'vi')
    );

    const attendanceData = attendanceSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    attendanceData.sort(
      (a, b) =>
        toDate(b.timestamp).getTime() -
        toDate(a.timestamp).getTime()
    );

    setStudents(studentData);
    setAllAttendance(attendanceData);
  }, []);

  useEffect(() => {
    if (authUser === undefined) return;

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        await fetchData();
      } catch (err) {
        console.error(err);

        if (active) {
          setError('Không thể tải dữ liệu quản lý.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [authUser, isAdmin, fetchData]);

  // Đếm số buổi theo uid
  const attendanceCount = useMemo(() => {
    const counts = {};

    allAttendance.forEach(record => {
      if (!record.uid) return;

      counts[record.uid] =
        (counts[record.uid] || 0) + 1;
    });

    return counts;
  }, [allAttendance]);

  // Học viên đang được chọn
  const selectedStudent = students.find(
    s => s.id === selectedStudentId
  );

  // Toàn bộ lịch sử của học viên
  const history = useMemo(() => {
    return allAttendance.filter(
      record => record.uid === selectedStudentId
    );
  }, [allAttendance, selectedStudentId]);

  // TỔNG SỐ BUỔI = SỐ BẢN GHI LỊCH SỬ
  const totalSessions = history.length;

  // Lọc tháng và năm
  const filteredHistory = useMemo(() => {
    const year = Number(selectedYear);

    if (
      !Number.isInteger(year) ||
      year < 1 ||
      year > 9999
    ) {
      return [];
    }

    return history.filter(record => {
      const date = toDate(record.timestamp);

      return (
        !Number.isNaN(date.getTime()) &&
        date.getMonth() + 1 === selectedMonth &&
        date.getFullYear() === year
      );
    });
  }, [history, selectedMonth, selectedYear]);

  // Tổng số buổi toàn hệ thống
  const systemTotal = students.reduce(
    (sum, student) =>
      sum + (attendanceCount[student.id] || 0),
    0
  );

  // Lọc tên/email học viên
  const filteredStudents = students.filter(student => {
    const keyword = search.toLowerCase().trim();

    return (
      (student.name || '').toLowerCase().includes(keyword) ||
      (student.email || '').toLowerCase().includes(keyword)
    );
  });

  // Mở chi tiết học viên
  const openStudent = student => {
    setSelectedStudentId(student.id);
    setActiveTab('history');

    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(String(new Date().getFullYear()));

    setError('');
  };

  // Tải lại dữ liệu sau khi thay đổi
  const refresh = async () => {
    await fetchData();
  };

  // THÊM MỘT BUỔI HỌC
  const addSingleLesson = async event => {
    event.preventDefault();

    if (!selectedStudent || saving) return;

    if (!validContent(lessonContent)) {
      alert('Nội dung phải từ 1 đến 2000 ký tự.');
      return;
    }

    let committed = false;
    setSaving(true);

    try {
      const date = parseLocalDate(lessonDate, lessonTime);

      const attendanceRef = doc(
        collection(db, 'attendance')
      );

      const record = makeRecord(
        selectedStudent.id,
        date,
        lessonContent
      );

      await runTransaction(db, async tx => {
        const userRef = doc(
          db,
          'users',
          selectedStudent.id
        );

        const userSnap = await tx.get(userRef);

        if (!userSnap.exists()) {
          throw new Error('Học viên không tồn tại.');
        }

        tx.set(attendanceRef, record);
      });

      committed = true;
      setLessonContent('');

      setSelectedMonth(date.getMonth() + 1);
      setSelectedYear(String(date.getFullYear()));

      await refresh();

      setActiveTab('history');
      alert('Đã thêm buổi học thành công!');
    } catch (err) {
      console.error(err);

      alert(
        committed
          ? 'Đã lưu buổi học, nhưng chưa tải lại được dữ liệu.'
          : 'Không thể thêm buổi: ' + err.message
      );
    } finally {
      setSaving(false);
    }
  };

  // NHẬP NHIỀU BUỔI BẰNG JSON
  const importJSON = async () => {
    if (!selectedStudent || saving) return;

    let records;

    try {
      const input = JSON.parse(jsonInput);

      if (!Array.isArray(input) || input.length === 0) {
        throw new Error('JSON phải là mảng không rỗng.');
      }

      if (input.length > MAX_IMPORT) {
        throw new Error(
          `Tối đa ${MAX_IMPORT} buổi mỗi lần.`
        );
      }

      records = input.map((item, index) => {
        if (
          !item ||
          typeof item !== 'object' ||
          Array.isArray(item)
        ) {
          throw new Error(`Buổi ${index + 1} không hợp lệ.`);
        }

        if (!validContent(item.lessonContent)) {
          throw new Error(
            `Buổi ${index + 1}: nội dung không hợp lệ.`
          );
        }

        const date = parseLocalDate(
          item.date,
          item.time || '09:00'
        );

        return makeRecord(
          selectedStudent.id,
          date,
          item.lessonContent
        );
      });
    } catch (err) {
      alert('JSON không hợp lệ: ' + err.message);
      return;
    }

    const confirmed = window.confirm(
      `Thêm ${records.length} buổi học cho ${selectedStudent.name}?`
    );

    if (!confirmed) return;

    setSaving(true);
    let committed = false;

    try {
      const batch = writeBatch(db);

      records.forEach(record => {
        const ref = doc(collection(db, 'attendance'));
        batch.set(ref, record);
      });

      await batch.commit();
      committed = true;

      setJsonInput('');

      await refresh();

      setActiveTab('history');

      alert(`Đã thêm ${records.length} buổi học!`);
    } catch (err) {
      console.error(err);

      alert(
        committed
          ? 'Đã nhập buổi học, nhưng chưa tải lại được dữ liệu.'
          : 'Không thể nhập JSON: ' + err.message
      );
    } finally {
      setSaving(false);
    }
  };

  // XÓA BUỔI HỌC
  const deleteLesson = async record => {
    if (!selectedStudent || saving) return;

    if (!window.confirm(
      'Bạn có chắc muốn xóa buổi học này?\n' +
      'Tổng số buổi sẽ tự động giảm theo lịch sử.'
    )) {
      return;
    }

    setSaving(true);
    let committed = false;

    try {
      const attendanceRef = doc(
        db,
        'attendance',
        record.id
      );

      await runTransaction(db, async tx => {
        const snapshot = await tx.get(attendanceRef);

        if (!snapshot.exists()) {
          throw new Error('Buổi học không tồn tại.');
        }

        if (snapshot.data().uid !== selectedStudent.id) {
          throw new Error('Buổi học không thuộc học viên.');
        }

        tx.delete(attendanceRef);
      });

      committed = true;

      await refresh();
      alert('Đã xóa buổi học.');
    } catch (err) {
      console.error(err);

      alert(
        committed
          ? 'Đã xóa buổi học, nhưng chưa tải lại được dữ liệu.'
          : 'Không thể xóa: ' + err.message
      );
    } finally {
      setSaving(false);
    }
  };

  // Chờ xác thực
  if (authUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Đang xác thực...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <h2 className="text-xl font-bold text-red-600">
          Không có quyền truy cập
        </h2>

        <p className="text-gray-500 mt-2 text-center">
          Tài khoản không có quyền quản trị.
        </p>

        <button
          onClick={() => signOut(auth)}
          className="mt-5 bg-gray-800 text-white px-5 py-2 rounded-lg"
        >
          Đăng xuất
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <div className="flex justify-between items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Quản lý học viên
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Admin Dashboard
              </p>
            </div>

            <button
              onClick={() => signOut(auth)}
              className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg"
            >
              Đăng xuất
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-5">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl p-10 text-center text-gray-500">
            Đang tải dữ liệu...
          </div>
        ) : !selectedStudent ? (

          /* DASHBOARD TỔNG QUAN */
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">

              <div className="bg-white rounded-xl border shadow-sm p-5">
                <p className="text-sm text-gray-500">
                  Tổng số học viên
                </p>

                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {students.length}
                </p>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-5">
                <p className="text-sm text-gray-500">
                  Tổng buổi học
                </p>

                <p className="text-3xl font-bold text-green-600 mt-2">
                  {systemTotal}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h2 className="text-lg font-bold mb-4">
                Danh sách học viên
              </h2>

              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm tên hoặc email..."
                className="w-full border rounded-lg p-3 mb-5 focus:ring-2 focus:ring-blue-500 outline-none"
              />

              {filteredStudents.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  Không tìm thấy học viên.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => openStudent(student)}
                      className="w-full text-left border rounded-lg p-4 flex justify-between items-center gap-3 hover:bg-blue-50 hover:border-blue-300 transition"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800">
                          {student.name || 'Chưa có tên'}
                        </p>

                        <p className="text-sm text-gray-500 break-all">
                          {student.email}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold text-xl text-blue-600">
                          {attendanceCount[student.id] || 0}
                        </p>
                        <p className="text-xs text-gray-400">
                          buổi học
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        ) : (

          /* CHI TIẾT HỌC VIÊN */
          <div>
            <button
              onClick={() => {
                setSelectedStudentId(null);
                setError('');
              }}
              className="text-blue-600 hover:underline font-medium mb-5"
            >
              ← Quay lại danh sách
            </button>

            {/* THÔNG TIN */}
            <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {selectedStudent.name || 'Học viên'}
              </h2>

              <p className="text-gray-500 text-sm mt-1 break-all">
                {selectedStudent.email}
              </p>

              <div className="bg-blue-50 rounded-lg p-5 mt-5 text-center">
                <p className="text-gray-600 text-sm">
                  Tổng số buổi đã học
                </p>

                <p className="text-5xl font-black text-blue-600 my-3">
                  {totalSessions}
                </p>

                <p className="text-xs text-gray-500">
                  Tự động tính từ toàn bộ lịch sử học
                </p>
              </div>
            </div>

            {/* TABS */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">

              <div className="flex border-b overflow-x-auto">
                {[
                  ['history', 'Lịch sử học'],
                  ['single', 'Thêm buổi'],
                  ['json', 'Nhập JSON']
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    disabled={saving}
                    className={`flex-1 min-w-max px-3 py-4 text-sm font-medium ${
                      activeTab === id
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-5">

                {/* LỊCH SỬ */}
                {activeTab === 'history' && (
                  <div>
                    <h3 className="font-bold text-gray-800 mb-5">
                      Lịch sử học tập
                    </h3>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div>
                        <label className="block text-sm mb-2">
                          Tháng
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
                        <label className="block text-sm mb-2">
                          Năm
                        </label>

                        {/* NHẬP NĂM TRỰC TIẾP */}
                        <input
                          type="number"
                          min="1"
                          max="9999"
                          step="1"
                          value={selectedYear}
                          onChange={e =>
                            setSelectedYear(e.target.value)
                          }
                          placeholder="Nhập năm"
                          className="w-full border rounded-lg p-3 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* THỐNG KÊ */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-600">
                          Tổng tất cả buổi học
                        </p>

                        <p className="text-3xl font-bold text-blue-600 mt-2">
                          {totalSessions}
                        </p>
                      </div>

                      <div className="bg-gray-100 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-600">
                          Buổi trong tháng {selectedMonth}
                        </p>

                        <p className="text-3xl font-bold text-gray-800 mt-2">
                          {filteredHistory.length}
                        </p>
                      </div>
                    </div>

                    {filteredHistory.length === 0 ? (
                      <p className="text-center py-8 text-gray-500">
                        Không có buổi học trong tháng này.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {filteredHistory.map(record => {
                          const date = toDate(record.timestamp);

                          return (
                            <div
                              key={record.id}
                              className="border rounded-lg p-4 bg-gray-50"
                            >
                              <div className="flex justify-between items-start gap-3">
                                <div>
                                  <p className="font-bold text-blue-600 text-sm">
                                    {date.toLocaleDateString('vi-VN')}
                                  </p>

                                  <p className="text-xs text-gray-500 mt-1">
                                    {date.toLocaleTimeString('vi-VN')}
                                  </p>
                                </div>

                                <button
                                  onClick={() => deleteLesson(record)}
                                  disabled={saving}
                                  className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg text-sm disabled:opacity-40"
                                >
                                  Xóa
                                </button>
                              </div>

                              <p className="text-xs font-semibold text-gray-500 mt-4 mb-1">
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

                {/* THÊM MỘT BUỔI */}
                {activeTab === 'single' && (
                  <form onSubmit={addSingleLesson}>
                    <h3 className="font-bold text-gray-800 mb-5">
                      Thêm một buổi học
                    </h3>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Ngày học
                        </label>

                        <input
                          type="date"
                          required
                          value={lessonDate}
                          onChange={e => setLessonDate(e.target.value)}
                          className="w-full border rounded-lg p-3"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Giờ học
                        </label>

                        <input
                          type="time"
                          required
                          value={lessonTime}
                          onChange={e => setLessonTime(e.target.value)}
                          className="w-full border rounded-lg p-3"
                        />
                      </div>
                    </div>

                    <label className="block text-sm font-medium mb-2">
                      Nội dung bài học
                    </label>

                    <textarea
                      value={lessonContent}
                      onChange={e =>
                        setLessonContent(e.target.value)
                      }
                      rows={5}
                      maxLength={2000}
                      required
                      placeholder="Nhập nội dung bài học..."
                      className="w-full border rounded-lg p-3 resize-none"
                    />

                    <p className="text-xs text-gray-400 text-right mb-4">
                      {lessonContent.length}/2000
                    </p>

                    <button
                      type="submit"
                      disabled={saving || !lessonContent.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                    >
                      {saving ? 'Đang lưu...' : 'Thêm buổi học'}
                    </button>
                  </form>
                )}

                {/* NHẬP JSON */}
                {activeTab === 'json' && (
                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">
                      Nhập nhiều buổi bằng JSON
                    </h3>

                    <p className="text-sm text-gray-500 mb-4">
                      Dán mảng JSON gồm ngày, giờ và nội dung bài học.
                    </p>

                    <pre className="bg-gray-900 text-green-300 rounded-lg p-4 mb-4 text-xs overflow-x-auto">
{`[
  {
    "date": "2026-10-01",
    "time": "09:00",
    "lessonContent": "Bài học số 1"
  },
  {
    "date": "2026-10-03",
    "time": "14:00",
    "lessonContent": "Bài học số 2"
  }
]`}
                    </pre>

                    <textarea
                      value={jsonInput}
                      onChange={e => setJsonInput(e.target.value)}
                      rows={12}
                      spellCheck={false}
                      placeholder="Dán JSON tại đây..."
                      className="w-full border rounded-lg p-3 font-mono text-sm resize-y mb-3"
                    />

                    <p className="text-xs text-gray-500 mb-4">
                      Tối đa {MAX_IMPORT} buổi/lần.
                      Bỏ qua time nếu muốn dùng 09:00.
                    </p>

                    <button
                      onClick={importJSON}
                      disabled={saving || !jsonInput.trim()}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                    >
                      {saving
                        ? 'Đang nhập...'
                        : 'Nhập JSON'}
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
