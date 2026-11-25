import { createContext } from "react";
import type { Theme } from "../lib/util";

// Fuori da Chart.tsx, così l'intelaiatura dell'applicazione non si porta dietro la libreria dei grafici.
export const ThemeContext = createContext<Theme>("light");
