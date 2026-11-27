// Static checks for the application and its test scripts (ESLint flat config).
// Recommended JavaScript rules, typescript-eslint recommended rules and the React hooks rules;
// the test scripts and the configuration files run in Node.
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist", "../docs", "public"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    ...reactHooks.configs.flat.recommended,
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      // reports only where the React Compiler would skip a component; the build does not use the React Compiler
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  {
    // the browser tests also pass functions to page.evaluate, which run in the page
    files: ["tests/**/*.{mjs,ts}", "*.config.{js,ts}"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
