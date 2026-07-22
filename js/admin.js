/* ============================================================
   لوحة إدارة شاشات المساجد — إدارة مركزية + نشر عبر Gist
   ============================================================ */
(function () {
  'use strict';

  var ADMIN_KEY = 'mosqueAdmin.v1';
  var TOKEN_KEY = 'mosqueAdmin.token';

  /* ============================================================
     رمز GitHub: يُخزن منفصلاً عن بقية البيانات، وبخيار المدير
     إما بشكل دائم أو لجلسة المتصفح فقط (أكثر أماناً)
     ============================================================ */
  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) ||
             sessionStorage.getItem(TOKEN_KEY) ||
             (admin.gist && admin.gist.token) || '';
    } catch (e) { return ''; }
  }

  function isTokenRemembered() {
    try {
      return !!(localStorage.getItem(TOKEN_KEY) || (admin.gist && admin.gist.token));
    } catch (e) { return false; }
  }

  function setToken(token, remember) {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      if (admin.gist) admin.gist.token = ''; /* تنظيف موضع التخزين القديم */
      if (token) {
        (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
      }
    } catch (e) {}
  }

  /* الإعدادات الافتراضية لشاشة جديدة (متوافقة مع الشاشة نفسها) */
  var SCREEN_DEFAULTS = {
    mosqueName: 'مسجد جديد',
    cityId: 'jerusalem',
    customCity: { name: '', lat: 31.7683, lng: 35.2137, tz: '' },
    method: 'Egypt',
    asrFactor: 1,
    hijriAdjust: 0,
    monthNames: 'levant',
    timeFormat: 24,
    showSeconds: true,
    theme: 'emerald',
    customColors: { bg1: '#04241c', bg2: '#0a3a2e', accent: '#d4af5a', text: '#f5f1e6' },
    iqama: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 10, isha: 15 },
    adhanScreenMin: 3,
    prayerScreenMin: 10,
    adhkarScreenMin: 8,
    adhkarSecondsEach: 30,
    annScreenEnabled: false,
    annScreenEveryMin: 20,
    annScreenTimes: [],
    annScreenDurationSec: 25,
    jumuaMode: 'auto',
    jumuaTime: '12:30',
    khutbahMin: 30,
    adhanSoundEnabled: true,
    adhanSoundMode: 'makkah',
    tickerEnabled: true,
    tickerTexts: [
      'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ',
      'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
      'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
      'أَسْتَغْفِرُ اللهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ'
    ],
    announcementsEnabled: true,
    announcements: [],
    adhkarTexts: [
      'أَسْتَغْفِرُ اللهَ | 3',
      'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
      'سُبْحَانَ اللهِ | 33',
      'الْحَمْدُ لِلهِ | 33',
      'اللهُ أَكْبَرُ | 33',
      'تمام المائة: لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
      'آية الكرسي: اللهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...',
      'قُلْ هُوَ اللهُ أَحَدٌ — قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ — قُلْ أَعُوذُ بِرَبِّ النَّاسِ | 3'
    ],
    remoteIntervalMin: 5,
    orientation: 'auto',
    hijriEventsEnabled: true,
    ramadanAuto: true,
    imsakOffsetMin: 10,
    taraweehNote: true
  };

  var admin = load();
  var currentId = null;
  var dirty = false;

  function load() {
    try {
      var raw = localStorage.getItem(ADMIN_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        /* ترحيل الرمز القديم من التخزين العام إلى موضعه المنفصل */
        if (data.gist && data.gist.token) {
          try { localStorage.setItem(TOKEN_KEY, data.gist.token); } catch (e2) {}
          data.gist.token = '';
          try { localStorage.setItem(ADMIN_KEY, JSON.stringify(data)); } catch (e2) {}
        }
        return data;
      }
    } catch (e) {}
    return { mosques: [], gist: { token: '', gistId: '', owner: '' } };
  }

  function save() {
    try { localStorage.setItem(ADMIN_KEY, JSON.stringify(admin)); } catch (e) {}
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function genId() {
    var chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    var id = '';
    for (var i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  function g(id) { return document.getElementById(id); }

  function findMosque(id) {
    for (var i = 0; i < admin.mosques.length; i++) {
      if (admin.mosques[i].id === id) return admin.mosques[i];
    }
    return null;
  }

  /* ---------- قائمة الجوامع ---------- */
  function renderList() {
    var list = g('mosque-list');
    list.innerHTML = '';
    admin.mosques.forEach(function (m) {
      var city = m.settings.cityId === 'custom'
        ? (m.settings.customCity.name || 'موقع مخصص')
        : findCity(m.settings.cityId).name;
      var item = document.createElement('div');
      item.className = 'mosque-item' + (m.id === currentId ? ' selected' : '');
      item.innerHTML =
        '<div class="mi-name">' + escapeHtml(m.settings.mosqueName) + '</div>' +
        '<div class="mi-meta"><span>' + escapeHtml(city) + '</span>' +
        (m.lastPublish ? '<span class="mi-pub">☁ ' + m.lastPublish + '</span>' : '<span class="mi-pub off">لم يُنشر</span>') +
        '</div>';
      item.addEventListener('click', function () { select(m.id); });
      list.appendChild(item);
    });
    g('mosque-count').textContent = admin.mosques.length
      ? admin.mosques.length + ' شاشة'
      : '';
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function select(id) {
    if (dirty && currentId && !confirm('لديك تعديلات غير محفوظة، المتابعة بدون حفظ؟')) return;
    currentId = id;
    dirty = false;
    var m = findMosque(id);
    if (!m) {
      g('editor-form').style.display = 'none';
      g('empty-state').style.display = '';
      renderList();
      return;
    }
    g('empty-state').style.display = 'none';
    g('editor-form').style.display = '';
    fillForm(m);
    renderList();
    updateRemoteHint(m);
  }

  /* ---------- النموذج ---------- */
  function fillForm(m) {
    var s = m.settings;
    g('m-name').value = s.mosqueName;
    g('m-city').value = s.cityId;
    g('m-custom-city').style.display = s.cityId === 'custom' ? '' : 'none';
    g('m-custom-name').value = s.customCity.name;
    g('m-custom-lat').value = s.customCity.lat;
    g('m-custom-lng').value = s.customCity.lng;
    g('m-custom-tz').value = s.customCity.tz || '';
    g('m-method').value = s.method;
    g('m-asr').value = String(s.asrFactor);
    g('m-hijri').value = String(s.hijriAdjust);
    g('m-theme').value = s.theme;
    g('m-colors').style.display = s.theme === 'custom' ? '' : 'none';
    g('m-color-bg1').value = s.customColors.bg1;
    g('m-color-bg2').value = s.customColors.bg2;
    g('m-color-accent').value = s.customColors.accent;
    g('m-color-text').value = s.customColors.text;
    g('m-orientation').value = s.orientation || 'auto';
    g('m-hijri-events').checked = s.hijriEventsEnabled !== false;
    g('m-ramadan-auto').checked = s.ramadanAuto !== false;
    g('m-imsak-offset').value = s.imsakOffsetMin || 10;
    g('m-taraweeh-note').checked = s.taraweehNote !== false;
    g('m-timeformat').value = String(s.timeFormat);
    g('m-seconds').checked = s.showSeconds;
    g('m-months').value = s.monthNames;
    g('m-sound').checked = s.adhanSoundEnabled;
    g('m-sound-mode').value = s.adhanSoundMode || 'chime';
    g('m-iq-fajr').value = s.iqama.fajr;
    g('m-iq-dhuhr').value = s.iqama.dhuhr;
    g('m-iq-asr').value = s.iqama.asr;
    g('m-iq-maghrib').value = s.iqama.maghrib;
    g('m-iq-isha').value = s.iqama.isha;
    g('m-adhan-min').value = s.adhanScreenMin;
    g('m-prayer-min').value = s.prayerScreenMin;
    g('m-adhkar-min').value = s.adhkarScreenMin;
    g('m-adhkar-each').value = s.adhkarSecondsEach;
    g('m-annscreen-enabled').checked = s.annScreenEnabled;
    g('m-annscreen-every').value = s.annScreenEveryMin;
    g('m-annscreen-duration').value = s.annScreenDurationSec;
    g('m-annscreen-times').value = (s.annScreenTimes || []).join('\n');
    g('m-jumua-mode').value = s.jumuaMode;
    g('m-jumua-time-row').style.display = s.jumuaMode === 'fixed' ? '' : 'none';
    g('m-jumua-time').value = s.jumuaTime;
    g('m-khutbah').value = s.khutbahMin;
    g('m-ann-enabled').checked = s.announcementsEnabled;
    g('m-announcements').value = s.announcements.join('\n');
    g('m-ticker-enabled').checked = s.tickerEnabled;
    g('m-ticker').value = s.tickerTexts.join('\n');
    g('m-adhkar').value = s.adhkarTexts.join('\n');
    g('save-status').textContent = '';
  }

  function collectForm() {
    var s = clone(SCREEN_DEFAULTS);
    s.mosqueName = g('m-name').value.trim() || 'مسجد بدون اسم';
    s.cityId = g('m-city').value;
    s.customCity.name = g('m-custom-name').value.trim();
    s.customCity.lat = parseFloat(g('m-custom-lat').value) || 0;
    s.customCity.lng = parseFloat(g('m-custom-lng').value) || 0;
    var tzv = g('m-custom-tz').value.trim();
    if (tzv) {
      try { new Intl.DateTimeFormat('en', { timeZone: tzv }); }
      catch (e) {
        alert('المنطقة الزمنية «' + tzv + '» غير صحيحة — استخدم صيغة مثل Asia/Jerusalem. سيتم تجاهلها والاعتماد على منطقة الجهاز.');
        tzv = '';
      }
    }
    s.customCity.tz = tzv;
    s.method = g('m-method').value;
    s.asrFactor = parseInt(g('m-asr').value, 10);
    s.hijriAdjust = parseInt(g('m-hijri').value, 10);
    s.theme = g('m-theme').value;
    s.customColors.bg1 = g('m-color-bg1').value;
    s.customColors.bg2 = g('m-color-bg2').value;
    s.customColors.accent = g('m-color-accent').value;
    s.customColors.text = g('m-color-text').value;
    s.orientation = g('m-orientation').value;
    s.hijriEventsEnabled = g('m-hijri-events').checked;
    s.ramadanAuto = g('m-ramadan-auto').checked;
    s.imsakOffsetMin = num('m-imsak-offset', 10);
    s.taraweehNote = g('m-taraweeh-note').checked;
    s.timeFormat = parseInt(g('m-timeformat').value, 10);
    s.showSeconds = g('m-seconds').checked;
    s.monthNames = g('m-months').value;
    s.adhanSoundEnabled = g('m-sound').checked;
    s.adhanSoundMode = g('m-sound-mode').value;
    s.iqama.fajr = num('m-iq-fajr', 20);
    s.iqama.dhuhr = num('m-iq-dhuhr', 15);
    s.iqama.asr = num('m-iq-asr', 15);
    s.iqama.maghrib = num('m-iq-maghrib', 10);
    s.iqama.isha = num('m-iq-isha', 15);
    s.adhanScreenMin = num('m-adhan-min', 3);
    s.prayerScreenMin = num('m-prayer-min', 10);
    s.adhkarScreenMin = num('m-adhkar-min', 8);
    s.adhkarSecondsEach = num('m-adhkar-each', 30);
    s.annScreenEnabled = g('m-annscreen-enabled').checked;
    s.annScreenEveryMin = num('m-annscreen-every', 20);
    s.annScreenDurationSec = num('m-annscreen-duration', 25);
    s.annScreenTimes = lines(g('m-annscreen-times').value)
      .filter(function (t) { return /^([01]?\d|2[0-3]):[0-5]\d$/.test(t); });
    s.jumuaMode = g('m-jumua-mode').value;
    s.jumuaTime = g('m-jumua-time').value || '12:30';
    s.khutbahMin = num('m-khutbah', 30);
    s.announcementsEnabled = g('m-ann-enabled').checked;
    s.announcements = lines(g('m-announcements').value);
    s.tickerEnabled = g('m-ticker-enabled').checked;
    s.tickerTexts = lines(g('m-ticker').value);
    if (!s.tickerTexts.length) s.tickerTexts = clone(SCREEN_DEFAULTS.tickerTexts);
    s.adhkarTexts = lines(g('m-adhkar').value);
    if (!s.adhkarTexts.length) s.adhkarTexts = clone(SCREEN_DEFAULTS.adhkarTexts);
    return s;
  }

  function num(id, fallback) {
    var n = parseInt(g(id).value, 10);
    return isNaN(n) ? fallback : n;
  }

  function lines(text) {
    return text.split('\n').map(function (x) { return x.trim(); })
      .filter(function (x) { return x.length; });
  }

  /* ---------- روابط الشاشات ---------- */
  function rawUrl(m) {
    if (!admin.gist.gistId || !admin.gist.owner) return null;
    return 'https://gist.githubusercontent.com/' + admin.gist.owner + '/' +
      admin.gist.gistId + '/raw/mosque-' + m.id + '.json';
  }

  function updateRemoteHint(m) {
    var el = g('m-remote-hint');
    var url = rawUrl(m);
    if (url) {
      el.innerHTML = 'رابط هذه الشاشة (يوضع مرة واحدة في إعدادات الشاشة ← التحديث عن بُعد): ' +
        '<code dir="ltr">' + url + '</code>';
    } else {
      el.innerHTML = 'لم يتم النشر بعد — اضبط «إعداد النشر» ثم اضغط «☁ نشر الكل» للحصول على رابط الشاشة.';
    }
  }

  /* ---------- النشر عبر Gist ---------- */
  function publishAll() {
    var status = g('publish-status');
    var token = getToken();
    if (!token) {
      openGistModal();
      return;
    }
    if (!admin.mosques.length) {
      status.textContent = 'لا توجد شاشات للنشر';
      return;
    }
    /* حفظ الشاشة المفتوحة أولاً */
    if (currentId) saveCurrent(true);

    status.textContent = '⏳ جارٍ النشر...';
    var files = {};
    admin.mosques.forEach(function (m) {
      var pub = clone(m.settings);
      /* لا نفرض فاصل المزامنة عن بُعد — يبقى بيد كل شاشة */
      delete pub.remoteIntervalMin;
      files['mosque-' + m.id + '.json'] = {
        content: JSON.stringify(pub, null, 2)
      };
    });

    var isNew = !admin.gist.gistId;

    /* حذف ملفات الجوامع المحذوفة من الـGist حتى لا تبقى شاشاتها تتزامن للأبد */
    if (!isNew) {
      (admin.publishedFiles || []).forEach(function (fn) {
        if (!(fn in files)) files[fn] = null;
      });
    }
    var url = isNew ? 'https://api.github.com/gists'
      : 'https://api.github.com/gists/' + admin.gist.gistId;

    fetch(url, {
      method: isNew ? 'POST' : 'PATCH',
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: 'إعدادات شاشات مواقيت الصلاة — تُدار من لوحة الإدارة',
        public: false,
        files: files
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (resp) {
      admin.gist.gistId = resp.id;
      admin.gist.owner = resp.owner ? resp.owner.login : admin.gist.owner;
      admin.publishedFiles = Object.keys(files).filter(function (fn) {
        return files[fn] !== null;
      });
      var now = new Date();
      var stamp = pad(now.getHours()) + ':' + pad(now.getMinutes()) +
        ' ' + now.getDate() + '/' + (now.getMonth() + 1);
      admin.mosques.forEach(function (m) { m.lastPublish = stamp; });
      save();
      renderList();
      if (currentId) updateRemoteHint(findMosque(currentId));
      status.textContent = '✓ تم النشر — الشاشات المتصلة ستتحدث تلقائياً';
      setTimeout(function () { status.textContent = ''; }, 8000);
    }).catch(function (e) {
      status.textContent = '✗ فشل النشر: ' +
        (String(e.message).indexOf('401') > -1 ? 'الرمز غير صحيح' : e.message);
    });
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- الأحداث ---------- */
  function saveCurrent(silent) {
    var m = findMosque(currentId);
    if (!m) return;
    m.settings = collectForm();
    save();
    dirty = false;
    renderList();
    if (!silent) {
      g('save-status').textContent = '✓ تم الحفظ محلياً — اضغط «نشر الكل» لإيصاله للشاشات';
      setTimeout(function () { g('save-status').textContent = ''; }, 6000);
    }
  }

  function init() {
    /* تعبئة القوائم */
    var citySel = g('m-city');
    CITIES.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.id; o.textContent = c.name;
      citySel.appendChild(o);
    });
    var co = document.createElement('option');
    co.value = 'custom'; co.textContent = '➕ موقع مخصص';
    citySel.appendChild(co);

    var methodSel = g('m-method');
    for (var k in PrayTimes.METHODS) {
      var o2 = document.createElement('option');
      o2.value = k; o2.textContent = PrayTimes.METHODS[k].name;
      methodSel.appendChild(o2);
    }

    citySel.addEventListener('change', function () {
      g('m-custom-city').style.display = this.value === 'custom' ? '' : 'none';
    });
    g('m-theme').addEventListener('change', function () {
      g('m-colors').style.display = this.value === 'custom' ? '' : 'none';
    });
    g('m-jumua-mode').addEventListener('change', function () {
      g('m-jumua-time-row').style.display = this.value === 'fixed' ? '' : 'none';
    });

    /* أي تعديل يعلّم النموذج */
    g('editor-form').addEventListener('input', function () { dirty = true; });
    g('editor-form').addEventListener('change', function () { dirty = true; });

    g('btn-add-mosque').addEventListener('click', function () {
      var m = { id: genId(), settings: clone(SCREEN_DEFAULTS), lastPublish: null };
      admin.mosques.push(m);
      save();
      select(m.id);
      g('m-name').focus();
      g('m-name').select();
    });

    g('btn-save-mosque').addEventListener('click', function () { saveCurrent(false); });

    g('btn-delete').addEventListener('click', function () {
      var m = findMosque(currentId);
      if (!m) return;
      if (!confirm('حذف «' + m.settings.mosqueName + '»؟ لا يمكن التراجع.')) return;
      admin.mosques = admin.mosques.filter(function (x) { return x.id !== currentId; });
      save();
      dirty = false;
      currentId = admin.mosques.length ? admin.mosques[0].id : null;
      select(currentId);
    });

    g('btn-duplicate').addEventListener('click', function () {
      var m = findMosque(currentId);
      if (!m) return;
      var copy = { id: genId(), settings: collectForm(), lastPublish: null };
      copy.settings.mosqueName += ' — نسخة';
      admin.mosques.push(copy);
      save();
      select(copy.id);
    });

    g('btn-download').addEventListener('click', function () {
      var m = findMosque(currentId);
      if (!m) return;
      var blob = new Blob([JSON.stringify(collectForm(), null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mosque-' + m.id + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    g('btn-copy-url').addEventListener('click', function () {
      var m = findMosque(currentId);
      var url = m && rawUrl(m);
      if (!url) {
        alert('انشر أولاً («☁ نشر الكل») حتى يتولد رابط الشاشة.');
        return;
      }
      var done = function () {
        g('save-status').textContent = '✓ نُسخ الرابط — ضعه في إعدادات الشاشة ← التحديث عن بُعد';
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { prompt('انسخ الرابط:', url); });
      } else {
        prompt('انسخ الرابط:', url);
      }
    });

    /* المعاينة الحية */
    g('btn-preview').addEventListener('click', function () {
      var frame = g('preview-frame');
      g('preview-modal').style.display = 'flex';
      var settingsNow = collectForm();
      frame.src = 'index.html';
      frame.onload = function () {
        setTimeout(function () {
          /* نرسل لنفس الأصل فقط — لا نستخدم '*' */
          var target = location.origin === 'null' ? '*' : location.origin;
          frame.contentWindow.postMessage({ type: 'previewSettings', settings: settingsNow }, target);
        }, 400);
      };
    });
    g('btn-preview-close').addEventListener('click', function () {
      g('preview-modal').style.display = 'none';
      g('preview-frame').src = 'about:blank';
    });

    /* إعداد Gist */
    g('btn-gist-config').addEventListener('click', openGistModal);
    g('btn-gist-save').addEventListener('click', function () {
      setToken(g('gist-token').value.trim(), g('gist-remember').checked);
      admin.gist.gistId = g('gist-id').value.trim();
      save();
      g('gist-modal').style.display = 'none';
    });
    g('btn-gist-clear').addEventListener('click', function () {
      setToken('', false);
      save();
      g('gist-token').value = '';
      alert('تم مسح الرمز من هذا الجهاز. إذا كنت تشك بتسريبه، ألغِه أيضاً من github.com/settings/tokens');
    });
    g('btn-gist-cancel').addEventListener('click', function () {
      g('gist-modal').style.display = 'none';
    });

    g('btn-publish-all').addEventListener('click', publishAll);

    window.addEventListener('beforeunload', function (e) {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });

    /* البداية */
    if (admin.mosques.length) select(admin.mosques[0].id);
    else renderList();
  }

  function openGistModal() {
    g('gist-token').value = getToken();
    g('gist-remember').checked = isTokenRemembered() || !getToken();
    g('gist-id').value = admin.gist.gistId;
    g('gist-modal').style.display = 'flex';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
