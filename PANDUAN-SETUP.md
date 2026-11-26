# Panduan Setup — YB Kasi Setel (±15 minit, sekali sahaja)

Anda perlukan: satu akaun Google (sebaik-baiknya akaun pejabat/penyelaras) dan akses ke repo GitHub ini.

```
Rakyat (telefon/PC) ──► index.html?yb=bm ──┐
                                           ├──► Google Apps Script ──► Google Sheet
Staf YB  ──────────► admin.html ───────────┘        (tab Akaun, Aduan, Log)
```

Satu sistem untuk **ramai YB**. Setiap YB ada akaun, link awam dan kata laluan sendiri, dan hanya nampak aduan kawasannya.
**Pentadbir** (penyelaras) boleh nampak semua YB.

> **Sudah setup versi lama (satu YB)?** Lompat ke [Naik taraf ke berbilang YB](#naik-taraf-ke-berbilang-yb).

---

## Langkah 1 — Cipta Google Sheet
1. Buka <https://sheets.google.com> dan cipta **Blank spreadsheet**.
2. Namakan, cth. `Aduan Rakyat - Pejabat YB`.

## Langkah 2 — Tampal kod backend
1. Dalam Sheet itu, pergi ke menu **Extensions → Apps Script**.
2. Padam semua kod sedia ada dalam `Code.gs`.
3. Salin **seluruh** kandungan fail [`apps-script/Code.gs`](apps-script/Code.gs) dari repo ini, kemudian tampal.
4. Tekan ikon 💾 **Save**.

## Langkah 3 — Tetapkan kata laluan Pentadbir
1. Di sebelah kiri editor Apps Script, tekan ⚙️ **Project Settings**.
2. Skrol ke bawah ke **Script properties**, kemudian tekan **Add script property**.
   - Property: `ADMIN_PASSWORD`
   - Value: kata laluan yang **panjang dan susah diteka** (cth. `Penyelaras-Kasi-Setel-2026!`)
3. Tekan **Save script properties**.

> Kata laluan ini untuk **Pentadbir** sahaja, iaitu orang yang boleh nampak aduan semua YB. Jangan beri kepada staf YB.

## Langkah 4 — Jalankan setup sekali
1. Kembali ke **Editor** (ikon `< >`).
2. Di bar atas, pilih fungsi **`setup`**, kemudian tekan **Run**.
3. Google akan minta kebenaran: pilih **Review permissions**, pilih akaun anda, tekan **Advanced**, kemudian **Go to … (unsafe)**, dan akhir sekali **Allow**.
   (Amaran ini biasa untuk skrip yang anda tulis sendiri.)
4. Semak Sheet: tab **Akaun**, **Aduan**, **Log** dan **Lampiran** telah dicipta. Folder **YB Kasi Setel - Lampiran** juga dicipta dalam Google Drive anda, untuk simpan gambar dan video aduan.

## Langkah 4b — Daftar YB dalam tab `Akaun`
Satu baris = satu YB. Baris `CONTOH` boleh dipadam.

| kod | nama | kawasan | kata_laluan | aktif |
|---|---|---|---|---|
| `BM` | YB Ahmad bin Ali | DUN Bukit Merah | `BukitMerah-Kuat-2026` | ya |
| `SD` | YB Siti binti Omar | DUN Sungai Durian | `SgDurian#Maju88` | ya |

- **kod**: singkatan pendek, huruf/nombor sahaja, **jangan tukar selepas digunakan**. Ia digunakan untuk:
  - link awam YB itu: `…/aduan/?yb=bm`
  - awalan no. rujukan: `BM2026-0001`
- **kata_laluan**: kata laluan panel staf untuk YB itu. Setiap YB mesti berbeza.
- **aktif**: isi `tidak` untuk sembunyikan YB tersebut, contohnya selepas tamat penggal. Datanya kekal.

Untuk tambah YB baru pada bila-bila masa, cuma tambah satu baris. Tak perlu deploy semula.

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
   - **Link umum (rakyat pilih kawasan):** `https://<username>.github.io/<nama-repo>/`
   - **Link khas setiap YB:** `https://<username>.github.io/<nama-repo>/?yb=bm`. Nama YB terpapar di atas dan rakyat tak perlu memilih.
   - **Panel staf:** `https://<username>.github.io/<nama-repo>/admin.html`. Pilih akaun YB atau *Pentadbir*, kemudian masukkan kata laluan.

Setiap YB kongsi **link khas** mereka di WhatsApp, Facebook dan poster (boleh jadikan kod QR). Dalam panel staf ada butang **Link awam** untuk salin link tersebut.
Di telefon, pengguna boleh pilih **Add to Home Screen** supaya ia nampak seperti app.

### Link pendek setiap YB
Setiap YB boleh guna link pendek: tambah **kod YB** selepas alamat laman.
- `https://<username>.github.io/<nama-repo>/bm`
- `https://aduanmelaka.pages.dev/bm` (jika guna Cloudflare, lihat di bawah)

Link ini akan terus membuka borang untuk YB tersebut. Butang **Link awam** dalam panel staf menyalin link pendek ini.

---

## Pilihan: Hos di Cloudflare Pages (percuma, link lebih pendek)
Ganti GitHub Pages dengan Cloudflare jika mahu link seperti `aduanmelaka.pages.dev` atau domain sendiri. Repo boleh kekal private.
1. Daftar atau log masuk di <https://dash.cloudflare.com>.
2. Pergi ke **Workers & Pages → Create → Pages → Connect to Git**, kemudian sambungkan akaun GitHub dan pilih repo ini.
3. Tetapan build:
   - **Project name:** nama link anda, cth. `aduanmelaka`. Link jadi `aduanmelaka.pages.dev`.
   - **Production branch:** `main`
   - **Framework preset:** `None`
   - **Build command:** *(biarkan kosong)*
   - **Build output directory:** `/`
4. Tekan **Save and Deploy**. Selepas ±1 minit, laman siap di `https://aduanmelaka.pages.dev`.
5. Setiap kali `main` dikemas kini, Cloudflare akan deploy semula secara automatik.

**Domain sendiri (pilihan):**
- Beli domain di Cloudflare (**Domain Registration → Register Domains**), cth. `aduanmelaka.com`. Domain `.my` perlu dibeli di penjual tempatan.
- Dalam projek Pages, pergi ke **Custom domains → Set up a custom domain** dan masukkan domain tersebut. Jika domain dibeli di Cloudflare, DNS ditetapkan secara automatik.

> Jika sudah guna Cloudflare, GitHub Pages boleh dimatikan (**Settings → Pages → Unpublish**) supaya tiada dua link berbeza.

## Naik taraf (setiap kali `Code.gs` berubah)
1. Gantikan seluruh `Code.gs` dalam Apps Script dengan versi terbaru, kemudian **Save**.
2. Pilih **`setup`** dan tekan **Run**. Jika Google minta kebenaran baru, contohnya untuk **Google Drive** (diperlukan untuk gambar/video), tekan **Allow**.
3. Pergi ke **Deploy → Manage deployments**, tekan ✏️, pilih **New version**, kemudian **Deploy**.
4. Baru gabungkan kod laman web baharu ke `main`.

## Naik taraf ke berbilang YB
Untuk yang sudah deploy versi satu-YB:
1. Buka **Extensions → Apps Script**, gantikan seluruh `Code.gs` dengan versi baru dari repo, kemudian **Save**.
2. Pilih fungsi **`setup`** dan tekan **Run**. Tab `Akaun` akan dicipta dan lajur `yb` ditambah pada tab `Aduan`.
3. Isi tab `Akaun` (lihat Langkah 4b).
4. Pilih **Deploy → Manage deployments**, tekan ✏️, pilih *Version: New version*, kemudian **Deploy**. URL kekal sama, jadi `config.js` tak perlu diubah.
5. Baru gabungkan kod laman web baharu ke `main`.
6. `ADMIN_PASSWORD` lama kini menjadi kata laluan **Pentadbir**.
7. Aduan lama yang belum ada YB hanya nampak kepada Pentadbir. Pentadbir boleh buka aduan itu, tekan **Edit maklumat**, dan pilih YB. Atau isi lajur `yb` terus dalam Sheet.

## Soalan lazim

**Jika saya ubah `Code.gs` selepas ini?**
Pilih **Deploy → Manage deployments**, tekan ✏️, pilih *Version: New version*, kemudian **Deploy**. URL kekal sama.

**Di mana data disimpan?**
Dalam Google Sheet anda, iaitu tab `Aduan` dan `Log`. Anda boleh buka, tapis, buat pivot dan cetak terus dari Sheet. Elakkan menukar susunan lajur atau tajuk baris pertama.

**YB A boleh nampak aduan YB B?**
Tidak. Semakan dibuat di backend: akaun YB hanya boleh baca dan ubah aduan yang lajur `yb`nya sama dengan kod YB itu.
Tetapi **pemilik Google Sheet** (Pentadbir) boleh nampak semua data dan kata laluan semua YB. Jika seorang YB mahu data yang terasing sepenuhnya, dia boleh setup salinan sendiri: Sheet sendiri, satu baris dalam `Akaun`, dan repo atau `config.js` sendiri.

**Adakah data pengadu selamat?**
- Halaman awam hanya memaparkan status, dan hanya jika seseorang tahu **no. rujukan + 4 digit terakhir telefon**.
- Nama, telefon dan nota dalaman hanya boleh dilihat dalam panel staf (perlu kata laluan) atau dalam Sheet.
- Jangan kongsi Sheet secara umum. Kongsi dengan staf sahaja melalui butang *Share* Google.

**Gambar dan video disimpan di mana?**
Dalam Google Drive pemilik Sheet, di folder `YB Kasi Setel - Lampiran`, dengan satu subfolder bagi setiap no. aduan. Senarainya ada dalam tab `Lampiran`.
- Rakyat boleh hantar sehingga **5 fail** bagi setiap aduan, dalam masa 30 minit selepas aduan dihantar. Gambar dikecilkan secara automatik. Video maksimum **25 MB** (±1 minit).
- Staf boleh tambah gambar sendiri, contohnya gambar "selepas siap", dari panel staf.
- Fail dikongsi sebagai *sesiapa yang ada link boleh lihat* supaya staf boleh membukanya. Link hanya dipaparkan dalam panel staf dan Sheet, dan tidak dipaparkan di halaman awam.
- Drive percuma ada had 15 GB. Padam folder aduan lama jika ruang hampir penuh.

**Spam?**
Borang ada perangkap bot ringkas. Jika ada aduan palsu, padam baris itu terus dalam Sheet.

**Cuba dulu tanpa setup?**
Biarkan `API_URL` kosong. Aplikasi akan berjalan dalam **mod demo** (data dalam pelayar sahaja). Akaun demo: Bukit Merah / `demo`, Sungai Durian / `demo2`, Pentadbir / `admin`.
