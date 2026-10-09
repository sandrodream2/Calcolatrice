# Calcolatrice Scientifica (React)

Calcolatrice scientifica web sviluppata in React 18 con build Vite 5. Il cuore del progetto è un motore di valutazione dedicato a tre stadi — tokenizzazione, algoritmo shunting-yard e valutazione in notazione polacca inversa (RPN) — interamente privo di `eval`, quindi sicuro per costruzione.

## Funzionalità

- Operazioni di base, parentesi con chiusura automatica, potenze (`x²`, `xʸ`, `1/x`), radici, fattoriale, percentuale.
- Funzioni trigonometriche e inverse, logaritmiche ed esponenziali (`ln`, `log`, `eˣ`, `10ˣ`) con modalità DEG/RAD e tasto `2nd`.
- Costanti π ed e, costante `Ans` (ultimo risultato), memoria a quattro funzioni (MC, MR, M+, M−).
- Anteprima live del risultato durante la digitazione.
- Storico degli ultimi 30 calcoli, riutilizzabile con un clic.
- Supporto tastiera completo.

## Architettura

```
src/
├── engine.js   Logica pura: tokenizer, shunting-yard, valutatore RPN, formattazione.
└── App.jsx     Componente React: stato, tastiera, interfaccia Tailwind.
```

La separazione tra motore e interfaccia rende la logica di calcolo testabile in modo indipendente dal rendering. Dettagli del motore:

- Tokenizzazione con supporto per notazione scientifica e moltiplicazione implicita (`2π`, `3(4+1)`, `2sin(30)`).
- Gestione corretta di precedenza e associatività: `2^3^2 = 512` (associatività destra), `−2^2 = −4` (meno unario), `2^2! = 4` (postfix a precedenza massima).
- Validazione esplicita dei domini: logaritmi e radici di argomenti non validi, inverse trigonometriche fuori da [−1, 1], fattoriale limitato a interi da 0 a 170, divisione per zero.
- Precisione di visualizzazione: 12 cifre significative; notazione esponenziale per valori con modulo ≥ 1e12 o < 1e-9; azzeramento dei residui di virgola mobile in vicinanza dello zero (es. `sin(180°) = 0`).

## Requisiti e avvio

- Node.js 18 o superiore.

```bash
npm install
npm run dev      # server di sviluppo
npm run build    # build di produzione in dist/
npm run preview  # anteprima della build
```

## Limiti dichiarati

- La percentuale adotta la semantica matematica `x% = x/100` (ad esempio `200×10% = 20`), non la semantica incrementale di alcune calcolatrici commerciali.
- Il fattoriale è definito solo per interi da 0 a 170, per evitare l'overflow del formato IEEE 754 a doppia precisione.
- Tailwind CSS è caricato tramite CDN Play, adeguato per sviluppo e demo; per produzione è consigliata l'installazione di Tailwind CLI o del plugin PostCSS.

## Verifica del motore

Il motore è stato verificato su 27 casi di prova, inclusi casi limite di precedenza, associatività, domini delle funzioni e aritmetica in virgola mobile, con esito positivo.
