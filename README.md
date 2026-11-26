# YB Kasi Setel — Saluran & Penjejak Aduan Rakyat

Aplikasi web ringkas untuk pejabat YB. Ia boleh dibuka di telefon atau PC, dan tidak perlu dipasang.

| Halaman | Untuk | Fungsi |
|---|---|---|
| `index.html` | Rakyat | **Hantar aduan** dan dapat no. rujukan; **Semak status** guna no. rujukan + 4 digit terakhir telefon |
| `admin.html` | Staf YB (kata laluan) | Papan pemuka, tukar status, log progres (awam / nota dalaman), rekod aduan walk-in, eksport CSV |

**Aliran status:** Baru Diterima → Dalam Tindakan → Menunggu Agensi → **Job Done ✓**

**Data** disimpan dalam **Google Sheet** milik pejabat YB melalui Google Apps Script. Ia percuma, dan tiada server untuk diurus.

## Mula
- **Setup penuh:** ikut [PANDUAN-SETUP.md](PANDUAN-SETUP.md) (±15 minit).
- **Cuba dulu:** buka `index.html` terus. Tanpa `API_URL` dalam `config.js`, aplikasi berjalan dalam mod demo (kata laluan staf: `demo`).

## Struktur
```
index.html          halaman awam
admin.html          panel staf
config.js           URL backend & jenama (edit di sini)
assets/api.js       sambungan backend + mod demo
assets/style.css    gaya
apps-script/Code.gs backend (tampal ke Google Apps Script)
```
