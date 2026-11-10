export function normalizeUrl(v: string) {
  const t = v.trim();
  if (!t) return "";
  if (/^sample:\/\//.test(t)) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export function websiteError(v: string): string | null {
  if (!v.trim()) return null; // optional
  try {
    const u = new URL(normalizeUrl(v));
    if (!u.hostname.includes(".")) return "Needs a full domain, like minilend.xyz";
    return null;
  } catch {
    return "Not a valid URL";
  }
}

/** GitHub repo (optionally /tree/<ref>/<subdir>) or the backend's built-in sample://minilend. */
export function repoError(v: string): string | null {
  const t = v.trim();
  if (!t) return "Paste the GitHub repo URL";
  if (/^sample:\/\/[a-z0-9-]+$/i.test(t)) return null;
  const n = normalizeUrl(t);
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\/tree\/[^\s]+)?\/?$/i.test(n)) return "Use a GitHub URL: github.com/org/repo";
  return null;
}

export const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
