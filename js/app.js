import { auth, db, storage } from './auth.js';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs,
  onSnapshot, serverTimestamp, query, where, writeBatch, arrayUnion, arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

// ── COURSE DATA ────────────────────────────────────────────────
const COURSE_DATA = {
  'Algebra 1': [
    { value: 'Topic 1',  label: 'Topic 1 — Mathematical Expressions', sections: ['1.1', '1.2', '1.3'] },
    { value: 'Topic 2',  label: 'Topic 2 — More Variables',            sections: ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6'] },
    { value: 'Topic 3',  label: 'Topic 3 — Two-Variable Equations',    sections: ['3.1', '3.2', '3.3', '3.4'] },
    { value: 'Topic 4',  label: 'Topic 4 — Proportion',                sections: ['4.1', '4.2', '4.3', '4.4'] },
    { value: 'Topic 5',  label: 'Topic 5 — Linear Graphs',             sections: ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6'] },
    { value: 'Topic 6',  label: 'Topic 6 — Basic Inequalities',        sections: ['6.1', '6.2', '6.3', '6.4', '6.5'] },
    { value: 'Topic 7',  label: 'Topic 7 — Introduction to Quadratics',sections: ['7.1', '7.2', '7.3'] },
    { value: 'Topic 8',  label: 'Topic 8 — More Factorization',        sections: ['8.1', '8.2', '8.3'] },
    { value: 'Topic 9',  label: 'Topic 9 — Complex Number',            sections: ['9.1', '9.2', '9.3'] },
    { value: 'Topic 10', label: 'Topic 10 — Completing the Squares',   sections: ['10.1', '10.2', '10.3'] },
    { value: 'Topic 11', label: 'Topic 11 — Graphing Quadratics',      sections: ['11.1', '11.2', '11.3', '11.4', '11.5'] },
    { value: 'Topic 12', label: 'Topic 12 — Functions',                sections: ['12.1', '12.2', '12.3'] },
    { value: 'Topic 13', label: 'Topic 13 — Graphs and Transformation',sections: ['13.1', '13.2', '13.3'] },
    { value: 'Topic 14', label: 'Topic 14 — Polynomial Arithmetic',    sections: ['14.1', '14.2', '14.3'] },
    { value: 'Topic 15', label: 'Topic 15 — Statistics',               sections: ['15.1', '15.2', '15.3'] },
  ],
  'Algebra 2': [
    { value: 'Ch.1',  label: 'Ch.1 — Functions and Linear',
      sections: ['1.1 Functions','1.1 Domain','1.2 Transformation','1.3 Slope','1.4 Linear','1.5 Equation','1.6 Two Lines','1.8 Abs. Value','1.9 Abs. Ineq.'],
      mcq: [
        { q:'Q1', section:'1.1 Functions',      pts:2 }, { q:'Q2', section:'1.1 Domain',       pts:2 },
        { q:'Q3', section:'1.2 Transformation', pts:2 }, { q:'Q4', section:'1.3 Slope',         pts:2 },
        { q:'Q5', section:'1.4 Linear',         pts:2 }, { q:'Q6', section:'1.5 Equation',      pts:2 },
        { q:'Q7', section:'1.6 Two Lines',      pts:2 }, { q:'Q8', section:'1.8 Abs. Value',    pts:2 },
        { q:'Q9', section:'1.9 Abs. Ineq.',     pts:2 },
      ],
      frq: [
        { q:'Q10', section:'1.1+1.2',       maxPts:6, parts:['(a)2','(b)2','(c)2'] },
        { q:'Q11', section:'1.3+1.5',       maxPts:6, parts:['(a)2','(b)2','(c)2'] },
        { q:'Q12', section:'1.4+1.6',       maxPts:6, parts:['(a)3','(b)3']        },
        { q:'Q13', section:'1.7 Piecewise', maxPts:7, parts:['(a)3','(b)4']        },
        { q:'Q14', section:'1.8+1.9',       maxPts:7, parts:['(a)3','(b)2','(c)2'] },
      ]
    },
    { value: 'Ch.2',  label: 'Ch.2 — Systems and Matrices',
      sections: ['2.1 Systems','2.1 Types','2.2 Word Problems','2.3 Inequalities','2.4 Linear Prog.','2.5 Matrices','2.6 Inverse'],
      mcq: [
        { q:'Q1', section:'2.1 Systems of Eq.',      pts:2 }, { q:'Q2', section:'2.1 Types of Sol.',    pts:2 },
        { q:'Q3', section:'2.2 Word Problems',        pts:2 }, { q:'Q4', section:'2.3 Inequalities',    pts:2 },
        { q:'Q5', section:'2.4 Linear Prog.',         pts:2 }, { q:'Q6', section:'2.5 Algebra of Mat.', pts:2 },
        { q:'Q7', section:'2.5 Matrix Mult.',         pts:2 }, { q:'Q8', section:'2.6 Inverse Matrix',  pts:2 },
        { q:'Q9', section:'2.6 Matrix Eq.',           pts:2 },
      ],
      frq: [
        { q:'Q10', section:'2.1+2.2 Systems & WP',      maxPts:6,  parts:['(a)3','(b)3']        },
        { q:'Q11', section:'2.3+2.4 Ineq. & LP',        maxPts:7,  parts:['(a)3','(b)2','(c)2'] },
        { q:'Q12', section:'2.5 Algebra of Matrices',   maxPts:6,  parts:['(a)2','(b)2','(c)2'] },
        { q:'Q13', section:'2.6 Inverse & Matrix Eq.',  maxPts:6,  parts:['(a)2','(b)4']        },
        { q:'Q14', section:'2.1 # of Solutions',        maxPts:7,  parts:['(a)2','(b)2','(c)3'] },
      ]
    },
    { value: 'Ch.3',  label: 'Ch.3 — Factoring and Expanding Polynomials',
      sections: ['3.1 Exponents','3.2 Polynomials','3.3 Special Prod.','3.4 GCF','3.5 Quadratic','3.6 Poly. Factor','3.7 Poly. Eq.','3.8 Word Prob.','3.9 Inequalities'],
      mcq: [
        { q:'Q1', section:'3.1 Law of Exponents',    pts:2 }, { q:'Q2', section:'3.2+3.3 Poly. & Mult.', pts:2 },
        { q:'Q3', section:'3.3 Special Products',    pts:2 }, { q:'Q4', section:'3.4 Factoring GCF',     pts:2 },
        { q:'Q5', section:'3.5 Factoring Quad.',     pts:2 }, { q:'Q6', section:'3.5 Factoring (a≠1)',   pts:2 },
        { q:'Q7', section:'3.6 Factoring Poly.',     pts:2 }, { q:'Q8', section:'3.7 Poly. Equations',   pts:2 },
        { q:'Q9', section:'3.9 Poly. Inequalities',  pts:2 },
      ],
      frq: [
        { q:'Q10', section:'3.1+3.2 Exp. & Poly.',       maxPts:6,  parts:['(a)3','(b)3']        },
        { q:'Q11', section:'3.4+3.5 Factoring',           maxPts:6,  parts:['(a)2','(b)2','(c)2'] },
        { q:'Q12', section:'3.6+3.7 Poly. & Equations',  maxPts:7,  parts:['(a)2','(b)3','(c)2'] },
        { q:'Q13', section:'3.8+3.9 WP & Inequalities',  maxPts:6,  parts:['(a)3','(b)3']        },
        { q:'Q14', section:'3.3+3.5 Special & Factor',   maxPts:7,  parts:['(a)2','(b)3','(c)2'] },
      ]
    },
    { value: 'Ch.4',  label: 'Ch.4 — Quadratic Function',
      sections: ['4.1 Imaginary','4.2 Complex','4.3 Graphing','4.4 Vertex','4.5 Optimization','4.6 Zeros Factor','4.7 Completing Sq.','4.8 Quad. Formula','4.10 Inequalities','4.11 Discriminant','4.12 Sum & Product'],
      mcq: [
        { q:'Q1', section:'4.1+4.2 Imaginary & Complex', pts:2 }, { q:'Q2', section:'4.2 Complex Numbers',      pts:2 },
        { q:'Q3', section:'4.3+4.4 Graphing & Vertex',   pts:2 }, { q:'Q4', section:'4.5 Optimization',         pts:2 },
        { q:'Q5', section:'4.6+4.7 Zeros (Factor/CTS)',  pts:2 }, { q:'Q6', section:'4.8 Quadratic Formula',    pts:2 },
        { q:'Q7', section:'4.10 Quad. Inequalities',     pts:2 }, { q:'Q8', section:'4.11 Discriminant',        pts:2 },
        { q:'Q9', section:'4.12 Sum & Product of Roots', pts:2 },
      ],
      frq: [
        { q:'Q10', section:'4.1+4.2 Complex Numbers',     maxPts:6,  parts:['(a)2','(b)2','(c)2'] },
        { q:'Q11', section:'4.3+4.4 Graphing & Vertex',   maxPts:7,  parts:['(a)3','(b)2','(c)2'] },
        { q:'Q12', section:'4.5+4.8 Optim. & Quad. Fml', maxPts:6,  parts:['(a)3','(b)3']        },
        { q:'Q13', section:'4.10+4.11 Ineq. & Discrim.', maxPts:6,  parts:['(a)3','(b)3']        },
        { q:'Q14', section:'4.12 Sum & Product of Roots', maxPts:7,  parts:['(a)2','(b)2','(c)3'] },
      ]
    },
    { value: 'Ch.5',  label: 'Ch.5 — Polynomials',
      sections: ['5.1 Graphing','5.1 Zeros','5.2 Division','5.2 Synthetic','5.3 Remainder','5.3 Factor Thm.','5.4 Root Thms.','5.4 All Roots','5.5 Complex Roots'],
      mcq: [
        { q:'Q1', section:'5.1 Graphing Poly.',       pts:2 }, { q:'Q2', section:'5.1 Zeros & Mult.',      pts:2 },
        { q:'Q3', section:'5.2 Dividing Poly.',       pts:2 }, { q:'Q4', section:'5.2 Synthetic Division', pts:2 },
        { q:'Q5', section:'5.3 Remainder Thm.',       pts:2 }, { q:'Q6', section:'5.3 Factor Theorem',     pts:2 },
        { q:'Q7', section:'5.4 Theorems/Roots',       pts:2 }, { q:'Q8', section:'5.4 Finding All Roots',  pts:2 },
        { q:'Q9', section:'5.5 Complex Roots',        pts:2 },
      ],
      frq: [
        { q:'Q10', section:'5.1 Graphing Polynomials',       maxPts:10, parts:['(a)3','(b)4','(c)3'] },
        { q:'Q11', section:'5.2+5.3 Division & Thms.',       maxPts:8,  parts:['(a)3','(b)3','(c)2'] },
        { q:'Q12', section:'5.4 Theorems about Roots',       maxPts:7,  parts:['(a)2','(b)3','(c)2'] },
        { q:'Q13', section:'5.5 Complex Roots',              maxPts:7,  parts:['(a)3','(b)4']        },
      ]
    },
    { value: 'Ch.6',  label: 'Ch.6 — Rational Expressions',
      sections: ['6.1 Simplify','6.2 Mult./Div.','6.3 Add/Sub','6.4 Complex Frac.','6.5 Rational Eq.','6.6 Graphs'],
      mcq: [
        { q:'Q1', section:'6.1 Simplifying',           pts:2 }, { q:'Q2', section:'6.2 Mult. & Div.',         pts:2 },
        { q:'Q3', section:'6.3 Sums & Diff.',          pts:2 }, { q:'Q4', section:'6.3 Sums & Diff. (LCD)',   pts:2 },
        { q:'Q5', section:'6.4 Complex Fractions',     pts:2 }, { q:'Q6', section:'6.4 Complex Frac. (Neg.)', pts:2 },
        { q:'Q7', section:'6.5 Rational Equations',    pts:2 }, { q:'Q8', section:'6.5 Word Problems',        pts:2 },
        { q:'Q9', section:'6.6 Graph of Rational Fn.', pts:2 },
      ],
      frq: [
        { q:'Q10', section:'6.1+6.2 Simplify/Mult./Div.',  maxPts:10, parts:['(a)3','(b)3','(c)4'] },
        { q:'Q11', section:'6.3 Sums & Differences',       maxPts:9,  parts:['(a)3','(b)3','(c)3'] },
        { q:'Q12', section:'6.4+6.5 Complex Frac. & Eq.',  maxPts:10, parts:['(a)3','(b)4','(c)3'] },
        { q:'Q13', section:'6.6 Graph of Rational Fn.',    maxPts:9,  parts:['(a)4','(b)5']        },
        { q:'Q14', section:'6.3+6.5 Rational Eq. & WP',   maxPts:12, parts:['(a)4','(b)4','(c)4'] },
      ]
    },
    { value: 'Ch.7',  label: 'Ch.7 — Radicals',                            sections: ['7.1','7.2','7.3','7.4','7.5','7.6'] },
    { value: 'Ch.8',  label: 'Ch.8 — Exponential and Logarithm',           sections: ['8.1','8.2','8.3','8.4','8.5','8.6','8.7','8.8'] },
    { value: 'Ch.9',  label: 'Ch.9 — Sequence and Series',                 sections: ['9.1','9.2','9.3','9.4'] },
    { value: 'Ch.10', label: 'Ch.10 — Coordinate Geometry',                sections: ['10.1','10.2','10.3'] },
    { value: 'Ch.11', label: 'Ch.11 — Basic Statistics',                   sections: ['11.1','11.2','11.3','11.4'] },
  ],
  'Precalculus': [
    { value: 'Ch.1',  label: 'Ch.1 — Functions',                           sections: ['1.1','1.2','1.3','1.4','1.5','1.6','1.7'] },
    { value: 'Ch.2',  label: 'Ch.2 — Polynomial and Rational Functions',   sections: ['2.1','2.2','2.3','2.4','2.5','2.6','2.7'] },
    { value: 'Ch.3',  label: 'Ch.3 — Exponential and Logarithmic',        sections: ['3.1','3.2','3.3','3.4','3.5','3.6'] },
    { value: 'Ch.4',  label: 'Ch.4 — Trigonometry Definition and Graphs', sections: ['4.1','4.2','4.3'] },
    { value: 'Ch.5',  label: 'Ch.5 — Trigonometry Identities',            sections: ['5.1','5.2','5.3','5.4','5.5','5.6'] },
    { value: 'Ch.6',  label: 'Ch.6 — Trig Equations and Geometry',        sections: ['6.1','6.2','6.3','6.4','6.5'] },
    { value: 'Ch.7',  label: 'Ch.7 — Polar and Complex Number',           sections: ['7.1','7.2','7.3','7.4'] },
    { value: 'Ch.8',  label: 'Ch.8 — Vector',                             sections: ['8.1','8.2','8.3','8.4','8.5','8.6'] },
    { value: 'Ch.9',  label: 'Ch.9 — Conic Section',                      sections: ['9.1','9.2','9.3','9.4','9.5'] },
    { value: 'Ch.10', label: 'Ch.10 — Matrix and System of Equation',     sections: ['10.1','10.2','10.3','10.4'] },
    { value: 'Ch.11', label: 'Ch.11 — Sequence and Series',               sections: ['11.1','11.2','11.3','11.4','11.5','11.6'] },
  ],
  'AP Precalculus': [
    { value: 'Ch.1',  label: 'Ch.1 — Functions',                          sections: ['1.1','1.2','1.3','1.4','1.5','1.6','1.7','1.8'] },
    { value: 'Ch.2',  label: 'Ch.2 — Polynomial and Rational Functions',  sections: ['2.1','2.2','2.3','2.4','2.5','2.6','2.7'] },
    { value: 'Ch.3',  label: 'Ch.3 — Exponential and Logarithmic',        sections: ['3.1','3.2','3.3','3.4','3.5','3.6','3.7','3.8','3.9'] },
    { value: 'Ch.4',  label: 'Ch.4 — Trigonometry Definition and Graphs', sections: ['4.1','4.2','4.3','4.4','4.5','4.6','4.7'] },
    { value: 'Ch.5',  label: 'Ch.5 — Trigonometry Identities',            sections: ['5.1','5.2','5.3','5.4','5.5'] },
    { value: 'Ch.6',  label: 'Ch.6 — Trig Equations and Inequalities',    sections: ['6.1','6.2','6.3'] },
    { value: 'Ch.7',  label: 'Ch.7 — Polar Curve',                        sections: ['7.1','7.2','7.3'] },
    { value: 'Ch.8',  label: 'Ch.8 — Parametric Equation ※ Not on AP',   sections: ['8.1','8.2','8.3'] },
    { value: 'Ch.9',  label: 'Ch.9 — Conic Section ※ Not on AP',         sections: ['9.1','9.2','9.3','9.4','9.5'] },
    { value: 'Ch.10', label: 'Ch.10 — Vector ※ Not on AP',               sections: ['10.1','10.2','10.3','10.4'] },
    { value: 'Ch.11', label: 'Ch.11 — Matrices ※ Not on AP',             sections: ['11.1','11.2','11.3','11.4'] },
  ],
  'AP Calculus AB': [
    { value: 'Ch.1',  label: 'Ch.1 — Limit',                         sections: ['Limit Intro','Limit Laws','One-Sided Limits','Limits at Infinity'] },
    { value: 'Ch.2',  label: 'Ch.2 — Continuity and Discontinuity',  sections: ['Continuity Definition','Types of Discontinuity','IVT','Removable Discontinuity'] },
    { value: 'Ch.3',  label: 'Ch.3 — Differentiation',               sections: ['Derivative Definition','Derivative Rules','Higher Derivatives','Tangent Lines'] },
    { value: 'Ch.4',  label: 'Ch.4 — Technique of Differentiation',  sections: ['Product Rule','Quotient Rule','Chain Rule','Implicit Differentiation'] },
    { value: 'Ch.5',  label: 'Ch.5 — Differentiability and Tangent', sections: ['Differentiability','Linear Approximation','L\'Hôpital\'s Rule'] },
    { value: 'Ch.6',  label: 'Ch.6 — Extrema and First Derivative',  sections: ['Critical Points','First Derivative Test','Absolute Extrema'] },
    { value: 'Ch.7',  label: 'Ch.7 — Concavity and Second Derivative',sections: ['Concavity','Second Derivative Test','Inflection Points'] },
    { value: 'Ch.8',  label: 'Ch.8 — Motions and Derivatives',       sections: ['Position','Velocity','Acceleration','Particle Motion'] },
    { value: 'Ch.9',  label: 'Ch.9 — Optimization and Related Rates',sections: ['Optimization Setup','Solving Optimization','Related Rates'] },
    { value: 'Ch.10', label: 'Ch.10 — Applications of Differentiation',sections: ['Mean Value Theorem','Rolle\'s Theorem','Applied Problems'] },
    { value: 'Ch.11', label: 'Ch.11 — Antiderivatives',              sections: ['Antiderivative Rules','U-Substitution','Initial Value Problems'] },
    { value: 'Ch.12', label: 'Ch.12 — Definite Integral',            sections: ['Riemann Sums','Definite Integral','Properties of Integrals'] },
    { value: 'Ch.13', label: 'Ch.13 — Fundamental Theorem of Calculus',sections: ['FTC Part 1','FTC Part 2','Net Change Theorem'] },
    { value: 'Ch.14', label: 'Ch.14 — Approximating Area',           sections: ['Left/Right Riemann','Midpoint Rule','Trapezoidal Rule'] },
    { value: 'Ch.15', label: 'Ch.15 — Area and Volume',              sections: ['Area Between Curves','Disk Method','Washer Method','Shell Method'] },
    { value: 'Ch.16', label: 'Ch.16 — More Applications and Motion', sections: ['Displacement','Total Distance','Accumulation Functions'] },
    { value: 'Ch.17', label: 'Ch.17 — Differential Equation',        sections: ['Separable DEs','Slope Fields','Growth and Decay'] },
  ],
  'AP Calculus BC': [
    { value: 'Ch.1',  label: 'Ch.1 — Limit',                         sections: ['Limit Intro','Limit Laws','One-Sided Limits','Limits at Infinity'] },
    { value: 'Ch.2',  label: 'Ch.2 — Continuity and Discontinuity',  sections: ['Continuity Definition','Types of Discontinuity','IVT','Removable Discontinuity'] },
    { value: 'Ch.3',  label: 'Ch.3 — Differentiation',               sections: ['Derivative Definition','Derivative Rules','Higher Derivatives','Tangent Lines'] },
    { value: 'Ch.4',  label: 'Ch.4 — Technique of Differentiation',  sections: ['Product Rule','Quotient Rule','Chain Rule','Implicit Differentiation'] },
    { value: 'Ch.5',  label: 'Ch.5 — Differentiability and Tangent', sections: ['Differentiability','Linear Approximation','L\'Hôpital\'s Rule'] },
    { value: 'Ch.6',  label: 'Ch.6 — Extrema and First Derivative',  sections: ['Critical Points','First Derivative Test','Absolute Extrema'] },
    { value: 'Ch.7',  label: 'Ch.7 — Concavity and Second Derivative',sections: ['Concavity','Second Derivative Test','Inflection Points'] },
    { value: 'Ch.8',  label: 'Ch.8 — Motions and Derivatives',       sections: ['Position','Velocity','Acceleration','Particle Motion'] },
    { value: 'Ch.9',  label: 'Ch.9 — Optimization and Related Rates',sections: ['Optimization Setup','Solving Optimization','Related Rates'] },
    { value: 'Ch.10', label: 'Ch.10 — Applications of Differentiation',sections: ['Mean Value Theorem','Rolle\'s Theorem','Applied Problems'] },
    { value: 'Ch.11', label: 'Ch.11 — Antiderivatives',              sections: ['Antiderivative Rules','U-Substitution','Initial Value Problems'] },
    { value: 'Ch.12', label: 'Ch.12 — Definite Integral',            sections: ['Riemann Sums','Definite Integral','Properties of Integrals'] },
    { value: 'Ch.13', label: 'Ch.13 — Fundamental Theorem of Calculus',sections: ['FTC Part 1','FTC Part 2','Net Change Theorem'] },
    { value: 'Ch.14', label: 'Ch.14 — Approximating Area',           sections: ['Left/Right Riemann','Midpoint Rule','Trapezoidal Rule'] },
    { value: 'Ch.15', label: 'Ch.15 — Area and Volume',              sections: ['Area Between Curves','Disk Method','Washer Method','Shell Method'] },
    { value: 'Ch.16', label: 'Ch.16 — More Applications and Motion', sections: ['Displacement','Total Distance','Accumulation Functions'] },
    { value: 'Ch.17', label: 'Ch.17 — Differential Equation',        sections: ['Separable DEs','Slope Fields','Growth and Decay'] },
    { value: 'Ch.18', label: 'Ch.18 — Euler Method, Logistic Curve (BC)', sections: ['Euler\'s Method','Logistic Growth','Carrying Capacity'] },
    { value: 'Ch.19', label: 'Ch.19 — Integration for BC',           sections: ['Integration by Parts','Partial Fractions','Improper Integrals'] },
    { value: 'Ch.20', label: 'Ch.20 — Infinite Series',              sections: ['Convergence Tests','p-Series','Geometric Series','Alternating Series'] },
    { value: 'Ch.21', label: 'Ch.21 — Power Series',                 sections: ['Power Series Definition','Radius of Convergence','Interval of Convergence'] },
    { value: 'Ch.22', label: 'Ch.22 — Taylor Series',                sections: ['Taylor Polynomials','Maclaurin Series','Common Taylor Series'] },
    { value: 'Ch.23', label: 'Ch.23 — Parametric Equation',          sections: ['Parametric Derivatives','Arc Length','Parametric Area'] },
    { value: 'Ch.24', label: 'Ch.24 — Polar Equation',               sections: ['Polar Derivatives','Polar Area','Polar Arc Length'] },
  ],
};

const SUBJECTS = Object.keys(COURSE_DATA);
const GRADES   = ['G8','G9','G10','G11','G12','College'];

// ── CONFIG HELPERS ─────────────────────────────────────────────
function generateDefaultConfig(sections) {
  const secs = sections.length > 0 ? sections : ['Part A','Part B','Part C'];
  const mcq  = secs.map((s, i) => ({ q: `Q${i+1}`, section: s, pts: 2 }));
  const n    = secs.length;
  const frqCount  = n <= 3 ? 3 : n <= 6 ? 4 : 5;
  const frqTotal  = Math.round(n * 2 * 1.5); // MCQ*1.5 → FRQ ≈ 60% of total

  const frq = [];
  let rem = frqTotal;
  for (let i = 0; i < frqCount; i++) {
    const isLast = i === frqCount - 1;
    const pts    = isLast ? Math.max(3, rem) : Math.max(3, Math.round(rem / (frqCount - i)));
    rem -= pts;
    const partCount = pts <= 4 ? 2 : 3;
    const pBase = Math.floor(pts / partCount);
    const pRem  = pts - pBase * partCount;
    const parts = Array.from({ length: partCount }, (_, j) =>
      `(${String.fromCharCode(97 + j)})${pBase + (j === partCount - 1 ? pRem : 0)}`
    );
    frq.push({ q: `Q${n + 1 + i}`, section: secs[i % secs.length], maxPts: pts, parts });
  }
  return { mcq, frq };
}

function getChapterData(subject, chapterValue) {
  const chapters = COURSE_DATA[subject] || [];
  return chapters.find(c => c.value === chapterValue) || null;
}

// ── STATE ──────────────────────────────────────────────────────
let currentUser        = null;
let currentUserProfile = null;
let students  = [];
let scores    = [];
let materials = [];
let unsubStudents  = null;
let unsubScores    = null;
let unsubMaterials = null;
let currentRole        = 'teacher';
let currentStudentView = null;
let activeSubject = '';
let activeChapter = '';

// ── SCORING LOGIC (do not modify) ─────────────────────────────
function getTier(pct) {
  if (pct >= 76) return 'green';
  if (pct >= 56) return 'amber';
  return 'red';
}
function getTierLabel(pct) {
  if (pct >= 76) return '✓  76% 이상 — 다음 챕터 바로 진행';
  if (pct >= 56) return '↻  56–75% — 다음 챕터 진행 + 취약 단원 병행 보충';
  return '✗  55% 이하 — 기존 챕터 복습 1회 후 다음 챕터 시작';
}
function getNextStep(pct) {
  if (pct >= 76) return '다음 챕터로 바로 진행합니다. 틀린 문항은 오답풀이로 확인하세요.';
  if (pct >= 56) return '다음 챕터 진도를 나가면서, 취약 단원을 병행하여 보충합니다.';
  return '기존 챕터를 1회 복습한 후 다음 챕터를 시작합니다.';
}
function getSelfStudyTask(pct) {
  if (pct >= 76) return null;
  if (pct >= 56) return '📝  자기주도 과제: 틀린 단원의 교재에서 각 Example 별 첫 문제를 직접 다시 풀고, 각 문제별 주요 개념을 영어로 한 문장씩 노트에 정리해오세요.\n예) "Example 1-1. The slope shows the rate of change of a line."';
  return '📚  자기주도 과제: 취약 단원의 교재 핵심 개념 박스(shaded box)를 중심으로 스스로 복습한 이후, 다음 수업 시간에 본인만의 언어로 설명해보세요.';
}

// ── AUTH ERROR MESSAGES ────────────────────────────────────────
function getAuthErrorMessage(code) {
  const map = {
    'auth/user-not-found':       '등록되지 않은 이메일입니다.',
    'auth/wrong-password':       '비밀번호가 올바르지 않습니다.',
    'auth/invalid-credential':   '이메일 또는 비밀번호가 올바르지 않습니다.',
    'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
    'auth/weak-password':        '비밀번호는 6자 이상이어야 합니다.',
    'auth/invalid-email':        '올바른 이메일 형식이 아닙니다.',
    'auth/too-many-requests':    '시도 횟수가 초과됐습니다. 잠시 후 다시 시도해주세요.',
  };
  return map[code] || '오류가 발생했습니다. 다시 시도해주세요.';
}

// ── AUTH UI ────────────────────────────────────────────────────
document.getElementById('auth-tab-login').addEventListener('click', () => {
  document.getElementById('auth-tab-login').classList.add('active');
  document.getElementById('auth-tab-signup').classList.remove('active');
  document.getElementById('auth-login-form').style.display  = '';
  document.getElementById('auth-signup-form').style.display = 'none';
  document.getElementById('login-error').textContent = '';
});
document.getElementById('auth-tab-signup').addEventListener('click', () => {
  document.getElementById('auth-tab-signup').classList.add('active');
  document.getElementById('auth-tab-login').classList.remove('active');
  document.getElementById('auth-signup-form').style.display = '';
  document.getElementById('auth-login-form').style.display  = 'none';
  document.getElementById('signup-error').textContent = '';
});

// Role selection in signup form
document.getElementById('signup-role').addEventListener('change', () => {
  const role = document.getElementById('signup-role').value;
  document.getElementById('signup-student-fields').style.display = role === 'student' ? '' : 'none';
  document.getElementById('signup-parent-fields').style.display  = role === 'parent'  ? '' : 'none';
});

document.getElementById('btn-forgot-pw').addEventListener('click', async () => {
  const email   = document.getElementById('login-email').value.trim();
  const msgEl   = document.getElementById('reset-msg');
  const errorEl = document.getElementById('login-error');
  if (!email) {
    errorEl.textContent = '이메일을 먼저 입력해주세요.';
    return;
  }
  errorEl.textContent = '';
  msgEl.textContent   = '발송 중...';
  try {
    await sendPasswordResetEmail(auth, email);
    msgEl.textContent = `✓ ${email} 로 재설정 메일을 발송했습니다. 받은편지함을 확인해주세요.`;
    msgEl.classList.add('reset-success');
  } catch (err) {
    msgEl.textContent = '';
    errorEl.textContent = getAuthErrorMessage(err.code);
  }
});

document.getElementById('btn-login').addEventListener('click', async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl  = document.getElementById('login-error');
  const btn      = document.getElementById('btn-login');
  if (!email || !password) { errorEl.textContent = '이메일과 비밀번호를 입력해주세요.'; return; }
  btn.textContent = '로그인 중...'; btn.disabled = true; errorEl.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    errorEl.textContent = getAuthErrorMessage(err.code);
    btn.textContent = '로그인'; btn.disabled = false;
  }
});
document.getElementById('login-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-login').click();
});

document.getElementById('btn-signup').addEventListener('click', async () => {
  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  const role     = document.getElementById('signup-role').value;
  const errorEl  = document.getElementById('signup-error');
  const btn      = document.getElementById('btn-signup');

  if (!name || !email || !password) { errorEl.textContent = '이름, 이메일, 비밀번호를 입력해주세요.'; return; }

  let linkedChildEmail = '';
  if (role === 'parent') {
    linkedChildEmail = document.getElementById('signup-child-email').value.trim().toLowerCase();
    if (!linkedChildEmail) { errorEl.textContent = '자녀 이메일을 입력해주세요.'; return; }
  }

  const grade  = role === 'student' ? (document.getElementById('signup-grade').value  || '') : '';
  const school = role === 'student' ? (document.getElementById('signup-school').value.trim() || '') : '';

  btn.textContent = '가입 중...'; btn.disabled = true; errorEl.textContent = '';
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid  = cred.user.uid;

    // Save user profile
    const profileData = { name, email, role, createdAt: serverTimestamp() };
    if (grade)            profileData.grade            = grade;
    if (school)           profileData.school           = school;
    if (linkedChildEmail) profileData.linkedChildEmail = linkedChildEmail;
    await setDoc(doc(db, 'users', uid), profileData);

    // Student doc is auto-created in onAuthStateChanged after profile is confirmed
  } catch (err) {
    errorEl.textContent = getAuthErrorMessage(err.code);
    btn.textContent = '회원가입'; btn.disabled = false;
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  if (unsubStudents) { unsubStudents(); unsubStudents = null; }
  if (unsubScores)   { unsubScores();   unsubScores   = null; }
  await signOut(auth);
});

// ── AUTH STATE ─────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    // Retry getting user profile up to 3 times (race with signup setDoc)
    let snap;
    for (let i = 0; i < 3; i++) {
      snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) break;
      await new Promise(r => setTimeout(r, 600));
    }
    currentUserProfile = snap.exists()
      ? { uid: user.uid, ...snap.data() }
      : { uid: user.uid, name: user.email, role: 'student' };

    // Auto-ensure student doc exists (handles signup race condition)
    if (currentUserProfile.role === 'student') {
      const email = user.email.toLowerCase();
      const q = query(collection(db, 'students'), where('linkedEmail', '==', email));
      const existing = await getDocs(q);
      if (existing.empty) {
        try {
          await addDoc(collection(db, 'students'), {
            name:        currentUserProfile.name   || email,
            grade:       currentUserProfile.grade  || '',
            school:      currentUserProfile.school || '',
            linkedEmail: email,
            subjects:    [],
            createdAt: serverTimestamp(), autoCreated: true
          });
        } catch (e) { console.warn('student doc create:', e.message); }
      }
    }

    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-gate').style.display    = 'flex';
    document.getElementById('btn-login').textContent = '로그인';
    document.getElementById('btn-login').disabled    = false;
    initApp();
  } else {
    currentUser = null; currentUserProfile = null;
    students = []; scores = [];
    if (chartChapter) { chartChapter.destroy(); chartChapter = null; }
    if (chartDist)    { chartDist.destroy();    chartDist    = null; }
    if (chartTrend)   { chartTrend.destroy();   chartTrend   = null; }
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-gate').style.display    = 'none';
  }
});

// ── APP INIT ───────────────────────────────────────────────────
function initApp() {
  const name = currentUserProfile?.name || currentUser?.email || '—';
  const role = currentUserProfile?.role || 'student';

  document.getElementById('user-avatar').textContent = name.slice(0, 2).toUpperCase();
  document.getElementById('user-name').textContent   = name;
  document.getElementById('user-role').textContent   =
    role === 'teacher' ? '선생님' : role === 'parent' ? '학부모' : '학생';

  currentRole = role;

  if (role === 'teacher') {
    document.getElementById('role-teacher').classList.add('active');
    document.getElementById('role-student').classList.remove('active');
    document.getElementById('student-select-wrap').style.display = 'none';
    document.getElementById('view-mode-section').style.display = '';
    document.querySelectorAll('.teacher-only').forEach(el => el.style.display = '');
  } else {
    // student or parent: hide teacher controls and entire view-mode section
    document.getElementById('view-mode-section').style.display   = 'none';
    document.getElementById('student-select-wrap').style.display = 'none';
    document.querySelectorAll('.teacher-only').forEach(el => el.style.display = 'none');
  }

  // materials-admin nav: teacher only
  const navMatAdmin = document.querySelector('[data-view="materials-admin"]');
  if (navMatAdmin) navMatAdmin.style.display = role === 'teacher' ? '' : 'none';

  setupFirestoreListeners();
  setTodayDates();
  populateSubjectDropdowns();
  showView('dashboard');
}

// ── FIRESTORE LISTENERS ────────────────────────────────────────
function setupFirestoreListeners() {
  if (unsubStudents)  unsubStudents();
  if (unsubScores)    unsubScores();
  if (unsubMaterials) unsubMaterials();

  unsubStudents = onSnapshot(collection(db, 'students'), snap => {
    students = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Resolve currentStudentView for student / parent roles
    if (currentRole === 'student') {
      const linked = students.find(s => s.linkedEmail === currentUser.email.toLowerCase());
      currentStudentView = linked ? linked.id : null;
    } else if (currentRole === 'parent') {
      const childEmail = currentUserProfile?.linkedChildEmail || '';
      const linked = students.find(s => s.linkedEmail === childEmail);
      currentStudentView = linked ? linked.id : null;
    }

    populateStudentSelects();
    if (currentRole === 'teacher') populateStudentViewSelect();
    populateStatsFilter();
    renderStudents();
    renderDashboard();
  });

  unsubScores = onSnapshot(collection(db, 'scores'), snap => {
    scores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDashboard();
    renderStats();
  });

  // Materials listener — teacher gets all; student/parent gets only permitted files
  const isTeacher = currentUserProfile?.role === 'teacher';
  const matQ = isTeacher
    ? collection(db, 'materials')
    : query(collection(db, 'materials'),
        where('allowedEmails', 'array-contains',
              (currentUser?.email || '').toLowerCase()));

  unsubMaterials = onSnapshot(matQ, snap => {
    materials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMaterials();
    if (isTeacher) renderMaterialsAdmin();
  });
}

// ── NAVIGATION ─────────────────────────────────────────────────
const views = ['dashboard', 'add-score', 'students', 'stats', 'materials', 'materials-admin'];
function showView(name) {
  views.forEach(v => {
    document.getElementById('view-' + v)?.classList.toggle('active', v === name);
  });
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === name);
  });
  if (name === 'dashboard')        renderDashboard();
  if (name === 'students')         renderStudents();
  if (name === 'stats')            renderStats();
  if (name === 'materials')        renderMaterials();
  if (name === 'materials-admin') { renderMaterialsAdmin(); initMaterialsUploadForm(); }
}
document.querySelectorAll('[data-view]').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); showView(el.dataset.view); });
});

// ── ROLE TOGGLE ────────────────────────────────────────────────
document.getElementById('role-teacher').addEventListener('click', () => {
  if (currentUserProfile?.role !== 'teacher') return;
  currentRole = 'teacher'; currentStudentView = null;
  document.getElementById('role-teacher').classList.add('active');
  document.getElementById('role-student').classList.remove('active');
  document.getElementById('student-select-wrap').style.display = 'none';
  document.querySelectorAll('.teacher-only').forEach(el => el.style.display = '');
  renderDashboard(); renderStats();
});
document.getElementById('role-student').addEventListener('click', () => {
  if (currentUserProfile?.role !== 'teacher') return; // non-teachers can't toggle
  currentRole = 'student';
  document.getElementById('role-student').classList.add('active');
  document.getElementById('role-teacher').classList.remove('active');
  document.getElementById('student-select-wrap').style.display = 'block';
  document.querySelectorAll('.teacher-only').forEach(el => el.style.display = 'none');
  populateStudentViewSelect();
  renderDashboard();
});

function populateStudentViewSelect() {
  const sel = document.getElementById('student-view-select');
  sel.innerHTML = students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  if (currentStudentView) {
    sel.value = currentStudentView;
  } else if (students.length > 0 && currentRole !== 'student' && currentRole !== 'parent') {
    currentStudentView = students[0].id;
    sel.value = currentStudentView;
  }
  sel.onchange = () => { currentStudentView = sel.value; renderDashboard(); renderStats(); };
}

// ── UNLINKED STUDENT/PARENT GUARD ─────────────────────────────
function showUnlinkedMessage(container) {
  const role = currentUserProfile?.role;
  const msg  = role === 'parent'
    ? '자녀 계정이 연결되지 않았습니다.<br>선생님에게 자녀 이메일 등록을 요청해주세요.'
    : '아직 선생님이 계정을 연결하지 않았습니다.<br>선생님에게 문의해주세요.';
  container.innerHTML = `<div class="unlinked-msg">${msg}</div>`;
}

// ── DASHBOARD ──────────────────────────────────────────────────
function renderDashboard() {
  const isRestricted = (currentRole === 'student' || currentRole === 'parent');

  if (isRestricted && !currentStudentView) {
    document.getElementById('stat-total-students').textContent = '—';
    document.getElementById('stat-total-tests').textContent    = '—';
    document.getElementById('stat-avg').textContent            = '—';
    document.getElementById('stat-pass').textContent           = '—';
    document.getElementById('recent-tbody').innerHTML = '';
    document.getElementById('recent-empty').style.display = 'block';
    document.getElementById('recent-empty').textContent =
      currentRole === 'parent' ? '연결된 자녀 정보가 없습니다.' : '연결된 학생 정보가 없습니다.';
    document.getElementById('dash-sub').textContent = '—';
    return;
  }

  const filteredScores   = isRestricted
    ? scores.filter(s => s.studentId === currentStudentView) : scores;
  const filteredStudents = isRestricted
    ? students.filter(s => s.id === currentStudentView) : students;

  document.getElementById('stat-total-students').textContent = filteredStudents.length;
  document.getElementById('stat-total-tests').textContent    = filteredScores.length;

  if (filteredScores.length) {
    const avg  = Math.round(filteredScores.reduce((a, s) => a + s.got / s.max * 100, 0) / filteredScores.length);
    const pass = Math.round(filteredScores.filter(s => s.got / s.max >= 0.76).length / filteredScores.length * 100);
    document.getElementById('stat-avg').textContent  = avg + '%';
    document.getElementById('stat-pass').textContent = pass + '%';
  } else {
    document.getElementById('stat-avg').textContent  = '—';
    document.getElementById('stat-pass').textContent = '—';
  }

  const sub = document.getElementById('dash-sub');
  if (isRestricted && currentStudentView) {
    const st = students.find(s => s.id === currentStudentView);
    sub.textContent = st ? st.name + ' 학생 현황' : '학생 현황';
  } else {
    sub.textContent = '전체 학생 현황';
  }

  const tsMs = ts => {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts.seconds != null) return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6;
    return 0;
  };
  const recent = [...filteredScores].sort((a, b) => {
    const d = (b.date || '').localeCompare(a.date || '');
    if (d !== 0) return d;
    return tsMs(b.createdAt) - tsMs(a.createdAt);
  }).slice(0, 10);
  const tbody  = document.getElementById('recent-tbody');
  const empty  = document.getElementById('recent-empty');
  if (recent.length === 0) {
    tbody.innerHTML = ''; empty.style.display = 'block';
    empty.textContent = '아직 입력된 점수가 없어요. 점수 입력 탭에서 시작하세요.';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = recent.map(s => {
      const st   = students.find(x => x.id === s.studentId);
      const pct  = Math.round(s.got / s.max * 100);
      const step = pct >= 76 ? '다음 챕터 진행' : pct >= 56 ? '보충 병행' : '복습 후 진행';
      return `<tr>
        <td>${st ? st.name : '—'}</td>
        <td>${s.subject ? `<span style="font-size:11px;color:var(--text-3)">${s.subject}</span> ` : ''}${s.chapter}</td>
        <td>${s.date}</td>
        <td><strong>${s.got}</strong>/${s.max} <span style="color:var(--text-2);font-size:12px">(${pct}%)</span></td>
        <td><span class="badge badge-${getTier(pct)}">${pct}%</span></td>
        <td style="font-size:13px;color:var(--text-2)">${step}</td>
      </tr>`;
    }).join('');
  }
}

// ── SCORE FORM — SUBJECT / CHAPTER DROPDOWNS ──────────────────
function populateSubjectDropdowns() {
  const opts = ['<option value="">과목 선택…</option>',
    ...SUBJECTS.map(s => `<option value="${s}">${s}</option>`)
  ].join('');
  document.getElementById('score-subject').innerHTML  = opts;
  document.getElementById('detail-subject').innerHTML = opts;
}

function updateChapterDropdown(subjectVal, chapterSelId) {
  const chapters = COURSE_DATA[subjectVal] || [];
  const sel = document.getElementById(chapterSelId);
  sel.innerHTML = '<option value="">챕터 선택…</option>' +
    chapters.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
}

function filterSubjectsByStudent(studentId) {
  const st = students.find(s => s.id === studentId);
  const allowedSubjects = st?.subjects?.length ? st.subjects : SUBJECTS;
  ['score-subject', 'detail-subject'].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="">과목 선택…</option>' +
      SUBJECTS.filter(s => allowedSubjects.includes(s))
              .map(s => `<option value="${s}">${s}</option>`).join('');
  });
}

// Student selection → filter subject dropdown
document.getElementById('score-student').addEventListener('change', () => {
  filterSubjectsByStudent(document.getElementById('score-student').value);
  document.getElementById('score-chapter').innerHTML = '<option value="">챕터 선택…</option>';
});
document.getElementById('detail-student').addEventListener('change', () => {
  filterSubjectsByStudent(document.getElementById('detail-student').value);
  document.getElementById('detail-chapter').innerHTML = '<option value="">챕터 선택…</option>';
});

// Subject → update chapter dropdown
document.getElementById('score-subject').addEventListener('change', () => {
  activeSubject = document.getElementById('score-subject').value;
  updateChapterDropdown(activeSubject, 'score-chapter');
  // sync detail subject
  document.getElementById('detail-subject').value = activeSubject;
  updateChapterDropdown(activeSubject, 'detail-chapter');
});
document.getElementById('detail-subject').addEventListener('change', () => {
  activeSubject = document.getElementById('detail-subject').value;
  updateChapterDropdown(activeSubject, 'detail-chapter');
  document.getElementById('score-subject').value = activeSubject;
  updateChapterDropdown(activeSubject, 'score-chapter');
  // also re-render detail grid if chapter already selected
  activeChapter = document.getElementById('detail-chapter').value;
  if (activeChapter) renderDetailForm();
});

// Chapter (detail tab) → rebuild MCQ/FRQ grid
document.getElementById('detail-chapter').addEventListener('change', () => {
  activeChapter = document.getElementById('detail-chapter').value;
  document.getElementById('score-chapter').value = activeChapter;
  if (activeChapter && activeSubject) renderDetailForm();
});
document.getElementById('score-chapter').addEventListener('change', () => {
  activeChapter = document.getElementById('score-chapter').value;
  document.getElementById('detail-chapter').value = activeChapter;
});

function populateStudentSelects() {
  const opts = ['<option value="">학생 선택…</option>',
    ...students.map(s => `<option value="${s.id}">${s.name}</option>`)
  ].join('');
  document.getElementById('score-student').innerHTML  = opts;
  document.getElementById('detail-student').innerHTML = opts;
}

function setTodayDates() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('score-date').value   = today;
  document.getElementById('detail-date').value  = today;
}

function updatePreview() {
  const got = parseFloat(document.getElementById('score-got').value);
  const max = parseFloat(document.getElementById('score-max').value);
  const el  = document.getElementById('score-preview');
  if (!isNaN(got) && !isNaN(max) && max > 0) {
    const pct = Math.round(got / max * 100);
    el.textContent = pct + '%';
    const t = getTier(pct);
    el.style.color = t === 'green' ? 'var(--green)' : t === 'amber' ? 'var(--amber)' : 'var(--red)';
  } else { el.textContent = '—'; el.style.color = ''; }
}
document.getElementById('score-got').addEventListener('input', updatePreview);
document.getElementById('score-max').addEventListener('input', updatePreview);

document.getElementById('tab-total').addEventListener('click', () => {
  document.getElementById('tab-total').classList.add('active');
  document.getElementById('tab-detail').classList.remove('active');
  document.getElementById('form-total').style.display  = '';
  document.getElementById('form-detail').style.display = 'none';
});
document.getElementById('tab-detail').addEventListener('click', () => {
  document.getElementById('tab-detail').classList.add('active');
  document.getElementById('tab-total').classList.remove('active');
  document.getElementById('form-total').style.display  = 'none';
  document.getElementById('form-detail').style.display = '';
  renderDetailForm();
});

// ── DETAIL FORM (dynamic MCQ / FRQ) ───────────────────────────
let mcqState = {};
let frqState = {};

function renderDetailForm() {
  const chapterData = getChapterData(activeSubject, activeChapter);
  let mcqCfg, frqCfg;

  if (chapterData) {
    if (chapterData.mcq && chapterData.frq) {
      mcqCfg = chapterData.mcq; frqCfg = chapterData.frq;
    } else {
      ({ mcq: mcqCfg, frq: frqCfg } = generateDefaultConfig(chapterData.sections));
    }
  } else {
    // no chapter selected: show placeholder
    document.getElementById('mcq-grid').innerHTML =
      '<p style="color:var(--text-3);font-size:13px">과목과 챕터를 먼저 선택해주세요.</p>';
    document.getElementById('frq-grid').innerHTML = '';
    document.getElementById('auto-score').textContent = '0';
    document.getElementById('auto-max').textContent   = '0';
    document.getElementById('auto-badge').textContent = '—';
    document.getElementById('auto-badge').className   = 'badge';
    return;
  }

  mcqState = {}; frqState = {};
  mcqCfg.forEach(q => { mcqState[q.q] = null; });
  frqCfg.forEach(q => { frqState[q.q] = 0;    });

  document.getElementById('mcq-grid').innerHTML = mcqCfg.map(q => `
    <div class="q-item" id="qi-${q.q}">
      <div>
        <div class="q-label">${q.q}</div>
        <div style="font-size:11px;color:var(--text-3)">${q.section}</div>
      </div>
      <div class="q-btns">
        <button class="q-btn" data-q="${q.q}" data-v="true"  title="정답">O</button>
        <button class="q-btn" data-q="${q.q}" data-v="false" title="오답">X</button>
      </div>
    </div>`).join('');

  document.querySelectorAll('.q-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      const v = btn.dataset.v === 'true';
      mcqState[q] = mcqState[q] === v ? null : v;
      document.querySelectorAll(`[data-q="${q}"]`).forEach(b => {
        b.classList.remove('correct', 'wrong');
        if (mcqState[q] === true  && b.dataset.v === 'true')  b.classList.add('correct');
        if (mcqState[q] === false && b.dataset.v === 'false') b.classList.add('wrong');
      });
      updateAutoScore(mcqCfg, frqCfg);
    });
  });

  document.getElementById('frq-grid').innerHTML = frqCfg.map(q => `
    <div class="frq-item">
      <div class="frq-label">
        ${q.q} <span style="font-size:11px;color:var(--text-3)">${q.section}</span>
        <div style="font-size:11px;color:var(--text-3);margin-top:2px">배점: ${q.parts.join(' / ')}</div>
      </div>
      <input class="frq-pts-input" type="number" min="0" max="${q.maxPts}"
        data-frq="${q.q}" data-max="${q.maxPts}" value="0">
      <span class="frq-max">/ ${q.maxPts}</span>
    </div>`).join('');

  document.querySelectorAll('.frq-pts-input').forEach(inp => {
    inp.addEventListener('input', () => {
      frqState[inp.dataset.frq] = Math.min(parseFloat(inp.value) || 0, parseFloat(inp.dataset.max));
      updateAutoScore(mcqCfg, frqCfg);
    });
  });

  updateAutoScore(mcqCfg, frqCfg);
}

function updateAutoScore(mcqCfg, frqCfg) {
  if (!mcqCfg || !frqCfg) return;
  let mcqTotal = 0;
  mcqCfg.forEach(q => { if (mcqState[q.q] === true) mcqTotal += q.pts; });
  let frqTotal = 0;
  frqCfg.forEach(q => { frqTotal += frqState[q.q] || 0; });
  const maxMCQ = mcqCfg.reduce((a, q) => a + q.pts, 0);
  const maxFRQ = frqCfg.reduce((a, q) => a + q.maxPts, 0);
  const got = mcqTotal + frqTotal;
  const max = maxMCQ + maxFRQ;
  document.getElementById('auto-score').textContent = got;
  document.getElementById('auto-max').textContent   = max;
  const pct   = max > 0 ? Math.round(got / max * 100) : 0;
  const badge = document.getElementById('auto-badge');
  badge.textContent = pct + '%';
  badge.className   = 'badge badge-' + getTier(pct);
}

// ── SAVE SCORE ─────────────────────────────────────────────────
document.getElementById('btn-save-score').addEventListener('click', async () => {
  const isDetail = document.getElementById('tab-detail').classList.contains('active');
  const btn      = document.getElementById('btn-save-score');
  let entryData;

  if (!isDetail) {
    const studentId = document.getElementById('score-student').value;
    const subject   = document.getElementById('score-subject').value;
    const chapter   = document.getElementById('score-chapter').value;
    const date      = document.getElementById('score-date').value;
    const got       = parseFloat(document.getElementById('score-got').value);
    const max       = parseFloat(document.getElementById('score-max').value);
    const note      = document.getElementById('score-note').value.trim();
    if (!studentId || !subject || !chapter || !date || isNaN(got) || isNaN(max)) {
      showMsg('모든 필수 항목을 입력해주세요.', 'red'); return;
    }
    entryData = { studentId, subject, chapter, date, got, max, note, mode: 'total', detail: null };
  } else {
    const studentId = document.getElementById('detail-student').value;
    const subject   = document.getElementById('detail-subject').value;
    const chapter   = document.getElementById('detail-chapter').value;
    const date      = document.getElementById('detail-date').value;
    const note      = document.getElementById('detail-note').value.trim();
    if (!studentId || !subject || !chapter || !date) {
      showMsg('학생, 과목, 챕터, 날짜를 선택해주세요.', 'red'); return;
    }
    const chapterData = getChapterData(subject, chapter);
    const { mcq: mcqCfg, frq: frqCfg } = chapterData?.mcq
      ? { mcq: chapterData.mcq, frq: chapterData.frq }
      : generateDefaultConfig(chapterData?.sections || []);
    let got = 0;
    const detailData = { mcq: {}, frq: {} };
    mcqCfg.forEach(q => { detailData.mcq[q.q] = mcqState[q.q]; if (mcqState[q.q] === true) got += q.pts; });
    frqCfg.forEach(q => { detailData.frq[q.q] = frqState[q.q] || 0; got += frqState[q.q] || 0; });
    const max = mcqCfg.reduce((a, q) => a + q.pts, 0) + frqCfg.reduce((a, q) => a + q.maxPts, 0);
    entryData = { studentId, subject, chapter, date, got, max, note, mode: 'detail', detail: detailData };
  }

  btn.textContent = '저장 중...'; btn.disabled = true;
  try {
    await addDoc(collection(db, 'scores'), {
      ...entryData, createdBy: currentUser.uid, createdAt: serverTimestamp()
    });
    const st = students.find(s => s.id === entryData.studentId);
    showResultCard(entryData, st);
    showMsg('저장됐습니다!', 'green');
    document.getElementById('score-got').value           = '';
    document.getElementById('score-note').value          = '';
    document.getElementById('score-preview').textContent = '—';
    document.getElementById('score-preview').style.color = '';
    document.getElementById('detail-note').value         = '';
    if (isDetail) renderDetailForm();
  } catch (err) { showMsg('저장 오류: ' + err.message, 'red'); }
  btn.textContent = '저장'; btn.disabled = false;
});

function showMsg(msg, color) {
  const el = document.getElementById('save-msg');
  el.textContent = msg;
  el.style.color = color === 'red' ? 'var(--red)' : 'var(--green)';
  setTimeout(() => { el.textContent = ''; }, 3000);
}

function showResultCard(entry, st) {
  const pct  = Math.round(entry.got / entry.max * 100);
  const tier = getTier(pct);
  const task = getSelfStudyTask(pct);
  document.getElementById('result-pct').textContent     = pct + '%';
  document.getElementById('result-name').textContent    = st ? st.name : '—';
  document.getElementById('result-chapter').textContent =
    (entry.subject ? entry.subject + ' · ' : '') + entry.chapter + '  ·  ' + entry.got + '/' + entry.max + '점  ·  ' + entry.date;
  const tierEl = document.getElementById('result-tier');
  tierEl.textContent = getTierLabel(pct);
  tierEl.style.color = tier === 'green' ? 'var(--green)' : tier === 'amber' ? 'var(--amber)' : 'var(--red)';
  document.getElementById('result-step').textContent = getNextStep(pct);
  const taskEl = document.getElementById('result-task');
  if (task) { taskEl.textContent = task; taskEl.className = 'result-task task-' + tier; taskEl.style.display = ''; }
  else      { taskEl.style.display = 'none'; }
  document.getElementById('result-card').style.display = '';
}

// ── STUDENTS ───────────────────────────────────────────────────

function initials(name) { return name.slice(0, 2).toUpperCase(); }

function renderStudents() {
  const container = document.getElementById('student-cards');

  if ((currentRole === 'student' || currentRole === 'parent') && !currentStudentView) {
    showUnlinkedMessage(container); return;
  }

  let viewStudents = (currentRole === 'student' || currentRole === 'parent')
    ? students.filter(s => s.id === currentStudentView)
    : students;

  // Subject filter (teacher only)
  const subjectFilter = document.getElementById('students-subject-filter')?.value || 'all';
  if (currentRole === 'teacher' && subjectFilter !== 'all') {
    viewStudents = viewStudents.filter(s => (s.subjects || []).includes(subjectFilter));
  }

  if (viewStudents.length === 0) {
    container.innerHTML = '<p style="color:var(--text-3);font-size:13px;padding:1rem 0">학생이 없습니다. 위에서 추가해주세요.</p>';
    return;
  }

  const SUBJECT_OPTIONS = ['Algebra 1','Algebra 2','Precalculus','AP Precalculus','AP Calculus AB','AP Calculus BC'];
  const GRADE_OPTIONS   = ['G8','G9','G10','G11','G12','College'];

  container.innerHTML = '<div class="student-cards-grid">' +
    viewStudents.map(st => {
      const stScores = scores.filter(s => s.studentId === st.id);
      const avg      = stScores.length
        ? Math.round(stScores.reduce((a, s) => a + s.got / s.max * 100, 0) / stScores.length) : null;
      const last    = [...stScores].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
      const history = [...stScores].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
      const subjectBadges = (st.subjects || []).map(s =>
        `<span class="subject-badge">${s}</span>`).join('');

      // Edit form (teacher only)
      const editForm = currentRole === 'teacher' ? `
        <div class="student-edit-form" id="edit-${st.id}" style="display:none">
          <div class="edit-row">
            <input type="text"  class="edit-school" placeholder="학교" value="${st.school || ''}">
            <select class="edit-grade">
              <option value="">학년…</option>
              ${GRADE_OPTIONS.map(g => `<option value="${g}"${st.grade===g?' selected':''}>${g}</option>`).join('')}
            </select>
          </div>
          <div class="edit-subject-wrap">
            ${SUBJECT_OPTIONS.map(sub => `
              <label class="subject-check-item">
                <input type="checkbox" value="${sub}"${(st.subjects||[]).includes(sub)?' checked':''}> ${sub}
              </label>`).join('')}
          </div>
          <div class="edit-actions">
            <button class="btn-primary btn-save-edit" data-id="${st.id}" style="font-size:12px;padding:5px 14px">저장</button>
            <button class="btn-secondary btn-cancel-edit" data-id="${st.id}" style="font-size:12px;padding:4px 10px">취소</button>
          </div>
        </div>` : '';

      return `<div class="student-card">
        <div class="student-card-header">
          <div class="avatar">${initials(st.name)}</div>
          <div class="student-name-block">
            <div class="s-name">${st.name}${st.grade ? ` <span class="s-grade">${st.grade}</span>` : ''}</div>
            <div class="s-school">${st.school || '학교 미입력'}</div>
            ${st.linkedEmail ? `<div class="s-email">${st.linkedEmail}</div>` : ''}
            ${subjectBadges ? `<div class="s-subjects">${subjectBadges}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
            ${currentRole === 'teacher' ? `<button class="btn-edit teacher-only" data-edit="${st.id}" title="편집">✏️</button>` : ''}
            <button class="delete-btn teacher-only" data-del="${st.id}" title="삭제">✕</button>
          </div>
        </div>
        ${editForm}
        <div class="student-stats">
          <div class="s-stat"><div class="s-stat-num">${stScores.length}</div><div class="s-stat-label">테스트 횟수</div></div>
          <div class="s-stat"><div class="s-stat-num">${avg !== null ? avg + '%' : '—'}</div><div class="s-stat-label">평균 성취도</div></div>
          <div class="s-stat"><div class="s-stat-num">${last ? Math.round(last.got / last.max * 100) + '%' : '—'}</div><div class="s-stat-label">최근 성취도</div></div>
        </div>
        <div class="student-history">
          ${history.length === 0
            ? '<div style="font-size:12px;color:var(--text-3);padding-top:8px">기록 없음</div>'
            : history.map(s => {
                const pct = Math.round(s.got / s.max * 100);
                return `<div class="history-row">
                  <span class="history-chapter">${s.subject ? `<span style="font-size:10px;color:var(--text-3)">${s.subject}</span> ` : ''}${s.chapter}</span>
                  <span style="font-size:12px;color:var(--text-2)">${s.date}</span>
                  <span class="badge badge-${getTier(pct)}">${pct}%</span>
                </div>`;
              }).join('')
          }
        </div>
      </div>`;
    }).join('') + '</div>';

  // Edit button toggle
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const form = document.getElementById('edit-' + btn.dataset.edit);
      if (form) form.style.display = form.style.display === 'none' ? '' : 'none';
    });
  });

  // Save edit
  document.querySelectorAll('.btn-save-edit').forEach(btn => {
    btn.addEventListener('click', () => saveStudentEdit(btn.dataset.id, btn.closest('.student-card')));
  });

  // Cancel edit
  document.querySelectorAll('.btn-cancel-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const form = document.getElementById('edit-' + btn.dataset.id);
      if (form) form.style.display = 'none';
    });
  });

  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => deleteStudent(btn.dataset.del));
  });
  if (currentRole !== 'teacher') {
    document.querySelectorAll('.teacher-only').forEach(el => el.style.display = 'none');
  }
}

async function saveStudentEdit(studentId, card) {
  const school   = card.querySelector('.edit-school').value.trim();
  const grade    = card.querySelector('.edit-grade').value;
  const subjects = Array.from(card.querySelectorAll('.edit-subject-wrap input:checked')).map(cb => cb.value);
  try {
    await updateDoc(doc(db, 'students', studentId), { school, grade, subjects });
    const form = document.getElementById('edit-' + studentId);
    if (form) form.style.display = 'none';
  } catch (err) { alert('저장 오류: ' + err.message); }
}

async function deleteStudent(studentId) {
  if (!confirm('이 학생과 모든 점수 기록을 삭제할까요?')) return;
  try {
    const batch    = writeBatch(db);
    batch.delete(doc(db, 'students', studentId));
    const snapDocs = await getDocs(query(collection(db, 'scores'), where('studentId', '==', studentId)));
    snapDocs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (err) { alert('삭제 오류: ' + err.message); }
}

// ── STATS ──────────────────────────────────────────────────────
let chartChapter = null, chartDist = null, chartTrend = null;

function populateStatsFilter() {
  const sel = document.getElementById('stats-student-filter');
  sel.innerHTML = '<option value="all">전체 학생</option>' +
    students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

document.getElementById('stats-student-filter').addEventListener('change', renderStats);
document.getElementById('stats-subject-filter').addEventListener('change', renderStats);
document.getElementById('students-subject-filter').addEventListener('change', renderStudents);

function renderStats() {
  const isRestricted = (currentRole === 'student' || currentRole === 'parent');
  if (isRestricted && !currentStudentView) {
    document.getElementById('all-tbody').innerHTML = '';
    document.getElementById('all-empty').style.display = 'block';
    document.getElementById('all-empty').textContent = '연결된 학생 정보가 없습니다.';
    return;
  }

  const studentFilter = document.getElementById('stats-student-filter').value;
  const subjectFilter = document.getElementById('stats-subject-filter').value;

  let filteredScores = isRestricted
    ? scores.filter(s => s.studentId === currentStudentView)
    : (studentFilter === 'all' ? scores : scores.filter(s => s.studentId === studentFilter));

  if (subjectFilter !== 'all') {
    filteredScores = filteredScores.filter(s => s.subject === subjectFilter);
  }

  const sorted = [...filteredScores].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const tbody  = document.getElementById('all-tbody');
  const empty  = document.getElementById('all-empty');

  if (sorted.length === 0) {
    tbody.innerHTML = ''; empty.style.display = 'block'; empty.textContent = '기록이 없습니다.';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = sorted.map(s => {
      const st   = students.find(x => x.id === s.studentId);
      const pct  = Math.round(s.got / s.max * 100);
      const step = pct >= 76 ? '다음 챕터' : pct >= 56 ? '보충 병행' : '복습 후 진행';
      const delBtn = currentRole === 'teacher'
        ? `<td><button class="delete-btn" data-del-score="${s.id}">✕</button></td>`
        : '<td></td>';
      return `<tr>
        <td>${st ? st.name : '—'}</td>
        <td>${s.subject ? `<span style="font-size:11px;color:var(--text-3)">${s.subject}</span><br>` : ''}${s.chapter}</td>
        <td>${s.date}</td>
        <td><strong>${s.got}</strong>/${s.max} <span style="color:var(--text-2);font-size:12px">(${pct}%)</span></td>
        <td><span class="badge badge-${getTier(pct)}">${pct}%</span></td>
        <td style="font-size:13px;color:var(--text-2)">${step}</td>
        ${delBtn}
      </tr>`;
    }).join('');
    document.querySelectorAll('[data-del-score]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('이 점수 기록을 삭제할까요?')) return;
        try { await deleteDoc(doc(db, 'scores', btn.dataset.delScore)); }
        catch (err) { alert('삭제 오류: ' + err.message); }
      });
    });
  }

  // Charts — use currently filtered scores
  const activeSubjectForChart = subjectFilter !== 'all' ? subjectFilter : null;
  const chapterLabels = activeSubjectForChart
    ? (COURSE_DATA[activeSubjectForChart] || []).map(c => c.value)
    : ['Ch.1','Ch.2','Ch.3','Ch.4','Ch.5','Ch.6'];

  const chapterAvgs = chapterLabels.map(ch => {
    const rel = filteredScores.filter(s => s.chapter === ch);
    return rel.length ? Math.round(rel.reduce((a, s) => a + s.got / s.max * 100, 0) / rel.length) : null;
  });
  if (chartChapter) chartChapter.destroy();
  chartChapter = new Chart(document.getElementById('chart-chapter'), {
    type: 'bar',
    data: {
      labels: chapterLabels,
      datasets: [{ label: '평균 성취도 (%)', data: chapterAvgs, borderWidth: 1.5, borderRadius: 5,
        backgroundColor: chapterAvgs.map(v => v == null ? '#e5e5e5' : v >= 76 ? '#d8f3dc' : v >= 56 ? '#fef3c7' : '#fee2e2'),
        borderColor:     chapterAvgs.map(v => v == null ? '#ccc'    : v >= 76 ? '#2d6a4f' : v >= 56 ? '#92400e' : '#991b1b'),
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + '%', font: { size: 12 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { ticks: { font: { size: 11 }, maxRotation: 45 }, grid: { display: false } }
      }
    }
  });

  const green = filteredScores.filter(s => s.got / s.max >= 0.76).length;
  const amber = filteredScores.filter(s => s.got / s.max >= 0.56 && s.got / s.max < 0.76).length;
  const red   = filteredScores.filter(s => s.got / s.max < 0.56).length;
  if (chartDist) chartDist.destroy();
  chartDist = new Chart(document.getElementById('chart-dist'), {
    type: 'doughnut',
    data: {
      labels: ['76%+ (진행)','56–75% (보충)','~55% (복습)'],
      datasets: [{ data: [green, amber, red], borderWidth: 1.5,
        backgroundColor: ['#d8f3dc','#fef3c7','#fee2e2'],
        borderColor:     ['#2d6a4f','#92400e','#991b1b'],
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } } },
      cutout: '60%'
    }
  });

  const tsMillis = ts => {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts.seconds != null) return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6;
    return 0;
  };
  const trendData = [...filteredScores].sort((a, b) => {
    const d = (a.date || '').localeCompare(b.date || '');
    if (d !== 0) return d;
    return tsMillis(a.createdAt) - tsMillis(b.createdAt);
  });
  const multiStudent = studentFilter === 'all' && students.length > 1 && currentRole === 'teacher';
  if (chartTrend) chartTrend.destroy();

  if (multiStudent) {
    const colors   = ['#2d6a4f','#92400e','#1e40af','#7c3aed','#be185d'];
    const datasets = students.map((st, i) => ({
      label: st.name,
      data:  trendData.filter(s => s.studentId === st.id)
                      .map(s => ({ x: s.date, y: Math.round(s.got / s.max * 100) })),
      borderColor: colors[i % colors.length], backgroundColor: 'transparent',
      tension: 0.3, pointRadius: 4, borderWidth: 2,
    }));
    chartTrend = new Chart(document.getElementById('chart-trend'), {
      type: 'line', data: { datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } } },
        scales: {
          x: { type: 'category', ticks: { font: { size: 11 } }, grid: { display: false } },
          y: { min: 0, max: 100, ticks: { callback: v => v + '%', font: { size: 12 } }, grid: { color: 'rgba(0,0,0,0.05)' } }
        }
      }
    });
  } else {
    chartTrend = new Chart(document.getElementById('chart-trend'), {
      type: 'line',
      data: {
        labels:   trendData.map(s => (s.subject ? s.subject.split(' ')[0] + ' ' : '') + s.chapter + ' ' + s.date),
        datasets: [{ label: '성취도 (%)', data: trendData.map(s => Math.round(s.got / s.max * 100)),
          borderColor: '#1a1917', backgroundColor: 'rgba(26,25,23,0.06)',
          fill: true, tension: 0.3, pointRadius: 5, borderWidth: 2,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 11 }, maxRotation: 30 }, grid: { display: false } },
          y: { min: 0, max: 100, ticks: { callback: v => v + '%', font: { size: 12 } }, grid: { color: 'rgba(0,0,0,0.05)' } }
        }
      }
    });
  }
}

// ══════════════════════════════════════════════════════════════
// ── MATERIALS — 시험 자료실 ────────────────────────────────────
// ══════════════════════════════════════════════════════════════

// ── 학생/학부모 뷰: 허용된 파일 목록 ─────────────────────────────
function renderMaterials() {
  const el = document.getElementById('materials-list');
  if (!el) return;

  if (materials.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:3rem 1rem">
        <div style="font-size:2rem;margin-bottom:.5rem">📂</div>
        <div>배포된 시험 파일이 없습니다.</div>
        <div style="font-size:.85rem;color:var(--muted);margin-top:.25rem">선생님이 파일을 배포하면 여기에 표시됩니다.</div>
      </div>`;
    return;
  }

  const sorted = [...materials].sort((a, b) =>
    (a.subject + a.chapter).localeCompare(b.subject + b.chapter));

  el.innerHTML = sorted.map(m => `
    <div class="mat-student-card">
      <div class="mat-student-left">
        <span class="mat-subject-badge">${m.subject}</span>
        <div class="mat-student-info">
          <div class="mat-student-chapter">${m.chapter}</div>
          <div class="mat-student-title">${m.title}</div>
        </div>
      </div>
      <a href="${m.downloadUrl}" target="_blank" rel="noopener" class="btn-download">
        📥 열기
      </a>
    </div>
  `).join('');
}

// ── 선생님 뷰: 파일 등록 + 권한 관리 ─────────────────────────────
function renderMaterialsAdmin() {
  const el = document.getElementById('materials-admin-list');
  if (!el) return;

  if (materials.length === 0) {
    el.innerHTML = `<div class="empty-state">등록된 파일이 없습니다. 위에서 업로드해주세요.</div>`;
    return;
  }

  const sorted = [...materials].sort((a, b) =>
    (a.subject + a.chapter).localeCompare(b.subject + b.chapter));

  el.innerHTML = sorted.map(m => {
    const allowed   = new Set(m.allowedEmails || []);
    const uploadedAt = m.createdAt?.toDate?.()?.toLocaleDateString('ko-KR') || '';

    // Only students with linkedEmail are toggleable
    const studentItems = students.filter(s => s.linkedEmail).map(s => {
      const on = allowed.has(s.linkedEmail.toLowerCase());
      return `
        <div class="access-row">
          <div class="access-row-info">
            <span class="access-name">${s.name}</span>
            <span class="access-email">${s.linkedEmail}</span>
          </div>
          <label class="mat-toggle">
            <input type="checkbox" ${on ? 'checked' : ''}
              onchange="matToggleAccess('${m.id}','${s.linkedEmail.toLowerCase()}',this.checked)">
            <span class="mat-toggle-slider"></span>
          </label>
        </div>`;
    }).join('');

    return `
      <div class="mat-admin-card" id="matcard-${m.id}">
        <div class="mat-admin-header">
          <div class="mat-admin-meta-row">
            <span class="mat-subject-badge">${m.subject}</span>
            <span class="mat-chapter-badge">${m.chapter}</span>
            <span class="mat-upload-date">${uploadedAt}</span>
          </div>
          <div class="mat-admin-title">${m.title}</div>
          <div class="mat-filename">📄 ${m.fileName}</div>
          <div class="mat-admin-actions">
            <span class="mat-access-count">${allowed.size}명 접근 허용</span>
            <button class="btn-sm" onclick="matTogglePanel('${m.id}')">접근 설정 ▾</button>
            <button class="btn-sm btn-danger-sm" onclick="matDelete('${m.id}','${(m.storagePath||'').replace(/'/g,"\\'")}')">삭제</button>
          </div>
        </div>
        <div class="mat-access-panel" id="mat-panel-${m.id}" style="display:none">
          ${studentItems || '<div class="empty-sub">회원가입한 학생이 없습니다.</div>'}
        </div>
      </div>`;
  }).join('');
}

// ── 업로드 폼 초기화 (materials-admin 탭 진입 시) ─────────────────
let _uploadFormReady = false;
function initMaterialsUploadForm() {
  if (_uploadFormReady) return;
  _uploadFormReady = true;

  const subjectSel = document.getElementById('mat-subject');
  const chapterSel = document.getElementById('mat-chapter');
  const titleInput = document.getElementById('mat-title');
  if (!subjectSel) return;

  // 과목 목록 채우기
  subjectSel.innerHTML = SUBJECTS.map(s => `<option value="${s}">${s}</option>`).join('');

  const fillChapters = () => {
    const chs = COURSE_DATA[subjectSel.value] || [];
    chapterSel.innerHTML = chs.map(c =>
      `<option value="${c.value}">${c.label}</option>`).join('');
    autoTitle();
  };

  const autoTitle = () => {
    if (!titleInput.dataset.edited)
      titleInput.value = `${subjectSel.value} ${chapterSel.value} Unit Test`;
  };

  subjectSel.addEventListener('change', fillChapters);
  chapterSel.addEventListener('change', autoTitle);
  titleInput.addEventListener('input', () => { titleInput.dataset.edited = '1'; });

  document.getElementById('mat-file').addEventListener('change', function () {
    document.getElementById('mat-file-name').textContent =
      this.files[0]?.name || '선택된 파일 없음';
  });

  document.getElementById('btn-mat-upload').addEventListener('click', matUpload);

  fillChapters();
}

// ── 파일 업로드 ─────────────────────────────────────────────────
async function matUpload() {
  const subject  = document.getElementById('mat-subject').value;
  const chapter  = document.getElementById('mat-chapter').value;
  const title    = document.getElementById('mat-title').value.trim();
  const fileEl   = document.getElementById('mat-file');
  const file     = fileEl.files[0];
  const msgEl    = document.getElementById('mat-upload-msg');
  const progWrap = document.getElementById('mat-progress-wrap');
  const progBar  = document.getElementById('mat-progress-bar');
  const progText = document.getElementById('mat-progress-text');
  const btn      = document.getElementById('btn-mat-upload');

  msgEl.textContent = '';
  if (!subject || !chapter || !title || !file) {
    msgEl.textContent = '과목, 챕터, 제목, 파일을 모두 입력해주세요.';
    msgEl.className = 'mat-msg error';
    return;
  }
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    msgEl.textContent = 'PDF 파일만 업로드할 수 있습니다.';
    msgEl.className = 'mat-msg error';
    return;
  }

  btn.disabled = true;
  btn.textContent = '업로드 중...';
  progWrap.style.display = 'flex';
  progBar.style.width = '0%';
  progText.textContent = '0%';

  try {
    // Firestore 문서 ID 먼저 확보
    const matDocRef = doc(collection(db, 'materials'));
    const spath     = `materials/${matDocRef.id}/${file.name}`;
    const fRef      = storageRef(storage, spath);

    const task = uploadBytesResumable(fRef, file);
    await new Promise((resolve, reject) => {
      task.on('state_changed',
        snap => {
          const pct = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
          progBar.style.width  = pct + '%';
          progText.textContent = pct + '%';
        },
        reject,
        resolve
      );
    });

    const downloadUrl = await getDownloadURL(task.snapshot.ref);

    await setDoc(matDocRef, {
      title, subject, chapter,
      fileName: file.name,
      storagePath: spath,
      downloadUrl,
      allowedEmails: [],
      createdAt:  serverTimestamp(),
      createdBy:  currentUser.uid
    });

    progWrap.style.display = 'none';
    msgEl.textContent = `✓ "${title}" 업로드 완료!`;
    msgEl.className = 'mat-msg success';

    // 폼 리셋
    fileEl.value = '';
    document.getElementById('mat-file-name').textContent = '선택된 파일 없음';
    document.getElementById('mat-title').dataset.edited = '';
    const titleInput = document.getElementById('mat-title');
    titleInput.dataset.edited = '';
    titleInput.value = `${subject} ${chapter} Unit Test`;

    setTimeout(() => { msgEl.textContent = ''; }, 4000);
  } catch (err) {
    progWrap.style.display = 'none';
    msgEl.textContent = '업로드 오류: ' + err.message;
    msgEl.className = 'mat-msg error';
  } finally {
    btn.disabled = false;
    btn.textContent = '업로드';
  }
}

// ── 접근 토글 (전역 — inline onclick에서 호출) ─────────────────────
window.matToggleAccess = async function (materialId, email, checked) {
  try {
    await updateDoc(doc(db, 'materials', materialId), {
      allowedEmails: checked ? arrayUnion(email) : arrayRemove(email)
    });
  } catch (err) {
    alert('권한 변경 오류: ' + err.message);
  }
};

// ── 접근 패널 열기/닫기 ────────────────────────────────────────
window.matTogglePanel = function (materialId) {
  const panel = document.getElementById('mat-panel-' + materialId);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  // 버튼 텍스트 반영
  const btn = document.querySelector(`#matcard-${materialId} .btn-sm`);
  if (btn) btn.textContent = isOpen ? '접근 설정 ▾' : '접근 설정 ▴';
};

// ── 파일 삭제 ──────────────────────────────────────────────────
window.matDelete = async function (materialId, storagePath) {
  if (!confirm('이 파일을 삭제하면 모든 학생의 접근이 해제됩니다.\n정말 삭제하시겠습니까?')) return;
  try {
    if (storagePath) {
      await deleteObject(storageRef(storage, storagePath)).catch(() => {});
    }
    await deleteDoc(doc(db, 'materials', materialId));
  } catch (err) {
    alert('삭제 오류: ' + err.message);
  }
};
