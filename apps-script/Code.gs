/**
 * YB Kasi Setel — backend Google Apps Script.
 * Pasang dalam Google Sheet: Extensions > Apps Script, tampal fail ini, kemudian ikut PANDUAN-SETUP.md.
 *
 * Kata laluan staf disimpan dalam Project Settings > Script properties: ADMIN_PASSWORD
 * Tab "Aduan" dan "Log" dicipta automatik pada permintaan pertama.
 */

var COLS = ['no', 'tarikh', 'nama', 'telefon', 'kawasan', 'kategori', 'tajuk', 'butiran', 'saluran',
  'keutamaan', 'status', 'agensi', 'pegawai', 'tarikhSelesai', 'kemaskini'];
var LOG_COLS = ['no', 'masa', 'mesej', 'awam'];
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
  switch (r.action) {
    case 'submit': return submit(r.data || {}, false);
    case 'status': return statusCheck(r.no, r.phone4);
    case 'login': requireAdmin(r); return { ok: true };
    case 'list': requireAdmin(r); return { ok: true, items: listAll() };
    case 'create': requireAdmin(r); return submit(r.data || {}, true);
    case 'update': requireAdmin(r); return update(r.no, r.data || {});
    case 'log': requireAdmin(r); return addLogAction(r.no, r.mesej, !!r.awam);
  }
  throw new Error('Tindakan tidak dikenali.');
}

// ---------- keselamatan ----------
function requireAdmin(r) {
  var pw = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!pw) throw new Error('Kata laluan staf belum ditetapkan (Script property ADMIN_PASSWORD).');
  if (String(r.password || '') !== pw) {
    Utilities.sleep(1500); // perlahankan cubaan meneka
    throw new Error('Kata laluan salah.');
  }
}

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

function writeAduan(sh, a) {
  sh.getRange(a._row, 1, 1, COLS.length).setValues([COLS.map(function (k) { return cell(a[k], k); })]);
}

function addLog(no, mesej, awam) {
  sheet('Log', LOG_COLS).appendRow([cell(no), cell(new Date().toISOString()), cell(mesej, 'butiran'), awam ? 'ya' : 'tidak']);
}

// ---------- tindakan ----------
function submit(d, isAdmin) {
  if (!isAdmin && d.website) return { ok: true, no: 'A0000-0000' }; // perangkap bot (honeypot)
  ['nama', 'telefon', 'kawasan', 'tajuk'].forEach(function (k) {
    if (!String(d[k] || '').trim()) throw new Error('Sila lengkapkan semua ruangan wajib.');
  });
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet('Aduan', COLS);
    var y = new Date().getFullYear();
    var prefix = 'A' + y + '-';
    var max = 0;
    rows(sh, COLS).forEach(function (a) {
      if (a.no.indexOf(prefix) === 0) max = Math.max(max, Number(a.no.split('-')[1]) || 0);
    });
    var no = prefix + ('000' + (max + 1)).slice(-4);
    var now = new Date().toISOString();
    var a = {
      no: no, tarikh: isAdmin && d.tarikh ? d.tarikh : now, nama: d.nama, telefon: d.telefon, kawasan: d.kawasan,
      kategori: d.kategori || 'Lain-lain', tajuk: d.tajuk, butiran: d.butiran || '',
      saluran: isAdmin ? (d.saluran || 'Walk-in / Pejabat') : 'Borang dalam talian',
      keutamaan: isAdmin ? (d.keutamaan || 'Sederhana') : 'Sederhana', status: 'baru',
      agensi: isAdmin ? (d.agensi || '') : '', pegawai: isAdmin ? (d.pegawai || '') : '', tarikhSelesai: '', kemaskini: now
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
  return {
    ok: true, log: log,
    item: { no: a.no, tarikh: a.tarikh, kawasan: a.kawasan, kategori: a.kategori, tajuk: a.tajuk,
      status: a.status, agensi: a.agensi, tarikhSelesai: a.tarikhSelesai }
  };
}

function listAll() {
  var logs = {};
  rows(sheet('Log', LOG_COLS), LOG_COLS).forEach(function (l) {
    (logs[l.no] = logs[l.no] || []).push({ masa: l.masa, mesej: l.mesej, awam: l.awam === 'ya' });
  });
  return rows(sheet('Aduan', COLS), COLS).map(function (a) {
    delete a._row;
    a.log = logs[a.no] || [];
    return a;
  });
}

function update(no, d) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var f = findAduan(no);
    if (!f) throw new Error('Aduan tidak dijumpai.');
    var a = f.a, changed = false;
    EDITABLE.forEach(function (k) {
      if (k in d && String(d[k]) !== a[k]) { a[k] = String(d[k]); changed = true; }
    });
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

function addLogAction(no, mesej, awam) {
  var m = String(mesej || '').trim();
  if (!m) throw new Error('Mesej kosong.');
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var f = findAduan(no);
    if (!f) throw new Error('Aduan tidak dijumpai.');
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

/** Jalankan sekali dari editor (pilih "setup" > Run) untuk cipta tab dan beri kebenaran. */
function setup() {
  sheet('Aduan', COLS);
  sheet('Log', LOG_COLS);
  var pw = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  Logger.log(pw ? 'Siap. ADMIN_PASSWORD sudah ditetapkan.' : 'Siap. JANGAN LUPA tetapkan ADMIN_PASSWORD dalam Script properties.');
}
