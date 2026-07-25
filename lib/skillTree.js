// Skill-tree-aware adaptivity: traces a weak topic back to its likely
// prerequisite gap instead of just flagging the topic itself, and routes
// Guided Path's locking/recommendation UI and the mark-working coaching
// context accordingly. Pure data + logic, no secrets - safe to import from
// client components (the dashboard) same as lib/rewards.js and lib/levels.js.

import { computeTopicStatus } from './rewards';

// This is a first pass covering the clearest, most established progressions
// (GCSE Foundation, GCSE Higher, A Level Pure). Other courses default to no
// prerequisites (nothing locked) until extended - add more chains here over
// time as they're validated. Any topic/course not listed here has no
// prerequisites and behaves exactly as it does now (never locked, no
// rerouting).
export const TOPIC_PREREQUISITES = {
  'gcse-foundation': {
    'Percentages (including percentage change)': ['Fractions (add, subtract, multiply, divide)'],
    'Ratio and proportion, including inverse proportion': ['Fractions (add, subtract, multiply, divide)']
  },
  'gcse-higher': {
    'Simultaneous equations (linear and quadratic)': ['Quadratic equations (factorising, formula, completing the square)'],
    'Algebraic fractions': ['Quadratic equations (factorising, formula, completing the square)'],
    'Direct and inverse proportion (algebraic)': ['Indices (fractional and negative)'],
    'Growth and decay problems': ['Indices (fractional and negative)']
  },
  'alevel-pure': {
    'Integration (including definite integrals and area under a curve)': ['Differentiation (including chain, product, quotient rules)'],
    'Trigonometric ratios, identities and equations': ['Graphs and transformations of functions'],
    'Numerical methods (iteration, Newton-Raphson)': ['Equations and inequalities (including simultaneous and quadratic inequalities)']
  }
};

// 'not-started' ranks as a bigger gap than 'in-progress' (some attempt has
// at least been made), so it sorts first - "weakest" prerequisite first.
const STATUS_WEAKNESS_ORDER = { 'not-started': 0, 'in-progress': 1, mastered: 2 };

// This topic's prerequisites that aren't yet 'mastered', weakest first.
// Callers that just want "the" prerequisite to name or jump to can take
// element 0. Empty array if the topic has no listed prerequisites, or all
// of them are already mastered.
export function getUnmetPrerequisites(attempts, course, board, topic) {
  const prereqs = (TOPIC_PREREQUISITES[course] && TOPIC_PREREQUISITES[course][topic]) || [];
  return prereqs
    .map((p) => ({ topic: p, status: computeTopicStatus(attempts, course, board, p) }))
    .filter((p) => p.status !== 'mastered')
    .sort((a, b) => STATUS_WEAKNESS_ORDER[a.status] - STATUS_WEAKNESS_ORDER[b.status])
    .map((p) => p.topic);
}

// Guided Path's "Recommended next" pick: the first non-mastered topic in
// course order, UNLESS it has unmet prerequisites - in which case recommend
// the weakest unmet prerequisite instead, so the student is routed to the
// actual gap rather than a topic that will just keep giving them trouble
// until the gap underneath it is closed. Returns null once everything in
// `topics` is mastered.
export function getRecommendedTopic(attempts, course, board, topics) {
  for (const topic of topics) {
    if (computeTopicStatus(attempts, course, board, topic) === 'mastered') continue;
    const unmet = getUnmetPrerequisites(attempts, course, board, topic);
    return unmet.length > 0 ? unmet[0] : topic;
  }
  return null;
}
