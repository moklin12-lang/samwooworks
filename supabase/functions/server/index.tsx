import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();
const B = "/make-server-a5627775";

app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

app.get(`${B}/health`, (c) => c.json({ status: "ok" }));

// ── Seed initial data ─────────────────────────────────────────────────────────
const DEPARTMENTS = ["평택TC","인천TC","목포TC","화성TDC","광주TDC","HVAC","냉장사업팀"];

const INIT_POPUPS = [
  { dept: "all",     visible: true,  title: "🎉 2024년 상반기 우수센터 선정!", content: "삼우웍스 전 직원 여러분의 노고에 진심으로 감사드립니다." },
  ...DEPARTMENTS.map(d => ({ dept: d, visible: false, title: "", content: "" })),
];

const INIT_POSTS = [
  { id: 1, section: "notice",      department: "all",   title: "2024년 하반기 물류 운영 방침 변경 안내", date: "2024-06-15", author: "전체 관리자", content: "2024년 하반기부터 물류 운영 방침이 변경됩니다.\n\n• 배송 마감 시간 오후 6시로 조정\n• 초과 배송 인센티브 건당 500원\n• 반품 처리 절차 간소화", important: true, media: [] },
  { id: 2, section: "notice",      department: "평택TC", title: "평택TC 7월 안전교육 일정", date: "2024-06-10", author: "평택TC 관리자", content: "7월 15일 오후 2시 평택TC 대강당에서 정기 안전교육이 실시됩니다.", important: true, media: [{ type: "youtube", url: "https://www.youtube.com/embed/dQw4w9WgXcQ", name: "안전교육 영상" }] },
  { id: 3, section: "regulations", department: "all",   title: "배송 표준 업무 절차서", date: "2024-01-15", author: "전체 관리자", content: "배송 업무의 표준 절차를 규정합니다. 모든 직원은 본 절차서를 숙지하고 준수해야 합니다.", category: "배송", version: "v2.3", media: [] },
  { id: 4, section: "cases",       department: "all",   title: "배송지 임의 변경 사례", date: "2024-06-12", author: "전체 관리자", content: "고객 동의 없이 배송지를 임의로 변경한 사례. 재발 방지 교육 실시 예정.", severity: "심각", caseCategory: "배송 위반", resolved: false, media: [] },
];

const INIT_REGS = [
  { id: "r1", name: "최준호", employeeId: "EMP010", team: "배송3팀", department: "평택TC",   requestDate: "2024-06-18", status: "pending",  phone: "010-1234-5678", email: "choi@samwooworks.com" },
  { id: "r2", name: "정수연", employeeId: "EMP011", team: "배송1팀", department: "인천TC",   requestDate: "2024-06-17", status: "pending",  phone: "010-9876-5432", email: "jung@samwooworks.com" },
  { id: "r3", name: "한동욱", employeeId: "EMP012", team: "배송2팀", department: "목포TC",   requestDate: "2024-06-15", status: "approved", phone: "010-5555-6666", email: "han@samwooworks.com" },
  { id: "r4", name: "윤지영", employeeId: "EMP013", team: "배송4팀", department: "평택TC",   requestDate: "2024-06-14", status: "approved", phone: "010-7777-8888", email: "yoon@samwooworks.com" },
];

async function ensureInit() {
  const done = await kv.get("init_v1");
  if (done) return;

  for (const p of INIT_POPUPS) await kv.set(`popup:${p.dept}`, p);
  for (const p of INIT_POSTS)  await kv.set(`post:${p.id}`, p);
  for (const r of INIT_REGS)   await kv.set(`reg:${r.id}`, r);
  for (const k of ["performance","nps","delivery","sales"]) await kv.set(`looker:${k}`, { key: k, url: "" });

  await kv.set("init_v1", true);
}

// ── Posts ─────────────────────────────────────────────────────────────────────
app.get(`${B}/posts`, async (c) => {
  const posts = await kv.getByPrefix("post:");
  return c.json(posts ?? []);
});

app.post(`${B}/posts`, async (c) => {
  const body = await c.req.json();
  const id = Date.now();
  const post = { ...body, id };
  await kv.set(`post:${id}`, post);
  return c.json(post);
});

app.put(`${B}/posts/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  await kv.set(`post:${id}`, body);
  return c.json(body);
});

app.delete(`${B}/posts/:id`, async (c) => {
  await kv.del(`post:${c.req.param("id")}`);
  return c.json({ ok: true });
});

// ── Registrations ─────────────────────────────────────────────────────────────
app.get(`${B}/registrations`, async (c) => {
  const regs = await kv.getByPrefix("reg:");
  return c.json(regs ?? []);
});

app.post(`${B}/registrations`, async (c) => {
  const body = await c.req.json();
  const id = `r${Date.now()}`;
  const reg = { ...body, id, status: "pending", requestDate: new Date().toISOString().slice(0, 10) };
  await kv.set(`reg:${id}`, reg);
  return c.json(reg);
});

app.put(`${B}/registrations/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  await kv.set(`reg:${id}`, body);
  return c.json(body);
});

app.delete(`${B}/registrations/:id`, async (c) => {
  await kv.del(`reg:${c.req.param("id")}`);
  return c.json({ ok: true });
});

// ── Popups ────────────────────────────────────────────────────────────────────
app.get(`${B}/popups`, async (c) => {
  const popups = await kv.getByPrefix("popup:");
  return c.json(popups ?? []);
});

app.put(`${B}/popups/:dept`, async (c) => {
  const dept = decodeURIComponent(c.req.param("dept"));
  const body = await c.req.json();
  const popup = { ...body, dept };
  await kv.set(`popup:${dept}`, popup);
  return c.json(popup);
});

// ── Looker URLs ───────────────────────────────────────────────────────────────
app.get(`${B}/looker`, async (c) => {
  const items = await kv.getByPrefix("looker:");
  const result: Record<string, string> = {};
  for (const item of (items ?? [])) result[item.key] = item.url;
  return c.json(result);
});

app.put(`${B}/looker/:key`, async (c) => {
  const key = c.req.param("key");
  const { url } = await c.req.json();
  await kv.set(`looker:${key}`, { key, url });
  return c.json({ key, url });
});

ensureInit().catch(console.error);
Deno.serve(app.fetch);
