import { ArrowDown } from "lucide-react";
import { Card, DataTable, Hero, Kpi, Loading, Note, SimpleTable } from "../components/ui";
import { day, getLang, nf, pct, sourceDate, t } from "../i18n";
import type { AppData, BiTable, Method as MethodFile, Source } from "../lib/types";
import { useJson } from "../lib/util";

const stateKey = (s: string) =>
  ({ aggiornata: "updated", parziale: "partial", ultimo_valido: "lastValid", non_aggiornata: "notUpdated", statica: "static" })[s] ?? "static";
const isFlagged = (s: string) => s === "ultimo_valido" || s === "parziale";
/** Class of the status badge: blue for updated sources, copper for those to notice, neutral for the rest. */
const badgeClass = (s: string) => (isFlagged(s) ? "badge accent" : s === "aggiornata" ? "badge primary" : "badge");

/** Detail of the status of a source, composed from the structured data. */
function detail(s: Source): string {
  const d = s.dettaglio,
    parts: string[] = [];
  if (d.messaggio) parts.push(d.messaggio);
  if (d.senzaRisposta?.length) parts.push(t("me.detail.noReply", { list: d.senzaRisposta.join(", "), x: pct(d.quotaVolume), d: day(d.finoAl) }));
  if (d.maiDisponibili?.length) parts.push(t("me.detail.never", { list: d.maiDisponibili.join(", ") }));
  if (d.trattenute?.length) parts.push(t("me.detail.held", { list: d.trattenute.join(", ") }));
  if (!parts.length) parts.push(t(`me.detail.${stateKey(s.stato)}`));
  return parts.join("; ");
}

// parts of the page reachable from the table of contents: [card id, title key]
const PARTS: [string, string][] = [
  ["me-state", "me.state"],
  ["me-modules", "me.byModule"],
  ["me-limits", "me.limits"],
  ["me-coef", "me.coef"],
  ["me-sources", "me.sources"],
  ["me-discarded", "me.discarded"],
  ["me-docs", "me.docs"],
];

export default function Method({ data }: { data: AppData }) {
  const { meta } = data;
  const { data: m, error } = useJson<MethodFile>("method.json");
  if (!m) return <Loading error={error} />;
  const lang = getLang();
  const table = (tb: BiTable, name: string, pageSize: number) => (
    <DataTable
      csvName={name}
      pageSize={pageSize}
      rows={tb.righe}
      columns={tb.colonne.map((label, i) => ({ key: String(i), label, wrap: true, value: (r: string[]) => r[i].replace(/`/g, "") }))}
    />
  );
  const run = meta.aggiornamento,
    offline = run.modalita === "offline";
  const flagged = meta.fonti.filter((s) => isFlagged(s.stato));
  const updatable = meta.fonti.filter((s) => s.stato !== "statica").length;
  const updated = meta.fonti.filter((s) => s.stato === "aggiornata").length;
  const statics = meta.fonti.length - updatable;
  const modules = Object.entries(run.moduli),
    okModules = modules.filter(([, v]) => v.esito === "ok").length;
  const withMessage = modules.some(([, v]) => v.messaggio);
  const heroKey = offline ? "me.hero.offline" : flagged.length ? "me.hero.flagged" : "me.hero.ok";
  const vars = { u: nf(updated, 0), n: nf(updatable, 0), s: nf(statics, 0), f: nf(flagged.length, 0) };
  const coef = [1, 2, 3, 4, 5, 6, 7];
  return (
    <>
      <Hero
        label={t("me.hero.label")}
        value={day(run.eseguitoIl ?? meta.generato_il)}
        range={t("me.hero.range", { mode: t(`me.mode.${run.modalita ?? "online"}`) })}
        text={t(heroKey, vars)}
      >
        <div className="kpis" style={{ marginBottom: 0 }}>
          <Kpi label={t("me.kpi.updated")} value={t("me.kpi.of", { a: vars.u, b: vars.n })} sub={t("me.kpi.updated.sub", { s: vars.s })} />
          <Kpi label={t("me.kpi.flagged")} value={vars.f} sub={t("me.kpi.flagged.sub")} />
          <Kpi label={t("me.kpi.modules")} value={t("me.kpi.of", { a: nf(okModules, 0), b: nf(modules.length, 0) })} sub={t("me.kpi.modules.sub")} />
        </div>
      </Hero>

      <nav aria-label={t("me.toc")} className="no-print" style={{ marginBottom: "var(--space-5)" }}>
        <div className="row" style={{ gap: "var(--space-2)" }}>
          <span className="muted tiny">{t("me.toc")}</span>
          {PARTS.map(([id, key]) => (
            <button key={id} className="btn small" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              <ArrowDown className="icon" aria-hidden="true" />
              {t(key)}
            </button>
          ))}
        </div>
      </nav>

      <Card id="me-state" title={t("me.state")}>
        {flagged.length > 0 ? (
          <ul className="plain flagged" id="source-notice" style={{ marginTop: 0, maxWidth: "80ch" }}>
            {flagged.map((s) => (
              <li key={s.id}>
                <span className="state signal">
                  {t(`source.${s.id}`)}: {t(`me.state.${stateKey(s.stato)}`)}
                </span>
                . {detail(s)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted" id="source-notice">
            {t(offline ? "me.allOffline" : "me.allUpdated")}
          </p>
        )}
        <DataTable
          csvName="source_status.csv"
          rows={meta.fonti}
          compact
          columns={[
            { key: "nome", label: t("col.source"), wrap: true, value: (r) => t(`source.${r.id}`) },
            {
              key: "stato",
              label: t("col.state"),
              value: (r) => t(`me.state.${stateKey(r.stato)}`),
              format: (r) => <span className={badgeClass(r.stato)}>{t(`me.state.${stateKey(r.stato)}`)}</span>,
            },
            { key: "dati_al", label: t("col.dataAsOf"), value: (r) => sourceDate(r.tipoData, r.datiAl) },
            { key: "dettaglio", label: t("col.detail"), wrap: true, value: (r) => detail(r) },
          ]}
        />
        <Note id="note.sources" />
        <Note id="note.fx" />
      </Card>

      <Card id="me-modules" title={t("me.byModule")}>
        <SimpleTable
          compact
          numeric={[2]}
          head={[t("col.module"), t("col.outcome"), t("col.seconds"), ...(withMessage ? [t("col.message")] : [])]}
          rows={modules.map(([k, v]) => [
            t(`module.${k}`),
            <span className={v.esito === "ok" ? "badge primary" : "badge accent"}>{t(v.esito === "ok" ? "me.ok" : "me.failed")}</span>,
            v.secondi == null ? t("fmt.na") : nf(v.secondi, 1),
            ...(withMessage ? [v.messaggio ?? ""] : []),
          ])}
        />
      </Card>

      <Card id="me-limits" title={t("me.limits")}>
        <ol className="stack" style={{ maxWidth: "80ch", margin: 0, paddingLeft: "var(--space-5)" }}>
          {m.limiti[lang].map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
      </Card>

      <Card id="me-coef" title={t("me.coef")}>
        <SimpleTable
          head={[t("col.coefficient"), t("col.value"), t("col.origin")]}
          rows={coef.map((i) => [t(`coef.${i}.name`), t(`coef.${i}.value`), t(`coef.${i}.origin`)])}
        />
        <Note id="note.coef" />
      </Card>

      <Card id="me-sources" title={t("me.sources")}>
        {table(m.fonti[lang], "sources.csv", 10)}
      </Card>
      <Card id="me-discarded" title={t("me.discarded")}>
        {table(m.metodiScartati[lang], "discarded_methods.csv", 6)}
      </Card>

      <Card id="me-docs" title={t("me.docs")}>
        <ul className="plain" style={{ marginTop: 0, maxWidth: "80ch" }}>
          <li>
            <a href={`${m.repo}/blob/main/SPEC.md`}>SPEC.md</a>: {t("me.docs.spec")}
          </li>
          <li>
            <a href={`${m.repo}/tree/main/reports`}>{t("me.docs.reports")}</a>: {t("me.docs.reports.text")}
          </li>
          <li>
            <a href="./data/README.md">{t("me.docs.data")}</a> {t("me.docs.data.text", { n: meta.file.length })}
          </li>
          <li>
            <a href={m.repo}>{t("me.docs.code")}</a>.
          </li>
          <li>
            <a id="method-note" href="./methodological-note.pdf">
              {t("me.docs.note")}
            </a>
            : {t("me.docs.note.text")}
          </li>
        </ul>
      </Card>
    </>
  );
}
