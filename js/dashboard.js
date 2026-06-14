// ===== 인증 체크 =====
// auth.js의 getCurrentUser() 사용 (auth.js가 먼저 로드되어야 함)
const currentUser = getCurrentUser() || { id: 'guest', name: '게스트', role: 'user', isAdmin: false, scope: 'self', dept: null };

// 비로그인 상태면 로그인 페이지로
(function authGuard() {
  const stored = sessionStorage.getItem('sw_user') || localStorage.getItem('sw_user');
  if (!stored) window.location.href = 'index.html';
})();

// ===== 사용자 정보 적용 =====
function applyUser() {
  const greet = document.getElementById('header-greeting');
  if (greet) {
    const roleTag = currentUser.isAdmin
      ? ` <span style="
          display:inline-block;
          font-size:0.65rem;font-weight:700;
          background:${currentUser.scope==='all' ? '#1a237e' : '#e65100'};
          color:#fff;padding:1px 7px;border-radius:10px;
          margin-left:5px;vertical-align:middle;">
          ${currentUser.roleLabel || '관리자'}${currentUser.dept ? ' · '+currentUser.dept : ''}
        </span>`
      : '';
    greet.innerHTML = `안녕하세요, ${currentUser.name}님${roleTag}`;
  }

  // 관리자가 아니면 관리자 탭 + 게시물 작성 버튼 숨기기
  if (!currentUser.isAdmin) {
    const adminTab  = document.querySelector('.tab-item[data-tab="admin"]');
    const writeBtn  = document.getElementById('btn-write');
    if (adminTab) adminTab.style.display = 'none';
    if (writeBtn) writeBtn.style.display = 'none';
  }
}

// ===== 로그아웃 =====
function handleLogout() {
  // 로그아웃 확인 모달 닫기
  closeLogoutConfirm();
  closeMyPage();
  sessionStorage.removeItem('sw_user');
  localStorage.removeItem('sw_user');
  // 히스토리 전체를 replace하여 뒤로가기로 돌아오지 못하게 함
  window.location.replace('index.html');
}

// ===================================================================
// ===== 마이페이지 드로어 ===========================================
// ===================================================================

/** 마이페이지 열기 */
async function openMyPage() {
  const drawer  = document.getElementById('mypage-drawer');
  const overlay = document.getElementById('mypage-overlay');
  const btn     = document.getElementById('mypage-btn');
  if (!drawer || !overlay) return;

  // 사용자 정보 채우기
  _fillMyPageInfo();

  // 열기
  drawer.classList.add('open');
  overlay.classList.add('visible');
  if (btn) btn.classList.add('active');
  document.body.style.overflow = 'hidden';

  // 히스토리에 상태 추가 → 뒤로가기로 닫히도록
  history.pushState({ mypage: true, page: 'dashboard' }, '');

  // 시청 횟수 로드 (일반 사용자만)
  if (!currentUser.isAdmin) {
    try {
      const hist = await sbGetWatchHistory(currentUser.id);
      const countEl = document.getElementById('mypage-watch-count');
      if (countEl) countEl.textContent = hist.length;
    } catch(e) {
      console.warn('[마이페이지] 시청 기록 로드 실패:', e);
    }
  }
}

/** 마이페이지 닫기 */
function closeMyPage() {
  const drawer  = document.getElementById('mypage-drawer');
  const overlay = document.getElementById('mypage-overlay');
  const btn     = document.getElementById('mypage-btn');
  if (!drawer || !overlay) return;

  drawer.classList.remove('open');
  overlay.classList.remove('visible');
  if (btn) btn.classList.remove('active');
  document.body.style.overflow = '';
}

/** 마이페이지 정보 채우기 */
function _fillMyPageInfo() {
  const u = currentUser;
  if (!u) return;

  const avatarEl   = document.getElementById('mypage-avatar');
  const nameEl     = document.getElementById('mypage-name');
  const badgeEl    = document.getElementById('mypage-role-badge');
  const idEl       = document.getElementById('mypage-id');
  const deptEl     = document.getElementById('mypage-dept');
  const roleLbEl   = document.getElementById('mypage-role-label');
  const watchSec   = document.getElementById('mypage-watch-section');

  // 아바타 첫 글자
  if (avatarEl) avatarEl.textContent = (u.name || u.id || '?').charAt(0).toUpperCase();

  // 이름
  if (nameEl) nameEl.textContent = u.name || u.id || '-';

  // 역할 배지
  if (badgeEl) {
    badgeEl.textContent = u.roleLabel || (u.isAdmin ? '관리자' : '직원');
    badgeEl.className   = 'mypage-role-badge' + (u.isAdmin ? ' admin' : '');
  }

  // 아이디
  if (idEl) idEl.textContent = u.id || '-';

  // 소속부서
  if (deptEl) {
    deptEl.textContent = u.dept
      ? u.dept
      : (u.scope === 'all' ? '전체 부서' : '-');
  }

  // 구분 (roleLabel)
  if (roleLbEl) roleLbEl.textContent = u.roleLabel || '-';

  // 관리자는 시청 현황 숨기기
  if (watchSec) {
    watchSec.style.display = u.isAdmin ? 'none' : '';
  }
}

/** 로그아웃 확인 모달 열기 */
function confirmLogout() {
  document.getElementById('logout-confirm-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/** 로그아웃 확인 모달 닫기 */
function closeLogoutConfirm() {
  const modal = document.getElementById('logout-confirm-modal');
  if (modal) modal.classList.add('hidden');
  // body overflow는 마이페이지가 열려있으면 그대로 hidden 유지
  const drawer = document.getElementById('mypage-drawer');
  if (!drawer || !drawer.classList.contains('open')) {
    document.body.style.overflow = '';
  }
}

// ===== 탭별 게시물 데이터 =====
// dept: 'all'  → 모든 부서 공통 표시
// dept: '인천TC' 등 → 해당 부서 소속원에게만 표시
const POSTS = {
  main: [],
  newcomer: [],
  appliance: [],
  aircon: [],
  warehouse: [],
  regulation: [],
  'major-accident': [],
  violation: [],
  admin: []
};

// ===== 파일 첨부 상태 =====
let attachedImages = [];   // { file, dataURL } 배열 (최대 5개)
let attachedVideos = [];   // { file, blobURL, name, size } 배열 (최대 3개)
let tempBlobURLs = [];     // 모달 닫을 때 revoke할 Blob URL 목록

// ===== 현재 상태 =====
let currentTab = 'main';
let currentPostId = null;
const notifications = [
  { id: 1, text: '6월 정기 안전교육 일정이 등록되었습니다.', read: false },
  { id: 2, text: '소방훈련 참여 안내 (6/15 일요일)', read: false },
  { id: 3, text: '2분기 안전점검 결과가 공유되었습니다.', read: false },
];

// ===== 탭 전환 =====
function switchTab(tab) {
  currentTab = tab;
  currentPostId = null;

  // 탭 버튼 활성화
  document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.tab-item[data-tab="${tab}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  // 사이드 레이블 업데이트
  const labels = {
    main: '공지', newcomer: '신규 입사자', appliance: '가전 안전',
    aircon: '에어컨 안전', warehouse: '창고 안전', regulation: '안전 규정',
    'major-accident': '중대재해알림', violation: '안전미준수사례', admin: '관리자메뉴'
  };
  document.getElementById('side-label').textContent = labels[tab] || tab;

  // 관리자 탭: 사이드패널 숨기고 전체 패널 표시
  const sidePanel   = document.querySelector('.side-panel');
  const adminPanel  = document.getElementById('admin-panel');
  const emptyGuide  = document.getElementById('empty-guide');
  const postDetail  = document.getElementById('post-detail');

  if (tab === 'admin') {
    // 관리자 권한 없으면 차단
    if (!currentUser.isAdmin) {
      showToast('⛔ 관리자 전용 메뉴입니다.');
      switchTab('main');
      return;
    }
    sidePanel.style.display = 'none';
    adminPanel.classList.remove('hidden');
    emptyGuide.classList.add('hidden');
    postDetail.classList.add('hidden');
    loadMembers();
    return;
  }

  // 일반 탭: 사이드패널 복원
  sidePanel.style.display = '';
  adminPanel.classList.add('hidden');
  // 탭 전환 시 모바일 드로어 닫기
  closeSideDrawer();

  // 게시물 목록 렌더
  renderPostList();

  // 콘텐츠 뷰 초기화
  showEmptyGuide();
}

// ===================================================================
// 게시물 부서 필터링 핵심 함수
// ===================================================================
/**
 * 현재 로그인 사용자에게 보여야 할 게시물만 반환
 * - alladmin(scope=all) : 모든 게시물 표시
 * - 부서 관리자(scope=dept) : 자기 부서 + 전체(dept='all') 게시물
 * - 일반 직원(isAdmin=false) : 자기 부서(dept=사용자.dept) + 전체(dept='all') 게시물
 */
function getVisiblePosts(tab) {
  const posts = POSTS[tab] || [];
  if (currentUser.scope === 'all') return posts;
  const myDept = currentUser.dept || null;
  return posts.filter(p => {
    const pDept = p.dept || 'all';
    return pDept === 'all' || pDept === myDept;
  });
}

/**
 * Supabase에서 특정 탭 게시물을 불러와 POSTS[tab]에 병합
 * @param {string} tab
 */
async function loadPostsFromDB(tab) {
  try {
    const rows = await sbGetPostsByCategory(tab);
    if (!rows.length) return;
    // DB 게시물을 앱 객체로 변환
    const dbPosts = rows.map(sbRowToPost);
    // 기존 정적 POSTS와 병합 (DB 우선, 중복 ID 제거)
    const staticPosts = (POSTS[tab] || []).filter(p => !p._fromDB);
    const merged = [...dbPosts];
    staticPosts.forEach(sp => {
      if (!merged.find(mp => mp.id === sp.id)) merged.push(sp);
    });
    // sort_order 기준 오름차순 정렬 (동일 sort_order이면 배열 순서 유지)
    merged.sort((a, b) => {
      const oa = typeof a.sort_order === 'number' ? a.sort_order : 9999;
      const ob = typeof b.sort_order === 'number' ? b.sort_order : 9999;
      return oa - ob;
    });
    POSTS[tab] = merged;
  } catch (e) {
    console.warn(`[loadPostsFromDB] ${tab} 로드 실패:`, e.message);
  }
}

// ===== 게시물 목록 렌더 (Supabase 로드 후 렌더) =====
async function renderPostList() {
  const list = document.getElementById('post-list');
  // 로딩 표시
  list.innerHTML = `<div style="text-align:center;padding:30px 10px;color:#94a3b8;font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i></div>`;

  // Supabase에서 최신 게시물 로드
  await loadPostsFromDB(currentTab);

  const posts = getVisiblePosts(currentTab);

  if (!posts.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:30px 10px;color:#94a3b8;font-size:0.8rem;line-height:1.6;">
        <i class="far fa-folder-open" style="font-size:1.8rem;display:block;margin-bottom:8px;color:#e2e8f0;"></i>
        게시물이 없습니다
      </div>`;
    return;
  }

  // 번호별 색상 팔레트
  const numColors = [
    '#3d5afe','#e53935','#43a047','#fb8c00','#8e24aa',
    '#00897b','#d81b60','#1e88e5','#6d4c41','#00acc1'
  ];

  const isAdmin = currentUser && currentUser.isAdmin;

  list.innerHTML = posts.map((p, i) => {
    const num   = i + 1;
    const color = numColors[(i) % numColors.length];
    const isFirst = i === 0;
    const isLast  = i === posts.length - 1;

    // 관리자일 때만 ↑↓ 순서 변경 버튼 표시
    const orderBtns = isAdmin ? `
      <div class="post-order-btns" onclick="event.stopPropagation()">
        <button class="post-order-btn${isFirst ? ' disabled' : ''}"
          title="위로 이동"
          onclick="${isFirst ? '' : `movePost('${p.id}','up')`}"
          ${isFirst ? 'disabled' : ''}>
          <i class="fas fa-chevron-up"></i>
        </button>
        <button class="post-order-btn${isLast ? ' disabled' : ''}"
          title="아래로 이동"
          onclick="${isLast ? '' : `movePost('${p.id}','down')`}"
          ${isLast ? 'disabled' : ''}>
          <i class="fas fa-chevron-down"></i>
        </button>
      </div>` : '';

    return `
      <div class="post-list-item ${p.id === currentPostId ? 'active' : ''}" onclick="selectPost('${p.id}')">
        <span class="post-item-num" style="background:${color}">${num}</span>
        <span class="post-item-text">${p.title}</span>
        ${orderBtns}
        <i class="fas fa-chevron-right post-item-chevron"></i>
      </div>
    `;
  }).join('');
}

// ===== 게시물 순서 이동 (관리자 전용) =====
async function movePost(id, direction) {
  // 현재 탭의 전체 POSTS 배열 (getVisiblePosts는 필터링 복사본 → POSTS 직접 조작 필요)
  const allPosts = POSTS[currentTab] || [];
  const visible  = getVisiblePosts(currentTab);

  // 보이는 목록 기준 인덱스 탐색
  const visIdx   = visible.findIndex(p => p.id === id);
  if (visIdx === -1) return;
  const targetVisIdx = direction === 'up' ? visIdx - 1 : visIdx + 1;
  if (targetVisIdx < 0 || targetVisIdx >= visible.length) return;

  const postA = visible[visIdx];
  const postB = visible[targetVisIdx];

  // ── sort_order 값 교환 ──
  // 미설정 게시물은 보이는 목록 인덱스를 기준값으로 임시 부여
  const orderA = typeof postA.sort_order === 'number' ? postA.sort_order : (visIdx + 1) * 10;
  const orderB = typeof postB.sort_order === 'number' ? postB.sort_order : (targetVisIdx + 1) * 10;

  // 두 값이 같으면 강제로 간격 부여 후 교환
  let newOrderA, newOrderB;
  if (orderA === orderB) {
    newOrderA = direction === 'up' ? orderB - 1 : orderB + 1;
    newOrderB = orderB;
  } else {
    newOrderA = orderB;
    newOrderB = orderA;
  }

  // ── 로컬 메모리 즉시 업데이트 ──
  postA.sort_order = newOrderA;
  postB.sort_order = newOrderB;

  // POSTS[currentTab] 배열 내 두 항목 위치 교환
  const idxA = allPosts.findIndex(p => p.id === postA.id);
  const idxB = allPosts.findIndex(p => p.id === postB.id);
  if (idxA !== -1 && idxB !== -1) {
    [allPosts[idxA], allPosts[idxB]] = [allPosts[idxB], allPosts[idxA]];
  }

  // sort_order 재정렬 (항상 일관되게)
  POSTS[currentTab].sort((a, b) => {
    const oa = typeof a.sort_order === 'number' ? a.sort_order : 9999;
    const ob = typeof b.sort_order === 'number' ? b.sort_order : 9999;
    return oa - ob;
  });

  // ── 목록 즉시 재렌더 (반응성 — DB 응답 기다리지 않음) ──
  _renderPostListLocal();

  // ── Supabase DB 업데이트 (비동기, 실패 시 토스트) ──
  try {
    await Promise.all([
      sbUpdatePostOrder(postA.id, newOrderA),
      sbUpdatePostOrder(postB.id, newOrderB),
    ]);
  } catch (e) {
    console.error('[movePost] DB 업데이트 실패:', e);
    showToast('⚠️ 순서 저장 중 오류가 발생했습니다. 새로고침 후 재시도해주세요.');
  }
}

// ===== 로컬 POSTS 메모리 기반 빠른 목록 렌더 (DB 재조회 없이) =====
function _renderPostListLocal() {
  const list = document.getElementById('post-list');
  const posts = getVisiblePosts(currentTab);

  if (!posts.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:30px 10px;color:#94a3b8;font-size:0.8rem;line-height:1.6;">
        <i class="far fa-folder-open" style="font-size:1.8rem;display:block;margin-bottom:8px;color:#e2e8f0;"></i>
        게시물이 없습니다
      </div>`;
    return;
  }

  const numColors = [
    '#3d5afe','#e53935','#43a047','#fb8c00','#8e24aa',
    '#00897b','#d81b60','#1e88e5','#6d4c41','#00acc1'
  ];
  const isAdmin = currentUser && currentUser.isAdmin;

  list.innerHTML = posts.map((p, i) => {
    const num   = i + 1;
    const color = numColors[i % numColors.length];
    const isFirst = i === 0;
    const isLast  = i === posts.length - 1;

    const orderBtns = isAdmin ? `
      <div class="post-order-btns" onclick="event.stopPropagation()">
        <button class="post-order-btn${isFirst ? ' disabled' : ''}"
          title="위로 이동"
          onclick="${isFirst ? '' : `movePost('${p.id}','up')`}"
          ${isFirst ? 'disabled' : ''}>
          <i class="fas fa-chevron-up"></i>
        </button>
        <button class="post-order-btn${isLast ? ' disabled' : ''}"
          title="아래로 이동"
          onclick="${isLast ? '' : `movePost('${p.id}','down')`}"
          ${isLast ? 'disabled' : ''}>
          <i class="fas fa-chevron-down"></i>
        </button>
      </div>` : '';

    return `
      <div class="post-list-item ${p.id === currentPostId ? 'active' : ''}" onclick="selectPost('${p.id}')">
        <span class="post-item-num" style="background:${color}">${num}</span>
        <span class="post-item-text">${p.title}</span>
        ${orderBtns}
        <i class="fas fa-chevron-right post-item-chevron"></i>
      </div>
    `;
  }).join('');
}

// ===== 게시물 선택 =====
async function selectPost(id) {
  // 현재 사용자에게 보이는 게시물 중에서만 검색 (직접 URL 조작 방지)
  const allVisible = Object.keys(POSTS)
    .filter(tab => tab !== 'admin')
    .flatMap(tab => getVisiblePosts(tab));
  const post = allVisible.find(p => p.id === id);
  if (!post) return;

  currentPostId = id;

  // 목록 활성 표시
  document.querySelectorAll('.post-list-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.querySelector(`.post-list-item[onclick="selectPost('${id}')"]`);
  if (activeItem) activeItem.classList.add('active');

  // 모바일 드로어 닫기
  _closeSideDrawerOnMobile();

  // 조회수 증가 (Supabase DB 반영 + 로컬 메모리 반영)
  try {
    await sbIncrementViews(post.id, post.views || 0);
    post.views = (post.views || 0) + 1;
  } catch(e) {
    // 조회수 실패는 사용자 경험에 영향 없도록 무시
    post.views = (post.views || 0) + 1;
  }

  // 상세 렌더
  showPostDetail(post);
}

function showEmptyGuide() {
  document.getElementById('empty-guide').classList.remove('hidden');
  document.getElementById('post-detail').classList.add('hidden');
}

function showPostDetail(post) {
  document.getElementById('empty-guide').classList.add('hidden');
  const detail = document.getElementById('post-detail');
  detail.classList.remove('hidden');

  document.getElementById('detail-title').textContent = post.title;

  // 수정/삭제 버튼: 관리자이고 본인 소속부서(또는 전체관리자) 게시물만 가능
  const canEdit = currentUser.isAdmin && (
    currentUser.scope === 'all' ||
    (post.dept || 'all') === 'all' ||
    (post.dept) === currentUser.dept
  );

  // 게시물 부서 배지 (관리자에게만 표시)
  const deptBadge = currentUser.isAdmin
    ? `<span style="
        display:inline-flex;align-items:center;gap:4px;
        font-size:0.68rem;font-weight:600;
        background:${(post.dept||'all')==='all' ? '#e3f2fd' : '#fff3e0'};
        color:${(post.dept||'all')==='all' ? '#1565c0' : '#e65100'};
        border:1px solid ${(post.dept||'all')==='all' ? '#90caf9' : '#ffcc80'};
        padding:2px 8px;border-radius:10px;">
        <i class="fas fa-building" style="font-size:0.6rem;"></i>
        ${(post.dept||'all')==='all' ? '전체 공통' : post.dept}
      </span>`
    : '';

  document.getElementById('detail-meta').innerHTML = `
    <span><i class="fas fa-user"></i> ${post.author}</span>
    <span><i class="fas fa-calendar-alt"></i> ${post.date}</span>
    <span><i class="fas fa-eye"></i> ${post.views}회</span>
    ${deptBadge}
    ${canEdit ? `
    <div class="post-actions">
      <button class="btn-edit-post" onclick="editPost('${post.id}')"><i class="fas fa-edit"></i> 수정</button>
      <button class="btn-delete-post" onclick="deletePost('${post.id}')"><i class="fas fa-trash"></i> 삭제</button>
    </div>` : ''}
  `;

  let bodyHTML = '';

  // ── 첨부 동영상 (업로드된 파일) ──
  if (post._videos && post._videos.length > 0) {
    const vidItems = post._videos.map((v, i) => {
      const sizeStr = _formatSize(v.size);
      // storageURL(새 방식) 또는 blobURL(구형) 모두 지원
      const videoSrc = v.storageURL || v.blobURL || '';
      if (!videoSrc) return ''; // URL 없으면 건너뜀
      // 확장자로 MIME 타입 결정
      const ext = (v.name||'').split('.').pop().toLowerCase();
      const mimeMap = { mp4:'video/mp4', mov:'video/mp4', m4v:'video/mp4',
                        webm:'video/webm', ogg:'video/ogg',
                        avi:'video/x-msvideo', mkv:'video/x-matroska' };
      const mimeType = mimeMap[ext] || 'video/mp4';
      const vidId = `vid-${post.id}-${i}`;
      return `
        <div class="detail-video-item">
          <div class="detail-video-wrap">
            <video id="${vidId}"
              controls playsinline
              preload="auto"
              crossorigin="anonymous"
              data-src="${videoSrc}"
              data-mime="${mimeType}"
              data-post-id="${post.id}"
              data-vid-name="${(v.name||'').replace(/"/g,'&quot;')}"
              data-vid-type="upload">
              브라우저가 동영상을 지원하지 않습니다.
            </video>
          </div>
          <div class="detail-video-label">
            <i class="fas fa-film"></i>
            동영상 ${i + 1} &nbsp;·&nbsp; ${v.name} &nbsp;·&nbsp; ${sizeStr}
          </div>
        </div>
      `;
    }).join('');
    bodyHTML += `
      <div class="detail-video-section">
        <p class="detail-video-section-title">
          <i class="fas fa-film"></i> 첨부 동영상 ${post._videos.length}개
        </p>
        ${vidItems}
      </div>
    `;
  }

  // ── YouTube 영상 ──
  if (post.videoId) {
    // YouTube는 iframe이라 play 이벤트 직접 감지 불가 →
    // iframe이 실제로 로드(클릭)될 때를 대신하여 iframe 클릭 감지용 data 저장
    bodyHTML += `
      <div class="video-wrap"
        data-post-id="${post.id}"
        data-vid-name="YouTube: ${post.title.replace(/"/g,'&quot;')}"
        data-vid-type="youtube"
        onclick="_onYoutubeClick(this)">
        <iframe src="https://www.youtube.com/embed/${post.videoId}?enablejsapi=1"
          allowfullscreen title="${post.title}"></iframe>
      </div>
    `;
  }

  // ── 본문 ──
  bodyHTML += post.body;

  // ── 첨부 이미지 갤러리 ──
  if (post._images && post._images.length > 0) {
    const imgs = post._images.map((img, i) => {
      // storageURL(새 방식) 또는 dataURL(구형) 모두 지원
      const src = img.storageURL || img.dataURL || '';
      if (!src) return '';
      return `<img src="${src}" alt="첨부 이미지 ${i+1}"
        onclick="openLightbox('${src}')"
        title="클릭하여 크게 보기" />`;
    }).join('');
    bodyHTML += `
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #f1f5f9;">
        <p style="font-size:0.78rem;color:#94a3b8;margin-bottom:10px;">
          <i class="fas fa-images"></i> 첨부 사진 ${post._images.length}장
        </p>
        <div class="detail-img-gallery">${imgs}</div>
      </div>
    `;
  }

  document.getElementById('detail-body').innerHTML = bodyHTML;

  // ── 비디오 src 직접 주입 + 세로영상 회전 보정 + 검은화면 방지 ──
  setTimeout(() => {
    document.querySelectorAll('#detail-body video[data-src]').forEach(vid => {
      const src      = vid.dataset.src;
      const mimeType = vid.dataset.mime || 'video/mp4';
      if (!src) return;

      // ① src 직접 주입
      vid.src  = src;
      vid.type = mimeType;

      // ② loadedmetadata: 세로영상 회전 보정 + 검은화면 방지
      vid.addEventListener('loadedmetadata', function onMeta() {
        vid.removeEventListener('loadedmetadata', onMeta);
        const wrap = vid.closest('.detail-video-wrap');
        if (!wrap) return;

        const vw = vid.videoWidth;
        const vh = vid.videoHeight;
        console.log(`[video] 해상도: ${vw}x${vh}`);

        // 세로 영상 감지 (높이 > 너비 = 세로 촬영 or rotation 메타데이터로 뒤바뀐 경우)
        if (vw > 0 && vh > 0) {
          if (vh > vw) {
            // ── 세로 영상: wrap을 세로 비율로 변경 ──
            wrap.classList.add('portrait');
            wrap.style.aspectRatio = `${vw} / ${vh}`;
            wrap.style.maxWidth    = '360px';
            wrap.style.maxHeight   = '70vh';
            vid.style.objectFit    = 'contain';
            // 부모 item도 너비 맞춤
            const item = wrap.closest('.detail-video-item');
            if (item) item.style.maxWidth = '360px';
            console.log('[video] 세로 영상 감지 → 비율 보정:', vw, '×', vh);
          } else {
            // ── 가로 영상: 실제 비율로 aspect-ratio 세팅 ──
            wrap.style.aspectRatio = `${vw} / ${vh}`;
            vid.style.objectFit    = 'contain';
            console.log('[video] 가로 영상:', vw, '×', vh);
          }
        }

        // GPU 레이어 강제 재생성 (검은화면 방지)
        wrap.style.visibility = 'hidden';
        requestAnimationFrame(() => {
          wrap.style.visibility = '';
          vid.style.opacity = '0';
          requestAnimationFrame(() => { vid.style.opacity = '1'; });
        });
      });

      // ③ 에러 시 crossorigin 제거 후 <source> 폴백 재시도
      vid.addEventListener('error', function onErr() {
        vid.removeEventListener('error', onErr);
        console.warn('[video] src 직접 로드 실패, source 폴백 시도:', src);
        vid.removeAttribute('crossorigin');
        vid.removeAttribute('src');
        const s = document.createElement('source');
        s.src  = src;
        s.type = mimeType;
        vid.appendChild(s);
        vid.load();
      }, true);

      // ④ 명시적 load() 호출
      vid.load();
    });
  }, 0);

  // ── 업로드 동영상 play 이벤트 → 시청 기록 저장 + 뒤로가기 제어 ──
  // setTimeout으로 DOM이 완전히 렌더된 뒤에 이벤트 바인딩
  setTimeout(() => {
    document.querySelectorAll('#detail-body video[data-post-id]').forEach(vid => {
      // 재생 시작 시
      vid.addEventListener('play', function() {
        // 시청 기록 (최초 1회)
        if (!vid.dataset.logged) {
          vid.dataset.logged = '1';
          recordVideoWatch(post, vid.dataset.vidName, vid.dataset.vidType);
        }
        // 뒤로가기 시 로그인으로 가지 않도록 히스토리 상태 추가
        // videoPlaying 상태가 없을 때만 pushState (중복 방지)
        const curState = history.state || {};
        if (!curState.videoPlaying) {
          history.pushState({ videoPlaying: true, page: 'dashboard' }, '');
        }
      });
      // 일시정지/종료 시 히스토리 상태 해제
      vid.addEventListener('pause', function() {
        if (history.state && history.state.videoPlaying) {
          history.replaceState({ ...history.state, videoPlaying: false }, '');
        }
      });
      vid.addEventListener('ended', function() {
        if (history.state && history.state.videoPlaying) {
          history.replaceState({ ...history.state, videoPlaying: false }, '');
        }
      });
      // 에러 발생 시 콘솔 출력 (디버깅용)
      vid.addEventListener('error', function() {
        const err = vid.error;
        console.warn('[Video Error] code:', err ? err.code : 'unknown',
          'message:', err ? err.message : '', 'src:', vid.src);
      });
    });
  }, 0);
}

// YouTube iframe 클릭 → 시청 기록 저장 (iframe은 play 이벤트 감지 불가)
function _onYoutubeClick(wrapEl) {
  if (wrapEl.dataset.logged === '1') return;
  wrapEl.dataset.logged = '1';
  const postId  = wrapEl.dataset.postId;
  const vidName = wrapEl.dataset.vidName;
  // 현재 탭의 게시물에서 찾기
  const allVisible = Object.keys(POSTS)
    .filter(t => t !== 'admin')
    .flatMap(t => getVisiblePosts(t));
  const post = allVisible.find(p => p.id === postId);
  if (post) recordVideoWatch(post, vidName, 'youtube');
}

// ===== 게시물 작성 모달 =====
function openWriteModal(postToEdit = null) {
  // 관리자만 게시물 작성/수정 가능
  if (!currentUser.isAdmin) {
    showToast('⛔ 게시물 작성은 관리자만 가능합니다.');
    return;
  }

  // 이전 Blob 정리
  tempBlobURLs.forEach(url => URL.revokeObjectURL(url));
  tempBlobURLs = [];

  document.getElementById('write-title').value = postToEdit ? postToEdit.title : '';
  document.getElementById('write-category').value = postToEdit ? postToEdit.category : currentTab;
  document.getElementById('write-content').value = postToEdit ? (postToEdit._rawContent || '') : '';
  document.getElementById('write-video').value = postToEdit ? (postToEdit.videoId || '') : '';
  document.getElementById('write-modal').dataset.editId = postToEdit ? postToEdit.id : '';

  // 수정 시 기존 첨부 파일 복원
  if (postToEdit && postToEdit._images) {
    attachedImages = postToEdit._images.map(img => ({
      file:       null,
      storageURL: img.storageURL || null,
      dataURL:    img.storageURL || img.dataURL || null, // 미리보기용
    }));
  } else {
    attachedImages = [];
  }
  if (postToEdit && postToEdit._videos && postToEdit._videos.length > 0) {
    // storageURL(새 방식) 또는 blobURL(구형) 모두 복원
    attachedVideos = postToEdit._videos.map(v => ({
      file:       null,
      storageURL: v.storageURL || null,
      blobURL:    v.storageURL || v.blobURL || null, // 미리보기용 src
      name:       v.name,
      size:       v.size
    }));
  } else {
    attachedVideos = [];
  }

  // input 초기화
  document.getElementById('img-file-input').value = '';
  document.getElementById('vid-file-input').value = '';

  _renderImagePreviews();
  _renderVideoPreviews();

  // 공개 범위 배너 렌더
  _renderWriteScopeBanner();

  document.getElementById('write-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('write-title').focus(), 100);
}
// 게시물 작성 모달 공개 범위 배너
function _renderWriteScopeBanner() {
  const banner = document.getElementById('write-scope-banner');
  if (!banner) return;

  const isSuperA  = currentUser.scope === 'all';
  const deptLabel = isSuperA ? '전체 부서 공통' : (currentUser.dept || '전체');
  const bgColor   = isSuperA ? '#e3f2fd' : '#fff3e0';
  const textColor = isSuperA ? '#1565c0' : '#e65100';
  const borderColor = isSuperA ? '#90caf9' : '#ffcc80';
  const icon      = isSuperA ? 'fa-globe' : 'fa-building';

  banner.innerHTML = `
    <div style="
      display:flex;align-items:center;gap:10px;
      background:${bgColor};border:1px solid ${borderColor};
      border-radius:8px;padding:10px 14px;margin-bottom:4px;
      font-size:0.82rem;color:${textColor};font-weight:600;">
      <i class="fas ${icon}"></i>
      <span>
        공개 범위: <strong>${deptLabel}</strong>
        &nbsp;— ${isSuperA
          ? '이 게시물은 모든 부서 직원에게 표시됩니다.'
          : `이 게시물은 <strong>${deptLabel}</strong> 소속 직원에게만 표시됩니다.`}
      </span>
    </div>`;
}

function closeWriteModal() {
  document.getElementById('write-modal').classList.add('hidden');
  document.body.style.overflow = '';
  // ── Blob URL 메모리 해제 ──
  tempBlobURLs.forEach(url => URL.revokeObjectURL(url));
  tempBlobURLs = [];
  // ── 첨부 상태 초기화 ──
  attachedImages = [];
  attachedVideos = [];
  _renderImagePreviews();
  _renderVideoPreviews();
}

async function savePost() {
  const title    = document.getElementById('write-title').value.trim();
  const category = document.getElementById('write-category').value;
  const content  = document.getElementById('write-content').value.trim();
  const videoUrl = document.getElementById('write-video').value.trim();
  const editId   = document.getElementById('write-modal').dataset.editId;

  if (!title)   { showToast('제목을 입력해주세요.'); return; }
  if (!content) { showToast('내용을 입력해주세요.'); return; }

  // 저장 버튼 로딩
  const saveBtn = document.querySelector('.btn-save');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }

  // 유튜브 ID 추출
  let videoId = '';
  if (videoUrl) {
    const match = videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) videoId = match[1];
  }

  const contentHTML = content.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('');
  const dateLabel   = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
  const targetId    = editId || `post_${Date.now()}`;

  // ── 이미지: 새 파일만 Storage 업로드, 이미 URL인 것은 그대로 유지 ──
  const savedImages = [];
  for (const img of attachedImages) {
    if (img.file) {
      // 새로 첨부된 파일 → Storage 업로드
      try {
        showToast(`⏳ 이미지 업로드 중... (${img.file.name})`);
        const url = await sbUploadImage(img.file, targetId);
        savedImages.push({ storageURL: url });
      } catch (uploadErr) {
        console.error('[Image Upload]', uploadErr);
        showToast(`❌ 이미지 업로드 실패: ${img.file.name}`);
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> 저장'; }
        return;
      }
    } else if (img.storageURL) {
      // 이미 Storage URL → 그대로 유지
      savedImages.push({ storageURL: img.storageURL });
    } else if (img.dataURL) {
      // 구형 dataURL → 그대로 유지 (하위호환)
      savedImages.push({ dataURL: img.dataURL });
    }
  }

  // ── 동영상: 새 파일만 Storage 업로드, 이미 URL인 것은 그대로 유지 ──
  const savedVideos = [];
  for (const v of attachedVideos) {
    if (v.file) {
      // 새로 첨부된 파일 → Storage 업로드
      try {
        showToast(`⏳ 동영상 업로드 중... (${v.name})`);
        console.log('[savePost] 동영상 업로드 시작:', v.name, _formatSize(v.size), 'type:', v.file.type);
        const url = await sbUploadVideo(v.file, targetId);
        savedVideos.push({ storageURL: url, name: v.name, size: v.size });
        console.log('[savePost] 동영상 업로드 성공:', url);
      } catch (uploadErr) {
        console.error('[Video Upload 실패]', uploadErr);
        showToast(`❌ 동영상 업로드 실패: ${v.name} (${uploadErr.message})`);
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> 저장'; }
        return;
      }
    } else if (v.storageURL) {
      // 이미 Storage URL인 것 → 그대로 유지
      savedVideos.push({ storageURL: v.storageURL, name: v.name, size: v.size });
    } else if (v.blobURL) {
      // blobURL만 있을 경우 (파일 객체 없음) → 저장 불가, 첨부파일 재선택 요청
      console.warn('[savePost] blobURL은 저장 불가 (파일 객체 없음):', v.name);
      showToast(`⚠️ "${v.name}" — 파일을 다시 첨부해주세요.`);
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> 저장'; }
      return;
    }
  }

  try {
    if (editId) {
      // ── 수정 ──
      await sbUpdatePost(editId, {
        title,
        body:        contentHTML,
        raw_content: content,
        video_id:    videoId,
        images:      JSON.stringify(savedImages),
        videos:      JSON.stringify(savedVideos),
      });
      // 로컬 POSTS 메모리도 갱신
      for (const cat of Object.values(POSTS)) {
        const idx = cat.findIndex(p => p.id === editId);
        if (idx !== -1) {
          cat[idx] = { ...cat[idx], title, body: contentHTML, _rawContent: content, videoId, _images: savedImages, _videos: savedVideos };
          if (currentPostId === editId) showPostDetail(cat[idx]);
          break;
        }
      }
      showToast('✅ 게시물이 수정되었습니다.');

    } else {
      // ── 신규 작성 ──
      const postDept = currentUser.scope === 'all' ? 'all' : (currentUser.dept || 'all');
      const newId    = targetId; // 동영상 업로드 시 사용한 ID와 동일하게

      // 해당 카테고리의 현재 최대 sort_order 조회 → +1로 맨 뒤에 추가
      let newSortOrder = 1;
      try {
        const maxOrder = await sbGetMaxSortOrder(category);
        newSortOrder = (maxOrder || 0) + 1;
      } catch(e) {
        // sort_order 조회 실패 시 로컬 게시물 수 기반으로 폴백
        newSortOrder = (POSTS[category] || []).length + 1;
      }

      const newPost  = {
        id: newId, title, category,
        author: currentUser.name,
        dept:   postDept,
        date:   dateLabel,
        views:  0, videoId,
        body:   contentHTML,
        _rawContent: content,
        _images: savedImages,
        _videos: savedVideos,
        sort_order: newSortOrder,
        _fromDB: true,
      };

      // Supabase INSERT
      await sbInsertPost(sbPostToRow(newPost));

      // 로컬 POSTS 메모리에도 추가 (맨 뒤에 push, sort_order 기준으로 정렬됨)
      if (!POSTS[category]) POSTS[category] = [];
      POSTS[category].push(newPost);

      if (currentTab !== category) {
        currentTab = category;
        document.querySelectorAll('.tab-item').forEach(b => b.classList.toggle('active', b.dataset.tab === category));
      }
      const deptLabel = postDept === 'all' ? '전체 공통' : postDept;
      showToast(`✅ 게시물이 등록되었습니다! (공개 범위: ${deptLabel})`);
    }

    await renderPostList();
    closeWriteModal();

  } catch (e) {
    console.error('[savePost]', e);
    showToast('❌ 저장 중 오류가 발생했습니다.');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> 저장'; }
  }
}

// ===== 게시물 수정 (수정 모달 열기) =====
async function editPost(id) {
  // 로컬에서 먼저 찾고, 없으면 DB에서 조회
  let post = Object.values(POSTS).flat().find(p => p.id === id);
  if (!post) {
    try {
      const row = await sbGetPost(id);
      if (row) post = sbRowToPost(row);
    } catch(e) { console.warn('[editPost]', e.message); }
  }
  if (post) openWriteModal(post);
}

// ===== 게시물 삭제 (Supabase DELETE) =====
async function deletePost(id) {
  if (!confirm('이 게시물을 삭제하시겠습니까?')) return;
  try {
    await sbDeletePost(id);
    // 로컬 POSTS 메모리에서도 제거
    for (const cat in POSTS) {
      const idx = POSTS[cat].findIndex(p => p.id === id);
      if (idx !== -1) { POSTS[cat].splice(idx, 1); break; }
    }
    currentPostId = null;
    await renderPostList();
    showEmptyGuide();
    showToast('🗑️ 게시물이 삭제되었습니다.');
  } catch (e) {
    console.error('[deletePost]', e);
    showToast('❌ 삭제 중 오류가 발생했습니다.');
  }
}

// ===================================================================
// ===== 파일 첨부 기능 =============================================
// ===================================================================

// ── 유틸: 파일 크기 포매팅 ──
function _formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ──────────────────────────────────────────
// 사진 첨부
// ──────────────────────────────────────────

// input[file] change 이벤트
function _handleImgFileChange(files) {
  const MAX_SIZE = 10 * 1024 * 1024;  // 10MB (Storage 업로드 방식으로 변경)
  const MAX_COUNT = 5;

  Array.from(files).forEach(file => {
    if (attachedImages.length >= MAX_COUNT) {
      showToast(`사진은 최대 ${MAX_COUNT}장까지 첨부할 수 있습니다.`);
      return;
    }
    if (!file.type.match(/^image\/(jpeg|png|gif)$/)) {
      showToast(`"${file.name}" — JPG·PNG·GIF 형식만 가능합니다.`);
      return;
    }
    if (file.size > MAX_SIZE) {
      showToast(`"${file.name}" — 10MB를 초과한 파일은 첨부할 수 없습니다. (${_formatSize(file.size)})`);
      return;
    }
    // FileReader로 미리보기용 dataURL 생성 (실제 저장은 Storage)
    const reader = new FileReader();
    reader.onload = e => {
      attachedImages.push({ file, dataURL: e.target.result, storageURL: null });
      _renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });

  // input 초기화 (같은 파일 재선택 허용)
  document.getElementById('img-file-input').value = '';
}

// 이미지 미리보기 목록 렌더
function _renderImagePreviews() {
  const container = document.getElementById('img-preview-list');
  if (!container) return;

  if (attachedImages.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = attachedImages.map((img, i) => {
    const name = img.file ? img.file.name : `이미지 ${i+1}`;
    const sizeLabel = img.file ? _formatSize(img.file.size) : '';
    const previewSrc = img.dataURL || img.storageURL || '';
    return `
      <div class="attach-preview-item">
        <img src="${previewSrc}" alt="${name}" onclick="openLightbox('${previewSrc}')" title="클릭하여 크게 보기" />
        <button class="img-remove-btn" onclick="removeImage(${i})" title="삭제">
          <i class="fas fa-times"></i>
        </button>
        ${sizeLabel ? `<span class="img-size-label">${sizeLabel}</span>` : ''}
      </div>
    `;
  }).join('');
}

// 이미지 삭제
function removeImage(index) {
  attachedImages.splice(index, 1);
  _renderImagePreviews();
}

// ──────────────────────────────────────────
// 동영상 첨부
// ──────────────────────────────────────────

// ── HEVC(H.265) 코덱 감지 ──────────────────────────────────
// video 태그로 blobURL을 로드해 videoWidth/Height가 0×0이면 HEVC로 판단
// canPlayType은 브라우저마다 결과가 달라 신뢰도 낮음 → 직접 디코딩 시도 방식 사용
function _checkHevc(file) {
  return new Promise(resolve => {
    // 1) canPlayType으로 1차 빠른 체크
    const tv = document.createElement('video');
    const hevcTypes = ['video/mp4; codecs="hvc1"', 'video/mp4; codecs="hev1"', 'video/mp4; codecs="dvh1"'];
    const browserSupportsHevc = hevcTypes.some(t => tv.canPlayType(t) !== '');

    // 2) blobURL로 실제 디코딩 시도 (2초 타임아웃)
    const blobURL = URL.createObjectURL(file);
    const vid = document.createElement('video');
    vid.muted = true;
    vid.preload = 'metadata';

    const cleanup = () => { URL.revokeObjectURL(blobURL); vid.src = ''; };
    const timer = setTimeout(() => {
      // 2초 안에 메타 못 읽으면 문제 있는 파일로 판단
      cleanup();
      resolve({ isHevc: true, reason: 'timeout' });
    }, 2000);

    vid.addEventListener('loadedmetadata', () => {
      clearTimeout(timer);
      const w = vid.videoWidth, h = vid.videoHeight;
      cleanup();
      if (w === 0 && h === 0) {
        // 메타는 로드됐지만 해상도 0×0 = 브라우저 디코딩 실패 = HEVC
        resolve({ isHevc: true, reason: 'zero-size' });
      } else {
        resolve({ isHevc: false, w, h });
      }
    });

    vid.addEventListener('error', () => {
      clearTimeout(timer);
      cleanup();
      const code = vid.error?.code;
      // MEDIA_ERR_SRC_NOT_SUPPORTED(4) or MEDIA_ERR_DECODE(3) → HEVC 가능성
      resolve({ isHevc: code === 4 || code === 3, reason: `error-${code}` });
    });

    vid.src = blobURL;
  });
}

// HEVC 경고 모달 표시
function _showHevcWarning(fileName, onConfirm, onCancel) {
  // 기존 모달 제거
  const old = document.getElementById('hevc-warning-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'hevc-warning-modal';
  modal.style.cssText = `
    position:fixed; inset:0; z-index:99999;
    display:flex; align-items:center; justify-content:center;
    background:rgba(0,0,0,0.65); padding:20px;
  `;
  modal.innerHTML = `
    <div style="
      background:#1e293b; border-radius:16px; padding:28px 28px 22px;
      max-width:440px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,0.5);
      border:1px solid #334155;
    ">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <span style="font-size:2rem;">⚠️</span>
        <div>
          <div style="font-size:1rem;font-weight:700;color:#fbbf24;">PC에서 재생 안 될 수 있습니다</div>
          <div style="font-size:0.78rem;color:#94a3b8;margin-top:2px;">${fileName}</div>
        </div>
      </div>
      <div style="font-size:0.88rem;color:#cbd5e1;line-height:1.7;margin-bottom:20px;">
        이 영상은 <strong style="color:#f87171;">HEVC(H.265) 코덱</strong>으로 촬영되어<br>
        <strong style="color:#f87171;">PC 브라우저에서 재생되지 않습니다.</strong><br><br>
        📱 <strong style="color:#86efac;">핸드폰에서는 정상 재생</strong>되므로<br>
        모바일 전용 게시물이라면 그대로 업로드하셔도 됩니다.<br><br>
        💻 <strong>PC에서도 재생하려면:</strong><br>
        갤러리 앱 → 영상 선택 → <strong>공유 → 파일로 저장</strong> 후<br>
        다시 업로드해 주세요.
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="hevc-cancel-btn" style="
          padding:9px 20px; border-radius:8px; border:1px solid #475569;
          background:transparent; color:#94a3b8; font-size:0.88rem; cursor:pointer;
        ">취소</button>
        <button id="hevc-confirm-btn" style="
          padding:9px 20px; border-radius:8px; border:none;
          background:#f59e0b; color:#1a1a1a; font-size:0.88rem;
          font-weight:700; cursor:pointer;
        ">그래도 업로드</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('hevc-confirm-btn').onclick = () => { modal.remove(); onConfirm(); };
  document.getElementById('hevc-cancel-btn').onclick  = () => { modal.remove(); onCancel(); };
}

function _handleVidFileChange(files) {
  if (!files || files.length === 0) return;
  const MAX_SIZE  = 200 * 1024 * 1024;  // 200MB
  const MAX_COUNT = 3;
  const VID_EXTS  = ['mp4','mov','avi','wmv','mkv','webm','m4v','3gp','flv'];

  // 파일 배열을 순차 처리 (HEVC 체크가 async라 순서 보장)
  const fileList = Array.from(files);

  async function processNext(idx) {
    if (idx >= fileList.length) {
      _renderVideoPreviews();
      document.getElementById('vid-file-input').value = '';
      return;
    }

    const file = fileList[idx];

    // ── 기본 유효성 검사 ──
    if (attachedVideos.length >= MAX_COUNT) {
      showToast(`동영상은 최대 ${MAX_COUNT}개까지 첨부할 수 있습니다.`);
      return;
    }
    const ext     = file.name.split('.').pop().toLowerCase();
    const isVideo = file.type.startsWith('video/') || VID_EXTS.includes(ext);
    if (!isVideo) {
      showToast(`"${file.name}" — MP4·MOV·AVI 형식만 가능합니다.`);
      processNext(idx + 1);
      return;
    }
    if (file.size > MAX_SIZE) {
      showToast(`"${file.name}" — 200MB를 초과한 파일입니다. (${_formatSize(file.size)})`);
      processNext(idx + 1);
      return;
    }

    // ── HEVC 감지 (MP4·MOV 만 체크, 나머지는 패스) ──
    const needsCheck = ['mp4', 'mov', 'm4v'].includes(ext);
    if (needsCheck) {
      showToast('🔍 영상 코덱 확인 중...', 1500);
      const result = await _checkHevc(file);
      console.log(`[HEVC 체크] ${file.name}:`, result);

      if (result.isHevc) {
        // HEVC 감지 → 경고 모달
        _showHevcWarning(file.name,
          () => {
            // "그래도 업로드" 선택
            _attachVideo(file);
            processNext(idx + 1);
          },
          () => {
            // "취소" 선택
            processNext(idx + 1);
          }
        );
        return; // 모달 응답 기다림 (processNext는 콜백 안에서 호출)
      }
    }

    _attachVideo(file);
    processNext(idx + 1);
  }

  processNext(0);
}

// 실제 첨부 처리 (중복 제거용 분리)
function _attachVideo(file) {
  const ext     = file.name.split('.').pop().toLowerCase();
  const blobURL = URL.createObjectURL(file);
  tempBlobURLs.push(blobURL);
  attachedVideos.push({ file, blobURL, name: file.name, size: file.size });
  console.log('[동영상 첨부]', file.name, _formatSize(file.size), file.type || `(확장자: .${ext})`);
  _renderVideoPreviews();
}

// 동영상 미리보기 목록 렌더
function _renderVideoPreviews() {
  const container = document.getElementById('vid-preview-list');
  if (!container) return;

  if (attachedVideos.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = attachedVideos.map((v, i) => {
    // blobURL(새로 첨부된 파일) 또는 storageURL(수정 모달 복원) 모두 지원
    const videoSrc = v.blobURL || v.storageURL || '';
    const sizeLabel = v.size ? _formatSize(v.size) : '';
    // storageURL만 있는 경우 (수정 모달) → <video> 대신 아이콘으로 표시
    const isStorageOnly = !v.blobURL && v.storageURL;
    return `
    <div class="vid-preview-wrap">
      ${isStorageOnly
        ? `<div class="vid-preview-placeholder">
             <i class="fas fa-film"></i>
             <span>저장된 동영상</span>
           </div>`
        : `<video class="vid-preview" controls playsinline src="${videoSrc}"></video>`
      }
      <div class="vid-preview-info">
        <span class="vid-index-badge">동영상 ${i + 1}</span>
        <span class="attach-filename">${v.name || '동영상'}</span>
        ${sizeLabel ? `<span class="attach-filesize">${sizeLabel}</span>` : ''}
        <button class="attach-remove-btn" onclick="removeVideo(${i})" title="삭제">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `;
  }).join('');
}

// 동영상 삭제
function removeVideo(index) {
  const v = attachedVideos[index];
  if (v && v.blobURL) {
    URL.revokeObjectURL(v.blobURL);
    tempBlobURLs = tempBlobURLs.filter(u => u !== v.blobURL);
  }
  attachedVideos.splice(index, 1);
  _renderVideoPreviews();
}

// ──────────────────────────────────────────
// 드래그 앤 드롭
// ──────────────────────────────────────────

function _setupDropZone(zoneId, type) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', e => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('drag-over');
  });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    if (type === 'image') {
      _handleImgFileChange(files);
    } else {
      _handleVidFileChange(files);
    }
  });
}

// ──────────────────────────────────────────
// 이미지 라이트박스
// ──────────────────────────────────────────

function openLightbox(src) {
  let lb = document.getElementById('lightbox-overlay');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox-overlay';
    lb.className = 'lightbox-overlay';
    lb.innerHTML = `
      <button class="lightbox-close" onclick="closeLightbox()" title="닫기">
        <i class="fas fa-times"></i>
      </button>
      <img id="lightbox-img" src="" alt="확대 이미지" />
    `;
    lb.addEventListener('click', e => {
      if (e.target === lb) closeLightbox();
    });
    document.body.appendChild(lb);
  }
  document.getElementById('lightbox-img').src = src;
  lb.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // 뒤로가기 시 라이트박스만 닫히도록 히스토리에 상태 추가
  history.pushState({ lightbox: true }, '');
}

function closeLightbox() {
  const lb = document.getElementById('lightbox-overlay');
  if (!lb || lb.classList.contains('hidden')) return;
  lb.classList.add('hidden');
  document.body.style.overflow = '';
  // 히스토리 뒤로가기 없이 현재 상태만 대시보드로 replace
  history.replaceState({ page: 'dashboard' }, '');
}

// 뒤로가기(popstate) 이벤트 처리
// 우선순위: 라이트박스 → 마이페이지 → 동영상 일시정지 → 게시물 상세 → 앱 유지
window.addEventListener('popstate', (e) => {

  // ── 1순위: 로그아웃 확인 모달 닫기 ──
  const logoutModal = document.getElementById('logout-confirm-modal');
  if (logoutModal && !logoutModal.classList.contains('hidden')) {
    closeLogoutConfirm();
    history.pushState({ page: 'dashboard' }, '');
    return;
  }

  // ── 2순위: 라이트박스 닫기 ──
  const lb = document.getElementById('lightbox-overlay');
  if (lb && !lb.classList.contains('hidden')) {
    lb.classList.add('hidden');
    document.body.style.overflow = '';
    history.pushState({ page: 'dashboard' }, '');
    return;
  }

  // ── 3순위: 마이페이지 드로어 닫기 ──
  const drawer = document.getElementById('mypage-drawer');
  if (drawer && drawer.classList.contains('open')) {
    closeMyPage();
    history.pushState({ page: 'dashboard' }, '');
    return;
  }

  // ── 4순위: 재생 중인 동영상 일시정지 ──
  const playingVideos = document.querySelectorAll('#detail-body video');
  let hasPlaying = false;
  playingVideos.forEach(vid => {
    if (!vid.paused) {
      vid.pause();
      hasPlaying = true;
    }
  });
  if (hasPlaying) {
    history.pushState({ page: 'dashboard' }, '');
    return;
  }

  // ── 5순위: 게시물 상세 → 목록으로 ──
  const postDetail = document.getElementById('post-detail');
  if (postDetail && !postDetail.classList.contains('hidden')) {
    showEmptyGuide();
    currentPostId = null;
    document.querySelectorAll('.post-list-item').forEach(el => el.classList.remove('active'));
    history.pushState({ page: 'dashboard' }, '');
    return;
  }

  // ── 6순위: 그 외 — 대시보드 유지 (로그인 화면으로 나가지 않음) ──
  history.pushState({ page: 'dashboard' }, '');
});

// ===== 시청 내역 드롭다운 =====

/** 알림(시청내역) 드롭다운 열기/닫기 토글 */
function toggleNotifications() {
  const dd = document.getElementById('notif-dropdown');
  const isHidden = dd.classList.contains('hidden');
  dd.classList.toggle('hidden');
  if (isHidden) {
    // 열릴 때 시청 내역 로드
    loadWatchHistoryDropdown();
  }
}

/** 드롭다운 닫기 */
function closeWatchDropdown() {
  document.getElementById('notif-dropdown').classList.add('hidden');
}

/** Supabase에서 시청 내역 로드 후 렌더 */
async function loadWatchHistoryDropdown() {
  const container = document.getElementById('watch-hist-list');
  if (!container) return;

  // 로딩 표시
  container.innerHTML = `<div class="watch-hist-loading"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</div>`;

  try {
    // 본인 시청 내역 조회 (최신 50개)
    const list = await sbGetWatchHistory(currentUser.id);

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="watch-hist-empty">
          <i class="fas fa-play-circle"></i>
          <p>아직 시청한 동영상이 없습니다</p>
        </div>`;

      // 배지 0으로
      updateNotifBadge(0);
      return;
    }

    // 날짜별 그룹핑
    const grouped = {};
    list.forEach(h => {
      const d = new Date(h.watched_at);
      const dateKey = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(h);
    });

    let html = '';
    Object.keys(grouped).forEach(dateKey => {
      html += `<div class="watch-hist-date-group">
        <div class="watch-hist-date-label"><i class="fas fa-calendar-day"></i> ${dateKey}</div>`;

      grouped[dateKey].forEach(h => {
        const d    = new Date(h.watched_at);
        const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        const tabLabels = {
          main:'공지', newcomer:'신규입사자', appliance:'가전안전',
          aircon:'에어컨안전', warehouse:'창고안전', regulation:'안전규정',
          'major-accident':'중대재해알림', violation:'안전미준수사례'
        };
        const tabLabel = tabLabels[h.post_tab] || h.post_tab || '';
        const vidName  = (h.vid_name || '').replace(/KakaoTalk_\d+_\d+/g, '카카오톡영상') || '동영상';
        const isYt     = h.vid_type === 'youtube';

        html += `
          <div class="watch-hist-item">
            <div class="watch-hist-icon ${isYt ? 'yt' : ''}">
              <i class="fas ${isYt ? 'fa-youtube' : 'fa-film'}"></i>
            </div>
            <div class="watch-hist-info">
              <div class="watch-hist-title">${h.post_title || '(제목 없음)'}</div>
              <div class="watch-hist-meta">
                ${tabLabel ? `<span class="watch-hist-tag">${tabLabel}</span>` : ''}
                <span class="watch-hist-vidname" title="${h.vid_name || ''}">${vidName}</span>
              </div>
            </div>
            <div class="watch-hist-time">${time}</div>
          </div>`;
      });

      html += `</div>`;
    });

    container.innerHTML = html;

    // 배지: 오늘 시청 개수 표시
    const todayStr = new Date().toLocaleDateString('ko-KR', {year:'numeric',month:'2-digit',day:'2-digit'})
      .replace(/\. /g,'.').replace('.','').replace(/\.$/, '');
    const todayKey = (() => {
      const n = new Date();
      return `${n.getFullYear()}.${String(n.getMonth()+1).padStart(2,'0')}.${String(n.getDate()).padStart(2,'0')}`;
    })();
    const todayCnt = (grouped[todayKey] || []).length;
    updateNotifBadge(todayCnt);

  } catch(e) {
    console.error('[시청내역] 로드 실패:', e);
    container.innerHTML = `<div class="watch-hist-empty"><i class="fas fa-exclamation-circle"></i><p>불러오기 실패</p></div>`;
  }
}

/** 배지 숫자 업데이트 */
function updateNotifBadge(cnt) {
  const badge = document.getElementById('notif-count');
  if (!badge) return;
  if (cnt === undefined) {
    // 인자 없이 호출 시 기존 notifications 배열 기준 (구형 호환)
    cnt = notifications.filter(n => !n.read).length;
  }
  badge.textContent = cnt;
  badge.style.display = cnt > 0 ? 'flex' : 'none';
}

// 구형 호환용 (기존 코드에서 호출할 수 있으므로 유지)
function clearNotifications() { closeWatchDropdown(); }
function renderNotifications() { loadWatchHistoryDropdown(); }

// ===== 토스트 =====
function showToast(msg, duration) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(window._tw);
  // 에러(❌)/경고(⚠️) 메시지는 4.5초, 일반 메시지는 2.5초
  const ms = duration || (msg.startsWith('❌') || msg.startsWith('⚠️') ? 4500 : 2500);
  window._tw = setTimeout(() => t.classList.add('hidden'), ms);
}

// ===================================================================
// ===== 접속 팝업 시스템 ==========================================
// ===================================================================

const POPUP_STORAGE_KEY = 'sw_popup_settings';
const POPUP_SKIP_KEY    = 'sw_popup_skip_until';

// 팝업 설정 기본값
const DEFAULT_POPUP = {
  enabled:   false,
  type:      'notice',
  title:     '',
  body:      '',
  btnText:   '확인',
  skipOption:'yes',
  dateStart: '',
  dateEnd:   '',
  imageData: '',
};

// 팝업 설정 불러오기 (Supabase + localStorage 폴백)
async function loadPopupSettings() {
  try {
    const row = await sbGetPopupSettings();
    if (row) {
      return {
        ...DEFAULT_POPUP,
        enabled:    row.enabled    ?? false,
        type:       row.type       || 'notice',
        title:      row.title      || '',
        body:       row.content    || '',
        btnText:    row.btn_text   || '확인',
        skipOption: row.skip_option || 'yes',
        dateStart:  row.date_start  || '',
        dateEnd:    row.date_end    || '',
        imageData:  row.image_url   || '',
      };
    }
  } catch (e) {
    console.warn('[loadPopupSettings] Supabase 오류, localStorage 폴백:', e.message);
  }
  const raw = localStorage.getItem(POPUP_STORAGE_KEY);
  return raw ? { ...DEFAULT_POPUP, ...JSON.parse(raw) } : { ...DEFAULT_POPUP };
}

// 팝업 설정 저장 (Supabase)
async function savePopupSettings() {
  const title     = document.getElementById('popup-title-input').value.trim();
  const body      = document.getElementById('popup-body-input').value.trim();
  const btnText   = document.getElementById('popup-btn-text').value.trim() || '확인';
  const skipOpt   = document.getElementById('popup-skip-option').value;
  const dateStart = document.getElementById('popup-date-start').value;
  const dateEnd   = document.getElementById('popup-date-end').value;
  const typeRadio = document.querySelector('input[name="popup-type"]:checked');
  const type      = typeRadio ? typeRadio.value : 'notice';
  const enabled   = document.getElementById('popup-enabled-chk').checked;
  const imgPreview = document.getElementById('popup-img-preview');
  // .src는 절대 URL로 변환되므로 getAttribute('src')로 원본값 확인
  const rawSrc = imgPreview ? (imgPreview.getAttribute('src') || '') : '';
  const imageData = (rawSrc && rawSrc.startsWith('data:')) ? rawSrc : '';

  if (!title) { showToast('⚠️ 팝업 제목을 입력해주세요.'); return; }
  if (!body)  { showToast('⚠️ 팝업 내용을 입력해주세요.');  return; }

  const settings = { enabled, type, title, body, btnText, skipOption: skipOpt, dateStart, dateEnd, imageData };

  try {
    await sbSavePopupSettings({
      enabled,
      type,
      title,
      content:     body,
      btn_text:    btnText,
      skip_option: skipOpt,
      date_start:  dateStart,
      date_end:    dateEnd,
      image_url:   imageData,
    });
  } catch (e) {
    console.warn('[savePopupSettings] Supabase 오류, localStorage 폴백:', e.message);
  }
  // localStorage에도 병행 저장 (오프라인 폴백)
  localStorage.setItem(POPUP_STORAGE_KEY, JSON.stringify(settings));
  showToast('✅ 팝업 설정이 저장되었습니다.');
  _refreshPopupStatusCard();
}

// 팝업 관리 탭 열 때 폼 값 채우기
async function loadPopupEditor() {
  const s = await loadPopupSettings();

  document.getElementById('popup-enabled-chk').checked = s.enabled;
  document.getElementById('popup-title-input').value   = s.title;
  document.getElementById('popup-body-input').value    = s.body;
  document.getElementById('popup-btn-text').value      = s.btnText;
  document.getElementById('popup-skip-option').value   = s.skipOption;
  document.getElementById('popup-date-start').value    = s.dateStart;
  document.getElementById('popup-date-end').value      = s.dateEnd;

  // 대상 부서 복원
  const deptSel = document.getElementById('popup-target-dept');
  if (deptSel) deptSel.value = s.targetDept || 'all';

  // 유형 라디오
  const radio = document.querySelector(`input[name="popup-type"][value="${s.type}"]`);
  if (radio) radio.checked = true;

  // 이미지
  const imgWrap    = document.getElementById('popup-img-preview-wrap');
  const imgPreview = document.getElementById('popup-img-preview');
  if (s.imageData) {
    imgPreview.src = s.imageData;
    imgWrap.classList.remove('hidden');
  } else {
    imgPreview.src = '';
    imgWrap.classList.add('hidden');
  }

  _refreshPopupStatusCard();
}

// 상태 카드 갱신 (async)
async function _refreshPopupStatusCard() {
  const s    = await loadPopupSettings();
  const card = document.getElementById('popup-status-card');
  const desc = document.getElementById('popup-status-desc');
  const chk  = document.getElementById('popup-enabled-chk');
  if (!card) return;

  if (s.enabled) {
    card.classList.add('active-on');
    desc.textContent = `"${s.title || '(제목 없음)'}" 팝업이 활성화되어 있습니다.`;
  } else {
    card.classList.remove('active-on');
    desc.textContent = '팝업이 비활성화되어 있습니다. 토글을 켜면 접속 시 팝업이 표시됩니다.';
  }
  if (chk) chk.checked = s.enabled;
}

// 토글 변경
async function onPopupToggle(checked) {
  try {
    // 1) 현재 저장된 설정 불러오기 (await 필수 — async 함수)
    const s = await loadPopupSettings();
    s.enabled = checked;

    // 2) Supabase DB에 enabled 값 즉시 반영
    await sbSavePopupSettings({
      enabled:     s.enabled,
      type:        s.type       || 'notice',
      title:       s.title      || '',
      content:     s.body       || '',
      btn_text:    s.btnText    || '확인',
      skip_option: s.skipOption || 'yes',
      date_start:  s.dateStart  || '',
      date_end:    s.dateEnd    || '',
      image_url:   s.imageData  || '',
    });

    // 3) localStorage에도 동기화
    localStorage.setItem(POPUP_STORAGE_KEY, JSON.stringify(s));

    _refreshPopupStatusCard();
    showToast(checked ? '🔔 팝업이 활성화되었습니다.' : '🔕 팝업이 비활성화되었습니다.');
  } catch(e) {
    console.error('[onPopupToggle] 저장 실패:', e);
    showToast('❌ 토글 저장 중 오류가 발생했습니다.');
  }
}

// 팝업 유형 변경 시 미리보기 동기화 (선택)
function onPopupTypeChange() { /* 실시간 미리보기 훅 예약 */ }

// 팝업 이미지 첨부
function _setupPopupImgInput() {
  const input = document.getElementById('popup-img-input');
  if (!input) return;
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const MAX = 2 * 1024 * 1024;
    if (file.size > MAX) { showToast('⚠️ 이미지는 2MB 이하만 가능합니다.'); input.value=''; return; }
    const reader = new FileReader();
    reader.onload = e => {
      const wrap = document.getElementById('popup-img-preview-wrap');
      const img  = document.getElementById('popup-img-preview');
      img.src = e.target.result;
      wrap.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
    input.value = '';
  });

  // 드롭존 DnD
  const zone = document.getElementById('popup-img-zone');
  if (zone) {
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', e => { e.preventDefault(); zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) { input.files; _handlePopupImgFile(file); }
    });
  }
}
function _handlePopupImgFile(file) {
  const MAX = 2 * 1024 * 1024;
  if (!file.type.startsWith('image/')) { showToast('이미지 파일만 첨부 가능합니다.'); return; }
  if (file.size > MAX) { showToast('⚠️ 이미지는 2MB 이하만 가능합니다.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('popup-img-preview').src = e.target.result;
    document.getElementById('popup-img-preview-wrap').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

// 이미지 제거
function removePopupImage() {
  document.getElementById('popup-img-preview').src = '';
  document.getElementById('popup-img-preview-wrap').classList.add('hidden');
}

// 폼 초기화
function resetPopupForm() {
  if (!confirm('팝업 편집 내용을 초기화하시겠습니까?')) return;
  document.getElementById('popup-title-input').value = '';
  document.getElementById('popup-body-input').value  = '';
  document.getElementById('popup-btn-text').value    = '';
  document.getElementById('popup-date-start').value  = '';
  document.getElementById('popup-date-end').value    = '';
  document.querySelector('input[name="popup-type"][value="notice"]').checked = true;
  document.getElementById('popup-skip-option').value = 'yes';
  removePopupImage();
  showToast('초기화되었습니다.');
}

// 미리보기
function openPopupPreview() {
  const title    = document.getElementById('popup-title-input').value.trim() || '(제목 없음)';
  const body     = document.getElementById('popup-body-input').value.trim()  || '(내용 없음)';
  const btnText  = document.getElementById('popup-btn-text').value.trim()    || '확인';
  const skipOpt  = document.getElementById('popup-skip-option').value;
  const typeRadio= document.querySelector('input[name="popup-type"]:checked');
  const type     = typeRadio ? typeRadio.value : 'notice';
  const imgSrc   = document.getElementById('popup-img-preview').src;
  const hasImg   = !!imgSrc && !imgSrc.endsWith('#') && imgSrc !== window.location.href;

  _showSitePopup({ title, body, btnText, skipOption: skipOpt, type, imageData: hasImg ? imgSrc : '' }, true);
}

// ─── 접속 팝업 표시 (실제 접속 시) ───
async function checkAndShowPopup() {
  try {
    const s = await loadPopupSettings();
    console.log('[Popup] 설정 로드:', JSON.stringify({
      enabled: s.enabled, title: s.title, body: s.body,
      dateStart: s.dateStart, dateEnd: s.dateEnd
    }));

    if (!s.enabled) {
      console.log('[Popup] 비활성화 상태 → 표시 안 함');
      return;
    }

    // 기간 체크
    const today = new Date().toISOString().slice(0,10);
    if (s.dateStart && today < s.dateStart) {
      console.log('[Popup] 시작일 이전 → 표시 안 함:', s.dateStart);
      return;
    }
    if (s.dateEnd && today > s.dateEnd) {
      console.log('[Popup] 종료일 이후 → 표시 안 함:', s.dateEnd);
      return;
    }

    // 오늘 하루 안보기 체크
    const skipUntil = localStorage.getItem(POPUP_SKIP_KEY);
    if (skipUntil && today <= skipUntil) {
      console.log('[Popup] 오늘 하루 안보기 설정됨 (until:', skipUntil + ') → 표시 안 함');
      return;
    }

    if (!s.title && !s.body) {
      console.log('[Popup] 제목/내용 없음 → 표시 안 함');
      return;
    }

    // ── 부서 필터링 ──
    // targetDept === 'all' 이면 전체 표시
    // 특정 부서명이면 현재 로그인 사용자의 dept와 일치할 때만 표시
    const targetDept = s.targetDept || 'all';
    if (targetDept !== 'all') {
      const userDept = currentUser.dept || '';
      if (userDept !== targetDept) {
        console.log(`[Popup] 대상 부서(${targetDept}) ≠ 사용자 부서(${userDept}) → 표시 안 함`);
        return;
      }
    }

    console.log('[Popup] ✅ 팝업 표시! (대상 부서:', targetDept, ')');
    _showSitePopup(s, false);
  } catch(e) {
    console.error('[Popup] checkAndShowPopup 오류:', e);
  }
}

function _showSitePopup(s, isPreview) {
  const typeLabels = { notice:'공지', warning:'경고', event:'이벤트', safety:'안전' };

  // 팝업 박스 유형 클래스
  const box = document.getElementById('site-popup-box');
  box.className = `site-popup-box ${s.type || 'notice'}`;

  // 배지
  const badge = document.getElementById('site-popup-badge');
  badge.textContent = typeLabels[s.type] || '공지';
  badge.className   = `site-popup-type-badge ${s.type || 'notice'}`;

  // 제목 & 본문
  document.getElementById('site-popup-title').textContent   = s.title;
  document.getElementById('site-popup-content').textContent = s.body;

  // 이미지
  const imgWrap = document.getElementById('site-popup-img-wrap');
  const imgEl   = document.getElementById('site-popup-img');
  if (s.imageData) {
    imgEl.src = s.imageData;
    imgWrap.classList.remove('hidden');
  } else {
    imgWrap.classList.add('hidden');
  }

  // 버튼 텍스트
  document.getElementById('site-popup-confirm-btn').textContent = s.btnText || '확인';

  // 오늘 하루 안보기 옵션
  const skipLabel = document.getElementById('popup-skip-label');
  const skipChk   = document.getElementById('popup-skip-today-chk');
  skipChk.checked = false;
  if (s.skipOption === 'no' || isPreview) {
    skipLabel.style.display = 'none';
  } else {
    skipLabel.style.display = '';
  }

  // 미리보기 태그
  box.dataset.isPreview = isPreview ? '1' : '0';

  document.getElementById('site-popup-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeSitePopup(force) {
  const skipChk   = document.getElementById('popup-skip-today-chk');
  const isPreview = document.getElementById('site-popup-box').dataset.isPreview === '1';

  if (!isPreview && skipChk && skipChk.checked) {
    const today = new Date().toISOString().slice(0,10);
    localStorage.setItem(POPUP_SKIP_KEY, today);
  }

  document.getElementById('site-popup-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

// ===================================================================
// ===== 동영상 시청 기록 시스템 ===================================
// ===================================================================

const WATCH_HISTORY_KEY = 'sw_watch_history'; // localStorage 키 (폴백용)

/**
 * 동영상 시청 기록 저장 (Supabase INSERT)
 */
async function recordVideoWatch(post, vidName, vidType) {
  const user = getCurrentUser();
  if (!user || user.isAdmin) return; // 관리자 시청은 저장하지 않음

  try {
    await sbInsertWatchHistory({
      user_id:    user.id,
      user_name:  user.name,
      user_dept:  user.dept || '-',
      post_id:    post.id,
      post_title: post.title,
      post_tab:   post.category,
      vid_name:   vidName,
      vid_type:   vidType,
      watched_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[recordVideoWatch] Supabase 오류, localStorage 폴백:', e.message);
    // localStorage 폴백
    const history = JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]');
    const ONE_HOUR = 3600000;
    const now = Date.now();
    const isDup = history.some(h =>
      h.userId === user.id && h.postId === post.id &&
      h.vidName === vidName && (now - h.watchedAt) < ONE_HOUR
    );
    if (!isDup) {
      history.push({
        userId: user.id, userName: user.name, userDept: user.dept || '-',
        postId: post.id, postTitle: post.title, postTab: post.category,
        vidName, vidType, watchedAt: now,
      });
      localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
    }
  }
}

/**
 * 특정 사용자의 시청 내역 반환 (Supabase, 최신순)
 */
async function getWatchHistory(userId) {
  try {
    const rows = await sbGetWatchHistory(userId);
    // Supabase 컨밤 네이밍 및 로칼 키 통일 (화면 렌더에서 userId 등 사용하므로)
    return rows.map(h => ({
      ...h,
      userId:    h.user_id    || h.userId,
      userName:  h.user_name  || h.userName,
      userDept:  h.user_dept  || h.userDept,
      postId:    h.post_id    || h.postId,
      postTitle: h.post_title || h.postTitle,
      postTab:   h.post_tab   || h.postTab,
      vidName:   h.vid_name   || h.vidName,
      vidType:   h.vid_type   || h.vidType,
      watchedAt: h.watched_at ? new Date(h.watched_at).getTime() : (h.watchedAt || 0),
    }));
  } catch (e) {
    console.warn('[getWatchHistory] Supabase 오류, localStorage 폴백:', e.message);
    const history = JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]');
    return history.filter(h => h.userId === userId).sort((a,b) => b.watchedAt - a.watchedAt);
  }
}

/**
 * 전체 사용자 시청 건수 요약 반환 (Supabase)
 */
async function getWatchCountByUser() {
  try {
    const all = await sbGetAllWatchHistory();
    return all.reduce((acc, h) => {
      const uid = h.user_id || h.userId;
      acc[uid] = (acc[uid] || 0) + 1;
      return acc;
    }, {});
  } catch (e) {
    const history = JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]');
    return history.reduce((acc, h) => {
      acc[h.userId] = (acc[h.userId] || 0) + 1;
      return acc;
    }, {});
  }
}

// ===================================================================
// ===== 시청내역 조회 모달 =====================================
// ===================================================================

/**
 * 특정 회원의 동영상 시청내역 모달 열기
 * @param {string} userId
 */
async function openViewHistoryModal(userId) {
  // 모달 먼저 열고 로딩 표시
  document.getElementById('view-history-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.getElementById('vh-tbody').innerHTML =
    `<tr><td colspan="5" class="vh-empty"><i class="fas fa-spinner fa-spin"></i> <span>불러오는 중...</span></td></tr>`;

  let user = null;
  let history = [];
  try {
    user    = await sbGetMember(userId);
    history = await getWatchHistory(userId);
  } catch (e) {
    const regList = JSON.parse(localStorage.getItem('sw_reg_list') || '[]');
    user    = regList.find(u => u.id === userId);
    history = await getWatchHistory(userId);
  }

  // 헤더 정보
  const nameText  = user ? `${user.name || userId} (${userId})` : userId;
  const deptText  = user ? (user.dept || '-') : '-';
  const avatarCh  = user ? (user.name || userId).charAt(0).toUpperCase() : userId.charAt(0).toUpperCase();
  document.getElementById('vh-user-name').textContent  = nameText;
  document.getElementById('vh-user-dept').textContent  = deptText;
  document.getElementById('vh-total-count').textContent = `총 ${history.length}건`;
  const avatarEl = document.getElementById('vh-avatar-char');
  if (avatarEl) avatarEl.textContent = avatarCh;

  // 탭명 한글 변환
  const TAB_LABEL = {
    main: '공지사항', safety: '안전교육', work: '업무교육',
    env: '환경교육', fire: '소방교육', first: '응급처치',
    traffic: '교통안전', chemical: '화학물질', admin: '관리자'
  };

  // 목록 렌더
  const tbody = document.getElementById('vh-tbody');
  if (history.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="vh-empty">
          <i class="fas fa-play-circle"></i>
          <span>시청한 동영상이 없습니다.</span>
        </td>
      </tr>`;
  } else {
    tbody.innerHTML = history.map((h, idx) => {
      const dt = new Date(h.watchedAt);
      const dateStr = dt.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const timeStr = dt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const typeIcon = h.vidType === 'youtube'
        ? '<span class="vh-type-badge youtube"><i class="fab fa-youtube"></i> YouTube</span>'
        : '<span class="vh-type-badge upload"><i class="fas fa-film"></i> 업로드</span>';
      const tabLabel = TAB_LABEL[h.postTab] || h.postTab || '-';
      return `
        <tr>
          <td class="vh-num">${idx + 1}</td>
          <td class="vh-tab"><span class="vh-tab-badge">${tabLabel}</span></td>
          <td class="vh-title">${h.postTitle || '-'}</td>
          <td class="vh-vidname">${typeIcon}<span>${h.vidName || '-'}</span></td>
          <td class="vh-date">${dateStr}<br><span class="vh-time">${timeStr}</span></td>
        </tr>`;
    }).join('');
  }

}

/**
 * 시청내역 모달 닫기
 */
function closeViewHistoryModal() {
  document.getElementById('view-history-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ===================================================================
// ===== 관리자 메뉴 ===========================================
// ===================================================================

let _currentMemberSubTab = 'pending'; // 현재 서브탭
let _confirmCallback = null;          // 확인 모달 콜백
let _editingMemberId = null;          // 수정 중인 회원 ID

// 회원 목록 불러오기 (Supabase)
async function loadMembers() {
  _renderAdminScopeBanner();
  await renderMemberList();
  await updatePendingBadge();
}

// 관리자 패널 상단 범위 배너 렌더
function _renderAdminScopeBanner() {
  const bannerId = 'admin-scope-banner';
  let banner = document.getElementById(bannerId);

  const adminContent = document.getElementById('admin-panel');
  if (!adminContent) return;

  // 기존 배너 제거
  if (banner) banner.remove();

  const scopeLabel = getScopeLabel();
  const isSuperA   = isSuperAdmin();

  const html = `
    <div id="${bannerId}" style="
      display:flex;align-items:center;gap:12px;
      background:${isSuperA ? 'linear-gradient(135deg,#1a237e,#283593)' : 'linear-gradient(135deg,#e65100,#f57c00)'};
      color:#fff;padding:12px 20px;border-radius:10px;margin-bottom:16px;
      font-size:0.85rem;box-shadow:0 2px 10px rgba(0,0,0,0.15);">
      <i class="fas fa-${isSuperA ? 'crown' : 'building'}" style="font-size:1.2rem;opacity:0.9;"></i>
      <div>
        <div style="font-weight:700;font-size:0.92rem;">
          ${currentUser.name}
          <span style="font-size:0.72rem;font-weight:500;opacity:0.85;margin-left:6px;">
            (${currentUser.roleLabel || '관리자'})
          </span>
        </div>
        <div style="font-size:0.75rem;opacity:0.8;margin-top:2px;">
          관리 범위: ${isSuperA ? '전체 부서 (모든 회원 관리 가능)' : scopeLabel + ' 소속 회원만 관리'}
        </div>
      </div>
    </div>`;

  // atab-members 상단에 삽입
  const membersTab = document.getElementById('atab-members');
  if (membersTab) {
    membersTab.insertAdjacentHTML('afterbegin', html);
  }
}

// 대기 배지 업데이트 (Supabase)
async function updatePendingBadge() {
  try {
    const all  = await sbGetAllMembers();
    const list = filterMembersByScope(all);
    const cnt  = list.filter(u => u.status === 'pending').length;
    const badge = document.getElementById('pending-badge');
    if (badge) badge.textContent = cnt;
  } catch (e) {
    console.warn('[updatePendingBadge]', e.message);
  }
}

// 관리자 탭 전환 (회원관리 / 팝업관리 / 통계)
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.atab === tab)
  );
  document.getElementById('atab-members').classList.toggle('hidden', tab !== 'members');
  document.getElementById('atab-popup').classList.toggle('hidden',   tab !== 'popup');
  document.getElementById('atab-stats').classList.toggle('hidden',   tab !== 'stats');
  if (tab === 'stats') renderAdminStats();
  if (tab === 'popup') loadPopupEditor();
}

// 서브탭 전환 (pending/all/approved/rejected)
function switchMemberSubTab(sub) {
  _currentMemberSubTab = sub;
  ['pending','all','approved','rejected'].forEach(s => {
    const el = document.getElementById(`mstab-${s}`);
    if (el) el.classList.toggle('active', s === sub);
  });
  renderMemberList();
}

// 회원 목록 렌더 (Supabase)
async function renderMemberList() {
  const wrap = document.getElementById('member-list-wrap');
  if (!wrap) return;

  // 로딩 표시
  wrap.innerHTML = `<div class="member-empty"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</div>`;

  const searchQ = (document.getElementById('member-search-input')?.value || '').trim().toLowerCase();

  let list;
  try {
    list = await sbGetAllMembers();
  } catch (e) {
    console.warn('[renderMemberList] Supabase 오류, localStorage 폴백:', e.message);
    list = JSON.parse(localStorage.getItem('sw_reg_list') || '[]');
  }

  // ── 소속부서 권한 필터 (auth.js) ──
  list = filterMembersByScope(list);

  // 서브탭 필터
  if (_currentMemberSubTab !== 'all') {
    list = list.filter(u => u.status === _currentMemberSubTab);
  }

  // 검색 필터
  if (searchQ) {
    list = list.filter(u =>
      (u.id   || '').toLowerCase().includes(searchQ) ||
      (u.name || '').toLowerCase().includes(searchQ) ||
      (u.dept || '').toLowerCase().includes(searchQ) ||
      (u.role || '').toLowerCase().includes(searchQ)
    );
  }

  if (list.length === 0) {
    wrap.innerHTML = `
      <div class="member-empty">
        <i class="fas fa-users-slash"></i>
        ${_currentMemberSubTab === 'pending'
          ? '승인 대기 중인 회원이 없습니다.'
          : '해당 조건의 회원이 없습니다.'}
      </div>`;
    return;
  }

  // 최신 가입순 정렬 (joined_at or joinedAt 모두 대응)
  list.sort((a, b) => new Date(b.joined_at || b.joinedAt || 0) - new Date(a.joined_at || a.joinedAt || 0));

  const statusText  = { pending: '승인 대기', approved: '승인 완료', rejected: '거부됨' };
  const statusClass = { pending: 'pending',   approved: 'approved',  rejected: 'rejected' };

  wrap.innerHTML = list.map(u => {
    const rawDate = u.joined_at || u.joinedAt;
    const joinDate = rawDate
      ? new Date(rawDate).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' })
      : '-';
    const avatarChar = (u.name || u.id || '?').charAt(0);
    const st = u.status || 'pending';

    // 액션 버튼 생성
    let actionBtns = '';
    if (st === 'pending') {
      actionBtns += `
        <button class="mem-btn mem-btn-approve" onclick="confirmAction('approve','${u.id}')">
          <i class="fas fa-check"></i> 승인
        </button>
        <button class="mem-btn mem-btn-reject" onclick="confirmAction('reject','${u.id}')">
          <i class="fas fa-times"></i> 거부
        </button>`;
    } else if (st === 'approved') {
      actionBtns += `
        <button class="mem-btn mem-btn-reject" onclick="confirmAction('reject','${u.id}')">
          <i class="fas fa-ban"></i> 승인 취소
        </button>`;
    } else if (st === 'rejected') {
      actionBtns += `
        <button class="mem-btn mem-btn-approve" onclick="confirmAction('approve','${u.id}')">
          <i class="fas fa-redo"></i> 재승인
        </button>`;
    }
    actionBtns += `
      <button class="mem-btn mem-btn-history" onclick="openViewHistoryModal('${u.id}')">
        <i class="fas fa-play-circle"></i> 시청내역
      </button>
      <button class="mem-btn mem-btn-edit" onclick="openMemberEditModal('${u.id}')">
        <i class="fas fa-edit"></i> 수정
      </button>
      <button class="mem-btn mem-btn-delete" onclick="confirmAction('delete','${u.id}')">
        <i class="fas fa-trash"></i>
      </button>`;

    const memoHtml = u.memo ? `
      <div class="member-memo-wrap">
        <i class="fas fa-sticky-note"></i>
        <span>${u.memo}</span>
      </div>` : '';

    return `
      <div class="member-card" id="mcard-${u.id}">
        <div class="member-card-top">
          <div class="member-avatar">${avatarChar}</div>
          <div class="member-id-name">
            <span class="member-id">${u.id}</span>
            <span class="member-name-dept">${u.name || '-'} · ${u.dept || '-'}</span>
          </div>
          <span class="status-badge ${statusClass[st]}">${statusText[st]}</span>
        </div>
        <div class="member-card-info">
          <div class="member-info-item">
            <span class="member-info-label">이름</span>
            <span class="member-info-value">${u.name || '-'}</span>
          </div>
          <div class="member-info-item">
            <span class="member-info-label">전화번호</span>
            <span class="member-info-value">${u.tel || '-'}</span>
          </div>
          <div class="member-info-item">
            <span class="member-info-label">소속부서</span>
            <span class="member-info-value">${u.dept || '-'}</span>
          </div>
          <div class="member-info-item">
            <span class="member-info-label">업무구분</span>
            <span class="member-info-value">${u.role || '-'}</span>
          </div>
          <div class="member-info-item">
            <span class="member-info-label">차량번호</span>
            <span class="member-info-value">${u.car || '-'}</span>
          </div>
          <div class="member-info-item">
            <span class="member-info-label">가입일</span>
            <span class="member-info-value">${joinDate}</span>
          </div>
        </div>
        ${memoHtml}
        <div class="member-card-actions">${actionBtns}</div>
      </div>`;
  }).join('');
}

// 승인/거부/삭제 확인 모달
function confirmAction(type, userId) {
  const configs = {
    approve: {
      icon: '✅',
      title: '회원을 승인하시겠습니까?',
      desc: '승인 후 해당 회원은 서비스를 이용할 수 있습니다.',
      btnText: '승인',
      btnClass: 'approve',
    },
    reject: {
      icon: '🚫',
      title: '승인을 거부하시겠습니까?',
      desc: '거부된 회원은 서비스를 이용할 수 없습니다.\n언제든 재승인할 수 있습니다.',
      btnText: '거부',
      btnClass: 'reject',
    },
    delete: {
      icon: '🗑️',
      title: '회원을 삭제하시겠습니까?',
      desc: '삭제된 회원 데이터는 복구할 수 없습니다.',
      btnText: '삭제',
      btnClass: 'delete',
    },
  };
  const cfg = configs[type];
  document.getElementById('confirm-icon').textContent  = cfg.icon;
  document.getElementById('confirm-title').textContent = cfg.title;
  document.getElementById('confirm-desc').textContent  = cfg.desc;
  const okBtn = document.getElementById('confirm-ok-btn');
  okBtn.textContent = cfg.btnText;
  okBtn.className = `confirm-ok-btn ${cfg.btnClass}`;

  _confirmCallback = () => {
    if (type === 'approve') approveMember(userId);
    else if (type === 'reject')  rejectMember(userId);
    else if (type === 'delete')  deleteMember(userId);
  };

  document.getElementById('confirm-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function execConfirm() {
  if (_confirmCallback) _confirmCallback();
  closeConfirmModal();
}
function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
  document.body.style.overflow = '';
  _confirmCallback = null;
}

// 승인 (Supabase)
async function approveMember(userId) {
  try {
    await sbUpdateMember(userId, { status: 'approved' });
    showToast(`✅ ${userId} 회원을 승인했습니다.`);
    await renderMemberList();
    await updatePendingBadge();
  } catch (e) {
    showToast('❌ 승인 처리 중 오류가 발생했습니다.');
    console.error('[approveMember]', e);
  }
}

// 거부 (Supabase)
async function rejectMember(userId) {
  try {
    await sbUpdateMember(userId, { status: 'rejected' });
    showToast(`🚫 ${userId} 회원 승인을 거부했습니다.`);
    await renderMemberList();
    await updatePendingBadge();
  } catch (e) {
    showToast('❌ 거부 처리 중 오류가 발생했습니다.');
    console.error('[rejectMember]', e);
  }
}

// 삭제 (Supabase)
async function deleteMember(userId) {
  try {
    await sbDeleteMember(userId);
    showToast(`🗑️ ${userId} 회원을 삭제했습니다.`);
    await renderMemberList();
    await updatePendingBadge();
  } catch (e) {
    showToast('❌ 삭제 처리 중 오류가 발생했습니다.');
    console.error('[deleteMember]', e);
  }
}

// Supabase 특정 필드 업데이트 헬퍼 (호환용)
async function _updateMemberField(userId, fields) {
  await sbUpdateMember(userId, fields);
}

// ─── 회원 수정 모달 (Supabase) ───
async function openMemberEditModal(userId) {
  let u;
  try {
    u = await sbGetMember(userId);
  } catch (e) {
    // localStorage 폴백
    const list = JSON.parse(localStorage.getItem('sw_reg_list') || '[]');
    u = list.find(m => m.id === userId);
  }
  if (!u) { showToast('회원 정보를 불러올 수 없습니다.'); return; }

  _editingMemberId = userId;
  document.getElementById('medit-id').value     = u.id     || '';
  document.getElementById('medit-name').value   = u.name   || '';
  document.getElementById('medit-tel').value    = u.tel    || '';
  document.getElementById('medit-dept').value   = u.dept   || '';
  document.getElementById('medit-role').value   = u.role   || '';
  document.getElementById('medit-car').value    = u.car    || '';
  document.getElementById('medit-status').value = u.status || 'pending';
  document.getElementById('medit-memo').value   = u.memo   || '';
  // joined_at 또는 joinedAt 모두 대응

  // 메시지 초기화
  ['name','tel','dept','role'].forEach(f =>
    document.getElementById(`medit-msg-${f}`).textContent = ''
  );

  document.getElementById('member-edit-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeMemberEditModal() {
  document.getElementById('member-edit-modal').classList.add('hidden');
  document.body.style.overflow = '';
  _editingMemberId = null;
}

async function saveMemberEdit() {
  const name   = document.getElementById('medit-name').value.trim();
  const tel    = document.getElementById('medit-tel').value.trim();
  const dept   = document.getElementById('medit-dept').value;
  const role   = document.getElementById('medit-role').value;
  const car    = document.getElementById('medit-car').value.trim();
  const status = document.getElementById('medit-status').value;
  const memo   = document.getElementById('medit-memo').value.trim();
  let valid = true;

  const setMeditMsg = (field, msg, type) => {
    const el = document.getElementById(`medit-msg-${field}`);
    if (el) { el.textContent = msg; el.className = `medit-msg ${type}`; }
    const input = document.getElementById(`medit-${field}`);
    if (input) { input.classList.remove('error','success'); if(type) input.classList.add(type === 'err' ? 'error' : 'success'); }
  };

  if (!name) { setMeditMsg('name','이름을 입력해주세요.','err'); valid = false; }
  else setMeditMsg('name','','ok');

  const telReg = /^01[0-9]-\d{3,4}-\d{4}$/;
  if (!tel) { setMeditMsg('tel','전화번호를 입력해주세요.','err'); valid = false; }
  else if (!telReg.test(tel)) { setMeditMsg('tel','올바른 형식으로 입력해주세요.','err'); valid = false; }
  else setMeditMsg('tel','','ok');

  if (!dept) { setMeditMsg('dept','소속 부서를 선택해주세요.','err'); valid = false; }
  else setMeditMsg('dept','','ok');

  if (!role) { setMeditMsg('role','업무구분을 선택해주세요.','err'); valid = false; }
  else setMeditMsg('role','','ok');

  if (!valid) return;

  try {
    await sbUpdateMember(_editingMemberId, { name, tel, dept, role, car, status, memo });
    showToast('✅ 회원 정보가 수정되었습니다.');
    closeMemberEditModal();
    await renderMemberList();
    await updatePendingBadge();
  } catch (e) {
    showToast('❌ 수정 중 오류가 발생했습니다.');
    console.error('[saveMemberEdit]', e);
  }
}

// ===================================================================
// ===== 통계 탭 렌더 & 엑셀 다운로드 ===========================
// ===================================================================

// 탭명 한글 매핑 (통계에서도 사용)
const TAB_LABEL_MAP = {
  main: '공지사항', safety: '안전교육', work: '업무교육',
  env: '환경교육', fire: '소방교육', first: '응급처치',
  traffic: '교통안전', chemical: '화학물질', admin: '관리자'
};

// 상태 한글 매핑
const STATUS_LABEL_MAP = { pending: '승인 대기', approved: '승인 완료', rejected: '거부됨' };

/**
 * 통계 탭 진입 시 전체 렌더 (Supabase)
 */
async function renderAdminStats() {
  const scopeLabel = getScopeLabel();
  const scopeEl    = document.getElementById('stats-scope-label');
  if (scopeEl) scopeEl.textContent = scopeLabel ? `${scopeLabel} 통계` : '전체 통계';

  const grid = document.getElementById('admin-stats-grid');
  if (grid) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</div>`;

  try {
    const allList    = await sbGetAllMembers();
    const list       = filterMembersByScope(allList);
    const total      = list.length;
    const approved   = list.filter(u => u.status === 'approved').length;
    const pending    = list.filter(u => u.status === 'pending').length;
    const rejected   = list.filter(u => u.status === 'rejected').length;
    const memberIds  = new Set(list.map(u => u.id));
    const allHistory = await sbGetAllWatchHistory();
    const watchTotal = allHistory.filter(h => memberIds.has(h.user_id || h.userId)).length;

    if (grid) {
      grid.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fas fa-users"></i></div>
          <div><div class="stat-label">전체 가입자</div><div class="stat-value">${total}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fas fa-user-check"></i></div>
          <div><div class="stat-label">승인 완료</div><div class="stat-value">${approved}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange"><i class="fas fa-clock"></i></div>
          <div><div class="stat-label">승인 대기</div><div class="stat-value">${pending}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red"><i class="fas fa-user-times"></i></div>
          <div><div class="stat-label">거부됨</div><div class="stat-value">${rejected}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple"><i class="fas fa-play-circle"></i></div>
          <div><div class="stat-label">총 시청 건수</div><div class="stat-value">${watchTotal}</div></div>
        </div>
      `;
    }
  } catch (e) {
    console.warn('[renderAdminStats]', e.message);
    if (grid) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:#ef4444;">데이터 불러오기 실패. 새로고침을 눌러주세요.</div>`;
  }

  await renderStatsMemberTable();
  await renderStatsWatchTable();
}

/**
 * 통계 탭 – 회원 현황 테이블 렌더 (Supabase)
 */
async function renderStatsMemberTable() {
  const filterVal = document.getElementById('stats-member-filter')?.value || 'all';
  const tbody = document.getElementById('stats-member-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9" class="stats-empty"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</td></tr>`;

  try {
    const allList = await sbGetAllMembers();
    let list      = filterMembersByScope(allList);
    if (filterVal !== 'all') list = list.filter(u => u.status === filterVal);
    list.sort((a, b) => new Date(b.joined_at || b.joinedAt || 0) - new Date(a.joined_at || a.joinedAt || 0));

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="stats-empty">해당 조건의 회원이 없습니다.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map((u, i) => {
      const rawDate  = u.joined_at || u.joinedAt;
      const joinDate = rawDate ? new Date(rawDate).toLocaleDateString('ko-KR') : '-';
      const stLabel  = STATUS_LABEL_MAP[u.status || 'pending'] || u.status;
      const stClass  = { pending:'st-pending', approved:'st-approved', rejected:'st-rejected' }[u.status] || '';
      return `
        <tr>
          <td class="st-num">${i + 1}</td>
          <td>${u.id || '-'}</td>
          <td>${u.name || '-'}</td>
          <td>${u.dept || '-'}</td>
          <td>${u.role || '-'}</td>
          <td>${u.tel || '-'}</td>
          <td>${u.car || '-'}</td>
          <td><span class="st-badge ${stClass}">${stLabel}</span></td>
          <td>${joinDate}</td>
        </tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="9" class="stats-empty">데이터 불러오기 실패</td></tr>`;
    console.warn('[renderStatsMemberTable]', e.message);
  }
}

/**
 * 통계 탭 – 시청 내역 테이블 렌더 (Supabase)
 */
async function renderStatsWatchTable() {
  const filterVal = document.getElementById('stats-watch-filter')?.value || 'all';
  const tbody = document.getElementById('stats-watch-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9" class="stats-empty"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</td></tr>`;

  try {
    const allList   = await sbGetAllMembers();
    const memberIds = new Set(filterMembersByScope(allList).map(u => u.id));
    let watchList   = await sbGetAllWatchHistory();
    watchList = watchList.filter(h => memberIds.has(h.user_id || h.userId));
    if (filterVal !== 'all') watchList = watchList.filter(h => (h.vid_type || h.vidType) === filterVal);

    if (watchList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="stats-empty">시청 내역이 없습니다.</td></tr>`;
      return;
    }
    tbody.innerHTML = watchList.map((h, i) => {
      const rawTime  = h.watched_at || (h.watchedAt ? new Date(h.watchedAt).toISOString() : null);
      const dt       = rawTime ? new Date(rawTime) : new Date(0);
      const dateStr  = dt.toLocaleDateString('ko-KR');
      const timeStr  = dt.toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' });
      const tabVal   = h.post_tab || h.postTab || '';
      const tabLabel = TAB_LABEL_MAP[tabVal] || tabVal || '-';
      const vidType  = h.vid_type || h.vidType || '';
      const typeIcon = vidType === 'youtube'
        ? `<span class="st-type-yt"><i class="fab fa-youtube"></i> YouTube</span>`
        : `<span class="st-type-up"><i class="fas fa-film"></i> 업로드</span>`;
      return `
        <tr>
          <td class="st-num">${i + 1}</td>
          <td>${h.user_id    || h.userId    || '-'}</td>
          <td>${h.user_name  || h.userName  || '-'}</td>
          <td>${h.user_dept  || h.userDept  || '-'}</td>
          <td><span class="st-tab-badge">${tabLabel}</span></td>
          <td class="st-title">${h.post_title || h.postTitle || '-'}</td>
          <td class="st-vidname">${h.vid_name || h.vidName || '-'}</td>
          <td>${typeIcon}</td>
          <td class="st-date">${dateStr}<br><span class="st-time">${timeStr}</span></td>
        </tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="9" class="stats-empty">데이터 불러오기 실패</td></tr>`;
    console.warn('[renderStatsWatchTable]', e.message);
  }
}

// ===================================================================
// ===== 엑셀 다운로드 (SheetJS CDN 없이 CSV→xls 방식) ==============
// ===================================================================

/**
 * 2차원 배열 → UTF-8 BOM CSV 문자열 생성
 */
function _toCSV(rows) {
  return '\uFEFF' + rows.map(row =>
    row.map(cell => {
      const s = (cell === null || cell === undefined) ? '' : String(cell);
      // 쉼표·줄바꿈·큰따옴표 포함 시 큰따옴표로 감싸기
      return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')
  ).join('\r\n');
}

/**
 * CSV 문자열을 .csv 파일로 다운로드
 */
function _downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 회원 목록 엑셀(CSV) 다운로드 (Supabase)
 */
async function downloadMembersExcel() {
  showToast('⏳ 데이터 준비 중...');
  try {
    const filterVal   = document.getElementById('stats-member-filter')?.value || 'all';
    const allList     = await sbGetAllMembers();
    let   list        = filterMembersByScope(allList);
    if (filterVal !== 'all') list = list.filter(u => u.status === filterVal);
    list.sort((a, b) => new Date(b.joined_at || b.joinedAt || 0) - new Date(a.joined_at || a.joinedAt || 0));
    const watchCounts = await getWatchCountByUser();

    const header = ['번호','아이디','이름','소속부서','업무구분','전화번호','차량번호','상태','가입일','시청건수'];
    const rows   = list.map((u, i) => {
      const rawDate = u.joined_at || u.joinedAt;
      return [
        i + 1,
        u.id   || '',
        u.name || '',
        u.dept || '',
        u.role || '',
        u.tel  || '',
        u.car  || '',
        STATUS_LABEL_MAP[u.status] || u.status || '',
        rawDate ? new Date(rawDate).toLocaleDateString('ko-KR') : '',
        watchCounts[u.id] || 0
      ];
    });

    const scopeLabel  = getScopeLabel() || '전체';
    const filterLabel = filterVal === 'all' ? '전체' : (STATUS_LABEL_MAP[filterVal] || filterVal);
    const dateStamp   = new Date().toISOString().slice(0,10).replace(/-/g,'');
    _downloadCSV(_toCSV([header, ...rows]), `회원목록_${scopeLabel}_${filterLabel}_${dateStamp}.csv`);
    showToast(`✅ 회원 목록 (${rows.length}건) 다운로드 완료`);
  } catch (e) {
    showToast('❌ 다운로드 중 오류가 발생했습니다.');
    console.error('[downloadMembersExcel]', e);
  }
}

/**
 * 시청 내역 엑셀(CSV) 다운로드 (Supabase)
 */
async function downloadWatchExcel() {
  showToast('⏳ 데이터 준비 중...');
  try {
    const filterVal = document.getElementById('stats-watch-filter')?.value || 'all';
    const allList   = await sbGetAllMembers();
    const memberIds = new Set(filterMembersByScope(allList).map(u => u.id));
    let   watchList = await sbGetAllWatchHistory();
    watchList = watchList.filter(h => memberIds.has(h.user_id || h.userId));
    if (filterVal !== 'all') watchList = watchList.filter(h => (h.vid_type || h.vidType) === filterVal);

    const header = ['번호','아이디','이름','소속부서','교육구분','게시물제목','동영상명','유형','시청일','시청시간'];
    const rows   = watchList.map((h, i) => {
      const rawTime = h.watched_at || (h.watchedAt ? new Date(h.watchedAt).toISOString() : null);
      const dt      = rawTime ? new Date(rawTime) : new Date(0);
      const tabVal  = h.post_tab || h.postTab || '';
      const vidType = h.vid_type || h.vidType || '';
      return [
        i + 1,
        h.user_id    || h.userId    || '',
        h.user_name  || h.userName  || '',
        h.user_dept  || h.userDept  || '',
        TAB_LABEL_MAP[tabVal] || tabVal || '',
        h.post_title || h.postTitle || '',
        h.vid_name   || h.vidName   || '',
        vidType === 'youtube' ? 'YouTube' : '업로드',
        dt.toLocaleDateString('ko-KR'),
        dt.toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' })
      ];
    });

    const scopeLabel = getScopeLabel() || '전체';
    const typeLabel  = filterVal === 'all' ? '전체' : (filterVal === 'youtube' ? 'YouTube' : '업로드');
    const dateStamp  = new Date().toISOString().slice(0,10).replace(/-/g,'');
    _downloadCSV(_toCSV([header, ...rows]), `시청내역_${scopeLabel}_${typeLabel}_${dateStamp}.csv`);
    showToast(`✅ 시청 내역 (${rows.length}건) 다운로드 완료`);
  } catch (e) {
    showToast('❌ 다운로드 중 오류가 발생했습니다.');
    console.error('[downloadWatchExcel]', e);
  }
}

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
  applyUser();
  switchTab('main');
  updateNotifBadge(0); // 초기값 0, 로드 후 갱신

  // 오늘 시청 개수로 배지 초기 세팅 (일반 사용자만)
  if (!currentUser.isAdmin) {
    sbGetWatchHistory(currentUser.id).then(list => {
      if (!list || !list.length) return;
      const todayKey = (() => {
        const n = new Date();
        return `${n.getFullYear()}.${String(n.getMonth()+1).padStart(2,'0')}.${String(n.getDate()).padStart(2,'0')}`;
      })();
      const todayCnt = list.filter(h => {
        const d = new Date(h.watched_at);
        const dk = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
        return dk === todayKey;
      }).length;
      updateNotifBadge(todayCnt);
    }).catch(() => {});
  }

  // ── 앱 진입 시 기본 히스토리 상태 설정 ──
  // 뒤로가기로 로그인 페이지로 나가지 않도록 현재 상태를 replace
  history.replaceState({ page: 'dashboard' }, '');

  // 탭 클릭
  document.querySelectorAll('.tab-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 알림 버튼
  document.getElementById('notif-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNotifications();
  });

  // 외부 클릭 시 알림 닫기
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('notif-dropdown');
    if (!dd.classList.contains('hidden') && !dd.contains(e.target)) {
      dd.classList.add('hidden');
    }
  });

  // 모달 외부 클릭 닫기
  document.getElementById('write-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeWriteModal();
  });

  // ESC 닫기
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const sp = document.getElementById('site-popup-overlay');
      if (sp && !sp.classList.contains('hidden')) { closeSitePopup(false); return; }
      const lc = document.getElementById('logout-confirm-modal');
      if (lc && !lc.classList.contains('hidden')) { closeLogoutConfirm(); return; }
      const lb = document.getElementById('lightbox-overlay');
      if (lb && !lb.classList.contains('hidden')) { closeLightbox(); return; }
      const dr = document.getElementById('mypage-drawer');
      if (dr && dr.classList.contains('open')) { closeMyPage(); return; }
      const cm = document.getElementById('confirm-modal');
      if (cm && !cm.classList.contains('hidden')) { closeConfirmModal(); return; }
      const mm = document.getElementById('member-edit-modal');
      if (mm && !mm.classList.contains('hidden')) { closeMemberEditModal(); return; }
      const vh = document.getElementById('view-history-modal');
      if (vh && !vh.classList.contains('hidden')) { closeViewHistoryModal(); return; }
      closeWriteModal();
    }
  });

  // ── 로그아웃 확인 모달 외부 클릭 닫기 ──
  document.getElementById('logout-confirm-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeLogoutConfirm();
  });

  // 회원수정 모달 외부 클릭 닫기
  document.getElementById('member-edit-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeMemberEditModal();
  });
  // 확인 모달 외부 클릭 닫기
  document.getElementById('confirm-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeConfirmModal();
  });
  // 시청내역 모달 외부 클릭 닫기
  document.getElementById('view-history-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeViewHistoryModal();
  });

  // ── 접속 팝업 체크 (Supabase 연결 안정화 후 실행) ──
  setTimeout(() => checkAndShowPopup(), 600);

  // ── 팝업 이미지 input 이벤트 ──
  _setupPopupImgInput();

  // ── 팝업 오버레이 외부 클릭 닫기 ──
  document.getElementById('site-popup-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeSitePopup(false);
  });

  // 수정 모달 전화번호 자동 하이픈
  const meditTel = document.getElementById('medit-tel');
  if (meditTel) {
    meditTel.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '').substring(0, 11);
      if      (v.length < 4)  e.target.value = v;
      else if (v.length < 7)  e.target.value = `${v.slice(0,3)}-${v.slice(3)}`;
      else if (v.length < 11) e.target.value = `${v.slice(0,3)}-${v.slice(3,6)}-${v.slice(6)}`;
      else                    e.target.value = `${v.slice(0,3)}-${v.slice(3,7)}-${v.slice(7)}`;
    });
  }

  // ── 사진 파일 input ──
  const imgInput = document.getElementById('img-file-input');
  if (imgInput) {
    imgInput.addEventListener('change', () => _handleImgFileChange(imgInput.files));
  }

  // ── 동영상 파일 input ──
  const vidInput = document.getElementById('vid-file-input');
  if (vidInput) {
    vidInput.addEventListener('change', () => _handleVidFileChange(vidInput.files));
  }

  // ── 드롭존 초기화 ──
  _setupDropZone('img-drop-zone', 'image');
  _setupDropZone('vid-drop-zone', 'video');

  // ── 햄버거 메뉴 (모바일 사이드패널 드로어) ──
  const hamburgerBtn = document.getElementById('hamburger-btn');
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSideDrawer();
    });
  }
});

// ===== 모바일 사이드패널 드로어 토글 =====
function toggleSideDrawer() {
  const sidePanel  = document.querySelector('.side-panel');
  const overlay    = document.getElementById('side-overlay');
  const hamburger  = document.getElementById('hamburger-btn');
  if (!sidePanel || !overlay) return;

  const isOpen = sidePanel.classList.contains('drawer-open');
  if (isOpen) {
    closeSideDrawer();
  } else {
    sidePanel.classList.add('drawer-open');
    overlay.classList.add('visible');
    if (hamburger) hamburger.innerHTML = '<i class="fas fa-times"></i>';
    document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
  }
}

function closeSideDrawer() {
  const sidePanel  = document.querySelector('.side-panel');
  const overlay    = document.getElementById('side-overlay');
  const hamburger  = document.getElementById('hamburger-btn');
  if (!sidePanel || !overlay) return;

  sidePanel.classList.remove('drawer-open');
  overlay.classList.remove('visible');
  if (hamburger) hamburger.innerHTML = '<i class="fas fa-bars"></i>';
  document.body.style.overflow = '';
}

// 사이드패널 항목 클릭 시 모바일에서 자동 닫기
function _closeSideDrawerOnMobile() {
  if (window.innerWidth <= 767) {
    closeSideDrawer();
  }
}
