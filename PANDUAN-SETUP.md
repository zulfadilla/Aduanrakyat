# Panduan Setup — YB Kasi Setel (±15 minit, sekali sahaja)

Anda perlukan: satu akaun Google (sebaik-baiknya akaun pejabat) dan akses ke repo GitHub ini.

```
Rakyat (telefon/PC) ──► index.html ──┐
                                     ├──► Google Apps Script ──► Google Sheet (data)
Staf YB  ──────────► admin.html ─────┘
```

---

## Langkah 1 — Cipta Google Sheet
1. Buka <https://sheets.google.com> dan cipta **Blank spreadsheet**.
2. Namakan, cth. `Aduan Rakyat - Pejabat YB`.

## Langkah 2 — Tampal kod backend
1. Dalam Sheet itu, pergi ke menu **Extensions → Apps Script**.
2. Padam semua kod sedia ada dalam `Code.gs`.
3. Salin **seluruh** kandungan fail [`apps-script/Code.gs`](apps-script/Code.gs) dari repo ini, kemudian tampal.
4. Tekan ikon 💾 **Save**.

## Langkah 3 — Tetapkan kata laluan staf
1. Di sebelah kiri editor Apps Script, tekan ⚙️ **Project Settings**.
2. Skrol ke bawah ke **Script properties**, kemudian tekan **Add script property**.
   - Property: `ADMIN_PASSWORD`
   - Value: kata laluan yang **panjang dan susah diteka** (cth. `Kasi-Setel-2026-Bukit-Merah!`)
3. Tekan **Save script properties**.

> Kongsi kata laluan ini dengan staf sahaja. Untuk tukar kata laluan, kemas kini nilai di sini.

## Langkah 4 — Jalankan setup sekali
1. Kembali ke **Editor** (ikon `< >`).
2. Di bar atas, pilih fungsi **`setup`**, kemudian tekan **Run**.
3. Google akan minta kebenaran: pilih **Review permissions**, pilih akaun anda, tekan **Advanced**, kemudian **Go to … (unsafe)**, dan akhir sekali **Allow**.
   (Amaran ini biasa untuk skrip yang anda tulis sendiri.)
4. Semak Sheet: tab **Aduan** dan **Log** telah dicipta.

## Langkah 5 — Deploy sebagai Web App
1. Tekan **Deploy → New deployment**.
2. Tekan ⚙️ sebelah *Select type* dan pilih **Web app**.
3. Tetapkan:
   - Description: `YB Kasi Setel`
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Tekan **Deploy**, kemudian salin **Web app URL** (berakhir dengan `/exec`).

## Langkah 6 — Sambungkan laman web
1. Di GitHub, buka fail [`config.js`](config.js) dan tekan ✏️ **Edit**.
2. Tampal URL tadi:
   ```js
   API_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```
3. (Pilihan) Tukar `TAJUK` dan `SUBTAJUK`, cth. `'Pejabat YB Bukit Merah'`.
4. Tekan **Commit changes**.

## Langkah 7 — Terbitkan dengan GitHub Pages
1. Repo mesti **Public**: Settings → General → Danger Zone → Change visibility.
2. **Settings → Pages**, kemudian pilih *Source*: **Deploy from a branch**, branch **main**, folder **/ (root)**, dan tekan **Save**.
3. Selepas 1–2 minit, laman anda siap:
   - **Untuk rakyat:** `https://<username>.github.io/<nama-repo>/`
   - **Untuk staf:** `https://<username>.github.io/<nama-repo>/admin.html`

Kongsi link rakyat di WhatsApp, Facebook dan poster (boleh jadikan kod QR). Di telefon, pengguna boleh pilih **Add to Home Screen** supaya ia nampak seperti app.

---

## Soalan lazim

**Jika saya ubah `Code.gs` selepas ini?**
Pilih **Deploy → Manage deployments**, tekan ✏️, pilih *Version: New version*, kemudian **Deploy**. URL kekal sama.

**Di mana data disimpan?**
Dalam Google Sheet anda, iaitu tab `Aduan` dan `Log`. Anda boleh buka, tapis, buat pivot dan cetak terus dari Sheet. Elakkan menukar susunan lajur atau tajuk baris pertama.

**Adakah data pengadu selamat?**
- Halaman awam hanya memaparkan status, dan hanya jika seseorang tahu **no. rujukan + 4 digit terakhir telefon**.
- Nama, telefon dan nota dalaman hanya boleh dilihat dalam panel staf (perlu kata laluan) atau dalam Sheet.
- Jangan kongsi Sheet secara umum. Kongsi dengan staf sahaja melalui butang *Share* Google.

**Spam?**
Borang ada perangkap bot ringkas. Jika ada aduan palsu, padam baris itu terus dalam Sheet.

**Cuba dulu tanpa setup?**
Biarkan `API_URL` kosong. Aplikasi akan berjalan dalam **mod demo** (data dalam pelayar sahaja, kata laluan staf `demo`).
