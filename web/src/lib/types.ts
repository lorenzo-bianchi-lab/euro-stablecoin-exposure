import type { Bank, Coefficients, Country, Level, LevelBand } from "./model";

export interface Preset { id: string; eur: number }
export interface SimData {
  dati_al: Record<string, string>; cambioUsdPerEur: number; dataCambio: string; meseBilanci: string;
  paesi: Country[]; predefiniti: Preset[]; coefficienti: Coefficients; sogliaRetail: number;
  ancoraggi: { ancoraggio_basso: number; ancoraggio_alto: number };
  livello: Level; incertezza: { sostituzioneMinima: number; sostituzioneMassima: number };
  mediane: { c1: number; usd: number };
}
export interface SourceDetail { messaggio?: string; exchange?: number; senzaRisposta?: string[]; quotaVolume?: number; finoAl?: string; maiDisponibili?: string[]; trattenute?: string[] }
export interface Source { id: string; modulo: string; tipoData: string; datiAl: string; stato: string; dettaglio: SourceDetail }
export interface Meta {
  generato_il: string;
  aggiornamento: { eseguitoIl: string | null; modalita: string | null; moduli: Record<string, { esito: string; secondi?: number; messaggio?: string }> };
  fonti: Source[]; fontiNonAggiornate: string[]; fontiParziali: string[]; file: string[]; mappaDisponibile: boolean;
}
export interface FlagState { stato?: string; scarto_quota?: number; scarto_volume?: number; quota_eur?: number; volume_eur_mld?: number; valore: number; variazione: number }
export interface Overview {
  dati_al: { bilanci: string; settimana: string; circolazione: string };
  livello: Level & { esmBase: number; esmAlto: number };
  scenarioCentrale: { deflusso: number; depositiAVistaPersi: number; aumentoIngrosso: number; creditoUniforme: number; creditoBasso: number; creditoAlto: number; creditoPct: number };
  indice: Record<string, FlagState>;
  classifica: { code: string; posizione: number; c1: number }[];
  depositiAVistaArea: number; prestitiArea: number; testPredittivo: string;
}
export interface CountryFile {
  code: string;
  composizione: { mesi: string[]; totale: number[]; voci: Record<string, number[]> };
  indicatore: { mesi: string[]; valore: number[]; posizione: number[]; paesi: number[]; c1: number[]; c2: number[]; c3: number[] };
}
export interface Channels {
  mediane: { c1: number; usd: number }; correlazioneDiRango: number;
  confrontoFonti: { paesi_con_entrambe: number; paesi_con_bsi_completo: number; rapporto_mediano_bsi_su_bri: number; correlazione_di_rango: number };
  cambianoConRiscalatura: string[]; quadranti: string[];
  dati_al: { bilanci: string; dollari: string };
}
export interface WeeklySeries { settimane: string[]; [k: string]: number[] | string[] }
export interface FlagSeries { settimane: string[]; quota: number[]; volumeEur: number[]; scartoQuota: (number | null)[]; scartoVolume: (number | null)[]; stato: string[] }
export interface ExclusionEffect {
  esclusi: string[]; settimane_confrontate: number; prima_settimana?: string; ultima_settimana?: string;
  quota_di_volume_degli_esclusi?: { media: number; massima: number; ultima_settimana: number };
  differenza_pp?: Record<string, { media: number; massima_assoluta: number; settimana_della_massima: string; ultima_settimana: number }>;
  segnalazioni_cambiate?: number;
}
export interface Monitor {
  dati_al: { ultimaSettimana: string }; serie: string[]; principale: WeeklySeries; lungo: WeeklySeries;
  segnalazioni: Record<string, FlagSeries>; statistiche: Record<string, Record<string, number | string>>;
  pannello: { exchange: number; exchange_indice_lungo: number; esclusi: string[]; esclusi_indice_lungo: string[] }; effettoEsclusione: ExclusionEffect;
  settimaneTrattenute: Record<string, { exchange_mancanti: string[]; quota_di_volume_mancante: number }>;
  fontiMancanti?: { exchange: string[]; coppie: string[]; maiDisponibili: string[]; quotaVolume: number; datiFinoAl: string | null } | null;
  testPredittivo: { risposta: string; pValue: number; osservazioni: number; rapportoRmse: number };
}
export interface LevelFile {
  dati_al: { indagine: string; circolazione: string };
  fasce: LevelBand[]; quotaDetentori: number; quotaDollari: { minimo: number; centrale: number; massimo: number };
  unita: { famiglie: number; individui: number };
  riferimento: { minimo_mld_eur: number; centrale_mld_eur: number; massimo_mld_eur: number; estremo_superiore_dichiarato_mld_eur: number };
  esm: { data: string; baseEur: number; altoEur: number; serie: { mesi: string[]; base: number[]; alto: number[] } };
  altreStrade: { b2: { saldiClientiMldUsd: number | null }; b3: { centrale: number | null } };
  criterioSoddisfatto: boolean;
}
export interface BiTable { colonne: string[]; righe: string[][] }
export interface Method {
  fonti: Record<string, BiTable>; limiti: Record<string, string[]>; metodiScartati: Record<string, BiTable>; repo: string;
}
export interface BankCountry {
  code: string; banche: number; alte: number; attivoCampione: number | null; coperturaBsi: number | null; coperturaConsolidato: number | null;
  m6PerEuro: number | null; m5: Record<string, number | null>; m5RetailAlta: boolean;
}
export interface Banks {
  dati_al: { banche: string; bilanciPaese: string };
  banche: Bank[]; paesi: BankCountry[]; soglia: number; mediana: number; sogliaPaesi: number; banchesSopra: number;
  criterio: { nelCampione: number; complete: number; paesi: number; soddisfatto: boolean; paesiSenzaBanche: string[]; escluse: { lei: string; nome: string; paese: string }[] };
  copertura: { bsi: number; consolidato: number | null; attivo: number; conUsa: number };
  confronto: Record<string, number>;
}
export interface AppData { sim: SimData; meta: Meta; overview: Overview }
