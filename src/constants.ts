// ── 멤버 & 여행 정보 ──
export const MEMBERS = ["송", "약국", "후뎅", "나결"] as const;
export const CITIES = ["프라하", "부다페스트"] as const;

export const TRIP = {
  title: "Praha · Budapest",
  dateRange: "2026.07.02 – 07.10",
  defaultDate: "2026-07-08",
  defaultCity: "부다페스트" as (typeof CITIES)[number],
  year: 2026,
  startDate: "2026-07-02",
  endDate: "2026-07-10",
} as const;

// ── 지출 카테고리 ──
export const CATEGORIES = ["식비", "교통", "관광", "쇼핑", "문화", "항공", "숙박", "기타"] as const;
export const CURRENCIES = ["EUR", "CZK", "HUF", "KRW"] as const;

export const EXCHANGE_RATES: Record<string, number> = {
  EUR: 1480,
  CZK: 62,
  HUF: 3.8,
  KRW: 1,
};

// ── 탭별 테마 색상 (TDS) ──
export const TAB_COLORS = {
  wallet: "#191f28",   // grey900
  list: "#3182f6",     // blue500
  settle: "#03b26c",   // green500
  transfer: "#a234c7", // purple500
  stats: "#fe9800",    // orange500
} as const;

// ── 색상 (TDS 기반, @theme과 동일) ──
export const COLORS = {
  action: "#3182f6",   // blue500
  danger: "#f04452",   // red500
  negative: "#f04452", // red500
  positive: "#03b26c", // green500
  deposit: "#a234c7",  // purple500
  warn: "#fe9800",     // orange500
  bg: "#f2f4f6",       // grey100
  card: "#ffffff",
  border: "#e5e8eb",   // grey200
  text1: "#191f28",    // grey900
  text2: "#4e5968",    // grey700
  text3: "#6b7684",    // grey600
  text4: "#8b95a1",    // grey500
  headerDark: "#191f28", // grey900
  headerMid: "#333d4b",  // grey800
} as const;

// ── 카테고리 색상 + 아이콘 + 배경 (TDS) ──
export const CATEGORY_COLORS: Record<string, string> = {
  식비: "#f66570",   // red400
  교통: "#3182f6",   // blue500
  항공: "#18a5a5",   // teal500
  숙박: "#a234c7",   // purple500
  관광: "#ffa927",   // orange400
  문화: "#fb8800",   // orange600
  쇼핑: "#03b26c",   // green500
  기타: "#6b7684",   // grey600
};

export const CATEGORY_ICONS: Record<string, string> = {
  식비: "food",
  교통: "transport",
  항공: "airplane",
  숙박: "stay",
  관광: "travel",
  문화: "ticket",
  쇼핑: "shop",
  기타: "etc",
};

export const CATEGORY_BG: Record<string, string> = {
  식비: "#ffeeee",   // red50
  교통: "#e8f3ff",   // blue50
  항공: "#edf8f8",   // teal50
  숙박: "#f9f0fc",   // purple50
  관광: "#fff3e0",   // orange50
  문화: "#fff3e0",   // orange50
  쇼핑: "#f0faf6",   // green50
  기타: "#f2f4f6",   // grey100
};

// ── 기타 ──
export const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"] as const;
