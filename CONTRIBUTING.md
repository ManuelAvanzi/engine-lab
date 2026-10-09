# Collaborare a Engine Lab

Repository: https://github.com/ManuelAvanzi/engine-lab

## Accesso al codice

Ogni collaboratore usa il proprio account GitHub. Il proprietario invita gli username da **Settings → Collaborators → Add people** con permesso di scrittura; l’invito deve essere accettato. Una repository pubblica consente lettura e clone, ma non concede automaticamente il diritto di scrivere. Non condividere password, token o l’account del proprietario.

L’accesso alla repository non concede accesso amministrativo a Vercel, Supabase o ai progetti personali salvati dagli utenti. Eventuali permessi sui servizi vanno assegnati separatamente dal proprietario, solo quando necessari.

## Flusso di lavoro

1. Aggiornare `main` con `git switch main` e `git pull --ff-only`.
2. Creare un ramo dedicato, ad esempio `git switch -c feature/nome-intervento`.
3. Implementare e verificare la modifica con i comandi sotto.
4. Committare solo i file pertinenti, pubblicare il ramo e aprire una pull request verso `main`.
5. Far rivedere la modifica prima dell’unione. Evitare push forzati e modifiche dirette al database condiviso.

## Credenziali, dati e risorse

I file `.env.local`, le credenziali personali, `node_modules` e i risultati temporanei non devono essere caricati. Le chiavi pubblicabili Supabase presenti nel client non sono chiavi amministrative; le policy del database controllano l’accesso ai dati. Per lo sviluppo degli account usare preferibilmente un backend di prova. Non applicare nuovamente le migrazioni sul database di produzione.

I progetti creati dagli utenti sono dati applicativi, salvati nel browser o nel backend: non fanno parte della cronologia Git. Conservare attribuzioni e licenze dei modelli, materiali e font inclusi. Gli asset originali usati per preparare i modelli possono essere esclusi dalla repository; gli asset ottimizzati necessari all’app devono essere presenti.

## Preparazione dell’ambiente

Usare Node.js 20 o successivo e npm. Accettare l’invito GitHub prima di clonare una repository privata.

```sh
git clone https://github.com/ManuelAvanzi/engine-lab.git
cd engine-lab
npm ci
npm run build
npm run dev
```

Aprire http://127.0.0.1:4173. Il server usa `dist/`: dopo una modifica eseguire di nuovo `npm run build` e ricaricare. Verifiche: `npm test` e `npm run build`.

Account e archivio sono descritti in [docs/ACCOUNT-ONLINE.md](docs/ACCOUNT-ONLINE.md); la configurazione pubblica è in `src/cloud-config.js`. Il tutor conversazionale è opzionale e richiede `OPENAI_API_KEY` nell’ambiente server. Le attività guidate funzionano senza questa chiave. Non inserire segreti in `src/` o nei file compilati per il browser.

La versione disponibile include modelli di propulsione, attività guidate, confronto dei risultati, archivio personale e schede componenti aggiornate. La cronologia precedente alla creazione della repository GitHub è stata conservata.

Sito di produzione: https://enginelab-carraro.vercel.app/. Il progetto è stato pubblicato tramite Sites/Vercel; la creazione della repository GitHub non configura automaticamente una pipeline di deploy. Concordare la pubblicazione con il proprietario e verificare il collegamento Vercel prima di assumere che un push aggiorni il sito.

