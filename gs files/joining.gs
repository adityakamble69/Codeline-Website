// ============================================================
// CODELINE.AI — Joining.gs  (FIXED)
// Joining Intern System
// ============================================================

// ============================================================
// JOINING INTERN SHEET COLUMN MAP (1-indexed)
// Col 1:  First Name
// Col 2:  Middle Name
// Col 3:  Last Name
// Col 4:  Email
// Col 5:  Phone
// Col 6:  College
// Col 7:  Duration
// Col 8:  Joining Date
// Col 9:  CV Link
// Col 10: Letter Link
// Col 11: Status          (Pending / Accepted / Declined / Removed)
// ============================================================


function setupJoiningInternSheet() {
  const ss = ss_();
  let sheet = ss.getSheetByName(SHEET_JOINING);
  if (!sheet) sheet = ss.insertSheet(SHEET_JOINING);

  const firstCell = sheet.getRange(1, 1).getValue();
  if (!firstCell) {
    sheet.appendRow([
      "First Name", "Middle Name", "Last Name",
      "Email", "Phone", "College", "Duration", "Joining Date",
      "CV Link", "Letter Link", "Status"
    ]);
    // FIX: was getRange(1,1,1,10) — College column added making 11 total
    const headerRange = sheet.getRange(1, 1, 1, 11);
    headerRange.setBackground("#6b21a8");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
}


function handleJoiningFormPost_(e) {
  try {
    const p = e.parameter || {};

    const firstName   = (p.first_name   || "").trim();
    const middleName  = (p.middle_name  || "").trim();
    const lastName    = (p.last_name    || "").trim();
    const email       = (p.email        || "").trim();
    const phone       = (p.phone        || "").trim();
    const duration    = (p.duration     || "").trim();
    const joiningDate = (p.joining_date || "").trim();
    const position    = (p.position     || "Internship").trim();
    const college     = (p.college      || "").trim();

    if (!firstName || !lastName || !email || !phone || !duration || !joiningDate) {
      Logger.log("Joining Form: Missing fields — " + JSON.stringify(p));
      return HtmlService.createHtmlOutput("error: missing fields");
    }

    const ss = ss_();
    let sheet = ss.getSheetByName(SHEET_JOINING);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_JOINING);
      sheet.appendRow([
        "First Name", "Middle Name", "Last Name",
        "Email", "Phone", "College", "Duration", "Joining Date",
        "CV Link", "Letter Link", "Status"
      ]);
      // FIX: was getRange(1,1,1,10) — must cover all 11 columns
      const hRange = sheet.getRange(1, 1, 1, 11);
      hRange.setBackground("#6b21a8");
      hRange.setFontColor("#ffffff");
      hRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    let cvLink     = "";
    let letterLink = "";

    if (p.cv_base64 && p.cv_filename) {
      cvLink = saveFormFileToDrive_(p.cv_base64, p.cv_filename, p.cv_mimetype || "application/octet-stream");
    }
    if (p.letter_base64 && p.letter_filename) {
      letterLink = saveFormFileToDrive_(p.letter_base64, p.letter_filename, p.letter_mimetype || "application/octet-stream");
    }

    sheet.appendRow([
      firstName, middleName, lastName,
      email, phone, college, duration, joiningDate,
      cvLink, letterLink, "Pending"
    ]);

    Logger.log("✅ Joining Form: " + firstName + " " + lastName + " | " + email);
    // FIX: college passed as 9th argument — was missing from call, causing undefined in email template
    sendJoiningConfirmationEmail_(firstName, middleName, lastName, email, phone, position, duration, joiningDate, college);

    return HtmlService.createHtmlOutput("success");

  } catch (err) {
    Logger.log("Joining Form Error: " + err.toString());
    return HtmlService.createHtmlOutput("error: " + err.message);
  }
}





function saveFormFileToDrive_(base64Data, filename, mimeType) {
  try {
    const folder  = DriveApp.getFolderById(DOC_OUTPUT_FOLDER_ID);
    const decoded = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, filename);
    const file    = folder.createFile(decoded);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    Logger.log("saveFormFileToDrive_ error: " + err);
    return "";
  }
}


function api_getJoiningInterns(adminId, adminPass, statusFilter) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };

    // ✅ FIX: use getSheetByName instead of sh_() — returns null instead of throwing
    const joinSh = ss_().getSheetByName(SHEET_JOINING);
    if (!joinSh) return { success: true, joiningInterns: [] }; // sheet not yet created

    let list = mapRows_(joinSh);

    if (statusFilter && statusFilter !== "All" && statusFilter !== "") {
      list = list.filter(x =>
        String(x.Status || "").toLowerCase() === String(statusFilter).toLowerCase()
      );
    }

    list = list.map(x => ({
      ...x,
      FullName: [x["First Name"], x["Middle Name"], x["Last Name"]].filter(Boolean).join(" ")
    }));

    return { success: true, joiningInterns: list.reverse() };

  } catch (err) {
    Logger.log("api_getJoiningInterns error: " + err.toString());
    return { success: false, message: "Server error: " + err.message };
  }
}

function api_updateJoiningStatus(b) {
  try {
    if (!isAdmin_(b.adminId, b.adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const newStatus   = (b.status      || "").trim();
    const email       = (b.email       || "").trim().toLowerCase();
    const joiningDate = (b.joiningDate || "").trim();
    const reason      = (b.reason      || "").trim();

    // Accepted ke liye extra fields
    const internName = (b.name     || "").trim();
    const batchId    = (b.batchId  || "").trim();
    const duration   = (b.duration || "6 Months").trim();

    if (!newStatus || !email)
      return { success: false, message: "Status aur Email required ❌" };

    const allowed = ["Pending", "Accepted", "Declined"];
    if (!allowed.includes(newStatus))
      return { success: false, message: "Status sirf " + allowed.join(" / ") + " ho sakta hai ❌" };

    const joinSh  = sh_(SHEET_JOINING);
    const data    = joinSh.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());

    const emailCol       = headers.indexOf("Email")        + 1;
    const statusCol      = headers.indexOf("Status")       + 1;
    const joiningDateCol = headers.indexOf("Joining Date") + 1;

    if (emailCol === 0 || statusCol === 0)
      return { success: false, message: "Sheet columns not found ❌ Headers: " + headers.join(", ") };

    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      const rowEmail = String(data[i][emailCol - 1]).trim().toLowerCase();
      if (rowEmail !== email) continue;

      if (joiningDate && joiningDateCol > 0) {
        const rowDate = normalizeDate_(data[i][joiningDateCol - 1]);
        if (rowDate === joiningDate) { targetRow = i + 1; break; }
      } else {
        targetRow = i + 1; break;
      }
    }

    if (targetRow === -1)
      return { success: false, message: "Record not found ❌ (email=" + email + ", date=" + joiningDate + ")" };

    joinSh.getRange(targetRow, statusCol).setValue(newStatus);

    const rowData  = data[targetRow - 1];
    const fullName = [
      rowData[headers.indexOf("First Name") ] || "",
      rowData[headers.indexOf("Middle Name")] || "",
      rowData[headers.indexOf("Last Name")  ] || ""
    ].filter(Boolean).join(" ") || "Applicant";

    const formattedDate = joiningDateCol > 0
      ? formatDateGAS_(rowData[joiningDateCol - 1])
      : "";

    // ── ACCEPTED ──
    if (newStatus === "Accepted") {
      let internId  = "";
      let batchName = "";

      // Intern create karo agar name aur batchId mile
      if (internName && batchId) {
        const created = api_adminCreateIntern({
          adminId:         b.adminId,
          adminPass:       b.adminPass,
          name:            internName,
          email:           rowData[emailCol - 1],
          batchId:         batchId,
          duration:        duration,
          skipWelcomeMail: true   // welcome mail yahan se nahi jaayega
        });
        if (created.success) {
          internId  = created.internId;
          batchName = created.batchName;
        } else {
          Logger.log("⚠️ Intern create failed during acceptance: " + created.message);
        }
      }

      // Combined single mail
      sendEmail_(
        rowData[emailCol - 1],
        INSTITUTE_NAME + " — Welcome to the Team! 🎉",
        buildCombinedAcceptanceEmail_(fullName, formattedDate, internId, batchName, duration)
      );

      Logger.log("✅ Accepted: " + email + " | internId=" + internId);
      return {
        success:  true,
        message:  "Status updated to \"Accepted\" ✅",
        internId: internId
      };
    }

    // ── DECLINED ──
    if (newStatus === "Declined") {
      sendEmail_(
        rowData[emailCol - 1],
        INSTITUTE_NAME + " — Internship Application Update",
        buildRejectionEmail_(fullName, reason)
      );
    }

    Logger.log("✅ Status updated row " + targetRow + " → " + newStatus + " | " + email);
    return { success: true, message: "Status updated to \"" + newStatus + "\" ✅" };

  } catch (err) {
    Logger.log("api_updateJoiningStatus error: " + err.toString());
    return { success: false, message: "Server error: " + err.message };
  }
}


function api_updateJoiningDate(b) {
  try {
    if (!isAdmin_(b.adminId, b.adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const email          = (b.email          || "").trim().toLowerCase();
    const oldJoiningDate = (b.oldJoiningDate || "").trim();
    const newJoiningDate = (b.newJoiningDate || "").trim();

    if (!email || !newJoiningDate)
      return { success: false, message: "Email aur newJoiningDate required ❌" };

    const joinSh  = sh_(SHEET_JOINING);
    const data    = joinSh.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());

    const emailCol       = headers.indexOf("Email")        + 1;
    const joiningDateCol = headers.indexOf("Joining Date") + 1;

    if (emailCol === 0 || joiningDateCol === 0)
      return { success: false, message: "Sheet columns not found ❌" };

    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      const rowEmail = String(data[i][emailCol - 1]).trim().toLowerCase();
      if (rowEmail !== email) continue;

      if (oldJoiningDate) {
        const rowDate = normalizeDate_(data[i][joiningDateCol - 1]);
        if (rowDate === oldJoiningDate) { targetRow = i + 1; break; }
      } else {
        targetRow = i + 1; break;
      }
    }

    if (targetRow === -1)
      return { success: false, message: "Record not found ❌" };

    joinSh.getRange(targetRow, joiningDateCol).setValue(newJoiningDate);

    Logger.log("✅ JoiningDate updated: " + email + " | " + oldJoiningDate + " → " + newJoiningDate);
    return { success: true, message: "Joining Date update ho gayi ✅" };

  } catch (err) {
    Logger.log("api_updateJoiningDate error: " + err.toString());
    return { success: false, message: "Server error: " + err.message };
  }
}



function api_removeJoiningIntern(b) {
  try {
    if (!isAdmin_(b.adminId, b.adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const email       = (b.email       || "").trim().toLowerCase();
    const joiningDate = (b.joiningDate || "").trim();

    if (!email) return { success: false, message: "Email required ❌" };

    const joinSh  = sh_(SHEET_JOINING);
    const data    = joinSh.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());

    const emailCol       = headers.indexOf("Email")        + 1;
    const joiningDateCol = headers.indexOf("Joining Date") + 1;

    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      const rowEmail = String(data[i][emailCol - 1]).trim().toLowerCase();
      if (rowEmail !== email) continue;
      if (joiningDate && joiningDateCol > 0) {
        const rowDate = normalizeDate_(data[i][joiningDateCol - 1]);
        if (rowDate === joiningDate) { targetRow = i + 1; break; }
      } else {
        targetRow = i + 1; break;
      }
    }

    if (targetRow === -1)
      return { success: false, message: "Record not found ❌" };

    joinSh.deleteRow(targetRow);
    return { success: true, message: "Record removed ✅" };

  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}