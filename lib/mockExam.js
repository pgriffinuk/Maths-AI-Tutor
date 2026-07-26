// Pure helpers for Mock Exam paper planning - no secrets, safe for client
// components (see app/mock-exam/page.js).

// Spreads `numQuestions` across a course's main topics as evenly as
// possible: cycles through main topics in course order so no topic repeats
// until every other main topic has appeared once, and rotates through each
// chosen main topic's own subtopics as it comes up again - the actual
// generated question (and the attempt it becomes) is always tied to a
// specific practiceable subtopic, exactly like every other part of the app;
// the main topic only decides the SPREAD.
export function buildExamPlan(courseInfo, numQuestions) {
  const mainTopics = courseInfo.topics;
  const subtopicCursor = new Array(mainTopics.length).fill(0);
  const plan = [];
  for (let i = 0; i < numQuestions; i++) {
    const mainTopicIndex = i % mainTopics.length;
    const mainTopic = mainTopics[mainTopicIndex];
    const subtopic = mainTopic.subtopics[subtopicCursor[mainTopicIndex] % mainTopic.subtopics.length];
    subtopicCursor[mainTopicIndex] += 1;
    plan.push({ mainTopicName: mainTopic.name, topic: subtopic });
  }
  return plan;
}

// Roughly 6 minutes per question - the estimate shown on the setup screen
// and the actual countdown budget once the exam starts.
export const SECONDS_PER_QUESTION = 6 * 60;

export function formatEstimate(numQuestions) {
  const totalMinutes = numQuestions * (SECONDS_PER_QUESTION / 60);
  if (totalMinutes < 60) return `~${totalMinutes} minutes`;
  const hours = Math.floor(totalMinutes / 60);
  const rest = totalMinutes % 60;
  const hourLabel = `${hours} hour${hours > 1 ? 's' : ''}`;
  return rest === 0 ? `~${hourLabel}` : `~${hourLabel} ${rest} minutes`;
}
