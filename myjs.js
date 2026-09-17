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
  renderAllTodos();   // 전체 재렌더 (드래그 순서 일관성 유지)
  updateUI();
}

/* ──────────────────────────────────────────
   전체 목록 재렌더
   (드래그 순서 반영 또는 초기 로드 시 사용)
────────────────────────────────────────── */
function renderAllTodos() {
  todoList.innerHTML = '';
  todos.forEach(todo => renderTodo(todo));
}

/* ──────────────────────────────────────────
   드래그 & 드롭 상태
────────────────────────────────────────── */
let dragSrcId = null;   // 현재 드래그 중인 카드의 id

function clearDragIndicators() {
  document.querySelectorAll('.todo-item').forEach(el => {
    el.classList.remove('drag-over-top', 'drag-over-bottom');
  });
}

/* ──────────────────────────────────────────
   카드 렌더링
────────────────────────────────────────── */
function renderTodo(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item';
  li.dataset.id = todo.id;
  if (todo.done) li.classList.add('done');

  /* ── 드래그 핸들 ── */
  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.setAttribute('aria-hidden', 'true');
  handle.textContent = '⠿';

  /* ── 드래그 이벤트 ──
     핸들을 잡을 때만 드래그 시작하도록
     li.draggable 은 mousedown/touchstart 로 토글 */
  handle.addEventListener('mousedown', () => { li.draggable = true; });
  handle.addEventListener('mouseup',   () => { li.draggable = false; });

  li.addEventListener('dragstart', (e) => {
    if (!li.draggable) { e.preventDefault(); return; }
    dragSrcId = todo.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(todo.id));
    // 약간 지연 후 반투명 처리 (ghost 이미지 생성 뒤)
    setTimeout(() => li.classList.add('dragging'), 0);
  });

  li.addEventListener('dragend', () => {
    li.draggable = false;
    li.classList.remove('dragging');
    clearDragIndicators();
    dragSrcId = null;
  });

  li.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragSrcId === todo.id) return;

    clearDragIndicators();

    const rect = li.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      li.classList.add('drag-over-top');
    } else {
      li.classList.add('drag-over-bottom');
    }
  });

  li.addEventListener('dragleave', (e) => {
    // li 내부 자식으로 이동한 경우 무시
    if (li.contains(e.relatedTarget)) return;
    li.classList.remove('drag-over-top', 'drag-over-bottom');
  });

  li.addEventListener('drop', (e) => {
    e.preventDefault();
    if (dragSrcId === null || dragSrcId === todo.id) return;

    const rect = li.getBoundingClientRect();
    const insertBefore = e.clientY < rect.top + rect.height / 2;

    // todos 배열 순서 변경
    const srcIdx  = todos.findIndex(t => t.id === dragSrcId);
    const [moved] = todos.splice(srcIdx, 1);
    const destIdx = todos.findIndex(t => t.id === todo.id);
    todos.splice(insertBefore ? destIdx : destIdx + 1, 0, moved);

    clearDragIndicators();
    renderAllTodos();   // 새 순서로 전체 재렌더
    updateUI();
  });

  /* ── 체크박스 ── */
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

  /* ── 텍스트 ── */
  const span = document.createElement('span');
  span.className = 'todo-text';
  span.textContent = todo.text;

  /* ── 삭제 버튼 ── */
  const btnDel = document.createElement('button');
  btnDel.className = 'btn-delete';
  btnDel.setAttribute('aria-label', `"${todo.text}" 삭제`);
  btnDel.innerHTML = '&#10005;';   // ✕

  btnDel.addEventListener('click', () => {
    li.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
    li.style.opacity = '0';
    li.style.transform = 'translateX(24px)';
    setTimeout(() => {
      todos = todos.filter(t => t.id !== todo.id);
      li.remove();
      updateUI();
    }, 230);
  });

  // 핸들을 맨 앞에 배치
  li.append(handle, checkbox, span, btnDel);
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

