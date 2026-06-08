// ============================================================
// CODELINE.AI — WarnRemove.gs  (FIXED)
// ============================================================

function api_warnIntern(b) {
  try {
    if (!isAdmin_(b.adminId, b.adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const internId = (b.internId || "").trim();
    const warnMsg  = (b.message  || "").trim();

    if (!internId || !warnMsg)
      return { success: false, message: "internId aur message required ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow === -1)
      return { success: false, message: "Intern not found ❌" };

    const email = internsSh.getRange(iRow, 3).getValue();
    const name  = internsSh.getRange(iRow, 2).getValue();

    sendEmail_(email, `${INSTITUTE_NAME} — Warning Notice`, buildWarningEmail_(name, warnMsg));
    Logger.log("✅ Warning sent to: " + internId + " | " + email);
    return { success: true, message: "Warning sent ✅" };

  } catch (err) {
    Logger.log("api_warnIntern error: " + err.toString());
    return { success: false, message: "Server error: " + err.message };
  }
}


function api_removeIntern(b) {
  try {
    if (!isAdmin_(b.adminId, b.adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const internId = (b.internId || "").trim();
    const reason   = (b.reason   || "other").trim();

    if (!internId)
      return { success: false, message: "internId required ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow === -1)
      return { success: false, message: "Intern not found ❌" };

    const internData = internsSh.getRange(iRow, 1, 1, internsSh.getLastColumn()).getValues()[0];
    const headers    = internsSh.getRange(1, 1, 1, internsSh.getLastColumn()).getValues()[0].map(h => String(h).trim());

    const internName  = String(internData[headers.indexOf("Name")]      || "").trim();
    const internEmail = String(internData[headers.indexOf("Email")]     || "").trim();
    const internPhone = String(internData[headers.indexOf("Phone")]     || "").trim();
    const batchId     = String(internData[headers.indexOf("BatchID")]   || "").trim();
    const batchName   = String(internData[headers.indexOf("BatchName")] || "").trim();
    const duration    = String(internData[headers.indexOf("Duration")]  || "").trim();
    const joinedAt    = internData[headers.indexOf("CreatedAt")]        || "";

    // ── 1. Archive to Removed Interns sheet ──
    archiveRemovedIntern_(internId, internName, internEmail, internPhone, batchId, batchName, duration, joinedAt, reason, b.adminId);

    // ── 2. Delete from Interns sheet ──
    internsSh.deleteRow(iRow);

    // ── 3. Delete related submissions ──
    try {
      const subsSh = sh_(SHEET_SUBS);
      _deleteRowsByInternId_(subsSh, internId, 2); // col 2 = InternID in Submissions
    } catch (e) { Logger.log("Subs delete error: " + e); }

    // ── 4. Delete related tasks ──
    // FIX: Tasks sheet InternID is col 5, NOT col 3 (col 3 = BatchID).
    // Using col 3 would incorrectly delete batch tasks for the intern's batch.
    try {
      const tasksSh = sh_(SHEET_TASKS);
      _deleteRowsByInternId_(tasksSh, internId, 5); // col 5 = InternID in Tasks sheet
    } catch (e) { Logger.log("Tasks delete error: " + e); }

    // ── 5. Update Joining sheet — mark ALL matching email rows as "Removed" ──
    // FIX: removed `break` so ALL joining records for this email get marked,
    // not just the first one (handles multiple joining applications by same intern).
    try {
      const joinSh   = sh_(SHEET_JOINING);
      const joinData = joinSh.getDataRange().getValues();
      const joinHdrs = joinData[0].map(h => String(h).trim());

      const emailCol  = joinHdrs.indexOf("Email")  + 1;
      const statusCol = joinHdrs.indexOf("Status") + 1;

      // Dynamically find or create "Removal Reason" column
      let reasonCol = joinHdrs.indexOf("Removal Reason") + 1;
      if (reasonCol === 0) {
        reasonCol = joinHdrs.length + 1;
        joinSh.getRange(1, reasonCol).setValue("Removal Reason");
        joinSh.getRange(1, reasonCol)
              .setBackground("#6b21a8").setFontColor("#ffffff").setFontWeight("bold");
      }

      // Dynamically find or create "Removed At" column
      let removedAtCol = joinHdrs.indexOf("Removed At") + 1;
      if (removedAtCol === 0) {
        removedAtCol = reasonCol + 1;
        joinSh.getRange(1, removedAtCol).setValue("Removed At");
        joinSh.getRange(1, removedAtCol)
              .setBackground("#6b21a8").setFontColor("#ffffff").setFontWeight("bold");
      }

      if (emailCol > 0 && statusCol > 0) {
        for (let i = 1; i < joinData.length; i++) {
          const rowEmail = String(joinData[i][emailCol - 1]).trim().toLowerCase();
          if (rowEmail === internEmail.toLowerCase()) {
            joinSh.getRange(i + 1, statusCol).setValue("Removed");
            joinSh.getRange(i + 1, reasonCol).setValue(reason);
            joinSh.getRange(i + 1, removedAtCol).setValue(today_());
            // FIX: NO break — update ALL rows matching this email
          }
        }
      }
    } catch (err) {
      Logger.log("Joining sheet update error (non-critical): " + err.toString());
    }

    // ── 6. Send removal notification email ──
    try {
      const reasonLabels = {
        absent:      "Consistent Absence / No Show",
        incomplete:  "Failure to Complete Assigned Projects",
        late_submit: "Repeated Late Task Submissions",
        conduct:     "Code of Conduct Violation",
        voluntary:   "Voluntary Exit / Resignation",
        other:       "Other / Management Decision"
      };
      const reasonLabel = reasonLabels[reason] || reasonLabels["other"];

      sendEmail_(internEmail, `${INSTITUTE_NAME} — Internship Termination Notice`, buildTerminationEmail_(internName, reasonLabel));
    } catch (mailErr) {
      Logger.log("Removal email error (non-critical): " + mailErr.toString());
    }

    Logger.log("✅ Intern removed: " + internId + " | Reason: " + reason);
    return { success: true, message: "Intern removed successfully ✅" };

  } catch (err) {
    Logger.log("api_removeIntern error: " + err.toString());
    return { success: false, message: "Server error: " + err.message };
  }
}


// ── Helper: delete all rows in sheet where col matches internId ──
function _deleteRowsByInternId_(sheet, internId, col) {
  const data = sheet.getDataRange().getValues();
  // Iterate bottom-up to avoid row-index shifting after delete
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][col - 1]).trim() === internId) {
      sheet.deleteRow(i + 1);
    }
  }
}