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

  /* ---------- Calcolatrice ---------- */
  const display = document.getElementById("display");
  let current = "";

  function updateDisplay() { display.value = current || "0"; }

  function calculate(expr) {
    const tokens = expr.match(/(\d+\.?\d*|[+\-*/%])/g);
    if (!tokens) return null;
    let acc = parseFloat(tokens[0]);
    for (let i = 1; i < tokens.length; i += 2) {
      const op = tokens[i];
      const num = parseFloat(tokens[i + 1]);
      if (isNaN(num)) return null;
      if (op === "+") acc += num;
      else if (op === "-") acc -= num;
      else if (op === "*") acc *= num;
      else if (op === "/") acc /= num;
      else if (op === "%") acc = acc * num / 100;
    }
    return acc;
  }

  document.querySelectorAll("#calc .key").forEach((key) => {
    key.addEventListener("click", () => {
      const k = key.dataset.key;
      if (k === "C") current = "";
      else if (k === "←") current = current.slice(0, -1);
      else if (k === "toggle") {
        if (current && !isNaN(parseFloat(current.slice(-1)))) {
          const m = current.match(/(-?\d+\.?\d*)$/);
          if (m) current = current.slice(0, m.index) + (parseFloat(m[1]) * -1);
        }
      } else if (k === "=") {
        const res = calculate(current);
        current = res === null || !isFinite(res) ? "Errore" : String(+res.toFixed(10));
      } else current += k;
      updateDisplay();
    });
  });

  /* ---------- Conversioni ---------- */
  const tassi = { EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.94, JPY: 163 };
  const pesi = { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.028349523125 };
  const altezze = { m: 1, cm: 0.01, ft: 0.3048, in: 0.0254 };

  const fmt = (n) => (+n.toFixed(6)).toLocaleString("it-IT", { maximumFractionDigits: 6 });

  function bindConverter(prefix, tabella, dec) {
    const importo = document.getElementById(prefix + "-importo");
    const da = document.getElementById(prefix + "-da");
    const a = document.getElementById(prefix + "-a");
    const risultato = document.getElementById(prefix + "-risultato");
    function converti() {
      const v = parseFloat(importo.value);
      if (isNaN(v)) { risultato.textContent = "Inserisci un valore valido"; return; }
      const out = v * tabella[da.value] / tabella[a.value];
      risultato.textContent = `${fmt(v)} ${da.value} = ${fmt(out)} ${a.value}`;
    }
    [importo, da, a].forEach((el) => el.addEventListener("input", converti));
    converti();
  }

  bindConverter("val", tassi, "tasso di cambio indicativo");
  bindConverter("pes", pesi);
  bindConverter("alt", altezze);

  updateDisplay();
});
