# Propulsion Lab

Laboratorio didattico 3D in italiano per istituti tecnici e professionali. Realizzato con JavaScript, Three.js e un server compatibile con Cloudflare Workers.

## Avvio locale

```powershell
npm install
npm run build
npm run dev
```

Aprire http://127.0.0.1:4173. Dopo una modifica ai sorgenti eseguire nuovamente `npm run build` e ricaricare la pagina. Il server locale legge gli asset compilati in `dist` e usa `src/worker.js` per le API. `npm test` esegue i controlli su bilancio energetico, scenario di guasto, validazione del tutor e routing.

## Funzioni

- Modelli procedurali distinti: benzina quattro cilindri, ibrido parallelo ed elettrico sincrono a magneti permanenti.
- Rotazione, zoom, selezione tramite raycasting e tramite elenco accessibile, isolamento, carter in sezione, vista esplosa e animazione cinematica rallentata.
- Scenari, regime, carico, ambiente e guasto al raffreddamento. Confronto di efficienza, energia in ingresso, consumo, CO₂ allo scarico, temperatura e prestazioni indicative.
- Schede dei componenti, relazioni, criticità, diagrammi dei flussi, tre attività e quiz con feedback.
- Rilevamento WebXR immersive-ar, posizionamento su superficie tramite hit-test; esportazione GLB e USDZ per Quick Look.
- WebMCP: lettura dei risultati e configurazione validata della stessa interfaccia.

## Tutor AI

Le schede e i quiz funzionano senza servizi esterni. La conversazione AI è implementata ma **non è attiva senza una chiave del servizio**. Non mostra risposte simulate spacciate per AI.

Configurare `OPENAI_API_KEY` esclusivamente nell'ambiente del server o come segreto di Sites. `OPENAI_MODEL` è facoltativo (default `gpt-4.1-mini`). Non inserire chiavi nel browser, nei sorgenti o nel repository. Il file `.env.example` elenca le variabili ma il server non legge automaticamente `.env`.

Endpoint:

- `GET /api/tutor/status`: stato di disponibilità, senza credenziali.
- `POST /api/tutor`: domanda, sistema, componente e condizioni validati; risposta tramite OpenAI Responses API. Non viene conservata una cronologia dall'app. Le richieste impostano `store: false`; valgono comunque le politiche del provider.

Il limite in memoria per IP è una mitigazione leggera, non un limite globale distribuito. Il sito è privato; prima di estendere l'accesso occorrono quote e autenticazione adeguate all'utenza.

## Limiti didattici e AR

Geometrie schematiche originali, non CAD industriali né modelli in scala reale. La simulazione è illustrativa e non costituisce diagnosi o calcolo di omologazione. Le ipotesi e le fonti DOE sono consultabili dall'interfaccia. Sono escluse le emissioni del ciclo di vita e le perdite di ricarica. Le temperature di refrigerante e avvolgimenti rappresentano grandezze diverse.

L'animazione riproduce il meccanismo biella-manovella, non la combustione fluidodinamica. Gli rpm modificano i valori del modello; l'animazione resta rallentata per leggibilità. In vista esplosa i collegamenti sono deliberatamente separati.

WebXR richiede HTTPS, browser e hardware compatibili, autorizzazione e supporto hit-test. Quick Look è un'esportazione statica; non porta con sé quiz o interfaccia del tutor. L'esportazione include le parti visibili nella configurazione corrente. La verifica su tablet fisico e Meta Quest 3 resta da effettuare.

## Distribuzione

`npm run build` genera gli asset in `dist` e il Worker ESM in `dist/server/index.js`. Il Worker incorpora gli asset statici, quindi non richiede un binding per file esterni. Il sito privato è identificato in `.openai/hosting.json`.

Fonti concettuali: [DOE — veicoli ibridi](https://afdc.energy.gov/vehicles/electric-basics-hev), [AFDC — veicoli elettrici](https://afdc.energy.gov/vehicles/electric), [OpenAI Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create).
