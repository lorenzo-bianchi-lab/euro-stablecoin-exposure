# 10 - Cruscotto e test automatici

Il programma aveva risultati ma non un'interfaccia né una verifica automatica. Questo
documento descrive le due aggiunte previste da [SPEC.md](../SPEC.md).

## 1. Cruscotto

**Indirizzo**: https://sqsw5ryvdh-netizen.github.io/euro-stablecoin-exposure/

È una pagina HTML unica (`docs/index.html`), generata da `src/dashboard.py` e pubblicata
da GitHub Pages così com'è. Non ha un server e non carica nulla dall'esterno: dati e
calcoli sono dentro la pagina, che funziona anche aperta da file.

| Elemento | Cosa fa |
|---|---|
| Cursore sull'importo | Stablecoin in dollari detenute nell'area euro, da 0 a 700 miliardi di dollari |
| Livelli predefiniti | Minimo proprio; oggi con quota 7,5% e 15%; ESM base 2030, alto 2030, alto con quota 15% |
| Quota finanziata con depositi | Tasso di sostituzione, da 0 a 100% |
| Ripartizione tra paesi | R1 pro quota sui depositi a vista; R2 pro capite; R3 per possessori di cripto-attività |
| Dal deflusso al credito | A soglia, uniforme, coefficiente basso, coefficiente alto |
| Riquadri di sintesi | Depositi da sostituire, depositi a vista persi, raccolta all'ingrosso in più, credito in meno |
| Tabella per paese | Ordinabile; deflusso, depositi persi, effetto sulla raccolta, raccolta all'ingrosso, credito in meno |
| Mappa a due canali | I 21 paesi per depositi a vista e passività in dollari, con i quadranti e i valori dello scenario al passaggio del mouse |
| Indice settimanale | Quota EUR per USDT o USDC, con e senza Coinbase, e lo stato della segnalazione |

I calcoli nel browser usano le stesse formule dei moduli 4 e 5. Un test automatico
esegue il codice della pagina e lo confronta con i risultati degli script.

Scelte di costruzione:

- Nessuna libreria esterna: grafici disegnati in SVG dal codice della pagina.
- Colori verificati per leggibilità anche con daltonismo, in tema chiaro e scuro.
- Ogni grafico ha i valori al passaggio del mouse; la tabella dà gli stessi numeri in
  forma testuale.
- Le avvertenze del programma sono nella pagina, non in un documento a parte.

## 2. Test automatici

```bash
.venv/bin/python -m unittest discover -s tests -v
```

| Test | Cosa verifica |
|---|---|
| Quadratura dei bilanci | In tutte le osservazioni paese-mese le voci del passivo sommano al totale entro lo 0,5% |
| Copertura | L'ultimo mese contiene tutti i 21 paesi |
| Linearità degli scenari | Raddoppiando l'importo raddoppiano deflusso, effetto sulla raccolta e fabbisogno all'ingrosso, per ogni regola |
| Somma delle ripartizioni | Per ogni regola tra paesi e tra tipi di deposito, i deflussi per paese sommano all'importo |
| Coerenza dei file | Nei file degli scenari i totali per paese coincidono con l'importo dichiarato |
| Proprietà di R1 | Con la regola pro quota tutti i paesi perdono la stessa percentuale di depositi a vista |
| Credito | Coefficiente basso mai sopra quello alto; regola uniforme pari a metà del deflusso; linearità |
| Cruscotto | Il codice della pagina, eseguito fuori dal browser, riproduce deflusso, fabbisogno all'ingrosso e credito degli script |
| Riproducibilità senza rete | Rieseguire tutto il programma in una copia, senza rete, produce file di risultato identici |

**Esito del 2026-11-25**: 9 test su 9 superati, in circa 7 secondi, dopo un'esecuzione
completa di `run_all.py` con scarico dalle fonti. La regola R3 è inclusa nei test di
linearità, di somma e del cruscotto.

Il test di riproducibilità ha trovato un difetto alla prima esecuzione: il modulo 1
arrotondava la circolazione solo al momento di salvarla, quindi i risultati calcolati
con e senza rete differivano alla sesta cifra decimale. Ora arrotonda prima di calcolare.

## 3. Aggiornamento

Il comando unico rigenera anche sintesi e cruscotto:

```bash
.venv/bin/python src/run_all.py
```

GitHub Pages ripubblica la pagina a ogni push di `docs/index.html`.

## 4. Limiti

- Il cruscotto mostra una fotografia: i dati sono quelli dell'ultima esecuzione di
  `run_all.py`, non si aggiornano da soli.
- I test verificano la coerenza interna del programma, non la correttezza delle fonti
  né la validità delle ipotesi.
- Il test del cruscotto richiede `node`; se manca viene saltato e lo dichiara.
- Il test di riproducibilità copre i file di risultato principali, non i grafici.

---

**Cosa aggiunge questo al programma finale**: un'interfaccia che un analista può usare
senza installare nulla, con cui provare qualsiasi importo, regola e tasso di
sostituzione; e una rete di test che dimostra che i numeri della pagina sono gli stessi
degli script e che il programma è riproducibile.
