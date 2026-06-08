// ============================================================
// CODELINE.AI — Submissions.gs
// Submission-related functions:
//   - Intern Submit / Edit / Edit Request
//   - Admin: Get Pending, Grade, Approve Edit, Get Edit Requests
//   - Intern: Get History, Get Progress, Get Streak,
//             Get Pending Tasks, Get Performance
//   - Utility: fixGhostRows
// ============================================================


// ============================================================
// INTERN — SUBMIT TASK
// (Source: Coreapi.gs → api_internSubmitTask)
// ============================================================

function api_internSubmitTask(b) {
  try {
    const internId      = (b.internId || "").trim();
    const assignedTaskId = (b.assignedTaskId || b.taskId || "").trim();
    const link          = (b.link || "").trim();
    const note          = (b.note || "").trim();

    if (!internId || !assignedTaskId)
      return { success: false, message: "internId aur assignedTaskId required ❌" };

    const subsSh = sh_(SHEET_SUBS);

    // Duplicate check
    const allSubs = mapRows_(subsSh);
    const dup = allSubs.find(s =>
      String(s.InternID) === internId &&
      String(s.AssignedTaskID) === assignedTaskId
    );
    if (dup) return { success: false, message: "Already submitted ❌" };

    const lastId = getLastId_(subsSh, 1);
    const subId  = generateId_("SUB", lastId);

    subsSh.appendRow([
      subId,           // A - SubmissionID
      internId,        // B - InternID
      assignedTaskId,  // C - AssignedTaskID
      link,            // D - Link
      note,            // E - Details
      nowISO_(),       // F - SubmittedAt
      "",              // G - EditedAt
      "",              // H - Grade
      "",              // I - Remarks
      "",              // J - ReviewedAt
      "Pending",       // K - FinalStatus
      "",              // L - EditRequestStatus
      ""               // M - IsEditAllowed
    ]);

    return { success: true, message: "Task submitted ✅", submissionId: subId };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// INTERN — EDIT SUBMISSION
// (Source: Coreapi.gs → api_internEditSubmission)
// ============================================================

function api_internEditSubmission(b) {
  try {
    const subsSh  = sh_(SHEET_SUBS);
    const data    = subsSh.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());

    const subIdCol      = headers.indexOf("SubmissionID") + 1;
    const linkCol       = headers.indexOf("Link") + 1;
    const noteCol       = headers.indexOf("Note") + 1;
    const editReqCol    = headers.indexOf("EditRequestStatus") + 1;
    const editAppCol    = headers.indexOf("IsEditAllowed") + 1;
    const submittedAtCol = headers.indexOf("SubmittedAt") + 1;

    let found = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][subIdCol - 1]).trim() === String(b.submissionId).trim()) {
        found = i + 1;
        break;
      }
    }

    if (found === -1)
      return { success: false, message: "Submission not found ❌" };

    const isApproved = String(data[found - 1][editAppCol - 1] || "").toLowerCase() === "yes";
    if (!isApproved)
      return { success: false, message: "Edit not approved yet ❌" };

    if (linkCol > 0 && b.link)        subsSh.getRange(found, linkCol).setValue(b.link);
    if (noteCol > 0 && b.note)        subsSh.getRange(found, noteCol).setValue(b.note);
    if (submittedAtCol > 0)           subsSh.getRange(found, submittedAtCol).setValue(nowISO_());
    if (editReqCol > 0)               subsSh.getRange(found, editReqCol).setValue("");
    if (editAppCol > 0)               subsSh.getRange(found, editAppCol).setValue("");

    return { success: true, message: "Submission updated ✅" };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// INTERN — REQUEST EDIT PERMISSION
// (Source: Coreapi.gs → api_internRequestEditPermission)
// ============================================================

function api_internRequestEditPermission(b) {
  try {
    const subsSh  = sh_(SHEET_SUBS);
    const data    = subsSh.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());

    const subIdCol   = headers.indexOf("SubmissionID") + 1;
    const editReqCol = headers.indexOf("EditRequestStatus") + 1;

    if (editReqCol === 0)
      return { success: false, message: "EditRequested column not found ❌" };

    let found = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][subIdCol - 1]).trim() === String(b.submissionId).trim()) {
        found = i + 1;
        break;
      }
    }

    if (found === -1)
      return { success: false, message: "Submission not found ❌" };

    subsSh.getRange(found, editReqCol).setValue("Yes");

    // Save RequestedAt timestamp
    const reqAtCol = headers.indexOf("RequestedAt") + 1;
    if (reqAtCol > 0) subsSh.getRange(found, reqAtCol).setValue(nowISO_());

    // Save NewLink if provided
    const newLinkCol = headers.indexOf("NewLink") + 1;
    if (newLinkCol > 0 && b.newLink) subsSh.getRange(found, newLinkCol).setValue(b.newLink);

    return { success: true, message: "Edit request sent ✅" };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// ADMIN — GET PENDING SUBMISSIONS
// (Source: Coreapi.gs → api_getPendingSubmissions)
// ============================================================

function api_getPendingSubmissions(adminId, adminPass) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };

    SpreadsheetApp.flush();

    const subsSh    = sh_(SHEET_SUBS);
    const internsSh = sh_(SHEET_INTERNS);

    const subData    = subsSh.getDataRange().getValues();
    const internData = internsSh.getDataRange().getValues();

    if (subData.length <= 1)
      return { success: true, submissions: [] };

    const subHeaders    = subData[0].map(h => String(h).trim());
    const internHeaders = internData[0].map(h => String(h).trim());

    // Interns → Map for fast lookup
    const internsMap = {};
    for (let i = 1; i < internData.length; i++) {
      const obj = {};
      internHeaders.forEach((h, idx) => { obj[h] = internData[i][idx]; });
      internsMap[String(obj.InternID).trim()] = obj;
    }

    const pending = [];
    for (let i = 1; i < subData.length; i++) {
      const submission = {};
      subHeaders.forEach((h, idx) => { submission[h] = subData[i][idx]; });

      const status = String(submission.FinalStatus || "").trim();
      // ✅ FIX: sirf explicitly "Pending" ya blank (fresh submit) wali rows lo
      // "Approved" / "Rejected" rows strictly bahar karo
      if (status.toLowerCase() === "approved" || status.toLowerCase() === "rejected") continue;
      // Ghost row — SubmissionID blank hone par skip
      if (!String(submission.SubmissionID || "").trim()) continue;

      const intern = internsMap[String(submission.InternID || "").trim()] || {};

      pending.push({
        ...submission,
        Name:         intern.Name || "",
        InternName:   intern.Name || "",
        BatchName:    intern.BatchName || "",
        SubmittedAt:  submission.SubmittedAt ? normalizeDate_(submission.SubmittedAt) : ""
      });
    }

    pending.sort((a, b) =>
      new Date(b.SubmittedAt || 0) - new Date(a.SubmittedAt || 0)
    );

    Logger.log("Pending submissions count: " + pending.length);
    return { success: true, submissions: pending };

  } catch (err) {
    Logger.log("api_getPendingSubmissions Error: " + err);
    return { success: false, message: err.message || String(err) };
  }
}


// ============================================================
// ADMIN — GRADE SUBMISSION
// (Source: TasksDocs.gs → api_adminGradeSubmission)
// ============================================================

function api_adminGradeSubmission(b) {
  try {
    if (!isAdmin_(b.adminId, b.adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const submissionId = String(b.submissionId || "").trim();
    const finalStatus  = String(b.finalStatus || "Approved").trim();
    const grade        = String(b.grade || "").trim();
    const remarks      = String(b.remarks || "").trim();

    if (!submissionId)
      return { success: false, message: "Submission ID required ❌" };

    const subs = sh_(SHEET_SUBS);
    const data = subs.getDataRange().getValues();

    if (data.length < 2)
      return { success: false, message: "No submissions found ❌" };

    const headers = data[0].map(h => String(h).trim());

    const COL_SUBMISSIONID = headers.indexOf("SubmissionID") + 1;
    const COL_INTERNID     = headers.indexOf("InternID") + 1;
    const COL_GRADE        = headers.indexOf("Grade") + 1;
    const COL_REMARKS      = headers.indexOf("Remarks") + 1;
    const COL_REVIEWEDAT   = headers.indexOf("ReviewedAt") + 1;
    const COL_FINALSTATUS  = headers.indexOf("FinalStatus") + 1;

    if (COL_SUBMISSIONID < 1 || COL_FINALSTATUS < 1)
      return { success: false, message: "SubmissionID or FinalStatus column missing ❌" };

    let sRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][COL_SUBMISSIONID - 1]).trim() === submissionId) {
        sRow = i + 1;
        break;
      }
    }

    if (sRow === -1)
      return { success: false, message: "Submission not found ❌" };

    if (COL_GRADE > 0)      subs.getRange(sRow, COL_GRADE).setValue(grade);
    if (COL_REMARKS > 0)    subs.getRange(sRow, COL_REMARKS).setValue(remarks);
    if (COL_REVIEWEDAT > 0) subs.getRange(sRow, COL_REVIEWEDAT).setValue(nowISO_());
    subs.getRange(sRow, COL_FINALSTATUS).setValue(finalStatus);

    SpreadsheetApp.flush();

    // ✅ FIX: Verify + 1 retry — GAS kabhi kabhi first write drop karta hai
    let writtenStatus = String(subs.getRange(sRow, COL_FINALSTATUS).getDisplayValue()).trim();
    if (writtenStatus.toLowerCase() !== finalStatus.toLowerCase()) {
      Utilities.sleep(500);
      subs.getRange(sRow, COL_FINALSTATUS).setValue(finalStatus);
      SpreadsheetApp.flush();
      writtenStatus = String(subs.getRange(sRow, COL_FINALSTATUS).getDisplayValue()).trim();
    }

    if (writtenStatus.toLowerCase() !== finalStatus.toLowerCase())
      return { success: false, message: "Failed to update FinalStatus ❌" };

    // Send review email to intern
    if (COL_INTERNID > 0) {
      const internId = String(subs.getRange(sRow, COL_INTERNID).getValue()).trim();
      if (internId) {
        const internsSheet = sh_(SHEET_INTERNS);
        const internRow    = findRow_(internsSheet, 1, internId);
        if (internRow !== -1) {
          const name  = internsSheet.getRange(internRow, 2).getValue();
          const email = internsSheet.getRange(internRow, 3).getValue();
          if (email) {
            sendEmail_(
              email,
              `${INSTITUTE_NAME} — Task Review Result`,
              buildTaskReviewEmail_(name, finalStatus, grade, remarks)
            );
            try { checkAndSendAchievementEmail_(internId); } catch (e) { Logger.log(e); }
          }
        }
      }
    }

    Logger.log("Submission Updated => " + submissionId + " | Status: " + finalStatus);
    return { success: true, message: "Submission " + finalStatus + " successfully ✅" };

  } catch (err) {
    Logger.log("api_adminGradeSubmission Error: " + err);
    return { success: false, message: err.toString() };
  }
}


// ============================================================
// ADMIN — GET EDIT REQUESTS
// (Source: Coreapi.gs → api_getEditRequests)
// ============================================================

function api_getEditRequests(adminId, adminPass) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const subs     = mapRows_(sh_(SHEET_SUBS));
    const requests = subs
      .filter(s =>
        String(s.EditRequestStatus || "").toLowerCase() === "yes" &&
        String(s.IsEditAllowed     || "").toLowerCase() !== "yes"
      )
      .map(s => ({
        SubmissionID:      s.SubmissionID,
        InternID:          s.InternID,
        AssignedTaskID:    s.AssignedTaskID,
        Link:              s.Link || "",
        NewLink:           s.NewLink || "",
        EditRequestStatus: s.EditRequestStatus,
        RequestedAt:       s.RequestedAt ? normalizeDate_(s.RequestedAt) : (s.SubmittedAt ? normalizeDate_(s.SubmittedAt) : ""),
        SubmittedAt:       s.SubmittedAt || ""
      }));

    return { success: true, requests };
  } catch (err) {
    Logger.log("api_getEditRequests error: " + err);
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// ADMIN — APPROVE EDIT REQUEST
// (Source: Coreapi.gs → api_adminApproveEdit)
// ============================================================

function api_adminApproveEdit(b) {
  try {
    if (!isAdmin_(b.adminId, b.adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const subs    = sh_(SHEET_SUBS);
    const data    = subs.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());

    const subIdCol      = headers.indexOf("SubmissionID") + 1;
    const approvedCol   = headers.indexOf("IsEditAllowed") + 1;
    const approvedAtCol = headers.indexOf("EditedAt") + 1;

    if (approvedCol === 0)
      return { success: false, message: "EditApproved column not found ❌" };

    let found = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][subIdCol - 1]).trim() === String(b.submissionId).trim()) {
        found = i + 1;
        break;
      }
    }

    if (found === -1)
      return { success: false, message: "Submission not found ❌" };

    subs.getRange(found, approvedCol).setValue("Yes");
    if (approvedAtCol > 0) subs.getRange(found, approvedAtCol).setValue(nowISO_());

    // If NewLink exists, update the Link column directly
    const newLinkCol = headers.indexOf("NewLink") + 1;
    const linkCol    = headers.indexOf("Link") + 1;
    if (newLinkCol > 0 && linkCol > 0) {
      const newLinkVal = String(data[found - 1][newLinkCol - 1] || "").trim();
      if (newLinkVal) {
        subs.getRange(found, linkCol).setValue(newLinkVal);
        // Clear NewLink after applying
        subs.getRange(found, newLinkCol).setValue("");
      }
    }

    // Also clear EditRequestStatus and IsEditAllowed after applying
    const editReqCol2 = headers.indexOf("EditRequestStatus") + 1;
    if (editReqCol2 > 0) subs.getRange(found, editReqCol2).setValue("");
    subs.getRange(found, approvedCol).setValue("");

    SpreadsheetApp.flush();
    return { success: true, message: "Edit approved & link updated ✅" };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// INTERN — GET TASK HISTORY
// (Source: Coreapi.gs → api_getInternHistory)
// ============================================================

function api_getInternHistory(internId) {
  try {
    if (!internId) return { success: false, message: "internId required ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow      = findRow_(internsSh, 1, internId);
    if (iRow === -1) return { success: false, message: "Intern not found ❌" };

    const batchId        = internsSh.getRange(iRow, 4).getValue();
    const internCreatedAt = normalizeDate_(internsSh.getRange(iRow, 8).getValue());

    const tasks = mapRows_(sh_(SHEET_TASKS)).filter(t => {
      const taskDate = normalizeDate_(t.AssignedAt || t.Date);
      const isBatch  = String(t.BatchID) === String(batchId)
        && (!t.InternID || String(t.InternID).trim() === "")
        && taskDate >= internCreatedAt;
      return isBatch || String(t.InternID) === String(internId);
    });

    const subs = mapRows_(sh_(SHEET_SUBS)).filter(s =>
      String(s.InternID) === String(internId)
    );

    const history = tasks.map(t => {
      const sub = subs.find(s => String(s.AssignedTaskID) === String(t.AssignedTaskID));
      return {
        AssignedTaskID: t.AssignedTaskID,
        Title:          t.Title || t.TaskTitle || "",
        Date:           normalizeDate_(t.Date),
        Submitted:      !!sub,
        SubmittedAt:    sub ? normalizeDate_(sub.SubmittedAt) : "",
        Grade:          sub ? sub.Grade : "",
        Remarks:        sub ? sub.Remarks : "",
        FinalStatus:    sub ? sub.FinalStatus : "Pending"
      };
    }).sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return { success: true, history };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// INTERN — GET PROGRESS / PERFORMANCE
// (Source: Coreapi.gs → api_getInternProgress)
// ============================================================

function api_getInternProgress(internId) {
  try {
    if (!internId) return { success: false, message: "internId required ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow      = findRow_(internsSh, 1, internId);
    if (iRow === -1) return { success: false, message: "Intern not found ❌" };

    const batchId        = internsSh.getRange(iRow, 4).getValue();
    const internCreatedAt = normalizeDate_(internsSh.getRange(iRow, 8).getValue());

    const tasks = mapRows_(sh_(SHEET_TASKS)).filter(t => {
      const taskDate = normalizeDate_(t.AssignedAt || t.Date);
      const isBatch  = String(t.BatchID) === String(batchId)
        && (!t.InternID || String(t.InternID).trim() === "")
        && taskDate >= internCreatedAt;
      return isBatch || String(t.InternID) === String(internId);
    });

    const subs     = mapRows_(sh_(SHEET_SUBS)).filter(s =>
      String(s.InternID) === String(internId)
    );
    const total    = tasks.length;
    const submitted = subs.length;
    const approved  = subs.filter(s =>
      String(s.FinalStatus).toLowerCase() === "approved"
    ).length;
    const avgScore  = subs.length
      ? Math.round(subs.reduce((sum, s) => sum + gradeScore(s.Grade), 0) / subs.length)
      : 0;

    return { success: true, total, submitted, approved, avgScore };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}

// Alias used by intern.html
function api_getInternPerformance(internId) {
  return api_getInternProgress(internId);
}


// ============================================================
// INTERN — GET STREAK
// (Source: Coreapi.gs → api_getInternStreak)
// ============================================================

function api_getInternStreak(internId) {
  try {
    if (!internId) return { success: false, message: "internId required ❌" };

    const subs = mapRows_(sh_(SHEET_SUBS))
      .filter(s => String(s.InternID) === String(internId))
      .map(s => normalizeDate_(s.SubmittedAt))
      .filter(Boolean)
      .sort()
      .reverse();

    const uniqueDays = [...new Set(subs)];
    let streak = 0;
    let check  = today_();

    for (const day of uniqueDays) {
      if (day === check) {
        streak++;
        const d = new Date(check);
        d.setDate(d.getDate() - 1);
        check = d.toISOString().slice(0, 10);
      } else break;
    }

    return { success: true, streak };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// INTERN — GET PENDING TASKS (unsubmitted)
// (Source: Coreapi.gs → api_getMyTasksForSubmit)
// ============================================================

function api_getMyTasksForSubmit(internId) {
  try {
    if (!internId) return { success: false, message: "internId required ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow      = findRow_(internsSh, 1, internId);
    if (iRow === -1) return { success: false, message: "Intern not found ❌" };

    const batchId        = internsSh.getRange(iRow, 4).getValue();
    const internCreatedAt = normalizeDate_(internsSh.getRange(iRow, 8).getValue());

    const tasks = mapRows_(sh_(SHEET_TASKS)).filter(t => {
      const taskDate = normalizeDate_(t.AssignedAt || t.Date);
      const isBatch  = String(t.BatchID) === String(batchId)
        && (!t.InternID || String(t.InternID).trim() === "")
        && taskDate >= internCreatedAt;
      return isBatch || String(t.InternID) === String(internId);
    });

    const subs = mapRows_(sh_(SHEET_SUBS)).filter(s =>
      String(s.InternID) === String(internId)
    );

    const pending = tasks.filter(t =>
      !subs.find(s => String(s.AssignedTaskID) === String(t.AssignedTaskID))
    );

    return { success: true, tasks: pending };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}

// Alias
function api_getInternPendingTasks(internId) {
  return api_getMyTasksForSubmit(internId);
}


// ============================================================
// UTILITY — FIX GHOST ROWS (empty SubmissionID rows)
// (Source: TasksDocs.gs → fixGhostRows)
// ============================================================

function fixGhostRows() {
  const subs    = sh_(SHEET_SUBS);
  const data    = subs.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const subIdCol = headers.indexOf("SubmissionID");

  // Bottom-up delete taaki row index shift na ho
  for (let i = data.length - 1; i >= 1; i--) {
    const subId = String(data[i][subIdCol] || "").trim();
    if (!subId) {
      Logger.log("Deleting ghost row: " + (i + 1) + " | Data: " + JSON.stringify(data[i]));
      subs.deleteRow(i + 1);
    }
  }
  SpreadsheetApp.flush();
  Logger.log("✅ Ghost rows cleaned");
}