# BahasaNusa WhatsApp Bot

> Bot WhatsApp untuk pendaftaran acara budaya, subtitle real-time, dan dashboard penyelenggara.

---

## 📦 Struktur Project

```
Bot/
├── src/
│   ├── config/              # Konfigurasi global
│   ├── handlers/            # Handler pesan utama
│   ├── helpers/             # Fungsi database & enums
│   ├── services/            # AI & media downloader
│   └── ui/menus/            # Template menu
├── assets/images/           # Gambar statis
├── storage/bahasa-nusa-sesi # File sesi WhatsApp
├── .env                     # Konfigurasi environment
├── index.js                 # Entry point
└── package.json             # Dependencies
```

---

## 🚀 Cara Menjalankan

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Konfigurasi database**
   - Edit file `.env` dengan data PostgreSQL Anda:
     ```env
     DB_USER=postgres
     DB_PASSWORD=yourpassword
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=bahasanusa
     ```
3. **Jalankan bot**
   ```bash
   npm start
   ```

---

## 📝 Fitur Utama

- Pendaftaran acara budaya via WhatsApp
- Subtitle real-time untuk pertunjukan
- Dashboard penyelenggara terintegrasi
- Penyimpanan data ke PostgreSQL
- Multi-step onboarding & pembatalan proses

---

## 💬 Perintah Bot

| Perintah   | Fungsi                                      |
|------------|---------------------------------------------|
| `daftar`   | Memulai pendaftaran acara                   |
| `menu`     | Menampilkan menu utama                      |
| `bantuan`  | Panduan penggunaan                          |
| `kontak`   | Informasi kontak tim BahasaNusa             |
| `batal`    | > Membatalkan proses pendaftaran (gunakan quote) |

---

## 📚 Contoh Penggunaan

1. Kirim `daftar` ke bot WhatsApp
2. Ikuti instruksi step-by-step
3. Kapan saja, kirim
   > batal
   untuk membatalkan proses
4. Setelah selesai, Anda akan menerima link dan password dashboard

---

## ❓ FAQ

- **Bagaimana cara membatalkan pendaftaran?**
  > Kirim pesan dengan isi `batal` (gunakan format quote) kapan saja selama proses pendaftaran.
- **Bagaimana menghubungi tim support?**
  > Kirim `kontak` untuk info WhatsApp, Telegram, dan YouTube.

---

## 🛠️ Kontribusi & Lisensi

Silakan gunakan, modifikasi, atau kontribusi ke project ini. Mohon tetap mencantumkan credit BahasaNusa.
Lisensi: MIT