// ===================================================================
// 아이디 찾기 / 비밀번호 찾기 공통 스크립트
// ===================================================================

// ── 공통: 전화번호 자동 하이픈 ──
document.addEventListener('DOMContentLoaded', () => {
  ['fi-tel', 'fp-tel'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '').substring(0, 11);
      if      (v.length < 4)  e.target.value = v;
      else if (v.length < 7)  e.target.value = `${v.slice(0,3)}-${v.slice(3)}`;
      else if (v.length < 11) e.target.value = `${v.slice(0,3)}-${v.slice(3,6)}-${v.slice(6)}`;
      else                    e.target.value = `${v.slice(0,3)}-${v.slice(3,7)}-${v.slice(7)}`;
    });
  });

  // 비밀번호 강도 실시간 체크
  const newPwEl = document.getElementById('fp-new-pw');
  if (newPwEl) {
    newPwEl.addEventListener('input', () => updateStrength(newPwEl.value));
  }
});

// ── 공통: 필드 메시지 ──
function setMsg(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'field-msg ' + (type || '');
}
function setInputState(id, state) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('error', 'success');
  if (state) el.classList.add(state);
}

// ── 공통: 토스트 ──
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(window._tw);
  window._tw = setTimeout(() => t.classList.add('hidden'), 2800);
}

// ── 공통: 비밀번호 토글 ──
function toggleFpPw(inputId, iconId) {
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

// ===================================================================
// 아이디 찾기
// ===================================================================

// 탭 전환
function switchFindTab(tab) {
  ['phone', 'name'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
    document.getElementById(`panel-${t}`).classList.toggle('hidden', t !== tab);
  });
  // 결과 초기화
  const result = document.getElementById('find-id-result');
  if (result) { result.className = 'find-result hidden'; result.innerHTML = ''; }
}

// 전화번호로 찾기 (Supabase)
async function findIdByPhone(e) {
  e.preventDefault();
  const name = document.getElementById('fi-name-p').value.trim();
  const tel  = document.getElementById('fi-tel').value.trim();
  let valid  = true;

  if (!name) { setMsg('msg-fi-name-p', '이름을 입력해주세요.', 'err'); setInputState('fi-name-p','error'); valid = false; }
  else { setMsg('msg-fi-name-p', '', ''); setInputState('fi-name-p','success'); }

  const telReg = /^01[0-9]-\d{3,4}-\d{4}$/;
  if (!tel) { setMsg('msg-fi-tel', '전화번호를 입력해주세요.', 'err'); setInputState('fi-tel','error'); valid = false; }
  else if (!telReg.test(tel)) { setMsg('msg-fi-tel', '올바른 형식으로 입력해주세요.', 'err'); setInputState('fi-tel','error'); valid = false; }
  else { setMsg('msg-fi-tel', '', ''); setInputState('fi-tel','success'); }

  if (!valid) return;

  try {
    const found = await sbFindMemberByNameTel(name, tel);
    showFindIdResult(found);
  } catch (err) {
    console.error('[findIdByPhone]', err);
    showToast('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }
}

// 이름+부서로 찾기 (Supabase)
async function findIdByDept(e) {
  e.preventDefault();
  const name = document.getElementById('fi-name-d').value.trim();
  const dept = document.getElementById('fi-dept').value;
  let valid  = true;

  if (!name) { setMsg('msg-fi-name-d', '이름을 입력해주세요.', 'err'); setInputState('fi-name-d','error'); valid = false; }
  else { setMsg('msg-fi-name-d', '', ''); setInputState('fi-name-d','success'); }

  if (!dept) { setMsg('msg-fi-dept', '소속 부서를 선택해주세요.', 'err'); setInputState('fi-dept','error'); valid = false; }
  else { setMsg('msg-fi-dept', '', ''); setInputState('fi-dept','success'); }

  if (!valid) return;

  try {
    const found = await sbFindMemberByNameDept(name, dept);
    showFindIdResult(found);
  } catch (err) {
    console.error('[findIdByDept]', err);
    showToast('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }
}

// 결과 렌더
function showFindIdResult(user) {
  const box = document.getElementById('find-id-result');
  if (!box) return;

  if (user) {
    const joinDate = user.joinedAt
      ? new Date(user.joinedAt).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' })
      : '';
    // 아이디 일부 마스킹 (중간 2자 *)
    const raw = user.id;
    const masked = raw.length <= 3
      ? raw.slice(0,1) + '*'.repeat(raw.length - 1)
      : raw.slice(0, Math.ceil(raw.length / 2) - 1)
        + '*'.repeat(2)
        + raw.slice(Math.ceil(raw.length / 2) + 1);

    box.className = 'find-result success';
    box.innerHTML = `
      <span class="find-result-icon">🔍</span>
      <p class="find-result-title">찾은 아이디</p>
      <div class="find-result-id">${masked}</div>
      ${joinDate ? `<p class="find-result-date">가입일: ${joinDate}</p>` : ''}
      <div class="find-result-actions">
        <button class="find-result-btn primary" onclick="window.location.href='index.html'">
          <i class="fas fa-sign-in-alt"></i> 로그인
        </button>
        <button class="find-result-btn secondary" onclick="window.location.href='find-pw.html'">
          <i class="fas fa-lock"></i> 비밀번호 찾기
        </button>
      </div>
    `;
  } else {
    box.className = 'find-result fail';
    box.innerHTML = `
      <span class="find-result-icon">😔</span>
      <p class="find-result-fail-text">입력하신 정보와 일치하는 계정을 찾을 수 없습니다.<br>이름과 전화번호를 다시 확인해 주세요.</p>
      <div class="find-result-actions">
        <button class="find-result-btn secondary" onclick="window.location.href='register.html'">
          <i class="fas fa-user-plus"></i> 회원가입
        </button>
      </div>
    `;
  }

  // 스크롤 결과로 이동
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===================================================================
// 비밀번호 찾기
// ===================================================================

let _verifiedUserId = null; // 본인확인 완료된 사용자 ID

// STEP 1: 본인 확인 (Supabase)
async function verifyIdentity(e) {
  e.preventDefault();
  const id   = document.getElementById('fp-id').value.trim();
  const name = document.getElementById('fp-name').value.trim();
  const tel  = document.getElementById('fp-tel').value.trim();
  let valid  = true;

  if (!id) { setMsg('msg-fp-id', '아이디를 입력해주세요.', 'err'); setInputState('fp-id','error'); valid = false; }
  else { setMsg('msg-fp-id', '', ''); setInputState('fp-id','success'); }

  if (!name) { setMsg('msg-fp-name', '이름을 입력해주세요.', 'err'); setInputState('fp-name','error'); valid = false; }
  else { setMsg('msg-fp-name', '', ''); setInputState('fp-name','success'); }

  const telReg = /^01[0-9]-\d{3,4}-\d{4}$/;
  if (!tel) { setMsg('msg-fp-tel', '전화번호를 입력해주세요.', 'err'); setInputState('fp-tel','error'); valid = false; }
  else if (!telReg.test(tel)) { setMsg('msg-fp-tel', '올바른 형식으로 입력해주세요.', 'err'); setInputState('fp-tel','error'); valid = false; }
  else { setMsg('msg-fp-tel', '', ''); setInputState('fp-tel','success'); }

  if (!valid) return;

  try {
    const found = await sbVerifyMember(id, name, tel);

    if (!found) {
      showToast('입력하신 정보와 일치하는 계정이 없습니다.');
      setMsg('msg-fp-id', '아이디·이름·전화번호를 다시 확인해주세요.', 'err');
      setInputState('fp-id','error');
      return;
    }

    _verifiedUserId = found.id;
    const displayEl = document.getElementById('verified-id-display');
    if (displayEl) displayEl.textContent = found.name;

    goToStep(2);
  } catch (err) {
    console.error('[verifyIdentity]', err);
    showToast('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }
}

// STEP 2: 비밀번호 재설정 (Supabase UPDATE)
async function resetPassword(e) {
  e.preventDefault();
  const pw  = document.getElementById('fp-new-pw').value;
  const pw2 = document.getElementById('fp-new-pw2').value;
  let valid = true;

  const pwReg = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  if (!pw) {
    setMsg('msg-fp-new-pw', '새 비밀번호를 입력해주세요.', 'err');
    setInputState('fp-new-pw','error');
    valid = false;
  } else if (!pwReg.test(pw)) {
    setMsg('msg-fp-new-pw', '영문+숫자 조합 8자 이상 입력해주세요.', 'err');
    setInputState('fp-new-pw','error');
    valid = false;
  } else {
    setMsg('msg-fp-new-pw', '사용 가능한 비밀번호입니다.', 'ok');
    setInputState('fp-new-pw','success');
  }

  if (!pw2) {
    setMsg('msg-fp-new-pw2', '비밀번호를 다시 입력해주세요.', 'err');
    setInputState('fp-new-pw2','error');
    valid = false;
  } else if (pw !== pw2) {
    setMsg('msg-fp-new-pw2', '비밀번호가 일치하지 않습니다.', 'err');
    setInputState('fp-new-pw2','error');
    valid = false;
  } else {
    setMsg('msg-fp-new-pw2', '비밀번호가 일치합니다.', 'ok');
    setInputState('fp-new-pw2','success');
  }

  if (!valid) return;

  try {
    // Supabase UPDATE
    await sbResetPassword(_verifiedUserId, pw);
    goToStep(3);
    const bl = document.getElementById('pw-bottom-links');
    if (bl) bl.style.display = 'none';
  } catch (err) {
    console.error('[resetPassword]', err);
    showToast('비밀번호 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }
}

// 스텝 이동
function goToStep(step) {
  [1, 2, 3].forEach(n => {
    const panel = document.getElementById(`pw-step${n}`);
    const dot   = document.getElementById(`step-dot-${n}`);
    if (panel) panel.classList.toggle('hidden', n !== step);
    if (dot) {
      dot.classList.toggle('active', n === step);
      dot.classList.toggle('done',   n < step);
    }
  });

  // 스텝 라인 색 업데이트
  const lines = document.querySelectorAll('.find-step-line');
  lines.forEach((line, i) => {
    line.classList.toggle('done', i + 1 < step);
  });
}

// 비밀번호 강도 체크
function updateStrength(pw) {
  const fill  = document.getElementById('pw-strength-fill');
  const label = document.getElementById('pw-strength-label');
  if (!fill || !label) return;

  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { pct: '0%',   color: 'transparent', text: '' },
    { pct: '25%',  color: '#ef4444',     text: '매우 약함' },
    { pct: '50%',  color: '#f97316',     text: '약함' },
    { pct: '75%',  color: '#eab308',     text: '보통' },
    { pct: '90%',  color: '#22c55e',     text: '강함' },
    { pct: '100%', color: '#16a34a',     text: '매우 강함' },
  ];

  const lv = pw.length === 0 ? levels[0] : levels[Math.min(score, 5)];
  fill.style.width      = lv.pct;
  fill.style.background = lv.color;
  label.textContent     = lv.text;
  label.style.color     = lv.color;
}
