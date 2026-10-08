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

## Studio 3D · seconda versione

- Illuminazione da studio con luce principale fredda, controluce ciano e ambra, materiali metallici distinti, bordi smussati e bloom selettivo sulle parti luminose.
- Auto X-ray procedurale con scocca e abitacolo trasparenti, ruote, cerchi, fari e contorni: commutazione tra dettaglio del propulsore e contesto del veicolo.
- Animazione inizialmente attiva, salvo preferenza di sistema per movimento ridotto. Pausa e velocità 0,5× / 1× / 2×. Pistoni, bielle, albero, valvole e rotori in movimento; fasi del cilindro 1 indicate in tempo reale.
- Estrazione e reinserimento indipendente dei gruppi. Modalità Sposta componenti con trascinamento su un piano parallelo alla camera, anche tramite touch; cursori X/Y/Z come alternativa accessibile. Ricomposizione di tutti i gruppi con transizione morbida.
- Scocca e cinematica sono rappresentazioni didattiche, non CAD di un veicolo commerciale. La vista AR continua a esportare il propulsore selezionato, senza la scocca contestuale.

## Tutor AI

Le schede e i quiz funzionano senza servizi esterni. La conversazione AI è implementata ma **non è attiva senza una chiave del servizio**. Non mostra risposte simulate spacciate per AI.

Configurare `OPENAI_API_KEY` esclusivamente nell'ambiente del server o come segreto di Sites. `OPENAI_MODEL` è facoltativo (default `gpt-4.1-mini`). Non inserire chiavi nel browser, nei sorgenti o nel repository. Il file `.env.example` elenca le variabili ma il server non legge automaticamente `.env`.

Endpoint:

- `GET /api/tutor/status`: stato di disponibilità, senza credenziali.
- `POST /api/tutor`: domanda, sistema, componente e condizioni validati; risposta tramite OpenAI Responses API. Non viene conservata una cronologia dall'app. Le richieste impostano `store: false`; valgono comunque le politiche del provider.

Il limite in memoria per IP è una mitigazione leggera, non un limite globale distribuito. Il sito è privato; prima di estendere l'accesso occorrono quote e autenticazione adeguate all'utenza.

## Limiti didattici e AR

Propulsori schematici originali, non CAD industriali né modelli in scala reale. Carrozzeria Tesla Model 3 (2024) per EV; Ferrari 458 Italia per il termico; Car Concept di Khronos per il sistema ibrido. Crediti e licenze CC BY 4.0 in `src/models/credits.html`. I propulsori non sono ricostruzioni OEM dei veicoli. La simulazione è illustrativa e non costituisce diagnosi o calcolo di omologazione. Le ipotesi e le fonti DOE sono consultabili dall'interfaccia. Sono escluse le emissioni del ciclo di vita e le perdite di ricarica. Le temperature di refrigerante e avvolgimenti rappresentano grandezze diverse.

L'animazione riproduce il meccanismo biella-manovella, non la combustione fluidodinamica. Gli rpm modificano i valori del modello e la velocità dei movimenti, che restano rallentati per leggibilità. In vista esplosa i collegamenti sono deliberatamente separati.

Le ruote seguono il motore con pausa e velocità condivise. I rapporti sono illustrativi: 5:1 termico, 6:1 ibrido, 9:1 elettrico. Separare o spostare le parti sospende ruote e flussi fino alla ricomposizione. Le frecce indicano aria aspirata (blu), gas di scarico (corallo), energia elettrica (turchese) e coppia meccanica (ambra). I percorsi sono schemi funzionali, non tubazioni o cablaggi OEM; non vengono esportati né mostrati in AR. Il comando Flussi consente di nasconderli.

WebXR richiede HTTPS, browser e hardware compatibili, autorizzazione e supporto hit-test. Quick Look è un'esportazione statica; non porta con sé quiz o interfaccia del tutor. L'esportazione include le parti visibili nella configurazione corrente. La verifica su tablet fisico e Meta Quest 3 resta da effettuare.

## Distribuzione

`npm run build` genera gli asset in `dist` e il Worker ESM in `dist/server/index.js`. Il Worker incorpora gli asset statici, quindi non richiede un binding per file esterni. Il sito privato è identificato in `.openai/hosting.json`.

Fonti concettuali: [DOE — veicoli ibridi](https://afdc.energy.gov/vehicles/electric-basics-hev), [AFDC — veicoli elettrici](https://afdc.energy.gov/vehicles/electric), [OpenAI Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create).

## Modelli carrozzeria

La vista Auto X-ray è attiva di default; ruote opache e materiali satinati. I GLB ottimizzati sono inclusi nel repository (nessun servizio esterno necessario in esecuzione). I file originali scaricati in `assets/` sono ignorati da Git.

Per rigenerare: scaricare `tesla-source.glb` da https://raw.githubusercontent.com/erictfree/Carbon-Footprint-AI-Visualizer/main/models/tesla-model-3-2024/source/2024_tesla_model_3.glb e `concept-source.glb` da https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb nella cartella `assets/`, poi eseguire `node scripts/prepare-vehicles.mjs`. Conservare attribuzioni e metadati. Compressione Meshopt e normali pneumatici conservate. Esportazioni AR/GLB/Quick Look includono il propulsore, non la carrozzeria di contesto.

## Vista didattica e inquadrature

La carrozzeria usa trasparenza graduata sui contorni e nasconde gli interni. La selezione di una parte avvicina la camera con una transizione interrompibile ruotando il modello; `Vista generale` ripristina il contesto completo. Nei dettagli le ruote vengono nascoste per non coprire il propulsore. I movimenti rispettano la preferenza di riduzione delle animazioni.

La vista esplosa usa direzioni coerenti per gli assiemi, guide tratteggiate verso le sedi originali e al massimo tre etichette, con priorità alla selezione. Le annotazioni non fanno parte delle esportazioni. La scheda è richiudibile e parte chiusa su tablet; i comandi secondari sono sotto `Strumenti`.

## Percorsi guidati e rapporto di trasmissione

I flussi sono filamenti animati con impulsi sfumati, selezionabili singolarmente. Ogni percorso spiega origine, destinazione e trasformazione. La velocità delle scie non rappresenta la velocità fisica di gas o corrente. Motore e ruote usano rpm reali del modello convertiti in radianti e rallentati insieme di 100 volte, moltiplicati per la velocità di riproduzione. Il pannello espone rpm motore / rapporto totale = rpm ruote. Rapporto fisso illustrativo, senza slittamento, cambi marcia o modello cinematico OEM dell'ibrido.

## Carrozzeria a benzina

Ferrari 458 Italia di vicent091036, dagli esempi ufficiali Three.js, CC BY 4.0 (crediti e fonti in src/models/credits.html). Sorgente: https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb. Salvare in assets/ferrari-source.glb e rigenerare con `node scripts/prepare-vehicles.mjs ferrari`. Il decoder Draco serve soltanto durante la preparazione; il browser usa Meshopt. Ruote rettilinee con geometrie normalizzate su asse X, pinze fisse, carrozzeria X-ray. Il quattro cilindri didattico occupa il vano posteriore e trasmette coppia all'asse posteriore: non è una ricostruzione del V8 Ferrari. Tesla EV e concept ibrido invariati.

## Ispezione interna dei componenti

Passando il mouse su un componente si vede la sua struttura interna e una breve spiegazione. La camera, la selezione e gli altri pezzi restano invariati; uscendo dal componente si ripristinano i materiali. La casella Mantieni trasparenza permette di fissare l'ispezione, anche da touch e tastiera, e regolare la trasparenza dal 20 al 95%. In questa modalità il componente viene inquadrato e isolato temporaneamente. Vista generale chiude l'ispezione.

Coppa cava con bordi arrotondati e tappo di scarico, coperchio con spessore, pistoni cavi inferiormente, ingranaggi sagomati e minuteria migliorano la leggibilità. Gli interni sono schemi didattici e non CAD OEM; le parti piene sono descritte come tali.

## Controllo velocita nel viewer
Il cursore 0-100 km/h sostituisce i moltiplicatori di riproduzione, anche a schermo intero. Diametro di rotolamento convenzionale 0,65 m; rpm ruote = (km/h / 3,6) / (pi * diametro) * 60. Il regime deriva dai rapporti fissi 5, 6, 9. Cambio di propulsore conserva la velocita; gli scenari impostano la loro velocita limitata a 100 km/h. A zero tutto si arresta (motore spento, nessun minimo/frizione simulati) e le stime per distanza sono nascoste. La visualizzazione conserva un rallentamento fisso 100/3 per leggibilita. Le stime energetiche sono riferite allo scenario semplificato, non a una simulazione dinamica di guida.

## Revisione tecnica I4 e scansione di riferimento
Il motore a benzina usa basamento con deck forato, canne cave, guarnizione e sedi valvole, due alberi a camme, otto valvole con molle elicoidali, bielle forate con cappelli e rail di iniezione indiretta. La distribuzione usa rapporto 2:1; geometrie e quote restano illustrative, non un CAD OEM certificato. Il modello ibrido ed elettrico non sono oggetto di questa revisione.
Una vista separata Motore reale 3D presenta la scansione statica Four-cylinder engine di Artec 3D, CC BY 4.0, con attribuzione visibile. Non promette animazione o separazione dei pezzi della scansione. Sorgente: https://www.artec3d.com/3d-models/four-cylinder-engine . Rigenerazione: estrarre il PLY in assets/technical e lanciare node scripts/prepare-engine-scan.mjs. Circa 10 milioni di triangoli originali ridotti con errore controllato e compressi a circa 2,4 MB. Il visualizzatore viene caricato su richiesta e rilascia le risorse alla chiusura.
Riferimento funzionale iniezione indiretta: https://www.bosch-mobility.com/en/solutions/valves/fuel-injector-manifold/ . Nessuna geometria Bosch copiata.


## Revisione tecnica completa — 8 ottobre 2026

- 10 componenti termici, 14 ibridi e 8 elettrici, con selezione e inquadratura; 20 tavole vettoriali originali condivise dove il componente è lo stesso.
- Selettore componenti e scheda illustrata disponibili anche nel viewer fullscreen e su tablet. Il focus passa alla vista del propulsore e attenua il contesto.
- Ibrido: testata, basamento, bielle e distribuzione della revisione tecnica; motogeneratore coassiale, inverter aperto, moduli/celle batteria e trasmissione 2 × 3.
- Elettrico: carter cavo, lamierini, cave/avvolgimenti, magneti, albero scanalato, piste/sfere/gabbie, elettronica e riduttore 3 × 3.
- Ruote concept raddrizzate con pneumatico e cerchio nello stesso gruppo, pinze fisse. Bake delle trasformazioni speculari con correzione del winding. Tesla: superfici blur sostituite da ruote parametriche chiuse, mantenendo i centri degli assi.
- Cinematica: velocità iniziale 0, limite 100 km/h, diametro didattico 0,65 m; rapporti totali termico 5, ibrido 6, EV 9. Tutti i movimenti usano la stessa scala temporale 3%. Pausa e zero fermano i movimenti; smontaggio interrompe il collegamento alle ruote. Il regime è uno schema cinematico senza minimo, frizione o cambi marcia.
- Verifica: 13 test automatici; 32 selezioni di componenti verificate nel browser, caricamento delle tavole, messa a fuoco, desktop, fullscreen e viewport tablet 820 × 1180. Nessun test su un dispositivo Quest fisico.

Le tavole sono SVG accessibili originali. Riferimenti funzionali: https://www.bosch-mobility.com/en/solutions/electric-motors/ e https://afdc.energy.gov/vehicles/electric. Nessuna pretesa di fedeltà dimensionale OEM.
