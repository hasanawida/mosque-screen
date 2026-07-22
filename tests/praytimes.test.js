/* ============================================================
   اختبارات محرك مواقيت الصلاة — تعمل بـ: node tests/praytimes.test.js
   تقارن النتائج مع قيم مرجعية معروفة وتفحص الحالات الحدّية
   ============================================================ */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

/* تحميل المحرك (ملف متصفح — يُعرَّف PrayTimes في النطاق العام) */
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'praytimes.js'), 'utf8'));
var PrayTimes = global.PrayTimes;

var failures = 0;
var passed = 0;

function T(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (e) {
    failures++;
    console.error('  ✗ ' + name + ' — ' + e.message);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

/* حساب المواقيت وإرجاع الوقت الحائطي للمدينة بالدقائق منذ منتصف الليل */
function wallTimes(y, m, d, lat, lng, tz, method, asrFactor) {
  var utcBase = Date.UTC(y, m - 1, d) - tz * 3600000;
  var t = PrayTimes.getTimes(new Date(y, m - 1, d, 12), {
    lat: lat, lng: lng, method: method || 'Egypt',
    asrFactor: asrFactor || 1, tz: tz, utcBase: utcBase
  });
  var out = {};
  for (var k in t) {
    out[k] = t[k] === null ? null
      : Math.round((t[k].getTime() - utcBase) / 60000); /* دقائق حائطية */
  }
  return out;
}

function hhmm(mins) {
  if (mins === null) return 'null';
  var h = Math.floor(mins / 60), m2 = mins % 60;
  return (h < 10 ? '0' : '') + h + ':' + (m2 < 10 ? '0' : '') + m2;
}

function near(actual, expectedHHMM, tolMin, label) {
  var p = expectedHHMM.split(':');
  var expected = parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  assert(actual !== null, label + ': النتيجة null');
  assert(Math.abs(actual - expected) <= tolMin,
    label + ': المتوقع ~' + expectedHHMM + ' والفعلي ' + hhmm(actual));
}

function ordered(t, label) {
  var keys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  for (var i = 0; i < keys.length; i++) {
    assert(t[keys[i]] !== null && !isNaN(t[keys[i]]),
      label + ': ' + keys[i] + ' غير صالح');
  }
  for (var j = 1; j < keys.length; j++) {
    assert(t[keys[j]] > t[keys[j - 1]],
      label + ': ' + keys[j] + ' (' + hhmm(t[keys[j]]) + ') ليس بعد ' +
      keys[j - 1] + ' (' + hhmm(t[keys[j - 1]]) + ')');
  }
}

console.log('\n== قيم مرجعية معروفة ==');

T('القدس 2026-07-21 (المصرية، توقيت صيفي +3)', function () {
  var t = wallTimes(2026, 7, 21, 31.7683, 35.2137, 3, 'Egypt', 1);
  near(t.fajr, '04:03', 3, 'الفجر');
  near(t.sunrise, '05:47', 3, 'الشروق');
  near(t.dhuhr, '12:45', 3, 'الظهر');
  near(t.asr, '16:25', 3, 'العصر');
  near(t.maghrib, '19:43', 3, 'المغرب');
  near(t.isha, '21:15', 4, 'العشاء');
});

T('القدس 2026-01-15 (شتاء +2)', function () {
  var t = wallTimes(2026, 1, 15, 31.7683, 35.2137, 2, 'Egypt', 1);
  near(t.sunrise, '06:38', 5, 'الشروق');
  near(t.dhuhr, '11:47', 4, 'الظهر');
  near(t.maghrib, '16:57', 5, 'المغرب');
  ordered(t, 'القدس شتاء');
});

T('مكة المكرمة 2026-07-21 (أم القرى +3)', function () {
  var t = wallTimes(2026, 7, 21, 21.3891, 39.8579, 3, 'Makkah', 1);
  ordered(t, 'مكة');
  /* في طريقة أم القرى: العشاء = المغرب + 90 دقيقة */
  assert(Math.abs((t.isha - t.maghrib) - 90) <= 1,
    'العشاء يجب أن يكون المغرب + 90 دقيقة، الفرق الفعلي: ' + (t.isha - t.maghrib));
});

console.log('\n== خطوط العرض العالية ==');

T('لندن 2026-06-21 — أطول نهار (تعديل الزاوية النسبية)', function () {
  var t = wallTimes(2026, 6, 21, 51.5074, -0.1278, 1, 'Egypt', 1);
  ordered(t, 'لندن صيف');
});

T('نيويورك 2026-12-21 — أقصر نهار', function () {
  var t = wallTimes(2026, 12, 21, 40.7128, -74.0060, -5, 'ISNA', 1);
  ordered(t, 'نيويورك شتاء');
});

T('تروندهايم 63° صيفاً — العشاء بعد منتصف الليل لا يلتفّ لصباح نفس اليوم', function () {
  var t = wallTimes(2026, 6, 21, 63.4305, 10.3951, 2, 'Egypt', 1);
  assert(t.isha !== null && t.maghrib !== null, 'قيم مفقودة');
  assert(t.isha > t.maghrib,
    'العشاء (' + hhmm(t.isha) + ') يجب أن يبقى بعد المغرب (' + hhmm(t.maghrib) + ') حتى لو تجاوز منتصف الليل');
  assert(t.fajr < t.sunrise, 'الفجر قبل الشروق');
});

console.log('\n== المذاهب والطرق ==');

T('العصر الحنفي بعد عصر الجمهور', function () {
  var shafii = wallTimes(2026, 7, 21, 31.7683, 35.2137, 3, 'Egypt', 1);
  var hanafi = wallTimes(2026, 7, 21, 31.7683, 35.2137, 3, 'Egypt', 2);
  assert(hanafi.asr > shafii.asr + 20,
    'الحنفي (' + hhmm(hanafi.asr) + ') يجب أن يتأخر عن الجمهور (' + hhmm(shafii.asr) + ')');
});

T('كل طرق الحساب تعطي نتائج مرتبة', function () {
  for (var m in PrayTimes.METHODS) {
    var t = wallTimes(2026, 10, 10, 31.7683, 35.2137, 3, m, 1);
    ordered(t, 'طريقة ' + m);
  }
});

console.log('\n== الحدود الزمنية ==');

T('نهاية السنة وبدايتها', function () {
  ordered(wallTimes(2026, 12, 31, 31.7683, 35.2137, 2, 'Egypt', 1), '31 ديسمبر');
  ordered(wallTimes(2027, 1, 1, 31.7683, 35.2137, 2, 'Egypt', 1), '1 يناير');
});

T('السنة الكبيسة 29 شباط 2028', function () {
  ordered(wallTimes(2028, 2, 29, 31.7683, 35.2137, 2, 'Egypt', 1), '29 شباط');
});

T('مسح شامل: 6 مدن × 12 شهراً بلا أخطاء', function () {
  var cities = [
    [31.7683, 35.2137, 2],   /* القدس */
    [21.3891, 39.8579, 3],   /* مكة */
    [30.0444, 31.2357, 2],   /* القاهرة */
    [41.0082, 28.9784, 3],   /* إسطنبول */
    [51.5074, -0.1278, 0],   /* لندن */
    [-6.2088, 106.8456, 7]   /* جاكرتا (نصف الكرة الجنوبي) */
  ];
  cities.forEach(function (c) {
    for (var mo = 1; mo <= 12; mo++) {
      [1, 15, 28].forEach(function (dy) {
        ordered(wallTimes(2026, mo, dy, c[0], c[1], c[2], 'MWL', 1),
          'مدينة(' + c[0] + ') ' + mo + '/' + dy);
      });
    }
  });
});

T('التقريب: كل الأوقات على رأس الدقيقة', function () {
  var utcBase = Date.UTC(2026, 6, 21) - 3 * 3600000;
  var t = PrayTimes.getTimes(new Date(2026, 6, 21, 12), {
    lat: 31.7683, lng: 35.2137, method: 'Egypt', asrFactor: 1, tz: 3, utcBase: utcBase
  });
  for (var k in t) {
    assert(t[k].getTime() % 60000 === 0, k + ' ليس على رأس الدقيقة');
  }
});

console.log('\n============================');
console.log('النجاح: ' + passed + ' | الفشل: ' + failures);
if (failures > 0) process.exit(1);
console.log('كل الاختبارات نجحت ✓');
