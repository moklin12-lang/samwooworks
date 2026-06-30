import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
);

const TABLE = "kv_store_a5627775";

// ── kv helpers ─────────────────────────────────────────────────────────────────
async function kvGet(key: string): Promise<any> {
  const { data } = await supabase.from(TABLE).select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

async function kvSet(key: string, value: any): Promise<void> {
  await supabase.from(TABLE).upsert({ key, value });
}

async function kvDel(key: string): Promise<void> {
  await supabase.from(TABLE).delete().eq("key", key);
}

async function kvByPrefix(prefix: string): Promise<any[]> {
  const { data } = await supabase.from(TABLE).select("value").like("key", `${prefix}%`);
  return (data ?? []).map((d: any) => d.value);
}

// ── 초기 데이터 시딩 ────────────────────────────────────────────────────────────
const DEPTS = ["평택TC","인천TC","목포TC","화성TDC","광주TDC","HVAC","냉장사업팀"];
const INIT_POPUPS_SEED = [
  { dept: "all", visible: true, title: "🎉 2024년 상반기 우수센터 선정!", content: "삼우웍스 전 직원 여러분의 노고에 진심으로 감사드립니다." },
  ...DEPTS.map(d => ({ dept: d, visible: false, title: "", content: "" })),
];
const INIT_POSTS_SEED = [
  { id: 1, section: "notice", department: "all", title: "2024년 하반기 물류 운영 방침 변경 안내", date: "2024-06-15", author: "전체 관리자", content: "2024년 하반기부터 물류 운영 방침이 변경됩니다.\n\n• 배송 마감 시간 오후 6시로 조정\n• 초과 배송 인센티브 건당 500원\n• 반품 처리 절차 간소화", important: true, media: [] },
  { id: 2, section: "regulations", department: "all", title: "배송 표준 업무 절차서", date: "2024-01-15", author: "전체 관리자", content: "배송 업무의 표준 절차를 규정합니다.", category: "배송", version: "v2.3", media: [] },
  { id: 3, section: "cases", department: "all", title: "배송지 임의 변경 사례", date: "2024-06-12", author: "전체 관리자", content: "고객 동의 없이 배송지를 임의로 변경한 사례.", severity: "심각", caseCategory: "배송 위반", resolved: false, media: [] },
];
const INIT_REGS_SEED = [
  { id: "r1", name: "최준호", employeeId: "EMP010", team: "배송3팀", department: "평택TC", requestDate: "2024-06-18", status: "pending",  phone: "010-1234-5678", email: "choi@samwooworks.com" },
  { id: "r2", name: "정수연", employeeId: "EMP011", team: "배송1팀", department: "인천TC",  requestDate: "2024-06-17", status: "pending",  phone: "010-9876-5432", email: "jung@samwooworks.com" },
  { id: "r3", name: "한동욱", employeeId: "EMP012", team: "배송2팀", department: "목포TC",  requestDate: "2024-06-15", status: "approved", phone: "010-5555-6666", email: "han@samwooworks.com" },
];

async function ensureInit() {
  const done = await kvGet("init_v2");
  if (done) return;
  for (const p of INIT_POPUPS_SEED)  await kvSet(`popup:${p.dept}`,  p);
  for (const p of INIT_POSTS_SEED)   await kvSet(`post:${p.id}`,     p);
  for (const r of INIT_REGS_SEED)    await kvSet(`reg:${r.id}`,      r);
  for (const k of ["performance","nps","delivery","sales"]) await kvSet(`looker:${k}`, { key: k, url: "" });
  await kvSet("init_v2", true);
}
ensureInit().catch(() => {});

// ── Public API ──────────────────────────────────────────────────────────────────
export const api = {
  // Posts
  getPosts:   () => kvByPrefix("post:"),
  createPost: async (p: any) => {
    const id = p.id ?? Date.now();
    const post = { ...p, id };
    await kvSet(`post:${id}`, post);
    return post;
  },
  updatePost: async (id: number, p: any) => {
    await kvSet(`post:${id}`, p);
    return p;
  },
  deletePost: (id: number) => kvDel(`post:${id}`),

  // Registrations
  getRegistrations:   () => kvByPrefix("reg:"),
  createRegistration: async (r: any) => {
    const id = `r${Date.now()}`;
    const reg = { ...r, id, status: "pending", requestDate: new Date().toISOString().slice(0, 10) };
    await kvSet(`reg:${id}`, reg);
    return reg;
  },
  updateRegistration: async (id: string, r: any) => {
    await kvSet(`reg:${id}`, r);
    return r;
  },
  deleteRegistration: (id: string) => kvDel(`reg:${id}`),

  // Popups
  getPopups:   () => kvByPrefix("popup:"),
  updatePopup: async (dept: string, p: any) => {
    const popup = { ...p, dept };
    await kvSet(`popup:${dept}`, popup);
    return popup;
  },

  // Looker URLs
  getLooker: async (): Promise<Record<string, string>> => {
    const items = await kvByPrefix("looker:");
    const result: Record<string, string> = {};
    for (const item of items) if (item?.key) result[item.key] = item.url ?? "";
    return result;
  },
  updateLooker: async (key: string, url: string) => {
    await kvSet(`looker:${key}`, { key, url });
    return { key, url };
  },
};
