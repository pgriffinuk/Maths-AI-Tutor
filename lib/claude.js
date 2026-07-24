// Server-side only. Never import this file from a client component -
// it uses the secret ANTHROPIC_API_KEY, which must never reach the browser.

// Max AI-marking API calls (generate-question, mark-working, hint, chat
// combined) a single student can make in a rolling 24 hours.
export const DAILY_CALL_LIMIT = 40;

export async function callClaude({ system, userText, expectJson }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system,
      messages: [{ role: 'user', content: userText }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = (data.content || []).map((b) => b.text || '').join('\n').trim();

  if (expectJson) {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }
  return text;
}

export const COURSES = [
  {
    key: 'gcse-foundation',
    label: 'GCSE / IGCSE Foundation',
    levelDescription: "GCSE/IGCSE Foundation tier (age 14-16, grades 1-5 target). No algebraic fractions, no calculus, no higher-tier trigonometry (SOHCAHTOA only, no sine/cosine rule, no exact trig values beyond basics). Numbers should be manageable without a calculator unless stated.",
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
    label: 'GCSE / IGCSE Higher',
    levelDescription: "GCSE/IGCSE Higher tier (age 14-16, grades 4-9 target). Can include algebraic fractions, the quadratic formula and completing the square, circle theorems, sine/cosine rule and exact trig values, surds, fractional and negative indices, direct/inverse proportion with algebra, vectors, function notation, iteration, and algebraic proof. No calculus.",
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
  }
];
