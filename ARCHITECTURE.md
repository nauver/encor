# enCoR — code structure

No build step, no framework, no runtime dependency. Three static pages sharing
one data folder. Every file has a single responsibility and states it in its
header comment.

```
encor/
├─ index.html          reading view      — markup only
├─ corpus.html         corpus view       — markup only
├─ admin.html          editing view      — markup only
├─ assets/
│  ├─ encor.css        reading view styles
│  ├─ corpus.css       corpus view styles (dark)
│  ├─ admin.css        editing view styles
│  ├─ core.js          shared state, formatting, escaping
│  ├─ vocabulary.js    search vocabulary and query expansion
│  ├─ context.js       transcripts: deep search and context expansion
│  ├─ read.js          reading view behaviour
│  ├─ corpus.js        corpus view behaviour
│  └─ admin.js         editing view behaviour
└─ data/
   ├─ index.js         list of datasets to load
   ├─ transcripts.js   full transcripts, ~900 KB, loaded on demand only
   └─ <session>.js     one validated dataset per session
```

## Load order

`index.html` loads, in this order: `core.js`, `vocabulary.js`, `context.js`,
then the datasets, then `read.js`. Dependencies only ever point downwards —
`core.js` knows nothing about the views, the views know nothing about each
other.

`corpus.html` and `admin.html` each load only the datasets and their own
module.

## Security notes

**No inline script, no inline style.** All behaviour and presentation live in
external files, so the pages can be served under a strict
Content-Security-Policy without `unsafe-inline`. A workable policy:

```
default-src 'self';
style-src 'self' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com;
script-src 'self';
frame-src https://webstreaming.cor.europa.eu;
```

`frame-src` is only needed by `admin.html`, which embeds the portal player.

**No `eval`, no `new Function`, no dynamic code.** Datasets are plain scripts
calling `registerSession()`; they are data, not logic.

**Every value interpolated into the DOM is escaped** through `esc()` in
`core.js`, including the search-term highlighter, which escapes before it
marks. The only unescaped insertions are literal strings written in the code.

**No browser storage, no cookies, no network calls** from the public pages
beyond loading their own assets. Nothing is sent anywhere; nothing is kept
between visits.

**Datasets are scripts rather than JSON** so the pages work when opened from
disk, where `fetch()` is blocked. The trade-off is accepted deliberately: the
files are produced by the pipeline and reviewed before being committed, so
they are trusted input.

## Conventions

- One concern per file; the header comment states the purpose and what the
  file exposes.
- Sections inside a file are separated by `/* --- n. name --- */` banners.
- Comments explain *why*, not *what* — the reasons behind a choice, the
  constraint that forced it, the trap it avoids.
- French in the code comments where the reasoning was developed in French;
  English in everything the reader sees.
