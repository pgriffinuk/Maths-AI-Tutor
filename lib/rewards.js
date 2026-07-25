export function pointsForLines(lines) {
  if (!lines || lines.length === 0) return 0;
  let pts = 0;
  let allCorrect = true;
  for (const line of lines) {
    if (line.verdict === 'correct') pts += 3;
    else if (line.verdict === 'method') pts += 1;
    else allCorrect = false;
  }
  if (allCorrect) pts += 5; // flawless-attempt bonus
  return pts;
}

export function computeStreak(attempts) {
  if (!attempts || attempts.length === 0) return 0;
  const days = [...new Set(attempts.map((a) => new Date(a.created_at).toDateString()))]
    .map((d) => new Date(d))
    .sort((a, b) => b - a);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  if (days[0].getTime() !== today.getTime() && days[0].getTime() !== yesterday.getTime()) {
    return 0; // streak broken - last practice wasn't today or yesterday
  }

  let streak = 1;
  for (let i = 0; i < days.length - 1; i++) {
    const diff = (days[i] - days[i + 1]) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

// A marked attempt with at least one line and no error verdicts - the bar
// used both for the "Clean Sheet" badge and for judging topic mastery in
// Guided Path mode (see computeTopicStatus below).
function isFlawless(attempt) {
  const lines = attempt.marked_lines || [];
  return lines.length > 0 && lines.every((l) => l.verdict !== 'error');
}

export function computeBadges(attempts) {
  const totalPoints = attempts.reduce((sum, a) => sum + (a.points || 0), 0);
  const streak = computeStreak(attempts);
  const hasFlawless = attempts.some(isFlawless);

  // "Topic mastered": 3 flawless attempts in a row on the same course + board
  // + topic (most recent first) - difficulty is deliberately excluded, since
  // practising the same topic at different difficulties should still count
  // toward the same mastery trend, but a GCSE Foundation "Fractions" attempt
  // shouldn't count toward a different course's (or exam board's) history.
  const byCourseTopic = {};
  for (const a of attempts) {
    const key = `${a.course || ''}::${a.board || ''}::${a.topic}`;
    (byCourseTopic[key] = byCourseTopic[key] || []).push(a);
  }
  const masteredTopic = Object.entries(byCourseTopic).find(([, list]) => {
    const sorted = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const lastThree = sorted.slice(0, 3);
    if (lastThree.length < 3) return false;
    return lastThree.every(isFlawless);
  });

  return [
    { id: 'first', label: 'First Steps', description: 'Complete your first attempt', unlocked: attempts.length >= 1 },
    { id: 'flawless', label: 'Clean Sheet', description: 'Get a full attempt with no errors', unlocked: hasFlawless },
    { id: 'streak7', label: 'Week of Work', description: '7-day practice streak', unlocked: streak >= 7 },
    { id: 'century', label: 'Century', description: 'Earn 100 points', unlocked: totalPoints >= 100 },
    { id: 'mastered', label: 'Topic Mastered', description: '3 flawless attempts in a row on one topic', unlocked: !!masteredTopic }
  ];
}

// Deliberately a separate green/gold/grey scale, not the red/gold/green RAG
// set StatusPill uses for diagnostic results - Guided Path status and
// diagnostic status answer different questions (how much you've practised
// vs. how you did on a one-off check), so sharing a colour language between
// them would suggest a connection that isn't there.
export const TOPIC_STATUS_INFO = {
  mastered: { label: 'Mastered', color: 'var(--green)' },
  'in-progress': { label: 'In progress', color: 'var(--gold)' },
  'not-started': { label: 'Not started', color: '#B9C2CB' }
};

// Guided Path's per-topic status, computed live from attempt history - no
// separate table, just the same attempts already fetched for rewards.
// 'mastered' needs 2+ flawless attempts (deliberately a lower bar than the
// "Topic Mastered" badge's 3-in-a-row, since this drives everyday
// navigation rather than a one-off celebration).
export function computeTopicStatus(attempts, course, board, topic) {
  const matching = (attempts || []).filter(
    (a) => a.course === course && a.board === board && a.topic === topic
  );
  if (matching.length === 0) return 'not-started';
  const flawlessCount = matching.filter(isFlawless).length;
  return flawlessCount >= 2 ? 'mastered' : 'in-progress';
}
