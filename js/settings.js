/* ============================================================
   الإعدادات — الحفظ والاسترجاع + واجهة نافذة الإعدادات
   ============================================================ */
var STORAGE_KEY = 'mosqueScreen.settings.v2';

var DEFAULT_SETTINGS = {
  mosqueName: 'مسجد الرحمة',
  cityId: 'jerusalem',
  customCity: { name: '', lat: 31.7683, lng: 35.2137 },
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
  adhkarScreenMin: 8,        /* مدة شاشة الأذكار بعد الصلاة */
  adhkarSecondsEach: 30,     /* مدة عرض كل ذكر — كافية للقراءة */
  annScreenEnabled: false,   /* شاشة الإعلانات الكاملة */
  annScreenEveryMin: 20,     /* تظهر كل كم دقيقة (0 = تعطيل التكرار) */
  annScreenTimes: [],        /* أوقات محددة HH:MM يحددها المدير */
  annScreenDurationSec: 25,  /* مدة عرض كل إعلان بالثواني */
  bgMode: 'pattern',         /* pattern = زخرفة | photos = صور خلفية */
  bgOverlay: 60,             /* تعتيم الخلفية % للحفاظ على وضوح النص */
  bgIntervalMin: 10,         /* تبديل صور الخلفية كل كم دقيقة */
  orientation: 'auto',       /* auto = حسب الشاشة | landscape = أفقي | portrait = عمودي */
  hijriEventsEnabled: true,  /* المناسبات الهجرية والسنن تلقائياً في الشريط */
  ramadanAuto: true,         /* تفعيل وضع رمضان تلقائياً حسب التاريخ الهجري */
  imsakOffsetMin: 10,        /* الإمساك قبل الفجر بكم دقيقة */
  taraweehNote: true,        /* إظهار «يليها التراويح» على بطاقة العشاء في رمضان */
  jumuaMode: 'auto',
  jumuaTime: '12:30',
  khutbahMin: 30,
  adhanSoundEnabled: true,
  adhanSoundMode: 'makkah',  /* أذان حقيقي افتراضياً — chime = تنبيه | file = ملف مرفوع */
  tickerEnabled: true,
  tickerTexts: [
    'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ',
    'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    'أَسْتَغْفِرُ اللهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ',
    'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ',
    'حَسْبُنَا اللهُ وَنِعْمَ الْوَكِيلُ'
  ],
  announcementsEnabled: true,
  announcements: [],
  adhkarTexts: [
    'أَسْتَغْفِرُ اللهَ | 3',
    'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    'اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ',
    'سُبْحَانَ اللهِ | 33',
    'الْحَمْدُ لِلهِ | 33',
    'اللهُ أَكْبَرُ | 33',
    'تمام المائة: لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    'آية الكرسي: اللهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...',
    'قُلْ هُوَ اللهُ أَحَدٌ — قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ — قُلْ أَعُوذُ بِرَبِّ النَّاسِ | 3',
    'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ'
  ],
  remoteEnabled: false,
  remoteUrl: '',
  remoteIntervalMin: 5
};

var settings = loadSettings();

function loadSettings() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('mosqueScreen.settings.v1');
    if (!raw) return deepClone(DEFAULT_SETTINGS);
    var saved = JSON.parse(raw);
    return mergeSettings(deepClone(DEFAULT_SETTINGS), saved);
  } catch (e) {
    return deepClone(DEFAULT_SETTINGS);
  }
}

function mergeSettings(base, incoming) {
  for (var k in incoming) {
    if (!(k in base)) continue;
    if (k === 'iqama' || k === 'customCity' || k === 'customColors') {
      for (var k2 in incoming[k]) {
        if (k2 in base[k]) base[k][k2] = incoming[k][k2];
      }
    } else {
      base[k] = incoming[k];
    }
  }
  return base;
}

function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) {}
}

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

function currentLocation() {
  if (settings.cityId === 'custom') {
    return {
      name: settings.customCity.name || 'موقع مخصص',
      lat: parseFloat(settings.customCity.lat) || 31.7683,
      lng: parseFloat(settings.customCity.lng) || 35.2137
    };
  }
  return findCity(settings.cityId);
}

/* ============ واجهة نافذة الإعدادات ============ */
function initSettingsUI() {
  var modal = document.getElementById('settings-modal');
  var citySelect = document.getElementById('set-city');

  CITIES.forEach(function (c) {
    var opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    citySelect.appendChild(opt);
  });
  var customOpt = document.createElement('option');
  customOpt.value = 'custom';
  customOpt.textContent = '➕ موقع مخصص (إحداثيات)';
  citySelect.appendChild(customOpt);

  var methodSelect = document.getElementById('set-method');
  for (var m in PrayTimes.METHODS) {
    var opt2 = document.createElement('option');
    opt2.value = m;
    opt2.textContent = PrayTimes.METHODS[m].name;
    methodSelect.appendChild(opt2);
  }

  citySelect.addEventListener('change', function () {
    document.getElementById('custom-city-row').style.display =
      citySelect.value === 'custom' ? '' : 'none';
  });

  document.getElementById('set-jumua-mode').addEventListener('change', function () {
    document.getElementById('jumua-time-row').style.display =
      this.value === 'fixed' ? '' : 'none';
  });

  document.getElementById('set-theme').addEventListener('change', function () {
    document.getElementById('custom-colors-block').style.display =
      this.value === 'custom' ? '' : 'none';
  });

  /* صورة الجامع */
  document.getElementById('set-photo-file').addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    var status = document.getElementById('photo-status');
    status.textContent = 'جارٍ الحفظ...';
    fileToDataURL(file, 600).then(function (dataUrl) {
      return AssetStore.set('mosquePhoto', dataUrl);
    }).then(function () {
      status.textContent = '✓ تم حفظ الصورة';
      if (window.onAssetsChanged) window.onAssetsChanged();
    }).catch(function () {
      status.textContent = 'تعذر حفظ الصورة';
    });
  });

  document.getElementById('btn-photo-remove').addEventListener('click', function () {
    AssetStore.remove('mosquePhoto').then(function () {
      document.getElementById('photo-status').textContent = 'تمت إزالة الصورة';
      document.getElementById('set-photo-file').value = '';
      if (window.onAssetsChanged) window.onAssetsChanged();
    });
  });

  /* صور الخلفيات */
  document.getElementById('set-bg-files').addEventListener('change', function () {
    var files = [].slice.call(this.files);
    if (!files.length) return;
    var status = document.getElementById('bg-status');
    status.textContent = 'جارٍ الحفظ...';
    AssetStore.get('backgrounds').then(function (existing) {
      var list = existing || [];
      var chain = Promise.resolve();
      files.forEach(function (f) {
        chain = chain.then(function () {
          return fileToDataURL(f, 1600).then(function (d) { list.push(d); });
        });
      });
      return chain.then(function () {
        return AssetStore.set('backgrounds', list.slice(-12)); /* حد أقصى 12 صورة */
      });
    }).then(function () {
      return AssetStore.get('backgrounds');
    }).then(function (list) {
      status.textContent = '✓ محفوظ — عدد الخلفيات: ' + list.length;
      if (window.onAssetsChanged) window.onAssetsChanged();
    }).catch(function () {
      status.textContent = 'تعذر حفظ الصور';
    });
  });

  document.getElementById('btn-bg-clear').addEventListener('click', function () {
    AssetStore.remove('backgrounds').then(function () {
      document.getElementById('bg-status').textContent = 'تمت إزالة كل الخلفيات';
      document.getElementById('set-bg-files').value = '';
      if (window.onAssetsChanged) window.onAssetsChanged();
    });
  });

  /* ملف الأذان */
  document.getElementById('set-adhan-file').addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    var status = document.getElementById('adhan-file-status');
    if (file.size > 15 * 1024 * 1024) {
      status.textContent = 'الملف كبير جداً (الحد 15MB)';
      return;
    }
    status.textContent = 'جارٍ الحفظ...';
    fileToDataURL(file, 0).then(function (dataUrl) {
      return AssetStore.set('adhanAudio', dataUrl);
    }).then(function () {
      status.textContent = '✓ تم حفظ ملف الأذان';
      if (window.onAssetsChanged) window.onAssetsChanged();
    }).catch(function () {
      status.textContent = 'تعذر حفظ الملف';
    });
  });

  document.getElementById('btn-adhan-test').addEventListener('click', function () {
    if (window.testAdhanSound) window.testAdhanSound();
  });
  document.getElementById('btn-adhan-stop').addEventListener('click', function () {
    if (window.stopAdhanSound) window.stopAdhanSound();
  });

  /* تصدير/استيراد الإعدادات */
  document.getElementById('btn-export').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mosque-screen-settings.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('set-import-file').addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var incoming = JSON.parse(reader.result);
        settings = mergeSettings(deepClone(DEFAULT_SETTINGS), mergeSettings(deepClone(settings), incoming));
        saveSettings();
        fillForm();
        onSettingsChanged();
        document.getElementById('import-status').textContent = '✓ تم استيراد الإعدادات';
      } catch (e) {
        document.getElementById('import-status').textContent = 'ملف غير صالح';
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('btn-save').addEventListener('click', applySettings);
  document.getElementById('btn-cancel').addEventListener('click', closeSettings);
  document.getElementById('btn-reset').addEventListener('click', function () {
    if (confirm('استعادة جميع الإعدادات الافتراضية؟')) {
      settings = deepClone(DEFAULT_SETTINGS);
      saveSettings();
      fillForm();
      onSettingsChanged();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSettings();
    if ((e.key === 's' || e.key === 'S' || e.key === 'س') &&
        modal.style.display === 'none') openSettings();
  });

  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeSettings();
  });
}

function openSettings() {
  fillForm();
  document.getElementById('settings-modal').style.display = 'flex';
}

function closeSettings() {
  document.getElementById('settings-modal').style.display = 'none';
}

function fillForm() {
  var g = function (id) { return document.getElementById(id); };
  g('set-mosque-name').value = settings.mosqueName;
  g('set-city').value = settings.cityId;
  g('custom-city-row').style.display = settings.cityId === 'custom' ? '' : 'none';
  g('set-custom-name').value = settings.customCity.name;
  g('set-custom-lat').value = settings.customCity.lat;
  g('set-custom-lng').value = settings.customCity.lng;
  g('set-method').value = settings.method;
  g('set-asr').value = String(settings.asrFactor);
  g('set-hijri-adjust').value = String(settings.hijriAdjust);
  g('set-month-names').value = settings.monthNames;
  g('set-time-format').value = String(settings.timeFormat);
  g('set-show-seconds').checked = settings.showSeconds;
  g('set-theme').value = settings.theme;
  g('custom-colors-block').style.display = settings.theme === 'custom' ? '' : 'none';
  g('set-color-bg1').value = settings.customColors.bg1;
  g('set-color-bg2').value = settings.customColors.bg2;
  g('set-color-accent').value = settings.customColors.accent;
  g('set-color-text').value = settings.customColors.text;
  g('set-iqama-fajr').value = settings.iqama.fajr;
  g('set-iqama-dhuhr').value = settings.iqama.dhuhr;
  g('set-iqama-asr').value = settings.iqama.asr;
  g('set-iqama-maghrib').value = settings.iqama.maghrib;
  g('set-iqama-isha').value = settings.iqama.isha;
  g('set-adhan-min').value = settings.adhanScreenMin;
  g('set-prayer-min').value = settings.prayerScreenMin;
  g('set-adhkar-min').value = settings.adhkarScreenMin;
  g('set-adhkar-each').value = settings.adhkarSecondsEach;
  g('set-adhkar-texts').value = settings.adhkarTexts.join('\n');
  g('set-annscreen-enabled').checked = settings.annScreenEnabled;
  g('set-annscreen-every').value = settings.annScreenEveryMin;
  g('set-annscreen-times').value = settings.annScreenTimes.join('\n');
  g('set-annscreen-duration').value = settings.annScreenDurationSec;
  g('set-bg-mode').value = settings.bgMode;
  g('set-bg-overlay').value = settings.bgOverlay;
  g('bg-overlay-val').textContent = settings.bgOverlay + '%';
  g('set-bg-interval').value = settings.bgIntervalMin;
  g('bg-status').textContent = '';
  g('set-orientation').value = settings.orientation;
  g('set-hijri-events').checked = settings.hijriEventsEnabled;
  g('set-ramadan-auto').checked = settings.ramadanAuto;
  g('set-imsak-offset').value = settings.imsakOffsetMin;
  g('set-taraweeh-note').checked = settings.taraweehNote;
  g('set-jumua-mode').value = settings.jumuaMode;
  g('jumua-time-row').style.display = settings.jumuaMode === 'fixed' ? '' : 'none';
  g('set-jumua-time').value = settings.jumuaTime;
  g('set-khutbah-min').value = settings.khutbahMin;
  g('set-sound-enabled').checked = settings.adhanSoundEnabled;
  g('set-sound-mode').value = settings.adhanSoundMode;
  g('set-ticker-enabled').checked = settings.tickerEnabled;
  g('set-ticker-texts').value = settings.tickerTexts.join('\n');
  g('set-ann-enabled').checked = settings.announcementsEnabled;
  g('set-ann-texts').value = settings.announcements.join('\n');
  g('set-remote-enabled').checked = settings.remoteEnabled;
  g('set-remote-url').value = settings.remoteUrl;
  g('set-remote-interval').value = settings.remoteIntervalMin;
  g('photo-status').textContent = '';
  g('adhan-file-status').textContent = '';
  g('import-status').textContent = '';
}

function applySettings() {
  var g = function (id) { return document.getElementById(id); };
  settings.mosqueName = g('set-mosque-name').value.trim() || DEFAULT_SETTINGS.mosqueName;
  settings.cityId = g('set-city').value;
  settings.customCity.name = g('set-custom-name').value.trim();
  settings.customCity.lat = parseFloat(g('set-custom-lat').value) || 0;
  settings.customCity.lng = parseFloat(g('set-custom-lng').value) || 0;
  settings.method = g('set-method').value;
  settings.asrFactor = parseInt(g('set-asr').value, 10);
  settings.hijriAdjust = parseInt(g('set-hijri-adjust').value, 10);
  settings.monthNames = g('set-month-names').value;
  settings.timeFormat = parseInt(g('set-time-format').value, 10);
  settings.showSeconds = g('set-show-seconds').checked;
  settings.theme = g('set-theme').value;
  settings.customColors.bg1 = g('set-color-bg1').value;
  settings.customColors.bg2 = g('set-color-bg2').value;
  settings.customColors.accent = g('set-color-accent').value;
  settings.customColors.text = g('set-color-text').value;
  settings.iqama.fajr = clampInt(g('set-iqama-fajr').value, 0, 120, 20);
  settings.iqama.dhuhr = clampInt(g('set-iqama-dhuhr').value, 0, 120, 15);
  settings.iqama.asr = clampInt(g('set-iqama-asr').value, 0, 120, 15);
  settings.iqama.maghrib = clampInt(g('set-iqama-maghrib').value, 0, 120, 10);
  settings.iqama.isha = clampInt(g('set-iqama-isha').value, 0, 120, 15);
  settings.adhanScreenMin = clampInt(g('set-adhan-min').value, 0, 30, 3);
  settings.prayerScreenMin = clampInt(g('set-prayer-min').value, 0, 60, 10);
  settings.adhkarScreenMin = clampInt(g('set-adhkar-min').value, 0, 60, 8);
  settings.adhkarSecondsEach = clampInt(g('set-adhkar-each').value, 10, 180, 30);
  settings.adhkarTexts = linesOf(g('set-adhkar-texts').value, DEFAULT_SETTINGS.adhkarTexts);
  settings.annScreenEnabled = g('set-annscreen-enabled').checked;
  settings.annScreenEveryMin = clampInt(g('set-annscreen-every').value, 0, 720, 20);
  settings.annScreenTimes = linesOf(g('set-annscreen-times').value, [])
    .filter(function (t) { return /^([01]?\d|2[0-3]):[0-5]\d$/.test(t); });
  settings.annScreenDurationSec = clampInt(g('set-annscreen-duration').value, 5, 300, 25);
  settings.bgMode = g('set-bg-mode').value;
  settings.bgOverlay = clampInt(g('set-bg-overlay').value, 0, 90, 60);
  settings.bgIntervalMin = clampInt(g('set-bg-interval').value, 1, 240, 10);
  settings.orientation = g('set-orientation').value;
  settings.hijriEventsEnabled = g('set-hijri-events').checked;
  settings.ramadanAuto = g('set-ramadan-auto').checked;
  settings.imsakOffsetMin = clampInt(g('set-imsak-offset').value, 0, 60, 10);
  settings.taraweehNote = g('set-taraweeh-note').checked;
  settings.jumuaMode = g('set-jumua-mode').value;
  settings.jumuaTime = g('set-jumua-time').value || '12:30';
  settings.khutbahMin = clampInt(g('set-khutbah-min').value, 5, 120, 30);
  settings.adhanSoundEnabled = g('set-sound-enabled').checked;
  settings.adhanSoundMode = g('set-sound-mode').value;
  settings.tickerEnabled = g('set-ticker-enabled').checked;
  settings.tickerTexts = linesOf(g('set-ticker-texts').value, DEFAULT_SETTINGS.tickerTexts);
  settings.announcementsEnabled = g('set-ann-enabled').checked;
  settings.announcements = linesOf(g('set-ann-texts').value, []);
  settings.remoteEnabled = g('set-remote-enabled').checked;
  settings.remoteUrl = g('set-remote-url').value.trim();
  settings.remoteIntervalMin = clampInt(g('set-remote-interval').value, 1, 240, 5);
  saveSettings();
  closeSettings();
  onSettingsChanged();
}

function linesOf(text, fallback) {
  var arr = text.split('\n').map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
  return arr.length ? arr : deepClone(fallback);
}

function clampInt(v, min, max, fallback) {
  var n = parseInt(v, 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
