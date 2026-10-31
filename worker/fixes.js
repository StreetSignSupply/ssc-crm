// look only: tasks vs bell notices vs task emails; Q-1024's lines (kinds and picture sources); win rate inputs. Counts only.
(async (T) => {
  const S = T.S, out = {};
  const tasks = [...S.activity.values()].filter((a) => !a.deleted && (a.kind === "task" || a.type === "task"));
  out.tasks = tasks.length; out.assigned = tasks.filter((a) => a.assigneeId).length;
  out.taskNoAssignee = tasks.filter((a) => !a.assigneeId).length;
  out.byAI = tasks.filter((a) => a.who === "AI" || a.assignedByName === "AI" || !a.assignedById).length;
  const nts = [...S.notifications.values()]; out.notes = nts.length;
  out.tasksWithNote = tasks.filter((a) => nts.some((n) => n.taskId === a.id)).length;
  const team = [...S.team.values()].filter((t) => !t.deleted); out.team = team.length;
  out.assigneeNotTeam = tasks.filter((a) => a.assigneeId && !S.team.get(a.assigneeId)).length;
  const db = T.getDb(); try { const m = await db.collection("mail").get(); const d = m.docs.map((x) => x.data());
    out.mail = { all: d.length, notice: d.filter((x) => x.kind === "notice").length, legacy: d.filter((x) => !x.status && !x.kind).length, legacySent: d.filter((x) => !x.kind && x.status === "sent").length, failed: d.filter((x) => x.status === "failed").length,
      errs: [...new Set(d.filter((x) => x.status === "failed").map((x) => String(x.err || x.error || "").replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<e>").slice(0, 60)))].slice(0, 4) }; } catch (e) { out.mail = "err " + e.message; }
  // newest few tasks: what made them
  out.recent = tasks.sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 6).map((a) => ({ at: a.at, by: a.assignedById ? (a.assignedById === a.assigneeId ? "self" : "other") : "none", src: a.feedId ? "agents" : a.who === "AI" ? "AI" : "crm", note: nts.some((n) => n.taskId === a.id) }));
  const p = [...S.projects.values()].find((x) => !x.deleted && (x.quote === "Q-1024" || String(x.quote || "").indexOf("1024") >= 0));
  out.q = p ? { num: p.num, lines: (p.orderLines || []).map((l) => (T.isCharge(l) ? "chg" : T.lineProd(l)) + ":" + (l.qty || "") + ":" + (/stop|R1-1/i.test((l.desc || "") + (l.code || "")) ? "STOP pic=" + (function () { try { const u = T.linePic(p, l); return u ? (/^data:/.test(u) ? "data" + u.length : u.slice(0, 50)) : "none"; } catch (e) { return "err"; } })() + " fb=" + (function () { try { const u = T.picFb(l); return u ? (/^data:/.test(u) ? "data" : u.slice(0, 40)) : "none"; } catch (e) { return "err"; } })() + " web=" + String(l.webImg || "").slice(0, 50) : "")) } : "no Q-1024";
  return out;
})
