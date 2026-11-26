# YB Kasi Setel — Penjejak Aduan Rakyat

Aplikasi ringkas (satu fail `index.html`) untuk pejabat YB menjejak:

1. **Aduan diterima** — nama pengadu, telefon, kawasan, kategori, keutamaan, saluran, agensi dirujuk, pegawai bertanggungjawab.
2. **Progres penyelesaian** — status *Baru Diterima → Dalam Tindakan → Menunggu Agensi → Job Done* serta log kemaskini bertarikh.
3. **Job done** — tarikh selesai direkod automatik; papan pemuka tunjuk % selesai dan purata hari untuk selesai.

Ciri lain: carian & tapisan, susun ikut keutamaan, butang WhatsApp terus ke pengadu, eksport CSV (buka dalam Excel), sandaran/pulih JSON.

## Cara guna
Buka `index.html` dalam pelayar (telefon atau komputer). Tiada pemasangan diperlukan.
Untuk akses dalam talian, aktifkan **GitHub Pages** (Settings → Pages → branch ini, folder root).

> Data disimpan dalam pelayar (localStorage) pada peranti itu sahaja. Muat turun sandaran secara berkala.
