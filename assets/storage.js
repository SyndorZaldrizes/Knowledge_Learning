// Small wrapper for advanced-specific progress views using MQ (assets/app.js)
// Keeps the primary storage shape in MQ but provides helpers for Advanced page and progress summary.
const AdvancedStore = (() => {
  function getAllSessions() {
    const data = MQ.getProgress();
    return Array.isArray(data.sessions) ? data.sessions : [];
  }

  function recordAdvancedSession(session) {
    // session should include: { mode, topic, level, correct, total, scorePct, timestamp }
    MQ.recordSession(session);
  }

  function getBestScoresByTopic() {
    const sessions = getAllSessions().filter(s => (s.category || '').startsWith('advanced') || (s.level && (s.level === 'middle' || s.level === 'high')));
    const map = {}; // key -> { topic, level, best, count, lastPlayed, streak }
    sessions.forEach(s => {
      const key = `${s.level || 'adv'}::${s.topic || s.mode}`;
      if (!map[key]) map[key] = { topic: s.topic || s.mode, level: s.level || 'advanced', best: 0, count: 0, lastPlayed: null, streak: 0 };
      map[key].best = Math.max(map[key].best, s.scorePct || 0);
      map[key].count += 1;
      map[key].lastPlayed = s.timestamp;
      // simple streak indicator: if lastPracticeDate equals today, streak 1, else 0
      map[key].streak = MQ.getStreakDays(MQ.getProgress().lastPracticeDate);
    });
    return map;
  }

  function getLastAdvancedSession() {
    const sessions = getAllSessions().filter(s => (s.category || '').startsWith('advanced') || (s.level && (s.level === 'middle' || s.level === 'high')));
    if (sessions.length === 0) return null;
    return sessions.slice().reverse()[0];
  }

  return { getAllSessions, recordAdvancedSession, getBestScoresByTopic, getLastAdvancedSession };
})();
