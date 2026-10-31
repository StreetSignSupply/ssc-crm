// look only: did the mail worker give every open task its bell notice? Counts only.
(async (T) => {
  const S = T.S; const tasks = [...S.activity.values()].filter((a) => !a.deleted && a.kind === "task" && !a.done);
  const nts = [...S.notifications.values()];
  return { open: tasks.length, noticed: tasks.filter((a) => a.assignNoticed).length, withBell: tasks.filter((a) => nts.some((n) => n.taskId === a.id)).length };
})
