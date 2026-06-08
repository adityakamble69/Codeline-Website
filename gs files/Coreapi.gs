// ============================================================
// CODELINE.AI — CoreAPI.gs
// Missing API functions — Admin + Intern + Chat + Tasks + Auth
// ============================================================


// ============================================================
// ADMIN AUTH
// ============================================================

function api_adminLogin(b) {
  try {
    if (!isAdmin_(b.adminId, b.adminPass))
      return { success: false, message: "Invalid credentials ❌" };

    return {
      success: true,
      message: "Login successful ✅",
      adminId: b.adminId,
      adminPass: b.adminPass
    };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}

function api_adminLoginAlert(b) {
  try {
    if (!isAdmin_(b.adminId, b.adminPass))
      return { success: false, message: "Unauthorized ❌" };
    sendAdminLoginMail_({ device: b.device || "Unknown" });
    return { success: true };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// ADMIN ANALYTICS
// ============================================================

function api_getAdminAnalytics(adminId, adminPass) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const internSheet = ss_().getSheetByName(SHEET_INTERNS);
    const batchSheet = ss_().getSheetByName(SHEET_BATCHES);
    const taskSheet = ss_().getSheetByName(SHEET_TASKS);
    const subSheet = ss_().getSheetByName(SHEET_SUBS);

    const interns = internSheet ? mapRows_(internSheet) : [];
    const batches = batchSheet ? mapRows_(batchSheet) : [];
    const tasks = taskSheet ? mapRows_(taskSheet) : [];
    const subs = subSheet ? mapRows_(subSheet) : [];

    const activeInterns = interns.filter(x => String(x.Status) === "Active");
    const today = today_();

    // ── KPIs ──
    const approvedSubs = subs.filter(s => String(s.FinalStatus).toLowerCase() === "approved");
    const pendingSubs = subs.filter(s =>
      !s.FinalStatus ||
      String(s.FinalStatus).trim() === "" ||
      String(s.FinalStatus).trim() === "Pending"
    );

    const approvalPercent = subs.length
      ? Math.round((approvedSubs.length / subs.length) * 100)
      : 0;

    // Average grade (numeric score)
    const avgGrade = subs.length
      ? Math.round(subs.reduce((sum, s) => sum + gradeScore(s.Grade), 0) / subs.length)
      : 0;

    // Most active day (last 30 days — day with most submissions)
    const dayCounts = {};
    subs.forEach(s => {
      const d = normalizeDate_(s.SubmittedAt);
      if (d) dayCounts[d] = (dayCounts[d] || 0) + 1;
    });
    const mostActiveDay = Object.keys(dayCounts).length
      ? Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b)
      : "-";

    const kpis = {
      totalInterns: activeInterns.length,
      activeInterns: activeInterns.length,
      pending: pendingSubs.length,
      approved: approvedSubs.length,
      approvalPercent: approvalPercent,
      avgGrade: avgGrade,
      mostActiveDay: mostActiveDay,
    };

    // ── Charts: Batch Performance ──
    // bar chart — each batch ka completion %
    const batchLabels = [];
    const batchData = [];

    batches.forEach(b => {
      const batchInterns = activeInterns.filter(i => String(i.BatchID) === String(b.BatchID));
      const batchTasks = tasks.filter(t =>
        String(t.BatchID) === String(b.BatchID) &&
        (!t.InternID || String(t.InternID).trim() === "")
      );
      const batchSubs = subs.filter(s =>
        batchInterns.some(i => String(i.InternID) === String(s.InternID))
      );

      const expected = batchInterns.length * batchTasks.length;
      const pct = expected > 0 ? Math.round((batchSubs.length / expected) * 100) : 0;

      batchLabels.push(b.BatchName || b.BatchID);
      batchData.push(pct);
    });

    // ── Charts: Top Interns — grouped by batch ──
    // { "BatchName": [{name, avg, approvedCount}] }
    const topInterns = {};

    batches.forEach(b => {
      const batchInterns = activeInterns.filter(i => String(i.BatchID) === String(b.BatchID));

      const ranked = batchInterns.map(intern => {
        const internSubs = subs.filter(s => String(s.InternID) === String(intern.InternID));
        const approvedCount = internSubs.filter(s => String(s.FinalStatus).toLowerCase() === "approved").length;
        const avg = internSubs.length
          ? Math.round(internSubs.reduce((sum, s) => sum + gradeScore(s.Grade), 0) / internSubs.length)
          : 0;
        return { name: intern.Name, avg, approvedCount };
      }).sort((a, b) => b.avg - a.avg || b.approvedCount - a.approvedCount);

      if (ranked.length > 0) {
        topInterns[b.BatchName || b.BatchID] = ranked;
      }
    });

    return {
      success: true,
      kpis,
      charts: {
        batch: {
          labels: batchLabels,
          data: batchData,
        },
        topInterns,
      },
      // Legacy flat fields — Analytics.gs ke liye
      totalInterns: activeInterns.length,
      totalBatches: batches.length,
      totalTasks: tasks.length,
      totalSubs: subs.length,
      todayTasks: tasks.filter(t => normalizeDate_(t.Date) === today).length,
      todaySubs: subs.filter(s => normalizeDate_(s.SubmittedAt) === today).length,
      batchStats: batches.map(b => ({
        batchId: b.BatchID,
        batchName: b.BatchName,
        count: activeInterns.filter(i => String(i.BatchID) === String(b.BatchID)).length,
      })),
      gradeMap: (() => {
        const m = {};
        subs.forEach(s => {
          const g = String(s.Grade || "Ungraded").trim();
          m[g] = (m[g] || 0) + 1;
        });
        return m;
      })(),
    };

  } catch (err) {
    Logger.log("api_getAdminAnalytics error: " + err);
    return { success: false, message: "Server error: " + err.message };
  }
}

// ============================================================
// BATCHES
// ============================================================

function api_getBatches(adminId, adminPass) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const list = mapRows_(sh_(SHEET_BATCHES));
    return { success: true, batches: list };
  } catch (err) {
    Logger.log("api_getBatches error: " + err);
    return { success: false, message: "Server error: " + err.message };
  }
}

function api_adminCreateBatch(b) {
  try {
    if (!isAdmin_(b.adminId, b.adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const batchName = (b.batchName || "").trim();
    const startDate = (b.startDate || today_()).trim();

    if (!batchName)
      return { success: false, message: "Batch name required ❌" };

    const batchSh = sh_(SHEET_BATCHES);
    const lastId = getLastId_(batchSh, 1);
    const batchId = generateId_("BAT", lastId);

    batchSh.appendRow([batchId, batchName, startDate, 0]);
    return { success: true, message: "Batch created ✅", batchId, batchName };
  } catch (err) {
    Logger.log("api_adminCreateBatch error: " + err);
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// INTERNS LIST
// ============================================================

function api_getInternsList(adminId, adminPass, batchId, sort) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };

    // ✅ FIX: graceful handling if sheet doesn't exist yet
    const internSheet = ss_().getSheetByName(SHEET_INTERNS);
    if (!internSheet) return { success: true, interns: [] };

    let list = mapRows_(internSheet);

    if (batchId && batchId !== "all" && batchId !== "") {
      list = list.filter(x => String(x.BatchID) === String(batchId));
    }

    list = list.filter(x => String(x.Status) === "Active");

    if (sort === "name") {
      list.sort((a, b) => String(a.Name).localeCompare(String(b.Name)));
    } else if (sort === "date") {
      list.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
    }

    list = list.map(i => {
      const { PasswordHash, ...safe } = i;
      return safe;
    });

    return { success: true, interns: list };
  } catch (err) {
    Logger.log("api_getInternsList error: " + err);
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// INTERN OVERVIEW (Admin)
// ============================================================

function api_adminInternOverview(adminId, adminPass, internId) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow === -1)
      return { success: false, message: "Intern not found ❌" };

    const internData = mapRows_(internsSh).find(x => String(x.InternID) === String(internId));
    const { PasswordHash, ...safeIntern } = internData || {};

    const tasks = mapRows_(sh_(SHEET_TASKS)).filter(t =>
      String(t.BatchID) === String(safeIntern.BatchID) ||
      String(t.InternID) === String(internId)
    );

    const subs = mapRows_(sh_(SHEET_SUBS)).filter(s =>
      String(s.InternID) === String(internId)
    );

    // Build history: tasks with their submission status
    const history = tasks.map(t => {
      const sub = subs.find(s => String(s.AssignedTaskID) === String(t.AssignedTaskID));
      return {
        AssignedTaskID: t.AssignedTaskID,
        Title: t.Title || t.TaskTitle || "",
        Date: normalizeDate_(t.Date),
        SubmittedAt: sub ? normalizeDate_(sub.SubmittedAt) : "",
        Grade: sub ? sub.Grade : "",
        Remarks: sub ? sub.Remarks : "",
        FinalStatus: sub ? sub.FinalStatus : "Pending",
        Link: sub ? sub.Link : ""
      };
    });

    const submitted = subs.length;
    const total = tasks.length;
    const graded = subs.filter(s => s.Grade && String(s.Grade).trim() !== "").length;

    return {
      success: true,
      intern: safeIntern,
      history,
      stats: { submitted, total, graded, pending: total - submitted }
    };
  } catch (err) {
    Logger.log("api_adminInternOverview error: " + err);
    return { success: false, message: "Server error: " + err.message };
  }
}

// ============================================================
// INCOMPLETE STUDENTS
// ============================================================

function api_getIncompleteStudents(adminId, adminPass, date) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const checkDate = date || today_();
    const interns = mapRows_(sh_(SHEET_INTERNS)).filter(x => String(x.Status) === "Active");
    const tasks = mapRows_(sh_(SHEET_TASKS));
    const subs = mapRows_(sh_(SHEET_SUBS));

    const dayTasks = tasks.filter(t => normalizeDate_(t.Date) === checkDate);

    const incomplete = [];
    interns.forEach(intern => {
      const myTasks = dayTasks.filter(t =>
        (String(t.BatchID) === String(intern.BatchID) && (!t.InternID || String(t.InternID).trim() === "")) ||
        String(t.InternID) === String(intern.InternID)
      );
      if (myTasks.length === 0) return;

      const pending = myTasks.filter(t =>
        !subs.find(s =>
          String(s.InternID) === String(intern.InternID) &&
          String(s.AssignedTaskID) === String(t.AssignedTaskID)
        )
      );

      if (pending.length > 0) {
        incomplete.push({
          InternID: intern.InternID,
          Name: intern.Name,
          Email: intern.Email,
          BatchName: intern.BatchName,
          PendingTasks: pending.length
        });
      }
    });

    return { success: true, students: incomplete, date: checkDate };
  } catch (err) {
    Logger.log("api_getIncompleteStudents error: " + err);
    return { success: false, message: "Server error: " + err.message };
  }
}

// ============================================================
// TASKS — Intern Side
// ============================================================

function api_getInternToday(internId) {
  try {
    if (!internId) return { success: false, message: "internId required ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow === -1) return { success: false, message: "Intern not found ❌" };

    const batchId = internsSh.getRange(iRow, 4).getValue();
    const internCreatedAt = normalizeDate_(internsSh.getRange(iRow, 8).getValue()); // Col 8 = CreatedAt
    const today = today_();

    const tasks = mapRows_(sh_(SHEET_TASKS)).filter(t => {
      const taskDate = normalizeDate_(t.AssignedAt || t.Date);
      const isBatch = String(t.BatchID) === String(batchId)
        && (!t.InternID || String(t.InternID).trim() === "")
        && taskDate >= internCreatedAt; // ← sirf joining ke baad ke tasks
      const isPersonal = String(t.InternID) === String(internId);
      return normalizeDate_(t.Date) === today && (isBatch || isPersonal);
    });

    const subs = mapRows_(sh_(SHEET_SUBS)).filter(s => String(s.InternID) === String(internId));

    const enriched = tasks.map(t => {
      const sub = subs.find(s => String(s.AssignedTaskID) === String(t.AssignedTaskID));
      return { ...t, submitted: !!sub, submission: sub || null };
    });

    return { success: true, tasks: enriched, date: today };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}

function api_getMyBatchInterns(internId) {
  try {
    if (!internId) return { success: false, message: "internId required ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow === -1) return { success: false, message: "Intern not found ❌" };

    const batchId = internsSh.getRange(iRow, 4).getValue();
    const all = mapRows_(internsSh)
      .filter(i => String(i.BatchID) === String(batchId) && String(i.Status) === "Active")
      .map(i => { const { PasswordHash, ...s } = i; return s; });

    const batchName = all.length > 0 ? (all[0].BatchName || "") : "";
    return { success: true, interns: all, batchName };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}



// ============================================================
// INTERN AUTH — Login / Password
// ============================================================

function api_internLogin(b) {
  try {
    const internId = (b.internId || "").trim();
    const password = (b.password || "").trim();

    if (!internId || !password)
      return { success: false, message: "internId aur password required ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow === -1)
      return { success: false, message: "Intern not found ❌" };

    const storedHash = String(internsSh.getRange(iRow, 7).getValue()).trim();
    if (!storedHash)
      return { success: false, message: "Password set nahi hai. Email link use karo ❌" };

    if (storedHash !== hashPassword_(password))
      return { success: false, message: "Wrong password ❌" };

    const internData = mapRows_(internsSh).find(x => String(x.InternID) === internId);
    const { PasswordHash, ...safe } = internData || {};

    return { success: true, message: "Login successful ✅", intern: safe };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}

function api_internSetPassword(b) {
  try {
    const internId = (b.internId || "").trim();
    const newPassword = (b.newPassword || b.password || "").trim();

    if (!internId || !newPassword)
      return { success: false, message: "internId aur newPassword required ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow === -1)
      return { success: false, message: "Intern not found ❌" };

    internsSh.getRange(iRow, 7).setValue(hashPassword_(newPassword));
    return { success: true, message: "Password set ho gaya ✅" };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}

function api_internChangePassword(b) {
  try {
    const internId = (b.internId || "").trim();
    const oldPassword = (b.oldPassword || "").trim();
    const newPassword = (b.newPassword || "").trim();

    if (!internId || !oldPassword || !newPassword)
      return { success: false, message: "internId, oldPassword, newPassword required ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow === -1)
      return { success: false, message: "Intern not found ❌" };

    const stored = String(internsSh.getRange(iRow, 7).getValue()).trim();
    if (stored !== hashPassword_(oldPassword))
      return { success: false, message: "Old password galat hai ❌" };

    internsSh.getRange(iRow, 7).setValue(hashPassword_(newPassword));
    return { success: true, message: "Password change ho gaya ✅" };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}

function api_sendPasswordOTP(b) {
  try {
    const internId = (b.internId || "").trim();
    if (!internId) return { success: false, message: "internId required ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow === -1) return { success: false, message: "Intern not found ❌" };

    const email = internsSh.getRange(iRow, 3).getValue();
    const name = internsSh.getRange(iRow, 2).getValue();
    const otp = generateOTP_();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Store OTP temporarily in a ScriptProperties
    const props = PropertiesService.getScriptProperties();
    props.setProperty("OTP_" + internId, JSON.stringify({ otp, expiry }));

    sendEmail_(email, `${INSTITUTE_NAME} — Password Reset OTP`, buildOTPEmail_(name, otp, OTP_EXPIRY_MINUTES));
    return { success: true, message: "OTP sent ✅" };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}

function api_verifyPasswordOTP(b) {
  try {
    const internId = (b.internId || "").trim();
    const otp = (b.otp || "").trim();
    const newPassword = (b.newPassword || "").trim();

    if (!internId || !otp || !newPassword)
      return { success: false, message: "internId, otp, newPassword required ❌" };

    const props = PropertiesService.getScriptProperties();
    const stored = props.getProperty("OTP_" + internId);
    if (!stored) return { success: false, message: "OTP expired ya valid nahi ❌" };

    const { otp: savedOtp, expiry } = JSON.parse(stored);
    if (new Date() > new Date(expiry)) {
      props.deleteProperty("OTP_" + internId);
      return { success: false, message: "OTP expire ho gaya ❌" };
    }

    if (otp !== savedOtp) return { success: false, message: "Wrong OTP ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow === -1) return { success: false, message: "Intern not found ❌" };

    internsSh.getRange(iRow, 7).setValue(hashPassword_(newPassword));
    props.deleteProperty("OTP_" + internId);

    return { success: true, message: "Password reset ho gaya ✅" };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// INTERN PROFILE UPDATE + PHOTO UPLOAD
// ============================================================

function api_updateInternProfile(b) {
  try {
    const internId = (b.internId || "").trim();
    if (!internId) return { success: false, message: "internId required ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow === -1) return { success: false, message: "Intern not found ❌" };

    if (b.bio !== undefined) internsSh.getRange(iRow, 10).setValue(b.bio || "");
    if (b.phone !== undefined) {
      const headers = internsSh.getRange(1, 1, 1, internsSh.getLastColumn()).getValues()[0].map(h => String(h).trim());
      const phoneCol = headers.indexOf("Phone") + 1;
      if (phoneCol > 0) internsSh.getRange(iRow, phoneCol).setValue(b.phone || "");
    }

    return { success: true, message: "Profile updated ✅" };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}

function uploadInternPhoto(b) {
  try {
    const internId = (b.internId || "").trim();
    const base64 = (b.base64 || "").trim();
    const mimeType = (b.mimeType || "image/jpeg").trim();
    const fileName = (b.fileName || internId + "_photo").trim();

    if (!internId || !base64)
      return { success: false, message: "internId aur base64 required ❌" };

    const folder = DriveApp.getFolderById(DOC_OUTPUT_FOLDER_ID);
    const decoded = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
    const file = folder.createFile(decoded);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const photoUrl = "https://drive.google.com/uc?id=" + file.getId();

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow !== -1) internsSh.getRange(iRow, 11).setValue(photoUrl);

    return { success: true, message: "Photo uploaded ✅", photoUrl };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// DOCUMENTS — Admin Send
// ============================================================
function api_adminSendDocuments(b) {
  try {
    if (!isAdmin_(b.adminId, b.adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const internId = (b.internId || "").trim();
    const documents = b.documents || [];

    if (!internId || documents.length === 0)
      return { success: false, message: "internId aur documents required ❌" };

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow === -1)
      return { success: false, message: "Intern not found ❌" };

    const internData = mapRows_(internsSh).find(x => String(x.InternID) === internId);

    // ── Pull verifiedData safely ──
    const vd = b.verifiedData || {};

    // ── FIX 1: RefNo — unify all sources ──
    // Offer Letter  → vd.refNo  (vfRefNo hidden input)
    // Joining Letter → vd.refNo (jlRefNo hidden input)
    // Completion Letter → vd.serialNo was used in frontend, map it here
    const resolvedRefNo = vd.refNo || vd.serialNo || "";

    // ── FIX 4: StartDate legacy alias — always from joiningDate ──
    const resolvedStartDate = vd.joiningDate
      ? formatDateGAS_(new Date(vd.joiningDate))
      : (b.startDate || "");

    // ── FIX 6: Pronouns — safe defaults if not provided ──
    const resolvedGender = vd.gender || "";
    const resolvedPronoun = vd.pronoun || (resolvedGender === "female" ? "she" : "he");
    const resolvedPronounObj = vd.pronounObj || (resolvedGender === "female" ? "her" : "him");
    const resolvedPronounPoss = vd.pronounPoss || (resolvedGender === "female" ? "her" : "his");


    const placeholders = {

      "{{Name}}": toProperCase_(internData.Name),
      "{{FullName}}": toProperCase_(vd.fullName || internData.Name || ""),


      // ── Intern Sheet se (hamesha available) ──
      // "{{Name}}": internData.Name || "",
      "{{InternID}}": internData.InternID || "",
      "{{BatchName}}": internData.BatchName || "",
      "{{Duration}}": internData.Duration || "",
      "{{Email}}": internData.Email || "",
      "{{Date}}": formatDateGAS_(new Date()),
      "{{Institute}}": INSTITUTE_NAME,

      // ── RefNo — Offer Letter + Joining Letter: vd.refNo
      //           Completion Letter: vd.serialNo → bhi refNo se resolve hoga ──
      "{{RefNo}}": vd.refNo || vd.serialNo || "",

      // ── Completion Letter ka apna serial ──
      "{{SerialNo}}": vd.serialNo || vd.refNo || "",

      // ── Common verified fields ──
      // "{{FullName}}": vd.fullName || internData.Name || "",
      "{{CurrentDate}}": vd.currentDate
        ? formatDateGAS_(new Date(vd.currentDate))
        : formatDateGAS_(new Date()),

      // ── Mobile — Offer Letter + LOI + Joining Letter ──
      "{{Mobile}}": vd.mobile || "",

      // ── Role ──
      "{{Role}}": vd.role || "",

      "{{JoiningDate}}": vd.joiningDate
        ? formatDateGAS_(new Date(vd.joiningDate))
        : "",

      "{{StartDate}}": vd.joiningDate
        ? formatDateLong_(new Date(vd.joiningDate))
        : (b.startDate || ""),

      "{{EndDate}}": vd.endDate
        ? formatDateLong_(new Date(vd.endDate))
        : "",


      // ── Stipend — Offer Letter ──
      "{{Stipend}}": vd.stipend || "Unpaid",

      // ── Completion Letter — Gender + Pronouns ──
      "{{Gender}}": vd.gender || "",
      "{{Pronoun}}": vd.pronoun || (vd.gender === "female" ? "she" : "he"),
      "{{PronounObj}}": vd.pronounObj || (vd.gender === "female" ? "her" : "him"),
      "{{PronounPoss}}": vd.pronounPoss || (vd.gender === "female" ? "her" : "his"),

      // ── Completion Letter — College ──
      "{{College}}": vd.college || "",

      // ── Completion Letter — Projects WITH serial numbers ──
      // Template mein sirf {{Project1}} likhna hai
      // Output: "1. Calculator App", "2. Todo List", etc.
      "{{Project1}}": vd.project1 ? "1. " + vd.project1 : "",
      "{{Project2}}": vd.project2 ? "2. " + vd.project2 : "",
      "{{Project3}}": vd.project3 ? "3. " + vd.project3 : "",
      "{{Project4}}": vd.project4 ? "4. " + vd.project4 : "",

      // ── Best Performer Certificate ──
      "{{AwardDate}}": vd.date
        ? formatDateGAS_(new Date(vd.date))
        : formatDateGAS_(new Date()),
    };

    const skipEmail = b.skipEmail === true;
    // ── preGeneratedLinks — PDF dobara generate mat karo, sirf mail bhejo ──
    if (b.preGeneratedLinks && b.preGeneratedLinks.length > 0) {
      const docLinks = b.preGeneratedLinks;
      const folderLink = docLinks[0]?.url || "";
      const emailTo = b.emailTo;

      if (emailTo) {
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

        GmailApp.sendEmail(emailTo, INSTITUTE_NAME + " — Your Internship Documents", plainBody, {
          htmlBody: buildDocLinkEmail_(internData.Name, docLinks, folderLink),
          name: INSTITUTE_NAME + " HR Team"
        });

        const sentAt = nowISO_();

        if (!skipEmail) {
          documents.forEach(docType => {
            const col = DOC_COLS[docType];
            if (col) internsSh.getRange(iRow, col).setValue(sentAt);
          });
        }
      }

      return {
        success: true,
        message: "Documents emailed ✅",
        driveLink: folderLink,
        docLinks: docLinks
      };
    }

    const result = generateAndSendDocs_(internData, documents, placeholders, skipEmail);
    if (!result.success) return result;

    // skipEmail false hone par hi mark karo
    const sentAt = nowISO_();

    if (!skipEmail) {
      documents.forEach(docType => {
        const col = DOC_COLS[docType];
        if (col) internsSh.getRange(iRow, col).setValue(sentAt);
      });
    }

    return {
      success: true,
      message: skipEmail ? "Documents generated ✅" : "Documents sent ✅ " + result.sentLabels.join(", "),
      driveLink: result.driveLink,
      docLinks: result.docLinks,
      saveErrors: result.saveErrors,
      sentAt
    };

  } catch (err) {
    Logger.log("api_adminSendDocuments error: " + err);
    return { success: false, message: "Server error: " + err.message };
  }
}

function toProperCase_(str) {
  if (!str) return "";
  return String(str).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function formatDateLong_(date) {
  if (!date) return "-";
  try {
    const d = new Date(date);
    if (isNaN(d)) return String(date);
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "dd MMMM yyyy");
  } catch (e) {
    return String(date);
  }
}

// ============================================================
// CHAT
// ============================================================

function api_getChat(adminId, adminPass, internId) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };

    if (!internId) return { success: false, message: "internId required ❌" };

    const msgs = mapRows_(sh_(SHEET_MSG))
      .filter(m => String(m.InternID) === String(internId))
      .sort((a, b) => new Date(a.CreatedAt) - new Date(b.CreatedAt));

    return { success: true, messages: msgs };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}

function api_internGetChat(internId) {
  try {
    if (!internId) return { success: false, message: "internId required ❌" };

    const msgs = mapRows_(sh_(SHEET_MSG))
      .filter(m => String(m.InternID) === String(internId))
      .sort((a, b) => new Date(a.CreatedAt) - new Date(b.CreatedAt));

    return { success: true, messages: msgs };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}

function api_sendMessageGET_(adminId, adminPass, internId, sender, message) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };
    if (!internId || !message)
      return { success: false, message: "internId aur message required ❌" };

    const msgSh = sh_(SHEET_MSG);
    const lastId = getLastId_(msgSh, 1);
    const msgId = generateId_("MSG", lastId);
    const expiry = new Date(Date.now() + MSG_EXPIRY_HOURS * 3600 * 1000).toISOString();

    msgSh.appendRow([msgId, internId, sender || "Admin", message, nowISO_(), expiry]);
    return { success: true, message: "Message sent ✅" };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}

function api_clearChatGET_(adminId, adminPass, internId, by) {
  try {
    if (!isAdmin_(adminId, adminPass))
      return { success: false, message: "Unauthorized ❌" };

    const msgSh = sh_(SHEET_MSG);
    const data = msgSh.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const internCol = headers.indexOf("InternID") + 1;

    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][internCol - 1]).trim() === String(internId).trim()) {
        msgSh.deleteRow(i + 1);
      }
    }

    return { success: true, message: "Chat cleared ✅" };
  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}


// ============================================================
// ACHIEVEMENT EMAIL (helper called after grading)
// ============================================================

function checkAndSendAchievementEmail_(internId) {
  try {
    const subs = mapRows_(sh_(SHEET_SUBS)).filter(s => String(s.InternID) === String(internId));
    const approved = subs.filter(s => String(s.FinalStatus).toLowerCase() === "approved");

    const milestones = [5, 10, 25, 50];
    if (!milestones.includes(approved.length)) return;

    const internsSh = sh_(SHEET_INTERNS);
    const iRow = findRow_(internsSh, 1, internId);
    if (iRow === -1) return;

    const email = internsSh.getRange(iRow, 3).getValue();
    const name = internsSh.getRange(iRow, 2).getValue();

    sendEmail_(email, `${INSTITUTE_NAME} — Achievement Unlocked`, buildAchievementEmail_(name, approved.length));
  } catch (err) {
    Logger.log("checkAndSendAchievementEmail_ error: " + err);
  }
}