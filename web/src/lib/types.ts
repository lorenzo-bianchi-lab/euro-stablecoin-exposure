import type { Coefficients, Country, Level, LevelBand } from "./model";

export interface Preset { id: string; nome: string; eur: number }
export interface SimData {
  dati_al: Record<string, string>; cambioUsdPerEur: number; dataCambio: string; meseBilanci: string;
  paesi: Country[]; predefiniti: Preset[]; coefficienti: Coefficients; sogliaRetail: number;
  ancoraggi: { ancoraggio_basso: number; ancoraggio_alto: number };
  livello: Level; incertezza: { sostituzioneMinima: number; sostituzioneMassima: number };
  r3Fonte: string; mediane: { c1: number; usd: number };
}
export interface Source { id: string; nome: string; modulo: string; dati_al: string; stato: string; dettaglio: string }
export interface Meta {
  generato_il: string;
  aggiornamento: { eseguitoIl: string | null; modalita: string | null; moduli: Record<string, { esito: string; secondi?: number; messaggio?: string }> };
  fonti: Source[]; fontiNonAggiornate: string[]; fontiParziali?: string[]; avviso: string; file: string[]; mappaDisponibile: boolean;
}
export interface FlagState { stato?: string; scarto_quota?: number; scarto_volume?: number; quota_eur?: number; volume_eur_mld?: number; valore: number; variazione: number }
export interface Overview {
  dati_al: { bilanci: string; settimana: string; circolazione: string };
  livello: Level & { esmBase: number; esmAlto: number };
  scenarioCentrale: { deflusso: number; depositiAVistaPersi: number; aumentoIngrosso: number; creditoUniforme: number; creditoBasso: number; creditoAlto: number; creditoPct: number };
  indice: Record<string, FlagState>;
  classifica: { code: string; nome: string; posizione: number; c1: number }[];
  depositiAVistaArea: number; prestitiArea: number; testPredittivo: string;
}
export interface CountryFile {
  code: string; nome: string;
  composizione: { mesi: string[]; totale: number[]; voci: Record<string, number[]> };
  indicatore: { mesi: string[]; valore: number[]; posizione: number[]; paesi: number[]; c1: number[]; c2: number[]; c3: number[] };
}
export interface Channels {
  mediane: { c1: number; usd: number }; correlazioneDiRango: number;
  confrontoFonti: { paesi_con_entrambe: number; paesi_con_bsi_completo: number; rapporto_mediano_bsi_su_bri: number; correlazione_di_rango: number };
  cambianoConRiscalatura: string[]; quadranti: { id: string; titolo: string; canale: string; implicazione: string }[]; avvertenza: string;
  dati_al: { bilanci: string; dollari: string };
}
export interface WeeklySeries { settimane: string[]; [k: string]: number[] | string[] }
export interface FlagSeries { settimane: string[]; quota: number[]; volumeEur: number[]; scartoQuota: (number | null)[]; scartoVolume: (number | null)[]; stato: string[] }
export interface Monitor {
  dati_al: { ultimaSettimana: string }; serie: string[]; principale: WeeklySeries; lungo: WeeklySeries;
  segnalazioni: Record<string, FlagSeries>; statistiche: Record<string, Record<string, number | string>>; regola: string;
  settimaneTrattenute: Record<string, { exchange_mancanti: string[]; quota_di_volume_mancante: number }>;
  fontiMancanti?: { exchange: string[]; coppie: string[]; maiDisponibili: string[]; quotaVolume: number; datiFinoAl: string | null } | null;
  testPredittivo: { risposta: string; pValue: number; osservazioni: number; rapportoRmse: number }; avvertenza: string;
}
export interface LevelFile {
  dati_al: { indagine: string; circolazione: string };
  fasce: (LevelBand & { fascia: string })[]; quotaDetentori: number; quotaDollari: { minimo: number; centrale: number; massimo: number };
  unita: { famiglie: number; individui: number };
  riferimento: { minimo_mld_eur: number; centrale_mld_eur: number; massimo_mld_eur: number; estremo_superiore_dichiarato_mld_eur: number; decisione: string };
  esm: { data: string; baseEur: number; altoEur: number; serie: { mesi: string[]; base: number[]; alto: number[] } };
  altreStrade: { b2: { esito: string; motivo: string | null; saldiClientiMldUsd: number | null }; b3: { centrale: number | null; ipotesi: string | null } };
  criterio: { esito: string; nota: string }; avvertenza: string;
}
export interface Method {
  fontiDescrizione: Record<string, string>[]; limiti: string[]; metodiScartati: Record<string, string>[];
  coefficienti: { nome: string; valore: string; origine: string }[]; repo: string;
}
export interface AppData { sim: SimData; meta: Meta; overview: Overview }
