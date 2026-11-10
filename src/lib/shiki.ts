import { createHighlighterCore, type HighlighterCore, type ThemeRegistration } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

/**
 * Monochrome code theme built from the design tokens: no rainbow, just tone. Keywords in --text,
 * strings slightly warm, comments in --text-3. Works on --surface-2.
 */
export const kronosTheme: ThemeRegistration = {
  name: "kronos",
  type: "dark",
  colors: { "editor.background": "#00000000", "editor.foreground": "#C9C7C1" },
  tokenColors: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#6E717A", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "storage.modifier"], settings: { foreground: "#ECEAE4" } },
    { scope: ["string", "string.quoted"], settings: { foreground: "#D9C9A3" } },
    { scope: ["constant.numeric", "constant.language"], settings: { foreground: "#E0DED8" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: "#ECEAE4", fontStyle: "" } },
    { scope: ["entity.name.type", "support.type", "entity.name.class"], settings: { foreground: "#B9BCC4" } },
    { scope: ["variable", "variable.parameter"], settings: { foreground: "#A9ACB4" } },
    { scope: ["markup.inserted", "punctuation.definition.inserted"], settings: { foreground: "#3DD68C" } },
    { scope: ["markup.deleted", "punctuation.definition.deleted"], settings: { foreground: "#FF5C5C" } },
  ],
};

export type Lang = "solidity" | "typescript" | "shellscript" | "json" | "diff" | "markdown";

let hl: Promise<HighlighterCore> | null = null;
export function highlighter() {
  hl ??= createHighlighterCore({
    themes: [kronosTheme],
    langs: [
      import("shiki/langs/solidity.mjs"),
      import("shiki/langs/typescript.mjs"),
      import("shiki/langs/shellscript.mjs"),
      import("shiki/langs/json.mjs"),
      import("shiki/langs/diff.mjs"),
      import("shiki/langs/markdown.mjs"),
    ],
    engine: createJavaScriptRegexEngine(),
  });
  return hl;
}

export async function highlight(code: string, lang: Lang) {
  const h = await highlighter();
  return h.codeToHtml(code, { lang, theme: "kronos" });
}
