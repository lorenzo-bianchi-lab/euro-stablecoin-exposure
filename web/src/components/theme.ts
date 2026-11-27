import { createContext } from "react";
import type { Theme } from "../lib/util";

// Outside Chart.tsx, so that the application shell does not pull in the charting library.
export const ThemeContext = createContext<Theme>("light");
