// ============================================================
// CODELINE.AI — RemovedInterns.gs  (FIXED)
// Removed Interns Sheet System
// ============================================================

// ============================================================
// REMOVED INTERNS SHEET COLUMN MAP (1-indexed)
// ============================================================
// Col 1:  InternID
// Col 2:  Name
// Col 3:  Email
// Col 4:  Phone
// Col 5:  BatchID
// Col 6:  BatchName
// Col 7:  Duration
// Col 8:  Reason         (absent / late_submit / incomplete / conduct / voluntary / other)
// Col 9:  Reason Label   (Human readable)
// Col 10: Removed At     (Date)
// Col 11: Joined At      (Original CreatedAt)
// Col 12: Removed By     (Admin ID)
// ============================================================


function setupRemovedInternsSheet() {
  const ss = ss_();
  let sheet = ss.getSheetByName(SHEET_REMOVED);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_REMOVED);
  }

  const firstCell = sheet.getRange(1, 1).getValue();
  if (!firstCell) {
    sheet.appendRow([
      "InternID",
      "Name",
      "Email",
      "Phone",
      "BatchID",
      "BatchName",
      "Duration",
      "Reason",
      "Reason Label",
      "Removed At",
      "Joined At",
      "Removed By"
    ]);

    const headerRange = sheet.getRange(1, 1, 1, 12);
    headerRange.setBackground("#6b21a8");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);

    sheet.setColumnWidth(1, 110);
    sheet.setColumnWidth(2, 160);
    sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 120);
    sheet.setColumnWidth(5, 90);
    sheet.setColumnWidth(6, 120);
    sheet.setColumnWidth(7, 90);
    sheet.setColumnWidth(8, 110);
    sheet.setColumnWidth(9, 200);
    sheet.setColumnWidth(10, 120);
    sheet.setColumnWidth(11, 120);
    sheet.setColumnWidth(12, 100);

    Logger.log("✅ Removed Interns sheet created successfully.");
  } else {
    Logger.log("ℹ️ Removed Interns sheet already exists.");
  }
}


function archiveRemovedIntern_(internId, internName, internEmail, internPhone, batchId, batchName, duration, joinedAt, reason, removedByAdminId) {

  const reasonLabels = {
    absent:      "Consistent Absence / No Show",
    incomplete:  "Failure to Complete Assigned Projects",
    late_submit: "Repeated Late Task Submissions",
    conduct:     "Code of Conduct Violation",
    voluntary:   "Voluntary Exit / Resignation",
    other:       "Other / Management Decision"
  };

  const reasonLabel = reasonLabels[reason] || reasonLabels["other"];
  const removedAt   = today_();

  try {
    let sheet = ss_().getSheetByName(SHEET_REMOVED);

    if (!sheet) {
      setupRemovedInternsSheet();
      sheet = ss_().getSheetByName(SHEET_REMOVED);
    }

    sheet.appendRow([
      internId,
      internName,
      internEmail,
      internPhone || "",
      batchId,
      batchName,
      duration,
      reason,
      reasonLabel,
      removedAt,
      joinedAt ? normalizeDate_(joinedAt) : "",
      removedByAdminId || ADMIN_ID
    ]);

    Logger.log("✅ Intern archived to Removed Interns: " + internId);
    return true;

  } catch (err) {
    Logger.log("archiveRemovedIntern_ error: " + err.toString());
    return false;
  }
}


function api_getRemovedInterns(adminId, adminPass, batchId) {
  if (!isAdmin_(adminId, adminPass))
    return { success: false, message: "Unauthorized ❌" };

  try {
    const sheet = ss_().getSheetByName(SHEET_REMOVED);
    if (!sheet) return { success: true, removed: [] };

    let list = mapRows_(sheet);

    if (batchId && batchId !== "All" && batchId !== "") {
      list = list.filter(x => String(x.BatchID) === String(batchId));
    }

    list = list.reverse();

    return { success: true, removed: list };

  } catch (err) {
    Logger.log("api_getRemovedInterns error: " + err.toString());
    return { success: false, message: "Server error: " + err.message };
  }
}


function isInternIdRetired_(internId) {
  try {
    const sheet = ss_().getSheetByName(SHEET_REMOVED);
    if (!sheet) return false;
    return findRow_(sheet, 1, internId) !== -1;
  } catch (err) {
    return false;
  }
}