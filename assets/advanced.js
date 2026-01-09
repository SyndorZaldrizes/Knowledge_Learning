// Advanced missions engine. Minimal modular structure so topics can be added incrementally.
// Depends on MQ (assets/app.js) and AdvancedStore (assets/storage.js)
(() => {
  // Topic definitions (name, generator, inputMode: 'mc' | 'text')
  const TOPICS = {
    middle: [
      { id: 'integers', title: 'Integers (± add/sub/mul/div)', mode: 'integers', input: 'text' },
      { id: 'fractions', title: 'Fractions (simplify, add/sub, mul/div)', mode: 'fractions', input: 'text' },
      { id: 'decimals', title: 'Decimals & Percents', mode: 'decimals', input: 'text' },
      { id: 'ratios', title: 'Ratios & Proportions', mode: 'ratios', input: 'text' },
      { id: 'geometry', title: 'Basic Geometry (area/perimeter/volume)', mode: 'geometry', input: 'text' }
    ],
    high: [
      { id: 'algebra', title: 'Algebra (linear equations)', mode: 'algebra', input: 'text' },
      { id: 'exponents', title: 'Exponents & Radicals', mode: 'exponents', input: 'text' },
      { id: 'functions', title: 'Functions (evaluate)', mode: 'functions', input: 'text' },
      { id: 'coord', title: 'Coordinate Geometry (slope, distance)', mode: 'coord', input: 'text' },
      { id: 'prob', title: 'Intro Probability & Stats', mode: 'prob', input: 'text' }
    ]
  };

  // Minimal question generators and validators. Keep deterministic guardrails.
  function genIntegerQuestion(level) {
    // For middle: small ranges, for high use larger ranges
    const range = level === 'middle' ? 10 : 50;
    const a = MQ.randInt(-range, range);
    const b = MQ.randInt(-range, range);
    const ops = ['+', '-', '*', '/'];
    const op = ops[MQ.randInt(0, ops.length - 1)];
    // If division, ensure integer result
    if (op === '/') {
      const divisor = (b === 0) ? MQ.randInt(1, range) : b;
      const product = a * divisor; // ensure a divisible by divisor
      return { q: `${product} ÷ ${divisor} = ?`, a: (product / divisor), answer: String(product / divisor), input: 'text' };
    }
    const expr = `${a} ${op} ${b}`;
    let ans = 0;
    switch (op) {
      case '+': ans = a + b; break;
      case '-': ans = a - b; break;
      case '*': ans = a * b; break;
    }
    return { q: `${expr} = ?`, a: ans, answer: String(ans), input: 'text' };
  }

  function gcd(a,b){ return b===0?Math.abs(a):gcd(b,a%b); }
  function normalizeFraction(numer, denom){
    if (denom === 0) return null;
    const sign = (denom < 0) ? -1 : 1;
    numer *= sign; denom *= sign;
    const g = gcd(numer, denom);
    return `${numer/g}/${denom/g}`;
  }

  function genFractionQuestion(level) {
    // Simple fractions avoiding large denominators
    const max = level === 'middle' ? 12 : 20;
    const a = MQ.randInt(1, max);
    const b = MQ.randInt(1, max);
    const ops = ['+', '-', '*', '/'];
    const op = ops[MQ.randInt(0, ops.length - 1)];

    if (op === '+') {
      // a/b + c/d
      const c = MQ.randInt(1, max);
      const d = MQ.randInt(1, max);
      const numer = a * d + c * b;
      const denom = b * d;
      const ans = normalizeFraction(numer, denom);
      return { q: `${a}/${b} + ${c}/${d} = ? (answer as fraction)`, answer: ans, input: 'text' };
    }
    if (op === '-') {
      const c = MQ.randInt(1, max);
      const d = MQ.randInt(1, max);
      const numer = a * d - c * b;
      const denom = b * d;
      const ans = normalizeFraction(numer, denom);
      return { q: `${a}/${b} - ${c}/${d} = ? (answer as fraction)`, answer: ans, input: 'text' };
    }
    if (op === '*') {
      const c = MQ.randInt(1, max);
      const d = MQ.randInt(1, max);
      const numer = a * c;
      const denom = b * d;
      const ans = normalizeFraction(numer, denom);
      return { q: `${a}/${b} × ${c}/${d} = ? (answer as fraction)`, answer: ans, input: 'text' };
    }
    // division
    const c = MQ.randInt(1, max);
    const d = MQ.randInt(1, max);
    const numer = a * d;
    const denom = b * c;
    const ans = normalizeFraction(numer, denom);
    return { q: `${a}/${b} ÷ ${c}/${d} = ? (answer as fraction)`, answer: ans, input: 'text' };
  }

  function genAlgebraQuestion(level) {
    // Linear equation ax + b = c
    const range = level === 'middle' ? 10 : 20;
    const a = MQ.randInt(1, 6);
    const x = MQ.randInt(-range, range);
    const b = MQ.randInt(-10, 10);
    const c = a * x + b;
    // present as ax + b = c -> solve for x
    const q = `${a}x ${b>=0?'+':'-'} ${Math.abs(b)} = ${c}. Solve for x.`;
    return { q, answer: String(x), input: 'text' };
  }

  // Validator helpers
  function validateFractionInput(user, correct) {
    // Accept equivalent forms like 1/2 or 2/4; also accept integer if denom 1
    try {
      const [un, ud] = String(user).split('/').map(s => Number(s.trim()));
      if (Number.isNaN(un) || Number.isNaN(ud)) return false;
      const norm = normalizeFraction(un, ud);
      return norm === correct;
    } catch(e){ return false; }
  }

  function validateNumeric(user, correct) {
    const num = Number(String(user).trim());
    const corr = Number(correct);
    if (Number.isNaN(num) || Number.isNaN(corr)) return false;
    // tolerance for decimals
    return Math.abs(num - corr) < 1e-6;
  }

  // UI wiring
  const topicsEl = document.getElementById('topics');
  const difficultyEl = document.getElementById('difficulty');
  const qCountEl = document.getElementById('qCount');
  const missionLengthEl = document.getElementById('missionLength');
  const missionEl = document.getElementById('mission');
  const counterEl = document.getElementById('counter');
  const questionEl = document.getElementById('question');
  const choicesEl = document.getElementById('choices');
  const answerEl = document.getElementById('answer');
  const submitBtn = document.getElementById('submit');
  const feedbackEl = document.getElementById('feedback');
  const playerPill = document.getElementById('playerPill');
  const streakPill = document.getElementById('streakPill');
  const resultsEl = document.getElementById('results');
  const scoreLine = document.getElementById('scoreLine');
  const reviewEl = document.getElementById('review');
  const retry = document.getElementById('retry');

  let session = null;

  function renderTopics() {
    const level = difficultyEl.value;
    topicsEl.innerHTML = '';
    TOPICS[level].forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = t.title;
      btn.addEventListener('click', () => startMission(t));
      topicsEl.appendChild(btn);
    });
  }

  function startMission(topicDef) {
    const level = difficultyEl.value;
    const total = Number(qCountEl.value || missionLengthEl.value || 10);
    session = {
      topic: topicDef.title,
      topicId: topicDef.id,
      level,
      total,
      correct: 0,
      current: 0,
      items: [],
      startedAt: new Date().toISOString(),
      category: 'advanced'
    };
    document.getElementById('mission').style.display = '';
    resultsEl.style.display = 'none';
    playerPill.textContent = `Player: ${MQ.getPlayerCode() || 'GUEST'}`;
    streakPill.textContent = `Streak: ${MQ.getStreakDays(MQ.getProgress().lastPracticeDate)}`;
    nextQuestion(topicDef);
  }

  function nextQuestion(topicDef) {
    session.current += 1;
    counterEl.textContent = `Question ${session.current} / ${session.total}`;
    feedbackEl.textContent = '';
    answerEl.value = '';
    choicesEl.innerHTML = '';

    // generate based on topic
    let qobj = { q: '—', answer: '', input: 'text' };
    if (topicDef.mode === 'integers') qobj = genIntegerQuestion(session.level);
    else if (topicDef.mode === 'fractions') qobj = genFractionQuestion(session.level);
    else if (topicDef.mode === 'algebra') qobj = genAlgebraQuestion(session.level);
    else {
      // placeholder: simple integer task
      qobj = genIntegerQuestion(session.level);
    }

    session.items.push({ question: qobj.q, answer: qobj.answer, input: qobj.input });
    questionEl.textContent = qobj.q;
    // if we had multiple choice, populate choicesEl (not implemented broadly yet)
    if (qobj.choices) {
      qobj.choices.forEach(c => {
        const b = document.createElement('button');
        b.className = 'btn';
        b.textContent = c;
        b.addEventListener('click', () => {
          answerEl.value = c;
          submitAnswer(topicDef);
        });
        choicesEl.appendChild(b);
      });
    }

    if (session.current > session.total) return endSession();
  }

  function submitAnswer(topicDef) {
    const currentItem = session.items[session.items.length - 1];
    const user = answerEl.value.trim();
    let correct = false;
    if (topicDef.mode === 'fractions') {
      correct = validateFractionInput(user, currentItem.answer);
    } else if (topicDef.mode === 'integers' || topicDef.mode === 'algebra') {
      correct = validateNumeric(user, currentItem.answer);
    } else {
      correct = validateNumeric(user, currentItem.answer);
    }

    if (correct) {
      session.correct += 1;
      feedbackEl.textContent = 'Correct!';
      feedbackEl.className = 'feedback success';
    } else {
      feedbackEl.textContent = `Incorrect — Answer: ${currentItem.answer}`;
      feedbackEl.className = 'feedback error';
    }

    // allow little pause then next
    setTimeout(() => {
      if (session.current >= session.total) return endSession();
      nextQuestion(topicDef);
    }, 600);
  }

  submitBtn.addEventListener('click', () => submitAnswer({ mode: session.topicId }));
  answerEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAnswer({ mode: session.topicId }); });

  function endSession() {
    // finalize
    session.endedAt = new Date().toISOString();
    session.timestamp = session.endedAt;
    session.scorePct = Math.round((session.correct / session.total) * 100);
    // Record session via AdvancedStore / MQ
    AdvancedStore.recordAdvancedSession({
      mode: `Advanced - ${session.topic}`,
      topic: session.topic,
      level: session.level,
      correct: session.correct,
      total: session.total,
      scorePct: session.scorePct,
      timestamp: session.timestamp,
      category: 'advanced'
    });

    // show results
    document.getElementById('mission').style.display = 'none';
    resultsEl.style.display = '';
    scoreLine.textContent = `Score: ${session.correct}/${session.total} • ${session.scorePct}%`;
    reviewEl.innerHTML = session.items.map((it, i) => `<div class="list-item"><div class="strong">Q${i+1}</div><div>${it.question}</div><div class="muted small">Answer: ${it.answer}</div></div>`).join('');
  }

  retry.addEventListener('click', (e) => { e.preventDefault(); if (!session) return; startMission({ id: session.topicId, title: session.topic, mode: session.topicId, input: 'text' }); });

  difficultyEl.addEventListener('change', renderTopics);
  qCountEl.addEventListener('change', () => {});

  renderTopics();
})();
