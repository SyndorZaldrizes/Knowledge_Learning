// Math Quest core utilities + local progress store
const MQ = (() => {
  const PLAYER_KEY = 'mq_player_code_v1';
  const PROGRESS_KEY = 'mq_progress_v1';
  const QUESTION_COUNT_KEY = 'mq_question_count_v1';

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }

  function getPlayerCode() {
    return localStorage.getItem(PLAYER_KEY) || '';
  }

  function setPlayerCode(code) {
    // 3–24 chars, A-Z 0-9 dash
    const cleaned = (code || '').trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,24}$/.test(cleaned)) return false;
    localStorage.setItem(PLAYER_KEY, cleaned);
    return true;
  }

  function getQuestionCount() {
    const stored = localStorage.getItem(QUESTION_COUNT_KEY);
    const num = Number(stored);
    return (Number.isNaN(num) || num < 10 || num > 100) ? 10 : num;
  }

  function setQuestionCount(n) {
    const num = Number(n);
    if (Number.isNaN(num)) return false;
    const clamped = Math.max(10, Math.min(100, num));
    // Round to nearest allowed value: 10, 20, 30, 50, 100
    const allowed = [10, 20, 30, 50, 100];
    let closest = allowed[0];
    let minDiff = Math.abs(clamped - closest);
    for (let val of allowed) {
      const diff = Math.abs(clamped - val);
      if (diff < minDiff) {
        minDiff = diff;
        closest = val;
      }
    }
    localStorage.setItem(QUESTION_COUNT_KEY, closest);
    return true;
  }

  function getProgress() {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const data = safeParse(raw, null);
    if (data && typeof data === 'object') return data;
    return { sessions: [], lastPracticeDate: null };
  }

  function setProgress(data) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  }

  function todayISO() {
    const d = new Date();
    // local date string (YYYY-MM-DD)
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function daysBetween(aISO, bISO) {
    const a = new Date(aISO + 'T00:00:00');
    const b = new Date(bISO + 'T00:00:00');
    const ms = b - a;
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  function getStreakDays(lastPracticeDate) {
    if (!lastPracticeDate) return 0;
    const delta = daysBetween(lastPracticeDate, todayISO());
    // If they practiced today => streak continues (report at least 1)
    // If last practice was yesterday => streak continues (report 1+ but we don't track chain length yet)
    // MVP: just "active streak" indicator; we can upgrade to full streak chain later.
    if (delta === 0) return 1;
    if (delta === 1) return 1;
    return 0;
  }

  function recordSession(session) {
    const data = getProgress();
    data.sessions = Array.isArray(data.sessions) ? data.sessions : [];
    data.sessions.push(session);
    data.lastPracticeDate = todayISO();
    setProgress(data);
  }

  function resetProgress() {
    localStorage.removeItem(PROGRESS_KEY);
  }

  function exportProgressBlob() {
    const payload = {
      version: 1,
      playerCode: getPlayerCode() || 'GUEST',
      progress: getProgress(),
      exportedAt: new Date().toISOString()
    };
    return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  }

  function importProgress(text) {
    const payload = safeParse(text, null);
    if (!payload || payload.version !== 1 || !payload.progress) return false;
    // merge: keep whichever has more sessions
    const incoming = payload.progress;
    const current = getProgress();
    const inCount = (incoming.sessions || []).length;
    const curCount = (current.sessions || []).length;
    const chosen = (inCount >= curCount) ? incoming : current;
    setProgress(chosen);
    return true;
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  return {
    getPlayerCode,
    setPlayerCode,
    getProgress,
    recordSession,
    resetProgress,
    exportProgressBlob,
    importProgress,
    randInt,
    getStreakDays,
    getQuestionCount,
    setQuestionCount
  };
})();
