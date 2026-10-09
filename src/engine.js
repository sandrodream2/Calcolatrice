/* =====================================================================
   MOTORE DI CALCOLO — logica pura, priva di dipendenze da React.
   Pipeline: tokenizzazione -> shunting-yard -> notazione polacca inversa.
   Nessun uso di eval: l'espressione viene sempre analizzata e valutata
   esplicitamente, con validazione degli argomenti di dominio.
   ===================================================================== */

const PRECEDENCE = { add: 2, sub: 2, mul: 3, div: 3, neg: 3.5, pow: 4, pct: 5, fact: 5 };
const RIGHT_ASSOC = new Set(["pow", "neg"]);
// Ordine rilevante: i prefissi piu' lunghi precedono quelli piu' corti.
const FUNC_NAMES = ["asin", "acos", "atan", "sqrt", "sin", "cos", "tan", "exp", "log", "ln", "abs"];

function tokenize(src, vars) {
  const tokens = [];
  const last = () => tokens[tokens.length - 1];
  const endsValue = (t) => t && (t.type === "num" || t.type === "const" || t.type === "rparen" || t.type === "postfix");
  const startsValue = (t) => t && (t.type === "num" || t.type === "const" || t.type === "func" || t.type === "lparen");

  // Moltiplicazione implicita: "2π", "3(4+1)", "2sin(30)" sono valide.
  function push(t) {
    if (endsValue(last()) && startsValue(t)) tokens.push({ type: "op", op: "mul" });
    tokens.push(t);
  }

  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " ") { i++; continue; }

    // Numeri, inclusa la notazione scientifica (es. 1.5e21).
    if (/[0-9.]/.test(ch)) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      if (!m) throw new Error("Numero non valido");
      push({ type: "num", value: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }

    if (ch === "π") { push({ type: "const", value: Math.PI }); i++; continue; }

    if (/[a-zA-Z]/.test(ch)) {
      const rest = src.slice(i);
      const word =
        FUNC_NAMES.find((f) => rest.startsWith(f)) ||
        (rest.startsWith("Ans") ? "Ans" : null) ||
        (rest.startsWith("e") ? "e" : null) ||
        (rest.startsWith("pi") ? "pi" : null);
      if (!word) throw new Error("Simbolo non riconosciuto");
      if (word === "Ans") push({ type: "const", value: vars.ans });
      else if (word === "e") push({ type: "const", value: Math.E });
      else if (word === "pi") push({ type: "const", value: Math.PI });
      else push({ type: "func", name: word });
      i += word.length;
      continue;
    }

    switch (ch) {
      case "√":
        push({ type: "func", name: "sqrt" });
        break;
      case "(":
        push({ type: "lparen" });
        break;
      case ")":
        push({ type: "rparen" });
        break;
      case "+":
        // Più unario: nessun effetto ("+5" == "5").
        if (endsValue(last())) tokens.push({ type: "op", op: "add" });
        break;
      case "-":
      case "−":
        push(endsValue(last()) ? { type: "op", op: "sub" } : { type: "op", op: "neg" });
        break;
      case "×":
      case "*":
        push({ type: "op", op: "mul" });
        break;
      case "÷":
      case "/":
        push({ type: "op", op: "div" });
        break;
      case "^":
        push({ type: "op", op: "pow" });
        break;
      case "%":
        push({ type: "postfix", op: "pct" });
        break;
      case "!":
        push({ type: "postfix", op: "fact" });
        break;
      default:
        throw new Error("Carattere non valido");
    }
    i++;
  }
  return tokens;
}

function toRPN(tokens) {
  const out = [];
  const stack = [];
  for (const t of tokens) {
    if (t.type === "num" || t.type === "const") {
      out.push(t);
    } else if (t.type === "func" || t.type === "lparen") {
      stack.push(t);
    } else if (t.type === "rparen") {
      while (stack.length && stack[stack.length - 1].type !== "lparen") out.push(stack.pop());
      if (!stack.length) throw new Error("Parentesi non bilanciate");
      stack.pop();
      if (stack.length && stack[stack.length - 1].type === "func") out.push(stack.pop());
    } else if (t.type === "op") {
      const p1 = PRECEDENCE[t.op];
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type === "func") { out.push(stack.pop()); continue; }
        if (top.type !== "op") break;
        const p2 = PRECEDENCE[top.op];
        if (p2 > p1 || (p2 === p1 && !RIGHT_ASSOC.has(t.op))) out.push(stack.pop());
        else break;
      }
      stack.push(t);
    } else if (t.type === "postfix") {
      stack.push(t); // precedenza massima: nessuna estrazione necessaria
    }
  }
  while (stack.length) {
    const top = stack.pop();
    if (top.type === "lparen") throw new Error("Parentesi non bilanciate");
    out.push(top);
  }
  return out;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0 || n > 170) {
    throw new Error("n! richiede un intero tra 0 e 170");
  }
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

function applyFunc(name, x, degMode) {
  const toRad = (d) => (degMode ? (d * Math.PI) / 180 : d);
  const fromRad = (r) => (degMode ? (r * 180) / Math.PI : r);
  // Elimina residui di virgola mobile in vicinanza dello zero (es. sin(180°)).
  const clean = (v) => (Math.abs(v) < 1e-12 ? 0 : v);
  switch (name) {
    case "sin": return clean(Math.sin(toRad(x)));
    case "cos": return clean(Math.cos(toRad(x)));
    case "tan":
      if (Math.abs(Math.cos(toRad(x))) < 1e-12) throw new Error("tan non definita");
      return clean(Math.tan(toRad(x)));
    case "asin":
      if (x < -1 || x > 1) throw new Error("asin richiede |x| ≤ 1");
      return fromRad(Math.asin(x));
    case "acos":
      if (x < -1 || x > 1) throw new Error("acos richiede |x| ≤ 1");
      return fromRad(Math.acos(x));
    case "atan": return fromRad(Math.atan(x));
    case "ln":
      if (x <= 0) throw new Error("ln richiede x > 0");
      return Math.log(x);
    case "log":
      if (x <= 0) throw new Error("log richiede x > 0");
      return Math.log10(x);
    case "sqrt":
      if (x < 0) throw new Error("Radice di numero negativo");
      return Math.sqrt(x);
    case "exp": return Math.exp(x);
    case "abs": return Math.abs(x);
    default: throw new Error("Funzione non valida");
  }
}

function applyOp(op, a, b) {
  switch (op) {
    case "add": return a + b;
    case "sub": return a - b;
    case "mul": return a * b;
    case "div":
      if (b === 0) throw new Error("Divisione per zero");
      return a / b;
    case "pow": return Math.pow(a, b);
    default: throw new Error("Operatore non valido");
  }
}

function evalRPN(rpn, degMode) {
  const st = [];
  for (const t of rpn) {
    if (t.type === "num" || t.type === "const") {
      st.push(t.value);
    } else if (t.type === "func") {
      if (!st.length) throw new Error("Espressione incompleta");
      st.push(applyFunc(t.name, st.pop(), degMode));
    } else if (t.type === "op") {
      if (t.op === "neg") {
        if (!st.length) throw new Error("Espressione incompleta");
        st.push(-st.pop());
      } else {
        if (st.length < 2) throw new Error("Espressione incompleta");
        const b = st.pop();
        const a = st.pop();
        st.push(applyOp(t.op, a, b));
      }
    } else if (t.type === "postfix") {
      if (!st.length) throw new Error("Espressione incompleta");
      const a = st.pop();
      st.push(t.op === "pct" ? a / 100 : factorial(a));
    }
  }
  if (st.length !== 1) throw new Error("Espressione non valida");
  const r = st[0];
  if (typeof r !== "number" || Number.isNaN(r)) throw new Error("Risultato non definito");
  if (!Number.isFinite(r)) throw new Error("Risultato fuori dai limiti");
  return r;
}

/**
 * Valuta un'espressione matematica.
 * @param {string} src    Espressione, es. "2×(3+4)", "sin(90)", "5!"
 * @param {{ans: number}} vars Variabili disponibili (Ans = ultimo risultato)
 * @param {boolean} degMode true per gradi sessadecimali, false per radianti
 * @returns {number}
 */
function evaluate(src, vars, degMode) {
  return evalRPN(toRPN(tokenize(src, vars)), degMode);
}

/* Formattazione: 12 cifre significative; notazione esponenziale per
   valori >= 1e12 o < 1e-9 in valore assoluto. */
function formatResult(x) {
  if (typeof x !== "number" || !Number.isFinite(x)) return "Errore";
  if (x === 0) return "0";
  const ax = Math.abs(x);
  if (ax >= 1e12 || ax < 1e-9) return x.toExponential(9).replace("e+", "e");
  return String(parseFloat(x.toPrecision(12)));
}

export { evaluate, formatResult };
