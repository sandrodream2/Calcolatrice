document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Tab navigation ---------- */
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });

  /* ---------- Calcolatrice scientifica (stile Casio) ---------- */
  const display = document.getElementById("display");
  const exprDisplay = document.getElementById("expr-display");
  const modeIndicator = document.getElementById("mode-indicator");
  const shiftIndicator = document.getElementById("shift-indicator");
  const shiftBtn = document.getElementById("btn-shift");

  let expr = "";
  let ans = 0;
  let degMode = true;
  let shift = false;

  const SHIFT_MAP = {
    "sin(": "asin(", "cos(": "acos(", "tan(": "atan(",
    "ln(": "exp(", "log(": "10^(", "sqrt(": "cbrt(",
    "^2": "^3", "^": "^(1/", "fact(": "fact(",
  };

  function fmt(n) {
    if (!isFinite(n)) return "Errore";
    if (Math.abs(n) >= 1e12 || (n !== 0 && Math.abs(n) < 1e-9)) return n.toExponential(6).replace("e", "×10^");
    return (+n.toFixed(10)).toLocaleString("it-IT", { maximumFractionDigits: 10 });
  }

  /* --- Tokenizer --- */
  function tokenize(s) {
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const m = s.slice(i).match(/^(asin\(|acos\(|atan\(|sin\(|cos\(|tan\(|ln\(|log\(|exp\(|sqrt\(|cbrt\(|fact\(|π|e|Ans|\d+\.?\d*|\.\d+|[+\-*/%^()])/);
      if (!m) return null;
      tokens.push(m[0]);
      i += m[0].length;
    }
    return tokens;
  }

  /* --- Recursive descent parser --- */
  function parse(tokens) {
    let pos = 0;
    function peek() { return tokens[pos]; }
    function next() { return tokens[pos++]; }

    function parseExpr() {
      let v = parseTerm();
      while (peek() === "+" || peek() === "-") {
        const op = next();
        const nt = tokens[pos];
        if (typeof nt === "string" && /^(\d|\.\d)/.test(nt) && tokens[pos + 1] === "%" &&
            (tokens[pos + 2] === undefined || /^[+\-*/^)%]$/.test(tokens[pos + 2]))) {
          pos += 2;
          const p = parseFloat(nt) / 100;
          v = op === "+" ? v + v * p : v - v * p;
          continue;
        }
        const r = parseTerm();
        if (op === "+") v += r; else v -= r;
      }
      return v;
    }
    function parseTerm() {
      let v = parseUnary();
      while (peek() === "*" || peek() === "/" || peek() === "%") {
        const op = next();
        if (op === "%") {
          const nt = tokens[pos];
          if (nt === undefined || /^[+\-*/^)%]$/.test(nt)) { v = v / 100; continue; }
        }
        const r = parseUnary();
        if (op === "*") v *= r;
        else if (op === "/") v /= r;
        else v = v * r / 100;
      }
      return v;
    }
    function parseUnary() {
      if (peek() === "-") { next(); return -parseUnary(); }
      if (peek() === "+") { next(); return parseUnary(); }
      return parsePower();
    }
    function parsePower() {
      let base = parsePostfix();
      if (peek() === "^") {
        next();
        const exp = parseUnary();
        return Math.pow(base, exp);
      }
      return base;
    }
    function parsePostfix() {
      let v = parseAtom();
      while (peek() === "!" ) { next(); v = factorial(v); }
      return v;
    }
    function parseAtom() {
      const t = next();
      if (t === undefined) throw new Error("unexpected end");
      if (t === "(") {
        const v = parseExpr();
        if (next() !== ")") throw new Error("missing )");
        return v;
      }
      if (t === "π") return Math.PI;
      if (t === "e") return Math.E;
      if (t === "Ans") return ans;
      if (t === "asin(" || t === "acos(" || t === "atan(") {
        const v = parseExpr();
        if (next() !== ")") throw new Error("missing )");
        const r = t === "asin(" ? Math.asin(v) : t === "acos(" ? Math.acos(v) : Math.atan(v);
        return degMode ? r * 180 / Math.PI : r;
      }
      if (t === "sin(" || t === "cos(" || t === "tan(") {
        const v = parseExpr();
        if (next() !== ")") throw new Error("missing )");
        const a = degMode ? v * Math.PI / 180 : v;
        return t === "sin(" ? Math.sin(a) : t === "cos(" ? Math.cos(a) : Math.tan(a);
      }
      if (t === "ln(") { const v = parseExpr(); if (next() !== ")") throw new Error("missing )"); return Math.log(v); }
      if (t === "log(") { const v = parseExpr(); if (next() !== ")") throw new Error("missing )"); return Math.log10(v); }
      if (t === "exp(") { const v = parseExpr(); if (next() !== ")") throw new Error("missing )"); return Math.exp(v); }
      if (t === "sqrt(") { const v = parseExpr(); if (next() !== ")") throw new Error("missing )"); return Math.sqrt(v); }
      if (t === "cbrt(") { const v = parseExpr(); if (next() !== ")") throw new Error("missing )"); return Math.cbrt(v); }
      if (t === "fact(") { const v = parseExpr(); if (next() !== ")") throw new Error("missing )"); return factorial(v); }
      if (/^\d|\.\d/.test(t)) return parseFloat(t);
      throw new Error("unexpected " + t);
    }

    const v = parseExpr();
    if (pos !== tokens.length) throw new Error("unexpected trailing tokens");
    return v;
  }

  function factorial(n) {
    if (n < 0 || !Number.isInteger(n) || n > 170) return NaN;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  function evaluate(s) {
    const tokens = tokenize(s);
    if (!tokens || !tokens.length) return null;
    return parse(tokens);
  }

  /* --- Input handling --- */
  function update() {
    display.textContent = expr || "0";
    display.classList.remove("error");
    exprDisplay.innerHTML = "&nbsp;";
  }

  document.querySelectorAll("#calc .key").forEach((key) => {
    key.addEventListener("click", () => {
      let ins = key.dataset.ins;

      if (ins === "shift") {
        shift = !shift;
        shiftIndicator.classList.toggle("on", shift);
        shiftBtn.classList.toggle("on", shift);
        return;
      }
      if (ins === "mode") {
        degMode = !degMode;
        modeIndicator.textContent = degMode ? "DEG" : "RAD";
        return;
      }
      if (shift) {
        if (SHIFT_MAP[ins]) ins = SHIFT_MAP[ins];
        shift = false;
        shiftIndicator.classList.remove("on");
        shiftBtn.classList.remove("on");
      }

      if (ins === "AC") { expr = ""; update(); return; }
      if (ins === "DEL") { expr = expr.slice(0, -1); update(); return; }
      if (ins === "=") {
        try {
          const res = evaluate(expr);
          if (res === null || isNaN(res)) throw new Error("Math error");
          exprDisplay.textContent = expr + " =";
          ans = res;
          expr = fmt(res);
          display.textContent = expr;
        } catch (e) {
          display.textContent = "Errore di sintassi";
          display.classList.add("error");
          expr = "";
        }
        return;
      }
      if (ins === "EXP") { expr += "*10^("; update(); return; }
      expr += ins;
      update();
    });
  });

  update();

  /* ---------- Conversioni ---------- */
  const tassi = { EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.94, JPY: 163 };
  const pesi = { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.028349523125 };
  const altezze = { m: 1, cm: 0.01, ft: 0.3048, in: 0.0254 };

  const cfmt = (n) => (+n.toFixed(6)).toLocaleString("it-IT", { maximumFractionDigits: 6 });

  function bindConverter(prefix, tabella) {
    const importo = document.getElementById(prefix + "-importo");
    const da = document.getElementById(prefix + "-da");
    const a = document.getElementById(prefix + "-a");
    const risultato = document.getElementById(prefix + "-risultato");
    function converti() {
      const v = parseFloat(importo.value);
      if (isNaN(v)) { risultato.textContent = "Inserisci un valore valido"; return; }
      const out = v * tabella[da.value] / tabella[a.value];
      risultato.textContent = `${cfmt(v)} ${da.value} = ${cfmt(out)} ${a.value}`;
    }
    [importo, da, a].forEach((el) => el.addEventListener("input", converti));
    converti();
  }

  bindConverter("val", tassi);
  bindConverter("pes", pesi);
  bindConverter("alt", altezze);
});
