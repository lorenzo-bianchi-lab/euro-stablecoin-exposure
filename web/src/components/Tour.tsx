import { useEffect } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { t } from "../i18n";

/** The five stops of the guided tour, in order: they also serve as an outline for a demonstration. */
export const TOUR = ["home", "simulator", "map", "banks", "monitor"];

/**
 * Guided tour. The step is kept in the address (tour=1..5), so the tour can be resumed and shared.
 * It appears only on the section of the step; it can be skipped at any time, also with Esc.
 */
export function Tour({
  step,
  section,
  href,
}: {
  step: number;
  section: string;
  href: (path: string, extra?: Record<string, string | number | null>) => string;
}) {
  const active = step >= 1 && step <= TOUR.length && TOUR[step - 1] === section;
  useEffect(() => {
    if (!active) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.location.hash = href(section, { tour: null });
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [active, section, href]);
  if (!active) return null;
  const last = step === TOUR.length;
  return (
    <aside className="tour" role="dialog" aria-label={t("tour.title")} aria-live="polite" data-step={step}>
      <div className="tour-head">
        <span className="eyebrow" style={{ margin: 0 }}>
          {t("tour.step", { n: step, tot: TOUR.length })}
        </span>
        <a className="btn small icon-only" id="tour-skip" href={href(section, { tour: null })} aria-label={t("tour.skip")} title={t("tour.skip")}>
          <X className="icon" aria-hidden="true" />
        </a>
      </div>
      <h2>{t(`tour.${step}.title`)}</h2>
      <p>{t(`tour.${step}.text`)}</p>
      <p className="muted">
        <strong>{t("tour.try")}:</strong> {t(`tour.${step}.try`)}
      </p>
      <div className="row">
        <span className="tour-dots" aria-hidden="true">
          {TOUR.map((_, i) => (
            <span key={i} className={i < step ? "on" : ""} />
          ))}
        </span>
        <span className="row" style={{ margin: 0, gap: "var(--space-2)" }}>
          {step > 1 && (
            <a className="btn small" id="tour-back" href={href(TOUR[step - 2], { tour: step - 1 })}>
              <ArrowLeft className="icon" aria-hidden="true" />
              {t("tour.back")}
            </a>
          )}
          <a className="btn small primary" id="tour-next" href={last ? href(section, { tour: null }) : href(TOUR[step], { tour: step + 1 })}>
            {t(last ? "tour.finish" : "tour.next")}
            {!last && <ArrowRight className="icon" aria-hidden="true" />}
          </a>
        </span>
      </div>
    </aside>
  );
}
