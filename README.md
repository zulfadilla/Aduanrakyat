# Aduan Rakyat — Saluran & Penjejak Aduan Rakyat

Aplikasi web ringkas untuk pejabat YB. Ia boleh dibuka di telefon atau PC, dan tidak perlu dipasang.

| Halaman | Untuk | Fungsi |
|---|---|---|
| `index.html` | Rakyat | Pilih DUN (boleh cari), **hantar aduan** berserta gambar/video, dan dapat no. rujukan; **Semak status** guna no. rujukan + 4 digit terakhir telefon |
| `index.html?yb=bm` | Rakyat kawasan tertentu | Sama seperti di atas, terus kepada YB itu |
| `admin.html` | Staf YB / Pentadbir | Papan pemuka, tukar status, log progres (awam / nota dalaman), rekod aduan walk-in, eksport CSV |

**Berbilang YB:** setiap YB ada akaun (tab `Akaun` dalam Sheet), link awam, kata laluan dan no. rujukan sendiri (`BM2026-0001`), dan hanya nampak aduan kawasannya. **Pentadbir** nampak semua.

**Aliran status:** Baru Diterima → Dalam Tindakan → Menunggu Agensi → **Job Done ✓**

**Data** disimpan dalam **Google Sheet** milik pejabat YB melalui Google Apps Script. Ia percuma, dan tiada server untuk diurus.

## Mula
- **Setup penuh:** ikut [PANDUAN-SETUP.md](PANDUAN-SETUP.md) (±15 minit).
- **Selepas berjalan:** cara tambah YB, tukar teks/warna, kemas kini dan pulihkan, lihat [CARA-KEMASKINI.md](CARA-KEMASKINI.md).
- **Cuba dulu:** buka `index.html` terus. Tanpa `API_URL` dalam `config.js`, aplikasi berjalan dalam mod demo (akaun demo: Bukit Merah / `demo`, Sungai Durian / `demo2`, Pentadbir / `admin`).

## Struktur
```
index.html          halaman awam
admin.html          panel staf
config.js           URL backend & jenama (edit di sini)
assets/api.js       sambungan backend + mod demo
assets/style.css    gaya
apps-script/Code.gs backend (tampal ke Google Apps Script)
```
