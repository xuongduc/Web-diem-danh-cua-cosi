# Hệ thống Quản lý Điểm danh (Attendance Management)

Ứng dụng web quản lý điểm danh học viên với hệ thống phân quyền Admin/Student tự động, được xây dựng bằng React (Vite), Tailwind CSS và Firebase.

## Tính năng chính

*   **Xác thực bằng Google:** Đăng nhập an toàn qua tài khoản Gmail thông qua Firebase Auth.
*   **Phân quyền người dùng (Role-based):**
    *   **Admin:** Giám sát danh sách toàn bộ học viên, chủ động tăng hoặc giảm số buổi học (để sửa lỗi khi điểm danh nhầm).
    *   **Học sinh:** Nút điểm danh nhanh chóng, xem tổng số buổi học, theo dõi chi tiết lịch sử điểm danh được tự động phân nhóm theo từng tháng.
*   **Dữ liệu Real-time:** Dữ liệu điểm danh và thông tin người dùng được lưu trữ và truy xuất trực tiếp qua Firebase Firestore.

## Công nghệ sử dụng

*   **Frontend:** React 18 (Vite), Tailwind CSS, Lucide React (Icons).
*   **Backend & Database:** Firebase Authentication, Cloud Firestore.
*   **Hosting:** Tối ưu hóa để triển khai trên Vercel.

## Hướng dẫn cài đặt (Local Development)

**1. Clone dự án và cài đặt thư viện**
```bash
git clone <url-repo-cua-ban>
cd attendance-app
npm install
```

**2. Cấu hình biến môi trường**
Tạo file `.env` ở thư mục gốc. Bạn cần nhập email quản trị viên và cấu hình Firebase (lấy từ Firebase Console) vào file này:
```env
VITE_ADMIN_EMAIL=phuongxuongduc29052005@gmail.com
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**3. Khởi chạy ứng dụng**
```bash
npm run dev
```
Mở trình duyệt và truy cập `http://localhost:5173`.

## Hướng dẫn triển khai (Deploy lên Vercel)

1. Đẩy toàn bộ mã nguồn lên một repository trên GitHub.
2. Đăng nhập vào [Vercel](https://vercel.com) và chọn **Add New Project**.
3. Import repository GitHub vừa tạo.
4. Chuyển sang tab **Environment Variables** trong quá trình thiết lập Vercel, copy và paste toàn bộ các biến từ file `.env` vào.
5. Nhấn **Deploy** và chờ Vercel cung cấp đường link public.



## Cấu Trúc:
```text
    Web-diem-danh-cua-cosi/
    ├── .env
    ├── .gitignore
    ├── README.md
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── config/
        │   └── firebase.js
        └── components/
            ├── AdminDashboard.jsx
            ├── Login.jsx
            └── StudentDashboard.jsx
```