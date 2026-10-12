# Hirono Archive — Katalog Figur Koleksi

Aplikasi fullstack JavaScript untuk mengarsipkan seri dan figur koleksi Hirono.
Proyek dibuat mengikuti materi course *FullStack JavaScript Developer dengan Express dan React Native*.

**Fitur:** katalog seri, pencarian figur, detail figur, CRUD figur (dengan upload gambar dari galeri),
koleksi pribadi (jumlah, kondisi, catatan), validasi input, dan navigasi antar layar.

**Stack**
- Backend: Node.js, Express, Prisma ORM (SQLite), express-validator, Multer
- Mobile: React Native (Expo), React Navigation, expo-image-picker, Fetch API

> Data seri dan figur adalah **data contoh** untuk keperluan belajar. Ini proyek penggemar,
> bukan aplikasi resmi POP MART. Periksa kembali nama/rilis sebelum dipakai sebagai referensi.

## 1. Jalankan backend
```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
npx prisma migrate dev --name init
npm run seed
npm run dev
```
Cek di browser: `http://localhost:3000/api/health` → `{"status":"ok",...}`

## 2. Jalankan aplikasi mobile
```bash
cd mobile
npm install
npx expo start
```
- **HP fisik (Expo Go):** buka `mobile/src/config.js`, isi `LAPTOP_IP` dengan IPv4 laptop
  (cek dengan `ipconfig` / `ifconfig`). HP dan laptop harus satu Wi-Fi.
- **Android Emulator:** biarkan `LAPTOP_IP` kosong (memakai `10.0.2.2`).

## 3. Endpoint
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | /api/health | Cek server |
| GET | /api/series | Daftar seri |
| GET | /api/figures?search=&seriesId= | Daftar/cari figur |
| GET | /api/figures/:id | Detail figur |
| POST | /api/figures | Tambah figur |
| PUT | /api/figures/:id | Edit figur |
| DELETE | /api/figures/:id | Hapus figur |
| GET/POST | /api/collection | Lihat / simpan ke koleksi |
| PUT/DELETE | /api/collection/:id | Ubah jumlah / hapus dari koleksi |
| POST | /api/uploads/image | Upload gambar (field `image`) |

## 4. Screenshot
Letakkan tangkapan layar aplikasi di folder `screenshots/`.
