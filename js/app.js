/* ============================================================
   شاشة مواقيت الصلاة — المنطق الرئيسي
   ============================================================ */
(function () {
  'use strict';

  var MONTHS_LEVANT = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
    'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
  var MONTHS_WESTERN = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var HIJRI_MONTHS = ['محرّم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى',
    'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوّال', 'ذو القعدة', 'ذو الحجة'];

  var PRAYER_NAMES = {
    fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر',
    asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء', jumua: 'الجمعة'
  };

  var todayKey = '';
  var prayers = [];
  var tomorrowFajr = null;
  var tickerItems = [];
  var tickerIndex = 0;
  var tickerTimer = null;
  var adhkarIndex = 0;
  var adhkarTimer = null;
  var lastStateId = '';
  var adhanAudioEl = null;      /* عنصر صوت ملف الأذان */
  var adhanFileUrl = null;      /* Data URL للملف المرفوع */
  var audioCtx = null;
  var audioUnlocked = false;
  var chimeTimers = [];
  var isOnline = false;
  var lastRemoteSync = null;

  /* ---------- أدوات وقت ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ============================================================
     كل العرض يتم بتوقيت مدينة المسجد (وليس توقيت الجهاز) —
     حتى لو كانت المنطقة الزمنية للجهاز مضبوطة خطأً تبقى
     الأوقات والعدادات صحيحة تماماً
     ============================================================ */
  var tzFormatterCache = {};
  var WEEKDAYS_EN = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function deviceTimeZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return null; }
  }

  function cityTimeZone() {
    var loc = currentLocation();
    return loc.tz || deviceTimeZone();
  }

  function tzFormatter(tz) {
    if (!tz) return null;
    if (!(tz in tzFormatterCache)) {
      try {
        tzFormatterCache[tz] = new Intl.DateTimeFormat('en-GB', {
          timeZone: tz, hour12: false, weekday: 'short',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
      } catch (e) { tzFormatterCache[tz] = null; }
    }
    return tzFormatterCache[tz];
  }

  /* مكوّنات الوقت الحائطي للمدينة للحظة معيّنة */
  function cityParts(instant) {
    var fmt = tzFormatter(cityTimeZone());
    if (!fmt) {
      return {
        y: instant.getFullYear(), m: instant.getMonth() + 1, d: instant.getDate(),
        hh: instant.getHours(), mm: instant.getMinutes(), ss: instant.getSeconds(),
        weekday: instant.getDay()
      };
    }
    var p = {};
    fmt.formatToParts(instant).forEach(function (x) {
      if (x.type !== 'literal') p[x.type] = x.value;
    });
    return {
      y: +p.year, m: +p.month, d: +p.day,
      hh: p.hour === '24' ? 0 : +p.hour, mm: +p.minute, ss: +p.second,
      weekday: WEEKDAYS_EN[p.weekday]
    };
  }

  /* إزاحة منطقة زمنية عن UTC بالساعات للحظة معيّنة */
  function tzOffsetHours(instant, tz) {
    var fmt = tzFormatter(tz);
    if (!fmt) return -instant.getTimezoneOffset() / 60;
    var p = {};
    fmt.formatToParts(instant).forEach(function (x) {
      if (x.type !== 'literal') p[x.type] = x.value;
    });
    var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day,
      p.hour === '24' ? 0 : +p.hour, +p.minute, +p.second);
    return (asUTC - instant.getTime()) / 3600000;
  }

  function formatClockParts(cp, withSeconds) {
    var h = cp.hh, m = cp.mm, s = cp.ss;
    var suffix = '';
    if (settings.timeFormat === 12) {
      suffix = h < 12 ? 'ص' : 'م';
      h = h % 12; if (h === 0) h = 12;
      return { main: h + ':' + pad(m), seconds: withSeconds ? pad(s) : '', suffix: suffix };
    }
    return { main: pad(h) + ':' + pad(m), seconds: withSeconds ? pad(s) : '', suffix: '' };
  }

  function formatTimeShort(date) {
    if (!date) return '--:--';
    var cp = cityParts(date);
    var h = cp.hh, m = cp.mm;
    if (settings.timeFormat === 12) {
      h = h % 12; if (h === 0) h = 12;
      return h + ':' + pad(m);
    }
    return pad(h) + ':' + pad(m);
  }

  function formatDuration(ms) {
    if (ms < 0) ms = 0;
    var total = Math.floor(ms / 1000);
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    if (h > 0) return pad(h) + ':' + pad(m) + ':' + pad(s);
    return pad(m) + ':' + pad(s);
  }

  /* ---------- التاريخ الهجري (بتوقيت المدينة) ----------
     يتقدم بعد المغرب (اليوم الشرعي) — متسقاً مع شريط رمضان والمناسبات */
  function hijriString(instant) {
    var base = instant;
    for (var i = 0; i < prayers.length; i++) {
      if (prayers[i].key === 'maghrib' && prayers[i].adhan &&
          instant.getTime() >= prayers[i].adhan.getTime()) {
        base = new Date(instant.getTime() + 86400000);
      }
    }
    var adjusted = new Date(base.getTime() + settings.hijriAdjust * 86400000);
    try {
      var fmt = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn',
        { timeZone: cityTimeZone() || undefined, day: 'numeric', month: 'long', year: 'numeric' });
      var parts = fmt.formatToParts(adjusted);
      var day = '', month = '', year = '';
      parts.forEach(function (p) {
        if (p.type === 'day') day = p.value;
        if (p.type === 'month') month = p.value;
        if (p.type === 'year') year = p.value;
      });
      if (day && month && year) return day + ' ' + month + ' ' + year + ' هـ';
    } catch (e) { /* متصفح قديم → الحساب الجدولي */ }
    var cp = cityParts(adjusted);
    var h = gregToHijriTabular(cp.y, cp.m, cp.d);
    return h.d + ' ' + HIJRI_MONTHS[h.m - 1] + ' ' + h.y + ' هـ';
  }

  function gregToHijriTabular(y, m, d) {
    var a = Math.floor((m - 14) / 12);
    var jd = Math.floor((1461 * (y + 4800 + a)) / 4) +
      Math.floor((367 * (m - 2 - 12 * a)) / 12) -
      Math.floor((3 * Math.floor((y + 4900 + a) / 100)) / 4) + d - 32075;
    var l = jd - 1948440 + 10632;
    var n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    var j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) +
      (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
    l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) -
      (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
    var mm = Math.floor((24 * l) / 709);
    var dd = l - Math.floor((709 * mm) / 24);
    var yy = 30 * n + j - 30;
    return { y: yy, m: mm, d: dd };
  }

  function gregorianString(cp) {
    var months = settings.monthNames === 'western' ? MONTHS_WESTERN : MONTHS_LEVANT;
    return cp.d + ' ' + months[cp.m - 1] + ' ' + cp.y + ' م';
  }

  /* التاريخ الهجري كأرقام (مع التعديل اليدوي، بتوقيت المدينة) */
  function hijriParts(instant) {
    var adjusted = new Date(instant.getTime() + settings.hijriAdjust * 86400000);
    try {
      var fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',
        { timeZone: cityTimeZone() || undefined, day: 'numeric', month: 'numeric', year: 'numeric' });
      var day = 0, mon = 0, yr = 0;
      fmt.formatToParts(adjusted).forEach(function (p) {
        if (p.type === 'day') day = parseInt(p.value, 10);
        if (p.type === 'month') mon = parseInt(p.value, 10);
        if (p.type === 'year') yr = parseInt(p.value, 10);
      });
      if (day && mon && yr) return { d: day, m: mon, y: yr };
    } catch (e) {}
    var cp = cityParts(adjusted);
    return gregToHijriTabular(cp.y, cp.m, cp.d);
  }

  /* اليوم الهجري الشرعي يبدأ من المغرب — بعد المغرب نتقدم يوماً */
  function effectiveHijri(now) {
    var base = now;
    var maghrib = null;
    for (var i = 0; i < prayers.length; i++) {
      if (prayers[i].key === 'maghrib') maghrib = prayers[i].adhan;
    }
    if (maghrib && now.getTime() >= maghrib.getTime()) {
      base = new Date(now.getTime() + 86400000);
    }
    return hijriParts(base);
  }

  /* ---------- المناسبات الهجرية والسنن التلقائية ---------- */
  function hijriEventsFor(now) {
    if (!settings.hijriEventsEnabled) return [];
    var h = effectiveHijri(now);
    var events = [];

    /* مناسبات بتاريخ هجري ثابت */
    var FIXED = [
      { m: 1, d: 1, t: '🌙 كل عام وأنتم بخير — رأس السنة الهجرية ' },
      { m: 1, d: 9, t: 'اليوم تاسوعاء — يُستحب صيامه مع عاشوراء' },
      { m: 1, d: 10, t: 'اليوم عاشوراء — صيامه يكفّر السنة الماضية' },
      { m: 3, d: 12, t: 'ذكرى المولد النبوي الشريف — صلوا على النبي ﷺ' },
      { m: 7, d: 27, t: 'ذكرى الإسراء والمعراج' },
      { m: 8, d: 15, t: 'ليلة النصف من شعبان' },
      { m: 9, d: 1, t: '🌙 مبارك عليكم الشهر — أول أيام رمضان' },
      { m: 10, d: 1, t: '🌙 عيد فطر سعيد — تقبل الله منا ومنكم' },
      { m: 12, d: 9, t: 'اليوم يوم عرفة — صيامه يكفّر سنتين لغير الحاج' },
      { m: 12, d: 10, t: '🌙 عيد أضحى مبارك — تقبل الله منا ومنكم' }
    ];
    for (var i = 0; i < FIXED.length; i++) {
      if (h.m === FIXED[i].m && h.d === FIXED[i].d) events.push(FIXED[i].t);
    }

    /* فترات */
    if (h.m === 9 && h.d >= 20) events.push('تحرّوا ليلة القدر في العشر الأواخر — ليلةٌ خير من ألف شهر');
    if (h.m === 12 && h.d >= 1 && h.d <= 9) events.push('عشر ذي الحجة — ما من أيام العمل الصالح فيهن أحب إلى الله');
    if (h.m === 12 && h.d >= 11 && h.d <= 13) events.push('أيام التشريق — أيام أكل وشرب وذكر لله');

    /* الأيام البيض */
    if (h.d === 12 && h.m !== 9) events.push('غداً تبدأ الأيام البيض (13، 14، 15) — يُستحب صيامها');
    if (h.d >= 13 && h.d <= 15 && h.m !== 9) events.push('الأيام البيض — يُستحب صيامها');

    /* سنن الأسبوع — بعد المغرب نُذكّر بيوم الغد */
    var afterMaghrib = false;
    for (var j = 0; j < prayers.length; j++) {
      if (prayers[j].key === 'maghrib' && prayers[j].adhan &&
          now.getTime() >= prayers[j].adhan.getTime()) afterMaghrib = true;
    }
    var weekday = (cityParts(now).weekday + (afterMaghrib ? 1 : 0)) % 7;
    if (weekday === 5) {
      events.push(afterMaghrib
        ? 'ليلة الجمعة — أكثروا من الصلاة على النبي ﷺ'
        : 'يوم الجمعة — سنّة قراءة سورة الكهف والإكثار من الصلاة على النبي ﷺ');
    }
    if (afterMaghrib && (weekday === 1 || weekday === 4) && h.m !== 9) {
      events.push('يُستحب غداً صيام يوم ' + (weekday === 1 ? 'الاثنين' : 'الخميس'));
    }

    return events;
  }

  /* ---------- وضع رمضان ---------- */
  function isRamadan(now) {
    return settings.ramadanAuto && effectiveHijri(now).m === 9;
  }

  function renderRamadanBar(now) {
    var bar = document.getElementById('ramadan-bar');
    if (!isRamadan(now)) {
      bar.style.display = 'none';
      return;
    }
    var fajr = null, maghrib = null;
    prayers.forEach(function (p) {
      if (p.key === 'fajr') fajr = p.adhan;
      if (p.key === 'maghrib') maghrib = p.adhan;
    });
    var h = effectiveHijri(now);
    var imsak = fajr ? new Date(fajr.getTime() - settings.imsakOffsetMin * 60000) : null;
    document.getElementById('ramadan-day').textContent = h.d + ' رمضان';
    document.getElementById('ramadan-imsak').textContent = formatTimeShort(imsak);
    document.getElementById('ramadan-iftar').textContent = formatTimeShort(maghrib);
    bar.style.display = 'flex';
  }

  /* ---------- حساب صلوات اليوم (بتوقيت المدينة) ---------- */
  function computeDay() {
    var now = new Date();
    var loc = currentLocation();
    var tz = cityTimeZone();
    var cp = cityParts(now);

    /* إزاحة المدينة عن UTC لهذا اليوم (تُحتسب عند الظهر لتفادي لحظة تبديل الساعة) */
    var offset = tzOffsetHours(new Date(Date.UTC(cp.y, cp.m - 1, cp.d, 12, 0, 0)), tz);
    var utcBase = Date.UTC(cp.y, cp.m - 1, cp.d, 0, 0, 0) - offset * 3600000;
    var opts = {
      lat: loc.lat, lng: loc.lng, method: settings.method, asrFactor: settings.asrFactor,
      tz: offset, utcBase: utcBase
    };
    /* كائن تاريخ تُقرأ منه السنة/الشهر/اليوم فقط داخل المحرك */
    var t = PrayTimes.getTimes(new Date(cp.y, cp.m - 1, cp.d, 12), opts);

    /* فجر الغد بتوقيت المدينة */
    var cpT = cityParts(new Date(utcBase + 36 * 3600000));
    var offsetT = tzOffsetHours(new Date(Date.UTC(cpT.y, cpT.m - 1, cpT.d, 12, 0, 0)), tz);
    var optsT = {
      lat: loc.lat, lng: loc.lng, method: settings.method, asrFactor: settings.asrFactor,
      tz: offsetT, utcBase: Date.UTC(cpT.y, cpT.m - 1, cpT.d, 0, 0, 0) - offsetT * 3600000
    };
    tomorrowFajr = PrayTimes.getTimes(new Date(cpT.y, cpT.m - 1, cpT.d, 12), optsT).fajr;

    var isFriday = cp.weekday === 5;
    prayers = [];

    prayers.push(makePrayer('fajr', t.fajr, settings.iqama.fajr));
    prayers.push({
      key: 'sunrise', name: PRAYER_NAMES.sunrise, adhan: t.sunrise, iqama: null, isPrayer: false,
      duha: t.sunrise ? new Date(t.sunrise.getTime() + 20 * 60000) : null
    });

    if (isFriday) {
      var jumuaAdhan = t.dhuhr;
      if (settings.jumuaMode === 'fixed') {
        var hm = settings.jumuaTime.split(':');
        /* isNaN وليس || — حتى لا تتحول "12:00" إلى "12:30" (الصفر falsy) */
        var jH = parseInt(hm[0], 10);
        var jM = parseInt(hm[1], 10);
        if (isNaN(jH)) jH = 12;
        if (isNaN(jM)) jM = 30;
        jumuaAdhan = new Date(utcBase + (jH * 60 + jM) * 60000);
      }
      var jumua = makePrayer('jumua', jumuaAdhan, settings.khutbahMin);
      jumua.isJumua = true;
      prayers.push(jumua);
    } else {
      prayers.push(makePrayer('dhuhr', t.dhuhr, settings.iqama.dhuhr));
    }

    prayers.push(makePrayer('asr', t.asr, settings.iqama.asr));
    prayers.push(makePrayer('maghrib', t.maghrib, settings.iqama.maghrib));
    prayers.push(makePrayer('isha', t.isha, settings.iqama.isha));

    todayKey = cp.y + '-' + cp.m + '-' + cp.d + '|computed';

    buildPrayerCards();
    renderDates(now);
    renderRamadanBar(now);
    updateTzWarning();
  }

  function makePrayer(key, adhan, iqamaOffsetMin) {
    return {
      key: key,
      name: PRAYER_NAMES[key],
      adhan: adhan,
      iqama: adhan ? new Date(adhan.getTime() + iqamaOffsetMin * 60000) : null,
      isPrayer: true
    };
  }

  /* ---------- بناء بطاقات الصلوات ---------- */
  function buildPrayerCards() {
    var row = document.getElementById('prayers-row');
    row.innerHTML = '';
    prayers.forEach(function (p) {
      var card = document.createElement('div');
      card.className = 'prayer-card' + (p.isPrayer ? '' : ' sunrise-card');
      card.id = 'card-' + p.key;
      var iqamaHtml = p.isPrayer
        ? '<div class="card-iqama"><span class="iqama-label">' +
          (p.isJumua ? 'الخطبة ثم الإقامة' : 'الإقامة') + '</span><span class="iqama-time">' +
          formatTimeShort(p.iqama) + '</span></div>'
        : '<div class="card-iqama"><span class="iqama-label">الضحى</span><span class="iqama-time">' +
          formatTimeShort(p.duha) + '</span></div>';
      var noteHtml = (p.key === 'isha' && settings.taraweehNote && isRamadan(new Date()))
        ? '<div class="card-note">🌙 يليها التراويح</div>' : '';
      card.innerHTML =
        '<div class="card-name">' + p.name + '</div>' +
        '<div class="card-time">' + formatTimeShort(p.adhan) + '</div>' +
        iqamaHtml + noteHtml;
      row.appendChild(card);
    });
  }

  function renderDates(now) {
    var cp = cityParts(now);
    document.getElementById('day-name').textContent = DAYS[cp.weekday];
    document.getElementById('hijri-date').textContent = hijriString(now);
    document.getElementById('greg-date').textContent = gregorianString(cp);
    document.getElementById('mosque-name').textContent = settings.mosqueName;
    document.getElementById('city-name').textContent = currentLocation().name;
  }

  /* تحذير عدم تطابق المنطقة الزمنية للجهاز مع مدينة المسجد */
  function updateTzWarning() {
    var el = document.getElementById('tz-warning');
    if (!el) return;
    var now = new Date();
    var cityOffset = tzOffsetHours(now, cityTimeZone());
    var deviceOffset = -now.getTimezoneOffset() / 60;
    el.style.display = Math.abs(cityOffset - deviceOffset) > 0.02 ? '' : 'none';
  }

  /* ---------- تحديد الحالة الحالية ---------- */
  /* الأذان له الأولوية المطلقة: يُفحص لكل الصلوات أولاً حتى لا تبتلعه
     نافذة صلاة/أذكار طويلة من الصلاة السابقة */
  function currentEvent(now) {
    var t = now.getTime();
    var i, p;

    for (i = 0; i < prayers.length; i++) {
      p = prayers[i];
      if (!p.isPrayer || !p.adhan) continue;
      var adhanStart = p.adhan.getTime();
      var adhanEnd = Math.min(adhanStart + settings.adhanScreenMin * 60000, p.iqama.getTime());
      if (t >= adhanStart && t < adhanEnd) return { state: 'adhan', prayer: p };
    }

    for (i = 0; i < prayers.length; i++) {
      p = prayers[i];
      if (!p.isPrayer || !p.adhan) continue;
      var adhanStart2 = p.adhan.getTime();
      var iqamaTime = p.iqama.getTime();
      var adhanEnd2 = Math.min(adhanStart2 + settings.adhanScreenMin * 60000, iqamaTime);
      var prayerEnd = iqamaTime + settings.prayerScreenMin * 60000;
      var adhkarEnd = prayerEnd + settings.adhkarScreenMin * 60000;
      /* لا تمتد أي نافذة إلى ما بعد أذان الصلاة التالية */
      var next = prayers[i + 1];
      while (next && !next.isPrayer) next = prayers[prayers.indexOf(next) + 1];
      if (next && next.adhan) {
        var cap = next.adhan.getTime();
        if (prayerEnd > cap) prayerEnd = cap;
        if (adhkarEnd > cap) adhkarEnd = cap;
      }
      if (t >= adhanEnd2 && t < iqamaTime) return { state: 'iqamaWait', prayer: p };
      if (t >= iqamaTime && t < prayerEnd) return { state: 'prayer', prayer: p };
      if (t >= prayerEnd && t < adhkarEnd) return { state: 'adhkar', prayer: p };
    }

    return { state: 'normal', prayer: null };
  }

  function nextPrayer(now) {
    for (var i = 0; i < prayers.length; i++) {
      var p = prayers[i];
      if (p.isPrayer && p.adhan && p.adhan.getTime() > now.getTime()) return p;
    }
    return null;
  }

  /* ---------- الحلقة الرئيسية ---------- */
  var lastMinuteKey = '';
  var lastDynamicSig = '';

  function tick() {
    var now = new Date();
    var cp = cityParts(now);

    var dayCheck = cp.y + '-' + cp.m + '-' + cp.d;
    /* مساواة تامة وليس بادئة — حتى يُكتشف رجوع ساعة الجهاز (22→2) */
    if (todayKey !== dayCheck + '|computed') computeDay();

    /* مرة كل دقيقة: تحديث المناسبات والهجري ووضع رمضان (تتغير عند المغرب) */
    var minuteKey = dayCheck + ' ' + cp.hh + ':' + cp.mm;
    if (minuteKey !== lastMinuteKey) {
      lastMinuteKey = minuteKey;
      var eh = effectiveHijri(now);
      var sig = JSON.stringify(hijriEventsFor(now)) + '|' + isRamadan(now) +
        '|' + eh.y + '-' + eh.m + '-' + eh.d;
      if (sig !== lastDynamicSig) {
        lastDynamicSig = sig;
        renderRamadanBar(now);
        renderDates(now);
        buildPrayerCards();
        startTicker();
      }
      /* إعادة تحميل يومية آمنة (00:20 بتوقيت المدينة) لتجديد الذاكرة والنسخة —
         الختم في sessionStorage يمنع تكرار التحميل خلال نفس الدقيقة */
      if (cp.hh === 0 && cp.mm === 20 && currentEvent(now).state === 'normal') {
        var stamped = false;
        try {
          if (sessionStorage.getItem('mosqueScreen.dailyReload') !== dayCheck) {
            sessionStorage.setItem('mosqueScreen.dailyReload', dayCheck);
            stamped = sessionStorage.getItem('mosqueScreen.dailyReload') === dayCheck;
          }
        } catch (e) { stamped = false; }
        if (stamped) {
          try { location.reload(); } catch (e) {}
        }
      }
    }

    var clk = formatClockParts(cp, settings.showSeconds);
    document.getElementById('clock-main').textContent = clk.main;
    document.getElementById('clock-seconds').textContent = clk.seconds;
    document.getElementById('clock-suffix').textContent = clk.suffix;

    var ev = currentEvent(now);
    applyState(ev, now);
    updateCards(ev, now);
    manageAnnScreen(ev, now, cp);
  }

  function show(id, visible) {
    document.getElementById(id).style.display = visible ? 'flex' : 'none';
  }

  function applyState(ev, now) {
    var stateId = ev.state + ':' + (ev.prayer ? ev.prayer.key : '');
    var entered = stateId !== lastStateId;

    show('adhan-overlay', ev.state === 'adhan');
    show('prayer-overlay', ev.state === 'prayer');
    show('adhkar-overlay', ev.state === 'adhkar');

    var countdownLabel = document.getElementById('countdown-label');
    var countdownValue = document.getElementById('countdown-value');

    if (ev.state === 'adhan') {
      show('iqama-soon-overlay', false);
      document.getElementById('adhan-prayer-name').textContent =
        ev.prayer.isJumua ? 'حان الآن موعد أذان الجمعة' : 'حان الآن موعد أذان ' + ev.prayer.name;
      document.getElementById('adhan-time').textContent = formatTimeShort(ev.prayer.adhan);
      if (entered) playAdhan();

    } else if (ev.state === 'prayer') {
      show('iqama-soon-overlay', false);
      document.getElementById('prayer-overlay-name').textContent =
        ev.prayer.isJumua ? 'أقيمت صلاة الجمعة' : 'أقيمت صلاة ' + ev.prayer.name;
      if (entered) stopAdhan();

    } else if (ev.state === 'adhkar') {
      show('iqama-soon-overlay', false);
      if (entered) startAdhkarRotation();

    } else if (ev.state === 'iqamaWait') {
      var remaining = ev.prayer.iqama.getTime() - now.getTime();
      var labelTxt = ev.prayer.isJumua
        ? 'إقامة صلاة الجمعة بعد'
        : 'إقامة صلاة ' + ev.prayer.name + ' بعد';
      if (remaining <= 60000) {
        show('iqama-soon-overlay', true);
        document.getElementById('iqama-soon-label').textContent = labelTxt;
        document.getElementById('iqama-soon-value').textContent = formatDuration(remaining);
      } else {
        show('iqama-soon-overlay', false);
        countdownLabel.textContent = labelTxt;
        countdownValue.textContent = formatDuration(remaining);
        countdownValue.classList.add('iqama-mode');
      }

    } else {
      show('iqama-soon-overlay', false);
      countdownValue.classList.remove('iqama-mode');
      var np = nextPrayer(now);
      if (np) {
        var lbl = 'المتبقي لأذان ' + (np.isJumua ? 'الجمعة' : np.name);
        if (np.key === 'maghrib' && isRamadan(now)) lbl = '🌙 المتبقي للإفطار';
        countdownLabel.textContent = lbl;
        countdownValue.textContent = formatDuration(np.adhan.getTime() - now.getTime());
      } else if (tomorrowFajr) {
        countdownLabel.textContent = 'المتبقي لأذان الفجر';
        countdownValue.textContent = formatDuration(tomorrowFajr.getTime() - now.getTime());
      }
    }

    if (ev.state !== 'adhkar' && lastStateId.indexOf('adhkar:') === 0) stopAdhkarRotation();
    lastStateId = stateId;
  }

  function updateCards(ev, now) {
    var np = nextPrayer(now);
    prayers.forEach(function (p) {
      var card = document.getElementById('card-' + p.key);
      if (!card) return;
      card.classList.remove('next', 'active', 'passed');
      if (ev.prayer && ev.prayer.key === p.key && ev.state !== 'normal') {
        card.classList.add('active');
      } else if (np && np.key === p.key) {
        card.classList.add('next');
      } else if (p.adhan && p.adhan.getTime() < now.getTime()) {
        card.classList.add('passed');
      }
    });
  }

  /* ---------- شاشة الإعلانات الكاملة (بجدولة المدير) ---------- */
  var annVisible = false;
  var annShowUntil = 0;
  var annLastShow = 0;
  var annRotTimer = null;
  var annIndex = 0;
  var annTimesShown = {};   /* {'HH:MM': 'yyyy-m-d'} حتى لا يتكرر نفس الوقت */

  function manageAnnScreen(ev, now, cp) {
    var t = now.getTime();

    /* لا تظهر أبداً فوق شاشات الصلاة */
    if (ev.state !== 'normal') { hideAnnScreen(); return; }
    if (!settings.annScreenEnabled || !settings.announcementsEnabled ||
        settings.announcements.length === 0) { hideAnnScreen(); return; }

    if (annVisible) {
      if (t >= annShowUntil) hideAnnScreen();
      return;
    }

    /* لا تظهر قبل الأذان بأقل من 3 دقائق */
    var np = nextPrayer(now);
    var nextAdhanMs = np ? np.adhan.getTime()
      : (tomorrowFajr ? tomorrowFajr.getTime() : Infinity);
    var totalMs = settings.announcements.length * settings.annScreenDurationSec * 1000;
    if (nextAdhanMs - t < totalMs + 3 * 60000) return;

    var due = false;

    /* جدولة بالتكرار: كل X دقيقة */
    if (settings.annScreenEveryMin > 0 && t - annLastShow >= settings.annScreenEveryMin * 60000) {
      due = true;
    }

    /* جدولة بأوقات محددة من المدير (بتوقيت المدينة) */
    var hhmm = pad(cp.hh) + ':' + pad(cp.mm);
    var dayStr = cp.y + '-' + cp.m + '-' + cp.d;
    if (settings.annScreenTimes.indexOf(hhmm) > -1 && annTimesShown[hhmm] !== dayStr) {
      annTimesShown[hhmm] = dayStr;
      due = true;
    }

    if (due) showAnnScreen(t, totalMs);
  }

  function showAnnScreen(t, totalMs) {
    annVisible = true;
    annLastShow = t;
    annShowUntil = t + totalMs;
    annIndex = 0;
    show('ann-overlay', true);
    renderAnnItem();
    if (annRotTimer) clearInterval(annRotTimer);
    if (settings.announcements.length > 1) {
      annRotTimer = setInterval(function () {
        annIndex = (annIndex + 1) % settings.announcements.length;
        renderAnnItem();
      }, settings.annScreenDurationSec * 1000);
    }
  }

  function hideAnnScreen() {
    if (!annVisible) {
      var el = document.getElementById('ann-overlay');
      if (el.style.display !== 'none' && el.style.display !== '') show('ann-overlay', false);
      return;
    }
    annVisible = false;
    show('ann-overlay', false);
    if (annRotTimer) { clearInterval(annRotTimer); annRotTimer = null; }
  }

  function renderAnnItem() {
    var el = document.getElementById('ann-text');
    el.classList.remove('show');
    setTimeout(function () {
      el.textContent = settings.announcements[annIndex] || '';
      el.classList.add('show');
    }, 300);
    var dots = document.getElementById('ann-dots');
    dots.innerHTML = '';
    if (settings.announcements.length > 1) {
      for (var i = 0; i < settings.announcements.length; i++) {
        var d = document.createElement('span');
        d.className = 'adot' + (i === annIndex ? ' on' : '');
        dots.appendChild(d);
      }
    }
  }

  /* ---------- صور الخلفيات ---------- */
  var bgImages = [];
  var bgIndex = 0;
  var bgTimer = null;
  var bgLayerA = true;

  function startBackgrounds() {
    if (bgTimer) { clearInterval(bgTimer); bgTimer = null; }
    var wrap = document.getElementById('bg-photos');
    if (settings.bgMode !== 'photos' || bgImages.length === 0) {
      wrap.style.display = 'none';
      document.body.classList.remove('photos-bg');
      return;
    }
    wrap.style.display = '';
    document.body.classList.add('photos-bg');
    document.getElementById('bg-overlay').style.opacity = settings.bgOverlay / 100;
    bgIndex = 0;
    bgLayerA = true;
    document.getElementById('bg-a').style.backgroundImage = 'url("' + bgImages[0] + '")';
    document.getElementById('bg-a').classList.add('show');
    document.getElementById('bg-b').classList.remove('show');
    if (bgImages.length > 1) {
      bgTimer = setInterval(function () {
        bgIndex = (bgIndex + 1) % bgImages.length;
        var incoming = document.getElementById(bgLayerA ? 'bg-b' : 'bg-a');
        var outgoing = document.getElementById(bgLayerA ? 'bg-a' : 'bg-b');
        incoming.style.backgroundImage = 'url("' + bgImages[bgIndex] + '")';
        incoming.classList.add('show');
        outgoing.classList.remove('show');
        bgLayerA = !bgLayerA;
      }, Math.max(1, settings.bgIntervalMin) * 60000);
    }
  }

  /* ---------- شاشة الأذكار بعد الصلاة (مع التكرار حسب السنة) ---------- */
  var repTimer = null;

  /* صيغة السطر: «النص | العدد» — العدد اختياري (افتراضياً مرة واحدة) */
  function parseDhikr(line) {
    var idx = line.lastIndexOf('|');
    if (idx > -1) {
      var count = parseInt(line.slice(idx + 1).trim(), 10);
      if (!isNaN(count) && count >= 1) {
        return { text: line.slice(0, idx).trim(), count: Math.min(count, 500) };
      }
    }
    return { text: line.trim(), count: 1 };
  }

  /* مدة عرض الذكر: تطول تلقائياً بما يكفي لترديده (ثانيتان لكل مرة) */
  function dhikrDuration(d) {
    return d.count > 1
      ? Math.max(settings.adhkarSecondsEach, d.count * 2)
      : settings.adhkarSecondsEach;
  }

  function startAdhkarRotation() {
    stopAdhkarRotation();
    adhkarIndex = 0;
    showCurrentDhikr();
  }

  function stopAdhkarRotation() {
    if (adhkarTimer) { clearTimeout(adhkarTimer); adhkarTimer = null; }
    if (repTimer) { clearInterval(repTimer); repTimer = null; }
  }

  function showCurrentDhikr() {
    var list = settings.adhkarTexts;
    if (!list.length) return;
    var d = parseDhikr(list[adhkarIndex % list.length]);
    renderDhikr(d);
    var durMs = dhikrDuration(d) * 1000;
    startRepCounter(d, durMs);
    if (adhkarTimer) clearTimeout(adhkarTimer);
    adhkarTimer = setTimeout(function () {
      adhkarIndex = (adhkarIndex + 1) % list.length;
      showCurrentDhikr();
    }, durMs);
  }

  /* عدّاد مباشر يواكب وتيرة الترديد */
  function startRepCounter(d, durMs) {
    if (repTimer) { clearInterval(repTimer); repTimer = null; }
    var rep = document.getElementById('adhkar-rep');
    if (d.count <= 1) {
      rep.style.display = 'none';
      return;
    }
    rep.style.display = '';
    document.getElementById('adhkar-rep-total').textContent = d.count;
    var live = document.getElementById('adhkar-rep-live');
    var current = 1;
    live.textContent = '1';
    var step = durMs / d.count;
    repTimer = setInterval(function () {
      if (current < d.count) {
        current++;
        live.textContent = String(current);
        live.classList.remove('tickanim');
        void live.offsetWidth; /* إعادة تشغيل الحركة */
        live.classList.add('tickanim');
      } else {
        clearInterval(repTimer);
        repTimer = null;
      }
    }, step);
  }

  function renderDhikr(d) {
    var el = document.getElementById('adhkar-text');
    el.classList.remove('show');
    setTimeout(function () {
      el.textContent = d.text;
      el.classList.add('show');
    }, 350);
    var dots = document.getElementById('adhkar-dots');
    dots.innerHTML = '';
    for (var i = 0; i < settings.adhkarTexts.length; i++) {
      var dot = document.createElement('span');
      dot.className = 'adot' + (i === adhkarIndex ? ' on' : '');
      dots.appendChild(dot);
    }
  }

  /* ---------- صوت الأذان ---------- */
  function ensureAudioCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    return audioCtx;
  }

  /* العنصر الصوتي الفعّال حسب الوضع المختار */
  function getActiveAdhanElement() {
    var mode = settings.adhanSoundMode;
    if (mode === 'file') return adhanAudioEl;
    if (BUILTIN_ADHANS[mode]) {
      if (!builtinAudioEl) { builtinAudioEl = new Audio(); builtinAudioEl.preload = 'auto'; }
      if (builtinAudioEl.getAttribute('data-mode') !== mode) {
        builtinAudioEl.src = BUILTIN_ADHANS[mode];
        builtinAudioEl.setAttribute('data-mode', mode);
      }
      return builtinAudioEl;
    }
    return null;
  }

  /* فتح قفل الصوت بأول ضغطة: «تبريك» العنصر الفعّال نفسه حتى يعمل
     التشغيل التلقائي وقت الأذان ولو بعد ساعات */
  function unlockAudio() {
    if (audioUnlocked) return;
    var ctx = ensureAudioCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    var el = getActiveAdhanElement();
    if (el) {
      /* إن كان الأذان يُبث الآن فهو مفعّل أصلاً — لا نقاطعه أبداً */
      if (!el.paused) {
        audioUnlocked = true;
        updateSoundIndicator();
        return;
      }
      el.muted = true;
      var p = el.play();
      if (p && p.then) {
        p.then(function () {
          el.pause();
          el.currentTime = 0;
          el.muted = false;
          audioUnlocked = true;
          updateSoundIndicator();
        }).catch(function () { el.muted = false; });
      }
    } else {
      audioUnlocked = true;
      updateSoundIndicator();
    }
  }

  /* نغمة تنبيه مدمجة (لا تحتاج ملفات) — جرسان هادئان متتاليان */
  function playChime() {
    var ctx = ensureAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    stopChime();
    var seq = [
      { f: 523.25, t: 0.00 }, { f: 659.25, t: 0.45 }, { f: 783.99, t: 0.90 },
      { f: 659.25, t: 1.60 }, { f: 523.25, t: 2.05 }, { f: 783.99, t: 2.70 }
    ];
    seq.forEach(function (n) {
      var id = setTimeout(function () {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = n.f;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.6);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.7);
      }, n.t * 1000);
      chimeTimers.push(id);
    });
  }

  function stopChime() {
    chimeTimers.forEach(clearTimeout);
    chimeTimers = [];
  }

  /* الأذانات المدمجة — ملفات محلية تعمل بدون إنترنت */
  var BUILTIN_ADHANS = {
    makkah: 'audio/adhan-makkah.mp3',
    madinah: 'audio/adhan-madinah.mp3',
    quds: 'audio/adhan-quds.mp3',
    alhindi: 'audio/adhan-alhindi.mp3'
  };
  var builtinAudioEl = null;

  function playAdhan() {
    if (!settings.adhanSoundEnabled) return;
    /* لا صوت من تبويب مخفي بالخلفية — شاشة المسجد ظاهرة دائماً،
       أما على كمبيوتر شخصي فالصوت من صفحة مخفية مربك */
    if (document.hidden) return;
    var el = getActiveAdhanElement();
    if (el) {
      el.muted = false;
      el.currentTime = 0;
      var p = el.play();
      if (p && p.catch) p.catch(function () { playChime(); });
    } else {
      playChime();
    }
  }

  function stopAdhan() {
    stopChime();
    if (adhanAudioEl) { adhanAudioEl.pause(); adhanAudioEl.currentTime = 0; }
    if (builtinAudioEl) { builtinAudioEl.pause(); builtinAudioEl.currentTime = 0; }
  }

  window.testAdhanSound = function () { playAdhan(); };
  window.stopAdhanSound = function () { stopAdhan(); };

  function updateSoundIndicator() {
    var el = document.getElementById('sound-indicator');
    if (!settings.adhanSoundEnabled) {
      el.className = 'status-chip off';
      el.querySelector('span').textContent = 'الصوت مغلق';
    } else if (!audioUnlocked) {
      el.className = 'status-chip warn';
      el.querySelector('span').textContent = 'اضغط لتفعيل الصوت';
    } else {
      el.className = 'status-chip on';
      el.querySelector('span').textContent = 'الصوت مفعّل';
    }
  }

  /* ---------- الملفات المخزنة (صورة + أذان) ---------- */
  function loadAssets() {
    AssetStore.get('mosquePhoto').then(function (dataUrl) {
      var img = document.getElementById('mosque-photo');
      var icon = document.getElementById('mosque-icon');
      if (dataUrl) {
        img.src = dataUrl;
        img.style.display = '';
        icon.style.display = 'none';
      } else {
        img.style.display = 'none';
        icon.style.display = '';
      }
    }).catch(function () {});

    AssetStore.get('backgrounds').then(function (list) {
      bgImages = list || [];
      startBackgrounds();
    }).catch(function () {});

    AssetStore.get('adhanAudio').then(function (dataUrl) {
      adhanFileUrl = dataUrl;
      if (dataUrl) {
        if (!adhanAudioEl) {
          adhanAudioEl = new Audio();
          adhanAudioEl.preload = 'auto';
        }
        adhanAudioEl.src = dataUrl;
      } else {
        adhanAudioEl = null;
      }
    }).catch(function () {});
  }

  window.onAssetsChanged = loadAssets;

  /* ---------- حالة الاتصال ----------
     عند الاستضافة: نفحص موقعنا نفسه (طلب HEAD يتجاوز كاش الـSW) —
     أدق من فحص خدمة خارجية قد تكون محجوبة في بعض الشبكات */
  function checkOnline() {
    if (!navigator.onLine) { setOnline(false); return; }
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      fetch('./?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' })
        .then(function () { setOnline(true); })
        .catch(function () { setOnline(false); });
      return;
    }
    /* تشغيل من ملف محلي — فحص بصورة خارجية */
    var img = new Image();
    var done = false;
    var timer = setTimeout(function () {
      if (!done) { done = true; setOnline(false); }
    }, 6000);
    img.onload = function () {
      if (!done) { done = true; clearTimeout(timer); setOnline(true); }
    };
    img.onerror = function () {
      if (!done) { done = true; clearTimeout(timer); setOnline(false); }
    };
    img.src = 'https://www.google.com/favicon.ico?_=' + Date.now();
  }

  function setOnline(v) {
    isOnline = v;
    var el = document.getElementById('net-indicator');
    el.className = 'status-chip ' + (v ? 'on' : 'off');
    el.querySelector('span').textContent = v ? 'متصل' : 'غير متصل';
  }

  /* ---------- التحديث عن بُعد ----------
     لا نمنعه بناء على مؤشر الاتصال — نحاول دائماً ونفشل بصمت،
     وكل القيم الواردة تمر بتنقية صارمة قبل تطبيقها */
  function remoteSync() {
    if (!settings.remoteEnabled || !settings.remoteUrl) return;
    fetch(settings.remoteUrl + (settings.remoteUrl.indexOf('?') > -1 ? '&' : '?') + '_=' + Date.now(),
      { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (incoming) {
        if (!incoming || typeof incoming !== 'object') return;
        setOnline(true); /* نجاح الجلب دليل اتصال فعلي */
        var clean = sanitizeSettings(incoming);
        /* لا يُسمح للتحديث البعيد بتغيير رابط التحديث نفسه */
        delete clean.remoteUrl;
        delete clean.remoteEnabled;
        var before = JSON.stringify(settings);
        settings = mergeSettings(settings, clean);
        if (JSON.stringify(settings) !== before) {
          saveSettings();
          onSettingsChanged();
        }
        lastRemoteSync = new Date();
        try { localStorage.setItem('mosqueScreen.lastSync', lastRemoteSync.toISOString()); } catch (e) {}
        var el = document.getElementById('remote-sync-status');
        if (el) el.textContent = 'آخر تحديث عن بُعد: ' + formatTimeShort(lastRemoteSync);
      })
      .catch(function () {});
  }

  /* ---------- شريط الأذكار والإعلانات ---------- */
  function buildTickerItems() {
    tickerItems = [];
    /* المناسبات الهجرية والسنن أولاً — الأكثر ارتباطاً باليوم */
    hijriEventsFor(new Date()).forEach(function (t) {
      tickerItems.push({ type: 'event', text: t });
    });
    if (settings.tickerEnabled) {
      settings.tickerTexts.forEach(function (t) {
        tickerItems.push({ type: 'dhikr', text: t });
      });
    }
    if (settings.announcementsEnabled && settings.announcements.length) {
      /* توزيع الإعلانات بين الأذكار حتى تظهر بشكل متكرر */
      var ads = settings.announcements.map(function (t) { return { type: 'ad', text: t }; });
      if (tickerItems.length === 0) {
        tickerItems = ads;
      } else {
        var merged = [];
        var step = Math.max(1, Math.floor(tickerItems.length / ads.length));
        var ai = 0;
        for (var i = 0; i < tickerItems.length; i++) {
          merged.push(tickerItems[i]);
          if ((i + 1) % step === 0 && ai < ads.length) merged.push(ads[ai++]);
        }
        while (ai < ads.length) merged.push(ads[ai++]);
        tickerItems = merged;
      }
    }
  }

  function startTicker() {
    var bar = document.getElementById('ticker-bar');
    buildTickerItems();
    if (tickerTimer) clearInterval(tickerTimer);
    if (tickerItems.length === 0) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'flex';
    tickerIndex = 0;
    renderTickerItem();
    tickerTimer = setInterval(function () {
      var textEl = document.getElementById('ticker-text');
      textEl.classList.remove('show');
      setTimeout(function () {
        tickerIndex = (tickerIndex + 1) % tickerItems.length;
        renderTickerItem();
      }, 600);
    }, 15000);
  }

  function renderTickerItem() {
    var item = tickerItems[tickerIndex];
    var textEl = document.getElementById('ticker-text');
    var badge = document.getElementById('ticker-badge');
    textEl.textContent = item.text;
    textEl.classList.remove('ad');
    badge.classList.remove('event-badge');
    if (item.type === 'ad') {
      badge.textContent = 'إعلان';
      badge.style.display = '';
      textEl.classList.add('ad');
    } else if (item.type === 'event') {
      badge.textContent = 'مناسبة';
      badge.classList.add('event-badge');
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
    textEl.classList.add('show');
  }

  /* ---------- تطبيق الثيم والألوان ---------- */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', settings.theme);
    var root = document.documentElement.style;
    ['--bg-1', '--bg-2', '--bg-3', '--accent', '--accent-soft', '--text',
     '--text-dim', '--card-bg', '--card-border', '--glow'].forEach(function (v) {
      root.removeProperty(v);
    });
    if (settings.theme === 'custom') {
      var c = settings.customColors;
      root.setProperty('--bg-1', c.bg1);
      root.setProperty('--bg-2', c.bg2);
      root.setProperty('--bg-3', shade(c.bg1, -35));
      root.setProperty('--accent', c.accent);
      root.setProperty('--accent-soft', hexToRgba(c.accent, 0.22));
      root.setProperty('--text', c.text);
      root.setProperty('--text-dim', hexToRgba(c.text, 0.62));
      root.setProperty('--card-bg', hexToRgba(c.text, 0.055));
      root.setProperty('--card-border', hexToRgba(c.accent, 0.25));
      root.setProperty('--glow', hexToRgba(c.accent, 0.14));
    }
  }

  function hexToRgba(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function shade(hex, pct) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    var r = Math.max(0, Math.min(255, ((n >> 16) & 255) + Math.round(255 * pct / 100)));
    var g = Math.max(0, Math.min(255, ((n >> 8) & 255) + Math.round(255 * pct / 100)));
    var b = Math.max(0, Math.min(255, (n & 255) + Math.round(255 * pct / 100)));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* يُستدعى عند حفظ الإعدادات */
  window.onSettingsChanged = function () {
    applyTheme();
    applyOrientation();
    lastDynamicSig = '';
    todayKey = '';
    computeDay();
    startTicker();
    startBackgrounds();
    hideAnnScreen();
    restartRemoteTimer();
    /* إعادة تبريك العنصر الصوتي الجديد — الحفظ نفسه ضغطة مستخدم */
    audioUnlocked = false;
    unlockAudio();
    updateSoundIndicator();
    tick();
  };

  /* مؤقت التحديث عن بُعد — يُعاد ضبطه عند تغيير الفترة */
  var remoteTimer = null;
  function restartRemoteTimer() {
    if (remoteTimer) clearInterval(remoteTimer);
    remoteTimer = setInterval(function () { remoteSync(); },
      Math.max(1, settings.remoteIntervalMin) * 60000);
  }

  /* ---------- اتجاه العرض (أفقي / عمودي / تلقائي) ---------- */
  function applyOrientation() {
    var portrait;
    if (settings.orientation === 'portrait') portrait = true;
    else if (settings.orientation === 'landscape') portrait = false;
    else portrait = window.matchMedia('(orientation: portrait)').matches;
    document.body.classList.toggle('layout-portrait', portrait);
  }

  /* ---------- تسجيل Service Worker (PWA — يعمل عند الاستضافة على رابط) ---------- */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' &&
        location.hostname !== '127.0.0.1') return;

    /* عند تفعيل نسخة جديدة: إعادة تحميل آمنة بعيداً عن أوقات الصلاة
       حتى تعمل الشاشة فعلياً بالكود الجديد وليس القديم */
    var hadController = !!navigator.serviceWorker.controller;
    /* بعد Hard Reload لا يوجد controller رغم وجود SW نشط —
       نتأكد حتى لا يضيع إشعار تحديث حقيقي */
    navigator.serviceWorker.getRegistration().then(function (r) {
      if (r && (r.active || r.waiting)) hadController = true;
    }).catch(function () {});
    var refreshing = false;
    function safeReload() {
      if (refreshing) return;
      if (currentEvent(new Date()).state === 'normal') {
        refreshing = true;
        location.reload();
      } else {
        setTimeout(safeReload, 5 * 60000);
      }
    }
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) { hadController = true; return; } /* أول تثبيت — لا حاجة */
      safeReload();
    });

    navigator.serviceWorker.register('sw.js').then(function (reg) {
      /* فحص التحديثات كل ساعة — الشاشة تجدد نفسها من الاستضافة */
      setInterval(function () { reg.update().catch(function () {}); }, 3600000);
    }).catch(function () {});
  }

  /* ---------- منع إطفاء الشاشة (Wake Lock) ---------- */
  var wakeLock = null;
  function initWakeLock() {
    if (!('wakeLock' in navigator)) return; /* غير متاح على file:// — عطّل إطفاء الشاشة من النظام */
    function request() {
      navigator.wakeLock.request('screen').then(function (wl) {
        wakeLock = wl;
      }).catch(function () {});
    }
    request();
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') request();
    });
  }

  /* ---------- إخفاء المؤشر تلقائياً ---------- */
  function initCursorHide() {
    var hideTimer = null;
    document.addEventListener('mousemove', function () {
      document.body.classList.remove('hide-cursor');
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        document.body.classList.add('hide-cursor');
      }, 5000);
    });
    hideTimer = setTimeout(function () {
      document.body.classList.add('hide-cursor');
    }, 5000);
  }

  /* ---------- معاينة حية من لوحة الإدارة ----------
     نقبل الرسائل فقط من نفس الأصل ومن النافذة الأم (لوحة الإدارة) */
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin) return;
    if (e.source !== window.parent) return;
    var d = e.data;
    if (d && d.type === 'previewSettings' && d.settings && typeof d.settings === 'object') {
      /* تطبيق مؤقت للمعاينة فقط — لا يُحفظ على الجهاز، مع تنقية القيم */
      settings = mergeSettings(deepClone(DEFAULT_SETTINGS), sanitizeSettings(d.settings));
      onSettingsChanged();
    }
  });

  /* ---------- الإقلاع ---------- */
  function boot() {
    annLastShow = Date.now();   /* أول ظهور للإعلانات بعد الفترة المحددة من الإقلاع */
    applyTheme();
    applyOrientation();
    window.addEventListener('resize', applyOrientation);
    registerServiceWorker();
    initSettingsUI();
    loadAssets();
    computeDay();
    startTicker();
    initCursorHide();
    updateSoundIndicator();

    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    checkOnline();
    setInterval(checkOnline, 30000);
    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', function () { setOnline(false); });

    setTimeout(remoteSync, 4000);
    restartRemoteTimer();
    initWakeLock();

    tick();
    setInterval(tick, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
