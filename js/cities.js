/* ============================================================
   قاعدة بيانات المدن — إحداثيات دقيقة
   يمكن إضافة أي مدينة من الإعدادات (موقع مخصص)
   ============================================================ */
var CITIES = [
  /* القدس والداخل */
  { id: 'jerusalem',  name: 'القدس',          lat: 31.7683, lng: 35.2137, tz: 'Asia/Jerusalem' },
  { id: 'umelfahem',  name: 'أم الفحم',       lat: 32.5194, lng: 35.1522, tz: 'Asia/Jerusalem' },
  { id: 'nazareth',   name: 'الناصرة',        lat: 32.6996, lng: 35.3035, tz: 'Asia/Jerusalem' },
  { id: 'haifa',      name: 'حيفا',           lat: 32.7940, lng: 34.9896, tz: 'Asia/Jerusalem' },
  { id: 'jaffa',      name: 'يافا',           lat: 32.0504, lng: 34.7522, tz: 'Asia/Jerusalem' },
  { id: 'akka',       name: 'عكا',            lat: 32.9226, lng: 35.0687, tz: 'Asia/Jerusalem' },
  { id: 'lydd',       name: 'اللد',           lat: 31.9467, lng: 34.8903, tz: 'Asia/Jerusalem' },
  { id: 'ramle',      name: 'الرملة',         lat: 31.9308, lng: 34.8664, tz: 'Asia/Jerusalem' },
  { id: 'rahat',      name: 'رهط',            lat: 31.3926, lng: 34.7642, tz: 'Asia/Jerusalem' },
  { id: 'beersheba',  name: 'بئر السبع',      lat: 31.2530, lng: 34.7915, tz: 'Asia/Jerusalem' },
  { id: 'taybe',      name: 'الطيبة',         lat: 32.2664, lng: 35.0091, tz: 'Asia/Jerusalem' },
  { id: 'tira',       name: 'الطيرة',         lat: 32.2333, lng: 34.9500, tz: 'Asia/Jerusalem' },
  { id: 'baqa',       name: 'باقة الغربية',   lat: 32.4183, lng: 35.0409, tz: 'Asia/Jerusalem' },
  { id: 'kafrqasem',  name: 'كفر قاسم',       lat: 32.1143, lng: 34.9770, tz: 'Asia/Jerusalem' },
  { id: 'kafrkanna',  name: 'كفر كنا',        lat: 32.7469, lng: 35.3436, tz: 'Asia/Jerusalem' },
  { id: 'sakhnin',    name: 'سخنين',          lat: 32.8645, lng: 35.2972, tz: 'Asia/Jerusalem' },
  { id: 'arraba',     name: 'عرّابة',         lat: 32.8517, lng: 35.3383, tz: 'Asia/Jerusalem' },
  { id: 'shefamr',    name: 'شفاعمرو',        lat: 32.8056, lng: 35.1697, tz: 'Asia/Jerusalem' },
  { id: 'tamra',      name: 'طمرة',           lat: 32.8531, lng: 35.1980, tz: 'Asia/Jerusalem' },
  { id: 'qalansawe',  name: 'قلنسوة',         lat: 32.2847, lng: 34.9825, tz: 'Asia/Jerusalem' },
  { id: 'nahf',       name: 'مجد الكروم',     lat: 32.9192, lng: 35.2585, tz: 'Asia/Jerusalem' },
  /* الضفة الغربية */
  { id: 'ramallah',   name: 'رام الله',       lat: 31.9038, lng: 35.2034, tz: 'Asia/Hebron' },
  { id: 'nablus',     name: 'نابلس',          lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron' },
  { id: 'hebron',     name: 'الخليل',         lat: 31.5326, lng: 35.0998, tz: 'Asia/Hebron' },
  { id: 'bethlehem',  name: 'بيت لحم',        lat: 31.7054, lng: 35.2024, tz: 'Asia/Hebron' },
  { id: 'jenin',      name: 'جنين',           lat: 32.4615, lng: 35.3027, tz: 'Asia/Hebron' },
  { id: 'tulkarem',   name: 'طولكرم',         lat: 32.3104, lng: 35.0286, tz: 'Asia/Hebron' },
  { id: 'qalqilya',   name: 'قلقيلية',        lat: 32.1897, lng: 34.9706, tz: 'Asia/Hebron' },
  { id: 'jericho',    name: 'أريحا',          lat: 31.8571, lng: 35.4442, tz: 'Asia/Hebron' },
  /* غزة */
  { id: 'gaza',       name: 'غزة',            lat: 31.5017, lng: 34.4668, tz: 'Asia/Gaza' },
  { id: 'khanyounis', name: 'خان يونس',       lat: 31.3462, lng: 34.3063, tz: 'Asia/Gaza' },
  { id: 'rafah',      name: 'رفح',            lat: 31.2968, lng: 34.2435, tz: 'Asia/Gaza' },
  /* عواصم ومدن عربية وإسلامية */
  { id: 'amman',      name: 'عمّان',          lat: 31.9539, lng: 35.9106, tz: 'Asia/Amman' },
  { id: 'cairo',      name: 'القاهرة',        lat: 30.0444, lng: 31.2357, tz: 'Africa/Cairo' },
  { id: 'makkah',     name: 'مكة المكرمة',    lat: 21.3891, lng: 39.8579, tz: 'Asia/Riyadh' },
  { id: 'madinah',    name: 'المدينة المنورة', lat: 24.5247, lng: 39.5692, tz: 'Asia/Riyadh' },
  { id: 'riyadh',     name: 'الرياض',         lat: 24.7136, lng: 46.6753, tz: 'Asia/Riyadh' },
  { id: 'dubai',      name: 'دبي',            lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai' },
  { id: 'beirut',     name: 'بيروت',          lat: 33.8938, lng: 35.5018, tz: 'Asia/Beirut' },
  { id: 'damascus',   name: 'دمشق',           lat: 33.5138, lng: 36.2765, tz: 'Asia/Damascus' },
  { id: 'baghdad',    name: 'بغداد',          lat: 33.3152, lng: 44.3661, tz: 'Asia/Baghdad' },
  { id: 'istanbul',   name: 'إسطنبول',        lat: 41.0082, lng: 28.9784, tz: 'Europe/Istanbul' }
];

function findCity(id) {
  for (var i = 0; i < CITIES.length; i++) {
    if (CITIES[i].id === id) return CITIES[i];
  }
  return CITIES[0];
}
