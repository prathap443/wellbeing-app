import fs from 'node:fs';
import type { Express } from 'express';

// Public pages linked from the App Store listing. Each is rendered from a Markdown file
// in the repo root, so the policy text lives in exactly one place.
const ROOT = new URL('../../', import.meta.url);
const PAGES: Record<string, { file: string; title: string }> = {
  '/privacy': { file: 'PRIVACY.md', title: 'Privacy Policy – Wellbeing' },
  '/support': { file: 'SUPPORT.md', title: 'Support – Wellbeing' },
};

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s: string) =>
  escape(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:)[^)\s]+)\)/g, '<a href="$2">$1</a>');

/** Small Markdown subset: #/## headings, paragraphs, "- " lists, **bold**, [links](https://…). */
export function renderMarkdown(md: string): string {
  const out: string[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    if (list.length) out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`);
    para = []; list = [];
  };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) { flush(); const n = heading[1].length; out.push(`<h${n}>${inline(heading[2])}</h${n}>`); continue; }
    if (line.startsWith('- ')) { if (para.length) flush(); list.push(line.slice(2)); continue; }
    if (list.length) flush();
    para.push(line);
  }
  flush();
  return out.join('\n');
}

const page = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>
:root{--bg:#f8fafc;--fg:#0f172a;--muted:#475569;--accent:#047857;--card:#ffffff;--line:#e2e8f0}
@media (prefers-color-scheme:dark){:root{--bg:#0f172a;--fg:#f1f5f9;--muted:#94a3b8;--accent:#6ee7b7;--card:#1e293b;--line:#334155}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
main{max-width:720px;margin:0 auto;padding:32px 20px 64px}h1{font-size:28px;line-height:1.25;margin:0 0 4px}h2{font-size:19px;margin:32px 0 6px}
p,li{color:var(--muted)}strong{color:var(--fg)}a{color:var(--accent)}ul{padding-left:20px}
</style></head><body><main>
${body}
</main></body></html>`;

export function registerPages(app: Express) {
  for (const [route, { file, title }] of Object.entries(PAGES)) {
    app.get(route, (_req, res) => {
      try {
        const md = fs.readFileSync(new URL(file, ROOT), 'utf8');
        res.type('html').send(page(title, renderMarkdown(md)));
      } catch {
        res.status(404).type('text').send('Not found');
      }
    });
  }
}
