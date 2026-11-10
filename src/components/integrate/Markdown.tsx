/** Minimal Markdown for INTEGRATION.md: headings, ordered/unordered lists, tables, code, inline code, bold. */
function inline(s: string, key: string) {
  const parts = s.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("`") ? (
      <code key={`${key}-${i}`} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-13 text-text">
        {p.slice(1, -1)}
      </code>
    ) : p.startsWith("**") ? (
      <strong key={`${key}-${i}`} className="font-medium text-text">
        {p.slice(2, -2)}
      </strong>
    ) : (
      p
    ),
  );
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i]!;
    const k = `l${i}`;
    if (/^```/.test(l)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i]!)) buf.push(lines[i++]!);
      i++;
      out.push(
        <pre key={k} className="overflow-x-auto rounded-ctl border border-line bg-surface-2 p-3 font-mono text-13 text-text-2">
          {buf.join("\n")}
        </pre>,
      );
      continue;
    }
    if (/^#{1,3} /.test(l)) {
      const level = l.match(/^#+/)![0].length;
      const text = l.replace(/^#+ /, "");
      out.push(
        level === 1 ? (
          <h3 key={k} className="text-22 font-medium text-text">{inline(text, k)}</h3>
        ) : (
          <h4 key={k} className="k-label pt-2">{text}</h4>
        ),
      );
      i++;
      continue;
    }
    if (/^\d+\. /.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i]!)) items.push(lines[i++]!.replace(/^\d+\. /, ""));
      out.push(
        <ol key={k} className="grid gap-2">
          {items.map((t, j) => (
            <li key={j} className="flex gap-3 text-15 text-text-2">
              <span className="k-tnum w-5 shrink-0 font-mono text-13 text-text-3">{j + 1}</span>
              <span>{inline(t, `${k}-${j}`)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }
    if (/^- /.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i]!)) items.push(lines[i++]!.slice(2));
      out.push(
        <ul key={k} className="grid gap-1.5">
          {items.map((t, j) => (
            <li key={j} className="flex gap-3 text-15 text-text-2">
              <span aria-hidden className="mt-2.5 block size-1 shrink-0 rounded-full bg-text-3" />
              <span>{inline(t, `${k}-${j}`)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\|/.test(l)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\|/.test(lines[i]!)) {
        const cells = lines[i++]!.split("|").slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells);
      }
      out.push(
        <table key={k} className="w-full font-mono text-13">
          <tbody>
            {rows.map((r, j) => (
              <tr key={j} className="border-b border-line">
                {r.map((c, m) => (
                  <td key={m} className={j === 0 ? "py-1.5 pr-4 text-text-3" : "py-1.5 pr-4 text-text-2"}>
                    {inline(c, `${k}-${j}-${m}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }
    if (/^> /.test(l)) {
      out.push(
        <p key={k} className="border-l-2 border-queue pl-3 text-15 text-queue">
          {inline(l.slice(2), k)}
        </p>,
      );
      i++;
      continue;
    }
    if (l.trim()) out.push(<p key={k} className="text-15 text-text-2">{inline(l, k)}</p>);
    i++;
  }
  return <div className="grid gap-3">{out}</div>;
}
