# 14 - Chiusura e versione 1.0

Data: 2026-11-26 (prompt 8). Nessun calcolo è cambiato. Criteri in `SPEC.md`,
committati prima del lavoro (commit `f3e870e`).

- Applicazione: https://sqsw5ryvdh-netizen.github.io/euro-stablecoin-exposure/
- README (in inglese): https://github.com/sqsw5ryvdh-netizen/euro-stablecoin-exposure#readme
- Nota metodologica: https://sqsw5ryvdh-netizen.github.io/euro-stablecoin-exposure/methodological-note.pdf

## 1. Correzioni

| # | Punto | Stato | Come |
|---|---|---|---|
| 1 | L'indirizzo senza sezione apre la pagina iniziale | Fatto | Prima apriva la panoramica. Verificato dal test |
| 2 | Primo disegno dei grafici completo | Fatto | Il primo disegno non ha più animazione d'ingresso e viene dipinto subito, senza aspettare il fotogramma successivo. Le transizioni restano solo sugli aggiornamenti, a scheda visibile; se la scheda va in secondo piano o si stampa a metà di una transizione, il grafico viene portato allo stato finale |
| 3 | Mappa con il paese dal valore più alto già selezionato | Fatto | La selezione iniziale non scrive nulla nell'indirizzo; "Deseleziona" resta possibile |
| 4 | Avvertenze sotto grafici e tabelle, in stile neutro | Fatto | 33 avvertenze: 13 sotto un grafico, 15 sotto una tabella, 4 sotto il risultato in evidenza a cui si riferiscono, 1 sotto un elenco. Grigie; gialla resta solo la segnalazione attiva (indice, fonti, coppie mancanti) |
| 5 | About: autori, corso, università | Fatto | Autori "[NOMI DA INSERIRE]" (in inglese "[NAMES TO BE INSERTED]"), corso di economia e finanza, ESCP Business School |

Sul punto 2 ho verificato che il difetto esistesse: nella versione precedente, con la
scheda in secondo piano, dopo tre secondi i grafici avevano solo assi ed etichette (per
esempio 68 campioni di pixel dipinti nel grafico della panoramica, contro 1.491 ora).

Sul punto 4: nella scheda della singola banca è stata tolta una ripetizione
dell'avvertenza sulle esposizioni verso gli Stati Uniti aggiunta nel prompt 7; la stessa
avvertenza resta sotto la tabella delle banche. Le avvertenze del prompt 6 ci sono tutte.

## 2. Completamento

| # | Punto | Stato | Come |
|---|---|---|---|
| 6 | Visita guidata | Fatta | Cinque passi: pagina iniziale, simulatore, mappa, banche, monitor. Si avvia dalla pagina iniziale, si salta con il pulsante, con Esc o usando il menu. Il passo sta nell'indirizzo (`tour=1..5`). Ogni passo dice cosa guardare e cosa provare: è anche la traccia della demo, riportata nel README |
| 7 | README in inglese e nota metodologica | Fatti | README: cosa fa, come si apre, come si avvia in locale, come si aggiorna, test, struttura, limiti. Nota: PDF di due pagine in inglese con fonti, formule e limiti, generato da `npm run note` con i numeri dei dati correnti e collegato da "Method and data" |
| 8 | Clone pulito | Riuscito, senza correzioni | Repository clonato da GitHub in una cartella vuota e comandi del README eseguiti nell'ordine: ambiente Python e dipendenze, `npm ci`, aggiornamento dei dati dalle fonti, 22 test Python, 42 test dell'applicazione, nota, compilazione, test nel browser. Tutto riuscito al primo tentativo. Verificati anche i due modi di aprirla in locale (`npm run dev` e server statico su `docs/`) |
| 9 | Aggiornamento pianificato | Non verificabile oggi | Il workflow esiste da mercoledì 25 novembre: nessuna esecuzione con evento `schedule` è ancora partita. Il primo lunedì utile è il 30 novembre 2026, alle 06:00 UTC. Come controllarlo è scritto nel README ("How to check that the scheduled run started by itself") |
| 10 | Versione 1.0 | Fatta | Etichetta `v1.0` e rilascio su GitHub con le note di `RELEASE_NOTES.md` e la nota metodologica allegata |

## 3. Verifiche

| Controllo | Esito |
|---|---|
| Test Python | 22 su 22, invariati |
| Calcoli, traduzioni, contrasto (`npm test`) | 42 su 42 |
| Browser, 13 pagine nelle due lingue e nei due temi | Tutti i controlli superati, compresi quelli del prompt 7 |
| Grafici completi dopo tre secondi (nuovo) | In ogni pagina i punti disegnati coincidono con i punti dei dati, a scheda visibile e in secondo piano: 4.022 punti in 19 grafici |
| Indirizzo senza sezione, selezione sulla mappa, posizione e colore delle avvertenze, About, visita guidata nelle due lingue, nota di due pagine (nuovi) | Superati |

Il test "in secondo piano" apre la pagina con il documento dichiarato nascosto e senza
fotogrammi di animazione: è la stessa condizione di una stampa o di una cattura in cui
l'animazione non parte.

## 4. Cosa non è riuscito, e limiti

- **Aggiornamento pianificato**: da controllare lunedì 30 novembre, come sopra.
- **Autori e licenza del codice**: restano da inserire.
- **Screenshot**: quelli in `reports/figures/app/after` sono del prompt 7; non li ho
  rigenerati, per non aggiungere altri 12 MB al repository. Le avvertenze vi compaiono
  ancora gialle e nella posizione precedente.
- **Anteprima della nota**: l'ho controllata come immagine della pagina, non aprendo il
  PDF, perché su questo computer manca lo strumento per convertirlo; il numero di pagine
  è contato dal file.

---

**Cosa aggiunge questo al programma finale**: lo chiude. Un nuovo utente ha una visita
guidata, un README e una nota di due pagine; i grafici non restano mai a metà; e la
versione 1.0 è stata rifatta da zero seguendo solo le istruzioni scritte.
