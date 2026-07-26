// Skill-tree-aware adaptivity: traces a weak topic back to its likely
// prerequisite gap instead of just flagging the topic itself, and routes
// Guided Path's locking/recommendation UI and the mark-working coaching
// context accordingly. Pure data + logic, no secrets - safe to import from
// client components (the dashboard) same as lib/rewards.js and lib/levels.js.

import { computeTopicStatus } from './rewards';

// Coverage is broader now (GCSE and IGCSE Foundation/Higher, A Level Pure
// and Stats & Mechanics, Further Maths, all four IB courses) but still a
// first pass, not a definitive skill graph. It's strongest for the most
// classically-sequenced content (GCSE/IGCSE); newer or less traditionally
// linear material - Further Maths' optional modules, IB HL papers - has
// fuzzier real-world prerequisite chains, so treat those entries as
// reasonable starting points to refine over time rather than settled fact.
// Other courses (currently just the general-* "no exam" ones) default to no
// prerequisites (nothing locked) until deliberately extended - General
// Maths mode is meant for low-pressure, any-order exploration, not a rigid
// sequence, so it's left out on purpose rather than given empty entries.
// Any topic/course not listed here has no prerequisites and behaves exactly
// as it does now (never locked, no rerouting). Both the keys and the values
// below must be actual subtopic strings (see lib/levels.js's { name,
// subtopics } shape) - never a parent topic's grouping name, since that's
// UI-only and never used as a real "topic" value. Where a course's topic
// list bundles several sub-topics under one parent, the prerequisite is
// pointed at whichever specific sub-topic(s) it most genuinely depends on,
// not the whole group.
export const TOPIC_PREREQUISITES = {
  'gcse-foundation': {
    'Percentages of an amount': ['Adding and subtracting fractions', 'Multiplying and dividing fractions'],
    'Percentage increase and decrease': ['Adding and subtracting fractions', 'Multiplying and dividing fractions'],
    'Ratio problems': ['Multiplying and dividing fractions'],
    'Direct and inverse proportion': ['Multiplying and dividing fractions']
  },
  'gcse-higher': {
    'Simultaneous equations with a quadratic': ['Factorising quadratics'],
    'Algebraic fractions': ['Factorising quadratics'],
    'Direct and inverse proportion (algebraic)': ['Negative indices', 'Fractional indices'],
    'Growth and decay problems': ['Fractional indices']
  },
  'igcse-foundation': {
    'Percentages of an amount': ['Adding and subtracting fractions', 'Multiplying and dividing fractions'],
    'Percentage increase and decrease': ['Adding and subtracting fractions', 'Multiplying and dividing fractions'],
    'Ratio problems': ['Multiplying and dividing fractions'],
    'Direct and inverse proportion': ['Multiplying and dividing fractions']
  },
  'igcse-higher': {
    'Simultaneous equations with a quadratic': ['Factorising quadratics'],
    'Algebraic fractions': ['Factorising quadratics'],
    'Direct and inverse proportion (algebraic)': ['Negative indices', 'Fractional indices'],
    'Growth and decay problems': ['Fractional indices']
  },
  'alevel-pure': {
    'Integration (including definite integrals and area under a curve)': ['Differentiation (including chain, product, quotient rules)'],
    'Trigonometric ratios and graphs': ['Graphs and transformations of functions'],
    'Numerical methods (iteration, Newton-Raphson)': ['Solving quadratic and linear equations']
  },
  'alevel-stats-mechanics': {
    'Correlation': ['Data presentation and interpretation'],
    'Regression': ['Data presentation and interpretation'],
    'The binomial distribution': ['Probability with tree diagrams', 'Probability with Venn diagrams'],
    'The normal distribution': ['The binomial distribution'],
    'Statistical hypothesis testing': ['The normal distribution'],
    'Kinematics using calculus (variable acceleration)': ['Kinematics (SUVAT equations)'],
    "Forces and Newton's laws of motion": ['Kinematics (SUVAT equations)'],
    'Moments and equilibrium': ["Forces and Newton's laws of motion"]
  },
  'further-maths': {
    'Further calculus (including further integration techniques)': ['Partial fractions'],
    'First order differential equations': ['Further calculus (including further integration techniques)'],
    'Polar coordinates': ['Further calculus (including further integration techniques)']
  },
  'ib-aa-sl': {
    'Exponential and logarithmic functions': ['Exponents and logarithms'],
    'Differentiation and its applications': ['Functions, graphs and transformations'],
    'Integration and its applications': ['Differentiation and its applications'],
    'The normal distribution': ['Discrete random variables']
  },
  'ib-aa-hl': {
    'Further vectors (lines and planes in 3D)': ['Matrices']
  },
  'ib-ai-sl': {
    'Distributions and chi-squared test': ['Probability (discrete random variables)'],
    'Differentiation and optimisation': ['Functions and mathematical modelling'],
    'Integration and kinematics': ['Functions and mathematical modelling']
  },
  'ib-ai-hl': {}
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
