# 📱 POS WP CELL
> **Aplikasi Kasir & Manajemen Servis HP Terintegrasi**

[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Firebase](https://img.shields.io/badge/firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**POS WP CELL** adalah solusi digital untuk manajemen toko handphone dan jasa servis. Dibangun menggunakan teknologi modern untuk memastikan performa cepat, antarmuka responsif (Dark/Light Mode), dan sinkronisasi data yang aman.

---

## 🚀 Fitur Utama

| Fitur | Deskripsi |
| :--- | :--- |
| **🛒 Kasir Pintar** | Transaksi penjualan cepat dengan kalkulasi otomatis dan dukungan diskon. |
| **🛠️ Service Tracker** | Manajemen data servis (kerusakan, estimasi biaya, status pengerjaan). |
| **🖨️ Cetak Struk** | Integrasi Printer Thermal Bluetooth 58mm untuk Nota Penjualan & Nota Servis. |
| **🔍 Barcode Scanner** | Input produk instan menggunakan kamera smartphone sebagai alat scan. |
| **📊 Laporan Laba** | Visualisasi keuntungan dan riwayat transaksi secara real-time. |
| **🌓 Dark Mode** | Tema antarmuka dinamis yang nyaman di mata. |
| **☁️ Firebase Sync** | Penyimpanan cloud agar data tetap aman dan tersinkronisasi antar perangkat. |

---

## 🛠️ Tech Stack

- **Framework:** [Expo](https://expo.dev/) (React Native)
- **Database:** [Firebase Firestore & Auth](https://firebase.google.com/)
- **Printing:** `react-native-bluetooth-classic` & `esc-pos-encoder`
- **Navigation:** [React Navigation v7](https://reactnavigation.org/)
- **Store:** AsyncStorage (Local) & Firebase (Cloud)

---

## 📦 Struktur Proyek

```text
src/
├── components/   # Komponen UI Reusable (Button, Input, StatCard)
├── config/       # Konfigurasi Firebase & API
├── context/      # State Management (Auth, Bluetooth, Theme)
├── navigation/   # Konfigurasi Tab & Stack Navigation
├── screens/      # Halaman Utama (Cashier, Service, Stock, etc.)
└── utils/        # Fungsi helper & Formatting
```

---

## 🔧 Instalasi & Persiapan

### 1. Prasyarat
Pastikan Anda sudah menginstal **Node.js** dan **Expo CLI**.

### 2. Clone & Install
```bash
# Clone repositori
git clone https://github.com/username/pos-wp-cell.git

# Masuk ke direktori
cd pos-wp-cell

# Install dependensi
npm install
```

### 3. Konfigurasi Environment
Buat file `.env` di root folder dan masukkan kredensial Firebase:
```env
FIREBASE_API_KEY=your_key
FIREBASE_AUTH_DOMAIN=your_domain
FIREBASE_PROJECT_ID=your_id
# ... dst
```

### 4. Jalankan Aplikasi
```bash
# Jalankan di Android
npm run android

# Jalankan di iOS
npm run ios

# Jalankan Expo Go
npx expo start
```

---

## 📄 Lisensi
Didistribusikan di bawah Lisensi MIT. Lihat `LICENSE` untuk informasi lebih lanjut.

---

## 🧔 Kontributor
- **WP CELL TEAM** - *Initial Work*

---
✨ *Crafted with ❤️ for better business management.*
