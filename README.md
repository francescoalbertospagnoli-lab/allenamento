# Allenamento

Web app personale per la palestra: schede, registro di kg e ripetizioni durante l'allenamento, timer di recupero, storico, grafici dei progressi, peso corporeo e piano alimentare.

- Funziona dal browser del telefono e si installa come app (PWA), anche offline.
- Nessun server e nessun account: i dati restano nel telefono (localStorage). Dalle Impostazioni si esporta e si reimporta un backup `.json`.
- Nessuna dipendenza e nessun build: HTML, CSS e JavaScript puri.

## Struttura

| File | Contenuto |
|---|---|
| `index.html` | Pagina e barra di navigazione |
| `js/data.js` | Schede iniziali (3, 4, 5 giorni) e piano alimentare |
| `js/app.js` | Schermate e logica |
| `js/store.js` | Salvataggio dati |
| `js/chart.js` | Grafici |
| `sw.js` | Funzionamento offline |

## Aggiornare l'app

Dopo una modifica ai file, aumenta `VERSION` in `sw.js` (es. `v2`): i telefoni scaricano la nuova versione alla successiva apertura con internet.
