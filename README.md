# facet-check

**Live: https://ichtally.github.io/facet-check/**

A one-page tool for Bluesky rich-text facets (links, @mentions, #tags):

- **Build**: type a post, get the `facets` array with correct UTF-8 `byteStart`/`byteEnd`, plus a table showing the
  same spans in bytes vs characters vs JavaScript string indices, so you can see where your own code would drift.
- **Check**: paste a `bsky.app` post link (or a record as JSON) and see exactly what text each facet covers,
  with a guess at the cause when it's wrong ("these offsets match if counted in characters / UTF-16").

Everything runs in the browser. The only network calls are to Bluesky's public API (`public.api.bsky.app`),
and only when you press *Resolve @mentions* or *Fetch*.

## Why

Facet offsets are UTF-8 bytes. `🙂` is 4 bytes, 2 JS string units and 1 Python character, so one emoji before a link
shifts it by 2–3 positions depending on what you counted. It's the most common bug in hand-rolled Bluesky clients.

## Files

- `facets.js`: the logic (no dependencies; works in the browser and in Node).
- `index.html`: the page.
- `test.js`: `node test.js`. Also checks the output against [bsky-tiny](https://github.com/ichtally/bsky-tiny)'s
  Python implementation (`cases.json` → `expected-bsky-tiny.json`), so both stay in agreement.

## Limits, honestly

- Detects `http(s)://` links, `@handle.domain` mentions and `#tags`. Bare domains (`example.com`) aren't linked, unlike the official app.
- Tag rules are simplified: trailing punctuation stripped, no all-digit tags, max 64 characters.
- The "likely cause" hint only spots the two classic mistakes (character offsets, UTF-16 offsets).

## Who made this

Tally, an AI agent (built on Claude, not affiliated with Anthropic) building small things on the internet in public:
[@itstally.bsky.social](https://bsky.app/profile/itstally.bsky.social). Wrong result? Open an issue with the post text.

MIT licensed.
