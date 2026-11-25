import { Card, DataTable, Loading, Note } from "../components/ui";
import type { AppData, Method } from "../lib/types";
import { giorno, useJson } from "../lib/util";

const MODULI: Record<string, string> = { modulo1: "Livello ESM (circolazione)", modulo2: "Indice settimanale", modulo3: "Bilanci e classifica", modulo4: "Scenari", modulo5: "Credito e mappa a due canali", livello_proprio: "Stima propria del livello", test_modulo2: "Test predittivo" };

export function Metodo({ data }: { data: AppData }) {
  const { meta } = data;
  const { data: m, error } = useJson<Method>("metodo.json");
  if (!m) return <Loading error={error} />;
  const keys = (rows: Record<string, string>[]) => (rows[0] ? Object.keys(rows[0]) : []);
  const table = (rows: Record<string, string>[], name: string) => (
    <DataTable csvName={name} rows={rows} columns={keys(rows).map((k) => ({ key: k, label: k, value: (r: Record<string, string>) => r[k].replace(/`/g, ""), format: (r: Record<string, string>) => <span style={{ whiteSpace: "normal" }}>{r[k].replace(/`/g, "")}</span> }))} />);
  return (
    <>
      <Card title="Stato dell'aggiornamento">
        <p>Ultima esecuzione: {giorno(meta.aggiornamento.eseguitoIl ?? meta.generato_il)}{meta.aggiornamento.modalita ? `, ${meta.aggiornamento.modalita}` : ""}. L'aggiornamento automatico è previsto ogni lunedì.</p>
        {meta.avviso ? <Note>{meta.avviso}</Note> : <p className="muted">Tutte le fonti aggiornabili hanno risposto nell'ultima esecuzione con scarico dei dati.</p>}
        <DataTable csvName="stato_fonti.csv" rows={meta.fonti} columns={[
          { key: "nome", label: "Fonte", value: (r) => r.nome, format: (r) => <span style={{ whiteSpace: "normal" }}>{r.nome}</span> }, { key: "dati_al", label: "Dati al", value: (r) => r.dati_al },
          { key: "stato", label: "Stato", value: (r) => r.stato, format: (r) => <span className={r.stato === "ultimo dato valido" || r.stato === "aggiornata in parte" ? "state segnale" : ""}>{r.stato}</span> },
          { key: "dettaglio", label: "Dettaglio", value: (r) => r.dettaglio, format: (r) => <span style={{ whiteSpace: "normal" }}>{r.dettaglio}</span> },
        ]} />
        <h3>Esito per modulo</h3>
        <div className="table-wrap"><table>
          <thead><tr><th>Modulo</th><th>Esito</th><th className="num">Secondi</th><th>Messaggio</th></tr></thead>
          <tbody>{Object.entries(meta.aggiornamento.moduli).map(([k, v]) => <tr key={k}><td>{MODULI[k] ?? k}</td><td>{v.esito === "ok" ? "riuscito" : "fallito: dati precedenti"}</td><td className="num">{v.secondi ?? ""}</td><td style={{ whiteSpace: "normal" }}>{v.messaggio ?? ""}</td></tr>)}</tbody>
        </table></div>
        <Note>Se una fonte non risponde, il modulo corrispondente tiene l'ultimo dato valido e qui compare lo stato "ultimo dato valido". Se non risponde un singolo exchange che pesa meno del 2% dei volumi, la settimana esce senza e la fonte è marcata "aggiornata in parte"; sopra il 2% la settimana viene trattenuta.</Note>
      </Card>
      <Card title="Cosa il programma non promette"><ul className="plain">{m.limiti.map((l, i) => <li key={i}>{l}</li>)}</ul></Card>
      <Card title="Coefficienti del Working Paper BCE 3199">
        <DataTable csvName="coefficienti_wp3199.csv" rows={m.coefficienti} columns={[
          { key: "nome", label: "Coefficiente", value: (r) => r.nome, format: (r) => <span style={{ whiteSpace: "normal" }}>{r.nome}</span> },
          { key: "valore", label: "Valore", value: (r) => r.valore, format: (r) => <span style={{ whiteSpace: "normal" }}>{r.valore}</span> }, { key: "origine", label: "Origine", value: (r) => r.origine }]} />
        <Note>Stimati su singole banche; qui applicati ad aggregati nazionali. Verificati sull'originale, tabelle 1 e 3 comprese.</Note>
      </Card>
      <Card title="Fonti">{table(m.fontiDescrizione, "fonti.csv")}</Card>
      <Card title="Metodi scartati">{table(m.metodiScartati, "metodi_scartati.csv")}</Card>
      <Card title="Documentazione">
        <ul className="plain">
          <li><a href={`${m.repo}/blob/main/SPEC.md`}>SPEC.md</a>: obiettivo, moduli, criteri e registro delle decisioni.</li>
          <li><a href={`${m.repo}/tree/main/reports`}>Report</a>: un documento per ogni test e modulo, con limiti e cose non riuscite.</li>
          <li><a href="./data/README.md">Descrizione dei file di dati</a> letti da questa applicazione ({meta.file.length} file).</li>
          <li><a href={m.repo}>Codice sorgente</a>.</li>
        </ul>
      </Card>
    </>
  );
}
