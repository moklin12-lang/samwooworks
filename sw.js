// ===== 삼우에프엔지 안전 교육장 Service Worker =====
// ※ 파일 수정 시 버전 번호를 올리면 모든 사용자에게 캐시가 자동 초기화됩니다.
const CACHE_NAME = 'samwoo-lms-v3';

// 설치: skipWaiting으로 즉시 활성화
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// 활성화: 이전 버전 캐시 전체 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// 요청 처리: Network First 전략
// 항상 서버에서 최신 파일을 먼저 가져오고, 오프라인일 때만 캐시 사용
self.addEventListener('fetch', (event) => {
  // 크로스 오리진 요청(Supabase API 등) 제외
  if (!event.request.url.startsWith(self.location.origin)) return;
  // POST/PATCH/DELETE 등 변경 요청은 캐시 미사용
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then((response) => {
      // 유효한 응답이면 캐시에 저장(다음 오프라인 대비)
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      // 네트워크 실패 시 캐시 폴백
      return caches.match(event.request).then(cached => {
        return cached || caches.match('/index.html');
      });
    })
  );
});
