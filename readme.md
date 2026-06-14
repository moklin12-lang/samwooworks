# 삼우에프엔지 교육센터

#인천센터

## 프로젝트 개요
삼우에프엔지 직원 교육 콘텐츠 관리 및 열람 플랫폼입니다.  
정적 HTML/CSS/JS SPA 구조 + **Supabase** 백엔드 연동.

---

## 🗂️ 페이지 구성

| 파일 | 설명 |
|------|------|
| `index.html` | 로그인 페이지 |
| `dashboard.html` | 메인 대시보드 (교육 콘텐츠 + 관리자 패널) |
| `register.html` | 회원가입 |
| `find-id.html` | 아이디 찾기 |
| `find-pw.html` | 비밀번호 찾기 |

---

## 🔑 관리자 계정

| 아이디 | 비밀번호 | 권한 | 관리 부서 |
|--------|----------|------|-----------|
| `alladmin` | `samwoo3921` | 최고 관리자 | 전체 부서 |
| `icadmin` | `sw3838` | 부서 관리자 | 인천TC |
| `ptadmin` | `sw3838` | 부서 관리자 | 평택TC |
| `mpadmin` | `sw3838` | 부서 관리자 | 목포TC |
| `hwadmin` | `sw3838` | 부서 관리자 | 화성TDC |
| `kjadmin` | `sw3838` | 부서 관리자 | 광주TDC |
| `hvadmin` | `sw3838` | 부서 관리자 | HVAC |
| `readmin` | `sw3838` | 부서 관리자 | 냉장사업부 |

---

## 🗄️ Supabase 연동

### 연결 정보
- **Project URL**: `https://rpqmqsnzjchsmpsjffeb.supabase.co`
- **Anon Key**: `sb_publishable_m3zw9KPHblvy_woKJSPFAg_W1S0hPzS`
- **설정 파일**: `js/supabase.js`

### 테이블 설계

#### `members` — 회원 목록
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | 사용자 아이디 |
| `pw` | TEXT | 비밀번호 |
| `name` | TEXT | 이름 |
| `tel` | TEXT | 전화번호 |
| `dept` | TEXT | 소속부서 |
| `role` | TEXT | 업무구분 |
| `car` | TEXT | 차량번호 |
| `status` | TEXT | `pending` / `approved` / `rejected` |
| `memo` | TEXT | 관리자 메모 |
| `joined_at` | TIMESTAMPTZ | 가입일시 |

#### `watch_history` — 동영상 시청내역
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | BIGSERIAL PK | 자동 증가 |
| `user_id` | TEXT → members | 시청자 아이디 |
| `user_name` | TEXT | 시청자 이름 |
| `user_dept` | TEXT | 시청자 부서 |
| `post_id` | TEXT | 게시물 ID |
| `post_title` | TEXT | 게시물 제목 |
| `post_tab` | TEXT | 교육 카테고리 |
| `vid_name` | TEXT | 동영상 이름 |
| `vid_type` | TEXT | `upload` / `youtube` |
| `watched_at` | TIMESTAMPTZ | 시청 일시 |

#### `popup_settings` — 접속 팝업 설정
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | 자동 증가 |
| `enabled` | BOOLEAN | 팝업 활성화 여부 |
| `type` | TEXT | `notice` / `warning` / `event` / `safety` |
| `title` | TEXT | 팝업 제목 |
| `content` | TEXT | 팝업 본문 |
| `btn_text` | TEXT | 확인 버튼 텍스트 |
| `skip_option` | TEXT | 오늘 하루 안보기 옵션 |
| `date_start` | TEXT | 노출 시작일 |
| `date_end` | TEXT | 노출 종료일 |
| `image_url` | TEXT | 팝업 이미지 URL/Base64 |
| `updated_at` | TIMESTAMPTZ | 마지막 수정일시 |

#### `posts` — 교육 게시물
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | 게시물 ID (`post_타임스탬프`) |
| `title` | TEXT | 게시물 제목 |
| `category` | TEXT | 카테고리 (`main` / `safety` / `env` 등) |
| `author` | TEXT | 작성자 이름 |
| `dept` | TEXT | 공개 부서 (`all` = 전체 공통) |
| `date_label` | TEXT | 표시용 날짜 문자열 |
| `views` | INTEGER | 조회수 |
| `body` | TEXT | HTML 본문 |
| `raw_content` | TEXT | 원본 텍스트 내용 |
| `video_id` | TEXT | YouTube 동영상 ID |
| `images` | JSONB | 첨부 이미지 배열 `[{dataURL}]` |
| `videos` | JSONB | 첨부 동영상 배열 `[{blobURL, name, size}]` |
| `created_at` | TIMESTAMPTZ | 생성일시 |
| `updated_at` | TIMESTAMPTZ | 수정일시 |

**조회수 동작:** 게시물 클릭 시 `sbIncrementViews()` 호출 → DB `views` 컬럼 +1 PATCH, 로컬 메모리도 즉시 반영.

### ⚙️ Supabase 초기 설정 방법

1. [Supabase 대시보드](https://supabase.com/dashboard) → 프로젝트 선택
2. **SQL Editor** → `supabase_setup.sql` 전체 내용 붙여넣고 실행
3. 테이블 4개(`members`, `watch_history`, `popup_settings`, `posts`) 생성 확인
4. RLS 정책 자동 적용 확인
5. 최초 접속 시 `js/data.js`의 정적 게시물 데이터가 자동으로 `posts` 테이블로 마이그레이션됨

---

## 📁 파일 구조

```
index.html              로그인
dashboard.html          대시보드
register.html           회원가입
find-id.html            아이디 찾기
find-pw.html            비밀번호 찾기
supabase_setup.sql      Supabase 테이블 생성 SQL ← 최초 1회 실행
js/
  supabase.js           Supabase REST API 클라이언트 + CRUD 헬퍼
  auth.js               관리자 계정 + 인증 함수 (authLoginAsync)
  login.js              로그인 처리
  register.js           회원가입 처리
  find-account.js       아이디/비밀번호 찾기
  dashboard.js          대시보드 전체 로직
  data.js               정적 게시물 데이터
css/
  dashboard.css         대시보드 스타일
  login.css             로그인 스타일
  register.css          회원가입 스타일
  find-account.css      찾기 페이지 스타일
```

---

## ✅ 구현 완료 기능

- [x] 반응형 디자인 (4단계 브레이크포인트)
- [x] 모바일 사이드 드로어
- [x] 관리자 계정 시스템 (8개 계정)
- [x] 부서별 게시물 필터링
- [x] 회원 동영상 시청내역 기록 (play 이벤트 + YouTube 클릭)
- [x] 시청내역 모달 조회
- [x] 통계 탭 (회원현황 + 시청현황)
- [x] 엑셀(CSV) 다운로드 (회원목록 / 시청내역)
- [x] **Supabase DB 연동** (members / watch_history / popup_settings / **posts**)
- [x] localStorage → Supabase 자동 마이그레이션 (최초 1회)
- [x] **게시물 Supabase 연동** — 작성/수정/삭제 모두 DB 반영
- [x] **조회수 실시간 DB 반영** — 게시물 클릭 시 `sbIncrementViews()` 호출

## 🔧 미구현 / 권장 개선사항

- [ ] 비밀번호 해시 처리 (현재 평문 저장)
- [ ] Supabase Auth 연동 (이메일 인증)
- [ ] 파일 업로드 → Supabase Storage 연동 (현재 Base64/blobURL로 저장)
