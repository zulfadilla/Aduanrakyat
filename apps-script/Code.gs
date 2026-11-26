/**
 * YB Kasi Setel — backend Google Apps Script (berbilang YB).
 * Pasang dalam Google Sheet: Extensions > Apps Script, tampal fail ini, kemudian ikut PANDUAN-SETUP.md.
 *
 * Tab "Akaun"  : senarai YB. Satu baris = satu YB (kod, nama, kawasan, kata_laluan, aktif).
 * Tab "Aduan"  : semua aduan; lajur "yb" menentukan aduan itu milik YB mana.
 * Tab "Log"    : log progres setiap aduan.
 * Script property ADMIN_PASSWORD = kata laluan Pentadbir (nampak semua YB).
 */

var COLS = ['no', 'tarikh', 'nama', 'telefon', 'kawasan', 'kategori', 'tajuk', 'butiran', 'saluran',
  'keutamaan', 'status', 'agensi', 'pegawai', 'tarikhSelesai', 'kemaskini', 'yb'];
var LOG_COLS = ['no', 'masa', 'mesej', 'awam'];
var AKAUN_COLS = ['kod', 'nama', 'kawasan', 'kata_laluan', 'aktif'];
var STATUS = { baru: 'Baru Diterima', tindakan: 'Dalam Tindakan', agensi: 'Menunggu Agensi', selesai: 'Job Done ✓' };
var EDITABLE = ['nama', 'telefon', 'kawasan', 'kategori', 'tajuk', 'butiran', 'saluran', 'keutamaan', 'agensi', 'pegawai', 'tarikh'];
var MAXLEN = { butiran: 3000, tajuk: 200 };

function doGet() {
  return out({ ok: true, app: 'YB Kasi Setel', mesej: 'Backend berjalan.' });
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'Permintaan tidak sah.' }); }
  try {
    return out(handle(req));
  } catch (err) {
    return out({ ok: false, error: String(err && err.message || err) });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handle(r) {
  var s;
  switch (r.action) {
    case 'senarai': return { ok: true, yb: akaunList().map(pubAkaun) };
    case 'submit': return submit(r.data || {}, false, requireYb(r.yb).kod);
    case 'status': return statusCheck(r.no, r.phone4);
    case 'login': s = auth(r); return { ok: true, pentadbir: s.pentadbir, yb: s.akaun ? pubAkaun(s.akaun) : null };
    case 'list': s = auth(r); return { ok: true, items: listAll(s) };
    case 'create':
      s = auth(r);
      return submit(r.data || {}, true, s.pentadbir ? requireYb((r.data || {}).yb).kod : s.akaun.kod);
    case 'update': s = auth(r); return update(s, r.no, r.data || {});
    case 'log': s = auth(r); return addLogAction(s, r.no, r.mesej, !!r.awam);
  }
  throw new Error('Tindakan tidak dikenali.');
}

// ---------- akaun & keselamatan ----------
function normKod(k) { return String(k || '').trim().toUpperCase(); }

function akaunList() {
  return rows(sheet('Akaun', AKAUN_COLS), AKAUN_COLS)
    .map(function (a) { a.kod = normKod(a.kod); return a; })
    .filter(function (a) { return a.kod && String(a.aktif).trim().toLowerCase() !== 'tidak'; });
}

function pubAkaun(a) { return { kod: a.kod, nama: a.nama, kawasan: a.kawasan }; }

function requireYb(kod) {
  var k = normKod(kod);
  var list = akaunList();
  for (var i = 0; i < list.length; i++) if (list[i].kod === k) return list[i];
  throw new Error('Wakil rakyat tidak dijumpai. Sila pilih kawasan yang betul.');
}

// Pulangkan skop pengguna: { pentadbir: true } atau { pentadbir: false, akaun: {...} }
function auth(r) {
  var pw = String(r.password || '');
  if (normKod(r.yb) === '*') {
    var admin = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
    if (admin && pw === admin) return { pentadbir: true };
  } else {
    var list = akaunList(), k = normKod(r.yb);
    for (var i = 0; i < list.length; i++) {
      if (list[i].kod === k && list[i].kata_laluan && pw === String(list[i].kata_laluan)) return { pentadbir: false, akaun: list[i] };
    }
  }
  Utilities.sleep(1500); // perlahankan cubaan meneka
  throw new Error('Akaun atau kata laluan salah.');
}

function canSee(s, a) { return s.pentadbir || normKod(a.yb) === s.akaun.kod; }

// Simpan setiap nilai sebagai teks: elak formula disuntik, dan kekalkan sifar di depan no. telefon.
function cell(v, key) {
  var s = String(v == null ? '' : v).trim().slice(0, MAXLEN[key] || 300);
  return s ? "'" + s : '';
}

// ---------- akses sheet ----------
function sheet(name, cols) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(cols);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, cols.length).setFontWeight('bold');
  } else if (sh.getLastColumn() < cols.length) {
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold'); // naik taraf tajuk lajur
  }
  return sh;
}

function rows(sh, cols) {
  var values = sh.getDataRange().getValues();
  var res = [];
  for (var i = 1; i < values.length; i++) {
    var o = { _row: i + 1 };
    for (var j = 0; j < cols.length; j++) {
      var v = values[i][j];
      o[cols[j]] = v instanceof Date ? v.toISOString() : String(v == null ? '' : v);
    }
    if (o[cols[0]]) res.push(o);
  }
  return res;
}

function findAduan(no) {
  var key = String(no || '').trim().toLowerCase();
  if (!key) return null;
  var sh = sheet('Aduan', COLS);
  var list = rows(sh, COLS);
  for (var i = 0; i < list.length; i++) if (list[i].no.toLowerCase() === key) return { sh: sh, a: list[i] };
  return null;
}

function findForUser(s, no) {
  var f = findAduan(no);
  if (!f || !canSee(s, f.a)) throw new Error('Aduan tidak dijumpai.');
  return f;
}

function writeAduan(sh, a) {
  sh.getRange(a._row, 1, 1, COLS.length).setValues([COLS.map(function (k) { return cell(a[k], k); })]);
}

function addLog(no, mesej, awam) {
  sheet('Log', LOG_COLS).appendRow([cell(no), cell(new Date().toISOString()), cell(mesej, 'butiran'), awam ? 'ya' : 'tidak']);
}

// ---------- tindakan ----------
function submit(d, isAdmin, kod) {
  if (!isAdmin && d.website) return { ok: true, no: kod + '0000-0000' }; // perangkap bot (honeypot)
  ['nama', 'telefon', 'kawasan', 'tajuk'].forEach(function (k) {
    if (!String(d[k] || '').trim()) throw new Error('Sila lengkapkan semua ruangan wajib.');
  });
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet('Aduan', COLS);
    var prefix = kod + new Date().getFullYear() + '-';
    var max = 0;
    rows(sh, COLS).forEach(function (a) {
      if (a.no.indexOf(prefix) === 0) max = Math.max(max, Number(a.no.slice(prefix.length)) || 0);
    });
    var no = prefix + ('000' + (max + 1)).slice(-4);
    var now = new Date().toISOString();
    var a = {
      no: no, tarikh: isAdmin && d.tarikh ? d.tarikh : now, nama: d.nama, telefon: d.telefon, kawasan: d.kawasan,
      kategori: d.kategori || 'Lain-lain', tajuk: d.tajuk, butiran: d.butiran || '',
      saluran: isAdmin ? (d.saluran || 'Walk-in / Pejabat') : 'Borang dalam talian',
      keutamaan: isAdmin ? (d.keutamaan || 'Sederhana') : 'Sederhana', status: 'baru',
      agensi: isAdmin ? (d.agensi || '') : '', pegawai: isAdmin ? (d.pegawai || '') : '', tarikhSelesai: '', kemaskini: now, yb: kod
    };
    sh.appendRow(COLS.map(function (k) { return cell(a[k], k); }));
    addLog(no, 'Aduan diterima melalui ' + a.saluran, true);
    return { ok: true, no: no };
  } finally {
    lock.releaseLock();
  }
}

function statusCheck(no, phone4) {
  var f = findAduan(no);
  var p4 = String(phone4 || '').replace(/\D/g, '');
  if (!f || p4.length !== 4 || f.a.telefon.replace(/\D/g, '').slice(-4) !== p4) {
    Utilities.sleep(800);
    throw new Error('Aduan tidak dijumpai. Semak semula no. rujukan dan 4 digit terakhir telefon.');
  }
  var a = f.a;
  var log = rows(sheet('Log', LOG_COLS), LOG_COLS)
    .filter(function (l) { return l.no === a.no && l.awam === 'ya'; })
    .map(function (l) { return { masa: l.masa, mesej: l.mesej }; });
  var yb = null;
  akaunList().forEach(function (x) { if (x.kod === normKod(a.yb)) yb = pubAkaun(x); });
  return {
    ok: true, log: log, yb: yb,
    item: { no: a.no, tarikh: a.tarikh, kawasan: a.kawasan, kategori: a.kategori, tajuk: a.tajuk,
      status: a.status, agensi: a.agensi, tarikhSelesai: a.tarikhSelesai }
  };
}

function listAll(s) {
  var items = rows(sheet('Aduan', COLS), COLS).filter(function (a) { return canSee(s, a); });
  var mine = {};
  items.forEach(function (a) { mine[a.no] = true; });
  var logs = {};
  rows(sheet('Log', LOG_COLS), LOG_COLS).forEach(function (l) {
    if (mine[l.no]) (logs[l.no] = logs[l.no] || []).push({ masa: l.masa, mesej: l.mesej, awam: l.awam === 'ya' });
  });
  return items.map(function (a) {
    delete a._row;
    a.yb = normKod(a.yb);
    a.log = logs[a.no] || [];
    return a;
  });
}

function update(s, no, d) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var f = findForUser(s, no);
    var a = f.a, changed = false;
    EDITABLE.forEach(function (k) {
      if (k in d && String(d[k]) !== a[k]) { a[k] = String(d[k]); changed = true; }
    });
    if (s.pentadbir && d.yb && normKod(d.yb) !== normKod(a.yb)) { a.yb = requireYb(d.yb).kod; changed = true; }
    if (changed) addLog(a.no, 'Maklumat aduan dikemaskini', false);
    if (d.status && d.status !== a.status && STATUS[d.status]) {
      a.status = d.status;
      a.tarikhSelesai = d.status === 'selesai' ? new Date().toISOString() : '';
      addLog(a.no, 'Status ditukar kepada "' + STATUS[d.status] + '"', true);
    }
    a.kemaskini = new Date().toISOString();
    writeAduan(f.sh, a);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function addLogAction(s, no, mesej, awam) {
  var m = String(mesej || '').trim();
  if (!m) throw new Error('Mesej kosong.');
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var f = findForUser(s, no);
    addLog(f.a.no, m, awam);
    if (f.a.status === 'baru') {
      f.a.status = 'tindakan';
      addLog(f.a.no, 'Status ditukar kepada "' + STATUS.tindakan + '"', true);
    }
    f.a.kemaskini = new Date().toISOString();
    writeAduan(f.sh, f.a);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/** Jalankan sekali dari editor (pilih "setup" > Run) untuk cipta/naik taraf tab dan beri kebenaran. */
function setup() {
  sheet('Aduan', COLS);
  sheet('Log', LOG_COLS);
  var ak = sheet('Akaun', AKAUN_COLS);
  if (ak.getLastRow() < 2) ak.appendRow(['CONTOH', 'YB Contoh', 'DUN Contoh', 'tukar-kata-laluan-ini', 'tidak']);
  var pw = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  Logger.log('Siap. Isi tab "Akaun" dengan senarai YB.' + (pw ? '' : ' JANGAN LUPA tetapkan ADMIN_PASSWORD (Pentadbir).'));
}
