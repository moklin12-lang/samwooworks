import { useState, useMemo, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import ciLogo from "@/imports/ci_symbol_lightgray.png";
import bgPhoto from "@/imports/5fae3958-3b96-4023-a0ea-019570316761.jpeg";
import {
  LayoutDashboard, Star, Clock, TrendingUp, Bell, BookOpen, AlertTriangle,
  Users, LogOut, X, Check, Download, Search, Edit, Trash2, ChevronUp,
  ChevronDown, Shield, BarChart2, UserCheck, Megaphone, Eye, EyeOff,
  Menu, ChevronRight, RefreshCw, FileText, Plus, Image,
  Video, Youtube, Trash, ChevronLeft, Globe, Archive, FileSpreadsheet,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────
type ViewType = "dashboard" | "nps" | "delivery" | "sales" | "notice" | "regulations" | "cases" | "resources" | "admin";
type AdminTab = "looker" | "registrations" | "members" | "popup";
type DashTab = "personal" | "team" | "center" | "national";
type SortDir = "asc" | "desc";
type PostSection = "notice" | "regulations" | "cases" | "resources";

interface User {
  id: string;
  name: string;
  employeeId: string;
  department: string;   // 소속부서
  managedDept: string;  // "all"=전체관리자, 특정부서=부서관리자, ""=직원
  role: "employee" | "admin";
  password: string;
  jobType?: string;     // 업무구분 (STAFF만 자료실 접근 가능)
}
interface Registration {
  id: string; name: string; employeeId: string; team: string;
  department: string; requestDate: string;
  status: "pending" | "approved" | "rejected";
  phone: string; email: string;
}
interface PopupItem {
  dept: string; visible: boolean; title: string; content: string;
}
interface MediaItem { type: "image" | "video" | "youtube" | "document"; url: string; name?: string; }
interface Post {
  id: number; section: PostSection; title: string; date: string; author: string;
  content: string; media: MediaItem[]; department: string;
  important?: boolean; category?: string; version?: string;
  severity?: string; caseCategory?: string; resolved?: boolean;
}
interface LookerUrls { performance: string; nps: string; delivery: string; sales: string; }

// ── Accounts & Constants ───────────────────────────────────────────────────────
const DEPARTMENTS = ["평택TC", "인천TC", "목포TC", "화성TDC", "광주TDC", "HVAC", "냉장사업팀"];
const JOB_TYPES = ["가전(1톤,기간포함) 주기사", "에어컨 주기사", "가전 전문기사", "에어컨전문기사", "STAFF", "보관하역", "CDC운송", "HVAC"];

const ACCOUNTS: User[] = [
  // 직원 샘플
  { id: "e1", name: "김철수", employeeId: "EMP001", department: "평택TC",    managedDept: "", role: "employee", password: "1234" },
  { id: "e2", name: "이영희", employeeId: "EMP002", department: "인천TC",    managedDept: "", role: "employee", password: "1234" },
  { id: "e3", name: "박민준", employeeId: "EMP003", department: "목포TC",    managedDept: "", role: "employee", password: "1234" },
  { id: "e4", name: "최스태프", employeeId: "EMP004", department: "평택TC", managedDept: "", role: "employee", password: "1234", jobType: "STAFF" },
  // 부서별 관리자
  { id: "pt", name: "평택TC 관리자",    employeeId: "ptadmin", department: "평택TC",    managedDept: "평택TC",    role: "admin", password: "sw3838" },
  { id: "ic", name: "인천TC 관리자",    employeeId: "icadmin", department: "인천TC",    managedDept: "인천TC",    role: "admin", password: "sw3838" },
  { id: "mp", name: "목포TC 관리자",    employeeId: "mpadmin", department: "목포TC",    managedDept: "목포TC",    role: "admin", password: "sw3838" },
  { id: "hw", name: "화성TDC 관리자",   employeeId: "hwadmin", department: "화성TDC",   managedDept: "화성TDC",   role: "admin", password: "sw3838" },
  { id: "kj", name: "광주TDC 관리자",   employeeId: "kjadmin", department: "광주TDC",   managedDept: "광주TDC",   role: "admin", password: "sw3838" },
  { id: "hv", name: "HVAC 관리자",      employeeId: "hvadmin", department: "HVAC",      managedDept: "HVAC",      role: "admin", password: "sw3838" },
  { id: "kp", name: "냉장사업팀 관리자", employeeId: "kpadmin", department: "냉장사업팀", managedDept: "냉장사업팀", role: "admin", password: "sw3838" },
  // 전체 관리자
  { id: "all", name: "전체 관리자", employeeId: "alladmin", department: "all", managedDept: "all", role: "admin", password: "1q2w3e4r" },
];

// helpers
const isSuperAdmin     = (u: User) => u.managedDept === "all";
const isAdmin          = (u: User) => u.role === "admin";
const userDept         = (u: User) => isSuperAdmin(u) ? "all" : u.managedDept || u.department;
const canSeeResources  = (u: User) => isAdmin(u) || u.jobType === "STAFF";

// ── Filtering ──────────────────────────────────────────────────────────────────
function filterPosts(posts: Post[], user: User): Post[] {
  if (isSuperAdmin(user)) return posts;
  const dept = userDept(user);
  return posts.filter(p => p.department === dept || p.department === "all");
}
function filterRegs(regs: Registration[], user: User): Registration[] {
  if (!isAdmin(user)) return [];
  if (isSuperAdmin(user)) return regs;
  return regs.filter(r => r.department === user.managedDept);
}
function getPopup(popups: PopupItem[], user: User): PopupItem | null {
  if (isSuperAdmin(user)) return null;
  const dept = userDept(user);
  return popups.find(p => p.visible && p.dept === dept)
    || popups.find(p => p.visible && p.dept === "all")
    || null;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────
const MONTHLY = ["1월", "2월", "3월", "4월", "5월", "6월"];
const CHART_NPS = [78, 80, 82, 81, 84, 87];
const CHART_DEL = [90.1, 91.5, 92.1, 93.0, 93.8, 94.2];
const CHART_SAL = [98, 105, 115, 119, 124, 128.5];

const INIT_POPUPS: PopupItem[] = [
  { dept: "all",     visible: true,  title: "🎉 2024년 상반기 우수센터 선정!", content: "삼우웍스 전 직원 여러분의 노고에 진심으로 감사드립니다." },
  { dept: "평택TC",   visible: false, title: "", content: "" },
  { dept: "인천TC",   visible: false, title: "", content: "" },
  { dept: "목포TC",   visible: false, title: "", content: "" },
  { dept: "화성TDC",  visible: false, title: "", content: "" },
  { dept: "광주TDC",  visible: false, title: "", content: "" },
  { dept: "HVAC",    visible: false, title: "", content: "" },
  { dept: "냉장사업팀", visible: false, title: "", content: "" },
];

const INIT_POSTS: Post[] = [
  { id: 1, section: "notice",      department: "all",    title: "2024년 하반기 물류 운영 방침 변경 안내", date: "2024-06-15", author: "전체 관리자", content: "2024년 하반기부터 물류 운영 방침이 변경됩니다.\n\n• 배송 마감 시간 오후 6시로 조정\n• 초과 배송 인센티브 건당 500원\n• 반품 처리 절차 간소화", important: true,  media: [] },
  { id: 2, section: "notice",      department: "평택TC",  title: "평택TC 7월 안전교육 일정",            date: "2024-06-10", author: "평택TC 관리자", content: "7월 15일 오후 2시 평택TC 대강당에서 정기 안전교육이 실시됩니다.", important: true, media: [{ type: "youtube", url: "https://www.youtube.com/embed/dQw4w9WgXcQ", name: "안전교육 영상" }] },
  { id: 3, section: "notice",      department: "인천TC",  title: "인천TC 하절기 복장 규정 안내",         date: "2024-06-05", author: "인천TC 관리자", content: "6월~8월 하절기 복장 규정이 적용됩니다.\n• 반팔 근무복 착용 가능\n• 안전화 필수\n• 반바지 불가", important: false, media: [] },
  { id: 4, section: "regulations", department: "all",    title: "배송 표준 업무 절차서",               date: "2024-01-15", author: "전체 관리자", content: "배송 업무의 표준 절차를 규정합니다. 모든 직원은 본 절차서를 숙지하고 준수해야 합니다.", category: "배송", version: "v2.3", media: [] },
  { id: 5, section: "regulations", department: "평택TC",  title: "평택TC 화물 취급 안전 규정",           date: "2024-03-01", author: "평택TC 관리자", content: "화물 취급 시 안전사고 예방을 위한 규정입니다.", category: "안전", version: "v1.8", media: [] },
  { id: 6, section: "cases",       department: "all",    title: "배송지 임의 변경 사례",               date: "2024-06-12", author: "전체 관리자", content: "고객 동의 없이 배송지를 임의로 변경한 사례. 재발 방지 교육 실시 예정.", severity: "심각", caseCategory: "배송 위반", resolved: false, media: [] },
  { id: 7, section: "cases",       department: "평택TC",  title: "평택TC 화물 파손 미신고 사례",         date: "2024-05-15", author: "평택TC 관리자", content: "배송 중 화물 파손 발생 후 즉시 신고하지 않고 은폐를 시도한 사례.", severity: "심각", caseCategory: "보고 의무 위반", resolved: false, media: [] },
];

const INIT_REGS: Registration[] = [
  { id: "r1", name: "최준호", employeeId: "EMP010", team: "배송3팀", department: "평택TC",    requestDate: "2024-06-18", status: "pending",  phone: "010-1234-5678", email: "choi@samwooworks.com" },
  { id: "r2", name: "정수연", employeeId: "EMP011", team: "배송1팀", department: "인천TC",    requestDate: "2024-06-17", status: "pending",  phone: "010-9876-5432", email: "jung@samwooworks.com" },
  { id: "r3", name: "한동욱", employeeId: "EMP012", team: "배송2팀", department: "목포TC",    requestDate: "2024-06-15", status: "approved", phone: "010-5555-6666", email: "han@samwooworks.com" },
  { id: "r4", name: "윤지영", employeeId: "EMP013", team: "배송4팀", department: "평택TC",    requestDate: "2024-06-14", status: "approved", phone: "010-7777-8888", email: "yoon@samwooworks.com" },
  { id: "r5", name: "강민석", employeeId: "EMP014", team: "배송1팀", department: "인천TC",    requestDate: "2024-06-12", status: "rejected", phone: "010-2222-3333", email: "kang@samwooworks.com" },
  { id: "r6", name: "오세진", employeeId: "EMP015", team: "배송2팀", department: "화성TDC",   requestDate: "2024-06-10", status: "approved", phone: "010-4444-9999", email: "oh@samwooworks.com" },
  { id: "r7", name: "이준서", employeeId: "EMP016", team: "-",      department: "HVAC",      requestDate: "2024-06-08", status: "pending",  phone: "010-3333-2222", email: "lee@samwooworks.com" },
];

// ── Style helpers ──────────────────────────────────────────────────────────────
const inp       = "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all";
const lbl       = "block text-xs font-semibold text-slate-600 mb-1.5";
const inputCls  = "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white/80 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all";
const labelCls  = "block text-xs font-semibold text-slate-600 mb-1";
const pct = (cur: number, tgt: number) => Math.min(100, Math.round((cur / tgt) * 100));
const getYoutubeEmbed = (url: string) => {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url.includes("youtube.com/embed") ? url : null;
};
const getDocMeta = (name = "") => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["xlsx","xls","csv"].includes(ext))           return { label: "Excel",       emoji: "📊", color: "emerald" };
  if (["pptx","ppt"].includes(ext))                 return { label: "PowerPoint",  emoji: "📑", color: "orange"  };
  if (["docx","doc"].includes(ext))                 return { label: "Word",        emoji: "📄", color: "blue"    };
  if (["hwp","hwpx"].includes(ext))                 return { label: "한글",         emoji: "📝", color: "teal"    };
  if (ext === "pdf")                                return { label: "PDF",         emoji: "📕", color: "red"     };
  return { label: ext.toUpperCase() || "문서", emoji: "📁", color: "slate" };
};
const sevClass = (s?: string) => s === "심각" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600";
const catClass = (c?: string) => (({ 배송: "bg-blue-100 text-blue-600", 안전: "bg-red-100 text-red-600", 서비스: "bg-emerald-100 text-emerald-600", 차량: "bg-amber-100 text-amber-600", 보안: "bg-purple-100 text-purple-600" } as Record<string,string>)[c ?? ""] || "bg-slate-100 text-slate-600");


// ── UI Atoms ───────────────────────────────────────────────────────────────────
function GaugeBar({ value, target, color = "#2563EB" }: { value: number; target: number; color?: string }) {
  const p = pct(value, target);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400"><span>달성률 {p}%</span><span>목표 {target}</span></div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: color }} />
      </div>
    </div>
  );
}
function StatCard({ label, value, suffix = "", target, prev, color = "#2563EB", icon: Icon }: {
  label: string; value: number; suffix?: string; target: number; prev: number; color?: string; icon: React.ElementType;
}) {
  const delta = value - prev; const isPos = delta >= 0;
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "20" }}><Icon size={14} style={{ color }} /></div>
          <span className="text-xs font-semibold text-slate-600">{label}</span>
        </div>
        <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-full ${isPos ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
          {isPos ? "▲" : "▼"}{Math.abs(delta).toFixed(delta % 1 !== 0 ? 1 : 0)}{suffix}
        </span>
      </div>
      <div className="font-mono text-xl font-bold text-slate-800 mb-2">{value % 1 !== 0 ? value.toFixed(1) : value}{suffix}</div>
      <GaugeBar value={value} target={target} color={color} />
    </div>
  );
}
function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-1 h-5 rounded-full bg-blue-600 shrink-0" />
      <div><h2 className="text-base font-bold text-slate-800 leading-tight">{title}</h2><p className="text-xs text-slate-500">{sub}</p></div>
    </div>
  );
}
function LookerEmbed({ url }: { url: string }) {
  if (!url) return null;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-4" style={{ height: 480 }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
        <BarChart2 size={14} className="text-blue-500" /><span className="text-xs font-semibold text-slate-600">Looker Studio 실시간 연동</span>
      </div>
      <iframe src={url} className="w-full border-0" style={{ height: "calc(100% - 41px)" }} title="Looker Studio" allowFullScreen />
    </div>
  );
}
function MediaDisplay({ items }: { items: MediaItem[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-3 mt-4">
      {items.map((m, i) => {
        if (m.type === "image") return <div key={i} className="rounded-xl overflow-hidden bg-slate-100"><img src={m.url} alt={m.name || "이미지"} className="w-full max-h-80 object-contain" />{m.name && <p className="text-xs text-slate-400 px-3 py-1.5">{m.name}</p>}</div>;
        if (m.type === "video") return <div key={i} className="rounded-xl overflow-hidden bg-black"><video src={m.url} controls className="w-full max-h-72" /></div>;
        if (m.type === "youtube") { const e = getYoutubeEmbed(m.url); return e ? <div key={i} className="rounded-xl overflow-hidden relative" style={{ paddingBottom: "56.25%" }}><iframe src={e} title={m.name || "YouTube"} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} /></div> : null; }
        if (m.type === "document") {
          const meta = getDocMeta(m.name);
          const colorMap: Record<string, string> = { emerald: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100", orange: "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100", blue: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100", teal: "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100", red: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100", slate: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100" };
          const cls = colorMap[meta.color] ?? colorMap.slate;
          return (
            <a key={i} href={m.url} download={m.name} className={`flex items-center gap-3 px-4 py-3 border rounded-xl transition-colors group ${cls}`}>
              <span className="text-xl shrink-0">{meta.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name || "문서 파일"}</p>
                <p className="text-xs opacity-60 mt-0.5">{meta.label} 파일</p>
              </div>
              <Download size={14} className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
          );
        }
        return null;
      })}
    </div>
  );
}

// ── Post Editor ────────────────────────────────────────────────────────────────
function PostEditor({ section, post, dept, onSave, onClose }: {
  section: PostSection; post?: Post | null; dept: string; onSave: (p: Post) => void; onClose: () => void;
}) {
  const [title, setTitle]       = useState(post?.title ?? "");
  const [content, setContent]   = useState(post?.content ?? "");
  const [important, setImportant] = useState(post?.important ?? false);
  const [category, setCategory] = useState(post?.category ?? "배송");
  const [version, setVersion]   = useState(post?.version ?? "v1.0");
  const [severity, setSeverity] = useState(post?.severity ?? "주의");
  const [caseCat, setCaseCat]   = useState(post?.caseCategory ?? "");
  const [resolved, setResolved] = useState(post?.resolved ?? false);
  const [media, setMedia]       = useState<MediaItem[]>(post?.media ?? []);
  const [ytUrl, setYtUrl]       = useState(""); const [err, setErr] = useState("");
  const imgRef   = useRef<HTMLInputElement>(null);
  const vidRef   = useRef<HTMLInputElement>(null);
  const xlsRef   = useRef<HTMLInputElement>(null);

  const addFile = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video" | "document") => {
    const file = e.target.files?.[0];
    if (file) { setMedia(prev => [...prev, { type, url: URL.createObjectURL(file), name: file.name }]); e.target.value = ""; }
  };
  const addYt = () => {
    const embed = getYoutubeEmbed(ytUrl.trim());
    if (!embed) return setErr("올바른 YouTube URL을 입력해주세요.");
    setMedia(prev => [...prev, { type: "youtube", url: embed, name: "YouTube 영상" }]); setYtUrl(""); setErr("");
  };
  const save = () => {
    if (!title.trim()) return setErr("제목을 입력해주세요.");
    if (!content.trim()) return setErr("내용을 입력해주세요.");
    const base: Post = { id: post?.id ?? Date.now(), section, title, content, media, department: dept, date: post?.date ?? new Date().toISOString().slice(0, 10), author: post?.author ?? "관리자" };
    if (section === "notice") base.important = important;
    if (section === "regulations") { base.category = category; base.version = version; }
    if (section === "cases") { base.severity = severity; base.caseCategory = caseCat; base.resolved = resolved; }
    onSave(base); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">{post ? "게시글 수정" : "새 게시글 작성"}</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">{dept === "all" ? "전체 공개" : dept}</span>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"><X size={14} className="text-slate-600" /></button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div><label className={lbl}>제목 *</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목 입력" className={inp} /></div>
          <div><label className={lbl}>내용 *</label><textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="내용 입력" className={inp + " resize-none"} /></div>
          {section === "notice" && <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={important} onChange={e => setImportant(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" /><span className="text-sm text-slate-700">중요 공지로 표시</span></label>}
          {section === "regulations" && <div className="grid grid-cols-2 gap-3"><div><label className={lbl}>카테고리</label><select value={category} onChange={e => setCategory(e.target.value)} className={inp + " cursor-pointer"}>{["배송","안전","서비스","차량","보안"].map(c => <option key={c}>{c}</option>)}</select></div><div><label className={lbl}>버전</label><input value={version} onChange={e => setVersion(e.target.value)} placeholder="v1.0" className={inp} /></div></div>}
          {section === "cases" && <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className={lbl}>심각도</label><select value={severity} onChange={e => setSeverity(e.target.value)} className={inp + " cursor-pointer"}>{["주의","심각"].map(s => <option key={s}>{s}</option>)}</select></div><div><label className={lbl}>위반 유형</label><input value={caseCat} onChange={e => setCaseCat(e.target.value)} placeholder="예: 배송 위반" className={inp} /></div></div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={resolved} onChange={e => setResolved(e.target.checked)} className="w-4 h-4 rounded accent-emerald-600" /><span className="text-sm text-slate-700">처리 완료</span></label></div>}
          <div>
            <label className={lbl}>미디어 첨부</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => imgRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors"><Image size={13} /> 사진</button>
              <button type="button" onClick={() => vidRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors"><Video size={13} /> 동영상</button>
              <button type="button" onClick={() => xlsRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:border-emerald-300 hover:text-emerald-600 transition-colors"><FileSpreadsheet size={13} /> 문서</button>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => addFile(e, "image")} />
              <input ref={vidRef} type="file" accept="video/*" className="hidden" onChange={e => addFile(e, "video")} />
              <input ref={xlsRef} type="file" accept=".xlsx,.xls,.csv,.pptx,.ppt,.docx,.doc,.hwp,.hwpx,.pdf,.txt,.zip" className="hidden" onChange={e => addFile(e, "document")} />
            </div>
            <div className="flex gap-2 mt-2">
              <input value={ytUrl} onChange={e => setYtUrl(e.target.value)} placeholder="YouTube URL 입력 (youtube.com/watch?v=...)" className={inp + " flex-1"} onKeyDown={e => e.key === "Enter" && addYt()} />
              <button type="button" onClick={addYt} className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 shrink-0"><Youtube size={13} /> 추가</button>
            </div>
            {media.length > 0 && <div className="mt-2 space-y-1.5">{media.map((m, i) => <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">{m.type === "image" && <Image size={13} className="text-blue-500 shrink-0" />}{m.type === "video" && <Video size={13} className="text-purple-500 shrink-0" />}{m.type === "youtube" && <Youtube size={13} className="text-red-500 shrink-0" />}{m.type === "document" && <span className="text-sm shrink-0">{getDocMeta(m.name).emoji}</span>}<span className="text-xs text-slate-600 flex-1 truncate">{m.name || m.url}</span><button type="button" onClick={() => setMedia(p => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><Trash size={12} /></button></div>)}</div>}
          </div>
          {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">{post ? "수정 완료" : "게시글 등록"}</button>
            <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200">취소</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function DashboardView({ user }: { user: User }) {
  const [tab, setTab] = useState<DashTab>("personal");
  const dept = userDept(user);
  const LEVELS = {
    personal: { label: "개인 실적", sub: "나의 개인 실적",                              nps: 87, npsT: 90, delivery: 94.2, deliveryT: 95, sales: 1285, salesT: 1300, salesUnit: "만원", npsPrev: 82, deliveryPrev: 92.1, salesPrev: 1150 },
    team:     { label: `팀 실적 (${dept === "all" ? "전체" : dept})`, sub: "소속팀 실적", nps: 85, npsT: 90, delivery: 93.1, deliveryT: 95, sales: 7800, salesT: 8000, salesUnit: "만원", npsPrev: 80, deliveryPrev: 91.5, salesPrev: 7200 },
    center:   { label: `센터 실적 (${dept === "all" ? "전체" : dept})`, sub: "센터 전체", nps: 83, npsT: 88, delivery: 92.5, deliveryT: 95, sales: 4.8,  salesT: 5.0,  salesUnit: "억원", npsPrev: 79, deliveryPrev: 90.2, salesPrev: 4.3  },
    national: { label: "전국 실적",                        sub: "전국 센터 합산",           nps: 81, npsT: 85, delivery: 91.8, deliveryT: 93, sales: 285,  salesT: 300,  salesUnit: "억원", npsPrev: 76, deliveryPrev: 89.5, salesPrev: 250  },
  };
  const lv = LEVELS[tab];
  const chartData = MONTHLY.map((m, i) => ({ month: m, NPS: CHART_NPS[i], 납기준수율: CHART_DEL[i] }));
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-lg font-bold text-slate-800">안녕하세요, {user.name}님 👋</h1><p className="text-xs text-slate-500 mt-0.5">{dept === "all" ? "전체 관리" : dept} · {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</p></div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white border border-slate-100 px-3 py-1.5 rounded-lg"><RefreshCw size={11} /><span>2024년 6월 기준</span></div>
      </div>
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100 w-fit">
        {(["personal","team","center","national"] as DashTab[]).map((t, i) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${tab === t ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
            {["개인","팀","센터","전국"][i]}
          </button>
        ))}
      </div>
      <SectionHeader title={lv.label} sub={lv.sub} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="NPS" value={lv.nps} suffix="점" target={lv.npsT} prev={lv.npsPrev} color="#2563EB" icon={Star} />
        <StatCard label="납기준수율" value={lv.delivery} suffix="%" target={lv.deliveryT} prev={lv.deliveryPrev} color="#059669" icon={Clock} />
        <StatCard label={`매출 (${lv.salesUnit})`} value={lv.sales} suffix={lv.salesUnit} target={lv.salesT} prev={lv.salesPrev} color="#7C3AED" icon={TrendingUp} />
      </div>
      {tab === "personal" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs font-semibold text-slate-700 mb-3">NPS · 납기준수율 추이 (6개월)</p>
            <ResponsiveContainer width="100%" height={180}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} /><YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} /><Tooltip contentStyle={{ background: "#0F172A", border: "none", borderRadius: 8, color: "#fff", fontSize: 11 }} /><Line type="monotone" dataKey="NPS" stroke="#2563EB" strokeWidth={2} dot={{ r: 2.5, fill: "#2563EB" }} /><Line type="monotone" dataKey="납기준수율" stroke="#059669" strokeWidth={2} dot={{ r: 2.5, fill: "#059669" }} /></LineChart></ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs font-semibold text-slate-700 mb-3">매출 추이 (백만원)</p>
            <ResponsiveContainer width="100%" height={180}><BarChart data={MONTHLY.map((m, i) => ({ month: m, 매출: CHART_SAL[i] }))}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} /><YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} /><Tooltip contentStyle={{ background: "#0F172A", border: "none", borderRadius: 8, color: "#fff", fontSize: 11 }} /><Bar dataKey="매출" fill="#7C3AED" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
          </div>
        </div>
      )}
      {tab !== "personal" && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs font-semibold text-slate-700 mb-3">전체 지표 비교</p>
          <ResponsiveContainer width="100%" height={200}><RadarChart data={[{ label: "NPS", value: lv.nps, target: lv.npsT }, { label: "납기준수율", value: lv.delivery, target: lv.deliveryT }, { label: "매출달성", value: pct(lv.sales, lv.salesT), target: 100 }]}><PolarGrid stroke="#E2E8F0" /><PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} /><Radar name="실적" dataKey="value" stroke="#2563EB" fill="#2563EB" fillOpacity={0.2} /><Radar name="목표" dataKey="target" stroke="#CBD5E1" fill="none" strokeDasharray="4 2" /><Tooltip contentStyle={{ background: "#0F172A", border: "none", borderRadius: 8, color: "#fff", fontSize: 11 }} /></RadarChart></ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Metric Pages ───────────────────────────────────────────────────────────────
function NPSView({ url }: { url: string }) {
  const data = MONTHLY.map((m, i) => ({ month: m, NPS: CHART_NPS[i], 목표: 90 }));
  const dist = [{ label: "추천고객 (9-10점)", value: 62, color: "#059669" }, { label: "중립고객 (7-8점)", value: 25, color: "#D97706" }, { label: "비추천 (0-6점)", value: 13, color: "#DC2626" }];
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <SectionHeader title="NPS (고객 순추천지수)" sub="Net Promoter Score — 고객 만족도 지표" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3">{[{ l: "현재 NPS", v: "87점", c: "#2563EB" }, { l: "목표 NPS", v: "90점", c: "#64748B" }, { l: "전월 대비", v: "+5점", c: "#059669" }].map((s, i) => <div key={i} className="bg-white rounded-xl p-3 sm:p-5 shadow-sm border border-slate-100 text-center"><p className="text-[10px] sm:text-xs text-slate-500 mb-1">{s.l}</p><p className="font-mono text-lg sm:text-2xl font-bold" style={{ color: s.c }}>{s.v}</p></div>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"><p className="text-xs font-semibold text-slate-700 mb-3">NPS 월별 추이</p><ResponsiveContainer width="100%" height={200}><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} /><YAxis domain={[60, 95]} tick={{ fontSize: 10, fill: "#94A3B8" }} /><Tooltip contentStyle={{ background: "#0F172A", border: "none", borderRadius: 8, color: "#fff", fontSize: 11 }} /><Line type="monotone" dataKey="NPS" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} /><Line type="monotone" dataKey="목표" stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4 2" dot={false} /></LineChart></ResponsiveContainer></div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"><p className="text-xs font-semibold text-slate-700 mb-3">고객 분포</p><div className="space-y-3 pt-2">{dist.map(d => <div key={d.label} className="space-y-1"><div className="flex justify-between text-xs"><span className="text-slate-600">{d.label}</span><span className="font-mono font-semibold" style={{ color: d.color }}>{d.value}%</span></div><div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${d.value}%`, background: d.color }} /></div></div>)}</div><p className="text-xs text-slate-400 mt-4">NPS = 62 − 13 = <span className="font-mono font-bold text-blue-600">49점</span></p></div>
      </div>
      <LookerEmbed url={url} />
    </div>
  );
}
function DeliveryView({ url }: { url: string }) {
  const data = MONTHLY.map((m, i) => ({ month: m, 납기준수율: CHART_DEL[i] }));
  const br = [{ label: "당일", rate: 98.1 }, { label: "익일", rate: 96.3 }, { label: "2일", rate: 91.2 }, { label: "3일", rate: 85.5 }];
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <SectionHeader title="납기준수율" sub="약속된 배송 기한 내 완료율" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3">{[{ l: "이번달", v: "94.2%", c: "#059669" }, { l: "목표", v: "95.0%", c: "#64748B" }, { l: "전월 대비", v: "+2.1%p", c: "#059669" }].map((s, i) => <div key={i} className="bg-white rounded-xl p-3 sm:p-5 shadow-sm border border-slate-100 text-center"><p className="text-[10px] sm:text-xs text-slate-500 mb-1">{s.l}</p><p className="font-mono text-lg sm:text-2xl font-bold" style={{ color: s.c }}>{s.v}</p></div>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"><p className="text-xs font-semibold text-slate-700 mb-3">월별 납기준수율 추이</p><ResponsiveContainer width="100%" height={200}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} /><YAxis domain={[85, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} /><Tooltip contentStyle={{ background: "#0F172A", border: "none", borderRadius: 8, color: "#fff", fontSize: 11 }} /><Bar dataKey="납기준수율" fill="#059669" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"><p className="text-xs font-semibold text-slate-700 mb-3">배송 유형별 준수율</p><div className="space-y-3 pt-2">{br.map(b => <div key={b.label} className="space-y-1"><div className="flex justify-between text-xs"><span className="text-slate-600">{b.label} 배송</span><span className="font-mono font-semibold text-emerald-600">{b.rate}%</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${b.rate}%` }} /></div></div>)}</div></div>
      </div>
      <LookerEmbed url={url} />
    </div>
  );
}
function SalesView({ url }: { url: string }) {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <SectionHeader title="매출 현황" sub="개인 담당 배송 매출 실적" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3">{[{ l: "이번달 매출", v: "1억 2,850만", c: "#7C3AED" }, { l: "목표 매출", v: "1억 3,000만", c: "#64748B" }, { l: "달성률", v: "98.8%", c: "#059669" }].map((s, i) => <div key={i} className="bg-white rounded-xl p-3 sm:p-5 shadow-sm border border-slate-100 text-center"><p className="text-[10px] sm:text-xs text-slate-500 mb-1">{s.l}</p><p className="font-mono text-base sm:text-xl font-bold" style={{ color: s.c }}>{s.v}</p></div>)}</div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"><p className="text-xs font-semibold text-slate-700 mb-3">월별 매출 추이 (백만원)</p><ResponsiveContainer width="100%" height={220}><BarChart data={MONTHLY.map((m, i) => ({ month: m, 매출: CHART_SAL[i] }))}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} /><YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} /><Tooltip contentStyle={{ background: "#0F172A", border: "none", borderRadius: 8, color: "#fff", fontSize: 11 }} /><Bar dataKey="매출" fill="#7C3AED" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
      <LookerEmbed url={url} />
    </div>
  );
}

// ── Post List View ─────────────────────────────────────────────────────────────
function PostListView({ section, posts, adminFlag, dept, onPostsChange, title, sub }: {
  section: PostSection; posts: Post[]; adminFlag: boolean; dept: string;
  onPostsChange: (updater: (prev: Post[]) => Post[]) => void; title: string; sub: string;
}) {
  const [sel, setSel] = useState<Post | null>(null);
  const [editing, setEditing] = useState<Post | null | undefined>(undefined);
  const [filter, setFilter] = useState("전체");
  const cats = section === "regulations" ? ["전체", ...Array.from(new Set(posts.filter(p => p.section === section).map(p => p.category || "기타")))] : [];
  const filtered = posts.filter(p => p.section === section && (filter === "전체" || p.category === filter));
  const save = async (p: Post) => {
    const isExisting = posts.some(x => x.id === p.id);
    try {
      if (isExisting) {
        await api.updatePost(p.id, p);
        onPostsChange(prev => prev.map(x => x.id === p.id ? p : x));
      } else {
        const created = await api.createPost(p);
        const saved = { ...p, id: created?.id ?? p.id };
        onPostsChange(prev => [saved, ...prev.filter(x => x.id !== saved.id)]);
      }
    } catch (e) {
      console.error("게시글 저장 오류:", e);
      // API 실패 시에도 로컬 상태에 즉시 반영
      if (isExisting) {
        onPostsChange(prev => prev.map(x => x.id === p.id ? p : x));
      } else {
        onPostsChange(prev => [p, ...prev.filter(x => x.id !== p.id)]);
      }
    }
  };
  const del = async (id: number) => {
    setSel(null);
    try { await api.deletePost(id); } catch {}
    onPostsChange(prev => prev.filter(p => p.id !== id));
  };
  return (
    <div className="p-4 sm:p-6 space-y-4">
      {editing !== undefined && <PostEditor section={section} post={editing} dept={dept} onSave={save} onClose={() => setEditing(undefined)} />}
      <div className="flex items-center justify-between">
        <SectionHeader title={title} sub={sub} />
        {adminFlag && <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"><Plus size={13} /> 새 글 작성</button>}
      </div>
      {cats.length > 0 && <div className="flex gap-2 flex-wrap">{cats.map(c => <button key={c} onClick={() => setFilter(c)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filter === c ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300"}`}>{c}</button>)}</div>}
      {sel ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <button onClick={() => setSel(null)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"><ChevronLeft size={14} /> 목록으로</button>
            {adminFlag && <div className="flex gap-2"><button onClick={() => setEditing(sel)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><Edit size={12} /> 수정</button><button onClick={() => del(sel.id)} className="flex items-center gap-1 text-xs text-red-500 hover:underline"><Trash2 size={12} /> 삭제</button></div>}
          </div>
          <div className="p-4 sm:p-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {sel.important && <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded">중요</span>}
              {sel.severity && <span className={`text-xs font-semibold px-2 py-0.5 rounded ${sevClass(sel.severity)}`}>{sel.severity}</span>}
              {sel.caseCategory && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{sel.caseCategory}</span>}
              {sel.resolved && <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded font-medium">처리완료</span>}
              {sel.category && <span className={`text-xs font-semibold px-2 py-0.5 rounded ${catClass(sel.category)}`}>{sel.category}</span>}
              {sel.version && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">{sel.version}</span>}
              {sel.department !== "all" && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{sel.department}</span>}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-2">{sel.title}</h2>
            <p className="text-xs text-slate-400 mb-5">{sel.author} · {sel.date}</p>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 rounded-xl p-4">{sel.content}</div>
            <MediaDisplay items={sel.media} />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && <div className="bg-white rounded-xl p-10 text-center text-sm text-slate-400">게시글이 없습니다.</div>}
          {filtered.map(p => (
            <button key={p.id} onClick={() => setSel(p)} className="w-full bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 hover:shadow-md hover:border-blue-200 transition-all text-left">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${section === "cases" ? "bg-red-50" : section === "resources" ? "bg-emerald-50" : "bg-blue-50"}`}>
                {section === "notice" && <Bell size={16} className="text-blue-500" />}
                {section === "regulations" && <FileText size={16} className="text-blue-500" />}
                {section === "cases" && <AlertTriangle size={16} className="text-red-500" />}
                {section === "resources" && <Archive size={16} className="text-emerald-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  {p.important && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">중요</span>}
                  {p.severity && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sevClass(p.severity)}`}>{p.severity}</span>}
                  {p.category && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${catClass(p.category)}`}>{p.category}</span>}
                  {p.resolved && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded">처리완료</span>}
                  {p.department !== "all" && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{p.department}</span>}
                  {p.media.length > 0 && <span className="text-[10px] text-slate-400">{p.media.some(m => m.type === "image") ? "📷 " : ""}{p.media.some(m => m.type === "video") ? "🎬 " : ""}{p.media.some(m => m.type === "youtube") ? "▶ " : ""}{p.media.some(m => m.type === "document") ? getDocMeta(p.media.find(m => m.type === "document")?.name).emoji : ""}</span>}
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{p.author} · {p.date}</p>
              </div>
              <ChevronRight size={15} className="shrink-0 text-slate-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admin View ─────────────────────────────────────────────────────────────────
function AdminView({ user, registrations, setRegistrations, popups, setPopups, lookerUrls, setLookerUrls }: {
  user: User; registrations: Registration[]; setRegistrations: React.Dispatch<React.SetStateAction<Registration[]>>;
  popups: PopupItem[]; setPopups: React.Dispatch<React.SetStateAction<PopupItem[]>>;
  lookerUrls: LookerUrls; setLookerUrls: React.Dispatch<React.SetStateAction<LookerUrls>>;
}) {
  const [tab, setTab] = useState<AdminTab>("looker");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSort, setMemberSort] = useState<{ key: keyof Registration; dir: SortDir }>({ key: "requestDate", dir: "desc" });
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [lookerDraft, setLookerDraft] = useState(lookerUrls);
  const [selPopupDept, setSelPopupDept] = useState(isSuperAdmin(user) ? "all" : user.managedDept);
  const [regsLoading, setRegsLoading] = useState(false);

  // 관리자 페이지 마운트 시 최신 가입신청 불러오기
  useEffect(() => {
    setRegsLoading(true);
    api.getRegistrations()
      .then(regs => { if (Array.isArray(regs)) setRegistrations(regs); })
      .catch(() => {})
      .finally(() => setRegsLoading(false));
  }, []);

  const refreshRegs = () => {
    setRegsLoading(true);
    api.getRegistrations()
      .then(regs => { if (Array.isArray(regs)) setRegistrations(regs); })
      .catch(() => {})
      .finally(() => setRegsLoading(false));
  };

  const myRegs = filterRegs(registrations, user);
  const pending = myRegs.filter(r => r.status === "pending");

  const curPopup = popups.find(p => p.dept === selPopupDept) ?? { dept: selPopupDept, visible: false, title: "", content: "" };
  const [popupDraft, setPopupDraft] = useState<PopupItem>(curPopup);

  const sortedMembers = useMemo(() => {
    return [...myRegs.filter(r => r.status === "approved" && (r.name.includes(memberSearch) || r.employeeId.includes(memberSearch) || r.team.includes(memberSearch)))]
      .sort((a, b) => { const va = String(a[memberSort.key]); const vb = String(b[memberSort.key]); return memberSort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va); });
  }, [myRegs, memberSearch, memberSort]);

  const toggleSort = (key: keyof Registration) => setMemberSort(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
  const approve = async (id: string) => {
    const updated = registrations.find(r => r.id === id);
    if (!updated) return;
    const next = { ...updated, status: "approved" as const };
    setRegistrations(prev => prev.map(r => r.id === id ? next : r));
    try { await api.updateRegistration(id, next); } catch {}
  };
  const reject = async (id: string) => {
    const updated = registrations.find(r => r.id === id);
    if (!updated) return;
    const next = { ...updated, status: "rejected" as const };
    setRegistrations(prev => prev.map(r => r.id === id ? next : r));
    try { await api.updateRegistration(id, next); } catch {}
  };
  const delReg = async (id: string) => {
    setRegistrations(prev => prev.filter(r => r.id !== id));
    try { await api.deleteRegistration(id); } catch {}
  };
  const downloadCsv = () => {
    const rows = [["이름","사원번호","팀","소속부서","연락처","이메일","신청일"], ...sortedMembers.map(r => [r.name,r.employeeId,r.team,r.department,r.phone,r.email,r.requestDate])];
    const blob = new Blob(["﻿" + rows.map(r => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "가입자현황.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const savePopup = async () => {
    const draft = { ...popupDraft, dept: selPopupDept };
    setPopups(prev => prev.find(p => p.dept === draft.dept) ? prev.map(p => p.dept === draft.dept ? draft : p) : [...prev, draft]);
    setPopupDraft(draft);
    try { await api.updatePopup(selPopupDept, draft); } catch {}
  };
  const togglePopupVisible = async () => {
    const next = !( popups.find(p => p.dept === selPopupDept) ?? popupDraft ).visible;
    setPopups(prev => prev.map(p => p.dept === selPopupDept ? { ...p, visible: next } : p));
    setPopupDraft(prev => ({ ...prev, visible: next }));
    const current = popups.find(p => p.dept === selPopupDept) ?? popupDraft;
    try { await api.updatePopup(selPopupDept, { ...current, visible: next }); } catch {}
  };

  const TABS: { key: AdminTab; label: string; icon: React.ElementType }[] = [
    { key: "looker",        label: "실적 연동",   icon: BarChart2 },
    { key: "registrations", label: "가입 신청",   icon: UserCheck },
    { key: "members",       label: "가입자 현황", icon: Users },
    { key: "popup",         label: "팝업 관리",   icon: Megaphone },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0"><Shield size={18} className="text-white" /></div>
        <div>
          <h1 className="text-base font-bold text-slate-800">{isSuperAdmin(user) ? "전체 관리자 페이지" : `${user.managedDept} 관리자 페이지`}</h1>
          <p className="text-xs text-slate-500">samwooworks.com · {isSuperAdmin(user) ? "전체 권한" : `${user.managedDept} 전용`}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors shrink-0 ${tab === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
            <t.icon size={14} />{t.label}{t.key === "registrations" && pending.length > 0 && <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>}
          </button>
        ))}
      </div>

      {/* Looker */}
      {tab === "looker" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-700">Looker Studio URL 관리</p><button onClick={async () => { setLookerUrls(lookerDraft); try { await Promise.all((["performance","nps","delivery","sales"] as (keyof LookerUrls)[]).map(k => api.updateLooker(k, lookerDraft[k]))); } catch {} }} className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">전체 저장</button></div>
            <p className="text-xs text-slate-400">각 페이지에 표시될 Looker Studio 보고서 URL을 입력하세요.</p>
            {([["performance","📊","대시보드 실적"],["nps","⭐","NPS 지표"],["delivery","🚚","납기준수율"],["sales","💰","매출 현황"]] as [keyof LookerUrls,string,string][]).map(([k,icon,label]) => (
              <div key={k}><label className={lbl}>{icon} {label}</label><div className="flex gap-2"><input value={lookerDraft[k]} onChange={e => setLookerDraft(prev => ({ ...prev, [k]: e.target.value }))} placeholder="https://lookerstudio.google.com/embed/reporting/..." className={inp + " flex-1 font-mono text-xs"} />{lookerDraft[k] && <span className="flex items-center text-emerald-600"><Check size={14} /></span>}</div></div>
            ))}
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-400 leading-relaxed">💡 Looker Studio → 보고서 열기 → 공유 → 보고서 삽입 → 삽입 URL 복사 → 붙여넣기</div>
        </div>
      )}

      {/* Registrations */}
      {tab === "registrations" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100">
            {isSuperAdmin(user) ? <><Globe size={14} className="text-blue-500 shrink-0" /><span className="text-xs text-slate-600 font-medium">전체 부서 가입 신청 관리 중</span></> : <><UserCheck size={14} className="text-blue-500 shrink-0" /><span className="text-xs text-slate-600 font-medium">{user.managedDept} 가입 신청</span></>}
            <span className="text-xs text-slate-400">{myRegs.length}건</span>
            <button onClick={refreshRegs} disabled={regsLoading}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw size={12} className={regsLoading ? "animate-spin" : ""} />
              {regsLoading ? "로딩 중..." : "새로고침"}
            </button>
          </div>
          {pending.length > 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2"><UserCheck size={16} className="text-amber-600 shrink-0" /><p className="text-xs text-amber-700">승인 대기 <span className="font-bold">{pending.length}건</span></p></div>}
          {myRegs.length === 0 && !regsLoading && <div className="bg-white rounded-xl p-8 text-center text-sm text-slate-400">해당 부서의 가입 신청이 없습니다.</div>}
          {myRegs.map(reg => (
            <div key={reg.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              {editingReg?.id === reg.id ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-700">회원 정보 수정</p>
                  {(["name","team","phone","email"] as (keyof Registration)[]).map(k => <div key={k} className="flex items-center gap-3"><label className="text-xs text-slate-500 w-14 shrink-0">{{name:"이름",team:"팀",phone:"연락처",email:"이메일"}[k]}</label><input value={editingReg[k] as string} onChange={e => setEditingReg({ ...editingReg, [k]: e.target.value })} className={inp + " flex-1"} /></div>)}
                  <div className="flex gap-2"><button onClick={() => { setRegistrations(prev => prev.map(r => r.id === reg.id ? editingReg : r)); setEditingReg(null); }} className="flex-1 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg">저장</button><button onClick={() => setEditingReg(null)} className="flex-1 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">취소</button></div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800">{reg.name}</span><span className="font-mono text-xs text-slate-400">{reg.employeeId}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reg.status === "pending" ? "bg-amber-100 text-amber-600" : reg.status === "approved" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"}`}>{reg.status === "pending" ? "대기" : reg.status === "approved" ? "승인" : "거부"}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{reg.department}</span>
                    </div>
                    <p className="text-xs text-slate-500">{reg.team} · {reg.phone} · {reg.requestDate}</p>
                    <p className="text-xs text-slate-400">{reg.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {reg.status === "pending" && <><button onClick={() => approve(reg.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg"><Check size={11} /> 승인</button><button onClick={() => reject(reg.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg"><X size={11} /> 거부</button></>}
                    <button onClick={() => setEditingReg(reg)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={13} /></button>
                    <button onClick={() => delReg(reg.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Members */}
      {tab === "members" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-40 relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="이름, 사원번호, 팀 검색..." className={inp + " pl-8"} /></div>
            <button onClick={downloadCsv} className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 shrink-0"><Download size={13} /> 엑셀 다운로드</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead><tr className="border-b border-slate-100 bg-slate-50">
                {(["name","employeeId","department","team","requestDate"] as (keyof Registration)[]).map(k => {
                  const labels: Record<string,string> = { name:"이름",employeeId:"사원번호",department:"소속부서",team:"팀",requestDate:"신청일" };
                  return <th key={k} onClick={() => toggleSort(k)} className="px-3 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer hover:text-blue-600 select-none"><span className="flex items-center gap-1">{labels[k]}{memberSort.key === k ? (memberSort.dir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronDown size={11} className="text-slate-300" />}</span></th>;
                })}
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600">연락처</th>
              </tr></thead>
              <tbody>
                {sortedMembers.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-xs text-slate-400">승인된 가입자가 없습니다.</td></tr>
                  : sortedMembers.map(r => <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors"><td className="px-3 py-3 font-medium text-slate-800 text-xs">{r.name}</td><td className="px-3 py-3 font-mono text-slate-500 text-xs">{r.employeeId}</td><td className="px-3 py-3 text-slate-600 text-xs">{r.department}</td><td className="px-3 py-3 text-slate-600 text-xs">{r.team}</td><td className="px-3 py-3 text-slate-400 text-xs">{r.requestDate}</td><td className="px-3 py-3 text-slate-400 text-xs">{r.phone}</td></tr>)}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 text-right">총 {sortedMembers.length}명</p>
        </div>
      )}

      {/* Popup */}
      {tab === "popup" && (
        <div className="max-w-lg space-y-4">
          {isSuperAdmin(user) && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <label className={lbl}>관리할 팝업 선택</label>
              <select value={selPopupDept} onChange={e => { setSelPopupDept(e.target.value); const p = popups.find(x => x.dept === e.target.value); setPopupDraft(p ?? { dept: e.target.value, visible: false, title: "", content: "" }); }} className={inp + " cursor-pointer"}>
                <option value="all">전체 (모든 부서에 표시)</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          )}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-semibold text-slate-700">팝업 설정</p><p className="text-xs text-slate-400 mt-0.5">{selPopupDept === "all" ? "전체 부서에 표시" : `${selPopupDept} 전용`}</p></div>
              <button onClick={togglePopupVisible} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${(popups.find(p => p.dept === selPopupDept) ?? popupDraft).visible ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                {(popups.find(p => p.dept === selPopupDept) ?? popupDraft).visible ? <><Eye size={13} /> 표시 중</> : <><EyeOff size={13} /> 숨김</>}
              </button>
            </div>
            <div><label className={lbl}>팝업 제목</label><input value={popupDraft.title} onChange={e => setPopupDraft(p => ({ ...p, title: e.target.value }))} className={inp} /></div>
            <div><label className={lbl}>팝업 내용</label><textarea value={popupDraft.content} onChange={e => setPopupDraft(p => ({ ...p, content: e.target.value }))} rows={3} className={inp + " resize-none"} /></div>
            <button onClick={savePopup} className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">팝업 저장</button>
          </div>
          {popupDraft.title && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-3">미리보기</p>
              <div className="bg-white rounded-xl shadow border border-slate-100 p-4 max-w-xs mx-auto">
                <div className="flex items-start justify-between mb-2"><p className="text-sm font-bold text-slate-800 flex-1">{popupDraft.title}</p><X size={14} className="text-slate-400 mt-0.5 ml-2 shrink-0" /></div>
                <p className="text-xs text-slate-600">{popupDraft.content}</p>
                <button className="mt-3 w-full py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg">확인</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
const NAV_ITEMS: { view: ViewType; label: string; icon: React.ElementType; staffOnly?: boolean }[] = [
  { view: "dashboard",   label: "대시보드",   icon: LayoutDashboard },
  { view: "nps",         label: "NPS",        icon: Star },
  { view: "delivery",    label: "납기준수율",  icon: Clock },
  { view: "sales",       label: "매출",       icon: TrendingUp },
  { view: "notice",      label: "공지사항",   icon: Bell },
  { view: "regulations", label: "업무규정",   icon: BookOpen },
  { view: "cases",       label: "비정도사례", icon: AlertTriangle },
  { view: "resources",   label: "자료실",     icon: Archive, staffOnly: true },
];
function Sidebar({ current, setCurrent, user, onLogout, open, setOpen }: {
  current: ViewType; setCurrent: (v: ViewType) => void; user: User;
  onLogout: () => void; open: boolean; setOpen: (v: boolean) => void;
}) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-slate-900 text-slate-100 transition-transform duration-300 w-56 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`} style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0">
          <img src={ciLogo} alt="samwooworks" className="h-11 w-11 object-contain shrink-0" />
          <span className="text-base tracking-widest truncate" style={{ fontFamily: "'Outfit', sans-serif", color: "#D0D0D0", fontWeight: 700 }}>samwooworks</span>
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden text-slate-400 hover:text-white shrink-0"><X size={16} /></button>
        </div>
        <div className="px-3 py-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-300 font-bold text-xs">{user.name[0]}</div>
            <div className="min-w-0"><p className="text-xs font-semibold text-white truncate">{user.name}</p><p className="text-[10px] text-slate-400 truncate">{isSuperAdmin(user) ? "전체 관리자" : isAdmin(user) ? `${user.managedDept} 관리자` : user.department}</p></div>
          </div>
        </div>
        <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
          {NAV_ITEMS.filter(item => !item.staffOnly || canSeeResources(user)).map(item => (
            <button key={item.view} onClick={() => { setCurrent(item.view); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors ${current === item.view ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/10"}`}>
              <item.icon size={15} className="shrink-0" /><span>{item.label}</span>
            </button>
          ))}
          {isAdmin(user) && (
            <button onClick={() => { setCurrent("admin"); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors mt-1 pt-3 border-t border-white/10 ${current === "admin" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/10"}`}>
              <Shield size={15} className="shrink-0" /><span>관리자 페이지</span>
            </button>
          )}
        </nav>
        <div className="px-2 pb-4 border-t border-white/10 pt-3">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><LogOut size={15} className="shrink-0" /><span>로그아웃</span></button>
        </div>
      </aside>
    </>
  );
}

// ── Auth Modals ────────────────────────────────────────────────────────────────
function PopupModal({ popup, onClose, onHideToday }: { popup: PopupItem; onClose: () => void; onHideToday: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 pr-4">{popup.title}</h3>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 shrink-0"><X size={13} className="text-slate-600" /></button>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{popup.content}</p>
        </div>
        <div className="px-5 pb-4 space-y-2">
          <button onClick={onClose} className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            확인
          </button>
          <button onClick={onHideToday} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">
            오늘 하루 안보기
          </button>
        </div>
      </div>
    </div>
  );
}
function SignupModal({ onClose, onSuccess, onNewRegistration }: { onClose: () => void; onSuccess: () => void; onNewRegistration?: (r: Registration) => void }) {
  const [form, setForm] = useState({ userId: "", name: "", password: "", passwordConfirm: "", phone: "", department: "", jobType: "", license: "" });
  const [showPw, setShowPw] = useState(false); const [showPwC, setShowPwC] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false); const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [err, setErr] = useState(""); const [termsOpen, setTermsOpen] = useState(false); const [privacyOpen, setPrivacyOpen] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = async () => {
    if (!form.userId || !form.name || !form.password || !form.phone || !form.department || !form.jobType) return setErr("필수 항목을 모두 입력해주세요.");
    if (form.password !== form.passwordConfirm) return setErr("비밀번호가 일치하지 않습니다.");
    if (form.password.length < 4) return setErr("비밀번호는 4자 이상이어야 합니다.");
    if (!agreeTerms || !agreePrivacy) return setErr("이용약관 및 개인정보 처리방침에 동의해주세요.");
    try {
      const created = await api.createRegistration({
        name: form.name, employeeId: form.userId, team: form.jobType,
        department: form.department, phone: form.phone, email: form.userId,
      });
      // 생성된 registration을 App 상태에도 즉시 반영
      if (created && onNewRegistration) onNewRegistration(created as Registration);
    } catch (e) {
      // API 실패 시에도 로컬 임시 등록 (재로드 시 사라질 수 있음)
      console.error("가입 신청 저장 오류:", e);
      if (onNewRegistration) onNewRegistration({
        id: `tmp_${Date.now()}`, name: form.name, employeeId: form.userId,
        team: form.jobType, department: form.department, phone: form.phone,
        email: form.userId, status: "pending",
        requestDate: new Date().toISOString().slice(0, 10),
      });
    }
    onSuccess();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white/95 rounded-2xl shadow-2xl w-full max-w-md my-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 pt-6 pb-5 relative"><button onClick={onClose} className="absolute right-4 top-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"><X size={14} className="text-white" /></button><h2 className="text-lg font-bold text-white">회원가입</h2><p className="text-xs text-blue-200 mt-1">삼우웍스에서 안전 교육과 계정을 생성합니다</p></div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>아이디 <span className="text-red-500">*</span></label><input value={form.userId} onChange={set("userId")} placeholder="아이디" className={inputCls} /></div><div><label className={labelCls}>이름 <span className="text-red-500">*</span></label><input value={form.name} onChange={set("name")} placeholder="이름을 입력하세요" className={inputCls} /></div></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>비밀번호 <span className="text-red-500">*</span></label><div className="relative"><input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="••••••••" className={inputCls + " pr-9"} /><button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></div>
            <div><label className={labelCls}>비밀번호 확인 <span className="text-red-500">*</span></label><div className="relative"><input type={showPwC ? "text" : "password"} value={form.passwordConfirm} onChange={set("passwordConfirm")} placeholder="비밀번호 재입력" className={inputCls + " pr-9"} /><button type="button" onClick={() => setShowPwC(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">{showPwC ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></div>
          </div>
          <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>전화번호 <span className="text-red-500">*</span></label><input value={form.phone} onChange={set("phone")} placeholder="010-0000-0000" className={inputCls} /></div><div><label className={labelCls}>소속 부서 <span className="text-red-500">*</span></label><select value={form.department} onChange={set("department")} className={inputCls + " cursor-pointer"}><option value="">부서를 선택하세요</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></div></div>
          <div><label className={labelCls}>업무구분 <span className="text-red-500">*</span></label><select value={form.jobType} onChange={set("jobType")} className={inputCls + " cursor-pointer"}><option value="">업무구분을 선택하세요</option>{JOB_TYPES.map(j => <option key={j}>{j}</option>)}</select></div>
          <div><label className={labelCls}>자격면허</label><textarea value={form.license} onChange={set("license")} rows={2} placeholder="자격번호(자격증명칭, 면허번호, 취득날짜)" className={inputCls + " resize-none"} /></div>
          <div className="space-y-2">
            {[{ k: "t", label: "이용약관 동의합니다", val: agreeTerms, setV: setAgreeTerms, open: termsOpen, setO: setTermsOpen, text: "이 약관은 삼우웍스가 제공하는 서비스의 이용 조건을 규정합니다." },
              { k: "p", label: "개인정보 수집 및 이용에 동의합니다", val: agreePrivacy, setV: setAgreePrivacy, open: privacyOpen, setO: setPrivacyOpen, text: "수집 항목: 이름, 아이디, 전화번호, 소속부서. 목적: 서비스 이용자 식별 및 실적 관리. 보유: 탈퇴 후 6개월." }].map(item => (
              <div key={item.k}><div className="flex items-center gap-2"><button type="button" onClick={() => item.setV(v => !v)} className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${item.val ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"}`}>{item.val && <Check size={10} className="text-white" />}</button><span className="text-xs text-slate-600 flex-1">{item.label}</span><button type="button" onClick={() => item.setO(v => !v)} className="text-xs text-blue-500 hover:underline shrink-0">내용 보기</button></div>{item.open && <div className="mt-1.5 bg-slate-50 rounded-lg p-3 text-xs text-slate-500 leading-relaxed border border-slate-200 max-h-24 overflow-y-auto">{item.text}</div>}</div>
            ))}
          </div>
          {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <button onClick={submit} className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all">회원가입</button>
          <p className="text-center text-xs text-slate-500">이미 계정이 있으신가요? <button onClick={onClose} className="text-blue-600 font-semibold hover:underline">로그인</button></p>
        </div>
      </div>
    </div>
  );
}
function FindIdModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [result, setResult] = useState<string | null>(null); const [err, setErr] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white/95 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 pt-6 pb-5 relative"><button onClick={onClose} className="absolute right-4 top-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"><X size={14} className="text-white" /></button><h2 className="text-lg font-bold text-white">아이디 찾기</h2><p className="text-xs text-slate-300 mt-1">가입 시 등록한 정보로 아이디를 찾습니다</p></div>
        <div className="p-6 space-y-4">
          <div><label className={labelCls}>이름</label><input value={name} onChange={e => setName(e.target.value)} placeholder="이름 입력" className={inputCls} /></div>
          <div><label className={labelCls}>전화번호</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" className={inputCls} /></div>
          {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          {result && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center"><p className="text-xs text-slate-500 mb-1">회원님의 사원번호는</p><p className="text-xl font-mono font-bold text-blue-700">{result}</p></div>}
          {!result ? <button onClick={() => { if (!name || !phone) return setErr("이름과 전화번호를 입력해주세요."); const f = ACCOUNTS.find(u => u.name === name && u.role === "employee"); f ? (setResult(f.employeeId), setErr("")) : setErr("일치하는 계정을 찾을 수 없습니다."); }} className="w-full py-3 bg-slate-700 text-white text-sm font-semibold rounded-xl hover:bg-slate-800">아이디 찾기</button>
            : <button onClick={onClose} className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">로그인하러 가기</button>}
        </div>
      </div>
    </div>
  );
}
function FindPasswordModal({ onClose }: { onClose: () => void }) {
  const [empId, setEmpId] = useState(""); const [phone, setPhone] = useState(""); const [step, setStep] = useState<"form"|"reset"|"done">("form");
  const [newPw, setNewPw] = useState(""); const [newPwC, setNewPwC] = useState(""); const [showPw, setShowPw] = useState(false); const [err, setErr] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white/95 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 pt-6 pb-5 relative"><button onClick={onClose} className="absolute right-4 top-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"><X size={14} className="text-white" /></button><h2 className="text-lg font-bold text-white">비밀번호 찾기</h2><p className="text-xs text-slate-300 mt-1">{step === "form" ? "본인 확인" : step === "reset" ? "새 비밀번호 설정" : "변경 완료"}</p></div>
        <div className="p-6 space-y-4">
          {step === "form" && (<><div><label className={labelCls}>사원번호</label><input value={empId} onChange={e => setEmpId(e.target.value)} placeholder="EMP001" className={inputCls + " font-mono"} /></div><div><label className={labelCls}>전화번호</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" className={inputCls} /></div>{err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}<button onClick={() => { if (!empId || !phone) return setErr("모두 입력해주세요."); const f = ACCOUNTS.find(u => u.employeeId === empId && u.role === "employee"); f ? (setStep("reset"), setErr("")) : setErr("일치하는 계정을 찾을 수 없습니다."); }} className="w-full py-3 bg-slate-700 text-white text-sm font-semibold rounded-xl hover:bg-slate-800">본인 확인</button></>)}
          {step === "reset" && (<><div><label className={labelCls}>새 비밀번호</label><div className="relative"><input type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="새 비밀번호" className={inputCls + " pr-9"} /><button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></div><div><label className={labelCls}>확인</label><input type="password" value={newPwC} onChange={e => setNewPwC(e.target.value)} placeholder="재입력" className={inputCls} /></div>{err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}<button onClick={() => { if (!newPw || newPw.length < 4) return setErr("4자 이상 입력해주세요."); if (newPw !== newPwC) return setErr("비밀번호가 일치하지 않습니다."); setStep("done"); setErr(""); }} className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">비밀번호 변경</button></>)}
          {step === "done" && (<><div className="text-center py-4"><div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3"><Check size={24} className="text-emerald-600" /></div><p className="text-sm font-semibold text-slate-800">비밀번호가 변경되었습니다</p><p className="text-xs text-slate-500 mt-1">새 비밀번호로 로그인해주세요.</p></div><button onClick={onClose} className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">로그인하러 가기</button></>)}
        </div>
      </div>
    </div>
  );
}

// ── Login Screen ───────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onNewRegistration }: { onLogin: (id: string, pw: string, stay: boolean) => string | null; onNewRegistration: (r: Registration) => void }) {
  const [id, setId] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [showPw, setShowPw] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [modal, setModal] = useState<"signup"|"findId"|"findPw"|null>(null);
  const [signupDone, setSignupDone] = useState(false);
  const submit = () => { const e = onLogin(id, pw, stayLoggedIn); if (e) setErr(e); };
  return (
    <div className="min-h-screen relative flex items-center justify-center" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      {modal === "signup" && <SignupModal onClose={() => setModal(null)} onNewRegistration={onNewRegistration} onSuccess={() => { setModal(null); setSignupDone(true); }} />}
      {modal === "findId" && <FindIdModal onClose={() => setModal(null)} />}
      {modal === "findPw" && <FindPasswordModal onClose={() => setModal(null)} />}
      <div className="absolute inset-0 bg-slate-900">
        <img src={bgPhoto} alt="삼우웍스 물류센터" className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/85" />
      </div>
      <div className="absolute top-0 left-0 right-0 px-6 py-6 flex items-center gap-3">
        <img src={ciLogo} alt="samwooworks" className="h-12 w-12 object-contain" />
        <span className="text-2xl tracking-widest" style={{ fontFamily: "'Outfit', sans-serif", color: "#D0D0D0", fontWeight: 700 }}>samwooworks</span>
      </div>
      <div className="relative z-10 w-full max-w-sm mx-4">
        {signupDone && <div className="mb-3 bg-emerald-500/90 backdrop-blur-sm text-white text-xs rounded-xl px-4 py-3 flex items-center gap-2"><Check size={14} /> 회원가입 신청 완료. 소속부서 관리자 승인 후 로그인 가능합니다.</div>}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 pt-7 pb-6">
            <h1 className="text-2xl font-bold text-white">로그인</h1>
            <p className="text-xs text-blue-200 mt-1">아이디와 비밀번호를 입력하세요</p>
          </div>
          <div className="p-6 space-y-4">
            <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">아이디</label><input value={id} onChange={e => { setId(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && submit()} placeholder="아이디 입력" className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">비밀번호</label>
              <div className="relative"><input type={showPw ? "text" : "password"} value={pw} onChange={e => { setPw(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && submit()} placeholder="비밀번호 입력" className="w-full px-4 py-3 pr-11 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" /><button onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
            </div>
            {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
            {/* 로그인 상태 유지 */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <button
                type="button"
                onClick={() => setStayLoggedIn(v => !v)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${stayLoggedIn ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"}`}
              >
                {stayLoggedIn && <Check size={10} className="text-white" />}
              </button>
              <span className="text-xs text-slate-500">로그인 상태 유지</span>
            </label>
            <button onClick={submit} className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-600/30">로그인</button>
            <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
              {(["signup","findId","findPw"] as const).map((k, i, arr) => (
                <span key={k} className="flex items-center gap-1">
                  <button onClick={() => setModal(k)} className="hover:text-blue-600 font-medium transition-colors px-1 py-1">{["회원가입","아이디 찾기","비밀번호 찾기"][i]}</button>
                  {i < arr.length - 1 && <span className="text-slate-300">|</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 회사 정보 */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 text-center space-y-0.5 bg-black/40 backdrop-blur-sm">
        <p className="text-white/70 text-[11px] leading-relaxed">
          ㈜삼우에프엔지&nbsp;&nbsp;|&nbsp;&nbsp;센터장: 박기웅&nbsp;&nbsp;|&nbsp;&nbsp;사업자등록번호: 124-81-31846&nbsp;&nbsp;|&nbsp;&nbsp;주소: 인천광역시 중구 항동7가 56&nbsp;&nbsp;|&nbsp;&nbsp;Tel: 1577-3921&nbsp;&nbsp;|&nbsp;&nbsp;E-mail: kwpark@samwoofg.co.kr
        </p>
        <p className="text-white/50 text-[10px] tracking-widest uppercase">
          COPYRIGHT © SAMWOO F&amp;G ALL RIGHTS RESERVED.
        </p>
      </div>
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>(INIT_REGS);
  const [posts, setPosts] = useState<Post[]>(INIT_POSTS);
  const [popups, setPopups] = useState<PopupItem[]>(INIT_POPUPS);
  const [showPopup, setShowPopup] = useState(true);
  const [lookerUrls, setLookerUrls] = useState<LookerUrls>({ performance: "", nps: "", delivery: "", sales: "" });

  const today = new Date().toISOString().slice(0, 10);
  const hideKey = (dept: string) => `sw_popup_hide_${dept}`;
  const isHiddenToday = (dept: string) => localStorage.getItem(hideKey(dept)) === today;
  const hidePopupToday = (dept: string) => { localStorage.setItem(hideKey(dept), today); setShowPopup(false); };

  // Supabase에서 초기 데이터 로드 (실패 시 목업 데이터 유지)
  useEffect(() => {
    const safe = <T,>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);
    Promise.all([
      safe(api.getPosts(),           INIT_POSTS   as any),
      safe(api.getPopups(),          INIT_POPUPS  as any),
      safe(api.getLooker(),          {} as any),
      safe(api.getRegistrations(),   INIT_REGS    as any),
    ]).then(([postsData, popupsData, lookerData, regsData]) => {
      if (Array.isArray(postsData)  && postsData.length)  setPosts(postsData);
      if (Array.isArray(popupsData) && popupsData.length) setPopups(popupsData);
      if (lookerData && Object.keys(lookerData).length)   setLookerUrls(lookerData as LookerUrls);
      if (Array.isArray(regsData)   && regsData.length)   setRegistrations(regsData);
    });
  }, []);

  // 로그인 상태 유지: 앱 초기 로드 시 복원
  const [_init] = useState(() => {
    const saved = localStorage.getItem("sw_saved_user");
    if (saved) {
      const user = ACCOUNTS.find(u => u.employeeId === saved);
      if (user) {
        setTimeout(() => {
          setCurrentUser(user);
          setCurrentView(isAdmin(user) ? "admin" : "dashboard");
          const dept = isSuperAdmin(user) ? "all" : user.managedDept || user.department;
          setShowPopup(!isHiddenToday(dept) && !isHiddenToday("all"));
        }, 0);
      }
    }
    return null;
  });

  const handleLogin = (id: string, pw: string, stay: boolean): string | null => {
    const user = ACCOUNTS.find(u => u.employeeId === id && u.password === pw);
    if (user) {
      if (stay) localStorage.setItem("sw_saved_user", user.employeeId);
      else localStorage.removeItem("sw_saved_user");
      setCurrentUser(user);
      setCurrentView(isAdmin(user) ? "admin" : "dashboard");
      const dept = isSuperAdmin(user) ? "all" : user.managedDept || user.department;
      setShowPopup(!isHiddenToday(dept) && !isHiddenToday("all"));
      // 관리자 로그인 시 최신 가입신청 목록 재조회
      if (isAdmin(user)) {
        api.getRegistrations().then(regs => {
          if (Array.isArray(regs)) setRegistrations(regs);
        }).catch(() => {});
      }
      return null;
    }
    return "사원번호 또는 비밀번호가 올바르지 않습니다.";
  };

  const handleLogout = () => {
    localStorage.removeItem("sw_saved_user");
    setCurrentUser(null);
    setCurrentView("dashboard");
  };

  if (!currentUser) return (
    <LoginScreen
      onLogin={handleLogin}
      onNewRegistration={(reg) => setRegistrations(prev => [reg, ...prev.filter(r => r.id !== reg.id)])}
    />
  );

  const visiblePosts = filterPosts(posts, currentUser);
  const activePopup  = getPopup(popups, currentUser);
  const adminFlag    = isAdmin(currentUser);
  const dept         = userDept(currentUser);
  const PAGE_TITLE: Record<ViewType, string> = { dashboard: "대시보드", nps: "NPS", delivery: "납기준수율", sales: "매출", notice: "공지사항", regulations: "업무규정", cases: "비정도사례", resources: "자료실", admin: "관리자 페이지" };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      {activePopup && showPopup && currentView === "dashboard" && (
        <PopupModal
          popup={activePopup}
          onClose={() => setShowPopup(false)}
          onHideToday={() => hidePopupToday(activePopup.dept)}
        />
      )}
      <Sidebar current={currentView} setCurrent={setCurrentView} user={currentUser} onLogout={handleLogout} open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white border-b border-slate-100 flex items-center gap-3 px-4 shrink-0" style={{ height: 52 }}>
          <button onClick={() => setSidebarOpen(v => !v)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 shrink-0"><Menu size={18} /></button>
          <h2 className="text-sm font-bold text-slate-700 flex-1 truncate">{PAGE_TITLE[currentView]}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 hidden sm:block">{isSuperAdmin(currentUser) ? "전체 관리자" : isAdmin(currentUser) ? `${dept} 관리자` : dept}</span>
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{currentUser.name[0]}</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {currentView === "dashboard"   && <DashboardView user={currentUser} />}
          {currentView === "nps"         && <NPSView url={lookerUrls.nps} />}
          {currentView === "delivery"    && <DeliveryView url={lookerUrls.delivery} />}
          {currentView === "sales"       && <SalesView url={lookerUrls.sales} />}
          {currentView === "notice"      && <PostListView section="notice"      posts={visiblePosts} adminFlag={adminFlag} dept={dept} onPostsChange={(updater) => setPosts(updater)} title="공지사항"   sub={`${dept === "all" ? "전체" : dept} 공지 및 안내사항`} />}
          {currentView === "regulations" && <PostListView section="regulations" posts={visiblePosts} adminFlag={adminFlag} dept={dept} onPostsChange={(updater) => setPosts(updater)} title="업무규정"   sub={`${dept === "all" ? "전체" : dept} 표준 업무 절차 및 규정`} />}
          {currentView === "cases"       && <PostListView section="cases"       posts={visiblePosts} adminFlag={adminFlag} dept={dept} onPostsChange={(updater) => setPosts(updater)} title="비정도사례" sub={`${dept === "all" ? "전체" : dept} 규정 위반 사례 공유`} />}
          {currentView === "resources"   && canSeeResources(currentUser) && (
            <PostListView section="resources" posts={visiblePosts} adminFlag={adminFlag} dept={dept} onPostsChange={(updater) => setPosts(updater)} title="자료실" sub={`${dept === "all" ? "전체" : dept} 자료 (STAFF 전용)`} />
          )}
          {currentView === "resources"   && !canSeeResources(currentUser) && (
            <div className="p-6 flex items-center justify-center h-64"><p className="text-slate-400 text-sm">STAFF 업무구분 회원만 접근 가능합니다.</p></div>
          )}
          {currentView === "admin" && adminFlag && <AdminView user={currentUser} registrations={registrations} setRegistrations={setRegistrations} popups={popups} setPopups={setPopups} lookerUrls={lookerUrls} setLookerUrls={setLookerUrls} />}
          {currentView === "admin" && !adminFlag && <div className="p-6 flex items-center justify-center h-64"><p className="text-slate-400 text-sm">접근 권한이 없습니다.</p></div>}
        </main>
      </div>
    </div>
  );
}
