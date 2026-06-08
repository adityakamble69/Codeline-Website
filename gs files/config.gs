// ============================================================
// CODELINE.AI — Config.gs
// Section 1: CONFIG + HELPERS + EMAIL UTILS
// ============================================================

/************ CONFIG ************/
const ADMIN_ID = "123";
const ADMIN_PASS = "123"; // change
const SALT = "COD@2026#SALT";   // change
const BATCH_CAPACITY = 20;

const SHEET_BATCHES = "Batches";
const SHEET_INTERNS = "Interns";
const SHEET_TASKS = "Tasks_Assigned";
const SHEET_SUBS = "Submissions";
const SHEET_MSG = "Messages";
const SHEET_JOINING = "Joining Intern";
const SHEET_REMOVED = "Removed Interns";
const MSG_EXPIRY_HOURS = 48;
const ADMIN_EMAIL = "gaurav007865@gmail.com";
const OTP_EXPIRY_MINUTES = 5;

// ── Document Save Folders (by type) ──
const DOC_SAVE_FOLDERS = {
  loi: "1SaguwvfsO5KOycfspHQ8Rp7nPvbIwx9g",
  offerLetter: "10zdDl9RhFS0HOuDTxPbPD_UnWZ5bozbK",
  joiningLetter: "17mhqug_Gp5zBBOVthK7qPT4Nv-xktkiA",
  completion: "1ds0ZiZO2tObPBzZKuMp-R6w8xczvFuyx",
  certificate: "1JFWm0-o2oJVK5C7vfboiS5mUgdQV2v_J",
  bestPerformer: "1a_9UjmYnQhZWUCPtUQaTilQv5G-sr1N7",
};

// ============================================================
// DOCUMENT SYSTEM CONFIG
// ============================================================
const DOC_TEMPLATES = {
  loi: "16ZH0T0bkgITisdEyTEWDKNMsGJscZSKznooob3XpMgo",
  offerLetter: "1KmQY9iXtnG0UhGsy5sP_dtRxtNsfk2H6XKjZCQ3elao",
  joiningLetter: "1yXRFS6KWexptL4L2FJw9n2ruISkRLOToDaKKG06NNjs",
  completion: "19NXh8LbdmmdxD5MZSXFuxTy6c0au-QYyxxILm7GYbuU",
  certificate: "1u2yvvoTf5LO7uZG0KPOp2AxC32Gd6pcKzpWpVuyk6n8",
  bestPerformer: "1euTRnDlUwc4jneXz8E3FL3iwRqoZrmhQypIZ0kVm2Kk",
};

const DOC_OUTPUT_FOLDER_ID = "1GU_EbD9jn0Ywal_8UUSQmqLRjy0zctCs";
const INSTITUTE_NAME = "CODELINE.AI";

// ============================================================
// INTERNS SHEET COLUMN MAP (1-indexed)
// Col 1:  InternID       Col 2:  Name          Col 3:  Email
// Col 4:  BatchID        Col 5:  BatchName      Col 6:  Duration
// Col 7:  PasswordHash   Col 8:  CreatedAt      Col 9:  Status
// Col 10: Bio            Col 11: Photo
// Col 12: LOI_Sent       Col 13: OfferLetter_Sent
// Col 14: JoiningLetter_Sent     Col 15: Completion_Sent
// Col 16: Certificate_Sent       Col 17: BestPerformer_Sent
// ============================================================

const DOC_COLS = {
  loi: 12,
  offerLetter: 13,
  joiningLetter: 14,
  completion: 15,
  certificate: 16,
  bestPerformer: 17
};

const DOC_LABELS = {
  loi: "Letter of Intent",
  offerLetter: "Offer Letter",
  joiningLetter: "Joining Letter",
  completion: "Completion Letter",
  certificate: "Completion Certificate",
  bestPerformer: "Best Performer Certificate"
};


/************ CORE HELPERS ************/

function generateOTP_() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function appendFast_(sheetName, row) {
  const sh = sh_(sheetName);
  const lr = sh.getLastRow();
  sh.getRange(lr + 1, 1, 1, row.length).setValues([row]);
}

function jsonOut(obj) {
  const output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

function doOptions(e) {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

function parseBody_(e) {
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    Logger.log("Parse Error: " + err);
    return {};
  }
}

function isAdmin_(id, pass) {
  return id === ADMIN_ID && pass === ADMIN_PASS;
}

function sha256_(txt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, txt);
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function hashPassword_(pass) {
  return sha256_(pass + SALT);
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sh_(name) {
  const s = ss_().getSheetByName(name);
  if (!s) throw new Error("Sheet not found: " + name);
  return s;
}

function nowISO_() {
  return new Date().toISOString();
}

function today_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function getLastId_(sheet, col) {
  const lr = sheet.getLastRow();
  if (lr < 2) return "";
  return sheet.getRange(lr, col).getValue();
}

function generateId_(prefix, lastId) {
  if (!lastId) return prefix + "0001";
  const n = parseInt(String(lastId).replace(prefix, "")) + 1;
  return prefix + String(n).padStart(4, "0");
}

function generateNextInternId_() {
  const internSh = ss_().getSheetByName(SHEET_INTERNS);
  const activeIds = internSh && internSh.getLastRow() > 1
    ? internSh.getRange(2, 1, internSh.getLastRow() - 1, 1).getValues().flat()
    : [];

  const removedSh = ss_().getSheetByName(SHEET_REMOVED);
  const removedIds = removedSh && removedSh.getLastRow() > 1
    ? removedSh.getRange(2, 1, removedSh.getLastRow() - 1, 1).getValues().flat()
    : [];

  const allIds = [...activeIds, ...removedIds]
    .map(id => parseInt(String(id).replace("COD", "")))
    .filter(n => !isNaN(n));

  const maxNum = allIds.length > 0 ? Math.max(...allIds) : 0;
  return "COD" + String(maxNum + 1).padStart(4, "0");
}

function findRow_(sheet, col, value) {
  value = String(value).trim().toLowerCase();
  const v = sheet.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    const cell = String(v[i][col - 1]).trim().toLowerCase();
    if (cell === value) return i + 1;
  }
  return -1;
}

function mapRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim());
  return values.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function normalizeDate_(v) {
  try {
    if (v instanceof Date) {
      return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    return String(v).slice(0, 10);
  } catch (err) {
    return String(v).slice(0, 10);
  }
}

function formatDateGAS_(date) {
  if (!date) return "-";
  try {
    const d = new Date(date);
    if (isNaN(d)) return String(date);
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "dd/MM/yyyy");
  } catch (e) {
    return String(date);
  }
}

function gradeScore(g) {
  g = String(g).trim().toUpperCase();
  if (g === "A+") return 100; if (g === "A") return 90;
  if (g === "B") return 75; if (g === "C") return 55;
  if (!isNaN(Number(g))) return Math.max(0, Math.min(100, Number(g) * 10));
  return 0;
}


/************ EMAIL UTILS ************/

function sendEmail_(to, subject, html) {
  try {
    MailApp.sendEmail({
      to: to,
      subject: subject,
      htmlBody: html,
      body: "Please enable HTML to view this email properly."
    });
    return true;
  } catch (err) {
    Logger.log("Email Error: " + err);
    return false;
  }
}



function sendAdminLoginMail_(info) {
  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: `${INSTITUTE_NAME} — Admin Login Alert`,
    htmlBody: buildAdminLoginAlertEmail_(info.device || "Unknown")
  });
}

/************ ROUTER ************/
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action)
    ? String(e.parameter.action).trim() : "";

  const cb = (e && e.parameter && e.parameter.callback)
    ? String(e.parameter.callback).trim() : "";

  function respond(obj) {
    if (cb) {
      return ContentService
        .createTextOutput(cb + "(" + JSON.stringify(obj) + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);  // ← JAVASCRIPT hona chahiye
    }
    return ContentService
      .createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ✅ TOP-LEVEL TRY-CATCH — GAS always returns valid JSON, never HTML error page
  try {
    if (action === "ping") return respond({ success: true, message: "API OK ✅" });
    if (action === "adminLogin") return respond(api_adminLogin({ adminId: e.parameter.adminId || "", adminPass: e.parameter.adminPass || "" }));
    if (action === "getAdminAnalytics") return respond(api_getAdminAnalytics(e.parameter.adminId || "", e.parameter.adminPass || ""));
    if (action === "getInternToday") return respond(api_getInternToday(e.parameter.internId || ""));
    if (action === "getInternHistory") return respond(api_getInternHistory(e.parameter.internId || ""));
    if (action === "getInternProgress") return respond(api_getInternProgress(e.parameter.internId || ""));
    if (action === "getInternStreak") return respond(api_getInternStreak(e.parameter.internId || ""));
    if (action === "getMyTasksForSubmit") return respond(api_getMyTasksForSubmit(e.parameter.internId || ""));
    if (action === "sendPasswordOTP") return respond(api_sendPasswordOTP({ internId: e.parameter.internId }));
    if (action === "verifyPasswordOTP") return respond(api_verifyPasswordOTP({ internId: e.parameter.internId, otp: e.parameter.otp, newPassword: e.parameter.newPassword }));
    if (action === "getBatches") return respond(api_getBatches(e.parameter.adminId || "", e.parameter.adminPass || ""));
    if (action === "getInternsList") return respond(api_getInternsList(e.parameter.adminId || "", e.parameter.adminPass || "", e.parameter.batchId || "", e.parameter.sort || ""));
    if (action === "getPendingSubmissions") return respond(api_getPendingSubmissions(e.parameter.adminId || "", e.parameter.adminPass || ""));
    if (action === "adminInternOverview") return respond(api_adminInternOverview(e.parameter.adminId || "", e.parameter.adminPass || "", e.parameter.internId || ""));
    if (action === "getIncompleteStudents") return respond(api_getIncompleteStudents(e.parameter.adminId || "", e.parameter.adminPass || "", e.parameter.date || ""));
    if (action === "getChat") return respond(api_getChat(e.parameter.adminId || "", e.parameter.adminPass || "", e.parameter.internId || ""));
    if (action === "internGetChat") return respond(api_internGetChat(e.parameter.internId || ""));
    if (action === "sendMessageGET") return respond(api_sendMessageGET_(e.parameter.adminId || "", e.parameter.adminPass || "", e.parameter.internId || "", e.parameter.sender || "", e.parameter.message || ""));
    if (action === "clearChatGET") return respond(api_clearChatGET_(e.parameter.adminId || "", e.parameter.adminPass || "", e.parameter.internId || "", e.parameter.by || ""));
    if (action === "adminCreateInternGET") return respond(api_adminCreateIntern({ adminId: e.parameter.adminId || "", adminPass: e.parameter.adminPass || "", name: e.parameter.name || "", email: e.parameter.email || "", batchId: e.parameter.batchId || "", duration: e.parameter.duration || "" }));
    if (action === "getInternPendingTasks") return respond(api_getInternPendingTasks(e.parameter.internId || ""));
    if (action === "getInternPerformance") return respond(api_getInternPerformance(e.parameter.internId || ""));
    if (action === "getMyBatchInterns") return respond(api_getMyBatchInterns(e.parameter.internId || ""));
    if (action === "getEditRequests") return respond(api_getEditRequests(e.parameter.adminId || "", e.parameter.adminPass || ""));
    if (action === "getJoiningInterns") return respond(api_getJoiningInterns(e.parameter.adminId || "", e.parameter.adminPass || "", e.parameter.status || ""));
    if (action === "getInternDocStatus") return respond(api_getInternDocStatus({ adminId: e.parameter.adminId || "", adminPass: e.parameter.adminPass || "", internId: e.parameter.internId || "" }));
    if (action === "getRemovedInterns") return respond(api_getRemovedInterns(e.parameter.adminId || "", e.parameter.adminPass || "", e.parameter.batchId || ""));
    if (action === "getExtendedAnalytics")
      return respond(api_getExtendedAnalytics(e.parameter.adminId || "", e.parameter.adminPass || ""));
    if (action === "getInternAnalytics")
      return respond(api_getInternAnalytics(e.parameter.adminId || "", e.parameter.adminPass || "", e.parameter.internId || ""));
    if (action === "getBatchAnalytics")
      return respond(api_getBatchAnalytics(e.parameter.adminId || "", e.parameter.adminPass || "", e.parameter.batchId || ""));
    if (action === "getJoiningAnalytics")
      return respond(api_getJoiningAnalytics(e.parameter.adminId || "", e.parameter.adminPass || ""));

    return respond({ success: false, message: "Invalid GET action" });

  } catch (err) {
    // ✅ CRITICAL: catch any unhandled throw — return JSON so JSONP doesn't break
    Logger.log("doGet unhandled error [" + action + "]: " + err.toString());
    return respond({ success: false, message: "Server error: " + err.message });
  }
}


function doPost(e) {
  let body = {};
  let isJson = false;

  try {
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
      isJson = true;
    }
  } catch (err) {
    isJson = false;
  }

  if (isJson && body.action) {
    const action = (body.action || "").trim();

    if (action === "adminLoginAlert") return jsonOut(api_adminLoginAlert(body));
    if (action === "adminLogin") return jsonOut(api_adminLogin(body));
    if (action === "adminCreateBatch") return jsonOut(api_adminCreateBatch(body));
    if (action === "adminCreateIntern") return jsonOut(api_adminCreateIntern(body));
    if (action === "adminAssignBatchTask") return jsonOut(api_adminAssignBatchTask(body));
    if (action === "adminAssignIndividualTask") return jsonOut(api_adminAssignIndividualTask(body));
    if (action === "adminGradeSubmission") return jsonOut(api_adminGradeSubmission(body));
    if (action === "internLogin") return jsonOut(api_internLogin(body));
    if (action === "internSetPassword") return jsonOut(api_internSetPassword(body));
    if (action === "internChangePassword") return jsonOut(api_internChangePassword(body));
    if (action === "internSubmitTask") return jsonOut(api_internSubmitTask(body));
    if (action === "internEditSubmission") return jsonOut(api_internEditSubmission(body));
    if (action === "internRequestEditPermission") return jsonOut(api_internRequestEditPermission(body));
    if (action === "adminApproveEdit") return jsonOut(api_adminApproveEdit(body));
    if (action === "updateInternProfile") return jsonOut(api_updateInternProfile(body));
    if (action === "uploadInternPhoto") return jsonOut(uploadInternPhoto(body));
    if (action === "sendPasswordOTP") return jsonOut(api_sendPasswordOTP(body));
    if (action === "verifyPasswordOTP") return jsonOut(api_verifyPasswordOTP(body));
    if (action === "adminSendDocuments") return jsonOut(api_adminSendDocuments(body));
    if (action === "updateJoiningStatus") return jsonOut(api_updateJoiningStatus(body));
    if (action === "warnIntern") return jsonOut(api_warnIntern(body));
    if (action === "removeIntern") return jsonOut(api_removeIntern(body));
    if (action === "undoRemoveIntern") return jsonOut(api_undoRemoveIntern(body));
    if (action === "updateJoiningDate") return jsonOut(api_updateJoiningDate(body));

    return jsonOut({ success: false, message: "Invalid POST action" });
  }

  return handleJoiningFormPost_(e);
}