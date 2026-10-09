import React, { useState, useEffect, useMemo, useCallback } from "react";
import { evaluate, formatResult } from "./engine.js";

/* =====================================================================
   COMPONENTI UI
   ===================================================================== */

function Btn({ label, onClick, className = "", disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg py-2.5 px-1 font-semibold transition-transform duration-75 active:scale-90 disabled:opacity-40 disabled:active:scale-100 ${className}`}
    >
      {label}
    </button>
  );
}

const CLS = {
  num: "bg-slate-800 hover:bg-slate-700 text-white text-base",
  op: "bg-amber-500/90 hover:bg-amber-500 text-slate-900 text-base",
  fn: "bg-slate-800/60 hover:bg-slate-700/60 text-cyan-300",
  util: "bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300",
  utilOn: "bg-cyan-500 hover:bg-cyan-400 text-slate-900 border border-cyan-500",
  danger: "bg-slate-800 hover:bg-red-950 text-red-400",
  eq: "bg-blue-600 hover:bg-blue-500 text-white text-base",
};

export default function App() {
  const [expr, setExpr] = useState("");
  const [ans, setAns] = useState(0);
  const [degMode, setDegMode] = useState(true);
  const [second, setSecond] = useState(false);
  const [memory, setMemory] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [justEvaluated, setJustEvaluated] = useState(false);

  // Chiusura automatica delle parentesi aperte prima della valutazione.
  const autoClose = (e) => {
    const opens = (e.match(/\(/g) || []).length;
    const closes = (e.match(/\)/g) || []).length;
    return e + ")".repeat(Math.max(0, opens - closes));
  };

  // Anteprima live del risultato.
  const preview = useMemo(() => {
    if (!expr.trim()) return null;
    try {
      return evaluate(autoClose(expr), { ans }, degMode);
    } catch {
      return null;
    }
  }, [expr, degMode, ans]);

  const currentValue = useCallback(
    () => (preview !== null ? preview : ans),
    [preview, ans]
  );

  const insert = useCallback(
    (text) => {
      setError(null);
      if (justEvaluated) {
        const continues = /^[+\-−×÷^%!]/.test(text);
        setExpr((continues ? String(ans) : "") + text);
        setJustEvaluated(false);
      } else {
        setExpr((e) => e + text);
      }
    },
    [justEvaluated, ans]
  );

  const del = useCallback(() => {
    setError(null);
    if (justEvaluated) {
      setExpr("");
      setJustEvaluated(false);
      return;
    }
    setExpr((e) => e.slice(0, -1));
  }, [justEvaluated]);

  const ac = useCallback(() => {
    setExpr("");
    setError(null);
    setJustEvaluated(false);
  }, []);

  const equals = useCallback(() => {
    if (!expr.trim()) return;
    const src = autoClose(expr);
    try {
      const value = evaluate(src, { ans }, degMode);
      setAns(value);
      setError(null);
      setJustEvaluated(true);
      setHistory((h) => [{ expr: src, result: value }, ...h].slice(0, 30));
    } catch (err) {
      setError(err.message);
    }
  }, [expr, ans, degMode]);

  // Supporto tastiera.
  useEffect(() => {
    const onKey = (ev) => {
      const k = ev.key;
      let handled = true;
      if (/^[0-9.]$/.test(k)) insert(k);
      else if (k === "+") insert("+");
      else if (k === "-") insert("−");
      else if (k === "*" || k === "x" || k === "X") insert("×");
      else if (k === "/") insert("÷");
      else if (k === "^") insert("^");
      else if (k === "%") insert("%");
      else if (k === "!") insert("!");
      else if (k === "(" || k === ")") insert(k);
      else if (k === "Enter" || k === "=") equals();
      else if (k === "Backspace") del();
      else if (k === "Escape") ac();
      else handled = false;
      if (handled) ev.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [insert, equals, del, ac]);

  const trigLabel = (base, inv) => (second ? inv : base);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-4">

        {/* Calcolatrice */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl flex-1">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider mb-2">
            <span className={`px-2 py-0.5 rounded ${degMode ? "bg-cyan-500/15 text-cyan-300" : "bg-slate-800 text-slate-400"}`}>
              {degMode ? "DEG" : "RAD"}
            </span>
            {second && (
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">2ND</span>
            )}
            {memory !== null && (
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">M</span>
            )}
            <span className="ml-auto text-slate-600">CALCOLATRICE SCIENTIFICA</span>
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 text-right mb-4">
            <div className="text-slate-400 text-sm break-all max-h-24 overflow-y-auto min-h-[1.25rem]">
              {expr || "0"}
            </div>
            <div
              className={`mt-1 text-3xl font-light break-all ${
                error ? "text-red-400 text-lg" : "text-white"
              }`}
            >
              {error
                ? error
                : preview !== null
                ? formatResult(preview)
                : expr
                ? "…"
                : "0"}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {/* Memoria */}
            <Btn label="MC" onClick={() => setMemory(null)} className={CLS.util} />
            <Btn
              label="MR"
              onClick={() => insert(String(memory))}
              disabled={memory === null}
              className={CLS.util}
            />
            <Btn label="M+" onClick={() => setMemory(currentValue())} className={CLS.util} />
            <Btn label="M−" onClick={() => setMemory(-currentValue())} className={CLS.util} />
            <Btn label="Ans" onClick={() => insert("Ans")} className={CLS.util} />

            {/* Modalità e parentesi */}
            <Btn
              label="2nd"
              onClick={() => setSecond((s) => !s)}
              className={second ? CLS.utilOn : CLS.util}
            />
            <Btn
              label={degMode ? "DEG" : "RAD"}
              onClick={() => setDegMode((d) => !d)}
              className={CLS.util}
            />
            <Btn label="(" onClick={() => insert("(")} className={CLS.fn} />
            <Btn label=")" onClick={() => insert(")")} className={CLS.fn} />
            <Btn label="DEL" onClick={del} className={CLS.danger} />

            {/* Funzioni */}
            <Btn
              label={trigLabel("sin", "sin⁻¹")}
              onClick={() => insert(second ? "asin(" : "sin(")}
              className={CLS.fn}
            />
            <Btn
              label={trigLabel("cos", "cos⁻¹")}
              onClick={() => insert(second ? "acos(" : "cos(")}
              className={CLS.fn}
            />
            <Btn
              label={trigLabel("tan", "tan⁻¹")}
              onClick={() => insert(second ? "atan(" : "tan(")}
              className={CLS.fn}
            />
            <Btn
              label={trigLabel("ln", "eˣ")}
              onClick={() => insert(second ? "exp(" : "ln(")}
              className={CLS.fn}
            />
            <Btn
              label={trigLabel("log", "10ˣ")}
              onClick={() => insert(second ? "10^(" : "log(")}
              className={CLS.fn}
            />

            {/* Potenze e radici */}
            <Btn label="√" onClick={() => insert("√(")} className={CLS.fn} />
            <Btn label="x²" onClick={() => insert("^2")} className={CLS.fn} />
            <Btn label="xʸ" onClick={() => insert("^")} className={CLS.fn} />
            <Btn label="1/x" onClick={() => insert("^(-1)")} className={CLS.fn} />
            <Btn label="n!" onClick={() => insert("!")} className={CLS.fn} />

            {/* Cifre e operatori */}
            <Btn label="7" onClick={() => insert("7")} className={CLS.num} />
            <Btn label="8" onClick={() => insert("8")} className={CLS.num} />
            <Btn label="9" onClick={() => insert("9")} className={CLS.num} />
            <Btn label="÷" onClick={() => insert("÷")} className={CLS.op} />
            <Btn label="AC" onClick={ac} className={CLS.danger} />

            <Btn label="4" onClick={() => insert("4")} className={CLS.num} />
            <Btn label="5" onClick={() => insert("5")} className={CLS.num} />
            <Btn label="6" onClick={() => insert("6")} className={CLS.num} />
            <Btn label="×" onClick={() => insert("×")} className={CLS.op} />
            <Btn label="π" onClick={() => insert("π")} className={CLS.fn} />

            <Btn label="1" onClick={() => insert("1")} className={CLS.num} />
            <Btn label="2" onClick={() => insert("2")} className={CLS.num} />
            <Btn label="3" onClick={() => insert("3")} className={CLS.num} />
            <Btn label="−" onClick={() => insert("−")} className={CLS.op} />
            <Btn label="e" onClick={() => insert("e")} className={CLS.fn} />

            <Btn label="0" onClick={() => insert("0")} className={CLS.num} />
            <Btn label="." onClick={() => insert(".")} className={CLS.num} />
            <Btn label="%" onClick={() => insert("%")} className={CLS.fn} />
            <Btn label="+" onClick={() => insert("+")} className={CLS.op} />
            <Btn label="=" onClick={equals} className={CLS.eq} />
          </div>

          <p className="mt-3 text-[10px] text-slate-600 leading-relaxed">
            Tastiera: 0-9 . ( ) + − × ÷ ^ % ! · Invio = · Backspace DEL · Esc AC.
            L'operatore % trasforma il valore in percentuale (50% = 0,5).
          </p>
        </div>

        {/* Storico */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 lg:w-72 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 tracking-wide">STORICO</h2>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistory([])}
                className="text-xs text-slate-500 hover:text-red-400 transition"
              >
                Cancella
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto max-h-80 space-y-2">
            {history.length === 0 ? (
              <p className="text-xs text-slate-600">Nessun calcolo eseguito.</p>
            ) : (
              history.map((h, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => insert(formatResult(h.result))}
                  className="w-full text-right bg-slate-950/60 hover:bg-slate-800 border border-slate-800 rounded-lg px-3 py-2 transition"
                >
                  <div className="text-[11px] text-slate-500 break-all">{h.expr}</div>
                  <div className="text-sm text-slate-200 break-all">= {formatResult(h.result)}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
