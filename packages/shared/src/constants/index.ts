// Varsayılan ders saatleri (Türk eğitim sistemi)
export const DEFAULT_TIME_SLOTS = [
  { slotNumber: 1, startTime: '08:30', endTime: '09:10' },
  { slotNumber: 2, startTime: '09:20', endTime: '10:00' },
  { slotNumber: 3, startTime: '10:10', endTime: '10:50' },
  { slotNumber: 4, startTime: '11:00', endTime: '11:40' },
  { slotNumber: 5, startTime: '11:50', endTime: '12:30' },
  { slotNumber: 6, startTime: '13:10', endTime: '13:50' },
  { slotNumber: 7, startTime: '14:00', endTime: '14:40' },
  { slotNumber: 8, startTime: '14:50', endTime: '15:30' },
];

// Varsayılan not ağırlıkları
export const DEFAULT_GRADE_WEIGHTS = {
  EXAM: 0.5,         // %50
  ORAL: 0.2,         // %20
  HOMEWORK: 0.15,    // %15
  PERFORMANCE: 0.15, // %15
};

// Sayfalama varsayılanları
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Token süreleri
export const TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d',
};
