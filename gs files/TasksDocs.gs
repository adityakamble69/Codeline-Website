// ============================================================
// CODELINE.AI — TasksDocs.gs  (FIXED)
// ============================================================
function fixGhostRows() {
  const subs = sh_(SHEET_SUBS);
  const data = subs.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const subIdCol = headers.indexOf("SubmissionID");

  // Bottom-up delete karo taaki row index shift na ho
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
// ── FIXED: api_getInternDocStatus ──
// Removed ambiguous body[0]/body[1]/body[2] positional fallback.
// Every real call (Config.gs doGet) passes named params: adminId, adminPass, internId.
function api_getInternDocStatus(body) {
  const adminId = body.adminId;
  const adminPass = body.adminPass;
  const internId = body.internId;

  if (!isAdmin_(adminId, adminPass))
    return { success: false, message: "Unauthorized ❌" };

  const internsSh = sh_(SHEET_INTERNS);
  const iRow = findRow_(internsSh, 1, internId);
  if (iRow === -1) return { success: false, message: "Intern not found ❌" };

  const status = {};
  Object.keys(DOC_COLS).forEach(docType => {
    const val = internsSh.getRange(iRow, DOC_COLS[docType]).getValue();
    status[docType] = val ? String(val) : "";
  });

  return { success: true, status };
}


// ── FIXED v2: api_adminGradeSubmission ──
// Submission sheet column order (appendRow se):
//   A=1  SubmissionID
//   B=2  InternID
//   C=3  AssignedTaskID
//   D=4  Link
//   E=5  Details
//   F=6  SubmittedAt
//   G=7  EditedAt
//   H=8  Grade
//   I=9  Remarks
//   J=10 ReviewedAt
//   K=11 FinalStatus   ← YE SABSE IMPORTANT HAI
//   L=12 EditRequestStatus
//   M=13 IsEditAllowed
//
// POSITION-BASED write — header mismatch se safe
function api_adminGradeSubmission(b) {
  try {
    if (!isAdmin_(b.adminId, b.adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const submissionId = String(b.submissionId || "").trim();
    const finalStatus  = String(b.finalStatus  || "Approved").trim();
    const grade        = String(b.grade        || "").trim();
    const remarks      = String(b.remarks      || "").trim();

    if (!submissionId)
      return { success: false, message: "Submission ID required ❌" };

    const subs = sh_(SHEET_SUBS);
    const data = subs.getDataRange().getValues();

    if (data.length < 2)
      return { success: false, message: "No submissions found ❌" };

    // ── Header se columns dhundho (safe) ──
    const headers = data[0].map(h => String(h).trim());
    let COL_SUBMISSIONID = headers.indexOf("SubmissionID") + 1;
    let COL_INTERNID     = headers.indexOf("InternID")     + 1;
    let COL_GRADE        = headers.indexOf("Grade")        + 1;
    let COL_REMARKS      = headers.indexOf("Remarks")      + 1;
    let COL_REVIEWEDAT   = headers.indexOf("ReviewedAt")   + 1;
    let COL_FINALSTATUS  = headers.indexOf("FinalStatus")  + 1;

    // ── Fallback: agar header nahi mila toh hardcoded position ──
    if (COL_SUBMISSIONID < 1) COL_SUBMISSIONID = 1;
    if (COL_INTERNID     < 1) COL_INTERNID     = 2;
    if (COL_GRADE        < 1) COL_GRADE        = 8;
    if (COL_REMARKS      < 1) COL_REMARKS      = 9;
    if (COL_REVIEWEDAT   < 1) COL_REVIEWEDAT   = 10;
    if (COL_FINALSTATUS  < 1) COL_FINALSTATUS  = 11;

    Logger.log("GRADE DEBUG | headers: " + JSON.stringify(headers));
    Logger.log("GRADE DEBUG | COL_FINALSTATUS=" + COL_FINALSTATUS + " | submissionId=" + submissionId + " | finalStatus=" + finalStatus);

    // ── Row dhundho ──
    let sRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][COL_SUBMISSIONID - 1]).trim() === submissionId) {
        sRow = i + 1;
        break;
      }
    }

    if (sRow === -1)
      return { success: false, message: "Submission not found ❌" };

    Logger.log("GRADE DEBUG | sRow=" + sRow + " | current FinalStatus=" + data[sRow-1][COL_FINALSTATUS-1]);

    // ── Sheet update ──
    subs.getRange(sRow, COL_GRADE).setValue(grade);
    subs.getRange(sRow, COL_REMARKS).setValue(remarks);
    subs.getRange(sRow, COL_REVIEWEDAT).setValue(nowISO_());
    subs.getRange(sRow, COL_FINALSTATUS).setValue(finalStatus);
    SpreadsheetApp.flush();

    // ── Verify + 1 retry ──
    let written = String(subs.getRange(sRow, COL_FINALSTATUS).getValue()).trim();
    Logger.log("GRADE DEBUG | written after flush: " + written);

    if (written.toLowerCase() !== finalStatus.toLowerCase()) {
      Utilities.sleep(800);
      subs.getRange(sRow, COL_FINALSTATUS).setValue(finalStatus);
      SpreadsheetApp.flush();
      written = String(subs.getRange(sRow, COL_FINALSTATUS).getValue()).trim();
      Logger.log("GRADE DEBUG | written after retry: " + written);
    }

    if (written.toLowerCase() !== finalStatus.toLowerCase()) {
      return {
        success: false,
        message: "Sheet write failed — FinalStatus column mismatch. Actual col=" + COL_FINALSTATUS + " written=" + written + " ❌"
      };
    }

    // ── Email ──
    try {
      const internId = String(subs.getRange(sRow, COL_INTERNID).getValue()).trim();
      if (internId) {
        const internsSheet = sh_(SHEET_INTERNS);
        const internRow    = findRow_(internsSheet, 1, internId);
        if (internRow !== -1) {
          const name  = internsSheet.getRange(internRow, 2).getValue();
          const email = internsSheet.getRange(internRow, 3).getValue();
          if (email) {
            sendEmail_(email, `${INSTITUTE_NAME} — Task Review Result`, buildTaskReviewEmail_(name, finalStatus, grade, remarks));
            try { checkAndSendAchievementEmail_(internId); } catch(e) { Logger.log(e); }
          }
        }
      }
    } catch(emailErr) {
      Logger.log("Email error (non-fatal): " + emailErr);
    }

    Logger.log("Submission Updated => " + submissionId + " | Status: " + finalStatus);
    return { success: true, message: "Submission " + finalStatus + " successfully ✅" };

  } catch (err) {
    Logger.log("api_adminGradeSubmission Error: " + err);
    return { success: false, message: err.toString() };
  }
}

// ── FIXED: generateAndSendDocs_ ──
function generateAndSendDocs_(internData, documents, placeholders, skipEmail) {
  try {
    const tempFolder = DriveApp.getFolderById(DOC_OUTPUT_FOLDER_ID);
    const sentLabels = [];
    const saveErrors = [];
    const docLinks = []; // ← collect each file's individual link
    let folderLink = ""; // ← folder link as fallback

    documents.forEach(docType => {
      const templateId = DOC_TEMPLATES[docType];
      if (!templateId || templateId.startsWith("YOUR_")) {
        Logger.log("Skipping " + docType + " — template ID not configured");
        return;
      }

      const copy = DriveApp.getFileById(templateId).makeCopy(
        docType + "_" + internData.InternID + "_" + Date.now(), tempFolder
      );

      const doc = DocumentApp.openById(copy.getId());
      const body = doc.getBody();
      Object.entries(placeholders).forEach(([key, val]) => {
        body.replaceText(key, val || "");
      });
      doc.saveAndClose();

      sentLabels.push(DOC_LABELS[docType]);

      try {
        const saveFolderId = DOC_SAVE_FOLDERS[docType];
        if (saveFolderId && !saveFolderId.startsWith("YOUR_")) {
          const saveFolder = DriveApp.getFolderById(saveFolderId);

          let internFolder = null;
          const folderIter = saveFolder.getFoldersByName(internData.Name);
          while (folderIter.hasNext()) {
            internFolder = folderIter.next();
            break;
          }
          if (!internFolder) {
            internFolder = saveFolder.createFolder(internData.Name);
          }

          const driveBlob = copy.getAs("application/pdf");
          const pdfName = DOC_LABELS[docType] + " - " + internData.Name + ".pdf";
          driveBlob.setName(pdfName);

          const savedPdf = internFolder.createFile(driveBlob);
          savedPdf.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

          // ← collect each file's direct link
          docLinks.push({
            label: DOC_LABELS[docType],
            url: "https://drive.google.com/file/d/" + savedPdf.getId() + "/view?usp=sharing"
          });

          if (!folderLink) folderLink = internFolder.getUrl();
          Logger.log("Saved: " + pdfName + " | link: " + savedPdf.getUrl());

        } else {
          Logger.log("No save folder configured for: " + docType);
        }
      } catch (saveErr) {
        const msg = "Save failed for " + docType + ": " + saveErr.toString();
        Logger.log(msg);
        saveErrors.push(msg);
      }

      copy.setTrashed(true);
    });

    if (sentLabels.length === 0)
      return { success: false, message: "No document templates configured ❌" };

    if (docLinks.length === 0)
      return { success: false, message: "Documents could not be saved to Drive ❌" };

    const subject = INSTITUTE_NAME + " — Your Internship Documents";
    const emailHtml = buildDocLinkEmail_(internData.Name, docLinks, folderLink);

    const plainTextLines = docLinks.map((d, i) =>
      (i + 1) + ") " + d.label + "\n" + d.url
    );
    const plainBody =
      "Hello " + internData.Name + ",\n\n" +
      "Your internship documents from " + INSTITUTE_NAME + " are ready.\n\n" +
      "Your Documents:\n\n" +
      plainTextLines.join("\n\n") +
      "\n\nPlease save these for your records.\n\n" +
      "— " + INSTITUTE_NAME + " Team";

    if (!skipEmail) {
      GmailApp.sendEmail(
        internData.Email,
        subject,
        plainBody,
        {
          htmlBody: emailHtml,
          name: INSTITUTE_NAME + " HR Team"
        }
      );
    }

    return {
      success: true,
      sentLabels,
      driveLink: folderLink,
      docLinks,
      saveErrors: saveErrors.length > 0 ? saveErrors : null
    };

  } catch (err) {
    Logger.log("generateAndSendDocs_ error: " + err.toString());
    return { success: false, message: "Document generation failed: " + err.message };
  }
}