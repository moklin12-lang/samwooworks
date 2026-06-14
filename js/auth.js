// ===================================================================
// ===== 삼우에프엔지 교육센터 - 관리자 계정 & 권한 시스템 =====
// ===================================================================

/**
 * 관리자 계정 정의
 *
 * scope:
 *   'all'       → 모든 소속부서 게시물·회원 조회/관리
 *   특정 부서명  → 해당 부서 소속 회원만 관리, 해당 부서 전용 탭 표시
 *
 * dept: 관리 대상 소속부서 (scope='all' 이면 무시)
 */
const ADMIN_ACCOUNTS = [
  {
    id:       'alladmin',
    pw:       'samwoo3921',
    name:     '전체 관리자',
    scope:    'all',          // 모든 부서 권한
    dept:     null,
    role:     'superadmin',
    roleLabel: '최고 관리자',
  },
  {
    id:       'icadmin',
    pw:       'sw3838',
    name:     '인천TC 관리자',
    scope:    'dept',
    dept:     '인천TC',
    role:     'admin',
    roleLabel: '부서 관리자',
  },
  {
    id:       'ptadmin',
    pw:       'sw3838',
    name:     '평택TC 관리자',
    scope:    'dept',
    dept:     '평택TC',
    role:     'admin',
    roleLabel: '부서 관리자',
  },
  {
    id:       'mpadmin',
    pw:       'sw3838',
    name:     '목포TC 관리자',
    scope:    'dept',
    dept:     '목포TC',
    role:     'admin',
    roleLabel: '부서 관리자',
  },
  {
    id:       'hwadmin',
    pw:       'sw3838',
    name:     '화성TDC 관리자',
    scope:    'dept',
    dept:     '화성TDC',
    role:     'admin',
    roleLabel: '부서 관리자',
  },
  {
    id:       'kjadmin',
    pw:       'sw3838',
    name:     '광주TDC 관리자',
    scope:    'dept',
    dept:     '광주TDC',
    role:     'admin',
    roleLabel: '부서 관리자',
  },
  {
    id:       'hvadmin',
    pw:       'sw3838',
    name:     'HVAC 관리자',
    scope:    'dept',
    dept:     'HVAC',
    role:     'admin',
    roleLabel: '부서 관리자',
  },
  {
    id:       'readmin',
    pw:       'sw3838',
    name:     '냉장사업부 관리자',
    scope:    'dept',
    dept:     '냉장사업부',
    role:     'admin',
    roleLabel: '부서 관리자',
  },
];

// ===================================================================
// 로그인 인증
// ===================================================================

/**
 * 아이디 + 비밀번호로 로그인 시도
 * @returns {{ success: boolean, user?: object, error?: string }}
 */
function authLogin(id, pw) {
  if (!id || !pw) {
    return { success: false, error: '아이디와 비밀번호를 입력해주세요.' };
  }

  // 1) 관리자 계정 확인
  const admin = ADMIN_ACCOUNTS.find(a => a.id === id && a.pw === pw);
  if (admin) {
    return {
      success: true,
      user: {
        id:        admin.id,
        name:      admin.name,
        role:      admin.role,
        roleLabel: admin.roleLabel,
        scope:     admin.scope,
        dept:      admin.dept,
        isAdmin:   true,
      }
    };
  }

  // 2) Supabase에서 일반 회원 확인 (비동기 → authLoginAsync 사용 권장)
  //    동기 호환을 위해 localStorage 캐시도 함께 확인
  const regList = JSON.parse(localStorage.getItem('sw_reg_list') || '[]');
  const member = regList.find(u => u.id === id && u.pw === pw);
  if (member) {
    if (member.status !== 'approved') {
      const statusMsg = {
        pending:  '계정 승인 대기 중입니다. 관리자 승인 후 로그인 가능합니다.',
        rejected: '가입이 거부된 계정입니다. 관리자에게 문의하세요.',
      };
      return { success: false, error: statusMsg[member.status] || '승인되지 않은 계정입니다.' };
    }
    return {
      success: true,
      user: {
        id:        member.id,
        name:      member.name,
        role:      'user',
        roleLabel: '직원',
        scope:     'self',
        dept:      member.dept,
        isAdmin:   false,
      }
    };
  }

  return { success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
}

/**
 * Supabase 연동 비동기 로그인 (login.js에서 사용)
 * @returns {Promise<{ success: boolean, user?: object, error?: string }>}
 */
async function authLoginAsync(id, pw) {
  if (!id || !pw) {
    return { success: false, error: '아이디와 비밀번호를 입력해주세요.' };
  }

  // 1) 관리자 계정 먼저 확인 (로컬)
  const admin = ADMIN_ACCOUNTS.find(a => a.id === id && a.pw === pw);
  if (admin) {
    return {
      success: true,
      user: {
        id:        admin.id,
        name:      admin.name,
        role:      admin.role,
        roleLabel: admin.roleLabel,
        scope:     admin.scope,
        dept:      admin.dept,
        isAdmin:   true,
      }
    };
  }

  // 2) Supabase에서 회원 조회
  try {
    const member = await sbGetMember(id);
    if (!member || member.pw !== pw) {
      return { success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    }
    if (member.status !== 'approved') {
      const statusMsg = {
        pending:  '계정 승인 대기 중입니다. 관리자 승인 후 로그인 가능합니다.',
        rejected: '가입이 거부된 계정입니다. 관리자에게 문의하세요.',
      };
      return { success: false, error: statusMsg[member.status] || '승인되지 않은 계정입니다.' };
    }
    return {
      success: true,
      user: {
        id:        member.id,
        name:      member.name,
        role:      'user',
        roleLabel: '직원',
        scope:     'self',
        dept:      member.dept,
        isAdmin:   false,
      }
    };
  } catch (err) {
    console.error('[authLoginAsync] Supabase 오류:', err.message);
    // Supabase 실패 시 localStorage 폴백
    const regList = JSON.parse(localStorage.getItem('sw_reg_list') || '[]');
    const member  = regList.find(u => u.id === id && u.pw === pw);
    if (!member) return { success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    if (member.status !== 'approved') {
      return { success: false, error: '계정 승인 대기 중입니다.' };
    }
    return {
      success: true,
      user: {
        id: member.id, name: member.name,
        role: 'user', roleLabel: '직원',
        scope: 'self', dept: member.dept, isAdmin: false,
      }
    };
  }
}

// ===================================================================
// 권한 체크 유틸
// ===================================================================

/** 현재 로그인 사용자 세션 반환 */
function getCurrentUser() {
  const raw = sessionStorage.getItem('sw_user') || localStorage.getItem('sw_user');
  return raw ? JSON.parse(raw) : null;
}

/** 현재 사용자가 관리자 권한을 가지는지 */
function isAdmin() {
  const u = getCurrentUser();
  return u && u.isAdmin === true;
}

/** 현재 사용자가 전체(superadmin) 권한인지 */
function isSuperAdmin() {
  const u = getCurrentUser();
  return u && u.scope === 'all';
}

/**
 * 회원 목록 필터링 - 현재 관리자 scope에 맞게 반환
 * @param {Array} list - 전체 회원 배열
 * @returns {Array} 필터된 회원 배열
 */
function filterMembersByScope(list) {
  const u = getCurrentUser();
  if (!u || !u.isAdmin) return [];
  if (u.scope === 'all') return list;          // 전체 관리자는 모두 표시
  return list.filter(m => m.dept === u.dept);  // 부서 관리자는 해당 부서만
}

/**
 * 현재 관리자의 scope 라벨 반환 (헤더/UI 표시용)
 */
function getScopeLabel() {
  const u = getCurrentUser();
  if (!u) return '';
  if (u.scope === 'all') return '전체 부서';
  return u.dept || '';
}
