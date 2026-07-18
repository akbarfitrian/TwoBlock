import type { ReactNode } from "react";

const URL_RE = /(https?:\/\/[^\s]+)/g;
const MENTION_RE = /(^|\s)(@[a-zA-Z0-9_]{3,20})/g;

export function linkify(text: string, linkClassName = "text-brand-blue hover:underline"): ReactNode[] {
  if (!text) return [];

  const urlParts = text.split(URL_RE);

  const nodes: ReactNode[] = [];
  urlParts.forEach((part, i) => {
    if (URL_RE.test(part)) {

      URL_RE.lastIndex = 0;
      nodes.push(
        <a
          key={`url-${i}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className={linkClassName}
        >
          {shortenUrl(part)}
        </a>
      );
      return;
    }
    URL_RE.lastIndex = 0;

    const mentionSplit = part.split(MENTION_RE);
    for (let j = 0; j < mentionSplit.length; j++) {
      const chunk = mentionSplit[j];
      if (!chunk) continue;
      if (chunk.startsWith("@") && /^@[a-zA-Z0-9_]{3,20}$/.test(chunk)) {
        nodes.push(
          <span key={`mention-${i}-${j}`} className="font-medium text-brand-blue">
            {chunk}
          </span>
        );
      } else {
        nodes.push(chunk);
      }
    }
  });

  return nodes;
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname;
    const display = `${u.hostname}${path}`;
    return display.length > 40 ? `${display.slice(0, 37)}…` : display;
  } catch {
    return url;
  }
}
