import { Card, DataTable, Loading, Note, SimpleTable } from "../components/ui";
import { day, getLang, pct, sourceDate, t } from "../i18n";
import type { AppData, BiTable, Method as MethodFile, Source } from "../lib/types";
import { useJson } from "../lib/util";

const stateKey = (s: string) => ({ aggiornata: "updated", parziale: "partial", ultimo_valido: "lastValid", non_aggiornata: "notUpdated", statica: "static" }[s] ?? "static");

/** Dettaglio dello stato di una fonte, composto dai dati strutturati. */
function detail(s: Source): string {
  const d = s.dettaglio, parts: string[] = [];
  if (d.messaggio) parts.push(d.messaggio);
  if (d.senzaRisposta?.length) parts.push(t("me.detail.noReply", { list: d.senzaRisposta.join(", "), x: pct(d.quotaVolume), d: day(d.finoAl) }));
  if (d.maiDisponibili?.length) parts.push(t("me.detail.never", { list: d.maiDisponibili.join(", ") }));
  if (d.trattenute?.length) parts.push(t("me.detail.held", { list: d.trattenute.join(", ") }));
  if (!parts.length) parts.push(t(`me.detail.${stateKey(s.stato)}`));
  return parts.join("; ");
}

export default function Method({ data }: { data: AppData }) {
  const { meta } = data;
  const { data: m, error } = useJson<MethodFile>("metodo.json");
  if (!m) return <Loading error={error} />;
  const lang = getLang();
  const table = (tb: BiTable, name: string) => (
    <DataTable csvName={name} rows={tb.righe} columns={tb.colonne.map((label, i) => ({ key: String(i), label, wrap: true, value: (r: string[]) => r[i].replace(/`/g, "") }))} />);
  const flagged = meta.fonti.filter((s) => s.stato === "ultimo_valido" || s.stato === "parziale");
  const coef = [1, 2, 3, 4, 5, 6, 7];
  return (
    <>
      <Card title={t("me.state")}>
        <p>{t("me.lastRun", { d: day(meta.aggiornamento.eseguitoIl ?? meta.generato_il), mode: t(`me.mode.${meta.aggiornamento.modalita ?? "online"}`) })}</p>
        {flagged.length > 0
          ? <ul className="plain" id="source-notice">{flagged.map((s) => <li key={s.id}><span className="state signal">{t(`source.${s.id}`)}: {t(`me.state.${stateKey(s.stato)}`)}</span>. {detail(s)}</li>)}</ul>
          : <p className="muted" id="source-notice">{t(meta.aggiornamento.modalita === "offline" ? "me.allOffline" : "me.allUpdated")}</p>}
        <DataTable csvName="source_status.csv" rows={meta.fonti} columns={[
          { key: "nome", label: t("col.source"), wrap: true, value: (r) => t(`source.${r.id}`) },
          { key: "dati_al", label: t("col.dataAsOf"), value: (r) => sourceDate(r.tipoData, r.datiAl) },
          { key: "stato", label: t("col.state"), value: (r) => t(`me.state.${stateKey(r.stato)}`), format: (r) => <span className={r.stato === "ultimo_valido" || r.stato === "parziale" ? "state signal" : ""}>{t(`me.state.${stateKey(r.stato)}`)}</span> },
          { key: "dettaglio", label: t("col.detail"), wrap: true, value: (r) => detail(r) },
        ]} />
        <h3>{t("me.byModule")}</h3>
        <SimpleTable numeric={[2]} head={[t("col.module"), t("col.outcome"), t("col.seconds"), t("col.message")]}
          rows={Object.entries(meta.aggiornamento.moduli).map(([k, v]) => [t(`module.${k}`), t(v.esito === "ok" ? "me.ok" : "me.failed"), v.secondi ?? "", v.messaggio ?? ""])} />
        <Note id="note.sources" />
        <Note id="note.fx" />
      </Card>
      <Card title={t("me.limits")}><ul className="plain">{m.limiti[lang].map((l, i) => <li key={i}>{l}</li>)}</ul></Card>
      <Card title={t("me.coef")}>
        <SimpleTable head={[t("col.coefficient"), t("col.value"), t("col.origin")]} rows={coef.map((i) => [t(`coef.${i}.name`), t(`coef.${i}.value`), t(`coef.${i}.origin`)])} />
        <Note id="note.coef" />
      </Card>
      <Card title={t("me.sources")}>{table(m.fonti[lang], "sources.csv")}</Card>
      <Card title={t("me.discarded")}>{table(m.metodiScartati[lang], "discarded_methods.csv")}</Card>
      <Card title={t("me.docs")}>
        <ul className="plain">
          <li><a href={`${m.repo}/blob/main/SPEC.md`}>SPEC.md</a>: {t("me.docs.spec")}</li>
          <li><a href={`${m.repo}/tree/main/reports`}>{t("me.docs.reports")}</a>: {t("me.docs.reports.text")}</li>
          <li><a href="./data/README.md">{t("me.docs.data")}</a> {t("me.docs.data.text", { n: meta.file.length })}</li>
          <li><a href={m.repo}>{t("me.docs.code")}</a>.</li>
        </ul>
      </Card>
    </>
  );
}
