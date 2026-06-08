// ============================================================
// CODELINE.AI — AdminIntern.gs  (FIXED)
// ============================================================
function api_adminCreateIntern(b) {
  if (!isAdmin_(b.adminId, b.adminPass))
    return { success: false, message: "Unauthorized ❌" };

  const interns = sh_(SHEET_INTERNS);
  const batches = sh_(SHEET_BATCHES);

  const name     = (b.name     || "").trim();
  const email    = (b.email    || "").trim();
  const batchId  = (b.batchId  || "").trim();
  const duration = (b.duration || "6 Months").trim();

  if (!name || !email || !batchId)
    return { success: false, message: "Missing fields ❌" };

  const batchRow = findRow_(batches, 1, batchId);
  if (batchRow === -1)
    return { success: false, message: "Batch not found ❌" };

  const batchName  = batches.getRange(batchRow, 2).getValue();
  const internList = mapRows_(interns);
  const countInBatch = internList.filter(x => String(x.BatchID) === batchId && String(x.Status) === "Active").length;

  if (countInBatch >= BATCH_CAPACITY)
    return { success: false, message: `Batch full ❌ (Max ${BATCH_CAPACITY}) Create new batch.` };

  // ✅ YAHAN AAYA — function ke andar
  const internId = generateNextInternId_();

  // ✅ SIRF EK BAAR check
  if (isInternIdRetired_(internId))
    return { success: false, message: "Generated InternID '" + internId + "' is retired ❌ Please try again." };

  interns.appendRow([
    internId, name, email, batchId, batchName, duration,
    "",
    nowISO_(),
    "Active",
    "", "", "", "", "", "", "", ""
  ]);

  const loginUrl = "https://technocrat.asterisc.in/dashboard/";
  if (!b.skipWelcomeMail) {
    sendEmail_(email, INSTITUTE_NAME + " — Welcome to CodeLine! 🚀", buildManualWelcomeEmail_(name, internId, batchName, duration, loginUrl));
  }

  return { success: true, message: "Intern Created ✅", internId, batchName };
}


function sendPendingTaskReminders() {
  const interns = mapRows_(sh_(SHEET_INTERNS)).filter(x => String(x.Status) === "Active");
  const tasks   = mapRows_(sh_(SHEET_TASKS));
  const subs    = mapRows_(sh_(SHEET_SUBS));
  const today   = today_();

  interns.forEach(intern => {
    // FIX: skip interns with no email — MailApp throws on empty address,
    // halting all remaining reminders in the loop
    const internEmail = String(intern.Email || "").trim();
    if (!internEmail) {
      Logger.log("⚠️ Skipping reminder — no email for intern: " + intern.InternID);
      return;
    }

    const todaysTasks = tasks.filter(t => {
      const taskDate     = normalizeDate_(t.Date);
      const batchTask    = String(t.BatchID) === String(intern.BatchID) && (!t.InternID || String(t.InternID).trim() === "");
      const personalTask = String(t.InternID) === String(intern.InternID);
      return taskDate === today && (batchTask || personalTask);
    });
    if (todaysTasks.length === 0) return;

    let pendingCount = 0;
    todaysTasks.forEach(t => {
      const hasSub = subs.find(s => String(s.InternID) === String(intern.InternID) && String(s.AssignedTaskID) === String(t.AssignedTaskID));
      if (!hasSub) pendingCount++;
    });
    if (pendingCount === 0) return;

    
    sendEmail_(internEmail, `${INSTITUTE_NAME} — Pending Task Reminder`, buildPendingTaskReminderEmail_(intern.Name, pendingCount));
  });
}

function api_adminAssignBatchTask(b) {
  if (!isAdmin_(b.adminId, b.adminPass))
    return { success: false, message: "Unauthorized ❌" };

  const batchId     = (b.batchId     || "").trim();
  const title       = (b.title       || "").trim();
  const description = (b.description || "").trim();
  const date        = (b.date        || today_()).trim();

  if (!batchId || !title)
    return { success: false, message: "Missing fields ❌" };

  const batchesSh = sh_(SHEET_BATCHES);
  const batchRow  = findRow_(batchesSh, 1, batchId);
  if (batchRow === -1)
    return { success: false, message: "Batch not found ❌" };

  const batchName = batchesSh.getRange(batchRow, 2).getValue();

  const tasksSh = sh_(SHEET_TASKS);
  const lastRow = tasksSh.getLastRow();
  const lastId  = lastRow > 1 ? tasksSh.getRange(lastRow, 1).getValue() : "";
  const taskId  = generateId_("TASK", lastId);

  // ✅ Correct column order: A=AssignedTaskID, B=Date, C=BatchID, D=BatchName,
  //    E=InternID, F=Title, G=Description, H=Status, I=AssignedAt
  tasksSh.appendRow([
    taskId,       // A - AssignedTaskID
    date,         // B - Date
    batchId,      // C - BatchID
    batchName,    // D - BatchName
    "",           // E - InternID (blank for batch task)
    title,        // F - Title
    description,  // G - Description
    "Assigned",   // H - Status
    nowISO_()     // I - AssignedAt
  ]);

  const interns = mapRows_(sh_(SHEET_INTERNS))
    .filter(i => String(i.BatchID) === batchId && String(i.Status) === "Active");

  const formattedDate = formatDateGAS_(date);
  let emailsSent = 0;
  const emailErrors = [];

  interns.forEach(intern => {
    const email = String(intern.Email || "").trim();
    if (!email) return;
    try {
      MailApp.sendEmail({
        to: email,
        subject: `${INSTITUTE_NAME} — New Task Assigned: ${title}`,
        htmlBody: buildTaskAssignedEmail_(intern.Name, title, formattedDate, description),
        body: `New task assigned: ${title} | Date: ${formattedDate}`
      });
      emailsSent++;
    } catch(err) {
      Logger.log("Batch email failed for " + email + ": " + err.toString());
      emailErrors.push(email + ": " + err.message);
    }
  });

  return {
    success: true,
    message: `Batch Task Assigned ✅ | ${emailsSent}/${interns.length} email(s) sent`,
    emailErrors: emailErrors.length > 0 ? emailErrors : null
  };
}


function api_adminAssignIndividualTask(b) {
  if (!isAdmin_(b.adminId, b.adminPass))
    return { success: false, message: "Unauthorized ❌" };

  const internId    = (b.internId    || "").trim();
  const title       = (b.title       || "").trim();
  const description = (b.description || "").trim();
  const date        = (b.date        || today_()).trim();

  if (!internId || !title)
    return { success: false, message: "Missing fields ❌" };

  const internsSh   = sh_(SHEET_INTERNS);
  const iRow        = findRow_(internsSh, 1, internId);
  if (iRow === -1)
    return { success: false, message: "Intern not found ❌" };

  const internName  = internsSh.getRange(iRow, 2).getValue();
  const internEmail = String(internsSh.getRange(iRow, 3).getValue() || "").trim();
  const batchId     = String(internsSh.getRange(iRow, 4).getValue() || "").trim();
  const batchName   = String(internsSh.getRange(iRow, 5).getValue() || "").trim();

  const tasksSh = sh_(SHEET_TASKS);
  const lastRow = tasksSh.getLastRow();
  const lastId  = lastRow > 1 ? tasksSh.getRange(lastRow, 1).getValue() : "";
  const taskId  = generateId_("TASK", lastId);

  // ✅ Same column order
  tasksSh.appendRow([
    taskId,       // A - AssignedTaskID
    date,         // B - Date
    batchId,      // C - BatchID
    batchName,    // D - BatchName
    internId,     // E - InternID
    title,        // F - Title
    description,  // G - Description
    "Assigned",   // H - Status
    nowISO_()     // I - AssignedAt
  ]);

  let emailSent = false;
  if (internEmail) {
    try {
      MailApp.sendEmail({
        to: internEmail,
        subject: `${INSTITUTE_NAME} — New Task Assigned: ${title}`,
        htmlBody: buildTaskAssignedEmail_(internName, title, formatDateGAS_(date), description),
        body: `New task assigned: ${title} | Date: ${formatDateGAS_(date)}`
      });
      emailSent = true;
    } catch(err) {
      Logger.log("Individual email failed for " + internEmail + ": " + err.toString());
    }
  }

  return {
    success: true,
    message: `Individual Task Assigned ✅ | Email ${emailSent ? "sent to " + internEmail : "failed ❌ check logs"}`
  };
}