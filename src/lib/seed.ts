import type { Expense, Transfer, CashEntry } from "../types";
import { putItem, getAllItems } from "./idb";

const MOCK_EXPENSES: Expense[] = [
  { id: "e01", date: "2026-06-28", city: "프라하", category: "항공", desc: "프라하행 항공권 4인", currency: "KRW", amount: 3200000, krw: 3200000, payer: "송", members: ["송", "약국", "후뎅", "나결"], method: "card" },
  { id: "e02", date: "2026-06-30", city: "프라하", category: "숙박", desc: "프라하 에어비앤비 5박 예약", currency: "EUR", amount: 420, krw: 621600, payer: "송", members: ["송", "약국", "후뎅", "나결"], method: "card" },
  { id: "e03", date: "2026-07-02", city: "프라하", category: "교통", desc: "공항→숙소 택시", currency: "CZK", amount: 850, krw: 52700, payer: "후뎅", members: ["송", "약국", "후뎅", "나결"], method: "cash" },
  { id: "e04", date: "2026-07-02", city: "프라하", category: "식비", desc: "구시가지 저녁 체코 전통식당", currency: "CZK", amount: 2400, krw: 148800, payer: "송", members: ["송", "약국", "후뎅", "나결"], method: "cash" },
  { id: "e05", date: "2026-07-03", city: "프라하", category: "관광", desc: "프라하성 가이드 투어", currency: "CZK", amount: 3200, krw: 198400, payer: "약국", members: ["송", "약국", "후뎅", "나결"], method: "card" },
  { id: "e06", date: "2026-07-03", city: "프라하", category: "식비", desc: "카를교 근처 점심 피자", currency: "CZK", amount: 1600, krw: 99200, payer: "송", members: ["송", "약국", "후뎅", "나결"], method: "cash" },
  { id: "e07", date: "2026-07-03", city: "프라하", category: "쇼핑", desc: "보태니쿠스 기념품", currency: "CZK", amount: 980, krw: 60760, payer: "나결", members: ["나결"], method: "cash" },
  { id: "e08", date: "2026-07-04", city: "프라하", category: "문화", desc: "유대인 지구 입장", currency: "CZK", amount: 1400, krw: 86800, payer: "후뎅", members: ["송", "약국", "후뎅", "나결"], method: "card" },
  { id: "e09", date: "2026-07-04", city: "프라하", category: "식비", desc: "로컬 맥주집 저녁", currency: "CZK", amount: 1800, krw: 111600, payer: "송", members: ["송", "약국", "후뎅", "나결"], method: "cash" },
  { id: "e10", date: "2026-07-05", city: "프라하", category: "식비", desc: "비트르노 카페 브런치", currency: "CZK", amount: 1200, krw: 74400, payer: "약국", members: ["송", "약국", "후뎅", "나결"], method: "cash" },
  { id: "e11", date: "2026-07-05", city: "프라하", category: "쇼핑", desc: "하벨 마켓 수공예품", currency: "CZK", amount: 650, krw: 40300, payer: "후뎅", members: ["후뎅", "나결"], method: "cash" },
  { id: "e12", date: "2026-07-07", city: "프라하", category: "교통", desc: "프라하→부다페스트 야간열차", currency: "EUR", amount: 220, krw: 325600, payer: "후뎅", members: ["송", "약국", "후뎅", "나결"], method: "card" },
  { id: "e13", date: "2026-07-08", city: "부다페스트", category: "숙박", desc: "부다페스트 호텔 3박", currency: "EUR", amount: 180, krw: 266400, payer: "송", members: ["송", "약국", "후뎅", "나결"], method: "card" },
  { id: "e14", date: "2026-07-08", city: "부다페스트", category: "식비", desc: "중앙시장 랑고쉬+소시지", currency: "HUF", amount: 12000, krw: 45600, payer: "나결", members: ["송", "약국", "후뎅", "나결"], method: "cash" },
  { id: "e15", date: "2026-07-08", city: "부다페스트", category: "문화", desc: "세체니 온천 입장", currency: "HUF", amount: 28000, krw: 106400, payer: "송", members: ["송", "약국", "후뎅", "나결"], method: "card" },
  { id: "e16", date: "2026-07-09", city: "부다페스트", category: "관광", desc: "다뉴브강 야경 크루즈", currency: "HUF", amount: 40000, krw: 152000, payer: "후뎅", members: ["송", "약국", "후뎅", "나결"], method: "card" },
  { id: "e17", date: "2026-07-09", city: "부다페스트", category: "식비", desc: "굴라쉬 + 맥주 저녁", currency: "HUF", amount: 18000, krw: 68400, payer: "송", members: ["송", "약국", "후뎅", "나결"], method: "cash" },
  { id: "e18", date: "2026-07-09", city: "부다페스트", category: "교통", desc: "트램 24시간권 x4", currency: "HUF", amount: 8800, krw: 33440, payer: "약국", members: ["송", "약국", "후뎅", "나결"], method: "cash" },
];

const MOCK_TRANSFERS: Transfer[] = [
  { id: "t01", type: "deposit", from: "약국", to: "송", amount: 300000, date: "2026-06-25", memo: "숙소+항공 선입금" },
  { id: "t02", type: "deposit", from: "후뎅", to: "송", amount: 300000, date: "2026-06-25", memo: "숙소+항공 선입금" },
  { id: "t03", type: "deposit", from: "나결", to: "송", amount: 200000, date: "2026-06-28", memo: "항공권 선입금" },
  { id: "t04", type: "settlement", from: "나결", to: "송", amount: 150000, date: "2026-07-09", memo: "카카오페이 송금" },
  { id: "t05", type: "settlement", from: "약국", to: "후뎅", amount: 100000, date: "2026-07-09", memo: "토스 송금" },
];

const MOCK_CASH: CashEntry[] = [
  { id: "c01", currency: "EUR", amount: 300, memo: "출발 전 환전", date: "2026-06-30" },
  { id: "c02", currency: "CZK", amount: 8000, memo: "프라하 공항 환전", date: "2026-07-02" },
  { id: "c03", currency: "HUF", amount: 80000, memo: "부다페스트 환전", date: "2026-07-08" },
  { id: "c04", currency: "KRW", amount: 200000, memo: "비상금", date: "2026-06-28" },
];

export async function seedIfEmpty(): Promise<boolean> {
  const existing = await getAllItems("expenses");
  if (existing.length > 0) return false;

  for (const e of MOCK_EXPENSES) await putItem("expenses", e);
  for (const t of MOCK_TRANSFERS) await putItem("transfers", t);
  for (const c of MOCK_CASH) await putItem("cash", c);
  return true;
}
