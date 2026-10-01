import * as React from "react";

/**
 * Markdown mínimo para o Banco de Conhecimento: títulos, listas, negrito,
 * itálico, código (linha e bloco) e links. Devolve elementos React — nada de
 * `dangerouslySetInnerHTML`, então texto que pareça HTML aparece como texto.
 */

const INLINE =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]\n]+\]\([^\s)]+\))|(https?:\/\/[^\s<]+)/g;

/** Só http(s): evita `javascript:` e companhia vindos de texto colado. */
const safeHref = (url: string) => (/^https?:\/\//i.test(url) ? url : null);

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 hover:text-[var(--color-foreground)]"
    >
      {children}
    </a>
  );
}

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${m.index}`;
    const [token] = m;
    if (token.startsWith("`")) {
      out.push(
        <code
          key={key}
          className="rounded bg-[var(--color-muted)] px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      out.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("[")) {
      const split = token.indexOf("](");
      const label = token.slice(1, split);
      const href = safeHref(token.slice(split + 2, -1));
      out.push(href ? <Link key={key} href={href}>{label}</Link> : token);
    } else {
      out.push(
        <Link key={key} href={token}>
          {token}
        </Link>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const NUMBER = /^\d+[.)]\s+(.*)$/;

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;

  const flushList = (ordered: boolean) => {
    const items: string[] = [];
    const re = ordered ? NUMBER : BULLET;
    while (i < lines.length) {
      const m = re.exec(lines[i]);
      if (!m) break;
      items.push(m[1]);
      i++;
    }
    const List = ordered ? "ol" : "ul";
    blocks.push(
      <List
        key={`l${blocks.length}`}
        className={
          ordered
            ? "ml-5 list-decimal space-y-1 marker:text-[var(--color-muted-foreground)]"
            : "ml-5 list-disc space-y-1 marker:text-[var(--color-muted-foreground)]"
        }
      >
        {items.map((item, idx) => (
          <li key={idx}>{inline(item, `li${blocks.length}-${idx}`)}</li>
        ))}
      </List>,
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      i++;
      const code: string[] = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // fecha a cerca
      blocks.push(
        <pre
          key={`c${blocks.length}`}
          className="overflow-x-auto rounded-md bg-[var(--color-muted)] p-3 font-mono text-xs"
        >
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1].length;
      blocks.push(
        <p
          key={`h${blocks.length}`}
          className={
            level === 1
              ? "text-[15px] font-semibold"
              : level === 2
                ? "text-sm font-semibold"
                : "text-sm font-medium"
          }
        >
          {inline(heading[2], `h${blocks.length}`)}
        </p>,
      );
      i++;
      continue;
    }

    if (BULLET.test(line)) {
      flushList(false);
      continue;
    }
    if (NUMBER.test(line)) {
      flushList(true);
      continue;
    }

    // Parágrafo: junta as linhas seguidas até a próxima linha em branco.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("```") &&
      !HEADING.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !NUMBER.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`p${blocks.length}`}>{inline(para.join(" "), `p${blocks.length}`)}</p>,
    );
  }

  return <div className="grid gap-2.5 text-sm leading-relaxed">{blocks}</div>;
}
