/* ============================================================
   قاعدة بيانات المدن — إحداثيات دقيقة
   يمكن إضافة أي مدينة من الإعدادات (موقع مخصص)
   ============================================================ */
var CITIES = [
  /* القدس والداخل */
  { id: 'jerusalem',  name: 'القدس',          lat: 31.7683, lng: 35.2137 },
  { id: 'umelfahem',  name: 'أم الفحم',       lat: 32.5194, lng: 35.1522 },
  { id: 'nazareth',   name: 'الناصرة',        lat: 32.6996, lng: 35.3035 },
  { id: 'haifa',      name: 'حيفا',           lat: 32.7940, lng: 34.9896 },
  { id: 'jaffa',      name: 'يافا',           lat: 32.0504, lng: 34.7522 },
  { id: 'akka',       name: 'عكا',            lat: 32.9226, lng: 35.0687 },
  { id: 'lydd',       name: 'اللد',           lat: 31.9467, lng: 34.8903 },
  { id: 'ramle',      name: 'الرملة',         lat: 31.9308, lng: 34.8664 },
  { id: 'rahat',      name: 'رهط',            lat: 31.3926, lng: 34.7642 },
  { id: 'beersheba',  name: 'بئر السبع',      lat: 31.2530, lng: 34.7915 },
  { id: 'taybe',      name: 'الطيبة',         lat: 32.2664, lng: 35.0091 },
  { id: 'tira',       name: 'الطيرة',         lat: 32.2333, lng: 34.9500 },
  { id: 'baqa',       name: 'باقة الغربية',   lat: 32.4183, lng: 35.0409 },
  { id: 'kafrqasem',  name: 'كفر قاسم',       lat: 32.1143, lng: 34.9770 },
  { id: 'kafrkanna',  name: 'كفر كنا',        lat: 32.7469, lng: 35.3436 },
  { id: 'sakhnin',    name: 'سخنين',          lat: 32.8645, lng: 35.2972 },
  { id: 'arraba',     name: 'عرّابة',         lat: 32.8517, lng: 35.3383 },
  { id: 'shefamr',    name: 'شفاعمرو',        lat: 32.8056, lng: 35.1697 },
  { id: 'tamra',      name: 'طمرة',           lat: 32.8531, lng: 35.1980 },
  { id: 'qalansawe',  name: 'قلنسوة',         lat: 32.2847, lng: 34.9825 },
  { id: 'nahf',       name: 'مجد الكروم',     lat: 32.9192, lng: 35.2585 },
  /* الضفة الغربية */
  { id: 'ramallah',   name: 'رام الله',       lat: 31.9038, lng: 35.2034 },
  { id: 'nablus',     name: 'نابلس',          lat: 32.2211, lng: 35.2544 },
  { id: 'hebron',     name: 'الخليل',         lat: 31.5326, lng: 35.0998 },
  { id: 'bethlehem',  name: 'بيت لحم',        lat: 31.7054, lng: 35.2024 },
  { id: 'jenin',      name: 'جنين',           lat: 32.4615, lng: 35.3027 },
  { id: 'tulkarem',   name: 'طولكرم',         lat: 32.3104, lng: 35.0286 },
  { id: 'qalqilya',   name: 'قلقيلية',        lat: 32.1897, lng: 34.9706 },
  { id: 'jericho',    name: 'أريحا',          lat: 31.8571, lng: 35.4442 },
  /* غزة */
  { id: 'gaza',       name: 'غزة',            lat: 31.5017, lng: 34.4668 },
  { id: 'khanyounis', name: 'خان يونس',       lat: 31.3462, lng: 34.3063 },
  { id: 'rafah',      name: 'رفح',            lat: 31.2968, lng: 34.2435 },
  /* عواصم ومدن عربية وإسلامية */
  { id: 'amman',      name: 'عمّان',          lat: 31.9539, lng: 35.9106 },
  { id: 'cairo',      name: 'القاهرة',        lat: 30.0444, lng: 31.2357 },
  { id: 'makkah',     name: 'مكة المكرمة',    lat: 21.3891, lng: 39.8579 },
  { id: 'madinah',    name: 'المدينة المنورة', lat: 24.5247, lng: 39.5692 },
  { id: 'riyadh',     name: 'الرياض',         lat: 24.7136, lng: 46.6753 },
  { id: 'dubai',      name: 'دبي',            lat: 25.2048, lng: 55.2708 },
  { id: 'beirut',     name: 'بيروت',          lat: 33.8938, lng: 35.5018 },
  { id: 'damascus',   name: 'دمشق',           lat: 33.5138, lng: 36.2765 },
  { id: 'baghdad',    name: 'بغداد',          lat: 33.3152, lng: 44.3661 },
  { id: 'istanbul',   name: 'إسطنبول',        lat: 41.0082, lng: 28.9784 }
];

function findCity(id) {
  for (var i = 0; i < CITIES.length; i++) {
    if (CITIES[i].id === id) return CITIES[i];
  }
  return CITIES[0];
}
