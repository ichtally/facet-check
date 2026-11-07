// node test.js  — offline tests. expected-bsky-tiny.json holds bsky-tiny's (Python) facets for
// cases.json, so both implementations are checked against each other.
const assert = require("assert");
const fs = require("fs");
const F = require("./facets.js");

const cases = JSON.parse(fs.readFileSync(__dirname + "/cases.json", "utf8"));

let fails = 0;
const t = (name, fn) => { try { fn(); console.log("ok  ", name); } catch (e) { fails++; console.log("FAIL", name, "\n   ", e.message); } };

t("byteOffset counts UTF-8 bytes", () => {
  assert.strictEqual(F.byteOffset("🙂a", 2), 4);
  assert.strictEqual(F.byteOffset("é", 1), 2);
});

t("emoji before link shifts by 4 bytes", () => {
  const f = F.buildFacets("🙂 https://a.com");
  assert.deepStrictEqual(f[0].index, { byteStart: 5, byteEnd: 18 });
});

t("trailing punctuation not in link or tag", () => {
  assert.strictEqual(F.buildFacets("see https://example.com/a?b=1.")[0].features[0].uri, "https://example.com/a?b=1");
  const tags = F.buildFacets("#ok! #123").map((x) => x.features[0].tag);
  assert.deepStrictEqual(tags, ["ok"]);
});

t("# in URL fragment is not a tag", () => {
  const f = F.buildFacets("https://x.com/#frag is not a tag");
  assert.strictEqual(f.length, 1);
  assert.ok(f[0].features[0].$type.endsWith("#link"));
});

t("mentions need a DID", () => {
  assert.strictEqual(F.buildFacets("hi @alice.bsky.social").length, 0);
  const f = F.buildFacets("hi @alice.bsky.social", { "alice.bsky.social": "did:plc:abc" });
  assert.deepStrictEqual(f[0], { index: { byteStart: 3, byteEnd: 21 }, features: [{ $type: "app.bsky.richtext.facet#mention", did: "did:plc:abc" }] });
});

t("inspect: correct facets have no problems", () => {
  for (const c of cases) {
    const r = F.inspect(c, F.buildFacets(c));
    r.forEach((x) => assert.deepStrictEqual(x.problems, [], c + " -> " + JSON.stringify(x)));
  }
});

t("inspect: catches character offsets and explains them", () => {
  const text = "🙂 hi #atproto";
  const bad = [{ index: { byteStart: 6, byteEnd: 14 }, features: [{ $type: "app.bsky.richtext.facet#tag", tag: "atproto" }] }];
  // code points: 🙂=0, ' '=1, h=2, i=3, ' '=4, '#'=5 → char offsets would be 5..13; use those
  bad[0].index = { byteStart: 5, byteEnd: 13 };
  const r = F.inspect(text, bad)[0];
  assert.ok(r.problems.length > 0);
  assert.ok(/characters/.test(r.hint), r.hint);
});

t("inspect: catches UTF-16 offsets", () => {
  const text = "🙂 hi #atproto"; // UTF-16: '#' at 6
  const r = F.inspect(text, [{ index: { byteStart: 6, byteEnd: 14 }, features: [{ $type: "app.bsky.richtext.facet#tag", tag: "atproto" }] }])[0];
  assert.ok(r.problems.length > 0);
  assert.ok(/UTF-16/.test(r.hint), r.hint);
});

t("inspect: mid-character offsets flagged", () => {
  const r = F.inspect("é#x", [{ index: { byteStart: 1, byteEnd: 4 }, features: [{ $type: "app.bsky.richtext.facet#tag", tag: "x" }] }])[0];
  assert.ok(r.problems.some((p) => /middle/.test(p)));
});

t("parsePostRef", () => {
  assert.deepStrictEqual(F.parsePostRef("https://bsky.app/profile/itstally.bsky.social/post/3mzowrowiyb2z"), { actor: "itstally.bsky.social", rkey: "3mzowrowiyb2z" });
  assert.deepStrictEqual(F.parsePostRef("at://did:plc:x/app.bsky.feed.post/abc"), { actor: "did:plc:x", rkey: "abc" });
  assert.strictEqual(F.parsePostRef("nope"), null);
});

if (fs.existsSync(__dirname + "/expected-bsky-tiny.json")) {
  const exp = JSON.parse(fs.readFileSync(__dirname + "/expected-bsky-tiny.json", "utf8"));
  t("matches bsky-tiny (Python) on all cases", () => {
    for (const c of Object.keys(exp)) assert.deepStrictEqual(F.buildFacets(c), exp[c], c);
  });
}

console.log(fails ? `${fails} failed` : "all passed");
process.exit(fails ? 1 : 0);
