// facets.js: Bluesky rich-text facet helpers (UTF-8 byte offsets). No dependencies.
// Works in the browser (window.Facets) and in Node (module.exports) for tests.
(function (root) {
  "use strict";
  const enc = new TextEncoder();
  const dec = new TextDecoder("utf-8", { fatal: false });

  const utf8 = (s) => enc.encode(s);
  // UTF-8 byte offset of JS string index i (i counts UTF-16 code units).
  const byteOffset = (text, i) => enc.encode(text.slice(0, i)).length;

  // Port of the detector in the official @atproto/api (RichText.detectFacets, v0.30.3,
  // packages/api/src/rich-text/{detection,util}.ts). Regexes are copied verbatim, quirks included:
  // bare domains link only if the last label is a real TLD (so "readme.md" links, "notes.txt" doesn't),
  // and the TLD check is case-sensitive (so "Example.COM" and "HTTPS://..." don't link).
  const MENTION_RE = /(^|\s|\()(@)([a-zA-Z0-9.-]+)(\b)/g;
  const URL_RE = /(^|\s|\()((https?:\/\/[\S]+)|((?<domain>[a-z][a-z0-9]*(\.[a-z0-9]+)+)[\S]*))/gim;
  const TRAILING_PUNCT = /\p{P}+$/gu;
  // eslint-disable-next-line no-misleading-character-class
  const TAG_RE = /(^|\s)[#＃]((?!️)[^\s­⁠ ​‌‍⃢]*[^\d\s\p{P}­⁠ ​‌‍⃢]+[^\s­⁠ ​‌‍⃢]*)?/gu;
  const CASHTAG_RE = /(^|\s|\()\$([A-Za-z][A-Za-z0-9]{0,4})(?=\s|$|[.,;:!?)"'’])/gu;
  // ASCII entries of the `tlds` npm package v1.261.0 (the only ones the domain regex can match).
  const TLDS = new Set("aaa aarp abb abbott abbvie abc able abogado abudhabi ac academy accenture accountant accountants aco actor ad ads adult ae aeg aero aetna af afl africa ag agakhan agency ai aig airbus airforce airtel akdn al alibaba alipay allfinanz allstate ally alsace alstom am amazon americanexpress americanfamily amex amfam amica amsterdam analytics android anquan anz ao aol apartments app apple aq aquarelle ar arab aramco archi army arpa art arte as asda asia associates at athleta attorney au auction audi audible audio auspost author auto autos aw aws ax axa az azure ba baby baidu banamex band bank bar barcelona barclaycard barclays barefoot bargains baseball basketball bauhaus bayern bb bbc bbt bbva bcg bcn bd be beats beauty beer berlin best bestbuy bet bf bg bh bharti bi bible bid bike bing bingo bio biz bj black blackfriday blockbuster blog bloomberg blue bm bms bmw bn bnpparibas bo boats boehringer bofa bom bond boo book booking bosch bostik boston bot boutique box br bradesco bridgestone broadway broker brother brussels bs bt build builders business buy buzz bv bw by bz bzh ca cab cafe cal call calvinklein cam camera camp canon capetown capital capitalone car caravan cards care career careers cars casa case cash casino cat catering catholic cba cbn cbre cc cd center ceo cern cf cfa cfd cg ch chanel channel charity chase chat cheap chintai christmas chrome church ci cipriani circle cisco citadel citi citic city ck cl claims cleaning click clinic clinique clothing cloud club clubmed cm cn co coach codes coffee college cologne com commbank community company compare computer comsec condos construction consulting contact contractors cooking cool coop corsica country coupon coupons courses cpa cr credit creditcard creditunion cricket crown crs cruise cruises cu cuisinella cv cw cx cy cymru cyou cz dad dance data date dating datsun day dclk dds de deal dealer deals degree delivery dell deloitte delta democrat dental dentist desi design dev dhl diamonds diet digital direct directory discount discover dish diy dj dk dm dnp do docs doctor dog domains dot download drive dtv dubai dupont durban dvag dvr dz earth eat ec eco edeka edu education ee eg email emerck energy engineer engineering enterprises epson equipment er ericsson erni es esq estate et eu eurovision eus events exchange expert exposed express extraspace fage fail fairwinds faith family fan fans farm farmers fashion fast fedex feedback ferrari ferrero fi fidelity fido film final finance financial fire firestone firmdale fish fishing fit fitness fj fk flickr flights flir florist flowers fly fm fo foo food football ford forex forsale forum foundation fox fr free fresenius frl frogans frontier ftr fujitsu fun fund furniture futbol fyi ga gal gallery gallo gallup game games gap garden gay gb gbiz gd gdn ge gea gent genting george gf gg ggee gh gi gift gifts gives giving gl glass gle global globo gm gmail gmbh gmo gmx gn godaddy gold goldpoint golf goo goodyear goog google gop got gov gp gq gr grainger graphics gratis green gripe grocery group gs gt gu gucci guge guide guitars guru gw gy hair hamburg hangout haus hbo hdfc hdfcbank health healthcare help helsinki here hermes hiphop hisamitsu hitachi hiv hk hkt hm hn hockey holdings holiday homedepot homegoods homes homesense honda horse hospital host hosting hot hotels hotmail house how hr hsbc ht hu hughes hyatt hyundai ibm icbc ice icu id ie ieee ifm ikano il im imamat imdb immo immobilien in inc industries infiniti info ing ink institute insurance insure int international intuit investments io ipiranga iq ir irish is ismaili ist istanbul it itau itv jaguar java jcb je jeep jetzt jewelry jio jll jm jmp jnj jo jobs joburg jot joy jp jpmorgan jprs juegos juniper kaufen kddi ke kerryhotels kerryproperties kfh kg kh ki kia kids kim kindle kitchen kiwi km kn koeln komatsu kosher kp kpmg kpn kr krd kred kuokgroup kw ky kyoto kz la lacaixa lamborghini lamer land landrover lanxess lasalle lat latino latrobe law lawyer lb lc lds lease leclerc lefrak legal lego lexus lgbt li lidl life lifeinsurance lifestyle lighting like lilly limited limo lincoln link live living lk llc llp loan loans locker locus lol london lotte lotto love lpl lplfinancial lr ls lt ltd ltda lu lundbeck luxe luxury lv ly ma madrid maif maison makeup man management mango map market marketing markets marriott marshalls mattel mba mc mckinsey md me med media meet melbourne meme memorial men menu merckmsd mg mh miami microsoft mil mini mint mit mitsubishi mk ml mlb mls mm mma mn mo mobi mobile moda moe moi mom monash money monster mormon mortgage moscow moto motorcycles mov movie mp mq mr ms msd mt mtn mtr mu museum music mv mw mx my mz na nab nagoya name navy nba nc ne nec net netbank netflix network neustar new news next nextdirect nexus nf nfl ng ngo nhk ni nico nike nikon ninja nissan nissay nl no nokia norton now nowruz nowtv np nr nra nrw ntt nu nyc nz obi observer office okinawa olayan olayangroup ollo om omega one ong onl online ooo open oracle orange org organic origins osaka otsuka ott ovh pa page panasonic paris pars partners parts party pay pccw pe pet pf pfizer pg ph pharmacy phd philips phone photo photography photos physio pics pictet pictures pid pin ping pink pioneer pizza pk pl place play playstation plumbing plus pm pn pnc pohl poker politie porn post pr praxi press prime pro prod productions prof progressive promo properties property protection pru prudential ps pt pub pw pwc py qa qpon quebec quest racing radio re read realestate realtor realty recipes red redumbrella rehab reise reisen reit reliance ren rent rentals repair report republican rest restaurant review reviews rexroth rich richardli ricoh ril rio rip ro rocks rodeo rogers room rs rsvp ru rugby ruhr run rw rwe ryukyu sa saarland safe safety sakura sale salon samsclub samsung sandvik sandvikcoromant sanofi sap sarl sas save saxo sb sbi sbs sc scb schaeffler schmidt scholarships school schule schwarz science scot sd se search seat secure security seek select sener services seven sew sex sexy sfr sg sh shangrila sharp shell shia shiksha shoes shop shopping shouji show si silk sina singles site sj sk ski skin sky skype sl sling sm smart smile sn sncf so soccer social softbank software sohu solar solutions song sony soy spa space sport spot sr srl ss st stada staples star statebank statefarm stc stcgroup stockholm storage store stream studio study style su sucks supplies supply support surf surgery suzuki sv swatch swiss sx sy sydney systems sz tab taipei talk taobao target tatamotors tatar tattoo tax taxi tc tci td tdk team tech technology tel temasek tennis teva tf tg th thd theater theatre tiaa tickets tienda tips tires tirol tj tjmaxx tjx tk tkmaxx tl tm tmall tn to today tokyo tools top toray toshiba total tours town toyota toys tr trade trading training travel travelers travelersinsurance trust trv tt tube tui tunes tushu tv tvs tw tz ua ubank ubs ug uk unicom university uno uol ups us uy uz va vacations vana vanguard vc ve vegas ventures verisign versicherung vet vg vi viajes video vig viking villas vin vip virgin visa vision viva vivo vlaanderen vn vodka volvo vote voting voto voyage vu wales walmart walter wang wanggou watch watches weather weatherchannel webcam weber website wed wedding weibo weir wf whoswho wien wiki williamhill win windows wine winners wme wolterskluwer woodside work works world wow ws wtc wtf xbox xerox xihuan xin xxx xyz yachts yahoo yamaxun yandex ye yodobashi yoga yokohama you youtube yt yun za zappos zara zero zip zm zone zuerich zw".split(" "));
  const isValidDomain = (d) => d.includes(".") && TLDS.has(d.slice(d.lastIndexOf(".") + 1));

  const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter() : null;
  const graphemeLen = (s) => (seg ? [...seg.segment(s)].length : [...s].length);

  // Returns [{start, end, kind, value}] in JS string indices (not bytes), sorted by start.
  // kind: "mention" (value = handle), "link" (value = uri), "tag" (value = tag), "cashtag" (value = "$TICKER").
  function findSpans(text) {
    const spans = [];
    let m;
    MENTION_RE.lastIndex = 0;
    while ((m = MENTION_RE.exec(text))) {
      if (!isValidDomain(m[3]) && !m[3].endsWith(".test")) continue; // probably not a handle
      const s = text.indexOf(m[3], m.index) - 1;
      spans.push({ start: s, end: s + m[3].length + 1, kind: "mention", value: m[3] });
    }
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text))) {
      let uri = m[2];
      if (!uri.startsWith("http")) {
        const domain = m.groups && m.groups.domain;
        if (!domain || !isValidDomain(domain)) continue;
        uri = "https://" + uri;
      }
      const start = text.indexOf(m[2], m.index);
      let end = start + m[2].length;
      if (/[.,;:!?]$/.test(uri)) { uri = uri.slice(0, -1); end--; }
      if (/[)]$/.test(uri) && !uri.includes("(")) { uri = uri.slice(0, -1); end--; }
      spans.push({ start, end, kind: "link", value: uri });
    }
    TAG_RE.lastIndex = 0;
    while ((m = TAG_RE.exec(text))) {
      let tag = m[2];
      if (!tag) continue;
      tag = tag.trim().replace(TRAILING_PUNCT, "");
      if (tag.length === 0 || (tag.length > 64 && graphemeLen(tag) > 64)) continue;
      const s = m.index + m[1].length;
      spans.push({ start: s, end: s + 1 + tag.length, kind: "tag", value: tag });
    }
    CASHTAG_RE.lastIndex = 0;
    while ((m = CASHTAG_RE.exec(text))) {
      const s = m.index + m[1].length;
      spans.push({ start: s, end: s + 1 + m[2].length, kind: "cashtag", value: "$" + m[2].toUpperCase() });
    }
    return spans.sort((a, b) => a.start - b.start);
  }

  // Build facets. `dids` maps lowercase handle -> did. Mentions without a DID are skipped: the official
  // client resolves them first, and an unresolvable mention can't be a valid facet.
  function buildFacets(text, dids) {
    dids = dids || {};
    const out = [];
    for (const sp of findSpans(text)) {
      const index = { byteStart: byteOffset(text, sp.start), byteEnd: byteOffset(text, sp.end) };
      let feature;
      if (sp.kind === "link") feature = { $type: "app.bsky.richtext.facet#link", uri: sp.value };
      else if (sp.kind === "tag" || sp.kind === "cashtag") feature = { $type: "app.bsky.richtext.facet#tag", tag: sp.value };
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
      const isCash = type === "tag" && typeof feat.tag === "string" && feat.tag.startsWith("$");
      if (type === "tag" && feat.tag !== undefined && !isCash && covered.replace(/^[#＃]/, "") !== feat.tag)
        problems.push(`covers "${covered}" but the tag is "${feat.tag}"`);
      if (isCash && covered.toUpperCase() !== feat.tag.toUpperCase())
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
