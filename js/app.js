import { auth, db } from './auth.js';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  collection, doc, addDoc, setDoc, deleteDoc, getDoc, getDocs,
  onSnapshot, serverTimestamp, query, where, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── STATE ──────────────────────────────────────────────────────
let currentUser = null;
let currentUserProfile = null;
let students = [];
let scores = [];
let unsubStudents = null;
let unsubScores = null;
let currentRole = 'teacher';
let currentStudentView = null;

// ── SCORING LOGIC (unchanged) ──────────────────────────────────
function getTier(pct) {
  if (pct >= 76) return 'green';
  if (pct >= 56) return 'amber';
  return 'red';
}

function getTierLabel(pct) {
  if (pct >= 76) return '✓  76% 이상 — 다음 챕터 바로 진행';
  if (pct >= 56) return '↻  56–75% — 다음 챕터 진행 + 취약 단원 병행 보충';
  return '✗  55% 이하 — 기존 챕터 복습 1회 후 다음 챕터 시작';
}

function getNextStep(pct) {
  if (pct >= 76) return '다음 챕터로 바로 진행합니다. 틀린 문항은 오답풀이로 확인하세요.';
  if (pct >= 56) return '다음 챕터 진도를 나가면서, 취약 단원을 병행하여 보충합니다.';
  return '기존 챕터를 1회 복습한 후 다음 챕터를 시작합니다.';
}

function getSelfStudyTask(pct) {
  if (pct >= 76) return null;
  if (pct >= 56) return '📝  자기주도 과제: 틀린 단원의 교재에서 각 Example 별 첫 문제를 직접 다시 풀고, 각 문제별 주요 개념을 영어로 한 문장씩 노트에 정리해오세요.\n예) "Example 1-1. The slope shows the rate of change of a line."';
  return '📚  자기주도 과제: 취약 단원의 교재 핵심 개념 박스(shaded box)를 중심으로 스스로 복습한 이후, 다음 수업 시간에 본인만의 언어로 설명해보세요.';
}

// ── AUTH ERROR MESSAGES ────────────────────────────────────────
function getAuthErrorMessage(code) {
  const map = {
    'auth/user-not-found':      '등록되지 않은 이메일입니다.',
    'auth/wrong-password':      '비밀번호가 올바르지 않습니다.',
    'auth/invalid-credential':  '이메일 또는 비밀번호가 올바르지 않습니다.',
    'auth/email-already-in-use':'이미 사용 중인 이메일입니다.',
    'auth/weak-password':       '비밀번호는 6자 이상이어야 합니다.',
    'auth/invalid-email':       '올바른 이메일 형식이 아닙니다.',
    'auth/too-many-requests':   '시도 횟수가 초과됐습니다. 잠시 후 다시 시도해주세요.',
  };
  return map[code] || '오류가 발생했습니다. 다시 시도해주세요.';
}

// ── AUTH UI ────────────────────────────────────────────────────
document.getElementById('auth-tab-login').addEventListener('click', () => {
  document.getElementById('auth-tab-login').classList.add('active');
  document.getElementById('auth-tab-signup').classList.remove('active');
  document.getElementById('auth-login-form').style.display = '';
  document.getElementById('auth-signup-form').style.display = 'none';
  document.getElementById('login-error').textContent = '';
});

document.getElementById('auth-tab-signup').addEventListener('click', () => {
  document.getElementById('auth-tab-signup').classList.add('active');
  document.getElementById('auth-tab-login').classList.remove('active');
  document.getElementById('auth-signup-form').style.display = '';
  document.getElementById('auth-login-form').style.display = 'none';
  document.getElementById('signup-error').textContent = '';
});

document.getElementById('btn-login').addEventListener('click', async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl  = document.getElementById('login-error');
  const btn      = document.getElementById('btn-login');
  if (!email || !password) { errorEl.textContent = '이메일과 비밀번호를 입력해주세요.'; return; }
  btn.textContent = '로그인 중...'; btn.disabled = true; errorEl.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    errorEl.textContent = getAuthErrorMessage(err.code);
    btn.textContent = '로그인'; btn.disabled = false;
  }
});

// Allow Enter key to submit login
document.getElementById('login-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-login').click();
});

document.getElementById('btn-signup').addEventListener('click', async () => {
  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const role     = document.getElementById('signup-role').value;
  const errorEl  = document.getElementById('signup-error');
  const btn      = document.getElementById('btn-signup');
  if (!name || !email || !password) { errorEl.textContent = '모든 필드를 입력해주세요.'; return; }
  btn.textContent = '가입 중...'; btn.disabled = true; errorEl.textContent = '';
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), { name, email, role, createdAt: serverTimestamp() });
  } catch (err) {
    errorEl.textContent = getAuthErrorMessage(err.code);
    btn.textContent = '회원가입'; btn.disabled = false;
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  if (unsubStudents) { unsubStudents(); unsubStudents = null; }
  if (unsubScores)   { unsubScores();   unsubScores = null;   }
  await signOut(auth);
});

// ── AUTH STATE ─────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const snap = await getDoc(doc(db, 'users', user.uid));
    currentUserProfile = snap.exists()
      ? { uid: user.uid, ...snap.data() }
      : { uid: user.uid, name: user.email, role: 'teacher' };

    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-gate').style.display = 'flex';
    document.getElementById('btn-login').textContent = '로그인';
    document.getElementById('btn-login').disabled = false;
    initApp();
  } else {
    currentUser = null;
    currentUserProfile = null;
    students = [];
    scores = [];
    if (chartChapter) { chartChapter.destroy(); chartChapter = null; }
    if (chartDist)    { chartDist.destroy();    chartDist = null;    }
    if (chartTrend)   { chartTrend.destroy();   chartTrend = null;   }
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-gate').style.display = 'none';
  }
});

// ── APP INIT ───────────────────────────────────────────────────
function initApp() {
  const name = currentUserProfile?.name || currentUser?.email || '—';
  const role = currentUserProfile?.role || 'teacher';

  document.getElementById('user-avatar').textContent = name.slice(0, 2).toUpperCase();
  document.getElementById('user-name').textContent = name;
  document.getElementById('user-role').textContent = role === 'teacher' ? '선생님' : '학생';

  currentRole = role;

  if (role === 'student') {
    document.getElementById('role-teacher').classList.remove('active');
    document.getElementById('role-student').classList.add('active');
    document.getElementById('student-select-wrap').style.display = 'block';
    document.querySelectorAll('.teacher-only').forEach(el => el.style.display = 'none');
  } else {
    document.getElementById('role-teacher').classList.add('active');
    document.getElementById('role-student').classList.remove('active');
    document.getElementById('student-select-wrap').style.display = 'none';
    document.querySelectorAll('.teacher-only').forEach(el => el.style.display = '');
  }

  setupFirestoreListeners();
  setTodayDates();
  showView('dashboard');
}

// ── FIRESTORE LISTENERS ────────────────────────────────────────
function setupFirestoreListeners() {
  if (unsubStudents) unsubStudents();
  if (unsubScores)   unsubScores();

  unsubStudents = onSnapshot(collection(db, 'students'), snap => {
    students = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (currentRole === 'student' && currentUser) {
      const linked = students.find(s => s.linkedEmail === currentUser.email.toLowerCase());
      currentStudentView = linked ? linked.id : null;
    }

    populateStudentSelects();
    populateStudentViewSelect();
    populateStatsFilter();
    renderStudents();
    renderDashboard();
  });

  unsubScores = onSnapshot(collection(db, 'scores'), snap => {
    scores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDashboard();
    renderStats();
  });
}

// ── NAVIGATION ─────────────────────────────────────────────────
const views = ['dashboard', 'add-score', 'students', 'stats'];

function showView(name) {
  views.forEach(v => {
    document.getElementById('view-' + v).classList.toggle('active', v === name);
  });
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === name);
  });
  if (name === 'dashboard') renderDashboard();
  if (name === 'students')  renderStudents();
  if (name === 'stats')     renderStats();
}

document.querySelectorAll('[data-view]').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); showView(el.dataset.view); });
});

// ── ROLE TOGGLE ────────────────────────────────────────────────
document.getElementById('role-teacher').addEventListener('click', () => {
  if (currentUserProfile?.role === 'student') return;
  currentRole = 'teacher';
  currentStudentView = null;
  document.getElementById('role-teacher').classList.add('active');
  document.getElementById('role-student').classList.remove('active');
  document.getElementById('student-select-wrap').style.display = 'none';
  document.querySelectorAll('.teacher-only').forEach(el => el.style.display = '');
  renderDashboard();
  renderStats();
});

document.getElementById('role-student').addEventListener('click', () => {
  currentRole = 'student';
  document.getElementById('role-student').classList.add('active');
  document.getElementById('role-teacher').classList.remove('active');
  document.getElementById('student-select-wrap').style.display = 'block';
  document.querySelectorAll('.teacher-only').forEach(el => el.style.display = 'none');
  populateStudentViewSelect();
  renderDashboard();
});

function populateStudentViewSelect() {
  const sel = document.getElementById('student-view-select');
  sel.innerHTML = students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  if (currentStudentView) {
    sel.value = currentStudentView;
  } else if (students.length > 0) {
    currentStudentView = students[0].id;
    sel.value = currentStudentView;
  }
  sel.onchange = () => {
    currentStudentView = sel.value;
    renderDashboard();
    renderStats();
  };
}

// ── DASHBOARD ──────────────────────────────────────────────────
function renderDashboard() {
  const filteredScores   = (currentRole === 'student' && currentStudentView)
    ? scores.filter(s => s.studentId === currentStudentView) : scores;
  const filteredStudents = (currentRole === 'student' && currentStudentView)
    ? students.filter(s => s.id === currentStudentView) : students;

  document.getElementById('stat-total-students').textContent = filteredStudents.length;
  document.getElementById('stat-total-tests').textContent    = filteredScores.length;

  if (filteredScores.length) {
    const avg  = Math.round(filteredScores.reduce((a, s) => a + (s.got / s.max * 100), 0) / filteredScores.length);
    const pass = Math.round(filteredScores.filter(s => s.got / s.max >= 0.76).length / filteredScores.length * 100);
    document.getElementById('stat-avg').textContent  = avg + '%';
    document.getElementById('stat-pass').textContent = pass + '%';
  } else {
    document.getElementById('stat-avg').textContent  = '—';
    document.getElementById('stat-pass').textContent = '—';
  }

  const sub = document.getElementById('dash-sub');
  if (currentRole === 'student' && currentStudentView) {
    const st = students.find(s => s.id === currentStudentView);
    sub.textContent = st ? st.name + ' 학생 현황' : '학생 현황';
  } else {
    sub.textContent = '전체 학생 현황';
  }

  const recent = [...filteredScores].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 10);
  const tbody = document.getElementById('recent-tbody');
  const empty = document.getElementById('recent-empty');

  if (recent.length === 0) {
    tbody.innerHTML = ''; empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = recent.map(s => {
      const st  = students.find(x => x.id === s.studentId);
      const pct = Math.round(s.got / s.max * 100);
      const tier = getTier(pct);
      const step = pct >= 76 ? '다음 챕터 진행' : pct >= 56 ? '보충 병행' : '복습 후 진행';
      return `<tr>
        <td>${st ? st.name : '—'}</td><td>${s.chapter}</td><td>${s.date}</td>
        <td><strong>${s.got}</strong>/${s.max} <span style="color:var(--text-2);font-size:12px">(${pct}%)</span></td>
        <td><span class="badge badge-${tier}">${pct}%</span></td>
        <td style="font-size:13px;color:var(--text-2)">${step}</td>
      </tr>`;
    }).join('');
  }
}

// ── SCORE FORM ─────────────────────────────────────────────────
function populateStudentSelects() {
  const opts = ['<option value="">학생 선택…</option>',
    ...students.map(s => `<option value="${s.id}">${s.name}</option>`)
  ].join('');
  document.getElementById('score-student').innerHTML = opts;
  document.getElementById('detail-student').innerHTML = opts;
}

function setTodayDates() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('score-date').value = today;
  document.getElementById('detail-date').value = today;
}

function updatePreview() {
  const got = parseFloat(document.getElementById('score-got').value);
  const max = parseFloat(document.getElementById('score-max').value);
  const el  = document.getElementById('score-preview');
  if (!isNaN(got) && !isNaN(max) && max > 0) {
    const pct = Math.round(got / max * 100);
    el.textContent = pct + '%';
    const t = getTier(pct);
    el.style.color = t === 'green' ? 'var(--green)' : t === 'amber' ? 'var(--amber)' : 'var(--red)';
  } else { el.textContent = '—'; el.style.color = ''; }
}
document.getElementById('score-got').addEventListener('input', updatePreview);
document.getElementById('score-max').addEventListener('input', updatePreview);

document.getElementById('tab-total').addEventListener('click', () => {
  document.getElementById('tab-total').classList.add('active');
  document.getElementById('tab-detail').classList.remove('active');
  document.getElementById('form-total').style.display = '';
  document.getElementById('form-detail').style.display = 'none';
});
document.getElementById('tab-detail').addEventListener('click', () => {
  document.getElementById('tab-detail').classList.add('active');
  document.getElementById('tab-total').classList.remove('active');
  document.getElementById('form-total').style.display = 'none';
  document.getElementById('form-detail').style.display = '';
  renderDetailForm();
});

// MCQ + FRQ configs (unchanged — do not modify)
const MCQ_CONFIG = [
  { q: 'Q1', section: '1.1 Functions',      pts: 2 },
  { q: 'Q2', section: '1.1 Domain',         pts: 2 },
  { q: 'Q3', section: '1.2 Transformation', pts: 2 },
  { q: 'Q4', section: '1.3 Slope',          pts: 2 },
  { q: 'Q5', section: '1.4 Linear',         pts: 2 },
  { q: 'Q6', section: '1.5 Equation',       pts: 2 },
  { q: 'Q7', section: '1.6 Two Lines',      pts: 2 },
  { q: 'Q8', section: '1.8 Abs. Value',     pts: 2 },
  { q: 'Q9', section: '1.9 Abs. Ineq.',     pts: 2 },
];
const FRQ_CONFIG = [
  { q: 'Q10', section: '1.1+1.2',       maxPts: 6, parts: ['(a)2','(b)2','(c)2'] },
  { q: 'Q11', section: '1.3+1.5',       maxPts: 6, parts: ['(a)2','(b)2','(c)2'] },
  { q: 'Q12', section: '1.4+1.6',       maxPts: 6, parts: ['(a)3','(b)3']        },
  { q: 'Q13', section: '1.7 Piecewise', maxPts: 7, parts: ['(a)3','(b)4']        },
  { q: 'Q14', section: '1.8+1.9',       maxPts: 7, parts: ['(a)3','(b)2','(c)2'] },
];

let mcqState = {};
let frqState = {};

function renderDetailForm() {
  mcqState = {}; frqState = {};
  MCQ_CONFIG.forEach(q => { mcqState[q.q] = null; });
  FRQ_CONFIG.forEach(q => { frqState[q.q] = 0; });

  document.getElementById('mcq-grid').innerHTML = MCQ_CONFIG.map(q => `
    <div class="q-item" id="qi-${q.q}">
      <div>
        <div class="q-label">${q.q}</div>
        <div style="font-size:11px;color:var(--text-3)">${q.section}</div>
      </div>
      <div class="q-btns">
        <button class="q-btn" data-q="${q.q}" data-v="true"  title="정답">O</button>
        <button class="q-btn" data-q="${q.q}" data-v="false" title="오답">X</button>
      </div>
    </div>`).join('');

  document.querySelectorAll('.q-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      const v = btn.dataset.v === 'true';
      mcqState[q] = mcqState[q] === v ? null : v;
      document.querySelectorAll(`[data-q="${q}"]`).forEach(b => {
        b.classList.remove('correct', 'wrong');
        if (mcqState[q] === true  && b.dataset.v === 'true')  b.classList.add('correct');
        if (mcqState[q] === false && b.dataset.v === 'false') b.classList.add('wrong');
      });
      updateAutoScore();
    });
  });

  document.getElementById('frq-grid').innerHTML = FRQ_CONFIG.map(q => `
    <div class="frq-item">
      <div class="frq-label">
        ${q.q} <span style="font-size:11px;color:var(--text-3)">${q.section}</span>
        <div style="font-size:11px;color:var(--text-3);margin-top:2px">배점: ${q.parts.join(' / ')}</div>
      </div>
      <input class="frq-pts-input" type="number" min="0" max="${q.maxPts}"
        data-frq="${q.q}" data-max="${q.maxPts}" value="0">
      <span class="frq-max">/ ${q.maxPts}</span>
    </div>`).join('');

  document.querySelectorAll('.frq-pts-input').forEach(inp => {
    inp.addEventListener('input', () => {
      frqState[inp.dataset.frq] = Math.min(parseFloat(inp.value) || 0, parseFloat(inp.dataset.max));
      updateAutoScore();
    });
  });

  updateAutoScore();
}

function updateAutoScore() {
  let mcqTotal = 0;
  MCQ_CONFIG.forEach(q => { if (mcqState[q.q] === true) mcqTotal += q.pts; });
  let frqTotal = 0;
  FRQ_CONFIG.forEach(q => { frqTotal += frqState[q.q] || 0; });
  const maxMCQ = MCQ_CONFIG.reduce((a, q) => a + q.pts, 0);
  const maxFRQ = FRQ_CONFIG.reduce((a, q) => a + q.maxPts, 0);
  const got = mcqTotal + frqTotal;
  const max = maxMCQ + maxFRQ;
  document.getElementById('auto-score').textContent = got;
  document.getElementById('auto-max').textContent   = max;
  const pct   = max > 0 ? Math.round(got / max * 100) : 0;
  const badge = document.getElementById('auto-badge');
  badge.textContent = pct + '%';
  badge.className   = 'badge badge-' + getTier(pct);
}

document.getElementById('btn-save-score').addEventListener('click', async () => {
  const isDetail = document.getElementById('tab-detail').classList.contains('active');
  const btn      = document.getElementById('btn-save-score');
  let entryData;

  if (!isDetail) {
    const studentId = document.getElementById('score-student').value;
    const chapter   = document.getElementById('score-chapter').value;
    const date      = document.getElementById('score-date').value;
    const got       = parseFloat(document.getElementById('score-got').value);
    const max       = parseFloat(document.getElementById('score-max').value);
    const note      = document.getElementById('score-note').value.trim();
    if (!studentId || !chapter || !date || isNaN(got) || isNaN(max)) {
      showMsg('모든 필수 항목을 입력해주세요.', 'red'); return;
    }
    entryData = { studentId, chapter, date, got, max, note, mode: 'total', detail: null };
  } else {
    const studentId = document.getElementById('detail-student').value;
    const chapter   = document.getElementById('detail-chapter').value;
    const date      = document.getElementById('detail-date').value;
    const note      = document.getElementById('detail-note').value.trim();
    if (!studentId || !chapter || !date) { showMsg('학생, 챕터, 날짜를 선택해주세요.', 'red'); return; }
    let got = 0;
    const detailData = { mcq: {}, frq: {} };
    MCQ_CONFIG.forEach(q => {
      detailData.mcq[q.q] = mcqState[q.q];
      if (mcqState[q.q] === true) got += q.pts;
    });
    FRQ_CONFIG.forEach(q => {
      detailData.frq[q.q] = frqState[q.q] || 0;
      got += frqState[q.q] || 0;
    });
    const max = MCQ_CONFIG.reduce((a, q) => a + q.pts, 0) + FRQ_CONFIG.reduce((a, q) => a + q.maxPts, 0);
    entryData = { studentId, chapter, date, got, max, note, mode: 'detail', detail: detailData };
  }

  btn.textContent = '저장 중...'; btn.disabled = true;
  try {
    await addDoc(collection(db, 'scores'), {
      ...entryData, createdBy: currentUser.uid, createdAt: serverTimestamp()
    });
    const st = students.find(s => s.id === entryData.studentId);
    showResultCard(entryData, st);
    showMsg('저장됐습니다!', 'green');
    document.getElementById('score-got').value = '';
    document.getElementById('score-note').value = '';
    document.getElementById('score-preview').textContent = '—';
    document.getElementById('score-preview').style.color = '';
    document.getElementById('detail-note').value = '';
    if (document.getElementById('tab-detail').classList.contains('active')) renderDetailForm();
  } catch (err) {
    showMsg('저장 오류: ' + err.message, 'red');
  }
  btn.textContent = '저장'; btn.disabled = false;
});

function showMsg(msg, color) {
  const el = document.getElementById('save-msg');
  el.textContent = msg;
  el.style.color = color === 'red' ? 'var(--red)' : 'var(--green)';
  setTimeout(() => { el.textContent = ''; }, 3000);
}

function showResultCard(entry, st) {
  const pct  = Math.round(entry.got / entry.max * 100);
  const tier = getTier(pct);
  const task = getSelfStudyTask(pct);

  document.getElementById('result-pct').textContent     = pct + '%';
  document.getElementById('result-name').textContent    = st ? st.name : '—';
  document.getElementById('result-chapter').textContent = entry.chapter + '  ·  ' + entry.got + '/' + entry.max + '점  ·  ' + entry.date;

  const tierEl = document.getElementById('result-tier');
  tierEl.textContent = getTierLabel(pct);
  tierEl.style.color = tier === 'green' ? 'var(--green)' : tier === 'amber' ? 'var(--amber)' : 'var(--red)';

  document.getElementById('result-step').textContent = getNextStep(pct);

  const taskEl = document.getElementById('result-task');
  if (task) {
    taskEl.textContent = task;
    taskEl.className   = 'result-task task-' + tier;
    taskEl.style.display = '';
  } else {
    taskEl.style.display = 'none';
  }
  document.getElementById('result-card').style.display = '';
}

// ── STUDENTS ───────────────────────────────────────────────────
document.getElementById('btn-add-student').addEventListener('click', async () => {
  const name        = document.getElementById('new-student-name').value.trim();
  const school      = document.getElementById('new-student-school').value.trim();
  const linkedEmail = document.getElementById('new-student-email').value.trim().toLowerCase();
  if (!name) return;
  try {
    await addDoc(collection(db, 'students'), {
      name, school, linkedEmail, createdBy: currentUser.uid, createdAt: serverTimestamp()
    });
    document.getElementById('new-student-name').value  = '';
    document.getElementById('new-student-school').value = '';
    document.getElementById('new-student-email').value  = '';
  } catch (err) { alert('학생 추가 오류: ' + err.message); }
});

function initials(name) { return name.slice(0, 2).toUpperCase(); }

function renderStudents() {
  const container = document.getElementById('student-cards');
  if (students.length === 0) {
    container.innerHTML = '<p style="color:var(--text-3);font-size:13px;padding:1rem 0">학생이 없습니다. 위에서 추가해주세요.</p>';
    return;
  }
  container.innerHTML = '<div class="student-cards-grid">' +
    students.map(st => {
      const stScores = scores.filter(s => s.studentId === st.id);
      const avg      = stScores.length
        ? Math.round(stScores.reduce((a, s) => a + s.got / s.max * 100, 0) / stScores.length) : null;
      const last     = [...stScores].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
      const history  = [...stScores].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);

      return `<div class="student-card">
        <div class="student-card-header">
          <div class="avatar">${initials(st.name)}</div>
          <div class="student-name-block">
            <div class="s-name">${st.name}</div>
            <div class="s-school">${st.school || '학교 미입력'}</div>
            ${st.linkedEmail ? `<div class="s-email">${st.linkedEmail}</div>` : ''}
          </div>
          <button class="delete-btn teacher-only" data-del="${st.id}" title="삭제">✕</button>
        </div>
        <div class="student-stats">
          <div class="s-stat"><div class="s-stat-num">${stScores.length}</div><div class="s-stat-label">테스트 횟수</div></div>
          <div class="s-stat"><div class="s-stat-num">${avg !== null ? avg + '%' : '—'}</div><div class="s-stat-label">평균 성취도</div></div>
          <div class="s-stat"><div class="s-stat-num">${last ? Math.round(last.got / last.max * 100) + '%' : '—'}</div><div class="s-stat-label">최근 성취도</div></div>
        </div>
        <div class="student-history">
          ${history.length === 0
            ? '<div style="font-size:12px;color:var(--text-3);padding-top:8px">기록 없음</div>'
            : history.map(s => {
                const pct = Math.round(s.got / s.max * 100);
                return `<div class="history-row">
                  <span class="history-chapter">${s.chapter}</span>
                  <span style="font-size:12px;color:var(--text-2)">${s.date}</span>
                  <span class="badge badge-${getTier(pct)}">${pct}%</span>
                </div>`;
              }).join('')
          }
        </div>
      </div>`;
    }).join('') + '</div>';

  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => deleteStudent(btn.dataset.del));
  });

  if (currentRole === 'student') {
    document.querySelectorAll('.teacher-only').forEach(el => el.style.display = 'none');
  }
}

async function deleteStudent(studentId) {
  if (!confirm('이 학생과 모든 점수 기록을 삭제할까요?')) return;
  try {
    const batch    = writeBatch(db);
    batch.delete(doc(db, 'students', studentId));
    const snapDocs = await getDocs(query(collection(db, 'scores'), where('studentId', '==', studentId)));
    snapDocs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (err) { alert('삭제 오류: ' + err.message); }
}

// ── STATS ──────────────────────────────────────────────────────
let chartChapter = null, chartDist = null, chartTrend = null;

function populateStatsFilter() {
  const sel = document.getElementById('stats-student-filter');
  sel.innerHTML = '<option value="all">전체 학생</option>' +
    students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

document.getElementById('stats-student-filter').addEventListener('change', renderStats);

function renderStats() {
  const filterVal = document.getElementById('stats-student-filter').value;
  let filteredScores = filterVal === 'all' ? scores : scores.filter(s => s.studentId === filterVal);
  if (currentRole === 'student' && currentStudentView) {
    filteredScores = scores.filter(s => s.studentId === currentStudentView);
  }

  const sorted = [...filteredScores].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const tbody  = document.getElementById('all-tbody');
  const empty  = document.getElementById('all-empty');

  if (sorted.length === 0) {
    tbody.innerHTML = ''; empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = sorted.map(s => {
      const st  = students.find(x => x.id === s.studentId);
      const pct = Math.round(s.got / s.max * 100);
      const step = pct >= 76 ? '다음 챕터' : pct >= 56 ? '보충 병행' : '복습 후 진행';
      const delBtn = currentRole === 'teacher'
        ? `<td><button class="delete-btn" data-del-score="${s.id}">✕</button></td>`
        : '<td></td>';
      return `<tr>
        <td>${st ? st.name : '—'}</td><td>${s.chapter}</td><td>${s.date}</td>
        <td><strong>${s.got}</strong>/${s.max} <span style="color:var(--text-2);font-size:12px">(${pct}%)</span></td>
        <td><span class="badge badge-${getTier(pct)}">${pct}%</span></td>
        <td style="font-size:13px;color:var(--text-2)">${step}</td>
        ${delBtn}
      </tr>`;
    }).join('');

    document.querySelectorAll('[data-del-score]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('이 점수 기록을 삭제할까요?')) return;
        try {
          await deleteDoc(doc(db, 'scores', btn.dataset.delScore));
        } catch (err) { alert('삭제 오류: ' + err.message); }
      });
    });
  }

  // Chart 1: Chapter averages
  const chapters    = ['Ch.1','Ch.2','Ch.3','Ch.4','Ch.5','Ch.6'];
  const chapterAvgs = chapters.map(ch => {
    const rel = filteredScores.filter(s => s.chapter === ch);
    return rel.length ? Math.round(rel.reduce((a, s) => a + s.got / s.max * 100, 0) / rel.length) : null;
  });
  if (chartChapter) chartChapter.destroy();
  chartChapter = new Chart(document.getElementById('chart-chapter'), {
    type: 'bar',
    data: {
      labels: chapters,
      datasets: [{ label: '평균 성취도 (%)', data: chapterAvgs, borderWidth: 1.5, borderRadius: 5,
        backgroundColor: chapterAvgs.map(v => v === null ? '#e5e5e5' : v >= 76 ? '#d8f3dc' : v >= 56 ? '#fef3c7' : '#fee2e2'),
        borderColor:     chapterAvgs.map(v => v === null ? '#ccc'    : v >= 76 ? '#2d6a4f' : v >= 56 ? '#92400e' : '#991b1b'),
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + '%', font: { size: 12 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { ticks: { font: { size: 12 } }, grid: { display: false } }
      }
    }
  });

  // Chart 2: Distribution
  const green = filteredScores.filter(s => s.got / s.max >= 0.76).length;
  const amber = filteredScores.filter(s => s.got / s.max >= 0.56 && s.got / s.max < 0.76).length;
  const red   = filteredScores.filter(s => s.got / s.max < 0.56).length;
  if (chartDist) chartDist.destroy();
  chartDist = new Chart(document.getElementById('chart-dist'), {
    type: 'doughnut',
    data: {
      labels: ['76%+ (진행)', '56–75% (보충)', '~55% (복습)'],
      datasets: [{ data: [green, amber, red], borderWidth: 1.5,
        backgroundColor: ['#d8f3dc','#fef3c7','#fee2e2'],
        borderColor:     ['#2d6a4f','#92400e','#991b1b'],
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } } },
      cutout: '60%'
    }
  });

  // Chart 3: Trend
  const trendData   = [...filteredScores].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const multiStudent = filterVal === 'all' && students.length > 1 && currentRole === 'teacher';
  if (chartTrend) chartTrend.destroy();

  if (multiStudent) {
    const colors   = ['#2d6a4f','#92400e','#1e40af','#7c3aed','#be185d'];
    const datasets = students.map((st, i) => ({
      label: st.name,
      data:  trendData.filter(s => s.studentId === st.id).map(s => ({ x: s.date, y: Math.round(s.got / s.max * 100) })),
      borderColor: colors[i % colors.length], backgroundColor: 'transparent',
      tension: 0.3, pointRadius: 4, borderWidth: 2,
    }));
    chartTrend = new Chart(document.getElementById('chart-trend'), {
      type: 'line', data: { datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } } },
        scales: {
          x: { type: 'category', ticks: { font: { size: 11 } }, grid: { display: false } },
          y: { min: 0, max: 100, ticks: { callback: v => v + '%', font: { size: 12 } }, grid: { color: 'rgba(0,0,0,0.05)' } }
        }
      }
    });
  } else {
    chartTrend = new Chart(document.getElementById('chart-trend'), {
      type: 'line',
      data: {
        labels:   trendData.map(s => s.chapter + ' ' + s.date),
        datasets: [{ label: '성취도 (%)', data: trendData.map(s => Math.round(s.got / s.max * 100)),
          borderColor: '#1a1917', backgroundColor: 'rgba(26,25,23,0.06)',
          fill: true, tension: 0.3, pointRadius: 5, borderWidth: 2,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 11 }, maxRotation: 30 }, grid: { display: false } },
          y: { min: 0, max: 100, ticks: { callback: v => v + '%', font: { size: 12 } }, grid: { color: 'rgba(0,0,0,0.05)' } }
        }
      }
    });
  }
}
