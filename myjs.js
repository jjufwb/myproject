/* myjs.js — 투두리스트 앱 메인 스크립트 */

/* ──────────────────────────────────────────
   요소 선택
────────────────────────────────────────── */
const todayDateEl       = document.getElementById('today-date');
const btnOpenModal      = document.getElementById('btn-open-modal');
const modalOverlay      = document.getElementById('modal-overlay');
const btnCancel         = document.getElementById('btn-cancel');
const todoForm          = document.getElementById('todo-form');
const todoInput         = document.getElementById('todo-input');
const inputError        = document.getElementById('input-error');
const todoList          = document.getElementById('todo-list');
const emptyState        = document.getElementById('empty-state');
const progressBar       = document.getElementById('progress-bar');
const progressText      = document.getElementById('progress-text');
const progressWrap      = progressBar.parentElement;
const celebrationOverlay= document.getElementById('celebration-overlay');
const btnReset          = document.getElementById('btn-reset');
const confettiCanvas    = document.getElementById('confetti-canvas');
const ctx               = confettiCanvas.getContext('2d');

/* ──────────────────────────────────────────
   상태
────────────────────────────────────────── */
let todos = [];           // { id, text, done }
let confettiParticles = [];
let confettiRafId = null;
let celebrationShown = false;

/* ──────────────────────────────────────────
   오늘 날짜 표시
────────────────────────────────────────── */
(function setDate() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  todayDateEl.textContent = now.toLocaleDateString('ko-KR', options);
})();

/* ──────────────────────────────────────────
   모달 열기 / 닫기
────────────────────────────────────────── */
function openModal() {
  modalOverlay.hidden = false;
  todoInput.value = '';
  hideError();
  // 약간 지연 후 포커스 (애니메이션 완료 후)
  setTimeout(() => todoInput.focus(), 80);
}

function closeModal() {
  modalOverlay.hidden = true;
  btnOpenModal.focus();
}

btnOpenModal.addEventListener('click', openModal);
btnCancel.addEventListener('click', closeModal);

// 오버레이 바깥 클릭 시 닫기
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// ESC 키로 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!modalOverlay.hidden) closeModal();
    if (!celebrationOverlay.hidden) resetAll();
  }
});

/* ──────────────────────────────────────────
   에러 표시 / 숨기기
────────────────────────────────────────── */
function showError(msg) {
  inputError.textContent = msg;
  inputError.hidden = false;
  todoInput.setAttribute('aria-invalid', 'true');
}

function hideError() {
  inputError.hidden = true;
  todoInput.removeAttribute('aria-invalid');
}

/* ──────────────────────────────────────────
   폼 제출 → 할 일 추가
────────────────────────────────────────── */
todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = todoInput.value.trim();

  if (!text) {
    showError('내용을 입력해 주세요.');
    todoInput.focus();
    return;
  }

  hideError();
  addTodo(text);
  closeModal();
});

todoInput.addEventListener('input', () => {
  if (todoInput.value.trim()) hideError();
});

/* ──────────────────────────────────────────
   할 일 추가
────────────────────────────────────────── */
function addTodo(text) {
  const todo = {
    id: Date.now(),
    text,
    done: false,
  };
  todos.push(todo);
  renderTodo(todo);
  updateUI();
}

/* ──────────────────────────────────────────
   카드 렌더링
────────────────────────────────────────── */
function renderTodo(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item';
  li.dataset.id = todo.id;
  if (todo.done) li.classList.add('done');

  // 체크박스
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-check';
  checkbox.checked = todo.done;
  checkbox.setAttribute('aria-label', `"${todo.text}" 완료 표시`);

  checkbox.addEventListener('change', () => {
    todo.done = checkbox.checked;
    li.classList.toggle('done', todo.done);
    updateUI();
  });

  // 텍스트
  const span = document.createElement('span');
  span.className = 'todo-text';
  span.textContent = todo.text;

  // 삭제 버튼
  const btnDel = document.createElement('button');
  btnDel.className = 'btn-delete';
  btnDel.setAttribute('aria-label', `"${todo.text}" 삭제`);
  btnDel.innerHTML = '&#10005;';   // ✕

  btnDel.addEventListener('click', () => {
    // 카드 제거 애니메이션
    li.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
    li.style.opacity = '0';
    li.style.transform = 'translateX(24px)';
    setTimeout(() => {
      todos = todos.filter(t => t.id !== todo.id);
      li.remove();
      updateUI();
    }, 230);
  });

  li.append(checkbox, span, btnDel);
  todoList.appendChild(li);
}

/* ──────────────────────────────────────────
   UI 업데이트 (진행률 바 + 빈 상태 + 축하)
────────────────────────────────────────── */
function updateUI() {
  const total = todos.length;
  const done  = todos.filter(t => t.done).length;

  // 빈 상태
  emptyState.classList.toggle('hidden', total > 0);

  // 진행률 바
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  progressBar.style.width = pct + '%';
  progressWrap.setAttribute('aria-valuenow', pct);
  progressText.textContent = `${done} / ${total} 완료`;

  // 축하 — 할 일이 1개 이상이고 전부 완료됐을 때만
  if (total > 0 && done === total && !celebrationShown) {
    celebrationShown = true;
    setTimeout(showCelebration, 300);
  }
}

/* ──────────────────────────────────────────
   축하 화면 표시
────────────────────────────────────────── */
function showCelebration() {
  startConfetti();
  celebrationOverlay.hidden = false;
  // 포커스 트랩
  btnReset.focus();
}

/* ──────────────────────────────────────────
   전체 리셋
────────────────────────────────────────── */
function resetAll() {
  todos = [];
  celebrationShown = false;
  todoList.innerHTML = '';
  celebrationOverlay.hidden = true;
  stopConfetti();
  updateUI();
}

btnReset.addEventListener('click', resetAll);

/* ──────────────────────────────────────────
   컨페티 (순수 Canvas)
────────────────────────────────────────── */
const CONFETTI_COLORS = [
  '#5b6ef5', '#ff7b7b', '#34c97e', '#ffd166',
  '#a78bfa', '#f472b6', '#38bdf8', '#fb923c',
];
const PARTICLE_COUNT = 140;

function resizeCanvas() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function createParticle() {
  return {
    x: Math.random() * confettiCanvas.width,
    y: Math.random() * -confettiCanvas.height * 0.3 - 20,
    w: Math.random() * 10 + 5,
    h: Math.random() * 6 + 3,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    vx: (Math.random() - 0.5) * 3.5,
    vy: Math.random() * 3 + 2,
    angle: Math.random() * Math.PI * 2,
    angleSpeed: (Math.random() - 0.5) * 0.2,
    opacity: 1,
    life: 1,
    decay: Math.random() * 0.006 + 0.003,
  };
}

function startConfetti() {
  confettiParticles = Array.from({ length: PARTICLE_COUNT }, createParticle);
  animateConfetti();
}

function stopConfetti() {
  if (confettiRafId) {
    cancelAnimationFrame(confettiRafId);
    confettiRafId = null;
  }
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles = [];
}

function animateConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  confettiParticles.forEach((p) => {
    // 위치 업데이트
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.06;         // 중력
    p.angle += p.angleSpeed;
    p.life -= p.decay;
    p.opacity = Math.max(0, p.life);

    // 그리기
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  });

  // 수명 다한 파티클 재활용 (3초간 연속 발사)
  confettiParticles = confettiParticles.map((p) => {
    if (p.life <= 0 || p.y > confettiCanvas.height + 20) {
      return createParticle();   // 새 파티클로 교체
    }
    return p;
  });

  confettiRafId = requestAnimationFrame(animateConfetti);

  // 축하창이 사라지면 컨페티도 중단
  if (celebrationOverlay.hidden) {
    stopConfetti();
  }
}

