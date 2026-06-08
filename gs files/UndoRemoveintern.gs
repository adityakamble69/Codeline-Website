// ============================================================
// CODELINE.AI — UndoRemoveIntern.gs  (FIXED)
// ============================================================

function api_undoRemoveIntern(b) {
  try {
    if (!isAdmin_(b.adminId, b.adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const internId = String(b.internId || "").trim();
    const batchId  = String(b.batchId  || "").trim();
    const name     = String(b.name     || "").trim();
    const email    = String(b.email    || "").trim();
    const phone    = String(b.phone    || "").trim();
    const duration = String(b.duration || "6 Months").trim();

    if (!internId || !batchId || !name || !email)
      return { success: false, message: "internId, batchId, name, email required ❌" };

    // ── 1. Find & delete from Removed Interns sheet ──
    const removedSh = ss_().getSheetByName(SHEET_REMOVED);
    if (!removedSh)
      return { success: false, message: "Removed Interns sheet not found ❌" };

    const removedRow = findRow_(removedSh, 1, internId);
    if (removedRow === -1)
      return { success: false, message: "InternID '" + internId + "' Removed Interns mein nahi mila ❌" };

    removedSh.deleteRow(removedRow);
    Logger.log("✅ Removed from Removed Interns: " + internId);

    // ── 2. Look up batch name from Batches sheet ──
    let batchName = batchId;
    try {
      const batchSh   = sh_(SHEET_BATCHES);
      const batchData = batchSh.getDataRange().getValues();
      for (let i = 1; i < batchData.length; i++) {
        if (String(batchData[i][0]).trim() === batchId) {
          batchName = String(batchData[i][1] || batchId).trim();
          break;
        }
      }
    } catch (e) {
      Logger.log("Batch name lookup failed: " + e);
    }

    // ── 3. Re-create intern in Interns sheet ──
    // FIX: defaultPass not exposed in response message or logs.
    // Intern will use the "Set Password" link in the welcome email.
    const defaultPass = email.split("@")[0];
    const hashedPass  = hashPassword_(defaultPass);
    const createdAt   = today_();

    const internSh = sh_(SHEET_INTERNS);

    if (findRow_(internSh, 1, internId) !== -1)
      return { success: false, message: "InternID '" + internId + "' already exists in Interns sheet ❌" };

    const headers = internSh.getRange(1, 1, 1, internSh.getLastColumn())
                             .getValues()[0]
                             .map(h => String(h).trim());

    const row = headers.map(h => {
      switch (h) {
        case "InternID":     return internId;
        case "Name":         return name;
        case "Email":        return email;
        case "BatchID":      return batchId;
        case "BatchName":    return batchName;
        case "Duration":     return duration;
        case "PasswordHash": return hashedPass;
        case "CreatedAt":    return createdAt;
        case "Status":       return "Active";
        default:             return "";
      }
    });

    internSh.appendRow(row);
    Logger.log("✅ Intern restored to Interns sheet: " + internId);

    // ── 4. Send welcome email (intern sets their own password via link) ──
    const loginUrl = "https://technocrat.asterisc.in/dashboard/";
    sendEmail_(email, "Welcome Back to CodeLine Internship 🚀", buildWelcomeEmail_(name, internId, batchName, duration, loginUrl));

    // ── 5. FIX: Update Joining sheet status back to "Accepted" ──
    // Previously the Joining record was left as "Removed" after restore.
    try {
      const joinSh   = sh_(SHEET_JOINING);
      const joinData = joinSh.getDataRange().getValues();
      const joinHdrs = joinData[0].map(h => String(h).trim());

      const emailCol  = joinHdrs.indexOf("Email")  + 1;
      const statusCol = joinHdrs.indexOf("Status") + 1;

      if (emailCol > 0 && statusCol > 0) {
        for (let i = 1; i < joinData.length; i++) {
          const rowEmail = String(joinData[i][emailCol - 1]).trim().toLowerCase();
          if (rowEmail === email.trim().toLowerCase()) {
            // Only revert rows that were marked "Removed" — don't touch Declined etc.
            if (String(joinData[i][statusCol - 1]).trim() === "Removed") {
              joinSh.getRange(i + 1, statusCol).setValue("Accepted");
            }
          }
        }
      }
      Logger.log("✅ Joining sheet status restored for: " + email);
    } catch (joinErr) {
      Logger.log("Joining sheet restore error (non-critical): " + joinErr.toString());
    }

    // FIX: password NOT returned in message — intern resets via email link
    return {
      success: true,
      message: "Intern '" + name + "' successfully restored ✅ Welcome email sent."
    };

  } catch (err) {
    Logger.log("api_undoRemoveIntern error: " + err.toString());
    return { success: false, message: "Server error: " + err.message };
  }
}