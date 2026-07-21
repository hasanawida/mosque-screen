/* ============================================================
   محرك حساب مواقيت الصلاة فلكياً — يعمل محلياً بدون إنترنت
   مبني على خوارزمية praytimes.org المعتمدة عالمياً
   ============================================================ */
var PrayTimes = (function () {
  'use strict';

  var DR = Math.PI / 180;
  function dsin(d) { return Math.sin(d * DR); }
  function dcos(d) { return Math.cos(d * DR); }
  function dtan(d) { return Math.tan(d * DR); }
  function darcsin(x) { return Math.asin(x) / DR; }
  function darccos(x) { return Math.acos(x) / DR; }
  function darccot(x) { return Math.atan(1 / x) / DR; }
  function darctan2(y, x) { return Math.atan2(y, x) / DR; }

  function fix(a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; }
  function fixAngle(a) { return fix(a, 360); }
  function fixHour(a) { return fix(a, 24); }

  /* طرق الحساب المعتمدة */
  var METHODS = {
    Egypt:   { name: 'الهيئة المصرية العامة للمساحة', fajr: 19.5, isha: 17.5 },
    MWL:     { name: 'رابطة العالم الإسلامي',          fajr: 18,   isha: 17 },
    Makkah:  { name: 'جامعة أم القرى — مكة المكرمة',   fajr: 18.5, isha: '90 min' },
    Karachi: { name: 'جامعة العلوم الإسلامية — كراتشي', fajr: 18,   isha: 18 },
    ISNA:    { name: 'الجمعية الإسلامية لأمريكا الشمالية', fajr: 15, isha: 15 },
    Jafari:  { name: 'المذهب الجعفري',                 fajr: 16,   isha: 14, maghrib: 4 }
  };

  function isMinutes(v) { return typeof v === 'string' && v.indexOf('min') > -1; }
  function minutesOf(v) { return parseFloat(v); }

  /* التاريخ اليولياني */
  function julian(year, month, day) {
    if (month <= 2) { year -= 1; month += 12; }
    var A = Math.floor(year / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
  }

  /* موقع الشمس: الميل ومعادلة الزمن */
  function sunPosition(jd) {
    var D = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * D);
    var q = fixAngle(280.459 + 0.98564736 * D);
    var L = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g));
    var e = 23.439 - 0.00000036 * D;
    var RA = darctan2(dcos(e) * dsin(L), dcos(L)) / 15;
    return {
      declination: darcsin(dsin(e) * dsin(L)),
      equation: q / 15 - fixHour(RA)
    };
  }

  function midDay(jdate, portion) {
    var eqt = sunPosition(jdate + portion).equation;
    return fixHour(12 - eqt);
  }

  /* الوقت الذي تصل فيه الشمس لزاوية معينة تحت الأفق */
  function sunAngleTime(jdate, lat, angle, portion, ccw) {
    var pos = sunPosition(jdate + portion);
    var noon = midDay(jdate, portion);
    var ratio = (-dsin(angle) - dsin(pos.declination) * dsin(lat)) /
                (dcos(pos.declination) * dcos(lat));
    if (ratio < -1 || ratio > 1) return NaN; /* لا يحدث في منطقتنا */
    var t = darccos(ratio) / 15;
    return noon + (ccw ? -t : t);
  }

  /* وقت العصر حسب معامل الظل (1 للجمهور، 2 للحنفية) */
  function asrTime(jdate, lat, factor, portion) {
    var decl = sunPosition(jdate + portion).declination;
    var angle = -darccot(factor + dtan(Math.abs(lat - decl)));
    return sunAngleTime(jdate, lat, angle, portion, false);
  }

  /**
   * حساب مواقيت يوم كامل
   * @param date  كائن Date لليوم المطلوب
   * @param opts  { lat, lng, elv, method, asrFactor, tz }
   *              tz اختياري — الافتراضي المنطقة الزمنية للجهاز (مع التوقيت الصيفي تلقائياً)
   * @returns أوقات بالساعات العشرية + كائنات Date
   */
  function getTimes(date, opts) {
    var lat = opts.lat, lng = opts.lng, elv = opts.elv || 0;
    var method = METHODS[opts.method] || METHODS.Egypt;
    var asrFactor = opts.asrFactor === 2 ? 2 : 1;
    var y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();

    /* المنطقة الزمنية من الجهاز نفسه — تنقلب صيفي/شتوي لوحدها */
    var tz = (typeof opts.tz === 'number')
      ? opts.tz
      : -new Date(y, m - 1, d, 12, 0, 0).getTimezoneOffset() / 60;

    var jdate = julian(y, m, d) - lng / (15 * 24);
    var horizon = 0.833 + 0.0347 * Math.sqrt(Math.max(elv, 0));

    var t = {
      fajr:    sunAngleTime(jdate, lat, method.fajr, 5 / 24, true),
      sunrise: sunAngleTime(jdate, lat, horizon, 6 / 24, true),
      dhuhr:   midDay(jdate, 12 / 24),
      asr:     asrTime(jdate, lat, asrFactor, 13 / 24),
      sunset:  sunAngleTime(jdate, lat, horizon, 18 / 24, false),
      maghrib: null,
      isha:    null
    };

    if (method.maghrib !== undefined && !isMinutes(method.maghrib)) {
      t.maghrib = sunAngleTime(jdate, lat, method.maghrib, 18 / 24, false);
    }
    if (!isMinutes(method.isha)) {
      t.isha = sunAngleTime(jdate, lat, method.isha, 18 / 24, false);
    }

    /* تحويل من التوقيت الشمسي المحلي إلى توقيت الساعة */
    var shift = tz - lng / 15;
    var keys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'sunset', 'maghrib', 'isha'];
    for (var i = 0; i < keys.length; i++) {
      if (t[keys[i]] !== null && !isNaN(t[keys[i]])) t[keys[i]] += shift;
    }

    /* المغرب = الغروب (أو + دقائق حسب الطريقة) */
    if (t.maghrib === null) {
      t.maghrib = t.sunset + (isMinutes(method.maghrib) ? minutesOf(method.maghrib) / 60 : 0);
    }
    /* العشاء بالدقائق بعد المغرب (طريقة أم القرى) */
    if (t.isha === null && isMinutes(method.isha)) {
      t.isha = t.maghrib + minutesOf(method.isha) / 60;
    }

    /* بناء كائنات Date — مقرّبة لأقرب دقيقة حتى يتطابق العرض مع لحظة الأذان */
    function toDate(hours) {
      if (hours === null || isNaN(hours)) return null;
      var minutes = Math.round(fixHour(hours) * 60);
      var base = new Date(y, m - 1, d, 0, 0, 0, 0);
      return new Date(base.getTime() + minutes * 60000);
    }

    return {
      fajr: toDate(t.fajr),
      sunrise: toDate(t.sunrise),
      dhuhr: toDate(t.dhuhr),
      asr: toDate(t.asr),
      maghrib: toDate(t.maghrib),
      isha: toDate(t.isha)
    };
  }

  return { getTimes: getTimes, METHODS: METHODS };
})();
