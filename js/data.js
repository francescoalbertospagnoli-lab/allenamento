// Dati iniziali: schede e piano alimentare.
// Formato esercizio: [nome, serie, ripetizioni, recupero, note, superserie]
// "superserie" = etichetta di gruppo (es. "H"): esercizi con la stessa etichetta vanno in superserie.

// kg = carico di partenza (usato come suggerimento finché non c'è storico)
const E = (name, sets, reps, rest, note = "", group = "", kg = null) => ({ name, sets, reps, rest, note, group, ...(kg != null ? { kg } : {}) });

export const DEFAULT_PROGRAMS = [
  {
    id: "p4",
    name: "4 giorni",
    subtitle: "Push / Lower / Pull / Full Body",
    version: 2,
    days: [
      {
        title: "Petto + Spalle + Tricipiti",
        items: [
          E("Panca 30° al multipower", 4, "6-10", "150 sec", "30° — lieve fermo al petto."),
          E("Alzate laterali con manubri", 3, "10-12", "1 min", "Eccentrica controllata."),
          E("Spinte in alto con manubri da seduto", 3, "8-10", "90 sec"),
          E("Chest press", 3, "8-12", "90 sec"),
          E("Pectoral fly", 3, "10-15", "90 sec", "", "", 20),
          E("Reverse fly", 3, "8-12", "90 sec", "", "", 20),
          E("French press con manubri su panca piana", 3, "8-12", "90 sec"),
          E("Tricipiti alla corda (Vulken)", 3, "8-12", "90 sec"),
        ],
      },
      {
        title: "Lower Quad + Richiamo glutei",
        items: [
          E("Pendulum squat", 3, "6-10", "2 min"),
          E("Hyperextension", 3, "8-12", "2 min"),
          E("Leg Press a 45°", 3, "8-10", "3 min"),
          E("RDL con bilanciere", 3, "8-12", "2 min", "", "", 60),
          E("Leg Extension", 3, "8", "2 min", "Superserie: 3×8 a due gambe, poi subito gamba singola al massimo. Recupero dopo la gamba singola.", "E"),
          E("Leg Extension gamba singola", 3, "max (per gamba)", "0", "In superserie con la Leg Extension: ripetizioni al massimo, prima una gamba poi l'altra.", "E"),
          E("Pressa per polpacci", 3, "8-12", "90 sec", "", "", 100),
          E("Addominali su panca inclinata", 3, "15", "1 min"),
        ],
      },
      {
        title: "Upper Pull + Richiamo push",
        items: [
          E("Lat Machine con trazy bar", 3, "8-12", "2 min"),
          E("Spinte su panca inclinata con manubri", 4, "8-12", "90 sec", "Inclinata 30°. Va bene anche Chest press incline 30° se lo preferisci."),
          E("Pulley", 4, "8-10", "2 min", "", "", 60),
          E("Pulldown presa singola al macchinario (gran dorsale)", 3, "10-12", "2 min", "", "", 30),
          E("Reverse fly con manubri", 3, "10-15", "90 sec", "15 kg troppi: si riparte da 12,5 kg.", "", 12.5),
          E("Hammer curl su panca inclinata", 3, "8-12", "90 sec", "", "", 10),
          E("Curl su panca Scott con bilanciere EZ", 3, "8-12", "90 sec"),
        ],
      },
      {
        title: "Full Body",
        items: [
          E("Leg Curl in piedi", 3, "10-15", "1 min"),
          E("Affondi con bilanciere", 3, "8-12", "2 min", "", "", 20),
          E("Panca piana con bilanciere", 4, "5 (vedi note)", "150 sec", "Parti da un 4x5 con un carico circa buffer 2, poi la settimana seguente fai un 4x3 sempre buffer 2, cerca di aumentare le reps a parità di carico fintanto che non chiudi nuovamente un 5x5, dopo di che ripeti lo schema aggiornando il carico."),
          E("Military press con bilanciere", 3, "6-8", "2 min"),
          E("Pressa per polpacci", 3, "8-12", "90 sec", "", "", 100),
          E("Curl alternato con manubri", 3, "8-12", "90 sec"),
          E("Tricipiti alla corda (Vulken)", 3, "8-12", "90 sec"),
          E("Addominali su panca inclinata", 3, "max", "1 min"),
        ],
      },
    ],
  },
  {
    id: "p3",
    name: "3 giorni",
    subtitle: "Lower / Upper / Total Body",
    days: [
      {
        title: "Lower",
        items: [
          E("Squat al multipower", 3, "1ª serie 6-7 a RIR 2, poi -10% e 2 set da 8-10", "150 sec", "1ª serie: 6-7 reps a RIR 2 — poi scarica 10% e fai 2 set da 8-10 in tensione continua."),
          E("Stacco rumeno con bilanciere", 3, "8-10", "150 sec", "Leggero fermo in allungamento."),
          E("Affondi in camminata", 3, "8-10", "2 min"),
          E("Leg Curl sdraiato", 3, "10-12", "2 min", "Leggero fermo in massimo allungamento."),
          E("Leg Extension", 3, "10-12", "2 min", "Leggero fermo in picco e ritorno controllato."),
          E("Calf Raises al macchinario in piedi", 3, "8-10", "90 sec"),
          E("Crunch ai cavi in ginocchio", 3, "12-15", "90 sec"),
        ],
      },
      {
        title: "Upper",
        items: [
          E("Alzate laterali al cavo", 3, "10-12", "1 min"),
          E("Panca inclinata con bilanciere", 3, "6-8", "150 sec", "Leggero fermo al petto (no rimbalzoni)."),
          E("Croci basse ai cavi alti in piedi", 3, "10-12", "90 sec"),
          E("Spinte su panca 60°", 3, "6-8", "2 min"),
          E("Lat Machine", 3, "8-10", "2 min", "Focus sul deprimere e usare bene le scapole."),
          E("Pulley con triangolo", 3, "8-12", "2 min", "Aprire bene il torace quando si tira e sfruttare tutto l'allungamento."),
          E("Rematore singolo con manubrio su panca", 3, "6-10", "2 min", "Puoi farlo anche appoggiato, inclinazione busto 90°-75°."),
          E("Push Down con barra", 3, "8-12", "90 sec", "Superserie con hammer curl. Recupero dopo l'hammer curl.", "H"),
          E("Hammer curl alternato", 3, "8-12", "0", "In superserie con il push down.", "H"),
        ],
      },
      {
        title: "Total Body",
        items: [
          E("Leg Press a 45°", 4, "8-12", "2 min", "Leggero fermo in buca ed eccentrica controllata."),
          E("Spinte manubri su panca 15°", 4, "8-12", "2 min"),
          E("Rematore bilanciere", 4, "8-10", "2 min", "Leggero fermo in picco e ritorno controllato."),
          E("Alzate laterali su panca inclinata", 3, "10-12", "90 sec", "Leggero fermo in picco e ritorno controllato."),
          E("Hyperextension", 3, "10-12", "90 sec", "Zavorra se necessario."),
          E("Katana extension", 4, "8-12", "90 sec"),
          E("Curl Bicipiti al macchinario", 4, "8-12", "90 sec"),
          E("Knee Raises alla sbarra", 3, "a RIR 2", "90 sec", "Fino a 2 reps dal cedimento."),
        ],
      },
    ],
  },
  {
    id: "p5",
    name: "5 giorni",
    subtitle: "Push / Pull / Legs / Upper / Braccia+Gambe",
    days: [
      {
        title: "Push",
        items: [
          E("Panca piana con bilanciere", 5, "5", "3 min", "Parti con un carico che ti permette di chiudere bene tutte le serie. Quando lo chiudi, +2,5 kg totali e riparti da 5×3 → 5×4 → 5×5."),
          E("Spinte in alto con manubri da seduto", 4, "2×6-8 + 2×10-15", "1 min", "Prime 2 serie pesanti per 6/8 reps; ultime 2 più leggere per 10/15. Ritorno lento e controllato."),
          E("Spinte con manubri su panca inclinata", 4, "8-12", "90 sec", "Discesa controllata e fermo 1 secondo al petto."),
          E("Croci ai cavi", 3, "8-12", "90 sec", "Fermo 1 secondo in contrazione e ritorno lento."),
          E("French press 1 manubrio da seduto", 3, "8", "2 min", "Fermo 1 secondo in basso prima di tornare su."),
          E("Push Down supino singolo maniglia", 3, "8-15", "90 sec"),
          E("Alzate laterali manubri", 4, "8-15 + ultima serie doppio dropset", "1 min", "Discesa controllata."),
        ],
      },
      {
        title: "Pull",
        items: [
          E("Lat Machine presa supina", 4, "2×6-8 + 2×10-15", "150 sec", "Prime 2 serie pesanti, ultime 2 più leggere. Ritorno lento e controllato."),
          E("Pulley con triangolo", 3, "8-12 + doppio dropset ultimo set", "90 sec"),
          E("Lat Machine prona singola", 4, "8-12 + rest-pause 30 sec ultimo set", "90 sec"),
          E("Pull Down cavo alto con barra", 3, "8-12", "90 sec", "Ritorno controllato e 1 secondo in massimo allungamento."),
          E("Tirate al mento con corda al cavo alto", 3, "12-15", "90 sec", "Fermo 1 secondo in contrazione."),
          E("Curl al cavo basso", 4, "2×6-8 + 2×12-15", "2 min", "Prime 2 serie pesanti, ultime 2 più leggere. Ritorno lento e controllato."),
          E("Curl singolo su panca inclinata", 3, "8-12", "90 sec"),
        ],
      },
      {
        title: "Gambe",
        items: [
          E("Leg Curl sdraiato", 3, "8-12", "90 sec"),
          E("Squat con bilanciere", 5, "5", "3 min", "Stesso schema progressivo della panca: carico che chiude tutte le serie, +2,5 kg → 5×3 → 5×4 → 5×5."),
          E("Leg Press a 45°", 3, "8-12", "2 min", "Fermo 1 secondo in accosciata."),
          E("Stacco rumeno con manubri", 3, "10-12 + ultima serie rest-pause 20 sec", "2 min", "Discesa e salita controllata."),
          E("Leg Extension", 3, "8-15", "90 sec", "Fermo 1 secondo in contrazione e ritorno lento. Recupero dopo l'air squat.", "E"),
          E("Air Squat (corpo libero)", 3, "15-20", "0", "Chiusura interrotta, pump finale minimo 15/20 ripetizioni senza pause.", "E"),
        ],
      },
      {
        title: "Upper",
        items: [
          E("Shoulder Press presa neutra (macchinario)", 4, "2×6-8 + 2×10-12", "90 sec", "Prime 2 serie carico adeguato per max 8 reps; scala il peso per le serie da 10/12."),
          E("Rematore con bilanciere presa supina", 4, "10-15", "90 sec", "Fermo 1 secondo in massimo allungamento in basso."),
          E("Spinte con manubri su panca piana", 3, "6-12", "2 min", "Movimento controllato in discesa e fermo 1 secondo al petto."),
          E("Alzate laterali manubri", 4, "8-12 + ultimo set doppio dropset", "90 sec", "Fermo 1 secondo in contrazione in alto."),
          E("Tirate al mento al cavo basso con barra", 4, "8-12", "90 sec", "Discesa lenta."),
          E("Pull Down cavo alto con corda", 3, "8-15", "90 sec", "Fermo 1 secondo in contrazione."),
          E("Alzate laterali al cavo", 3, "12-15", "90 sec", "Ritorno lento."),
        ],
      },
      {
        title: "Braccia + Richiamo gambe",
        items: [
          E("Curl con bilanciere EZ", 4, "6-8", "150 sec", "Carico pesante."),
          E("Push Down con barra", 4, "8-10", "90 sec", "Carico pesante."),
          E("Leg Curl sdraiato", 3, "8-15", "90 sec", "Fermo 1 secondo in contrazione."),
          E("Leg Extension singola", 3, "8-15", "90 sec", "Fermo 1 secondo in contrazione."),
          E("Tirate al mento con corda al cavo alto", 4, "12-15", "1 min", "Fermo 1 secondo in contrazione."),
          E("Bicipiti manubri panca inclinata", 3, "8-15", "90 sec", "Discesa lenta e controllata."),
          E("Estensioni tricipiti sopra la testa al cavo basso", 3, "8-15", "90 sec", "Ritorno lento e fermo 1 secondo in massimo allungamento."),
        ],
      },
    ],
  },
];

export const NUTRITION = {
  summary: [
    ["Fase", "Massa (ottobre → fine maggio), poi definizione"],
    ["Ritmo obiettivo", "+0,2–0,4 kg/settimana (media settimanale)"],
    ["Calorie attuali (stima)", "~2.600 kcal riposo · ~2.700 allenamento"],
    ["Proteine", "~165–190 g/die (≈2,0–2,3 g/kg) — già sufficienti"],
    ["Carboidrati", "~345 g/die (≈4 g/kg) — si sale da qui"],
    ["Grassi", "~65 g/die (≈0,8 g/kg)"],
  ],
  meals: [
    {
      name: "Colazione",
      groups: [{ title: "", rows: [["Yogurt greco", "200 g"], ["Cereali", "80 g"], ["Burro di arachidi", "30 g"]] }],
    },
    {
      name: "Metà mattina",
      hint: "Nei giorni di allenamento 60–90 min prima della seduta.",
      groups: [
        { title: "Giorni di allenamento", rows: [["Banana", "1 (≈120 g)"], ["Gallette di riso", "2"], ["Noci", "30 g"], ["Preworkout", "1 dose"]] },
        { title: "Giorni di riposo", rows: [["Noci", "30 g"]] },
      ],
    },
    {
      name: "Post-allenamento",
      groups: [{ title: "", rows: [["Proteine in polvere", "30 g di proteine"], ["Creatina monoidrato", "5 g"]] }],
    },
    {
      name: "Pranzo",
      hint: "Peso a crudo. La quantità di pasta/riso segue il gradino attuale (vedi sotto).",
      groups: [
        { title: "", rows: [["Pasta / riso / cous cous (crudo)", "150 g"], ["Pollo, tacchino, manzo, pesce…", "150 g"], ["Verdure", "150–200 g"], ["Olio extravergine", "10 g"]] },
      ],
    },
    {
      name: "Merenda",
      groups: [
        { title: "", rows: [["Yogurt proteico", "1 vasetto"], ["Frutto (vedi elenco)", "1"]] },
      ],
    },
    {
      name: "Cena",
      groups: [
        { title: "", rows: [["Pasta / riso / cous cous (crudo)", "150 g"], ["Pollo, tacchino, manzo, pesce…", "150 g"], ["Verdure", "150–200 g"], ["Olio extravergine", "10 g"]] },
      ],
    },
  ],
  phasesNote: "Ogni 2 settimane guarda in Peso la variazione media: sotto +0,2 kg/sett. → sali di un gradino; tra 0,2 e 0,4 → resta; sopra 0,4 → scendi di un gradino. Dopo ogni aumento i primi 2–3 giorni il peso sale per acqua e glicogeno: non conta.",
  phases: [
    ["Base", "Pasta/riso 150 g a pasto", "≈2.600 kcal (mantenimento)"],
    ["Gradino 1", "Banana + 2 gallette pre-allenamento, frutto nello yogurt", "+≈80–260 kcal"],
    ["Gradino 1b", "+1 frutto a colazione", "+≈80 kcal"],
    ["Gradino 2", "Pasta/riso 170 g a pasto", "+≈140 kcal"],
    ["Gradino 3", "Cereali 100 g + 50 g di pane a cena", "+≈200 kcal"],
    ["Gradino 4", "Pasta/riso 190–200 g a pasto", "+≈150–200 kcal"],
  ],
  fruits: [
    ["Banana", "Pre-allenamento: digeribile, ~25 g di carboidrati"],
    ["Datteri / uvetta", "Tanti carboidrati in poco volume (30 g ≈ 20 g carbo)"],
    ["Cachi, uva", "Di stagione in autunno, ricchi di carboidrati"],
    ["Kiwi, arance, mandarini", "Vitamina C e fibre, da novembre in stagione"],
    ["Frutti di bosco (anche surgelati)", "Polifenoli, ottimi nello yogurt"],
    ["Mele, pere", "Molto sazianti: meno adatte se fai fatica a mangiare"],
  ],
  rules: [
    "Pesati ogni mattina a digiuno dopo il bagno e segna il peso in app: conta la media settimanale.",
    "Almeno 2 frutti al giorno: con la verdura arrivi a ≥400 g di frutta e verdura.",
    "Creatina 5 g tutti i giorni (dopo l'allenamento o a colazione nei giorni di riposo).",
    "Se aumentano gonfiore o fatica a finire i pasti, aggiungi carboidrati liquidi o densi (frutta secca, succo, cereali) invece di più pasta.",
    "Controlla la circonferenza vita ogni 2 settimane: se sale più di 3–4 cm dall'inizio della massa, rallenta.",
  ],
  supplements: [
    ["Ogni giorno", ["Creatina monoidrato 5 g"]],
    ["Pre-allenamento", ["Preworkout"]],
    ["Post-allenamento", ["Proteine in polvere (30 g di proteine)"]],
  ],
};

// Storico importato dall'app del coach (video "video pesi", 12/10/2026).
// Dove il video mostrava solo la prima serie è stata registrata solo quella.
const S_ = (date, dayIndex, dayTitle, exercises) => ({
  id: "seed-" + date,
  programId: "p4",
  programName: "4 giorni",
  dayIndex,
  dayTitle,
  startedAt: `${date}T18:00:00`,
  endedAt: null,
  note: "Importato dallo storico dell'app del coach.",
  exercises: exercises.map(([name, sets]) => ({ name, sets: sets.map(([kg, reps]) => ({ kg, reps })) })),
});
export const SEED_SESSIONS = [
  S_("2026-09-25", 2, "Upper Pull + Richiamo push", [
    ["Curl su panca Scott con bilanciere EZ", [[20, 12], [20, 10], [20, 9]]],
  ]),
  S_("2026-10-01", 2, "Upper Pull + Richiamo push", [
    ["Hammer curl alternato", [[14, 11], [14, 7], [14, 6]]],
  ]),
  S_("2026-10-03", 3, "Full Body", [
    ["Hip thrust machine", [[30, 8]]],
    ["Stacco rumeno con manubri", [[60, 8], [60, 8], [60, 8]]],
  ]),
  S_("2026-10-07", 1, "Lower Quad + Richiamo glutei", [
    ["Pendulum squat", [[50, 9]]],
    ["Hyperextension", [[60, 12]]],
    ["Leg Press a 45°", [[285, 8]]],
    ["Squat bulgaro con manubri", [[40, 9]]],
    ["Leg Extension", [[70, 8], [70, 5], [70, 5]]],
  ]),
  S_("2026-10-08", 2, "Upper Pull + Richiamo push", [
    ["Lat Machine con trazy bar", [[60, 10]]],
    ["Spinte su panca inclinata con manubri", [[26, 9], [26, 9], [26, 8], [26, 8]]],
    ["Rematore con manubrio su panca", [[60, 10], [60, 10], [60, 9], [60, 8]]],
    ["Pull Down singolo al macchinario", [[30, 10], [30, 10], [30, 8]]],
  ]),
  S_("2026-10-10", 3, "Full Body", [
    ["Leg Curl in piedi", [[25, 12]]],
    ["Panca piana con bilanciere", [[70, 4], [70, 4], [70, 4], [70, 3]]],
    ["Military press con bilanciere", [[50, 4], [45, 6], [45, 5]]],
    ["Alzate laterali singole al cavo da dietro", [[5, 12]]],
  ]),
  S_("2026-10-12", 0, "Petto + Spalle + Tricipiti", [
    ["Panca 30° al multipower", [[55, 9], [55, 7], [55, 6], [55, 6]]],
    ["Alzate laterali con manubri", [[12, 12], [12, 10], [12, 8]]],
    ["Spinte in alto con manubri da seduto", [[20, 9], [20, 10], [20, 8]]],
    ["Chest press", [[55, 10], [55, 12], [55, 10]]],
    ["Croci ai cavi altezza spalle", [[20, 10], [20, 13], [20, 13]]],
    ["Tirate al mento al cavo basso con corda", [[20, 8], [20, 8], [20, 7]]],
    ["French press con manubri su panca piana", [[12, 8], [12, 6], [12, 6]]],
    ["Push down tricipiti schiena al macchinario", [[20, 13], [20, 13], [20, 12]]],
  ]),
];
