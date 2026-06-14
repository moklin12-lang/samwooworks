// ===== 비밀번호 토글 =====
function toggleRegPw(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (!input || !icon) return;
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

// ===== 공백 실시간 차단 (입력 즉시 공백 제거) =====
document.addEventListener('DOMContentLoaded', () => {
  // 공백 차단 대상 필드 ID 목록
  const noSpaceFields = ['reg-id', 'reg-name', 'reg-pw', 'reg-pw2', 'reg-car'];

  noSpaceFields.forEach(fieldId => {
    const el = document.getElementById(fieldId);
    if (!el) return;
    el.addEventListener('input', e => {
      const pos = e.target.selectionStart;
      const hasSpace = e.target.value.includes(' ');
      if (hasSpace) {
        e.target.value = e.target.value.replace(/ /g, '');
        // 커서 위치 보정 (제거된 공백 수만큼 앞으로)
        const newPos = Math.max(0, pos - (e.target.value.length - e.target.value.replace(/ /g, '').length));
        e.target.setSelectionRange(newPos, newPos);
      }
    });
    // 붙여넣기 시에도 공백 제거
    el.addEventListener('paste', e => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      const clean  = pasted.replace(/ /g, '');
      const start  = el.selectionStart;
      const end    = el.selectionEnd;
      el.value = el.value.slice(0, start) + clean + el.value.slice(end);
      el.setSelectionRange(start + clean.length, start + clean.length);
    });
  });

  // ===== 전화번호 자동 하이픈 =====
  const telInput = document.getElementById('reg-tel');
  if (telInput) {
    telInput.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '').substring(0, 11);
      if (v.length < 4)       e.target.value = v;
      else if (v.length < 7)  e.target.value = `${v.slice(0,3)}-${v.slice(3)}`;
      else if (v.length < 11) e.target.value = `${v.slice(0,3)}-${v.slice(3,6)}-${v.slice(6)}`;
      else                    e.target.value = `${v.slice(0,3)}-${v.slice(3,7)}-${v.slice(7)}`;
    });
  }
});

// ===== 유효성 검사 헬퍼 =====
function setMsg(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'field-msg ' + (type || '');
}
function setInputState(inputId, state) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.classList.remove('error', 'success');
  if (state) el.classList.add(state);
}

function validateAll() {
  let valid = true;

  // 아이디
  const id = document.getElementById('reg-id').value.trim();
  if (!id) {
    setMsg('msg-id', '아이디를 입력해주세요.', 'err');
    setInputState('reg-id', 'error');
    valid = false;
  } else if (/\s/.test(id)) {
    setMsg('msg-id', '아이디에 공백을 사용할 수 없습니다.', 'err');
    setInputState('reg-id', 'error');
    valid = false;
  } else if (id.length < 4) {
    setMsg('msg-id', '4자 이상 입력해주세요.', 'err');
    setInputState('reg-id', 'error');
    valid = false;
  } else if (!/^[a-zA-Z0-9_]+$/.test(id)) {
    setMsg('msg-id', '영문·숫자·밑줄(_)만 사용 가능합니다.', 'err');
    setInputState('reg-id', 'error');
    valid = false;
  } else {
    setMsg('msg-id', '사용 가능한 아이디입니다.', 'ok');
    setInputState('reg-id', 'success');
  }

  // 이름
  const name = document.getElementById('reg-name').value.trim();
  if (!name) {
    setMsg('msg-name', '이름을 입력해주세요.', 'err');
    setInputState('reg-name', 'error');
    valid = false;
  } else if (/\s/.test(name)) {
    setMsg('msg-name', '이름에 공백을 사용할 수 없습니다.', 'err');
    setInputState('reg-name', 'error');
    valid = false;
  } else {
    setMsg('msg-name', '', '');
    setInputState('reg-name', 'success');
  }

  // 비밀번호
  const pw = document.getElementById('reg-pw').value;
  const pwReg = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  if (!pw) {
    setMsg('msg-pw', '비밀번호를 입력해주세요.', 'err');
    setInputState('reg-pw', 'error');
    valid = false;
  } else if (/\s/.test(pw)) {
    setMsg('msg-pw', '비밀번호에 공백을 사용할 수 없습니다.', 'err');
    setInputState('reg-pw', 'error');
    valid = false;
  } else if (!pwReg.test(pw)) {
    setMsg('msg-pw', '영문+숫자 조합 8자 이상 입력해주세요.', 'err');
    setInputState('reg-pw', 'error');
    valid = false;
  } else {
    setMsg('msg-pw', '사용 가능한 비밀번호입니다.', 'ok');
    setInputState('reg-pw', 'success');
  }

  // 비밀번호 확인
  const pw2 = document.getElementById('reg-pw2').value;
  if (!pw2) {
    setMsg('msg-pw2', '비밀번호를 다시 입력해주세요.', 'err');
    setInputState('reg-pw2', 'error');
    valid = false;
  } else if (/\s/.test(pw2)) {
    setMsg('msg-pw2', '비밀번호에 공백을 사용할 수 없습니다.', 'err');
    setInputState('reg-pw2', 'error');
    valid = false;
  } else if (pw !== pw2) {
    setMsg('msg-pw2', '비밀번호가 일치하지 않습니다.', 'err');
    setInputState('reg-pw2', 'error');
    valid = false;
  } else {
    setMsg('msg-pw2', '비밀번호가 일치합니다.', 'ok');
    setInputState('reg-pw2', 'success');
  }

  // 전화번호
  const tel = document.getElementById('reg-tel').value.trim();
  const telReg = /^01[0-9]-\d{3,4}-\d{4}$/;
  if (!tel) {
    setMsg('msg-tel', '전화번호를 입력해주세요.', 'err');
    setInputState('reg-tel', 'error');
    valid = false;
  } else if (!telReg.test(tel)) {
    setMsg('msg-tel', '올바른 형식으로 입력해주세요. (예: 010-1234-5678)', 'err');
    setInputState('reg-tel', 'error');
    valid = false;
  } else {
    setMsg('msg-tel', '', '');
    setInputState('reg-tel', 'success');
  }

  // 소속 부서
  const dept = document.getElementById('reg-dept').value;
  if (!dept) {
    setMsg('msg-dept', '소속 부서를 선택해주세요.', 'err');
    setInputState('reg-dept', 'error');
    valid = false;
  } else {
    setMsg('msg-dept', '', '');
    setInputState('reg-dept', 'success');
  }

  // 업무구분
  const role = document.getElementById('reg-role').value;
  if (!role) {
    setMsg('msg-role', '업무구분을 선택해주세요.', 'err');
    setInputState('reg-role', 'error');
    valid = false;
  } else {
    setMsg('msg-role', '', '');
    setInputState('reg-role', 'success');
  }

  // 이용약관
  const chkTerms = document.getElementById('chk-terms').checked;
  if (!chkTerms) {
    setMsg('msg-terms', '이용약관에 동의해주세요.', 'err');
    valid = false;
  } else {
    setMsg('msg-terms', '', '');
  }

  // 개인정보
  const chkPrivacy = document.getElementById('chk-privacy').checked;
  if (!chkPrivacy) {
    setMsg('msg-privacy', '개인정보 수집 및 이용에 동의해주세요.', 'err');
    valid = false;
  } else {
    setMsg('msg-privacy', '', '');
  }

  return valid;
}

// ===== 회원가입 제출 (Supabase INSERT) =====
async function handleRegister(e) {
  e.preventDefault();
  if (!validateAll()) return;

  const btn     = document.getElementById('reg-btn');
  const btnText = document.getElementById('reg-btn-text');
  const spinner = document.getElementById('reg-btn-spinner');
  btn.disabled = true;
  btnText.textContent = '처리 중...';
  spinner.classList.remove('hidden');

  const userId = document.getElementById('reg-id').value.trim();
  const pw     = document.getElementById('reg-pw').value;

  try {
    // 아이디 중복 체크
    const exists = await sbCheckIdExists(userId);
    if (exists) {
      btn.disabled = false;
      btnText.textContent = '회원가입';
      spinner.classList.add('hidden');
      setMsg('msg-id', '이미 사용 중인 아이디입니다.', 'err');
      setInputState('reg-id', 'error');
      return;
    }

    // Supabase INSERT
    await sbInsertMember({
      id:        userId,
      pw:        pw,
      name:      document.getElementById('reg-name').value.trim(),
      tel:       document.getElementById('reg-tel').value.trim(),
      dept:      document.getElementById('reg-dept').value,
      role:      document.getElementById('reg-role').value,
      car:       document.getElementById('reg-car').value.trim(),
      status:    'pending',
      joined_at: new Date().toISOString(),
    });

    btn.disabled = false;
    btnText.textContent = '회원가입';
    spinner.classList.add('hidden');
    openModal('modal-done');

  } catch (err) {
    console.error('[handleRegister]', err);
    btn.disabled = false;
    btnText.textContent = '회원가입';
    spinner.classList.add('hidden');

    // 오류 메시지 표시
    const errMsg = err.message.includes('duplicate') || err.message.includes('unique')
      ? '이미 사용 중인 아이디입니다.'
      : '가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    setMsg('msg-id', errMsg, 'err');
    showToast('❌ ' + errMsg);
  }
}

// ===== 모달 열기/닫기 =====
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('hidden');
    // done 모달이 아닐 때만 overflow 복원
    if (id !== 'modal-done') document.body.style.overflow = '';
  }
}
function closeModalOutside(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}

// ===== 약관 동의 버튼 (모달 내 "동의하고 닫기") =====
function agreeTerms(checkboxId, modalId) {
  const chk = document.getElementById(checkboxId);
  if (chk) chk.checked = true;
  closeModal(modalId);
}

// ===== ESC 키로 모달 닫기 =====
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['modal-terms', 'modal-privacy'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('hidden')) closeModal(id);
    });
  }
});

// ===== 토스트 =====
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(window._tw);
  window._tw = setTimeout(() => t.classList.add('hidden'), 2800);
}
