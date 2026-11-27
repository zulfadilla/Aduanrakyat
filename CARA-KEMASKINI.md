# Cara Kemas Kini — Aduan Rakyat

Panduan untuk pentadbir dan staf selepas sistem berjalan. Untuk setup kali pertama, lihat [PANDUAN-SETUP.md](PANDUAN-SETUP.md).

**Ringkasan:** urusan harian dibuat dalam Google Sheet. Perubahan rupa laman dibuat di GitHub. Perubahan besar dibuat melalui Pull Request. Jika `Code.gs` berubah, kemas kini Apps Script **dahulu**, kemudian baru merge.

---

## 1. Urusan harian — terus di Google Sheet (tiada kod)

| Nak buat apa | Di mana |
|---|---|
| Tambah YB baru | Tab **`Akaun`**: tambah satu baris (`kod`, `nama`, `kawasan`, `kata_laluan`, `aktif`) |
| Tukar kata laluan YB | Tab **`Akaun`**: lajur `kata_laluan` |
| Nyahaktif YB (cth. tamat penggal) | Tab **`Akaun`**: isi `tidak` dalam lajur `aktif`. Data YB itu kekal |
| Padam aduan palsu atau spam | Tab **`Aduan`** dan **`Log`**: padam baris aduan tersebut |
| Padam gambar/video | Google Drive, folder `Aduan Rakyat - Lampiran/<no. aduan>`, dan baris dalam tab **`Lampiran`** |
| Tukar kata laluan Pentadbir | Apps Script: **Project Settings → Script properties → `ADMIN_PASSWORD`** |
| Sekat nombor spammer | Panel staf: buka aduan, tekan **⛔ Spam & sekat nombor**. Atau tambah nombor terus dalam tab **`Sekatan`** |
| Nyahsekat nombor | Tab **`Sekatan`**: padam baris nombor tersebut |
| Tukar had aduan sehari (lalai 3) | Apps Script: **Script properties → `HAD_SEHARI`** |
| Tetapkan poskod / kawasan DUN | Tab **`Akaun`**: lajur `poskod`, `pusat`, `radius_km` (lihat PANDUAN-SETUP.md, Langkah 4b) |

Perubahan ini **berkuat kuasa serta-merta** dan tidak perlu deploy semula.

Selepas menambah YB baru, link pendeknya terus boleh digunakan: `https://<alamat-laman>/<kod>`, cth. `aduanmelaka.pages.dev/bm`.

---

## 2. Tukar teks, nama atau warna — edit terus di GitHub

1. Buka repo di GitHub, klik fail yang hendak diubah, kemudian tekan ✏️ **Edit this file**.

   | Fail | Apa yang boleh diubah |
   |---|---|
   | `config.js` | Nama aplikasi (`TAJUK`, `SUBTAJUK`) |
   | `index.html` | Teks di bahagian atas halaman awam (cth. *"Kami Cuba Selesaikan."*, *"Aduan Rakyat · Negeri Melaka"*) |
   | `assets/style.css` | Warna tema di baris paling atas: `--merah`, `--biru`, `--kuning` |
   | `assets/api.js` | Senarai kategori aduan (`KATEGORI`) |

2. Tekan **Commit changes…** dan pilih **Commit directly to the `main` branch**.
3. Cloudflare akan kemas kini laman secara automatik dalam ±1 minit. Semak di **Cloudflare → projek Pages → Deployments**.

> Hati-hati: jangan padam tanda petikan `'…'` atau koma `,` dalam `config.js` dan `api.js`. Jika laman rosak selepas edit, lihat [Bahagian 4](#4-jika-ada-masalah-selepas-perubahan).

---

## 3. Ciri baru atau perubahan besar — melalui Pull Request

1. Minta perubahan kepada Claude, atau pembangun anda.
2. Perubahan dihantar sebagai **Pull Request (PR)** di GitHub.
3. **Uji dahulu menggunakan link preview.** Cloudflare akan membuat link preview untuk setiap PR, cth. `claude-xxx.aduanmelaka.pages.dev`. Link ini ada dalam **Cloudflare → Deployments** (bahagian *Preview*) atau dalam komen PR.

   ⚠️ Link preview menggunakan backend dan Google Sheet **sebenar**. Padam aduan ujian selepas mencuba.
4. Jika semuanya berfungsi, tekan **Merge pull request**. Laman akan live dalam ±1 minit.

### Jika PR mengubah `apps-script/Code.gs`

Ikut susunan ini. **Backend mesti dikemas kini dahulu**, jika tidak laman baharu tidak dapat berhubung dengan backend lama.

1. Buka Google Sheet, kemudian **Extensions → Apps Script**. Gantikan seluruh `Code.gs` dengan versi dalam PR dan tekan **Save**.
2. Pilih fungsi **`setup`** dan tekan **Run**. Jika Google minta kebenaran baru, tekan **Allow**.
3. Pergi ke **Deploy → Manage deployments**, tekan ✏️, pilih **Version: New version**, kemudian **Deploy**. URL backend kekal sama.
4. **Baru selepas itu** merge PR.

---

## 4. Jika ada masalah selepas perubahan

| Masalah pada | Cara pulihkan |
|---|---|
| Laman web | **Cloudflare → Deployments**: pilih deployment sebelumnya, kemudian **⋯ → Rollback to this deployment**. Laman kembali normal serta-merta |
| Kod di GitHub | Buka PR yang sudah di-merge dan tekan **Revert**, kemudian merge PR revert tersebut |
| Backend (Apps Script) | **Deploy → Manage deployments → ✏️**, kemudian pilih versi lama di *Version* dan tekan **Deploy** |
| Data dalam Sheet | **File → Version history → See version history**: pilih tarikh dan tekan **Restore this version** |

### Semakan pantas jika laman tidak berfungsi
- **Ralat 404 untuk seluruh laman:** semak status hosting di Cloudflare (**Deployments**) atau GitHub (**Settings → Pages**).
- **"Tidak dapat memuatkan senarai DUN":** buka URL Apps Script (`…/exec`) terus di pelayar. Jawapan sepatutnya `{"ok":true,...}`. Jika tidak:
  - jalankan semula `setup` dan **Allow**, kemudian deploy *New version*;
  - pastikan *Who has access* ditetapkan kepada **Anyone**.
- **Link pendek `/kod` tidak berfungsi:** semak `kod` dalam tab `Akaun` dan pastikan lajur `aktif` bukan `tidak`.

---

## 5. Tabiat yang baik

- **Sebulan sekali**, buat sandaran Sheet: **File → Make a copy**, atau **File → Download → Microsoft Excel (.xlsx)**.
- **Jangan ubah tajuk lajur** (baris pertama) dalam tab `Aduan`, `Log`, `Lampiran` dan `Akaun`. Sistem bergantung pada susunan lajur itu.
- **Jangan tukar `kod` YB** yang sudah digunakan. Kod itu ada dalam no. rujukan dan link pendek yang mungkin sudah tercetak di poster.
- **Jangan kongsi Google Sheet** kepada YB atau staf, kerana kata laluan semua YB ada di dalamnya. Staf cukup menggunakan panel staf (`/admin.html`).
- **Semak aduan bertanda ⚠️** (luar kawasan) dan telefon pengadu jika ragu-ragu sebelum mengambil tindakan. Jika aduan palsu, tekan **⛔ Spam & sekat nombor**.
- **Ruang Google Drive** percuma hanya 15 GB. Semak sekali-sekala dan padam folder lampiran aduan lama yang sudah selesai.
- Tukar kata laluan YB apabila staf berhenti kerja.
