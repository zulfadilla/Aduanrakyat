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
    'Kebajikan & Bantuan', 'Perumahan', 'Kesihatan', 'Pendidikan', 'Keselamatan', 'Tanah', 'Lain-lain'];

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = id => STATUS.find(s => s.id === id) || STATUS[0];
  const today = () => new Date().toISOString().slice(0, 10);
  const valid = d => d && !isNaN(new Date(d));
  const fmtDate = d => valid(d) ? new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const fmtTime = d => valid(d) ? new Date(d).toLocaleString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const daysSince = d => valid(d) ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : 0;
  const waLink = tel => 'https://wa.me/' + String(tel || '').replace(/\D/g, '').replace(/^0/, '60');

  function applyBranding() {
    document.querySelectorAll('[data-brand=tajuk]').forEach(el => el.textContent = cfg.TAJUK || 'YB Kasi Setel');
    document.querySelectorAll('[data-brand=subtajuk]').forEach(el => el.textContent = cfg.SUBTAJUK || 'Saluran Aduan Rakyat');
    if (cfg.TAJUK) document.title = cfg.TAJUK;
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
  const MK = 'ybkasisetel.demo.v2';
  function mock(action, r) {
    let db;
    try { db = JSON.parse(localStorage.getItem(MK)) || { aduan: [], log: [] }; } catch { db = { aduan: [], log: [] }; }
    const saveDb = () => { try { localStorage.setItem(MK, JSON.stringify(db)); } catch {} };
    const now = () => new Date().toISOString();
    const find = no => db.aduan.find(a => a.no.toLowerCase() === String(no || '').trim().toLowerCase());
    const addLog = (no, mesej, awam = true) => db.log.push({ no, masa: now(), mesej, awam });
    const admin = () => { if (r.password !== 'demo') throw new Error('Kata laluan salah. (Mod demo: guna "demo")'); };
    try {
      switch (action) {
        case 'submit':
        case 'create': {
          const isAdmin = action === 'create';
          if (isAdmin) admin();
          const d = r.data || {};
          if (!isAdmin && d.website) return { ok: true, no: 'A0000-0000' };
          for (const k of ['nama', 'telefon', 'kawasan', 'tajuk'])
            if (!String(d[k] || '').trim()) throw new Error('Sila lengkapkan semua ruangan wajib.');
          const y = new Date().getFullYear();
          const n = db.aduan.filter(a => a.no.startsWith(`A${y}-`)).map(a => +a.no.split('-')[1]).reduce((m, x) => Math.max(m, x), 0) + 1;
          const no = `A${y}-${String(n).padStart(4, '0')}`;
          const a = {
            no, tarikh: isAdmin && d.tarikh ? d.tarikh : now(), nama: d.nama, telefon: d.telefon, kawasan: d.kawasan,
            kategori: d.kategori || 'Lain-lain', tajuk: d.tajuk, butiran: d.butiran || '',
            saluran: isAdmin ? (d.saluran || 'Walk-in / Pejabat') : 'Borang dalam talian',
            keutamaan: isAdmin ? (d.keutamaan || 'Sederhana') : 'Sederhana', status: 'baru',
            agensi: isAdmin ? d.agensi || '' : '', pegawai: isAdmin ? d.pegawai || '' : '', tarikhSelesai: '', kemaskini: now(),
          };
          db.aduan.push(a);
          addLog(no, `Aduan diterima melalui ${a.saluran}`);
          saveDb();
          return { ok: true, no };
        }
        case 'status': {
          const a = find(r.no);
          const p4 = String(r.phone4 || '').replace(/\D/g, '');
          if (!a || p4.length !== 4 || String(a.telefon).replace(/\D/g, '').slice(-4) !== p4)
            throw new Error('Aduan tidak dijumpai. Semak semula no. rujukan dan 4 digit terakhir telefon.');
          return { ok: true, item: pub(a), log: db.log.filter(l => l.no === a.no && l.awam) };
        }
        case 'login': admin(); return { ok: true };
        case 'list':
          admin();
          return { ok: true, items: db.aduan.map(a => ({ ...a, log: db.log.filter(l => l.no === a.no) })) };
        case 'update': {
          admin();
          const a = find(r.no); if (!a) throw new Error('Aduan tidak dijumpai.');
          const d = r.data || {};
          let changed = false;
          for (const k of ['nama', 'telefon', 'kawasan', 'kategori', 'tajuk', 'butiran', 'saluran', 'keutamaan', 'agensi', 'pegawai', 'tarikh'])
            if (k in d && String(d[k]) !== String(a[k])) { a[k] = d[k]; changed = true; }
          if (changed) addLog(a.no, 'Maklumat aduan dikemaskini', false);
          if (d.status && d.status !== a.status && STATUS.some(s => s.id === d.status)) {
            a.status = d.status;
            a.tarikhSelesai = d.status === 'selesai' ? now() : '';
            addLog(a.no, `Status ditukar kepada "${st(d.status).label}"`);
          }
          a.kemaskini = now(); saveDb();
          return { ok: true };
        }
        case 'log': {
          admin();
          const a = find(r.no); if (!a) throw new Error('Aduan tidak dijumpai.');
          const m = String(r.mesej || '').trim(); if (!m) throw new Error('Mesej kosong.');
          addLog(a.no, m, !!r.awam);
          if (a.status === 'baru') { a.status = 'tindakan'; addLog(a.no, `Status ditukar kepada "${st('tindakan').label}"`); }
          a.kemaskini = now(); saveDb();
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

  return { demo, STATUS, KATEGORI, esc, st, today, fmtDate, fmtTime, daysSince, waLink, call, applyBranding };
})();
