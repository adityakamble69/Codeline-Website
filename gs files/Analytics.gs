// ============================================================
// CODELINE.AI — Analytics.gs
// Admin Analytics — Extended Stats, Charts Data, Reports
// ============================================================


// ============================================================
// MAIN ANALYTICS — Dashboard Overview
// Already declared in CoreAPI.gs as api_getAdminAnalytics.
// This file adds EXTENDED analytics functions only.
// ============================================================


// ============================================================
// api_getExtendedAnalytics
// Full analytics payload for the analytics page/tab.
// Returns:
//   - overview stats
//   - batch-wise breakdown
//   - submission grade distribution
//   - daily submission trend (last 30 days)
//   - top performers
//   - task completion rate per batch
//   - joining funnel (Pending / Accepted / Declined / Removed)
//   - document dispatch summary
// ============================================================
function api_getExtendedAnalytics(adminId, adminPass) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const internSheet = ss_().getSheetByName(SHEET_INTERNS);
    const batchSheet = ss_().getSheetByName(SHEET_BATCHES);
    const taskSheet = ss_().getSheetByName(SHEET_TASKS);
    const subSheet = ss_().getSheetByName(SHEET_SUBS);
    const joinSheet = ss_().getSheetByName(SHEET_JOINING);
    const removedSheet = ss_().getSheetByName(SHEET_REMOVED);

    const interns = internSheet ? mapRows_(internSheet) : [];
    const batches = batchSheet ? mapRows_(batchSheet) : [];
    const tasks = taskSheet ? mapRows_(taskSheet) : [];
    const subs = subSheet ? mapRows_(subSheet) : [];
    const joining = joinSheet ? mapRows_(joinSheet) : [];
    const removed = removedSheet ? mapRows_(removedSheet) : [];

    const activeInterns = interns.filter(
      x => String(x.Status || "").trim().toLowerCase() === "active"
    );
    const today = today_();

    // ── 1. Overview ──
    const todayTasks = tasks.filter(t => normalizeDate_(t.Date) === today);
    const todaySubs = subs.filter(s => normalizeDate_(s.SubmittedAt) === today);

    const overview = {
      totalInterns: activeInterns.length,
      totalBatches: batches.length,
      totalTasks: tasks.length,
      totalSubs: subs.length,
      todayTasks: todayTasks.length,
      todaySubs: todaySubs.length,
      totalRemoved: removed.length,
      pendingGrade: subs.filter(s => !s.FinalStatus || String(s.FinalStatus).trim() === "" || String(s.FinalStatus).trim() === "Pending").length,
      approvedSubs: subs.filter(s => String(s.FinalStatus || "").trim().toLowerCase() === "approved").length,
      rejectedSubs: subs.filter(s => String(s.FinalStatus || "").trim().toLowerCase() === "rejected").length,
    };

    // ── 2. Batch-wise breakdown ──
    const batchStats = batches.map(b => {
      const batchInterns = activeInterns.filter(i => String(i.BatchID) === String(b.BatchID));
      const batchTasks = tasks.filter(t => String(t.BatchID) === String(b.BatchID));
      const uniqueSubs = new Set();

      subs.forEach(s => {
        const belongsToBatch = batchInterns.some(
          i => String(i.InternID) === String(s.InternID)
        );

        if (belongsToBatch) {
          uniqueSubs.add(
            String(s.InternID) + "_" + String(s.TaskID)
          );
        }
      });

      const batchSubCount = uniqueSubs.size;

      const expectedSubs = batchInterns.length * batchTasks.length;

      let completionPct = expectedSubs > 0
        ? Math.round((batchSubCount / expectedSubs) * 100)
        : 0;

      completionPct = Math.min(completionPct, 100);

      return {
        batchId: b.BatchID,
        batchName: b.BatchName,
        startDate: b.StartDate || "",
        internCount: batchInterns.length,
        taskCount: batchTasks.length,
        submissionCount: batchSubCount,
        completionPct: completionPct,
      };
    });

    // ── 3. Grade distribution ──
    const gradeMap = {};
    subs.forEach(s => {
      const g = String(s.Grade || "Ungraded").trim();
      gradeMap[g] = (gradeMap[g] || 0) + 1;
    });

    // ── 4. Daily submission trend — last 30 days ──
    const trend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = subs.filter(s => normalizeDate_(s.SubmittedAt) === dateStr).length;
      trend.push({ date: dateStr, count });
    }

    // ── 5. Top performers (by approved submission count) ──
    const performerMap = {};
    subs.filter(s => String(s.FinalStatus || "").trim().toLowerCase() === "approved").forEach(s => {
      const id = String(s.InternID);
      performerMap[id] = (performerMap[id] || 0) + 1;
    });

    const topPerformers = Object.entries(performerMap)
      .map(([internId, approvedCount]) => {
        const intern = activeInterns.find(i => String(i.InternID) === internId) || {};
        const internSubs = subs.filter(s => String(s.InternID) === internId);
        const totalScore = internSubs.reduce((sum, s) => sum + gradeScore(s.Grade), 0);
        const avgScore = internSubs.length ? Math.round(totalScore / internSubs.length) : 0;
        return {
          internId,
          name: intern.Name || "—",
          batchName: intern.BatchName || "—",
          approvedCount,
          avgScore,
        };
      })
      .sort((a, b) => b.approvedCount - a.approvedCount || b.avgScore - a.avgScore)
      .slice(0, 10);

    // ── 6. Joining funnel ──
    const joiningFunnel = {
      total: joining.length,
      pending: joining.filter(j => String(j.Status || "").toLowerCase() === "pending").length,
      accepted: joining.filter(j => String(j.Status || "").toLowerCase() === "accepted").length,
      declined: joining.filter(j => String(j.Status || "").toLowerCase() === "declined").length,
      removed: joining.filter(j => String(j.Status || "").toLowerCase() === "removed").length,
    };

    // Better doc summary — read directly from sheet rows
    const docSummaryFixed = {};
    if (internSheet && internSheet.getLastRow() > 1) {
      Object.keys(DOC_COLS).forEach(docType => {
        const col = DOC_COLS[docType];
        const vals = internSheet.getRange(2, col, internSheet.getLastRow() - 1, 1).getValues().flat();
        const sent = vals.filter(v => v && String(v).trim() !== "").length;
        docSummaryFixed[docType] = { label: DOC_LABELS[docType], sent };
      });
    }

    // ── 8. Removal reason breakdown ──
    const removalReasons = {};
    removed.forEach(r => {
      const reason = String(r.Reason || "other").trim();
      removalReasons[reason] = (removalReasons[reason] || 0) + 1;
    });

    // ── 9. Average score per batch ──
    const batchAvgScore = batches.map(b => {
      const batchInterns = activeInterns.filter(i => String(i.BatchID) === String(b.BatchID));
      const batchSubs = subs.filter(s =>
        batchInterns.some(i => String(i.InternID) === String(s.InternID))
      );
      const avg = batchSubs.length
        ? Math.round(batchSubs.reduce((sum, s) => sum + gradeScore(s.Grade), 0) / batchSubs.length)
        : 0;
      return { batchId: b.BatchID, batchName: b.BatchName, avgScore: avg };
    });

    return {
      success: true,
      overview,
      batchStats,
      gradeMap,
      trend,
      topPerformers,
      joiningFunnel,
      docSummary: docSummaryFixed,
      removalReasons,
      batchAvgScore,
      generatedAt: nowISO_(),
    };

  } catch (err) {
    Logger.log("api_getExtendedAnalytics error: " + err.toString());
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// api_getInternAnalytics
// Per-intern analytics for the admin's intern detail view.
// ============================================================
function api_getInternAnalytics(adminId, adminPass, internId) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };

    if (!internId)
      return { success: false, message: "internId required ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow === -1)
      return { success: false, message: "Intern not found ❌" };

    const internData = mapRows_(internsSh).find(x => String(x.InternID) === internId);
    const { PasswordHash, ...safeIntern } = internData || {};

    const batchId = safeIntern.BatchID;

    const allTasks = mapRows_(sh_(SHEET_TASKS)).filter(t =>
      (String(t.BatchID) === String(batchId) && (!t.InternID || String(t.InternID).trim() === "")) ||
      String(t.InternID) === String(internId)
    );

    const internSubs = mapRows_(sh_(SHEET_SUBS)).filter(s =>
      String(s.InternID) === String(internId)
    );

    const totalTasks = allTasks.length;
    const submitted = internSubs.length;
    const approved = internSubs.filter(s => String(s.FinalStatus || "").trim().toLowerCase() === "approved").length;
    const rejected = internSubs.filter(s => String(s.FinalStatus || "").trim().toLowerCase() === "rejected").length;
    const pending = totalTasks - submitted;
    const completionPct = totalTasks > 0 ? Math.round((submitted / totalTasks) * 100) : 0;
    const avgScore = submitted
      ? Math.round(internSubs.reduce((sum, s) => sum + gradeScore(s.Grade), 0) / submitted)
      : 0;

    // Grade distribution for this intern
    const gradeMap = {};
    internSubs.forEach(s => {
      const g = String(s.Grade || "Ungraded").trim();
      gradeMap[g] = (gradeMap[g] || 0) + 1;
    });

    // Submission timeline (last 30 days)
    const timeline = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = internSubs.filter(s => normalizeDate_(s.SubmittedAt) === dateStr).length;
      timeline.push({ date: dateStr, count });
    }

    // Streak
    const streakResult = api_getInternStreak(internId);
    const streak = streakResult.success ? streakResult.streak : 0;

    // Document status
    const docStatus = {};
    Object.keys(DOC_COLS).forEach(docType => {
      const val = internsSh.getRange(iRow, DOC_COLS[docType]).getValue();
      docStatus[docType] = { label: DOC_LABELS[docType], sent: !!(val && String(val).trim()) };
    });

    return {
      success: true,
      intern: safeIntern,
      stats: {
        totalTasks,
        submitted,
        approved,
        rejected,
        pending,
        completionPct,
        avgScore,
        streak,
      },
      gradeMap,
      timeline,
      docStatus,
    };

  } catch (err) {
    Logger.log("api_getInternAnalytics error: " + err.toString());
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// api_getBatchAnalytics
// Per-batch analytics.
// ============================================================
function api_getBatchAnalytics(adminId, adminPass, batchId) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };

    if (!batchId)
      return { success: false, message: "batchId required ❌" };

    const batchSh = sh_(SHEET_BATCHES);
    const batchRow = findRow_(batchSh, 1, batchId);
    if (batchRow === -1)
      return { success: false, message: "Batch not found ❌" };

    const batchName = batchSh.getRange(batchRow, 2).getValue();
    const startDate = batchSh.getRange(batchRow, 3).getValue();

    const internsSh = sh_(SHEET_INTERNS);
    const batchInterns = mapRows_(internsSh)
      .filter(i => String(i.BatchID) === String(batchId) && String(i.Status) === "Active")
      .map(i => { const { PasswordHash, ...s } = i; return s; });

    const allTasks = mapRows_(sh_(SHEET_TASKS)).filter(t => String(t.BatchID) === String(batchId));
    const allSubs = mapRows_(sh_(SHEET_SUBS)).filter(s =>
      batchInterns.some(i => String(i.InternID) === String(s.InternID))
    );

    const uniqueSubs = new Set();

    allSubs.forEach(s => {
      uniqueSubs.add(
        String(s.InternID) + "_" + String(s.TaskID)
      );
    });

    const expectedSubs = batchInterns.length * allTasks.length;

    let completionPct = expectedSubs > 0
      ? Math.round((uniqueSubs.size / expectedSubs) * 100)
      : 0;

    completionPct = Math.min(completionPct, 100);

    // Per-intern summary within batch
    const internStats = batchInterns.map(intern => {
      const internSubs = allSubs.filter(s => String(s.InternID) === String(intern.InternID));
      const approved = internSubs.filter(s => String(s.FinalStatus || "").trim().toLowerCase() === "approved").length;
      const avgScore = internSubs.length
        ? Math.round(internSubs.reduce((sum, s) => sum + gradeScore(s.Grade), 0) / internSubs.length)
        : 0;
      return {
        internId: intern.InternID,
        name: intern.Name,
        submitted: internSubs.length,
        approved,
        avgScore,
        completionPct: allTasks.length > 0 ? Math.round((internSubs.length / allTasks.length) * 100) : 0,
      };
    }).sort((a, b) => b.avgScore - a.avgScore);

    // Grade distribution across batch
    const gradeMap = {};
    allSubs.forEach(s => {
      const g = String(s.Grade || "Ungraded").trim();
      gradeMap[g] = (gradeMap[g] || 0) + 1;
    });

    return {
      success: true,
      batchId,
      batchName,
      startDate: startDate ? normalizeDate_(startDate) : "",
      internCount: batchInterns.length,
      taskCount: allTasks.length,
      submissionCount: allSubs.length,
      completionPct,
      gradeMap,
      internStats,
    };

  } catch (err) {
    Logger.log("api_getBatchAnalytics error: " + err.toString());
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// api_getJoiningAnalytics
// Joining funnel stats — for the admin joining section.
// ============================================================
function api_getJoiningAnalytics(adminId, adminPass) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const joinSheet = ss_().getSheetByName(SHEET_JOINING);
    if (!joinSheet)
      return { success: true, funnel: { total: 0, pending: 0, accepted: 0, declined: 0, removed: 0 }, trend: [] };

    const joining = mapRows_(joinSheet);

    const funnel = {
      total: joining.length,
      pending: joining.filter(j => String(j.Status || "").toLowerCase() === "pending").length,
      accepted: joining.filter(j => String(j.Status || "").toLowerCase() === "accepted").length,
      declined: joining.filter(j => String(j.Status || "").toLowerCase() === "declined").length,
      removed: joining.filter(j => String(j.Status || "").toLowerCase() === "removed").length,
    };

    // Duration breakdown
    const durationMap = {};
    joining.forEach(j => {
      const d = String(j.Duration || "Unknown").trim();
      durationMap[d] = (durationMap[d] || 0) + 1;
    });

    // College breakdown (top 10)
    const collegeMap = {};
    joining.forEach(j => {
      const c = String(j.College || "Unknown").trim();
      if (c) collegeMap[c] = (collegeMap[c] || 0) + 1;
    });
    const topColleges = Object.entries(collegeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([college, count]) => ({ college, count }));

    return {
      success: true,
      funnel,
      durationMap,
      topColleges,
    };

  } catch (err) {
    Logger.log("api_getJoiningAnalytics error: " + err.toString());
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// doGet route additions — add these inside the doGet try block
// in Config.gs alongside the existing route checks:
//
//   if (action === "getExtendedAnalytics")
//     return respond(api_getExtendedAnalytics(e.parameter.adminId || "", e.parameter.adminPass || ""));
//   if (action === "getInternAnalytics")
//     return respond(api_getInternAnalytics(e.parameter.adminId || "", e.parameter.adminPass || "", e.parameter.internId || ""));
//   if (action === "getBatchAnalytics")
//     return respond(api_getBatchAnalytics(e.parameter.adminId || "", e.parameter.adminPass || "", e.parameter.batchId || ""));
//   if (action === "getJoiningAnalytics")
//     return respond(api_getJoiningAnalytics(e.parameter.adminId || "", e.parameter.adminPass || ""));
// ============================================================