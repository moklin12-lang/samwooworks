-- ================================================================
-- 삼우에프엔지 교육센터 — Supabase 테이블 생성 SQL
-- Supabase 대시보드 → SQL Editor 에서 전체 복사 후 실행하세요.
-- ================================================================

-- ── 1. members 테이블 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.members (
  id          TEXT        PRIMARY KEY,          -- 사용자 아이디 (예: hong123)
  pw          TEXT        NOT NULL,             -- 비밀번호
  name        TEXT        NOT NULL DEFAULT '',
  tel         TEXT        NOT NULL DEFAULT '',
  dept        TEXT        NOT NULL DEFAULT '',
  role        TEXT        NOT NULL DEFAULT '',  -- 업무구분
  car         TEXT                 DEFAULT '',
  status      TEXT        NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  memo        TEXT                 DEFAULT '',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. watch_history 테이블 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.watch_history (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     TEXT        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  user_name   TEXT                 DEFAULT '',
  user_dept   TEXT                 DEFAULT '',
  post_id     TEXT                 DEFAULT '',
  post_title  TEXT                 DEFAULT '',
  post_tab    TEXT                 DEFAULT '',
  vid_name    TEXT                 DEFAULT '',
  vid_type    TEXT                 DEFAULT 'upload',  -- upload | youtube
  watched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. popup_settings 테이블 ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.popup_settings (
  id           SERIAL      PRIMARY KEY,
  enabled      BOOLEAN     NOT NULL DEFAULT FALSE,
  type         TEXT                 DEFAULT 'notice',   -- notice | warning | event | safety
  title        TEXT                 DEFAULT '',
  content      TEXT                 DEFAULT '',
  btn_text     TEXT                 DEFAULT '확인',
  skip_option  TEXT                 DEFAULT 'yes',
  date_start   TEXT                 DEFAULT '',
  date_end     TEXT                 DEFAULT '',
  image_url    TEXT                 DEFAULT '',
  target_dept  TEXT                 DEFAULT 'all',      -- 'all' | 부서명 (ex: '인천TC')
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- target_dept 컬럼이 없는 기존 테이블에 컬럼 추가 (이미 있으면 무시)
ALTER TABLE public.popup_settings
  ADD COLUMN IF NOT EXISTS target_dept TEXT DEFAULT 'all';

-- ================================================================
-- RLS(Row Level Security) 설정
-- anon 키(브라우저)에서 모든 CRUD 허용
-- ================================================================

-- members RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_members"  ON public.members FOR SELECT  USING (true);
CREATE POLICY "anon_insert_members"  ON public.members FOR INSERT  WITH CHECK (true);
CREATE POLICY "anon_update_members"  ON public.members FOR UPDATE  USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_members"  ON public.members FOR DELETE  USING (true);

-- watch_history RLS
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_watch"  ON public.watch_history FOR SELECT  USING (true);
CREATE POLICY "anon_insert_watch"  ON public.watch_history FOR INSERT  WITH CHECK (true);
CREATE POLICY "anon_update_watch"  ON public.watch_history FOR UPDATE  USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_watch"  ON public.watch_history FOR DELETE  USING (true);

-- popup_settings RLS
ALTER TABLE public.popup_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_popup"  ON public.popup_settings FOR SELECT  USING (true);
CREATE POLICY "anon_insert_popup"  ON public.popup_settings FOR INSERT  WITH CHECK (true);
CREATE POLICY "anon_update_popup"  ON public.popup_settings FOR UPDATE  USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_popup"  ON public.popup_settings FOR DELETE  USING (true);

-- ── 4. posts 테이블 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id           TEXT        PRIMARY KEY,          -- 게시물 고유 ID (예: new_1718000000000)
  title        TEXT        NOT NULL DEFAULT '',
  category     TEXT        NOT NULL DEFAULT 'main',  -- main|newcomer|appliance|aircon|warehouse|regulation|major-accident|violation
  author       TEXT                 DEFAULT '',
  dept         TEXT                 DEFAULT 'all',   -- 'all' 또는 특정 부서명
  date_label   TEXT                 DEFAULT '',      -- 화면 표시용 날짜 문자열
  views        INTEGER              DEFAULT 0,
  body         TEXT                 DEFAULT '',      -- HTML 본문
  raw_content  TEXT                 DEFAULT '',      -- 원문 텍스트
  video_id     TEXT                 DEFAULT '',      -- YouTube 영상 ID
  images       JSONB                DEFAULT '[]',    -- 첨부 이미지 배열
  videos       JSONB                DEFAULT '[]',    -- 첨부 동영상 배열
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- posts RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_posts"  ON public.posts FOR SELECT  USING (true);
CREATE POLICY "anon_insert_posts"  ON public.posts FOR INSERT  WITH CHECK (true);
CREATE POLICY "anon_update_posts"  ON public.posts FOR UPDATE  USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_posts"  ON public.posts FOR DELETE  USING (true);

-- ================================================================
-- 인덱스 (성능 최적화)
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_members_dept    ON public.members(dept);
CREATE INDEX IF NOT EXISTS idx_members_status  ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_watch_user_id   ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_watched   ON public.watch_history(watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category  ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_dept      ON public.posts(dept);
CREATE INDEX IF NOT EXISTS idx_posts_created   ON public.posts(created_at DESC);
