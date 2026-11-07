// facets.js: Bluesky rich-text facet helpers (UTF-8 byte offsets). No dependencies.
// Works in the browser (window.Facets) and in Node (module.exports) for tests.
(function (root) {
  "use strict";
  const enc = new TextEncoder();
  const dec = new TextDecoder("utf-8", { fatal: false });

  const utf8 = (s) => enc.encode(s);
  // UTF-8 byte offset of JS string index i (i counts UTF-16 code units).
  const byteOffset = (text, i) => enc.encode(text.slice(0, i)).length;

  // Same rules as bsky-tiny (github.com/ichtally/bsky-tiny): http(s) links, @handle.domain, #tags.
  const URL_RE = /(^|[^\w])(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*[-a-zA-Z0-9@%_+~#/=])?)/g;
  const MENTION_RE = /(^|[^\w])(@(([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?))/g;
  const TAG_RE = /(^|\s)(#[^\s#]+)/gu;
  const TRAILING = /[.,;:!?'")]+$/;

  // Returns [{start, end, kind, value}] in JS string indices (not bytes).
  function findSpans(text) {
    const spans = [];
    let m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text))) {
      const s = m.index + m[1].length;
      spans.push({ start: s, end: s + m[2].length, kind: "link", value: m[2] });
    }
    MENTION_RE.lastIndex = 0;
    while ((m = MENTION_RE.exec(text))) {
      const s = m.index + m[1].length;
      if (spans.some((x) => s >= x.start && s < x.end)) continue; // inside a URL
      spans.push({ start: s, end: s + m[2].length, kind: "mention", value: m[2].slice(1) });
    }
    TAG_RE.lastIndex = 0;
    while ((m = TAG_RE.exec(text))) {
      const s = m.index + m[1].length;
      const tag = m[2].replace(TRAILING, "");
      const name = tag.slice(1);
      if (!name || /^\d+$/.test(name) || [...name].length > 64) continue;
      if (spans.some((x) => s >= x.start && s < x.end)) continue; // '#' inside a URL fragment
      spans.push({ start: s, end: s + tag.length, kind: "tag", value: name });
    }
    return spans.sort((a, b) => a.start - b.start);
  }

  // Build facets. `dids` maps handle -> did; mentions without a DID are skipped (as Bluesky would).
  function buildFacets(text, dids) {
    dids = dids || {};
    const out = [];
    for (const sp of findSpans(text)) {
      const index = { byteStart: byteOffset(text, sp.start), byteEnd: byteOffset(text, sp.end) };
      let feature;
      if (sp.kind === "link") feature = { $type: "app.bsky.richtext.facet#link", uri: sp.value };
      else if (sp.kind === "tag") feature = { $type: "app.bsky.richtext.facet#tag", tag: sp.value };
      else if (dids[sp.value.toLowerCase()]) feature = { $type: "app.bsky.richtext.facet#mention", did: dids[sp.value.toLowerCase()] };
      else continue;
      out.push({ index, features: [feature] });
    }
    return out;
  }

  const isContinuation = (b) => (b & 0xc0) === 0x80;

  // Check existing facets against text. Returns one report per facet.
  function inspect(text, facets) {
    const b = utf8(text);
    return (facets || []).map((f, n) => {
      const problems = [];
      const st = f && f.index ? f.index.byteStart : undefined;
      const en = f && f.index ? f.index.byteEnd : undefined;
      const feat = (f && f.features && f.features[0]) || {};
      const type = String(feat.$type || "").replace("app.bsky.richtext.facet#", "") || "?";
      if (!Number.isInteger(st) || !Number.isInteger(en)) {
        return { n, type, start: st, end: en, covered: "", problems: ["byteStart/byteEnd missing or not integers"], feature: feat };
      }
      if (st < 0 || en > b.length) problems.push(`range is outside the text (text is ${b.length} bytes)`);
      if (en <= st) problems.push("byteEnd must be greater than byteStart");
      if (st < b.length && isContinuation(b[st])) problems.push("byteStart lands in the middle of a multi-byte character");
      if (en < b.length && isContinuation(b[en])) problems.push("byteEnd lands in the middle of a multi-byte character");
      const covered = dec.decode(b.slice(Math.max(0, st), Math.min(b.length, en)));
      if (type === "tag" && feat.tag !== undefined && covered.replace(/^[#＃]/, "") !== feat.tag)
        problems.push(`covers "${covered}" but the tag is "${feat.tag}"`);
      if (type === "link" && feat.uri && covered && !feat.uri.includes(covered.replace(/(\.\.\.|…)$/, "")))
        problems.push(`covered text isn't part of the link (fine for custom link text, suspicious otherwise)`);
      if (type === "mention" && covered && !covered.startsWith("@")) problems.push(`covered text doesn't start with "@"`);
      if (!feat.$type) problems.push("feature has no $type");
      // The classic bug: offsets computed in characters instead of bytes.
      let hint = null;
      if (problems.length) {
        const chars = [...text];
        if (en <= chars.length) {
          const asChars = chars.slice(st, en).join("");
          const ok = (type === "tag" && asChars.replace(/^#/, "") === feat.tag) ||
                     (type === "link" && feat.uri && asChars === feat.uri) ||
                     (type === "mention" && asChars.startsWith("@"));
          if (ok) hint = "These offsets match the text if counted in characters (code points). Facets need UTF-8 bytes.";
        }
        const units = text.slice(st, en);
        if (!hint && ((type === "tag" && units.replace(/^#/, "") === feat.tag) || (type === "link" && units === feat.uri)))
          hint = "These offsets match the text if counted in JavaScript string indices (UTF-16). Facets need UTF-8 bytes.";
      }
      return { n, type, start: st, end: en, covered, problems, hint, feature: feat };
    });
  }

  // bsky.app/profile/<handle-or-did>/post/<rkey>  or  at://<did>/app.bsky.feed.post/<rkey>
  function parsePostRef(ref) {
    ref = ref.trim();
    let m = ref.match(/^https?:\/\/(?:www\.)?bsky\.app\/profile\/([^/]+)\/post\/([^/?#]+)/);
    if (m) return { actor: decodeURIComponent(m[1]), rkey: m[2] };
    m = ref.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#]+)/);
    if (m) return { actor: m[1], rkey: m[2] };
    return null;
  }

  const api = { utf8, byteOffset, findSpans, buildFacets, inspect, parsePostRef };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Facets = api;
})(typeof window !== "undefined" ? window : this);
