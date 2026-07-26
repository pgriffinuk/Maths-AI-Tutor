// Pure course/board/difficulty data - no secrets, safe to import from both
// client and server code. lib/claude.js (server-only, holds the Anthropic
// API key) re-exports these for the API routes; client components (the
// dashboard, the diagnostic) should import from here directly instead.

// Each course's `topics` is an array of { name, subtopics: string[] }, not a
// flat list of strings. `name` is a UI-only grouping label used for
// navigation (the two-level topic selector, Guided Path grouping) - it is
// never sent to the AI or stored as an attempt's "topic" value. Every actual
// practice question, diagnostic sub-check, mark, and prerequisite lookup
// operates on a specific subtopic string from `subtopics`. Topics that were
// already narrow (e.g. "Proof by induction", "Polar coordinates") just have
// a single-item subtopics array containing their own name; topics bundling
// several distinct skills or methods (e.g. the old "Quadratic equations
// (factorising, formula, completing the square)") are split into 2-4 named
// sub-skills instead.
//
// This whole breakdown was generated at scale across every course in one
// pass, not hand-tuned topic by topic - Paul should spot-check and refine it
// over time, especially for less classically-sequenced content (Further
// Maths' optional modules, IB HL papers, the General Maths courses).
export const COURSES = [
  {
    key: 'gcse-foundation',
    label: 'GCSE Foundation',
    levelDescription: "GCSE Foundation tier (age 14-16, grades 1-5 target). No algebraic fractions, no calculus, no higher-tier trigonometry (SOHCAHTOA only, no sine/cosine rule, no exact trig values beyond basics). Numbers should be manageable without a calculator unless stated.",
    topics: [
      { name: 'Fractions (add, subtract, multiply, divide)', subtopics: ['Adding and subtracting fractions', 'Multiplying and dividing fractions'] },
      { name: 'Percentages (including percentage change)', subtopics: ['Percentages of an amount', 'Percentage increase and decrease'] },
      { name: 'Ratio and proportion, including inverse proportion', subtopics: ['Ratio problems', 'Direct and inverse proportion'] },
      { name: 'Solving linear equations, including with brackets and fractions', subtopics: ['Solving linear equations, including with brackets and fractions'] },
      { name: 'Angles in parallel lines and polygons', subtopics: ['Angles in parallel lines', 'Angles in polygons'] },
      { name: 'Perimeter, area and volume of standard 2D/3D shapes', subtopics: ['Perimeter of 2D shapes', 'Area of 2D shapes', 'Volume of 3D shapes'] },
      { name: 'Probability, including combined events', subtopics: ['Basic probability', 'Combined events (tree diagrams, AND/OR)'] },
      { name: 'Averages and range from lists and frequency tables', subtopics: ['Averages and range from lists', 'Estimating the mean from frequency tables'] },
      { name: 'Standard form calculations', subtopics: ['Standard form calculations'] },
      { name: 'Sequences, including finding the nth term', subtopics: ['Sequences, including finding the nth term'] }
    ]
  },
  {
    key: 'gcse-higher',
    label: 'GCSE Higher',
    levelDescription: "GCSE Higher tier (age 14-16, grades 4-9 target). Can include algebraic fractions, the quadratic formula and completing the square, circle theorems, sine/cosine rule and exact trig values, surds, fractional and negative indices, direct/inverse proportion with algebra, vectors, function notation, iteration, and algebraic proof. No calculus.",
    topics: [
      { name: 'Quadratic equations (factorising, formula, completing the square)', subtopics: ['Factorising quadratics', 'The quadratic formula', 'Completing the square'] },
      { name: 'Simultaneous equations (linear and quadratic)', subtopics: ['Simultaneous linear equations', 'Simultaneous equations with a quadratic'] },
      { name: 'Surds and rationalising denominators', subtopics: ['Simplifying and calculating with surds', 'Rationalising denominators'] },
      { name: 'Indices (fractional and negative)', subtopics: ['Negative indices', 'Fractional indices'] },
      { name: 'Circle theorems', subtopics: ['Circle theorems'] },
      { name: 'Sine rule, cosine rule and area of a triangle', subtopics: ['Sine rule', 'Cosine rule', 'Area of a triangle using ½ab sin C'] },
      { name: 'Algebraic fractions', subtopics: ['Algebraic fractions'] },
      { name: 'Direct and inverse proportion (algebraic)', subtopics: ['Direct and inverse proportion (algebraic)'] },
      { name: 'Vectors', subtopics: ['Vectors'] },
      { name: 'Graph transformations and function notation', subtopics: ['Graph transformations', 'Function notation'] },
      { name: 'Growth and decay problems', subtopics: ['Growth and decay problems'] },
      { name: 'Algebraic proof', subtopics: ['Algebraic proof'] }
    ]
  },
  {
    key: 'igcse-foundation',
    label: 'IGCSE Foundation',
    levelDescription: "IGCSE Foundation tier (age 14-16, international qualification, grades 1-5 target equivalent). No algebraic fractions, no calculus, no higher-tier trigonometry (SOHCAHTOA only, no sine/cosine rule, no exact trig values beyond basics). Numbers should be manageable without a calculator unless stated.",
    topics: [
      { name: 'Fractions (add, subtract, multiply, divide)', subtopics: ['Adding and subtracting fractions', 'Multiplying and dividing fractions'] },
      { name: 'Percentages (including percentage change)', subtopics: ['Percentages of an amount', 'Percentage increase and decrease'] },
      { name: 'Ratio and proportion, including inverse proportion', subtopics: ['Ratio problems', 'Direct and inverse proportion'] },
      { name: 'Solving linear equations, including with brackets and fractions', subtopics: ['Solving linear equations, including with brackets and fractions'] },
      { name: 'Angles in parallel lines and polygons', subtopics: ['Angles in parallel lines', 'Angles in polygons'] },
      { name: 'Perimeter, area and volume of standard 2D/3D shapes', subtopics: ['Perimeter of 2D shapes', 'Area of 2D shapes', 'Volume of 3D shapes'] },
      { name: 'Probability, including combined events', subtopics: ['Basic probability', 'Combined events (tree diagrams, AND/OR)'] },
      { name: 'Averages and range from lists and frequency tables', subtopics: ['Averages and range from lists', 'Estimating the mean from frequency tables'] },
      { name: 'Standard form calculations', subtopics: ['Standard form calculations'] },
      { name: 'Sequences, including finding the nth term', subtopics: ['Sequences, including finding the nth term'] }
    ]
  },
  {
    key: 'igcse-higher',
    label: 'IGCSE Higher',
    levelDescription: "IGCSE Higher tier (age 14-16, international qualification, grades 4-9 target equivalent). Can include algebraic fractions, the quadratic formula and completing the square, circle theorems, sine/cosine rule and exact trig values, surds, fractional and negative indices, direct/inverse proportion with algebra, vectors, function notation, iteration, and algebraic proof. No calculus.",
    topics: [
      { name: 'Quadratic equations (factorising, formula, completing the square)', subtopics: ['Factorising quadratics', 'The quadratic formula', 'Completing the square'] },
      { name: 'Simultaneous equations (linear and quadratic)', subtopics: ['Simultaneous linear equations', 'Simultaneous equations with a quadratic'] },
      { name: 'Surds and rationalising denominators', subtopics: ['Simplifying and calculating with surds', 'Rationalising denominators'] },
      { name: 'Indices (fractional and negative)', subtopics: ['Negative indices', 'Fractional indices'] },
      { name: 'Circle theorems', subtopics: ['Circle theorems'] },
      { name: 'Sine rule, cosine rule and area of a triangle', subtopics: ['Sine rule', 'Cosine rule', 'Area of a triangle using ½ab sin C'] },
      { name: 'Algebraic fractions', subtopics: ['Algebraic fractions'] },
      { name: 'Direct and inverse proportion (algebraic)', subtopics: ['Direct and inverse proportion (algebraic)'] },
      { name: 'Vectors', subtopics: ['Vectors'] },
      { name: 'Graph transformations and function notation', subtopics: ['Graph transformations', 'Function notation'] },
      { name: 'Growth and decay problems', subtopics: ['Growth and decay problems'] },
      { name: 'Algebraic proof', subtopics: ['Algebraic proof'] }
    ]
  },
  {
    key: 'alevel-pure',
    label: 'A Level Maths — Pure',
    levelDescription: "A Level Mathematics, Pure content (age 16-18). Can include everything from GCSE Higher plus: differentiation and integration (polynomials, trig, exp/log, chain/product/quotient rules), binomial expansion, trigonometric identities and equations (radians), exponentials and logarithms, sequences and series, algebraic methods including the factor and remainder theorem, numerical methods, and vectors in 2D/3D. Assume a calculator is available.",
    topics: [
      { name: 'Algebraic expressions, surds and indices', subtopics: ['Algebraic expressions and manipulation', 'Surds and indices'] },
      { name: 'Quadratics and the discriminant', subtopics: ['Quadratics and the discriminant'] },
      { name: 'Equations and inequalities (including simultaneous and quadratic inequalities)', subtopics: ['Solving quadratic and linear equations', 'Simultaneous equations (linear and quadratic)', 'Linear and quadratic inequalities'] },
      { name: 'Graphs and transformations of functions', subtopics: ['Graphs and transformations of functions'] },
      { name: 'Straight line graphs and circles (coordinate geometry)', subtopics: ['Straight line graphs', 'Circles (coordinate geometry)'] },
      { name: 'Binomial expansion', subtopics: ['Binomial expansion'] },
      { name: 'Trigonometric ratios, identities and equations', subtopics: ['Trigonometric ratios and graphs', 'Trigonometric identities', 'Solving trigonometric equations'] },
      { name: 'Differentiation (including chain, product, quotient rules)', subtopics: ['Differentiation (including chain, product, quotient rules)'] },
      { name: 'Integration (including definite integrals and area under a curve)', subtopics: ['Integration (including definite integrals and area under a curve)'] },
      { name: 'Exponentials and logarithms', subtopics: ['Exponentials and logarithms'] },
      { name: 'Sequences and series (arithmetic and geometric)', subtopics: ['Sequences and series (arithmetic and geometric)'] },
      { name: 'Vectors in 2D and 3D', subtopics: ['Vectors in 2D and 3D'] },
      { name: 'Numerical methods (iteration, Newton-Raphson)', subtopics: ['Numerical methods (iteration, Newton-Raphson)'] }
    ]
  },
  {
    key: 'alevel-stats-mechanics',
    label: 'A Level Maths — Statistics & Mechanics',
    levelDescription: "A Level Mathematics, Applied content (age 16-18): Statistics and Mechanics. Statistics can include data presentation, correlation, probability, the binomial and normal distributions, and hypothesis testing. Mechanics can include kinematics (SUVAT, calculus-based), forces, Newton's laws, friction, and moments. Assume a calculator is available.",
    topics: [
      { name: 'Data presentation and interpretation', subtopics: ['Data presentation and interpretation'] },
      { name: 'Correlation and regression', subtopics: ['Correlation', 'Regression'] },
      { name: 'Probability (including tree diagrams and Venn diagrams)', subtopics: ['Probability with tree diagrams', 'Probability with Venn diagrams'] },
      { name: 'The binomial distribution', subtopics: ['The binomial distribution'] },
      { name: 'The normal distribution', subtopics: ['The normal distribution'] },
      { name: 'Statistical hypothesis testing', subtopics: ['Statistical hypothesis testing'] },
      { name: 'Kinematics (SUVAT equations)', subtopics: ['Kinematics (SUVAT equations)'] },
      { name: 'Kinematics using calculus (variable acceleration)', subtopics: ['Kinematics using calculus (variable acceleration)'] },
      { name: "Forces and Newton's laws of motion", subtopics: ["Forces and Newton's laws of motion"] },
      { name: 'Moments and equilibrium', subtopics: ['Moments and equilibrium'] }
    ]
  },
  {
    key: 'further-maths',
    label: 'A Level Further Maths',
    levelDescription: "A Level Further Mathematics (age 16-18), building on A Level Maths. Can include complex numbers, matrices, further algebra and functions (partial fractions, further polynomials), further calculus, polar coordinates, hyperbolic functions, differential equations, further vectors, proof by induction, and further mechanics/statistics topics such as momentum, impulse, circular motion, and discrete probability distributions. Assume a calculator is available.",
    topics: [
      { name: 'Complex numbers (Argand diagrams, modulus-argument form)', subtopics: ['Complex number arithmetic', 'Argand diagrams and modulus-argument form'] },
      { name: 'Matrices and linear transformations', subtopics: ['Matrix arithmetic and determinants', 'Linear transformations'] },
      { name: 'Further algebra (partial fractions, polynomial division)', subtopics: ['Partial fractions', 'Polynomial division'] },
      { name: 'Proof by induction', subtopics: ['Proof by induction'] },
      { name: 'Further vectors (planes and lines in 3D)', subtopics: ['Further vectors (planes and lines in 3D)'] },
      { name: 'Polar coordinates', subtopics: ['Polar coordinates'] },
      { name: 'Hyperbolic functions', subtopics: ['Hyperbolic functions'] },
      { name: 'Further calculus (including further integration techniques)', subtopics: ['Further calculus (including further integration techniques)'] },
      { name: 'First order differential equations', subtopics: ['First order differential equations'] },
      { name: 'Further mechanics (momentum, impulse, circular motion)', subtopics: ['Momentum and impulse', 'Circular motion'] },
      { name: 'Further statistics (discrete probability distributions, chi-squared tests)', subtopics: ['Discrete probability distributions', 'Chi-squared tests'] }
    ]
  },
  {
    key: 'ib-aa-sl',
    label: 'IB Maths: Analysis & Approaches SL',
    levelDescription: "IB Diploma Mathematics: Analysis and Approaches, Standard Level (age 16-18). Covers algebra and sequences, functions and graphs, trigonometry (radians, non-right-angle triangles), exponentials and logarithms, differentiation and integration (polynomials, chain/product/quotient rules, optimisation, kinematics), probability, statistics (descriptive, correlation, normal distribution), and vectors (2D and 3D, lines). Paper 1 is non-calculator, Paper 2 is calculator-allowed - specify which when relevant.",
    topics: [
      { name: 'Sequences and series, exponents and logarithms', subtopics: ['Sequences and series', 'Exponents and logarithms'] },
      { name: 'Functions, graphs and transformations', subtopics: ['Functions, graphs and transformations'] },
      { name: 'Trigonometry (radians, identities, non-right-angle triangles)', subtopics: ['Trigonometric ratios and non-right-angle triangles', 'Trigonometric identities and equations (radians)'] },
      { name: 'Exponential and logarithmic functions', subtopics: ['Exponential and logarithmic functions'] },
      { name: 'Differentiation and its applications', subtopics: ['Differentiation and its applications'] },
      { name: 'Integration and its applications', subtopics: ['Integration and its applications'] },
      { name: 'Probability (Venn diagrams, conditional probability, discrete random variables)', subtopics: ['Probability (Venn diagrams, conditional probability)', 'Discrete random variables'] },
      { name: 'Statistics (descriptive statistics, correlation, normal distribution)', subtopics: ['Descriptive statistics and correlation', 'The normal distribution'] },
      { name: 'Vectors (2D and 3D, lines)', subtopics: ['Vectors (2D and 3D, lines)'] }
    ]
  },
  {
    key: 'ib-aa-hl',
    label: 'IB Maths: Analysis & Approaches HL',
    levelDescription: "IB Diploma Mathematics: Analysis and Approaches, Higher Level (age 16-18). Everything in AA SL, plus: complex numbers, matrices, further calculus (implicit differentiation, further integration techniques, simple differential equations), proof (including induction), further vectors (planes), compound angle trig identities, and further series. Paper 1 is non-calculator, Paper 2 and Paper 3 (extended-response) are calculator-allowed.",
    topics: [
      { name: 'Complex numbers', subtopics: ['Complex numbers'] },
      { name: 'Matrices', subtopics: ['Matrices'] },
      { name: 'Proof, including proof by induction', subtopics: ['Proof, including proof by induction'] },
      { name: 'Further calculus (implicit differentiation, further integration, simple differential equations)', subtopics: ['Implicit differentiation', 'Further integration techniques', 'Simple differential equations'] },
      { name: 'Further vectors (lines and planes in 3D)', subtopics: ['Further vectors (lines and planes in 3D)'] },
      { name: 'Further trigonometry (compound angle identities)', subtopics: ['Further trigonometry (compound angle identities)'] },
      { name: 'Further series and sequences', subtopics: ['Further series and sequences'] }
    ]
  },
  {
    key: 'ib-ai-sl',
    label: 'IB Maths: Applications & Interpretation SL',
    levelDescription: "IB Diploma Mathematics: Applications and Interpretation, Standard Level (age 16-18). More applied and technology-focused than AA - covers number and algebra (including financial maths), functions and modelling, geometry and trigonometry (including 2D/3D geometry and Voronoi diagrams), statistics (bivariate data, regression, distributions, chi-squared test), probability, and introductory calculus (differentiation, integration, optimisation, kinematics). Both papers are calculator-allowed - there is no non-calculator paper in this course.",
    topics: [
      { name: 'Number, algebra and financial mathematics', subtopics: ['Number and algebra', 'Financial mathematics'] },
      { name: 'Functions and mathematical modelling', subtopics: ['Functions and mathematical modelling'] },
      { name: 'Geometry and trigonometry (including Voronoi diagrams)', subtopics: ['Geometry and trigonometry', 'Voronoi diagrams'] },
      { name: 'Statistics (bivariate data, correlation, regression, distributions, chi-squared test)', subtopics: ['Bivariate data, correlation and regression', 'Distributions and chi-squared test'] },
      { name: 'Probability (discrete random variables)', subtopics: ['Probability (discrete random variables)'] },
      { name: 'Introductory calculus (differentiation, integration, optimisation, kinematics)', subtopics: ['Differentiation and optimisation', 'Integration and kinematics'] }
    ]
  },
  {
    key: 'ib-ai-hl',
    label: 'IB Maths: Applications & Interpretation HL',
    levelDescription: "IB Diploma Mathematics: Applications and Interpretation, Higher Level (age 16-18). Everything in AI SL, plus: matrices, further statistics (further hypothesis testing, Spearman's rank correlation), further modelling (non-linear regression), simple differential equations, volumes of revolution, and further probability/kinematics using 2D vectors. Both papers and Paper 3 (extended-response) are calculator-allowed.",
    topics: [
      { name: 'Matrices', subtopics: ['Matrices'] },
      { name: "Further statistics (further hypothesis tests, Spearman's rank correlation)", subtopics: ['Further hypothesis testing', "Spearman's rank correlation"] },
      { name: 'Further modelling (non-linear regression)', subtopics: ['Further modelling (non-linear regression)'] },
      { name: 'Simple differential equations', subtopics: ['Simple differential equations'] },
      { name: 'Volumes of revolution', subtopics: ['Volumes of revolution'] },
      { name: 'Further kinematics using 2D vectors', subtopics: ['Further kinematics using 2D vectors'] }
    ]
  },
  {
    key: 'general-numeracy',
    label: 'Number Confidence',
    levelDescription: "General numeracy practice for someone building confidence with everyday maths, not tied to any exam syllabus. Covers arithmetic, fractions, decimals, and percentages in practical contexts (shopping, cooking, splitting bills, discounts). Keep language plain and encouraging, avoid exam jargon like 'marks' or 'grade boundaries' - frame feedback in terms of understanding, not marks.",
    topics: [
      { name: 'Arithmetic with whole numbers and decimals', subtopics: ['Arithmetic with whole numbers and decimals'] },
      { name: 'Fractions in everyday situations', subtopics: ['Fractions in everyday situations'] },
      { name: 'Percentages (discounts, tips, interest)', subtopics: ['Percentages (discounts, tips, interest)'] },
      { name: 'Estimating and rounding sensibly', subtopics: ['Estimating and rounding sensibly'] },
      { name: 'Working with money and budgets', subtopics: ['Working with money and budgets'] }
    ]
  },
  {
    key: 'general-algebra',
    label: 'Everyday Algebra & Problem Solving',
    levelDescription: "General practice for someone wanting to get comfortable with basic algebra and logical problem-solving, not tied to any exam syllabus. Keep it practical and confidence-building rather than exam-technique focused.",
    topics: [
      { name: 'Simple equations and rearranging formulas', subtopics: ['Simple equations and rearranging formulas'] },
      { name: 'Ratio and proportion in real situations', subtopics: ['Ratio and proportion in real situations'] },
      { name: 'Sequences and patterns', subtopics: ['Sequences and patterns'] },
      { name: 'Basic graphs and reading data from them', subtopics: ['Basic graphs and reading data from them'] },
      { name: 'Step-by-step problem solving', subtopics: ['Step-by-step problem solving'] }
    ]
  },
  {
    key: 'general-applied',
    label: 'Applied Maths for Life',
    levelDescription: "General practice on maths people actually use day to day, not tied to any exam syllabus. Practical and real-world framed.",
    topics: [
      { name: 'Measurement and units (including conversions)', subtopics: ['Measurement and units (including conversions)'] },
      { name: 'Reading charts, tables and simple statistics', subtopics: ['Reading charts, tables and simple statistics'] },
      { name: 'Time, distance and speed problems', subtopics: ['Time, distance and speed problems'] },
      { name: 'Area and volume for practical tasks (DIY, gardening, etc.)', subtopics: ['Area for practical tasks (DIY, gardening, etc.)', 'Volume for practical tasks (DIY, gardening, etc.)'] },
      { name: 'Understanding probability in everyday contexts', subtopics: ['Understanding probability in everyday contexts'] }
    ]
  },
  {
    key: 'general-reasoning',
    label: 'Logic & Number Puzzles',
    levelDescription: "General logical reasoning and number-puzzle style practice for someone who enjoys a maths challenge without exam pressure, not tied to any exam syllabus. Can be playful and puzzle-like in tone.",
    topics: [
      { name: 'Number puzzles and sequences', subtopics: ['Number puzzles and sequences'] },
      { name: 'Logical reasoning problems', subtopics: ['Logical reasoning problems'] },
      { name: 'Simple probability puzzles', subtopics: ['Simple probability puzzles'] },
      { name: 'Pattern recognition', subtopics: ['Pattern recognition'] },
      { name: 'Multi-step word problems', subtopics: ['Multi-step word problems'] }
    ]
  }
];

export const EXAM_BOARDS = [
  { key: 'edexcel', label: 'Pearson Edexcel' },
  { key: 'aqa', label: 'AQA' },
  { key: 'ocr', label: 'OCR' },
  { key: 'caie', label: 'Cambridge International (CAIE)' },
  { key: 'eduqas', label: 'WJEC Eduqas' },
  { key: 'ib', label: 'International Baccalaureate' },
  { key: 'general', label: 'General Maths (no exam)' }
];

// IB is one global programme rather than a set of competing exam boards, so
// its four courses are entirely separate from the GCSE/A Level ones above -
// this is what lets the dashboard/diagnostic course dropdown show only the
// courses that make sense for whichever board is currently selected.
// AQA, OCR and Eduqas only offer GCSE (not IGCSE). CAIE only offers IGCSE
// (not GCSE) - it maps to igcse-foundation/igcse-higher, not
// gcse-foundation/gcse-higher. Edexcel offers both.
export const BOARD_COURSES = {
  edexcel: ['gcse-foundation', 'gcse-higher', 'igcse-foundation', 'igcse-higher', 'alevel-pure', 'alevel-stats-mechanics', 'further-maths'],
  aqa: ['gcse-foundation', 'gcse-higher', 'alevel-pure', 'alevel-stats-mechanics', 'further-maths'],
  ocr: ['gcse-foundation', 'gcse-higher', 'alevel-pure', 'alevel-stats-mechanics', 'further-maths'],
  eduqas: ['gcse-foundation', 'gcse-higher', 'alevel-pure', 'alevel-stats-mechanics', 'further-maths'],
  caie: ['igcse-foundation', 'igcse-higher', 'alevel-pure', 'alevel-stats-mechanics', 'further-maths'],
  ib: ['ib-aa-sl', 'ib-aa-hl', 'ib-ai-sl', 'ib-ai-hl'],
  general: ['general-numeracy', 'general-algebra', 'general-applied', 'general-reasoning']
};

export const SPEC_CODES = {
  edexcel: { 'gcse-foundation': '1MA1 Foundation', 'gcse-higher': '1MA1 Higher', 'igcse-foundation': '4MA1 Foundation', 'igcse-higher': '4MA1 Higher', 'alevel-pure': '9MA0', 'alevel-stats-mechanics': '9MA0', 'further-maths': '9FM0' },
  aqa: { 'gcse-foundation': '8300 Foundation', 'gcse-higher': '8300 Higher', 'alevel-pure': '7357', 'alevel-stats-mechanics': '7357', 'further-maths': '7367' },
  ocr: { 'gcse-foundation': 'J560 Foundation', 'gcse-higher': 'J560 Higher', 'alevel-pure': 'H240', 'alevel-stats-mechanics': 'H240', 'further-maths': 'H245' },
  caie: { 'igcse-foundation': '0580 Core', 'igcse-higher': '0580 Extended', 'alevel-pure': '9709 (P1-P3)', 'alevel-stats-mechanics': '9709 (S1/M1)', 'further-maths': '9231' },
  eduqas: { 'gcse-foundation': 'C300 Foundation', 'gcse-higher': 'C300 Higher', 'alevel-pure': 'C300 (A Level)', 'alevel-stats-mechanics': 'C300 (A Level)', 'further-maths': 'C305' },
  ib: {
    'ib-aa-sl': 'IB Diploma (first exams 2021)',
    'ib-aa-hl': 'IB Diploma (first exams 2021)',
    'ib-ai-sl': 'IB Diploma (first exams 2021)',
    'ib-ai-hl': 'IB Diploma (first exams 2021)'
  },
  // No exam, so no spec code - deliberately empty rather than omitted, so
  // getLevelContext's specCode lookup below still resolves cleanly to ''.
  general: { 'general-numeracy': '', 'general-algebra': '', 'general-applied': '', 'general-reasoning': '' }
};
// Note: for the 'caie' board specifically, display "Core" instead of
// "Foundation" and "Extended" instead of "Higher" wherever the course label
// is shown in the UI, since that's CAIE's actual terminology for its IGCSE
// tiers - the underlying course key (igcse-foundation/igcse-higher) stays
// the same, this is a display-only label swap (see courseDisplayLabel
// below). CAIE no longer maps to gcse-foundation/gcse-higher at all, so
// this swap now only ever applies to the IGCSE course labels.

export const DIFFICULTY_LEVELS = [
  { key: 'grade-builder', label: 'Grade Builder (easier)', promptHint: 'Keep this noticeably easier than a typical exam question - simpler numbers, fewer steps, worth roughly 1-2 marks, ideal for building confidence.' },
  { key: 'exam-standard', label: 'Exam Standard', promptHint: 'Write this at typical exam difficulty for the course/tier - roughly 3-4 marks, the kind of question that would appear in a real paper.' },
  { key: 'stretch', label: 'Stretch & Challenge', promptHint: 'Make this a harder, multi-step question stretching the top of the grade range for this course/tier - roughly 5-6 marks, may combine this topic with an adjacent skill.' }
];

// Shared server-side lookup used by all four AI routes, so the
// board/course/difficulty resolution logic isn't duplicated four times.
export function getLevelContext(course, board, difficulty) {
  const courseInfo = COURSES.find((c) => c.key === course) || COURSES[0];
  const boardInfo = EXAM_BOARDS.find((b) => b.key === board) || EXAM_BOARDS[0];
  const difficultyInfo = DIFFICULTY_LEVELS.find((d) => d.key === difficulty) || DIFFICULTY_LEVELS[1];
  const specCode = (SPEC_CODES[boardInfo.key] && SPEC_CODES[boardInfo.key][courseInfo.key]) || '';
  const furtherMathsNote = courseInfo.key === 'further-maths'
    ? " Further Maths optional module content (Further Mechanics, Further Statistics, Decision Maths) varies significantly by exam board - favour core Further Pure content unless the topic explicitly names a mechanics or statistics area, since that's common across all boards."
    : '';
  return { courseInfo, boardInfo, difficultyInfo, specCode, furtherMathsNote };
}

// CAIE calls its IGCSE tiers "Core" and "Extended" rather than "Foundation"
// and "Higher" - display-only, the underlying course key (igcse-foundation/
// igcse-higher) is unchanged.
export function courseDisplayLabel(course, boardKey) {
  return boardKey === 'caie' ? course.label.replace('Foundation', 'Core').replace('Higher', 'Extended') : course.label;
}

// The flat list of actual practiceable subtopic strings for a course, in
// course order - what Guided Path status, mastery counts, and prerequisite
// lookups all operate on, as opposed to `topics` itself which is grouped by
// main topic for the UI.
export function flattenTopics(courseInfo) {
  return courseInfo.topics.flatMap((t) => t.subtopics);
}
