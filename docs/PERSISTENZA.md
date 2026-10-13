# Persistenza senza servizi esterni

Dal 13 ottobre 2026 l’integrazione Supabase è stata rimossa dal codice eseguito dalle applicazioni. Non servono URL, chiavi, account o database esterni per i laboratori. Accesso online e archivio remoto non sono più disponibili.

Engine offre Salva sul dispositivo, Riprendi prova, Esporta prova e Apri file prova (JSON validato).

I dati locali dipendono da browser e origine del sito; cancellare i dati del browser li elimina. Esportare un file per trasferire un progetto o conservarne un backup. I vecchi link a progetti remoti mostrano un avviso, non aprono silenziosamente una demo.

La rimozione dal frontend non elimina account, progetti o allegati già presenti nel vecchio servizio remoto e non li migra automaticamente sul dispositivo. L’integrazione con il licensing CarraroLab resta da implementare.

Le migrazioni SQL e i relativi test sono conservati esclusivamente come storico del prototipo: non vengono eseguiti dalla build e non vanno applicati.
