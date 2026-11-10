(function () {
  "use strict";

  var CATS = ["Mobile money", "Phishing / account threat", "Fake job / fee", "Investment", "Prize / promo", "Impersonation", "Romance / emergency", "Other"];

  var RULES = [
    { label: "Asks you to share a PIN, OTP or password", re: /(send|share|give|tell|confirm|provide|enter|reply with|submit)[^.\n]{0,40}\b(pin|otp|password|verification code|secret code|one[- ]time (password|code))\b/i, w: 0.6, cat: "Mobile money", why: "Banks and mobile money providers do not ask customers for a PIN or one-time code by message." },
    { label: "Mentions a PIN, OTP or password", re: /\b(pin|otp|password|verification code|one[- ]time (password|code))\b/i, w: 0.2, cat: "Mobile money", why: "Secret codes are the main target of mobile money fraud." },
    { label: "Money \"sent by mistake\" and a request to return it", re: /(sent|transferred|deposited)[^.\n]{0,30}(by mistake|wrongly|in error|wrong number)|(please|kindly)[^.\n]{0,25}(return|refund|send back)/i, w: 0.55, cat: "Mobile money", why: "Classic reversal scam. The original deposit is often fake, so returning it loses you real money." },
    { label: "Urgency or a deadline", re: /\b(urgent(ly)?|immediately|right now|within \d+ ?(hours?|hrs?|minutes?|mins?)|last chance|expires? (today|soon)|act now|final notice|asap)\b/i, w: 0.25, cat: "Other", why: "Scammers rush you so you act before you think or ask anyone." },
    { label: "Threat that an account, SIM or card is blocked", re: /(account|wallet|sim|line|card)[^.\n]{0,30}(suspended|blocked|deactivated|closed|frozen|locked|expire)/i, w: 0.4, cat: "Phishing / account threat", why: "Fear of losing access is used to make people hand over details." },
    { label: "Prize, winner or promotion claim", re: /\b(you (have )?won|winner|congratulations|lucky draw|promo(tion)?|jackpot|claim (your )?(prize|reward|gift))\b/i, w: 0.45, cat: "Prize / promo", why: "Unexpected prizes for contests you never entered are a standard bait." },
    { label: "Fee demanded before you receive something", re: /\b(registration|processing|clearance|admin(istration)?|release|delivery|application|activation|booking)\s+fee\b|pay (a )?(small )?fee/i, w: 0.5, cat: "Fake job / fee", why: "Legitimate employers and prize givers do not charge you in advance." },
    { label: "Asks you to send a specific amount of money", re: /(send|pay|deposit|transfer)[^.\n]{0,25}\b(k|zmw|kwacha)\s?\d[\d,]*/i, w: 0.35, cat: "Fake job / fee", why: "A direct request for money in a message from someone you do not know is a warning sign." },
    { label: "Job offer with big pay for easy work", re: /(job offer|vacanc(y|ies)|hiring|recruit(ing|ment)|work from home|data entry|earn (up to )?(k|zmw|\$)\s?\d[\d,]*)/i, w: 0.3, cat: "Fake job / fee", why: "Fake job adverts promise high pay and are often followed by a fee request." },
    { label: "Guaranteed returns or money-doubling scheme", re: /(double your money|guaranteed (returns?|profit)|investment (opportunity|plan)|forex|crypto|bitcoin|returns? in \d+ (days?|hours?)|\d+% (daily|weekly|returns?))/i, w: 0.5, cat: "Investment", why: "No honest investment can guarantee profit. Pyramid and Ponzi schemes depend on this promise." },
    { label: "Threat of arrest, legal action or penalty", re: /(arrest|warrant|legal action|penalt(y|ies)|you will be (charged|prosecuted))/i, w: 0.35, cat: "Impersonation", why: "Fraudsters pose as authorities to frighten people into paying." },
    { label: "Asks for secrecy", re: /(do not|don'?t) (tell|share|inform)[^.\n]{0,30}|keep (this|it) (a )?(secret|confidential)|between us/i, w: 0.3, cat: "Other", why: "Isolating you from friends and family stops anyone from spotting the scam." },
    { label: "Emotional emergency or request for help", re: /(i('m| am) (stuck|stranded|in hospital)|emergency|send me (money|airtime)|my (phone|number) (was )?(stolen|changed)|new number)/i, w: 0.3, cat: "Romance / emergency", why: "Sudden emergencies from \"friends\" or \"relatives\" on a new number are a common trick." },
    { label: "Generic greeting", re: /\bdear (customer|user|client|winner|beneficiary|sir\/madam)\b/i, w: 0.2, cat: "Other", why: "A real provider addresses you by name. Mass messages use generic greetings." }
  ];

  var BRANDS = ["mtn", "airtel", "zamtel", "zanaco", "stanbic", "fnb", "absa", "zesco", "zra", "natsave", "indo"];
  var BAD_TLDS = ["xyz", "top", "click", "tk", "ml", "ga", "cf", "gq", "buzz", "live", "info", "site", "online"];
  var SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "cutt.ly", "is.gd", "rb.gy", "shorturl.at"];
  var URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:xyz|top|click|tk|ml|ga|cf|gq|buzz|live|info|site|online)\b[^\s<>"']*|\b(?:bit\.ly|tinyurl\.com|cutt\.ly|is\.gd|rb\.gy|shorturl\.at)\/[^\s<>"']+/gi;

  var SAMPLES = [
    "Dear customer, your mobile money account has been suspended. Send your PIN to verify immediately or lose access within 24 hours. Visit mtn-verify-zm.xyz",
    "Hi, I sent K850 to your number by mistake. Please send it back urgently. I'm in hospital and my phone is almost off.",
    "VACANCY: Data entry clerk, work from home, earn K5,000 weekly. Pay a K300 registration fee to secure your slot. WhatsApp 0970000000",
    "Are we still meeting at the library at 14:00 to finish the group assignment? I booked the discussion room."
  ];

  var SEEDS = [
    { id: "s1", cat: "Phishing / account threat", ch: "SMS", area: "Chalala", txt: "Text saying my mobile money wallet was suspended and asking me to reply with my PIN to restore it.", conf: 4, ex: true },
    { id: "s2", cat: "Mobile money", ch: "SMS", area: "Kabulonga", txt: "Someone claimed they deposited money by mistake and asked me to send it back the same hour.", conf: 6, ex: true },
    { id: "s3", cat: "Fake job / fee", ch: "WhatsApp", area: "Woodlands", txt: "Advert for a remote data entry job that wanted a registration fee before the first task.", conf: 3, ex: true },
    { id: "s4", cat: "Investment", ch: "Facebook", area: "Lusaka CBD", txt: "Group promising to triple deposits in five days and asking members to invite friends.", conf: 2, ex: true },
    { id: "s5", cat: "Prize / promo", ch: "SMS", area: "Matero", txt: "Message saying I won a phone in a draw I never entered, with a link to claim it.", conf: 2, ex: true }
  ];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return s.replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function hostOf(u) { return u.replace(/^https?:\/\//i, "").split(/[\/?#]/)[0].toLowerCase(); }

  function analyse(text) {
    var hits = [], ranges = [], i, m;

    function addRanges(re, w) {
      var g = new RegExp(re.source, re.flags.indexOf("g") >= 0 ? re.flags : re.flags + "g");
      var found = false, n = 0;
      while ((m = g.exec(text)) && n < 50) {
        n++;
        if (m[0].length === 0) { g.lastIndex++; continue; }
        found = true;
        ranges.push({ s: m.index, e: m.index + m[0].length, w: w });
      }
      return found;
    }

    for (i = 0; i < RULES.length; i++) {
      if (addRanges(RULES[i].re, RULES[i].w)) hits.push(RULES[i]);
    }

    var urlHits = { short: null, brand: null, tld: null, plain: null };
    var uRe = new RegExp(URL_RE.source, "gi");
    var n2 = 0;
    while ((m = uRe.exec(text)) && n2 < 20) {
      n2++;
      var url = m[0].replace(/[.,;:!?)]+$/, "");
      var host = hostOf(url);
      var tld = host.split(".").pop();
      var rng = { s: m.index, e: m.index + url.length };
      var isShort = SHORTENERS.some(function (s) { return host === s || host.slice(-s.length - 1) === "." + s; });
      var brand = BRANDS.filter(function (b) { return host.indexOf(b) >= 0; })[0];
      var badTld = BAD_TLDS.indexOf(tld) >= 0;
      var odd = /-|\d/.test(host) || badTld;
      if (isShort) { ranges.push({ s: rng.s, e: rng.e, w: 0.4 }); urlHits.short = true; }
      else if (brand && odd) { ranges.push({ s: rng.s, e: rng.e, w: 0.5 }); urlHits.brand = brand; }
      else if (badTld) { ranges.push({ s: rng.s, e: rng.e, w: 0.3 }); urlHits.tld = "." + tld; }
      else { ranges.push({ s: rng.s, e: rng.e, w: 0.12 }); urlHits.plain = true; }
    }
    if (urlHits.brand) hits.push({ label: "Web address imitates a known brand (" + urlHits.brand.toUpperCase() + ")", w: 0.5, cat: "Phishing / account threat", why: "A brand name inside an unusual address is typical of a look-alike site. Type the official address yourself instead." });
    if (urlHits.short) hits.push({ label: "Shortened link hides the real destination", w: 0.4, cat: "Phishing / account threat", why: "Short links make it impossible to see where you will land before you tap." });
    if (urlHits.tld) hits.push({ label: "Link ends in " + urlHits.tld + ", often used for throwaway sites", w: 0.3, cat: "Phishing / account threat", why: "Some domain endings are cheap and heavily used for short-lived scam pages." });
    if (urlHits.plain) hits.push({ label: "Contains a link", w: 0.12, cat: "Other", why: "Links in unexpected messages deserve a second look even when nothing else is wrong." });

    var letters = text.replace(/[^A-Za-z]/g, "");
    if (letters.length > 40 && (letters.replace(/[^A-Z]/g, "").length / letters.length) > 0.5) hits.push({ label: "Mostly capital letters", w: 0.1, cat: "Other", why: "Shouting text is used to create alarm." });
    if (/!{3,}/.test(text)) hits.push({ label: "Repeated exclamation marks", w: 0.08, cat: "Other", why: "Heavy punctuation is a marker of mass-produced scam text." });

    var p = 1;
    hits.forEach(function (h) { p *= (1 - h.w); });
    var score = Math.round((1 - p) * 100);
    hits.sort(function (a, b) { return b.w - a.w; });

    var top = hits.filter(function (h) { return h.cat !== "Other"; })[0];
    return { score: score, hits: hits, ranges: ranges, cat: top ? top.cat : "Other" };
  }

  function mergeRanges(r) {
    r.sort(function (a, b) { return a.s - b.s || b.e - a.e; });
    var out = [];
    r.forEach(function (x) {
      var last = out[out.length - 1];
      if (last && x.s < last.e) { last.e = Math.max(last.e, x.e); last.w = Math.max(last.w, x.w); }
      else out.push({ s: x.s, e: x.e, w: x.w });
    });
    return out;
  }

  function annotate(text, ranges) {
    var merged = mergeRanges(ranges), html = "", pos = 0;
    merged.forEach(function (r) {
      html += esc(text.slice(pos, r.s));
      var cls = r.w >= 0.45 ? "m-high" : r.w >= 0.25 ? "m-mid" : "m-low";
      html += '<mark class="' + cls + '">' + esc(text.slice(r.s, r.e)) + "</mark>";
      pos = r.e;
    });
    html += esc(text.slice(pos));
    return html;
  }

  var C = 2 * Math.PI * 58;
  var lastCat = "Other";
  var lastText = "";

  function levelOf(score) { return score >= 55 ? "high" : score >= 25 ? "mid" : "low"; }

  function render(text) {
    text = text || "";
    lastText = text;
    var gauge = $("gauge"), badge = $("badge");
    if (!text.trim()) {
      $("score").textContent = "0";
      $("gval").setAttribute("stroke-dashoffset", C);
      gauge.className = "gauge";
      badge.className = "badge"; badge.textContent = "Waiting";
      $("vtitle").textContent = "Nothing to scan yet";
      $("vtext").textContent = "Paste a message above, or pick an example.";
      $("annotated").textContent = "";
      $("signals").innerHTML = "";
      $("advice").hidden = true;
      $("reportBtn").hidden = true;
      return;
    }
    $("advice").hidden = false;
    $("reportBtn").hidden = false;
    var res = analyse(text), lvl = levelOf(res.score);
    lastCat = res.cat;

    $("score").textContent = res.score;
    $("gval").setAttribute("stroke-dashoffset", (C * (1 - res.score / 100)).toFixed(2));
    gauge.className = "gauge lvl-" + lvl;
    badge.className = "badge lvl-" + lvl;
    badge.textContent = lvl === "high" ? "High risk" : lvl === "mid" ? "Suspicious" : "Low risk";

    var titles = { high: "Very likely a scam", mid: "Treat with caution", low: "No known scam patterns found" };
    var texts = {
      high: "Several strong signals match known fraud scripts. Do not reply, click or send money.",
      mid: "Some warning signs are present. Verify through an official channel before doing anything.",
      low: "A low score does not prove a message is safe. If anything feels off, check with the sender another way."
    };
    $("vtitle").textContent = titles[lvl];
    $("vtext").textContent = texts[lvl];
    $("annotated").innerHTML = annotate(text, res.ranges);

    var ul = $("signals");
    ul.innerHTML = "";
    if (!res.hits.length) {
      var li0 = document.createElement("li");
      li0.innerHTML = '<span class="chip lvl-low">0.00</span><strong>No signals</strong><p>None of the monitored patterns appear in this message.</p>';
      ul.appendChild(li0);
    }
    res.hits.forEach(function (h) {
      var l = h.w >= 0.45 ? "high" : h.w >= 0.25 ? "mid" : "low";
      var li = document.createElement("li");
      li.innerHTML = '<span class="chip lvl-' + l + '">' + h.w.toFixed(2) + "</span><strong>" + esc(h.label) + "</strong><p>" + esc(h.why) + "</p>";
      ul.appendChild(li);
    });

    var adv = {
      high: "<b>Next step:</b> do not respond. Contact your bank or mobile operator through their official number. If you already sent money or shared a PIN, tell them straight away and report it to the police.",
      mid: "<b>Next step:</b> pause. Verify the sender through a number or website you look up yourself, and ask someone you trust before acting.",
      low: "<b>Next step:</b> use normal care. Never share a PIN or one-time code, whoever asks."
    };
    $("advice").innerHTML = adv[lvl];
  }

  /* community board */
  var KEY = "cfs-reports-v1", CKEY = "cfs-confirms-v1";
  var mem = { reports: [], confirms: {} };

  function load(k, fallback) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }

  mem.reports = load(KEY, []);
  mem.confirms = load(CKEY, {});

  function allReports() { return mem.reports.concat(SEEDS); }

  function maskNumbers(s) { return s.replace(/\+?\d[\d\s-]{5,}\d/g, "[number hidden]"); }

  function renderBoard() {
    var list = allReports();
    var counts = {};
    CATS.forEach(function (c) { counts[c] = 0; });
    list.forEach(function (r) { counts[r.cat] = (counts[r.cat] || 0) + 1; });
    var max = Math.max.apply(null, CATS.map(function (c) { return counts[c]; }).concat([1]));

    var bars = $("bars");
    bars.innerHTML = "";
    CATS.forEach(function (c) {
      if (!counts[c]) return;
      var d = document.createElement("div");
      d.className = "bar";
      d.innerHTML = "<span>" + esc(c) + '</span><div class="track"><div class="fill" style="width:' + Math.round(counts[c] / max * 100) + '%"></div></div><span class="ct">' + counts[c] + "</span>";
      bars.appendChild(d);
    });

    var ul = $("reports");
    ul.innerHTML = "";
    list.forEach(function (r) {
      var li = document.createElement("li");
      li.className = "report";
      var done = !!mem.confirms[r.id];
      var total = (r.conf || 0) + (done ? 1 : 0);
      li.innerHTML =
        '<div class="meta"><b>' + esc(r.cat) + "</b><span>" + esc(r.ch) + "</span><span>" + esc(r.area || "Area not given") + "</span>" +
        (r.ex ? '<span class="ex">Example</span>' : "<span>" + esc(r.date || "") + "</span>") + "</div>" +
        "<p>" + esc(r.txt) + "</p>" +
        '<div class="row"><button type="button" class="btn small" data-conf="' + esc(r.id) + '"' + (done ? " disabled" : "") + ">" + (done ? "You saw this too" : "I saw this too") + '</button><span class="hint">' + total + " confirmed</span></div>";
      ul.appendChild(li);
    });
  }

  function init() {
    var sel = $("rCat");
    CATS.forEach(function (c) { var o = document.createElement("option"); o.textContent = c; sel.appendChild(o); });

    $("scanBtn").addEventListener("click", function () { render($("msg").value); });
    $("clearBtn").addEventListener("click", function () { $("msg").value = ""; render(""); $("msg").focus(); });
    $("msg").addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") render($("msg").value); });

    document.querySelectorAll("[data-sample]").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = SAMPLES[+b.getAttribute("data-sample")];
        $("msg").value = t;
        render(t);
      });
    });

    $("reportBtn").addEventListener("click", function () {
      $("rCat").value = lastCat;
      $("rTxt").value = maskNumbers(lastText).slice(0, 500);
      $("community").scrollIntoView({ behavior: "smooth", block: "start" });
      $("rTxt").focus({ preventScroll: true });
    });

    $("repForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var txt = maskNumbers($("rTxt").value.trim());
      var st = $("repStatus");
      if (txt.length < 15) { st.textContent = "Add a few more words so others can recognise it."; return; }
      var r = {
        id: "u" + Date.now(),
        cat: $("rCat").value, ch: $("rCh").value,
        area: $("rArea").value.trim(), txt: txt,
        date: new Date().toLocaleDateString("en-GB"), conf: 0
      };
      mem.reports.unshift(r);
      save(KEY, mem.reports);
      $("rTxt").value = "";
      st.textContent = "Report added to the board.";
      renderBoard();
    });

    $("reports").addEventListener("click", function (e) {
      var b = e.target.closest("[data-conf]");
      if (!b) return;
      mem.confirms[b.getAttribute("data-conf")] = true;
      save(CKEY, mem.confirms);
      renderBoard();
    });

    $("msg").value = SAMPLES[0];
    render(SAMPLES[0]);
    renderBoard();
  }

  init();
})();
