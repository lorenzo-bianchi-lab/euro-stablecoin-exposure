import { Card, SimpleTable } from "../components/ui";
import { t } from "../i18n";
import type { AppData } from "../lib/types";
import { REPO, useRoute } from "../lib/util";

const SOURCES = ["ecb", "eba", "eurostat", "bis", "esm", "market"];
// nomi propri delle licenze: non si traducono
const LICENCES: [string, string][] = [["fonts", "SIL Open Font License 1.1"], ["icons", "ISC"], ["charts", "Apache License 2.0"], ["ui", "MIT; Apache License 2.0 (TypeScript)"]];

export default function About(_: { data: AppData }) {
  const route = useRoute();
  return (
    <>
      <Card title={t("about.purpose")}>
        <p>{t("about.purpose.1")}</p>
        <p>{t("about.purpose.2")}</p>
        <p className="muted">{t("about.independent")}</p>
      </Card>
      <Card title={t("about.authors")}>
        <p className="muted tiny">{t("about.authors.text")}</p>
        <dl className="facts" id="authors">
          {[1, 2, 3].map((i) => <div key={i} style={{ display: "contents" }}><dt>{t("about.author.name")}</dt><dd>{t("about.author.role")}</dd></div>)}
          <dt>{t("about.author.supervisor")}</dt><dd>{t("about.author.role")}</dd>
        </dl>
        <p className="muted tiny" style={{ marginTop: "var(--space-4)", marginBottom: 0 }}>{t("about.contact")}</p>
      </Card>
      <Card title={t("about.sources")}>
        <p>{t("about.sources.text")} <a href={route.href("method")}>{t("nav.method")}</a></p>
        <SimpleTable head={[t("about.col.source"), t("about.col.use"), t("about.col.terms")]} rows={SOURCES.map((k) => [t(`about.src.${k}`), t(`about.src.${k}.use`), t(`about.src.${k}.terms`)])} />
      </Card>
      <Card title={t("about.licences")}>
        <p>{t("about.licences.text")}</p>
        <SimpleTable head={[t("about.col.component"), t("about.col.licence")]} rows={[...LICENCES.map(([k, l]) => [t(`about.lic.${k}`), l]), [t("about.lic.code"), t("about.lic.code.text")]]} />
      </Card>
      <Card title={t("about.repo")}>
        <p>{t("about.repo.text")}</p>
        <p style={{ marginBottom: 0 }}><a href={REPO}>{REPO.replace("https://", "")}</a></p>
      </Card>
    </>
  );
}
