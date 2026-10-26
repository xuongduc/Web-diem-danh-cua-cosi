# Hệ thống Quản lý Điểm danh

<p align="center">
  Ứng dụng web gọn nhẹ để điểm danh, lưu nội dung bài học và quản lý lịch sử học tập, xây dựng với React, Firebase và Tailwind CSS.
</p>

<p align="center">
  <a href="./README.md">English</a> · <strong>Tiếng Việt</strong>
</p>

## Giới thiệu

Hệ thống Quản lý Điểm danh hỗ trợ giáo viên/người quản lý và học viên ghi nhận các buổi học, xem lịch sử điểm danh và quản lý nội dung đã học. Học viên tự nhập nội dung khi điểm danh; Admin xem lịch sử, thêm buổi học trong quá khứ (thủ công hoặc bằng JSON) và chỉnh sửa dữ liệu thông qua việc thêm/xóa bản ghi.

> **Trạng thái dự án:** Phù hợp với quy mô lớp học nhỏ hoặc dạy kèm. Nên xem kỹ phần bảo mật và giới hạn phía dưới trước khi sử dụng dữ liệu học viên thực tế.

## Tính năng

| Học viên | Quản trị viên (Admin) |
| --- | --- |
| Đăng nhập bằng Google qua Firebase Authentication | Xem danh sách học viên và thống kê toàn hệ thống |
| Tạo hồ sơ học viên khi đăng ký | Tìm học viên theo tên hoặc email |
| Điểm danh kèm nội dung bài học | Xem toàn bộ lịch sử học của từng học viên |
| Thời gian điểm danh được Firebase ghi nhận | Lọc lịch sử theo tháng và nhập năm trực tiếp |
| Xem lịch sử và thống kê số buổi theo tháng | Thêm buổi học với ngày/giờ tùy chọn |
| Xem tổng số buổi tính từ lịch sử thực tế | Nhập nhiều buổi học từ mảng JSON |
| | Xóa từng buổi học |
| | Xóa hồ sơ Firestore và lịch sử của học viên (nếu bản Admin triển khai và Rules đã bật chức năng này) |

**Cách tính số buổi:** Tổng số buổi học bằng số bản ghi thuộc học viên trong collection `attendance`. Số buổi trong tháng chỉ tính các bản ghi thuộc tháng/năm đang chọn. Trường `users.totalSessions` cũ không còn được dùng để hiển thị các số liệu này.

**Cập nhật dữ liệu:** Dashboard hiện truy vấn lại Firestore khi tải trang và sau một số thao tác; **chưa** sử dụng bộ lắng nghe thời gian thực liên tục (`onSnapshot`).

## Công nghệ sử dụng

- **Frontend:** React, Vite, Tailwind CSS
- **Xác thực:** Firebase Authentication (đăng nhập Google)
- **Cơ sở dữ liệu:** Cloud Firestore
- **Triển khai:** Vercel (khuyến nghị)

## Cấu trúc dự án

```text
Web-diem-danh-cua-cosi/
├── .env.local              # Biến môi trường local, không commit
├── .gitignore
├── README.md               # English
├── README.vi.md            # Tiếng Việt
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── public/                 # Tài nguyên tĩnh tùy chọn
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

Cây thư mục trên mô tả cấu trúc dự kiến; các thư mục/tệp tùy chọn có thể khác với phiên bản dự án bạn đang dùng.

## Yêu cầu trước khi cài đặt

- Node.js và npm tương thích với `package.json` của dự án
- Một Firebase project đã bật **Authentication** và **Cloud Firestore**
- Đã bật phương thức đăng nhập Google trong Firebase Authentication
- Tài khoản Vercel nếu muốn triển khai website (không bắt buộc khi chạy local)

## Cài đặt và chạy trên máy

### 1. Clone repository và cài thư viện

```bash
git clone <URL_REPOSITORY_CUA_BAN>
cd <THU_MUC_DU_AN>
npm install
```

### 2. Cấu hình Firebase

Tạo file `.env.local` ở thư mục gốc:

```dotenv
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_ADMIN_EMAIL=your-verified-admin@example.com
```

Lấy cấu hình web app tại **Firebase Console → Project settings → Your apps**. Biến `VITE_ADMIN_EMAIL` dùng để xác định giao diện quản trị ở frontend; email này phải được cấp quyền độc lập trong **Firestore Security Rules**.

> Các biến có tiền tố `VITE_*` sẽ được Vite đưa vào JavaScript gửi xuống trình duyệt. **Tuyệt đối không đặt service-account JSON, private key, mật khẩu hoặc bí mật phía server trong `VITE_*`.** Không commit `.env.local` lên Git.

### 3. Cấu hình xác thực và Firestore Rules

1. Vào **Firebase Console → Authentication → Sign-in method** và bật Google.
2. Tạo Cloud Firestore database.
3. Trước khi công khai website, **Publish Firestore Security Rules** phù hợp. Rules cần đảm bảo:
   - Người dùng chỉ tự tạo hồ sơ học viên của chính mình và không thể tự nhận quyền Admin.
   - Học viên chỉ đọc được hồ sơ và lịch sử điểm danh của mình.
   - Điểm danh của học viên sử dụng `serverTimestamp()` và được đối chiếu với `request.time`; học viên không thể tự chọn ngày giờ quá khứ.
   - Chỉ Admin hợp lệ được xem danh sách học viên và thêm/xóa lịch sử của người khác.
   - Nếu bật xóa hồ sơ học viên, chỉ Admin được thực hiện thao tác đó.
4. Xác minh email tài khoản Admin trong Firebase Authentication nếu Rules đang yêu cầu `email_verified`.

**Quan trọng:** Kiểm tra email trong React chỉ để điều khiển giao diện, **không** thay thế phân quyền Firestore Rules. Không cho học viên tự ghi vào `users.totalSessions`.

### 4. Chạy ứng dụng

```bash
npm run dev
```

Truy cập URL do Vite hiển thị trong Terminal (thường là `http://localhost:5173`).

## Nhập nhiều buổi học bằng JSON

Vào **Admin Dashboard → Chọn học viên → Nhập JSON** và dán mảng JSON theo mẫu:

```json
[
  {
    "date": "2026-10-01",
    "time": "09:00",
    "lessonContent": "Học về Stack và Queue"
  },
  {
    "date": "2026-10-03",
    "lessonContent": "Làm bài tập rèn luyện"
  }
]
```

- `date`: bắt buộc, định dạng `YYYY-MM-DD`.
- `time`: không bắt buộc, định dạng `HH:mm`; giao diện Admin hiện mặc định `09:00` nếu bỏ qua.
- `lessonContent`: bắt buộc, dài từ 1 đến 2.000 ký tự.
- Giao diện nhập hiện giới hạn tối đa **400 buổi/lần**.
- **Chưa tự phát hiện dữ liệu trùng**. Cần kiểm tra lịch sử trước khi nhập lại dữ liệu.
- Ngày/giờ trong JSON được hiểu theo múi giờ địa phương của trình duyệt đang dùng để nhập.

## Triển khai lên Vercel

1. Đẩy mã nguồn lên Git repository; **không** commit `.env.local`.
2. Trên [Vercel](https://vercel.com/), chọn **Add New Project** rồi import repository.
3. Sử dụng cấu hình Vite được nhận diện từ `package.json` (thông thường build bằng `npm run build`, thư mục đầu ra `dist`).
4. Vào **Project → Settings → Environment Variables**, khai báo các biến `VITE_*` tương ứng cho môi trường cần triển khai.
5. Deploy hoặc redeploy khi thay đổi biến môi trường được dùng lúc build.
6. Vào **Firebase Console → Authentication → Settings → Authorized domains**, thêm chính xác hostname Vercel (không có `https://`), ví dụ `your-project.vercel.app`, để Google Sign-In hoạt động.
7. Kiểm tra đăng nhập bằng cả tài khoản học viên và Admin trên website đã triển khai.

Nếu ứng dụng sử dụng các đường dẫn SPA riêng, hãy cấu hình Vercel rewrites khi cần; cấu trúc Dashboard hiện tại có thể không cần cấu hình này.

## Cấu trúc dữ liệu Firestore

### `users/{uid}`

```json
{
  "name": "Nguyễn Văn A",
  "email": "student@example.com",
  "role": "student",
  "totalSessions": 0
}
```

`totalSessions` có thể còn tồn tại trong dữ liệu cũ để tương thích, nhưng giao diện hiện tính tổng từ lịch sử `attendance`.

### `attendance/{autoId}`

```text
uid: "firebase-auth-uid"
timestamp: Firestore Timestamp
lessonContent: "Học về Stack và Queue"
```

Khi học viên tự điểm danh, thời gian nên do Firebase cấp. Admin có thể chọn ngày/giờ cho buổi học cũ. Giao diện cũng hỗ trợ bản ghi cũ có `timestamp` dạng chuỗi ISO.

## Bảo mật và những giới hạn cần biết

- **Không dùng Firestore Rules ở chế độ test mở công khai khi chạy production.** Firebase Web Config là thông tin công khai; Rules mới là lớp bảo vệ dữ liệu.
- **Quyền Admin:** Frontend đọc `VITE_ADMIN_EMAIL`, còn Firestore Rules phải xác minh quyền Admin độc lập. Nếu mở rộng dự án, nên cân nhắc Firebase Authentication Custom Claims được thiết lập từ server đáng tin cậy.
- **Xóa học viên:** Xóa hồ sơ và lịch sử trong Firestore **không xóa tài khoản Firebase Authentication**. Muốn xóa tài khoản đăng nhập cần backend sử dụng Firebase Admin SDK.
- **Điểm danh trùng:** `serverTimestamp()` ngăn tự chọn thời gian, nhưng **không tự ngăn việc điểm danh nhiều lần**. Nếu cần giới hạn một lần/ngày/buổi, phải bổ sung cơ chế kiểm tra phía server.
- **Thao tác xóa/nhập dữ liệu:** Nên sao lưu trước khi xóa hoặc import số lượng lớn. Việc xóa hàng loạt còn phụ thuộc giới hạn batch của Firestore và code Admin hiện tại.
- **Khả năng mở rộng:** Dashboard Admin hiện tải dữ liệu điểm danh để tính thống kê. Với nhiều học viên, nên chuyển sang phân trang, truy vấn theo học viên hoặc tổng hợp phía server.
- **Biến môi trường:** Giá trị `VITE_*` không phải bí mật; khóa đặc quyền phải được lưu ở server đáng tin cậy, không đưa vào React.

## Giấy phép

Repository hiện chưa xác định giấy phép sử dụng. Có thể thêm file `LICENSE` nếu muốn cho phép người khác tái sử dụng mã nguồn theo điều kiện cụ thể.
