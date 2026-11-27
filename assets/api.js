// Pustaka kongsi: senarai status/kategori, utiliti paparan, dan sambungan ke Google Apps Script.
// Jika API_URL kosong, aplikasi berjalan dalam MOD DEMO (data dalam pelayar ini sahaja).
window.YB = (() => {
  const cfg = window.YB_CONFIG || {};
  const API_URL = String(cfg.API_URL || '').trim();
  const demo = !API_URL;

  const STATUS = [
    { id: 'baru', label: 'Baru Diterima', color: 'var(--baru)' },
    { id: 'tindakan', label: 'Dalam Tindakan', color: 'var(--tindakan)' },
    { id: 'agensi', label: 'Menunggu Agensi', color: 'var(--agensi)' },
    { id: 'selesai', label: 'Job Done ✓', color: 'var(--selesai)' },
  ];
  const KATEGORI = ['Jalan & Infrastruktur', 'Lampu Jalan', 'Longkang & Banjir', 'Sampah & Kebersihan', 'Air', 'Elektrik',
    'Kebajikan & Bantuan', 'Perumahan', 'Kesihatan', 'Pendidikan', 'Keselamatan', 'Tanah', 'Kemudahan Awam', 'Lain-lain'];

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SPAM = { id: 'spam', label: 'Spam / Tidak sah', color: 'var(--rendah)' };
  const st = id => STATUS.find(s => s.id === id) || (id === 'spam' ? SPAM : STATUS[0]);
  const today = () => new Date().toISOString().slice(0, 10);
  const valid = d => d && !isNaN(new Date(d));
  const fmtDate = d => valid(d) ? new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const fmtTime = d => valid(d) ? new Date(d).toLocaleString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const daysSince = d => valid(d) ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : 0;
  const waLink = tel => 'https://wa.me/' + String(tel || '').replace(/\D/g, '').replace(/^0/, '60');

  function applyBranding() {
    document.querySelectorAll('[data-brand=tajuk]').forEach(el => el.textContent = cfg.TAJUK || 'Aduan Rakyat');
    document.querySelectorAll('[data-brand=subtajuk]').forEach(el => el.textContent = cfg.SUBTAJUK || 'Negeri Melaka');
    if (cfg.TAJUK) document.title = document.title.replace('Aduan Rakyat', cfg.TAJUK);
    const b = document.getElementById('demoBanner');
    if (b) b.hidden = !demo;
  }

  async function call(action, payload = {}) {
    let res;
    if (demo) {
      await new Promise(r => setTimeout(r, 120));
      res = mock(action, payload);
    } else {
      try {
        const r = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // elak CORS preflight
          body: JSON.stringify({ action, ...payload }),
        });
        res = await r.json();
      } catch {
        throw new Error('Tidak dapat berhubung dengan pelayan. Semak internet dan cuba lagi.');
      }
    }
    if (!res || !res.ok) throw new Error((res && res.error) || 'Ralat tidak diketahui.');
    return res;
  }

  // ---------- MOD DEMO: meniru logik apps-script/Code.gs dalam localStorage ----------
  // Akaun demo: BM / demo, SD / demo2, Pentadbir (*) / admin
  const MK = 'ybkasisetel.demo.v3';
  const DEMO_YB = [
    { kod: 'BM', nama: 'YB Ahmad (Demo)', kawasan: 'DUN Bukit Merah', pw: 'demo' },
    { kod: 'SD', nama: 'YB Siti (Demo)', kawasan: 'DUN Sungai Durian', pw: 'demo2' },
  ];
  const pubYb = y => y && { kod: y.kod, nama: y.nama, kawasan: y.kawasan };
  function mock(action, r) {
    let db;
    try { db = JSON.parse(localStorage.getItem(MK)) || {}; } catch { db = {}; }
    db.aduan ||= []; db.log ||= []; db.lamp ||= []; db.sekat ||= [];
    const normTel = t => { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('60')) d = d.slice(2); return d && d[0] !== '0' ? '0' + d : d; };
    const saveDb = () => { try { localStorage.setItem(MK, JSON.stringify(db)); } catch {} };
    const now = () => new Date().toISOString();
    const norm = k => String(k || '').trim().toUpperCase();
    const ybOf = k => { const y = DEMO_YB.find(x => x.kod === norm(k)); if (!y) throw new Error('Wakil rakyat tidak dijumpai. Sila pilih kawasan yang betul.'); return y; };
    const addLog = (no, mesej, awam = true) => db.log.push({ no, masa: now(), mesej, awam });
    const auth = () => {
      if (norm(r.yb) === '*' && r.password === 'admin') return { pentadbir: true };
      const y = DEMO_YB.find(x => x.kod === norm(r.yb));
      if (y && r.password === y.pw) return { pentadbir: false, akaun: y };
      throw new Error('Akaun atau kata laluan salah. (Demo: BM/demo, SD/demo2, Pentadbir/admin)');
    };
    const canSee = (s, a) => s.pentadbir || a.yb === s.akaun.kod;
    const findFor = (s, no) => {
      const a = db.aduan.find(x => x.no.toLowerCase() === String(no || '').trim().toLowerCase());
      if (!a || !canSee(s, a)) throw new Error('Aduan tidak dijumpai.');
      return a;
    };
    try {
      switch (action) {
        case 'senarai': return { ok: true, yb: DEMO_YB.map(pubYb) };
        case 'submit':
        case 'create': {
          const isAdmin = action === 'create';
          const d = r.data || {};
          let kod;
          if (isAdmin) { const s = auth(); kod = s.pentadbir ? ybOf(d.yb).kod : s.akaun.kod; }
          else kod = ybOf(r.yb).kod;
          if (!isAdmin && d.website) return { ok: true, no: kod + '0000-0000', uploadToken: 'x' };
          for (const k of ['nama', 'telefon', 'kawasan', 'tajuk'])
            if (!String(d[k] || '').trim()) throw new Error('Sila lengkapkan semua ruangan wajib.');
          const tel = normTel(d.telefon);
          let bendera = '';
          if (!isAdmin) {
            if (db.sekat.includes(tel)) throw new Error('Aduan tidak dapat diterima dari nombor ini. Sila hubungi pejabat YB secara terus.');
            const recent = db.aduan.filter(a => a.saluran === 'Borang dalam talian' && normTel(a.telefon) === tel && Date.now() - new Date(a.tarikh) < 864e5).length;
            if (recent >= 3) throw new Error(`Nombor ini telah menghantar ${recent} aduan dalam 24 jam. Sila cuba lagi esok, atau hubungi pejabat YB jika kecemasan.`);
            const pk = String(d.poskod || '').replace(/\D/g, '');
            if (pk) bendera = pk.length !== 5 ? 'Poskod tidak sah' : !/^7[5-8]/.test(pk) ? 'Poskod di luar negeri' : '';
          }
          const prefix = kod + new Date().getFullYear() + '-';
          const n = db.aduan.filter(a => a.no.startsWith(prefix)).map(a => +a.no.slice(prefix.length)).reduce((m, x) => Math.max(m, x), 0) + 1;
          const no = prefix + String(n).padStart(4, '0');
          const a = {
            no, tarikh: isAdmin && d.tarikh ? d.tarikh : now(), nama: d.nama, telefon: d.telefon, kawasan: d.kawasan,
            kategori: d.kategori || 'Lain-lain', tajuk: d.tajuk, butiran: d.butiran || '',
            saluran: isAdmin ? (d.saluran || 'Walk-in / Pejabat') : 'Borang dalam talian',
            keutamaan: isAdmin ? (d.keutamaan || 'Sederhana') : 'Sederhana', status: 'baru',
            agensi: isAdmin ? d.agensi || '' : '', pegawai: isAdmin ? d.pegawai || '' : '', tarikhSelesai: '', kemaskini: now(), yb: kod,
            poskod: String(d.poskod || '').replace(/\D/g, '').slice(0, 5), lat: d.lat ?? '', lng: d.lng ?? '', bendera,
          };
          db.aduan.push(a);
          addLog(no, `Aduan diterima melalui ${a.saluran}`);
          saveDb();
          return { ok: true, no, uploadToken: 'demo:' + no };
        }
        case 'status': {
          const a = db.aduan.find(x => x.no.toLowerCase() === String(r.no || '').trim().toLowerCase());
          const p4 = String(r.phone4 || '').replace(/\D/g, '');
          if (!a || p4.length !== 4 || String(a.telefon).replace(/\D/g, '').slice(-4) !== p4)
            throw new Error('Aduan tidak dijumpai. Semak semula no. rujukan dan 4 digit terakhir telefon.');
          return { ok: true, item: pub(a), yb: pubYb(DEMO_YB.find(y => y.kod === a.yb)), log: db.log.filter(l => l.no === a.no && l.awam) };
        }
        case 'login': { const s = auth(); return { ok: true, pentadbir: s.pentadbir, yb: pubYb(s.akaun) || null }; }
        case 'list': {
          const s = auth();
          return { ok: true, items: db.aduan.filter(a => canSee(s, a)).map(a => ({ ...a,
            log: db.log.filter(l => l.no === a.no), lampiran: db.lamp.filter(l => l.no === a.no) })) };
        }
        case 'update': {
          const s = auth();
          const a = findFor(s, r.no);
          const d = r.data || {};
          let changed = false;
          for (const k of ['nama', 'telefon', 'kawasan', 'kategori', 'tajuk', 'butiran', 'saluran', 'keutamaan', 'agensi', 'pegawai', 'tarikh'])
            if (k in d && String(d[k]) !== String(a[k])) { a[k] = d[k]; changed = true; }
          if (s.pentadbir && d.yb && norm(d.yb) !== a.yb) { a.yb = ybOf(d.yb).kod; changed = true; }
          if (changed) addLog(a.no, 'Maklumat aduan dikemaskini', false);
          if (d.status && d.status !== a.status && (STATUS.some(x => x.id === d.status) || d.status === 'spam')) {
            a.status = d.status;
            a.tarikhSelesai = d.status === 'selesai' ? now() : '';
            addLog(a.no, `Status ditukar kepada "${st(d.status).label}"`, d.status !== 'spam');
          }
          a.kemaskini = now(); saveDb();
          return { ok: true };
        }
        case 'log': {
          const s = auth();
          const a = findFor(s, r.no);
          const m = String(r.mesej || '').trim(); if (!m) throw new Error('Mesej kosong.');
          addLog(a.no, m, !!r.awam);
          if (a.status === 'baru') { a.status = 'tindakan'; addLog(a.no, `Status ditukar kepada "${st('tindakan').label}"`); }
          a.kemaskini = now(); saveDb();
          return { ok: true };
        }
        case 'sekat': {
          const s = auth();
          const a = findFor(s, r.no);
          const tel = normTel(a.telefon);
          if (tel && !db.sekat.includes(tel)) db.sekat.push(tel);
          a.status = 'spam'; a.tarikhSelesai = '';
          addLog(a.no, `Ditanda spam & nombor ${tel} disekat` + (r.sebab ? ': ' + r.sebab : ''), false);
          a.kemaskini = now(); saveDb();
          return { ok: true };
        }
        case 'upload': {
          let no, oleh;
          if (r.token) {
            no = String(r.token).startsWith('demo:') ? r.token.slice(5) : null;
            if (!no) throw new Error('Tempoh muat naik tamat.');
            oleh = 'pengadu';
          } else { no = findFor(auth(), r.no).no; oleh = 'staf'; }
          if (!/^(image|video)\//.test(r.type || '')) throw new Error('Hanya gambar atau video dibenarkan.');
          const count = db.lamp.filter(l => l.no === no).length;
          if (count >= (oleh === 'pengadu' ? 5 : 15)) throw new Error('Had bilangan lampiran telah dicapai.');
          // Demo: simpan fail kecil sahaja (had storan pelayar)
          const url = r.data.length < 400000 ? `data:${r.type};base64,${r.data}` : '';
          db.lamp.push({ no, masa: now(), nama: r.name, jenis: r.type, fileId: '', url, oleh });
          if (oleh === 'staf') addLog(no, 'Lampiran ditambah: ' + r.name, false);
          saveDb();
          return { ok: true };
        }
      }
      throw new Error('Tindakan tidak dikenali.');
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
  const pub = a => ({ no: a.no, tarikh: a.tarikh, kawasan: a.kawasan, kategori: a.kategori, tajuk: a.tajuk,
    status: a.status, agensi: a.agensi, tarikhSelesai: a.tarikhSelesai });

  // ---------- lampiran ----------
  const MAX_VIDEO = 25 * 1024 * 1024;
  const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.ceil(b / 1024) + ' KB';
  const toB64 = blob => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1] || '');
    fr.onerror = () => rej(new Error('Gagal membaca fail.'));
    fr.readAsDataURL(blob);
  });
  // Kecilkan gambar (maks 1600px, JPEG) supaya cepat dihantar walaupun data telefon perlahan.
  async function shrinkImage(file) {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)) return file;
    try {
      const url = URL.createObjectURL(file);
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      URL.revokeObjectURL(url);
      const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.naturalWidth * k), height: Math.round(img.naturalHeight * k) });
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.82));
      return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
    } catch { return file; }
  }
  // Semak fail sebelum dihantar; pulangkan mesej ralat atau ''.
  function checkFile(f) {
    if (!/^(image|video)\//.test(f.type)) return `${f.name}: hanya gambar atau video dibenarkan.`;
    if (f.type.startsWith('video/') && f.size > MAX_VIDEO) return `${f.name}: video terlalu besar (${fmtSize(f.size)}). Maksimum 25 MB (±1 minit).`;
    if (f.size > 40 * 1024 * 1024) return `${f.name}: fail terlalu besar.`;
    return '';
  }
  async function uploadFile(file, auth) {
    const f = file.type.startsWith('image/') ? await shrinkImage(file) : file;
    if (f.size > MAX_VIDEO) throw new Error(`${file.name}: fail terlalu besar.`);
    return call('upload', { ...auth, name: f.name, type: f.type, data: await toB64(f) });
  }
  const thumbUrl = l => l.fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(l.fileId)}&sz=w400` : (l.url || '');
  const safeHref = u => /^(https:\/\/|data:(image|video)\/)/.test(String(u || '')) ? u : '';

  // Kod YB daripada URL (?yb=bm)
  const ybParam = () => String(new URLSearchParams(location.search).get('yb') || '').trim().toUpperCase();

  return { fmtSize, checkFile, uploadFile, thumbUrl, safeHref, demo, ybParam, STATUS, SPAM, KATEGORI, esc, st, today, fmtDate, fmtTime, daysSince, waLink, call, applyBranding };
})();
