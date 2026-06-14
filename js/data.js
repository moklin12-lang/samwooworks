// ===== 교육 과정 데이터 =====
const COURSES_DATA = [
  {
    id: 1,
    title: "산업안전보건 기초 과정",
    category: "fire",
    categoryLabel: "화재안전",
    emoji: "🔥",
    thumbBg: "#fff7ed",
    description: "산업 현장에서 발생할 수 있는 화재 위험 요소를 파악하고, 예방 및 대응 방법을 체계적으로 학습합니다.",
    duration: "10시간",
    lessons: 12,
    students: 245,
    level: "basic",
    levelLabel: "초급",
    instructor: "이안전 강사",
    enrolled: true,
    progress: 75,
    curriculum: [
      { title: "1강. 화재의 원인과 분류", done: true },
      { title: "2강. 화재 예방 수칙", done: true },
      { title: "3강. 소화기 사용법", done: true },
      { title: "4강. 화재 대피 요령", done: false },
      { title: "5강. 소화설비 이해", done: false },
    ]
  },
  {
    id: 2,
    title: "전기 안전 기초 과정",
    category: "electric",
    categoryLabel: "전기안전",
    emoji: "⚡",
    thumbBg: "#fefce8",
    description: "전기 설비 취급 시 발생할 수 있는 위험 요소와 감전 사고 예방, 안전한 전기 작업 방법을 학습합니다.",
    duration: "8시간",
    lessons: 10,
    students: 198,
    level: "basic",
    levelLabel: "초급",
    instructor: "박전기 강사",
    enrolled: true,
    progress: 40,
    curriculum: [
      { title: "1강. 전기의 기초 이론", done: true },
      { title: "2강. 감전 사고의 원인", done: true },
      { title: "3강. 전기 안전 장비", done: false },
      { title: "4강. 절연 보호구 사용", done: false },
      { title: "5강. 전기 작업 안전 수칙", done: false },
    ]
  },
  {
    id: 3,
    title: "화학물질 취급 안전",
    category: "chemical",
    categoryLabel: "화학안전",
    emoji: "☣️",
    thumbBg: "#f0fdf4",
    description: "유해화학물질의 종류와 특성을 이해하고, MSDS 활용법 및 안전한 취급·보관 방법을 익힙니다.",
    duration: "12시간",
    lessons: 15,
    students: 134,
    level: "intermediate",
    levelLabel: "중급",
    instructor: "최화학 강사",
    enrolled: true,
    progress: 20,
    curriculum: [
      { title: "1강. 화학물질 분류 체계", done: true },
      { title: "2강. MSDS 이해와 활용", done: false },
      { title: "3강. 개인보호구 착용", done: false },
      { title: "4강. 누출 대응 절차", done: false },
      { title: "5강. 폐기물 처리 기준", done: false },
    ]
  },
  {
    id: 4,
    title: "건설 현장 안전관리",
    category: "construction",
    categoryLabel: "건설안전",
    emoji: "🏗️",
    thumbBg: "#f0f9ff",
    description: "건설 현장 특성에 맞는 안전 관리 방법, 추락·낙하 사고 예방 및 작업 환경 개선 방안을 학습합니다.",
    duration: "16시간",
    lessons: 20,
    students: 312,
    level: "intermediate",
    levelLabel: "중급",
    instructor: "정건설 강사",
    enrolled: false,
    progress: 0,
    curriculum: [
      { title: "1강. 건설 현장 위험 요소", done: false },
      { title: "2강. 추락 방지 설비", done: false },
      { title: "3강. 중장비 안전 운영", done: false },
      { title: "4강. 굴착 작업 안전", done: false },
      { title: "5강. 비계 및 거푸집 안전", done: false },
    ]
  },
  {
    id: 5,
    title: "응급처치 및 심폐소생술",
    category: "first-aid",
    categoryLabel: "응급처치",
    emoji: "🚑",
    thumbBg: "#fff1f2",
    description: "사업장 응급상황 대응을 위한 기본 응급처치 방법과 심폐소생술(CPR) 실기를 중심으로 학습합니다.",
    duration: "6시간",
    lessons: 8,
    students: 456,
    level: "basic",
    levelLabel: "초급",
    instructor: "홍응급 강사",
    enrolled: false,
    progress: 0,
    curriculum: [
      { title: "1강. 응급상황 인지와 신고", done: false },
      { title: "2강. 심폐소생술 이론", done: false },
      { title: "3강. CPR 실습", done: false },
      { title: "4강. 자동심장충격기(AED) 사용", done: false },
      { title: "5강. 골절·출혈 처치", done: false },
    ]
  },
  {
    id: 6,
    title: "고소작업 안전 교육",
    category: "construction",
    categoryLabel: "건설안전",
    emoji: "🪜",
    thumbBg: "#eff6ff",
    description: "2m 이상 고소 작업 시 반드시 알아야 할 안전 수칙, 안전대 사용법, 고소작업대 운영 방법을 학습합니다.",
    duration: "8시간",
    lessons: 10,
    students: 167,
    level: "intermediate",
    levelLabel: "중급",
    instructor: "오고소 강사",
    enrolled: false,
    progress: 0,
    curriculum: [
      { title: "1강. 고소작업 위험 요인", done: false },
      { title: "2강. 안전대 선택과 착용", done: false },
      { title: "3강. 추락방망 설치 기준", done: false },
      { title: "4강. 고소작업대 운영 법규", done: false },
      { title: "5강. 사고 사례 분석", done: false },
    ]
  },
  {
    id: 7,
    title: "소음·진동 직업병 예방",
    category: "health",
    categoryLabel: "보건위생",
    emoji: "👂",
    thumbBg: "#fdf4ff",
    description: "산업 현장 소음·진동으로 인한 직업병의 원인, 예방 대책 및 청력 보호구 사용 방법을 학습합니다.",
    duration: "5시간",
    lessons: 6,
    students: 89,
    level: "basic",
    levelLabel: "초급",
    instructor: "강보건 강사",
    enrolled: false,
    progress: 0,
    curriculum: [
      { title: "1강. 소음의 영향과 기준치", done: false },
      { title: "2강. 청력 보호구 선택", done: false },
      { title: "3강. 진동 장해 예방", done: false },
      { title: "4강. 작업환경 측정", done: false },
      { title: "5강. 건강검진 활용", done: false },
    ]
  },
  {
    id: 8,
    title: "밀폐공간 작업 안전",
    category: "chemical",
    categoryLabel: "화학안전",
    emoji: "🕳️",
    thumbBg: "#f7fee7",
    description: "맨홀, 탱크 등 밀폐 공간 작업 시 산소결핍·유해가스 위험을 예방하는 방법과 비상 대응 절차를 학습합니다.",
    duration: "8시간",
    lessons: 10,
    students: 78,
    level: "advanced",
    levelLabel: "고급",
    instructor: "신밀폐 강사",
    enrolled: false,
    progress: 0,
    curriculum: [
      { title: "1강. 밀폐공간 정의와 위험요인", done: false },
      { title: "2강. 산소농도 측정 방법", done: false },
      { title: "3강. 환기 장치 운용", done: false },
      { title: "4강. 구조 및 대피 절차", done: false },
      { title: "5강. 작업허가제 운영", done: false },
    ]
  },
  {
    id: 9,
    title: "개인보호구 선택 및 착용",
    category: "fire",
    categoryLabel: "화재안전",
    emoji: "🦺",
    thumbBg: "#fdf2f8",
    description: "작업 유형별 적합한 개인보호구(PPE) 선택, 올바른 착용 방법 및 관리·보관 방법을 학습합니다.",
    duration: "4시간",
    lessons: 5,
    students: 523,
    level: "basic",
    levelLabel: "초급",
    instructor: "임보호 강사",
    enrolled: false,
    progress: 0,
    curriculum: [
      { title: "1강. 개인보호구 종류", done: false },
      { title: "2강. 안전모·안전화 착용", done: false },
      { title: "3강. 방진·방독 마스크", done: false },
      { title: "4강. 내화복·보호장갑", done: false },
      { title: "5강. 보호구 점검과 보관", done: false },
    ]
  },
];

// ===== 안전 뉴스 데이터 =====
const NEWS_DATA = [
  {
    id: 1,
    title: "2025년 산업안전보건법 개정 주요사항 안내",
    category: "law",
    categoryLabel: "법령개정",
    date: "2025.06.05",
    source: "고용노동부",
    summary: "2025년 1월부터 시행되는 개정 산업안전보건법의 주요 변경사항을 안내합니다. 특히 소규모 사업장 안전관리자 선임 의무 확대 및 중대재해처벌법 적용 기준 변경 내용을 중점적으로 다룹니다.",
    content: `
      <h3>개정 배경</h3>
      <p>산업재해 사망사고 감소를 위해 안전 관리 체계를 전면 강화하는 방향으로 산업안전보건법이 개정되었습니다.</p>
      <h3>주요 개정 내용</h3>
      <ul>
        <li>✅ 50인 미만 사업장 안전보건관리담당자 선임 의무화</li>
        <li>✅ 위험성 평가 주기 단축 (3년 → 1년)</li>
        <li>✅ 하청 근로자 안전 보호 의무 강화</li>
        <li>✅ 안전교육 시간 확대 (연 8시간 → 12시간)</li>
      </ul>
      <h3>시행 일정</h3>
      <p>2025년 1월 1일부터 단계적으로 시행됩니다.</p>
    `
  },
  {
    id: 2,
    title: "여름철 온열질환 예방 가이드 — 열사병 응급처치법",
    category: "health",
    categoryLabel: "보건위생",
    date: "2025.06.03",
    source: "안전보건공단",
    summary: "기온이 상승하는 여름철 야외 작업 시 온열질환 예방을 위한 가이드라인입니다. 열사병, 열탈진 등의 증상 인지 방법과 즉각적인 응급처치 절차를 안내합니다.",
    content: `
      <h3>온열질환이란?</h3>
      <p>열사병, 열탈진, 열경련 등 고온 환경 노출로 인해 발생하는 건강 장해를 총칭합니다.</p>
      <h3>예방 수칙</h3>
      <ul>
        <li>☀️ 오전 11시 ~ 오후 3시 무더운 시간대 야외 작업 자제</li>
        <li>💧 매 15~20분마다 물 한 컵(200mL) 이상 마시기</li>
        <li>🏠 2시간 작업 후 10분 이상 시원한 곳에서 휴식</li>
        <li>👕 밝은 색 통기성 좋은 작업복 착용</li>
      </ul>
      <h3>응급처치</h3>
      <p>열사병 증상(의식 저하, 고체온) 발생 시 즉시 119에 신고하고, 시원한 곳으로 이동 후 얼음 냉각을 실시합니다.</p>
    `
  },
  {
    id: 3,
    title: "안전모 착용 기준 강화 — 2025년 하반기 시행",
    category: "equipment",
    categoryLabel: "장비안전",
    date: "2025.06.01",
    source: "고용노동부",
    summary: "건설 및 제조업 현장의 안전모 착용 기준이 강화됩니다. ABS 재질에서 고강도 열가소성 수지로의 재질 기준 변경 및 턱끈 착용 의무화가 포함됩니다.",
    content: `
      <h3>변경 내용</h3>
      <p>기존 안전모 기준(KCS)이 국제 기준(EN 397)에 맞게 강화됩니다.</p>
      <h3>주요 변경사항</h3>
      <ul>
        <li>🪖 안전모 재질: ABS → 고강도 열가소성 수지(PC 혼합)</li>
        <li>🔗 턱끈 착용 의무화 (기존 권장 → 필수)</li>
        <li>📅 교체 주기: 3년 → 2년으로 단축</li>
        <li>🔍 분기별 외관 점검 기록 유지 의무</li>
      </ul>
    `
  },
  {
    id: 4,
    title: "건설현장 추락사고 사례 분석 및 예방 대책",
    category: "accident",
    categoryLabel: "사고예방",
    date: "2025.05.28",
    source: "안전보건공단",
    summary: "2024년 건설 현장 추락사고 통계를 분석하고, 사고 유형별 예방 대책을 제시합니다. 최근 3년간 추락 사망사고의 40%가 개구부 미방호에서 발생했습니다.",
    content: `
      <h3>통계 현황</h3>
      <p>2024년 건설업 사망재해 중 추락은 전체의 47%를 차지합니다.</p>
      <h3>주요 사고 유형</h3>
      <ul>
        <li>📌 개구부 미방호: 40%</li>
        <li>📌 비계 불량: 25%</li>
        <li>📌 안전대 미착용: 20%</li>
        <li>📌 작업발판 불량: 15%</li>
      </ul>
      <h3>핵심 예방 대책</h3>
      <p>작업 전 위험성 평가 실시, 추락 방호망 설치, 안전대 지급 및 착용 확인 체계 구축이 필수적입니다.</p>
    `
  },
  {
    id: 5,
    title: "유해화학물질 MSDS 자동 업데이트 시스템 도입",
    category: "law",
    categoryLabel: "법령개정",
    date: "2025.05.20",
    source: "화학물질안전원",
    summary: "화학물질 물질안전보건자료(MSDS)를 실시간으로 업데이트하는 디지털 관리 시스템이 도입됩니다. QR코드를 통한 즉시 조회 기능도 추가됩니다.",
    content: `
      <h3>도입 배경</h3>
      <p>기존 종이 MSDS의 관리 부실 문제를 해결하기 위해 디지털 전환을 추진합니다.</p>
      <h3>주요 기능</h3>
      <ul>
        <li>📱 QR코드 스캔으로 즉시 MSDS 조회</li>
        <li>🔄 물질 정보 변경 시 자동 업데이트</li>
        <li>📧 담당자 이메일 알림 발송</li>
        <li>📊 화학물질 사용 현황 대시보드</li>
      </ul>
    `
  },
  {
    id: 6,
    title: "근골격계 질환 예방 — 올바른 중량물 취급법",
    category: "health",
    categoryLabel: "보건위생",
    date: "2025.05.15",
    source: "안전보건공단",
    summary: "반복적인 중량물 취급 작업으로 인한 근골격계 질환 예방을 위한 올바른 자세와 보조도구 활용법을 안내합니다.",
    content: `
      <h3>근골격계 질환이란?</h3>
      <p>반복적인 작업, 무리한 힘, 부적절한 자세로 인해 근육, 건, 인대, 신경 등에 발생하는 건강 장해입니다.</p>
      <h3>예방 방법</h3>
      <ul>
        <li>💪 25kg 이상 중량물 2인 이상 작업 의무</li>
        <li>🦾 리프팅 보조기구(핸드트럭, 리프터) 적극 활용</li>
        <li>🧘 작업 중간 스트레칭 10분 실시</li>
        <li>📐 허리를 곧게 펴고 무릎을 굽혀 들어올리기</li>
      </ul>
    `
  },
];

// ===== 공지사항 데이터 =====
const NOTICES_DATA = [
  {
    id: 1,
    title: "6월 정기 안전교육 일정 공고",
    type: "training",
    typeLabel: "교육",
    date: "2025.06.05",
    author: "안전관리팀",
    unread: true,
    preview: "2025년 6월 정기 법정 안전교육 일정을 안내드립니다. 본 교육은 의무 참석이므로...",
    content: `
      <h3>6월 정기 법정 안전교육 일정</h3>
      <p>안전보건법 제29조에 따른 정기 안전교육을 아래와 같이 실시하오니 해당 직원들은 반드시 참석하여 주시기 바랍니다.</p>
      <br/>
      <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
        <tr style="background:#f1f5f9;">
          <th style="padding:8px; border:1px solid #e2e8f0; text-align:left;">일시</th>
          <th style="padding:8px; border:1px solid #e2e8f0; text-align:left;">대상</th>
          <th style="padding:8px; border:1px solid #e2e8f0; text-align:left;">장소</th>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #e2e8f0;">6/10(화) 14:00</td>
          <td style="padding:8px; border:1px solid #e2e8f0;">생산1팀, 생산2팀</td>
          <td style="padding:8px; border:1px solid #e2e8f0;">교육장 1호</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #e2e8f0;">6/12(목) 10:00</td>
          <td style="padding:8px; border:1px solid #e2e8f0;">안전관리팀, 시설팀</td>
          <td style="padding:8px; border:1px solid #e2e8f0;">교육장 2호</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #e2e8f0;">6/17(화) 14:00</td>
          <td style="padding:8px; border:1px solid #e2e8f0;">영업팀, 관리팀</td>
          <td style="padding:8px; border:1px solid #e2e8f0;">교육장 1호</td>
        </tr>
      </table>
      <br/>
      <p>미참석 시 법적 불이익이 발생할 수 있으므로, 일정 변경이 필요한 경우 안전관리팀(내선 1234)으로 연락 바랍니다.</p>
    `
  },
  {
    id: 2,
    title: "소방훈련 참여 안내 (6/15 일요일)",
    type: "important",
    typeLabel: "중요",
    date: "2025.06.03",
    author: "안전관리팀",
    unread: true,
    preview: "6월 15일(일) 오전 10시 사업장 전체 소방훈련을 실시합니다. 전 직원 참석 필수...",
    content: `
      <h3>🔥 전사 소방훈련 실시 안내</h3>
      <p><strong>일시:</strong> 2025년 6월 15일(일) 오전 10:00 ~ 11:30</p>
      <p><strong>장소:</strong> 전 사업장 (본관, 공장동, 창고동)</p>
      <p><strong>참석 대상:</strong> 전 직원 (당일 근무자 포함)</p>
      <br/>
      <h3>훈련 내용</h3>
      <ul>
        <li>🚨 화재 경보 발령 훈련</li>
        <li>🚪 대피 경로 확인 및 실제 대피 훈련</li>
        <li>🧯 소화기 사용 실습</li>
        <li>🚒 소방서 연계 합동 훈련</li>
      </ul>
      <br/>
      <p style="color:#dc2626; font-weight:600;">⚠️ 전 직원 반드시 참석 바랍니다. 불참 시 별도 보충 교육을 이수해야 합니다.</p>
    `
  },
  {
    id: 3,
    title: "2분기 안전 점검 결과 공유",
    type: "general",
    typeLabel: "일반",
    date: "2025.05.28",
    author: "안전관리팀장",
    unread: false,
    preview: "2025년 2분기(4~6월) 사업장 자체 안전 점검 결과를 공유합니다. 총 48개 항목 점검...",
    content: `
      <h3>2025년 2분기 안전점검 결과 보고</h3>
      <p>지난 4월~5월에 걸쳐 실시한 사업장 자체 안전 점검 결과를 공유합니다.</p>
      <br/>
      <h3>점검 현황</h3>
      <ul>
        <li>✅ 총 점검 항목: 48개</li>
        <li>✅ 적합: 44개 (91.7%)</li>
        <li>⚠️ 개선 필요: 4개 (8.3%)</li>
      </ul>
      <br/>
      <h3>개선 필요 사항</h3>
      <ul>
        <li>📍 공장동 A구역 소화기 교체 (기간 초과) → 6/30까지 조치</li>
        <li>📍 창고동 비상구 표시등 교체 → 6/15까지 조치</li>
        <li>📍 본관 3층 안전난간 보강 → 7/1까지 조치</li>
        <li>📍 작업장 내 통로 구획선 재도색 → 7/15까지 조치</li>
      </ul>
    `
  },
  {
    id: 4,
    title: "신규 입사자 안전교육 일정 안내",
    type: "training",
    typeLabel: "교육",
    date: "2025.05.20",
    author: "인사팀",
    unread: false,
    preview: "5~6월 신규 입사자 대상 채용 시 안전교육 일정을 안내드립니다...",
    content: `
      <h3>신규 입사자 채용 시 안전교육</h3>
      <p>산업안전보건법 제29조에 따라 신규 입사자에게는 채용 시 안전교육(8시간)을 의무적으로 실시합니다.</p>
      <br/>
      <h3>교육 일정</h3>
      <ul>
        <li>📅 6월 입사자: 6월 2일(월) 09:00 ~ 17:00</li>
        <li>📅 7월 입사자: 7월 7일(월) 09:00 ~ 17:00</li>
      </ul>
      <br/>
      <p>신규 입사 예정자가 있는 팀장님들은 해당 일정을 입사자에게 사전 안내해 주시기 바랍니다.</p>
    `
  },
  {
    id: 5,
    title: "여름 특별 안전 캠페인 참여 안내",
    type: "general",
    typeLabel: "일반",
    date: "2025.05.15",
    author: "안전관리팀",
    unread: false,
    preview: "고용노동부 주관 '여름 산업재해 예방 특별 캠페인'에 동참합니다...",
    content: `
      <h3>여름 산업재해 예방 특별 캠페인</h3>
      <p>고용노동부와 안전보건공단이 주관하는 여름철 특별 안전 캠페인에 우리 사업장도 동참합니다.</p>
      <br/>
      <h3>캠페인 기간</h3>
      <p>2025년 6월 ~ 8월 (3개월)</p>
      <br/>
      <h3>우리 사업장 참여 내용</h3>
      <ul>
        <li>🌡️ 폭염 대비 작업 중지 기준 마련 및 시행</li>
        <li>💧 현장 음수대 추가 설치 (5개소)</li>
        <li>⛱️ 야외 작업장 그늘막 설치</li>
        <li>📊 주간 온열질환 예방 캠페인 안전 미팅 실시</li>
      </ul>
    `
  },
];
