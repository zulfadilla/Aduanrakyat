/**
 * YB Kasi Setel — backend Google Apps Script (berbilang YB).
 * Pasang dalam Google Sheet: Extensions > Apps Script, tampal fail ini, kemudian ikut PANDUAN-SETUP.md.
 *
 * Tab "Akaun"  : senarai YB. Satu baris = satu YB (kod, nama, kawasan, kata_laluan, aktif).
 * Tab "Aduan"  : semua aduan; lajur "yb" menentukan aduan itu milik YB mana.
 * Tab "Log"    : log progres setiap aduan.
 * Tab "Lampiran": senarai gambar/video; fail disimpan dalam folder Google Drive "YB Kasi Setel - Lampiran".
 * Tab "Sekatan" : no. telefon yang disekat daripada menghantar aduan.
 * Tab "Dipadam" : rekod aduan yang dipadam oleh staf (siapa & bila) untuk tujuan audit.
 *
 * Script properties:
 *   ADMIN_PASSWORD   = kata laluan Pentadbir (nampak semua YB)
 *   TURNSTILE_SECRET = Secret Key Cloudflare Turnstile (pilihan; anti-bot)
 *   HAD_SEHARI       = had aduan bagi setiap no. telefon dalam 24 jam (lalai 3)
 *   POSKOD_NEGERI    = awalan poskod negeri, dipisah koma (lalai 75,76,77,78 = Melaka)
 */

var COLS = ['no', 'tarikh', 'nama', 'telefon', 'kawasan', 'kategori', 'tajuk', 'butiran', 'saluran',
  'keutamaan', 'status', 'agensi', 'pegawai', 'tarikhSelesai', 'kemaskini', 'yb', 'poskod', 'lat', 'lng', 'bendera'];
var LOG_COLS = ['no', 'masa', 'mesej', 'awam'];
var AKAUN_COLS = ['kod', 'nama', 'kawasan', 'kata_laluan', 'aktif', 'poskod', 'pusat', 'radius_km'];
var SEKATAN_COLS = ['telefon', 'sebab', 'tarikh', 'oleh'];
var DIPADAM_COLS = ['no', 'tajuk', 'nama', 'telefon', 'yb', 'tarikhAduan', 'dipadam', 'oleh', 'sebab'];
var LAMP_COLS = ['no', 'masa', 'nama', 'jenis', 'fileId', 'url', 'oleh'];
var MAX_FILES_AWAM = 5, MAX_FILES = 15, MAX_BYTES = 25 * 1024 * 1024;
var UPLOAD_TTL = 1800; // saat: pengadu boleh muat naik lampiran dalam 30 minit selepas hantar
var STATUS = { baru: 'Baru Diterima', tindakan: 'Dalam Tindakan', agensi: 'Menunggu Agensi', selesai: 'Job Done ✓', spam: 'Spam / Tidak sah' };
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
    case 'upload': return upload(r);
    case 'sekat': s = auth(r); return sekat(s, r.no, r.sebab);
    case 'padam': s = auth(r); return padam(s, r.no, r.sebab);
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

// ---------- anti-spam ----------
function prop(k, dflt) { var v = PropertiesService.getScriptProperties().getProperty(k); return v == null || v === '' ? dflt : v; }

// Seragamkan no. telefon: 6012-345 6789 / +60123456789 / 0123456789 -> 0123456789
function normTel(t) {
  var d = String(t || '').replace(/\D/g, '');
  if (d.indexOf('60') === 0) d = d.slice(2);
  if (d && d.charAt(0) !== '0') d = '0' + d;
  return d;
}

// Lapisan 1: Cloudflare Turnstile (hanya jika TURNSTILE_SECRET ditetapkan)
function verifyTurnstile(token) {
  var secret = prop('TURNSTILE_SECRET', '');
  if (!secret) return;
  if (!token) throw new Error('Sila lengkapkan pengesahan keselamatan sebelum menghantar.');
  var res = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'post', payload: { secret: secret, response: String(token) }, muteHttpExceptions: true
  });
  var j = {};
  try { j = JSON.parse(res.getContentText()); } catch (e) {}
  if (!j.success) throw new Error('Pengesahan keselamatan gagal. Sila muat semula halaman dan cuba lagi.');
}

// Lapisan 3: senarai sekatan
function isBlocked(tel) {
  return rows(sheet('Sekatan', SEKATAN_COLS), SEKATAN_COLS).some(function (r) { return normTel(r.telefon) === tel; });
}

// Lapisan 5: tanda luar kawasan (poskod & GPS). Tidak menolak aduan, hanya menanda untuk disemak staf.
function distanceKm(lat1, lng1, lat2, lng2) {
  var R = 6371, toRad = Math.PI / 180;
  var dLat = (lat2 - lat1) * toRad, dLng = (lng2 - lng1) * toRad;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

function kawasanFlags(d, ak) {
  var flags = [];
  var pk = String(d.poskod || '').replace(/\D/g, '');
  if (pk) {
    var negeri = String(prop('POSKOD_NEGERI', '75,76,77,78')).split(',').map(function (x) { return x.trim(); }).filter(String);
    var dun = String(ak.poskod || '').split(/[,\s]+/).map(function (x) { return x.trim(); }).filter(String);
    if (pk.length !== 5) flags.push('Poskod tidak sah');
    else if (negeri.length && !negeri.some(function (p) { return pk.indexOf(p) === 0; })) flags.push('Poskod di luar negeri');
    else if (dun.length && dun.indexOf(pk) < 0) flags.push('Poskod di luar DUN');
  }
  var lat = Number(d.lat), lng = Number(d.lng);
  var pusat = String(ak.pusat || '').split(',').map(Number);
  if (d.lat !== '' && d.lat != null && isFinite(lat) && isFinite(lng) && pusat.length === 2 && isFinite(pusat[0]) && isFinite(pusat[1])) {
    var km = distanceKm(lat, lng, pusat[0], pusat[1]);
    var radius = Number(ak.radius_km) || 15;
    if (km > radius) flags.push('Lokasi GPS ±' + Math.round(km) + ' km dari pusat DUN');
  }
  return flags.join('; ');
}

function cleanCoord(v, max) {
  var n = Number(v);
  return v === '' || v == null || !isFinite(n) || Math.abs(n) > max ? '' : String(Math.round(n * 1e6) / 1e6);
}

// ---------- tindakan ----------
function submit(d, isAdmin, kod) {
  if (!isAdmin && d.website) return { ok: true, no: kod + '0000-0000', uploadToken: Utilities.getUuid() }; // perangkap bot
  ['nama', 'telefon', 'kawasan', 'tajuk'].forEach(function (k) {
    if (!String(d[k] || '').trim()) throw new Error('Sila lengkapkan semua ruangan wajib.');
  });
  var tel = normTel(d.telefon);
  var ak = null;
  if (!isAdmin) {
    if (tel.length < 9) throw new Error('Sila masukkan no. telefon yang sah.');
    verifyTurnstile(d.turnstile);
    if (isBlocked(tel)) {
      Utilities.sleep(1000);
      throw new Error('Aduan tidak dapat diterima dari nombor ini. Sila hubungi pejabat YB secara terus.');
    }
    ak = requireYb(kod);
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet('Aduan', COLS);
    var prefix = kod + new Date().getFullYear() + '-';
    var max = 0, recent = 0, since = Date.now() - 24 * 3600 * 1000;
    rows(sh, COLS).forEach(function (a) {
      if (a.no.indexOf(prefix) === 0) max = Math.max(max, Number(a.no.slice(prefix.length)) || 0);
      if (!isAdmin && a.saluran === 'Borang dalam talian' && normTel(a.telefon) === tel && new Date(a.tarikh).getTime() > since) recent++;
    });
    var had = Number(prop('HAD_SEHARI', 3)) || 3;
    if (!isAdmin && recent >= had)
      throw new Error('Nombor ini telah menghantar ' + recent + ' aduan dalam 24 jam. Sila cuba lagi esok, atau hubungi pejabat YB jika kecemasan.');
    // jangan guna semula no. rujukan aduan yang telah dipadam
    rows(sheet('Dipadam', DIPADAM_COLS), DIPADAM_COLS).forEach(function (x) {
      if (x.no.indexOf(prefix) === 0) max = Math.max(max, Number(x.no.slice(prefix.length)) || 0);
    });
    var no = prefix + ('000' + (max + 1)).slice(-4);
    var now = new Date().toISOString();
    var a = {
      no: no, tarikh: isAdmin && d.tarikh ? d.tarikh : now, nama: d.nama, telefon: d.telefon, kawasan: d.kawasan,
      kategori: d.kategori || 'Lain-lain', tajuk: d.tajuk, butiran: d.butiran || '',
      saluran: isAdmin ? (d.saluran || 'Walk-in / Pejabat') : 'Borang dalam talian',
      keutamaan: isAdmin ? (d.keutamaan || 'Sederhana') : 'Sederhana', status: 'baru',
      agensi: isAdmin ? (d.agensi || '') : '', pegawai: isAdmin ? (d.pegawai || '') : '', tarikhSelesai: '', kemaskini: now, yb: kod,
      poskod: String(d.poskod || '').replace(/\D/g, '').slice(0, 5), lat: cleanCoord(d.lat, 90), lng: cleanCoord(d.lng, 180),
      bendera: isAdmin ? '' : kawasanFlags(d, ak)
    };
    sh.appendRow(COLS.map(function (k) { return cell(a[k], k); }));
    addLog(no, 'Aduan diterima melalui ' + a.saluran, true);
    var token = Utilities.getUuid();
    CacheService.getScriptCache().put('up_' + token, no, UPLOAD_TTL);
    return { ok: true, no: no, uploadToken: token };
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
  var lamp = {};
  rows(sheet('Lampiran', LAMP_COLS), LAMP_COLS).forEach(function (l) {
    if (mine[l.no]) (lamp[l.no] = lamp[l.no] || []).push({ nama: l.nama, jenis: l.jenis, fileId: l.fileId, url: l.url, oleh: l.oleh, masa: l.masa });
  });
  var logs = {};
  rows(sheet('Log', LOG_COLS), LOG_COLS).forEach(function (l) {
    if (mine[l.no]) (logs[l.no] = logs[l.no] || []).push({ masa: l.masa, mesej: l.mesej, awam: l.awam === 'ya' });
  });
  return items.map(function (a) {
    delete a._row;
    a.yb = normKod(a.yb);
    a.log = logs[a.no] || [];
    a.lampiran = lamp[a.no] || [];
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
      addLog(a.no, 'Status ditukar kepada "' + STATUS[d.status] + '"', d.status !== 'spam');
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

// ---------- lampiran (gambar / video) ----------
function rootFolder() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('YB Kasi Setel - Lampiran');
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

function folderFor(no) {
  var root = rootFolder();
  var it = root.getFoldersByName(no);
  return it.hasNext() ? it.next() : root.createFolder(no);
}

function upload(r) {
  var no, oleh;
  if (r.token) {
    no = CacheService.getScriptCache().get('up_' + r.token);
    if (!no) throw new Error('Tempoh muat naik tamat. Sila hantar gambar kepada pejabat YB melalui WhatsApp.');
    oleh = 'pengadu';
  } else {
    no = findForUser(auth(r), r.no).a.no;
    oleh = 'staf';
  }
  var type = String(r.type || '').toLowerCase();
  if (!/^(image|video)\/[a-z0-9.+-]+$/.test(type)) throw new Error('Hanya gambar atau video dibenarkan.');
  var bytes = Utilities.base64Decode(String(r.data || ''));
  if (!bytes.length) throw new Error('Fail kosong.');
  if (bytes.length > MAX_BYTES) throw new Error('Fail terlalu besar (maksimum 25MB).');
  var name = String(r.name || 'lampiran').replace(/[^\w.\- ]+/g, '_').slice(0, 80) || 'lampiran';
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet('Lampiran', LAMP_COLS);
    var count = rows(sh, LAMP_COLS).filter(function (l) { return l.no === no; }).length;
    if (count >= (oleh === 'pengadu' ? MAX_FILES_AWAM : MAX_FILES)) throw new Error('Had bilangan lampiran telah dicapai.');
    var file = folderFor(no).createFile(Utilities.newBlob(bytes, type, name));
    // Sesiapa yang ada link boleh lihat (link hanya dipaparkan dalam panel staf).
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    sh.appendRow([cell(no), cell(new Date().toISOString()), cell(name), cell(type), cell(file.getId()), cell(file.getUrl()), oleh]);
    if (oleh === 'staf') addLog(no, 'Lampiran ditambah: ' + name, false);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// Tandakan aduan sebagai spam DAN sekat no. telefon pengadu (berkuat kuasa untuk semua YB).
function sekat(s, no, sebab) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var f = findForUser(s, no);
    var tel = normTel(f.a.telefon);
    if (tel && !isBlocked(tel)) {
      sheet('Sekatan', SEKATAN_COLS).appendRow([cell(tel), cell(sebab || 'Spam: ' + f.a.no), cell(new Date().toISOString()),
        cell(s.pentadbir ? 'Pentadbir' : s.akaun.kod)]);
    }
    if (f.a.status !== 'spam') {
      f.a.status = 'spam';
      f.a.tarikhSelesai = '';
    }
    addLog(f.a.no, 'Ditanda spam & nombor ' + tel + ' disekat' + (sebab ? ': ' + sebab : ''), false);
    f.a.kemaskini = new Date().toISOString();
    writeAduan(f.sh, f.a);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// Padam aduan sepenuhnya: baris Aduan, Log & Lampiran, dan fail Drive dihantar ke Bin (boleh dipulihkan 30 hari).
// Satu rekod ringkas disimpan dalam tab "Dipadam" untuk audit.
function padam(s, no, sebab) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var f = findForUser(s, no);
    var a = f.a;
    var deleteRows = function (name, cols) {
      var sh = sheet(name, cols);
      var list = rows(sh, cols).filter(function (r) { return r.no === a.no; });
      for (var i = list.length - 1; i >= 0; i--) sh.deleteRow(list[i]._row); // dari bawah ke atas
      return list;
    };
    var lamp = deleteRows('Lampiran', LAMP_COLS);
    lamp.forEach(function (l) { try { if (l.fileId) DriveApp.getFileById(l.fileId).setTrashed(true); } catch (e) {} });
    try {
      var it = rootFolder().getFoldersByName(a.no);
      while (it.hasNext()) it.next().setTrashed(true);
    } catch (e) {}
    deleteRows('Log', LOG_COLS);
    f.sh.deleteRow(a._row);
    sheet('Dipadam', DIPADAM_COLS).appendRow([cell(a.no), cell(a.tajuk, 'tajuk'), cell(a.nama), cell(a.telefon), cell(a.yb),
      cell(a.tarikh), cell(new Date().toISOString()), cell(s.pentadbir ? 'Pentadbir' : s.akaun.kod), cell(sebab)]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/** Jalankan sekali dari editor (pilih "setup" > Run) untuk cipta/naik taraf tab dan beri kebenaran. */
function setup() {
  sheet('Aduan', COLS);
  sheet('Log', LOG_COLS);
  sheet('Lampiran', LAMP_COLS);
  sheet('Sekatan', SEKATAN_COLS);
  sheet('Dipadam', DIPADAM_COLS);
  rootFolder(); // minta kebenaran Google Drive & cipta folder lampiran
  var ak = sheet('Akaun', AKAUN_COLS);
  if (ak.getLastRow() < 2) ak.appendRow(['CONTOH', 'YB Contoh', 'DUN Contoh', 'tukar-kata-laluan-ini', 'tidak']);
  var pw = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  Logger.log('Siap. Isi tab "Akaun" dengan senarai YB.' + (pw ? '' : ' JANGAN LUPA tetapkan ADMIN_PASSWORD (Pentadbir).'));
}
