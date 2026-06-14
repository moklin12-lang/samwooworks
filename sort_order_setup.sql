-- ================================================================
-- 게시물 순서 관리를 위한 sort_order 컬럼 추가
-- Supabase 대시보드 → SQL Editor 에서 실행하세요.
-- ================================================================

-- 1. posts 테이블에 sort_order 컬럼 추가
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. 기존 게시물에 sort_order 초기값 설정
--    (카테고리별로 created_at 내림차순 기준으로 1, 2, 3... 부여)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY category
      ORDER BY created_at DESC
    ) AS rn
  FROM public.posts
)
UPDATE public.posts p
SET sort_order = r.rn
FROM ranked r
WHERE p.id = r.id;

-- 3. sort_order 인덱스 추가 (정렬 성능 향상)
CREATE INDEX IF NOT EXISTS idx_posts_sort_order
  ON public.posts (category, sort_order ASC);

-- 4. 확인 쿼리 (실행 후 결과 확인)
SELECT id, title, category, sort_order, created_at
FROM public.posts
ORDER BY category, sort_order ASC
LIMIT 50;
