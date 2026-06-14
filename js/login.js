// ===== 비밀번호 보기/숨기기 =====
function togglePw() {
  const input = document.getElementById('user-pw');
  const icon  = document.getElementById('pw-eye-icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

// ===== 로그인 처리 (Supabase 비동기) =====
async function handleLogin(e) {
  e.preventDefault();

  const id         = document.getElementById('user-id').value.trim();
  const pw         = document.getElementById('user-pw').value.trim();
  const btnText    = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');
  const errorBox   = document.getElementById('login-error');

  // 빈 값 체크
  if (!id) {
    showError('아이디를 입력해주세요.');
    document.getElementById('user-id').focus();
    return;
  }
  if (!pw) {
    showError('비밀번호를 입력해주세요.');
    document.getElementById('user-pw').focus();
    return;
  }

  // 로딩 상태
  btnText.classList.add('hidden');
  btnSpinner.classList.remove('hidden');
  errorBox.classList.add('hidden');

  try {
    // Supabase 비동기 인증 (auth.js의 authLoginAsync)
    const result = await authLoginAsync(id, pw);

    btnText.classList.remove('hidden');
    btnSpinner.classList.add('hidden');

    if (result.success) {
      const remember = document.getElementById('remember-me').checked;
      const storage  = remember ? localStorage : sessionStorage;
      storage.setItem('sw_user', JSON.stringify(result.user));
      window.location.href = 'dashboard.html';
    } else {
      showError(result.error || '아이디 또는 비밀번호를 확인해주세요.');
    }
  } catch (err) {
    btnText.classList.remove('hidden');
    btnSpinner.classList.add('hidden');
    showError('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    console.error('[handleLogin]', err);
  }
}

function showError(msg) {
  const errorBox  = document.getElementById('login-error');
  const errorText = document.getElementById('error-text');
  errorText.textContent = msg;
  errorBox.classList.remove('hidden');
  // 흔들기 애니메이션
  const card = document.querySelector('.login-card');
  card.style.animation = 'shake 0.4s ease';
  setTimeout(() => card.style.animation = '', 400);
}

// ===== 토스트 메시지 =====
function showMsg(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
}

// ===== 흔들기 애니메이션 =====
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-8px); }
    40%       { transform: translateX(8px); }
    60%       { transform: translateX(-5px); }
    80%       { transform: translateX(5px); }
  }
`;
document.head.appendChild(style);

// ===== 이미 로그인된 경우 =====
(function checkAuth() {
  const user = sessionStorage.getItem('sw_user') || localStorage.getItem('sw_user');
  if (user) {
    window.location.href = 'dashboard.html';
  }
})();

// ===== 엔터키 로그인 =====
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    const form = document.getElementById('login-form');
    if (form) form.dispatchEvent(new Event('submit'));
  }
});
