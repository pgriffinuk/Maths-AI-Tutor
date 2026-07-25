// Pure course/board/difficulty data - no secrets, safe to import from both
// client and server code. lib/claude.js (server-only, holds the Anthropic
// API key) re-exports these for the API routes; client components (the
// dashboard, the diagnostic) should import from here directly instead.

export const COURSES = [
  {
    key: 'gcse-foundation',
    label: 'GCSE Foundation',
    levelDescription: "GCSE Foundation tier (age 14-16, grades 1-5 target). No algebraic fractions, no calculus, no higher-tier trigonometry (SOHCAHTOA only, no sine/cosine rule, no exact trig values beyond basics). Numbers should be manageable without a calculator unless stated.",
    topics: [
      'Fractions (add, subtract, multiply, divide)',
      'Percentages (including percentage change)',
      'Ratio and proportion, including inverse proportion',
      'Solving linear equations, including with brackets and fractions',
      'Angles in parallel lines and polygons',
      'Perimeter, area and volume of standard 2D/3D shapes',
      'Probability, including combined events',
      'Averages and range from lists and frequency tables',
      'Standard form calculations',
      'Sequences, including finding the nth term'
    ]
  },
  {
    key: 'gcse-higher',
    label: 'GCSE Higher',
    levelDescription: "GCSE Higher tier (age 14-16, grades 4-9 target). Can include algebraic fractions, the quadratic formula and completing the square, circle theorems, sine/cosine rule and exact trig values, surds, fractional and negative indices, direct/inverse proportion with algebra, vectors, function notation, iteration, and algebraic proof. No calculus.",
    topics: [
      'Quadratic equations (factorising, formula, completing the square)',
      'Simultaneous equations (linear and quadratic)',
      'Surds and rationalising denominators',
      'Indices (fractional and negative)',
      'Circle theorems',
      'Sine rule, cosine rule and area of a triangle',
      'Algebraic fractions',
      'Direct and inverse proportion (algebraic)',
      'Vectors',
      'Graph transformations and function notation',
      'Growth and decay problems',
      'Algebraic proof'
    ]
  },
  {
    key: 'igcse-foundation',
    label: 'IGCSE Foundation',
    levelDescription: "IGCSE Foundation tier (age 14-16, international qualification, grades 1-5 target equivalent). No algebraic fractions, no calculus, no higher-tier trigonometry (SOHCAHTOA only, no sine/cosine rule, no exact trig values beyond basics). Numbers should be manageable without a calculator unless stated.",
    topics: [
      'Fractions (add, subtract, multiply, divide)',
      'Percentages (including percentage change)',
      'Ratio and proportion, including inverse proportion',
      'Solving linear equations, including with brackets and fractions',
      'Angles in parallel lines and polygons',
      'Perimeter, area and volume of standard 2D/3D shapes',
      'Probability, including combined events',
      'Averages and range from lists and frequency tables',
      'Standard form calculations',
      'Sequences, including finding the nth term'
    ]
  },
  {
    key: 'igcse-higher',
    label: 'IGCSE Higher',
    levelDescription: "IGCSE Higher tier (age 14-16, international qualification, grades 4-9 target equivalent). Can include algebraic fractions, the quadratic formula and completing the square, circle theorems, sine/cosine rule and exact trig values, surds, fractional and negative indices, direct/inverse proportion with algebra, vectors, function notation, iteration, and algebraic proof. No calculus.",
    topics: [
      'Quadratic equations (factorising, formula, completing the square)',
      'Simultaneous equations (linear and quadratic)',
      'Surds and rationalising denominators',
      'Indices (fractional and negative)',
      'Circle theorems',
      'Sine rule, cosine rule and area of a triangle',
      'Algebraic fractions',
      'Direct and inverse proportion (algebraic)',
      'Vectors',
      'Graph transformations and function notation',
      'Growth and decay problems',
      'Algebraic proof'
    ]
  },
  {
    key: 'alevel-pure',
    label: 'A Level Maths — Pure',
    levelDescription: "A Level Mathematics, Pure content (age 16-18). Can include everything from GCSE Higher plus: differentiation and integration (polynomials, trig, exp/log, chain/product/quotient rules), binomial expansion, trigonometric identities and equations (radians), exponentials and logarithms, sequences and series, algebraic methods including the factor and remainder theorem, numerical methods, and vectors in 2D/3D. Assume a calculator is available.",
    topics: [
      'Algebraic expressions, surds and indices',
      'Quadratics and the discriminant',
      'Equations and inequalities (including simultaneous and quadratic inequalities)',
      'Graphs and transformations of functions',
      'Straight line graphs and circles (coordinate geometry)',
      'Binomial expansion',
      'Trigonometric ratios, identities and equations',
      'Differentiation (including chain, product, quotient rules)',
      'Integration (including definite integrals and area under a curve)',
      'Exponentials and logarithms',
      'Sequences and series (arithmetic and geometric)',
      'Vectors in 2D and 3D',
      'Numerical methods (iteration, Newton-Raphson)'
    ]
  },
  {
    key: 'alevel-stats-mechanics',
    label: 'A Level Maths — Statistics & Mechanics',
    levelDescription: "A Level Mathematics, Applied content (age 16-18): Statistics and Mechanics. Statistics can include data presentation, correlation, probability, the binomial and normal distributions, and hypothesis testing. Mechanics can include kinematics (SUVAT, calculus-based), forces, Newton's laws, friction, and moments. Assume a calculator is available.",
    topics: [
      'Data presentation and interpretation',
      'Correlation and regression',
      'Probability (including tree diagrams and Venn diagrams)',
      'The binomial distribution',
      'The normal distribution',
      'Statistical hypothesis testing',
      'Kinematics (SUVAT equations)',
      'Kinematics using calculus (variable acceleration)',
      "Forces and Newton's laws of motion",
      'Moments and equilibrium'
    ]
  },
  {
    key: 'further-maths',
    label: 'A Level Further Maths',
    levelDescription: "A Level Further Mathematics (age 16-18), building on A Level Maths. Can include complex numbers, matrices, further algebra and functions (partial fractions, further polynomials), further calculus, polar coordinates, hyperbolic functions, differential equations, further vectors, proof by induction, and further mechanics/statistics topics such as momentum, impulse, circular motion, and discrete probability distributions. Assume a calculator is available.",
    topics: [
      'Complex numbers (Argand diagrams, modulus-argument form)',
      'Matrices and linear transformations',
      'Further algebra (partial fractions, polynomial division)',
      'Proof by induction',
      'Further vectors (planes and lines in 3D)',
      'Polar coordinates',
      'Hyperbolic functions',
      'Further calculus (including further integration techniques)',
      'First order differential equations',
      'Further mechanics (momentum, impulse, circular motion)',
      'Further statistics (discrete probability distributions, chi-squared tests)'
    ]
  },
  {
    key: 'ib-aa-sl',
    label: 'IB Maths: Analysis & Approaches SL',
    levelDescription: "IB Diploma Mathematics: Analysis and Approaches, Standard Level (age 16-18). Covers algebra and sequences, functions and graphs, trigonometry (radians, non-right-angle triangles), exponentials and logarithms, differentiation and integration (polynomials, chain/product/quotient rules, optimisation, kinematics), probability, statistics (descriptive, correlation, normal distribution), and vectors (2D and 3D, lines). Paper 1 is non-calculator, Paper 2 is calculator-allowed - specify which when relevant.",
    topics: [
      'Sequences and series, exponents and logarithms',
      'Functions, graphs and transformations',
      'Trigonometry (radians, identities, non-right-angle triangles)',
      'Exponential and logarithmic functions',
      'Differentiation and its applications',
      'Integration and its applications',
      'Probability (Venn diagrams, conditional probability, discrete random variables)',
      'Statistics (descriptive statistics, correlation, normal distribution)',
      'Vectors (2D and 3D, lines)'
    ]
  },
  {
    key: 'ib-aa-hl',
    label: 'IB Maths: Analysis & Approaches HL',
    levelDescription: "IB Diploma Mathematics: Analysis and Approaches, Higher Level (age 16-18). Everything in AA SL, plus: complex numbers, matrices, further calculus (implicit differentiation, further integration techniques, simple differential equations), proof (including induction), further vectors (planes), compound angle trig identities, and further series. Paper 1 is non-calculator, Paper 2 and Paper 3 (extended-response) are calculator-allowed.",
    topics: [
      'Complex numbers',
      'Matrices',
      'Proof, including proof by induction',
      'Further calculus (implicit differentiation, further integration, simple differential equations)',
      'Further vectors (lines and planes in 3D)',
      'Further trigonometry (compound angle identities)',
      'Further series and sequences'
    ]
  },
  {
    key: 'ib-ai-sl',
    label: 'IB Maths: Applications & Interpretation SL',
    levelDescription: "IB Diploma Mathematics: Applications and Interpretation, Standard Level (age 16-18). More applied and technology-focused than AA - covers number and algebra (including financial maths), functions and modelling, geometry and trigonometry (including 2D/3D geometry and Voronoi diagrams), statistics (bivariate data, regression, distributions, chi-squared test), probability, and introductory calculus (differentiation, integration, optimisation, kinematics). Both papers are calculator-allowed - there is no non-calculator paper in this course.",
    topics: [
      'Number, algebra and financial mathematics',
      'Functions and mathematical modelling',
      'Geometry and trigonometry (including Voronoi diagrams)',
      'Statistics (bivariate data, correlation, regression, distributions, chi-squared test)',
      'Probability (discrete random variables)',
      'Introductory calculus (differentiation, integration, optimisation, kinematics)'
    ]
  },
  {
    key: 'ib-ai-hl',
    label: 'IB Maths: Applications & Interpretation HL',
    levelDescription: "IB Diploma Mathematics: Applications and Interpretation, Higher Level (age 16-18). Everything in AI SL, plus: matrices, further statistics (further hypothesis testing, Spearman's rank correlation), further modelling (non-linear regression), simple differential equations, volumes of revolution, and further probability/kinematics using 2D vectors. Both papers and Paper 3 (extended-response) are calculator-allowed.",
    topics: [
      'Matrices',
      'Further statistics (further hypothesis tests, Spearman\'s rank correlation)',
      'Further modelling (non-linear regression)',
      'Simple differential equations',
      'Volumes of revolution',
      'Further kinematics using 2D vectors'
    ]
  },
  {
    key: 'general-numeracy',
    label: 'Number Confidence',
    levelDescription: "General numeracy practice for someone building confidence with everyday maths, not tied to any exam syllabus. Covers arithmetic, fractions, decimals, and percentages in practical contexts (shopping, cooking, splitting bills, discounts). Keep language plain and encouraging, avoid exam jargon like 'marks' or 'grade boundaries' - frame feedback in terms of understanding, not marks.",
    topics: [
      'Arithmetic with whole numbers and decimals',
      'Fractions in everyday situations',
      'Percentages (discounts, tips, interest)',
      'Estimating and rounding sensibly',
      'Working with money and budgets'
    ]
  },
  {
    key: 'general-algebra',
    label: 'Everyday Algebra & Problem Solving',
    levelDescription: "General practice for someone wanting to get comfortable with basic algebra and logical problem-solving, not tied to any exam syllabus. Keep it practical and confidence-building rather than exam-technique focused.",
    topics: [
      'Simple equations and rearranging formulas',
      'Ratio and proportion in real situations',
      'Sequences and patterns',
      'Basic graphs and reading data from them',
      'Step-by-step problem solving'
    ]
  },
  {
    key: 'general-applied',
    label: 'Applied Maths for Life',
    levelDescription: "General practice on maths people actually use day to day, not tied to any exam syllabus. Practical and real-world framed.",
    topics: [
      'Measurement and units (including conversions)',
      'Reading charts, tables and simple statistics',
      'Time, distance and speed problems',
      'Area and volume for practical tasks (DIY, gardening, etc.)',
      'Understanding probability in everyday contexts'
    ]
  },
  {
    key: 'general-reasoning',
    label: 'Logic & Number Puzzles',
    levelDescription: "General logical reasoning and number-puzzle style practice for someone who enjoys a maths challenge without exam pressure, not tied to any exam syllabus. Can be playful and puzzle-like in tone.",
    topics: [
      'Number puzzles and sequences',
      'Logical reasoning problems',
      'Simple probability puzzles',
      'Pattern recognition',
      'Multi-step word problems'
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
