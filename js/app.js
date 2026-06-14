// ===== 앱 상태 관리 =====
const AppState = {
  currentPage: 'dashboard',
  courseFilter: 'all',
  newsFilter: 'all',
  myCourseTab: 'in-progress',
  enrolledCourses: new Set([1, 2, 3]), // 수강 중인 과정 ID
  searchQuery: '',
};

// ===== 유틸리티 =====
function $(id) { return document.getElementById(id); }
function $$(sel) { return document.querySelectorAll(sel); }

// ===== 네비게이션 =====
function navigateTo(page) {
  // 페이지 전환
  $$('.page').forEach(p => p.classList.remove('active'));
  $$('.nav-item').forEach(n => n.classList.remove('active'));

  const targetPage = $(`page-${page}`);
  const targetNav = document.querySelector(`.nav-item[data-page="${page}"]`);

  if (targetPage) targetPage.classList.add('active');
  if (targetNav) targetNav.classList.add('active');

  AppState.currentPage = page;

  // 헤더 타이틀 업데이트
  const titles = {
    dashboard: '대시보드',
    courses: '교육 과정',
    'my-courses': '내 학습',
    news: '안전 뉴스',
    notices: '공지사항',
    profile: '내 정보',
  };
  $('header-title').textContent = titles[page] || '';

  // 페이지별 렌더링
  if (page === 'courses') renderCourses();
  if (page === 'news') renderNews();
  if (page === 'notices') renderNotices();
  if (page === 'my-courses') renderMyCourses();

  // 모바일: 사이드바 닫기
  closeSidebar();

  // 스크롤 맨 위로
  document.querySelector('.page-content').scrollTop = 0;
}

// ===== 사이드바 ===== 
function openSidebar() {
  $('sidebar').classList.add('open');
  $('sidebar-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('sidebar-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ===== 교육 과정 렌더링 =====
function getCategoryColor(category) {
  const map = {
    fire: { bg: '#fff7ed', color: '#ea580c' },
    electric: { bg: '#fefce8', color: '#ca8a04' },
    chemical: { bg: '#f0fdf4', color: '#16a34a' },
    construction: { bg: '#f0f9ff', color: '#0369a1' },
    'first-aid': { bg: '#fff1f2', color: '#dc2626' },
    health: { bg: '#fdf4ff', color: '#9333ea' },
  };
  return map[category] || { bg: '#f1f5f9', color: '#64748b' };
}

function renderCourses() {
  const query = AppState.searchQuery.toLowerCase();
  const filter = AppState.courseFilter;

  const filtered = COURSES_DATA.filter(c => {
    const matchFilter = filter === 'all' || c.category === filter;
    const matchSearch = !query || c.title.toLowerCase().includes(query) || c.categoryLabel.includes(query);
    return matchFilter && matchSearch;
  });

  const grid = $('courses-grid');
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">🔍</div>
        <h3>검색 결과가 없습니다</h3>
        <p>다른 검색어나 필터를 사용해보세요</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(course => {
    const catColor = getCategoryColor(course.category);
    const isEnrolled = AppState.enrolledCourses.has(course.id);
    return `
      <article class="course-card" onclick="openCourseModal(${course.id})">
        <div class="course-card-thumb" style="background:${catColor.bg}">
          ${course.emoji}
        </div>
        <div class="course-card-body">
          <span class="course-card-category" style="background:${catColor.bg}; color:${catColor.color}">
            ${course.categoryLabel}
          </span>
          <h3>${course.title}</h3>
          <div class="course-card-meta">
            <span><i class="fas fa-clock"></i> ${course.duration}</span>
            <span><i class="fas fa-list"></i> ${course.lessons}강</span>
            <span><i class="fas fa-users"></i> ${course.students.toLocaleString()}명</span>
          </div>
          <div class="course-card-footer">
            <span class="course-level level-${course.level}">${course.levelLabel}</span>
            ${isEnrolled
              ? `<span class="btn-enrolled">✓ 수강 중</span>`
              : `<button class="btn-enroll" onclick="event.stopPropagation(); enrollCourse(${course.id})">수강신청</button>`
            }
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ===== 수강 신청 =====
function enrollCourse(id) {
  AppState.enrolledCourses.add(id);
  const course = COURSES_DATA.find(c => c.id === id);
  if (course) course.enrolled = true;

  // 토스트 메시지
  showToast(`"${course?.title}" 수강 신청이 완료되었습니다! 🎉`);
  renderCourses();
}

// ===== 과정 모달 =====
function openCourseModal(id) {
  const course = COURSES_DATA.find(c => c.id === id);
  if (!course) return;

  const isEnrolled = AppState.enrolledCourses.has(id);
  const catColor = getCategoryColor(course.category);

  $('modal-content').innerHTML = `
    <div class="modal-thumb" style="background:${catColor.bg}">${course.emoji}</div>
    <span class="course-card-category" style="background:${catColor.bg}; color:${catColor.color}; margin-bottom:8px; display:inline-block;">
      ${course.categoryLabel}
    </span>
    <h2>${course.title}</h2>
    <p class="modal-desc">${course.description}</p>
    <div class="modal-info-grid">
      <div class="modal-info-item">
        <label>총 수강 시간</label>
        <span>⏱️ ${course.duration}</span>
      </div>
      <div class="modal-info-item">
        <label>강의 수</label>
        <span>📚 ${course.lessons}강</span>
      </div>
      <div class="modal-info-item">
        <label>수강생 수</label>
        <span>👥 ${course.students.toLocaleString()}명</span>
      </div>
      <div class="modal-info-item">
        <label>난이도</label>
        <span class="course-level level-${course.level}" style="display:inline;">${course.levelLabel}</span>
      </div>
    </div>
    <div class="modal-curriculum">
      <h3>📋 커리큘럼 (일부)</h3>
      <div class="curriculum-list">
        ${course.curriculum.map(item => `
          <div class="curriculum-item ${item.done ? 'done' : ''}">
            <i class="fas ${item.done ? 'fa-check-circle' : 'fa-play-circle'}"></i>
            <span>${item.title}</span>
            ${item.done ? '<span style="margin-left:auto; font-size:0.75rem; color:#16a34a;">완료</span>' : ''}
          </div>
        `).join('')}
        <div class="curriculum-item" style="color:var(--muted-foreground);">
          <i class="fas fa-ellipsis-h"></i>
          <span>외 ${course.lessons - course.curriculum.length}강 더보기...</span>
        </div>
      </div>
    </div>
    <div style="display:flex; gap:10px;">
      ${isEnrolled
        ? `<button class="btn-primary" style="flex:1;" onclick="closeModal('course'); navigateTo('my-courses')">
             <i class="fas fa-play"></i> 이어보기
           </button>`
        : `<button class="btn-primary" style="flex:1;" onclick="enrollCourse(${id}); closeModal('course')">
             <i class="fas fa-plus"></i> 수강 신청
           </button>`
      }
      <button class="btn-outline" onclick="closeModal('course')">닫기</button>
    </div>
  `;

  $('course-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(type) {
  if (type === 'course') $('course-modal').classList.add('hidden');
  if (type === 'notice') $('notice-modal').classList.add('hidden');
  if (type === 'news') $('news-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ===== 내 학습 렌더링 =====
function renderMyCourses() {
  const container = $('my-courses-content');
  const tab = AppState.myCourseTab;

  if (tab === 'in-progress') {
    const inProgressCourses = COURSES_DATA.filter(c => AppState.enrolledCourses.has(c.id) && c.progress < 100);
    if (inProgressCourses.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <h3>수강 중인 과정이 없습니다</h3>
          <p>교육 과정 메뉴에서 원하는 과정을 신청해보세요</p>
          <button class="btn-primary" style="margin-top:16px;" onclick="navigateTo('courses')">과정 둘러보기</button>
        </div>
      `;
      return;
    }
    container.innerHTML = inProgressCourses.map(c => {
      const catColor = getCategoryColor(c.category);
      return `
        <div class="my-course-card">
          <div class="my-course-thumb" style="background:${catColor.bg}">${c.emoji}</div>
          <div class="my-course-info">
            <h3>${c.title}</h3>
            <div class="my-course-progress-row">
              <div class="progress-bar-wrap">
                <div class="progress-bar" style="width:${c.progress}%"></div>
              </div>
              <span class="my-course-pct">${c.progress}%</span>
            </div>
            <p class="my-course-meta">
              <i class="fas fa-clock"></i> ${c.duration} &nbsp;·&nbsp; 
              <i class="fas fa-list"></i> ${c.lessons}강 &nbsp;·&nbsp;
              ${c.instructor}
            </p>
          </div>
          <div class="my-course-actions">
            <button class="btn-continue" onclick="openCourseModal(${c.id})">이어보기</button>
          </div>
        </div>
      `;
    }).join('');

  } else if (tab === 'completed') {
    const completedList = [
      { title: '산업안전보건 기초 과정', emoji: '🏭', score: 96, date: '2025.03.15', duration: '10시간' },
      { title: '응급처치 및 심폐소생술', emoji: '🚑', score: 92, date: '2025.02.20', duration: '6시간' },
      { title: '개인보호구 선택 및 착용', emoji: '🦺', score: 98, date: '2025.01.10', duration: '4시간' },
    ];
    container.innerHTML = completedList.map(c => `
      <div class="my-course-card">
        <div class="my-course-thumb" style="background:#f0fdf4; font-size:1.6rem; width:56px; height:56px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${c.emoji}</div>
        <div class="my-course-info">
          <h3>${c.title}</h3>
          <div class="my-course-progress-row">
            <div class="progress-bar-wrap">
              <div class="progress-bar" style="width:100%; background:linear-gradient(90deg,#16a34a,#4ade80);"></div>
            </div>
            <span class="my-course-pct" style="color:#16a34a;">완료</span>
          </div>
          <p class="my-course-meta">이수일: ${c.date} &nbsp;·&nbsp; 점수: ${c.score}점</p>
        </div>
        <div class="my-course-actions">
          <button class="btn-outline btn-sm">이수증 보기</button>
        </div>
      </div>
    `).join('');

  } else if (tab === 'certificates') {
    const certs = [
      { title: '산업안전보건 기초 과정', emoji: '🏭', score: 96, date: '2025.03.15', expires: '2027.03.15' },
      { title: '응급처치 및 심폐소생술', emoji: '🚑', score: 92, date: '2025.02.20', expires: '2027.02.20' },
      { title: '개인보호구 선택 및 착용', emoji: '🦺', score: 98, date: '2025.01.10', expires: '2027.01.10' },
    ];
    container.innerHTML = `
      <div class="certificates-grid">
        ${certs.map(c => `
          <div class="cert-card">
            <h3>${c.title}</h3>
            <p>이수일: ${c.date}<br/>점수: ${c.score}점<br/>유효기간: ${c.expires}</p>
            <button class="btn-outline-white">📥 이수증 다운로드</button>
          </div>
        `).join('')}
      </div>
    `;
  }
}

// ===== 안전 뉴스 렌더링 =====
function renderNews() {
  const filter = AppState.newsFilter;
  const filtered = filter === 'all'
    ? NEWS_DATA
    : NEWS_DATA.filter(n => n.category === filter);

  const grid = $('news-grid');
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">📰</div>
        <h3>뉴스가 없습니다</h3>
        <p>다른 카테고리를 선택해보세요</p>
      </div>
    `;
    return;
  }

  const tagMap = {
    law: { label: '법령개정', class: 'law' },
    health: { label: '보건위생', class: 'health' },
    accident: { label: '사고예방', class: 'critical' },
    equipment: { label: '장비안전', class: 'equipment' },
  };

  grid.innerHTML = filtered.map(news => {
    const tag = tagMap[news.category] || { label: news.categoryLabel, class: 'info' };
    return `
      <article class="news-card" onclick="openNewsModal(${news.id})">
        <div class="news-card-header">
          <span class="news-tag ${tag.class}">${tag.label}</span>
        </div>
        <div class="news-card-body">
          <h3>${news.title}</h3>
          <p>${news.summary}</p>
          <div class="news-card-footer">
            <span class="news-source"><i class="fas fa-building"></i> ${news.source}</span>
            <span class="news-date">${news.date}</span>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ===== 뉴스 모달 =====
function openNewsModal(id) {
  const news = NEWS_DATA.find(n => n.id === id);
  if (!news) return;

  const tagMap = {
    law: { label: '법령개정', class: 'law' },
    health: { label: '보건위생', class: 'health' },
    accident: { label: '사고예방', class: 'critical' },
    equipment: { label: '장비안전', class: 'equipment' },
  };
  const tag = tagMap[news.category] || { label: news.categoryLabel, class: 'info' };

  $('news-modal-content').innerHTML = `
    <div style="margin-bottom:16px;">
      <span class="news-tag ${tag.class}">${tag.label}</span>
    </div>
    <h2 style="font-size:1.15rem; margin-bottom:8px; line-height:1.4;">${news.title}</h2>
    <p style="font-size:0.8rem; color:var(--muted-foreground); margin-bottom:20px;">
      <i class="fas fa-building"></i> ${news.source} &nbsp;·&nbsp; ${news.date}
    </p>
    <div style="line-height:1.7; font-size:0.88rem; color:var(--foreground);">
      ${news.content}
    </div>
  `;
  $('news-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// ===== 공지사항 렌더링 =====
function renderNotices() {
  const list = $('notices-list');
  const typeMap = {
    important: { label: '중요', class: 'notice-type-important' },
    general: { label: '일반', class: 'notice-type-general' },
    training: { label: '교육', class: 'notice-type-training' },
  };

  list.innerHTML = NOTICES_DATA.map(notice => {
    const type = typeMap[notice.type] || typeMap.general;
    return `
      <article class="notice-item ${notice.unread ? 'unread' : ''}" onclick="openNoticeModal(${notice.id})">
        <span class="notice-type-badge ${type.class}">${type.label}</span>
        <div class="notice-info">
          <h3 class="notice-title">${notice.title}</h3>
          <p class="notice-preview">${notice.preview}</p>
          <span class="notice-meta">
            <i class="fas fa-user"></i> ${notice.author} &nbsp;·&nbsp; ${notice.date}
          </span>
        </div>
      </article>
    `;
  }).join('');
}

// ===== 공지 모달 =====
function openNoticeModal(id) {
  const notice = NOTICES_DATA.find(n => n.id === id);
  if (!notice) return;

  // 읽음 처리
  notice.unread = false;
  updateBadge();

  const typeMap = {
    important: { label: '중요', class: 'notice-type-important' },
    general: { label: '일반', class: 'notice-type-general' },
    training: { label: '교육', class: 'notice-type-training' },
  };
  const type = typeMap[notice.type] || typeMap.general;

  $('notice-modal-content').innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="notice-type-badge ${type.class}">${type.label}</span>
    </div>
    <h2 style="font-size:1.1rem; margin-bottom:8px; line-height:1.4;">${notice.title}</h2>
    <p style="font-size:0.8rem; color:var(--muted-foreground); margin-bottom:20px;">
      <i class="fas fa-user"></i> ${notice.author} &nbsp;·&nbsp; ${notice.date}
    </p>
    <div style="line-height:1.7; font-size:0.88rem;">
      ${notice.content}
    </div>
  `;
  $('notice-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// ===== 배지 업데이트 =====
function updateBadge() {
  const unreadCount = NOTICES_DATA.filter(n => n.unread).length;
  const badge = document.querySelector('.nav-item[data-page="notices"] .badge');
  if (badge) {
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'inline' : 'none';
  }
  // 알림 점
  const dot = document.querySelector('.notif-dot');
  if (dot) dot.style.display = unreadCount > 0 ? 'block' : 'none';
}

// ===== 토스트 메시지 =====
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = msg;
  toast.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:#1e3a8a; color:#fff;
    padding:12px 24px;
    border-radius:10px;
    font-size:0.88rem;
    z-index:1000;
    white-space:nowrap;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    animation: slideUp 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 2500);
  setTimeout(() => toast.remove(), 2800);
}

// ===== PWA 설치 =====
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // 3초 후 배너 표시
  setTimeout(() => {
    $('pwa-banner').classList.remove('hidden');
  }, 3000);
});

$('pwa-install-btn').addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
  $('pwa-banner').classList.add('hidden');
});

$('pwa-dismiss-btn').addEventListener('click', () => {
  $('pwa-banner').classList.add('hidden');
});

// ===== 이벤트 리스너 설정 =====
function initEvents() {
  // 내비게이션
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  // 링크 버튼 (대시보드 → 다른 페이지)
  document.addEventListener('click', (e) => {
    const gotoBtn = e.target.closest('[data-goto]');
    if (gotoBtn) navigateTo(gotoBtn.dataset.goto);
  });

  // 햄버거 메뉴
  $('menu-toggle').addEventListener('click', openSidebar);
  $('sidebar-close').addEventListener('click', closeSidebar);
  $('sidebar-overlay').addEventListener('click', closeSidebar);

  // 모달 닫기
  $('modal-close').addEventListener('click', () => closeModal('course'));
  $('notice-modal-close').addEventListener('click', () => closeModal('notice'));
  $('news-modal-close').addEventListener('click', () => closeModal('news'));
  $('course-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal('course'); });
  $('notice-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal('notice'); });
  $('news-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal('news'); });

  // ESC 키
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal('course');
      closeModal('notice');
      closeModal('news');
      closeSidebar();
    }
  });

  // 과정 필터 탭
  $$('.filter-tab[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.filter-tab[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.courseFilter = btn.dataset.filter;
      renderCourses();
    });
  });

  // 과정 검색
  const searchInput = $('course-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.searchQuery = e.target.value;
      renderCourses();
    });
  }

  // 뉴스 필터 탭
  $$('.filter-tab[data-news-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.filter-tab[data-news-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.newsFilter = btn.dataset.newsFilter;
      renderNews();
    });
  });

  // 내 학습 탭
  $$('.my-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.my-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.myCourseTab = btn.dataset.tab;
      renderMyCourses();
    });
  });

  // 대시보드 이어보기 버튼
  document.addEventListener('click', (e) => {
    const continueBtn = e.target.closest('.btn-continue');
    if (continueBtn && continueBtn.dataset.course) {
      openCourseModal(parseInt(continueBtn.dataset.course));
    }
  });

  // 대시보드 뉴스 미니 클릭
  $$('.news-mini-item').forEach((item, i) => {
    item.addEventListener('click', () => {
      navigateTo('news');
      setTimeout(() => openNewsModal(i + 1), 100);
    });
  });

  // 대시보드 공지 미니 클릭
  $$('.notice-mini-item').forEach((item, i) => {
    item.addEventListener('click', () => {
      navigateTo('notices');
      setTimeout(() => openNoticeModal(i + 1), 100);
    });
  });
}

// ===== 서비스 워커 등록 =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.log('SW registration failed:', err));
  });
}

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  updateBadge();

  // 프로그레스 바 애니메이션 (초기 로딩)
  setTimeout(() => {
    $$('.progress-bar').forEach(bar => {
      const w = bar.style.width;
      bar.style.width = '0%';
      requestAnimationFrame(() => {
        bar.style.width = w;
      });
    });
  }, 100);
});
