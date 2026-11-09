// Bot Team dashboard data. The CRM export job (fix.mjs, FIX_STEP=export) reads a few tabs of the SSS Pipeline sheet,
// boils them down here into one small summary, and saves it as settings/botdash. The CRM's Bot team page draws it.
// Pure function: tabs in (arrays of rows, header row first), summary out — so it can be tested without Google.

const DAY = 86400000;

// "2026-11-09 09:26 MT", "2026-11-09 10:00", "2026-10-24 00:50 MDT", "11/9/2026 9:32:40" — all Mountain time.
export function mtTime(s) {
  const t = String(s || "").trim(); if (!t) return 0;
  let y, mo, d, h = 0, mi = 0;
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; h = +(m[4] || 0); mi = +(m[5] || 0); }
  else { m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/); if (!m) return 0; mo = +m[1]; d = +m[2]; y = +m[3]; h = +(m[4] || 0); mi = +(m[5] || 0); }
  // daylight time (UTC-6) from the second Sunday of March to the first Sunday of November, else UTC-7
  let off = 7;
  if (/MDT/.test(t)) off = 6; else if (/MST/.test(t)) off = 7;
  else {
    const sun = (yy, mm, n) => { const f = new Date(Date.UTC(yy, mm - 1, 1)).getUTCDay(); return 1 + ((7 - f) % 7) + 7 * (n - 1); };
    const k = mo * 100 + d, start = 300 + sun(y, 3, 2), end = 1100 + sun(y, 11, 1);
    if (k >= start && k < end) off = 6;
  }
  return Date.UTC(y, mo - 1, d, h + off, mi);
}

const rowsOf = (tab) => {
  const v = (tab || []).filter((r) => r && r.length); if (!v.length) return [];
  const H = v[0].map((h) => String(h || "").trim().toLowerCase().split(/\s|\(/)[0]);
  return v.slice(1).map((r) => { const o = {}; H.forEach((h, i) => { if (h && !(h in o)) o[h] = r[i] == null ? "" : String(r[i]); }); return o; });
};
const splitKeys = (s) => String(s || "").split(";").map((x) => x.trim()).filter(Boolean);
const short = (s, n) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const mtDay = (ms) => new Date(ms - 7 * 3600000).toISOString().slice(0, 10);

export function buildBotDash(tabs, now = Date.now()) {
  const roster = rowsOf(tabs.roster).filter((r) => r.bot).map((r) => ({
    name: r.bot, platform: r.platform || "", team: r.team || "", resp: r.responsibilities || "", schedule: r.schedule || "",
    logKeys: splitKeys(r.log_names).map((k) => k.toLowerCase()), ownerKeys: splitKeys(r.owner_keys),
    staleH: Number(r.stale_after_hours) || 0, notes: r.notes || "",
  }));
  const botOfLog = (agent) => { const a = String(agent || "").toLowerCase(); if (!a || /crm sync/.test(a)) return null;
    return roster.find((b) => b.logKeys.some((k) => a.indexOf(k) >= 0)) || null; };
  const ownerOf = (text) => { const m = String(text || "").match(/^\s*([A-Za-z0-9 ()'.\-]{2,40}?)\s*:/); if (!m) return null; const p = m[1].trim().toLowerCase();
    if (p === "matt" || p === "decide" || p === "decision") return "Matt";
    const b = roster.find((x) => x.ownerKeys.some((k) => k.toLowerCase() === p) || x.name.toLowerCase() === p); return b ? b.name : null; };

  // ---- runs (Log) ----
  const days = []; for (let i = 13; i >= 0; i--) days.push(mtDay(now - i * DAY));
  const log = rowsOf(tabs.log).map((r) => ({ t: mtTime(r.at), agent: r.agent, action: r.action, detail: r.detail })).filter((r) => r.t && r.t <= now + 3600000);
  const per = {}; roster.forEach((b) => { per[b.name] = { runs: [], last: null, errs: 0 }; });
  const errRe = /\b(failed|error|out of usage|usage limit|could not|couldn't|not linked|blocked|exited with)\b/i;
  log.forEach((r) => { const b = botOfLog(r.agent); if (!b) return; const p = per[b.name]; p.runs.push(r.t);
    if (!p.last || r.t >= p.last.t) p.last = r;
    if (now - r.t < DAY && errRe.test((r.action || "") + " " + (r.detail || "")) && !/nothing new|no errors?|0 errors?/i.test(r.action || "")) p.errs++; });

  // ---- findings ----
  const fRows = rowsOf(tabs.findings).filter((r) => r.finding_id);
  const open = [];
  fRows.forEach((r) => {
    const st = String(r.status || "").trim(); if (!/^new/i.test(st)) return;
    const act = String(r.action_for_matt || "").trim();
    let owner = ownerOf(r.headline) || ownerOf(act);
    if (!owner) owner = act && !/^(none|n\/a|-|none;.*|none\..*)$/i.test(act) ? "Matt" : ((botOfLog(r.agent) || {}).name || "Matt");
    const pr = String(r.priority || "").toUpperCase(); const prio = /HIGH|URGENT/.test(pr) ? "HIGH" : /MED/.test(pr) ? "MEDIUM" : /LOW|FYI/.test(pr) ? "LOW" : "NORMAL";
    open.push({ id: r.finding_id, t: mtTime(r.found_at), from: r.agent || "", owner, prio, area: r.area || "", headline: short(r.headline, 180), action: short(act, 220) });
  });
  const pRank = { HIGH: 0, MEDIUM: 1, NORMAL: 2, LOW: 3 };
  open.sort((a, b) => (pRank[a.prio] - pRank[b.prio]) || (b.t - a.t));
  const byOwner = {}; open.forEach((f) => { byOwner[f.owner] = (byOwner[f.owner] || 0) + 1; });
  const opened = days.map((d) => fRows.filter((r) => mtDay(mtTime(r.found_at)) === d).length);

  // ---- tokens ----
  const tok = {}; const tokDay = {}; let tokTot = 0;
  rowsOf(tabs.tokens).forEach((r) => { const t = mtTime(r.at); if (!t || now - t > 7 * DAY) return; const b = botOfLog(r.bot); const n = Number(String(r.est_tokens || "").replace(/[, ]/g, "")) || 0; if (!b || !n) return;
    tok[b.name] = (tok[b.name] || 0) + n; tokTot += n; const d = mtDay(t); tokDay[d] = (tokDay[d] || 0) + n; });

  // ---- bots ----
  const weekday = (() => { const d = new Date(now - 7 * 3600000).getUTCDay(); return d >= 1 && d <= 5; })();
  const bots = roster.map((b) => {
    const p = per[b.name]; const last = p.last; const ageH = last ? (now - last.t) / 3600000 : null;
    const runs = days.map((d) => p.runs.filter((t) => mtDay(t) === d).length);
    let state = "ok", why = "";
    if (!last) { state = /no schedule|on demand/i.test(b.schedule) ? "idle" : "unknown"; why = "no Log row yet"; }
    else if (b.staleH && weekday && ageH > b.staleH) { state = "late"; why = "last ran " + Math.round(ageH) + " h ago (expected within " + b.staleH + " h)"; }
    if (p.errs && state === "ok") { state = "warn"; why = p.errs + " problem" + (p.errs === 1 ? "" : "s") + " logged in the last 24 h"; }
    if (/no schedule|on demand/i.test(b.schedule) && state === "ok") state = "idle";
    const mine = open.filter((f) => f.owner === b.name);
    return { name: b.name, platform: b.platform, team: b.team, resp: b.resp, schedule: b.schedule, notes: b.notes, state, why,
      lastAt: last ? last.t : 0, lastAction: last ? short(last.action, 200) : "", lastDetail: last ? short(last.detail, 420) : "",
      runs24: p.runs.filter((t) => now - t < DAY).length, runs7: p.runs.filter((t) => now - t < 7 * DAY).length, runs,
      openCount: mine.length, openHigh: mine.filter((f) => f.prio === "HIGH").length,
      open: mine.slice(0, 6).map((f) => ({ id: f.id, prio: f.prio, headline: f.headline, t: f.t })),
      tokens7: tok[b.name] || 0, raised: open.filter((f) => (botOfLog(f.from) || {}).name === b.name).length };
  });

  // ---- Matt's queue ----
  const matt = open.filter((f) => f.owner === "Matt");

  // ---- health ----
  const hv = {}; (tabs.health || []).forEach((r) => { if (r && r[0]) hv[String(r[0]).trim()] = { v: String(r[1] == null ? "" : r[1]), n: String(r[2] == null ? "" : r[2]) }; });
  const health = { status: (hv.status || {}).v || "", note: (hv.status || {}).n || "", checked: (hv.checked_at || {}).v || "", build: (hv.crm_build || {}).v || "",
    unapplied: Number((hv.feed_rows_unapplied || {}).v) || 0, broken: Number((hv.feed_rows_broken || {}).v) || 0, total: Number((hv.feed_rows_total || {}).v) || 0 };

  // ---- run queue, purchase requests, buyers, marketing ----
  const rq = rowsOf(tabs.runq).filter((r) => r.run_id && !/EXAMPLE/i.test(r.job_name || ""));
  const rqStat = {}; rq.forEach((r) => { const s = (String(r.status || "").trim().toLowerCase().split(/[\s(]/)[0]) || "blank"; rqStat[s] = (rqStat[s] || 0) + 1; });
  const rqOpen = rq.filter((r) => !/^(done|failed)/i.test(r.status || "")).slice(-8).map((r) => ({ id: r.run_id, job: short(r.job_name, 90), machine: r.machine || "", status: short(r.status, 30), step: short(r.physical_step_needed, 120) }));
  const prs = rowsOf(tabs.prs).filter((r) => r.req_id);
  const prOpen = prs.filter((r) => /needs matt|waiting|hold|pending|new/i.test(r.status || "") && !/bought|purchased|done|declined|rejected|cancel/i.test(r.status || ""))
    .map((r) => ({ id: r.req_id, item: short(r.item, 110), cost: short(r.cost_usd, 60), by: r.requested_by || "", status: short(r.status, 40), needed: r.needed_by || "" }));
  const pros = rowsOf(tabs.prospects);
  const buyers = { A: 0, B: 0, C: 0, total: 0, new7: 0, miner: 0 };
  pros.forEach((r) => { const c = String(r.buyer_class || "").trim().toUpperCase().charAt(0); if (c === "A" || c === "B" || c === "C") { buyers[c]++; buyers.total++; }
    if (/buyer miner/i.test(r.source_list || "")) { buyers.miner++; const t = mtTime(r.last_verified); if (t && now - t < 7 * DAY) buyers.new7++; } });
  const posts = { planned: 0, posted: 0, held: 0, skipped: 0 };
  rowsOf(tabs.posts).forEach((r) => { const s = String(r.status || "").toLowerCase(); if (/^posted/.test(s)) posts.posted++; else if (/^held|hold/.test(s)) posts.held++; else if (/^skip/.test(s)) posts.skipped++; else if (s) posts.planned++; });
  const dec = rowsOf(tabs.decisions).filter((r) => r.decision_id);
  const dec7 = dec.filter((r) => { const t = mtTime(r.decided_at); return t && now - t < 7 * DAY; }).length;

  const totals = { bots: bots.length, ok: bots.filter((b) => b.state === "ok").length, late: bots.filter((b) => b.state === "late").length,
    warn: bots.filter((b) => b.state === "warn").length, idle: bots.filter((b) => b.state === "idle" || b.state === "unknown").length,
    runs24: bots.reduce((t, b) => t + b.runs24, 0), runs7: bots.reduce((t, b) => t + b.runs7, 0), open: open.length,
    openHigh: open.filter((f) => f.prio === "HIGH").length, matt: matt.length, tokens7: tokTot };
  return { v: 1, at: now, days, totals, health, bots, matt: matt.slice(0, 40),
    openTop: open.filter((f) => f.owner !== "Matt").slice(0, 30), byOwner, opened,
    tokensByDay: days.slice(-7).map((d) => tokDay[d] || 0),
    runQueue: { counts: rqStat, open: rqOpen }, purchases: { open: prOpen.slice(0, 15), count: prOpen.length },
    buyers, posts, decisions: { total: dec.length, last7: dec7 } };
}
