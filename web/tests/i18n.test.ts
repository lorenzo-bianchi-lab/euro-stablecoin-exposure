// No untranslated string: the two translation sets have the same keys, every key used by the
// code or required by the data exists in both languages, and no hand-written text is left in
// the components.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const here = new URL(".", import.meta.url).pathname;
const read = (p: string) => JSON.parse(readFileSync(join(here, p), "utf-8"));
// the texts are in one file per section (src/i18n/en/*.json, it/*.json); common.json holds the shared ones
const parts = (lang: string) =>
  Object.fromEntries(
    readdirSync(join(here, `../src/i18n/${lang}`))
      .filter((f) => f.endsWith(".json"))
      .map((f) => [f, read(`../src/i18n/${lang}/${f}`) as Record<string, string>]),
  );
const enParts = parts("en"),
  itParts = parts("it");
const merge = (p: Record<string, Record<string, string>>) => Object.assign({}, ...Object.values(p)) as Record<string, string>;
const en = merge(enParts),
  it_ = merge(itParts);
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []));
const sources = files(join(here, "../src")).map((f) => ({ f: f.split("/src/")[1], s: readFileSync(f, "utf-8") }));
const placeholders = (s: string) =>
  [...s.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join(",");

describe("translation files", () => {
  it("English and Italian have the same keys, with no empty texts", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(it_).sort());
    for (const d of [en, it_]) for (const [k, v] of Object.entries(d)) expect(v.trim().length, k).toBeGreaterThan(0);
  });
  it("each section file has the same keys in both languages, and no key is in two files", () => {
    expect(Object.keys(enParts).sort()).toEqual(Object.keys(itParts).sort());
    for (const f of Object.keys(enParts)) expect(Object.keys(itParts[f]).sort(), f).toEqual(Object.keys(enParts[f]).sort());
    const all = Object.values(enParts).flatMap((p) => Object.keys(p));
    expect(all.filter((k, i) => all.indexOf(k) !== i)).toEqual([]);
    const aggregated = (lang: string) => readFileSync(join(here, `../src/i18n/${lang}.ts`), "utf-8");
    for (const f of Object.keys(enParts))
      for (const lang of ["en", "it"]) expect(aggregated(lang), `${lang}.ts does not import ${f}`).toContain(`"./${lang}/${f}"`);
  });
  it("the placeholders match in both languages", () => {
    for (const k of Object.keys(en)) expect(placeholders(it_[k] ?? ""), k).toBe(placeholders(en[k]));
  });
  it("the two languages have no identical texts where they should differ", () => {
    const same = Object.keys(en).filter((k) => en[k] === it_[k] && /[a-z]{4,} [a-z]{4,}/i.test(en[k]));
    expect(
      same.filter(
        (k) => !/^(source\.esm_wp79|ov\.dates\.fx\.value|app\.|nav\.about|home\.item|about\.lic\.|about\.university$|about\.authors\.names$)/.test(k),
      ),
    ).toEqual([]);
  });
});

describe("keys used by the code", () => {
  const used = new Set<string>(),
    dynamic = new Set<string>();
  for (const { s } of sources) {
    for (const m of s.matchAll(/\bt\(\s*"([^"]+)"/g)) used.add(m[1]);
    for (const m of s.matchAll(/\bt\([^"`)]*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/g)) {
      used.add(m[1]);
      used.add(m[2]);
    }
    for (const m of s.matchAll(/\bt\(\s*`([^`]+)`/g)) dynamic.add(m[1]);
    for (const m of s.matchAll(/<Note\s+id="([^"]+)"/g)) {
      used.add(`${m[1]}.s`);
      used.add(`${m[1]}.d`);
    }
    for (const m of s.matchAll(/<Note\s+id=\{[^}]*\?\s*"([^"]+)"\s*:\s*"([^"]+)"\}/g))
      for (const id of [m[1], m[2]]) {
        used.add(`${id}.s`);
        used.add(`${id}.d`);
      }
    for (const m of s.matchAll(
      /"((?:side\.src|me\.all|lv\.kpi\.chosen|rep\.title|rep\.mode|bk\.sheet\.\w+|cs\.kpi\.owners|cs\.retail|side\.theme|me)\.[\w.]+)"/g,
    ))
      used.add(m[1]);
  }
  it("every fixed key exists in both languages", () => {
    expect(used.size).toBeGreaterThan(300);
    expect([...used].filter((k) => !(k in en) || !(k in it_))).toEqual([]);
  });
  it("every family of composed keys has at least one entry", () => {
    for (const tpl of dynamic) {
      if (tpl.startsWith("${")) continue; // key passed whole, for example by the Note component
      const re = new RegExp(
        "^" +
          tpl
            .split(/\$\{[^}]*\}/)
            .map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join("[^.]+") +
          "$",
      );
      expect(
        Object.keys(en).some((k) => re.test(k)),
        tpl,
      ).toBe(true);
    }
  });
  it("no key is left unused", () => {
    const prefixes = [...dynamic].filter((x) => !x.startsWith("${")).map((x) => x.split("${")[0]);
    const unused = Object.keys(en).filter((k) => !used.has(k) && !prefixes.some((p) => k.startsWith(p)) && !/^fmt\.bn(Eur|Usd)$/.test(k));
    expect(unused).toEqual([]);
  });
});

describe("keys required by the data", () => {
  const sim = read("../public/data/simulator.json"),
    meta = read("../public/data/meta.json"),
    mon = read("../public/data/monitor.json"),
    ch = read("../public/data/channels.json");
  const need: string[] = [
    ...sim.paesi.map((c: { code: string }) => `country.${c.code}`),
    ...sim.predefiniti.map((p: { id: string }) => `preset.${p.id}`),
    ...sim.paesi.map((c: { fonteUsd: string }) => `usdSource.${c.fonteUsd}`),
    ...meta.fonti.map((s: { id: string }) => `source.${s.id}`),
    ...meta.fonti.filter((s: { tipoData: string }) => s.tipoData === "testo").map((s: { datiAl: string }) => `period.${s.datiAl}`),
    ...Object.keys(meta.aggiornamento.moduli).map((k) => `module.${k}`),
    ...mon.serie.flatMap((s: string) => [`series.${s}`, `series.${s}.short`]),
    ...ch.quadranti.flatMap((q: string) => [`quad.${q}.title`, `quad.${q}.channel`, `quad.${q}.text`]),
    ...["updated", "partial", "lastValid", "notUpdated", "static"].flatMap((k) => [`me.state.${k}`, `me.detail.${k}`]),
    ...["signal", "check", "none", "short", "na"].map((k) => `flag.${k}`),
  ];
  it("countries, sources, modules, preset scenarios, series and quadrants have a text in both languages", () => {
    expect([...new Set(need)].filter((k) => !(k in en) || !(k in it_))).toEqual([]);
  });
  it("the states used in the data are among those expected", () => {
    const states = new Set<string>(meta.fonti.map((s: { stato: string }) => s.stato));
    for (const s of states) expect(["aggiornata", "parziale", "ultimo_valido", "non_aggiornata", "statica"]).toContain(s);
    const flags = new Set<string>(Object.values(mon.segnalazioni).flatMap((f) => (f as { stato: string[] }).stato));
    for (const s of flags) expect(["segnale", "da verificare", "nessuno", "storico insufficiente"]).toContain(s);
  });
  it("the texts taken from SPEC.md are exported in both languages, with the same number of entries", () => {
    const m = read("../public/data/method.json");
    for (const k of ["fonti", "metodiScartati"]) {
      expect(m[k].en.righe.length).toBe(m[k].it.righe.length);
      expect(m[k].en.righe.flat().filter((c: string, i: number) => c === m[k].it.righe.flat()[i] && /[àèéìòù]| (di|del|della|per|con) /.test(c))).toEqual([]);
    }
    expect(m.limiti.en.length).toBe(m.limiti.it.length);
    expect(m.limiti.en.filter((x: string, i: number) => x === m.limiti.it[i])).toEqual([]);
  });
});

describe("no hand-written text in the components", () => {
  const ALLOWED = new Set(["A", "B", "R", "SPEC.md", "LEI"]);
  it("JSX text nodes contain only abbreviations", () => {
    const found: string[] = [];
    for (const { f, s } of sources.filter((x) => x.f.endsWith(".tsx"))) {
      for (const m of s.matchAll(/(?<!=)>\s*([A-Za-zÀ-ÿ][^<>{}`"=;()]*?)\s*(?=<|\{)/g)) {
        const text = m[1].replace(/[:.,·]+$/, "").trim();
        if (text.length > 1 && !ALLOWED.has(text) && /[A-Za-zÀ-ÿ]{2,}/.test(text)) found.push(`${f}: ${text}`);
      }
    }
    expect(found).toEqual([]);
  });
  it("titles, labels and units are not fixed strings", () => {
    const found: string[] = [];
    for (const { f, s } of sources.filter((x) => x.f.endsWith(".tsx")))
      for (const m of s.matchAll(/\b(title|label|unit|source|placeholder|aria-label|alt)="([^"]*[A-Za-zÀ-ÿ]{3,}[^"]*)"/g))
        found.push(`${f}: ${m[1]}="${m[2]}"`);
    expect(found).toEqual([]);
  });
});
