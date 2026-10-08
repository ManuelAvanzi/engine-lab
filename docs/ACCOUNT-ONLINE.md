# Area personale engineLab

L’accesso usa lo stesso progetto Supabase di exhibitionLab e Warehouse Lab. L’alias `redazione` viene risolto nell’account esistente; la password viene verificata da Supabase Auth e non è inclusa nei sorgenti. Ogni laboratorio ha una chiave di sessione distinta.

## Dati salvati

La tabella dedicata `engine_projects` conserva nome, note, tipo di propulsore, velocità, carico, scenario, ambiente, raffreddamento, vista esplosa, sezioni, luminosità e posizione dei componenti. Alla riapertura l’animazione è in pausa e i contatori temporali ripartono da zero. La posizione della camera non viene salvata.

Le policy RLS limitano la lettura al proprietario. Il salvataggio passa dalla funzione `save_engine_project`, con controllo del proprietario, convalida dei dati e revisione attesa per evitare sovrascritture accidentali. La chiave nel client è pubblicabile e non concede accesso amministrativo.

## Configurazione e verifica

- Schema in `supabase/engine.sql`, applicato al backend condiviso l’8 ottobre 2026.
- Configurazione pubblica in `src/cloud-config.js`.
- Test in `tests/account.test.mjs`: isolamento utenti, accesso anonimo, scritture dirette vietate, conflitti di revisione e convalida.
- Vercel pubblica `dist` e le API in `api/`. `vercel.json` gestisce `/lab` e `/account`. Il tutor AI richiede separatamente `OPENAI_API_KEY`; in sua assenza rimangono le funzioni guidate locali.

Riferimenti: [Supabase Auth](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [verifica dell’utente](https://supabase.com/docs/reference/javascript/auth-getuser), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
