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

export function computeBadges(attempts) {
  const totalPoints = attempts.reduce((sum, a) => sum + (a.points || 0), 0);
  const streak = computeStreak(attempts);
  const hasFlawless = attempts.some((a) => {
    const lines = a.marked_lines || [];
    return lines.length > 0 && lines.every((l) => l.verdict !== 'error');
  });

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
    return lastThree.every((a) => {
      const lines = a.marked_lines || [];
      return lines.length > 0 && lines.every((l) => l.verdict !== 'error');
    });
  });

  return [
    { id: 'first', label: 'First Steps', description: 'Complete your first attempt', unlocked: attempts.length >= 1 },
    { id: 'flawless', label: 'Clean Sheet', description: 'Get a full attempt with no errors', unlocked: hasFlawless },
    { id: 'streak7', label: 'Week of Work', description: '7-day practice streak', unlocked: streak >= 7 },
    { id: 'century', label: 'Century', description: 'Earn 100 points', unlocked: totalPoints >= 100 },
    { id: 'mastered', label: 'Topic Mastered', description: '3 flawless attempts in a row on one topic', unlocked: !!masteredTopic }
  ];
}
