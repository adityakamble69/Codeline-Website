// ============================================================
// DEBUG — Ye function GAS Editor mein manually run karo
// Executions tab mein exact output dikhega
// ============================================================

function debugGradeSubmission() {
  const subs = sh_(SHEET_SUBS);
  const data = subs.getDataRange().getValues();
  
  // Row 2 (first submission) pe test karo
  const headers = data[0].map(h => String(h).trim());
  Logger.log("=== HEADERS ===");
  headers.forEach((h, i) => Logger.log("Col " + (i+1) + " (" + String.fromCharCode(65+i) + ") = '" + h + "'"));
  
  const COL_FINALSTATUS = headers.indexOf("FinalStatus") + 1;
  Logger.log("=== FinalStatus column number: " + COL_FINALSTATUS + " ===");
  
  // Har row ka FinalStatus dekho
  Logger.log("=== ALL ROWS FinalStatus ===");
  for (let i = 1; i < data.length; i++) {
    Logger.log("Row " + (i+1) + " | SubmissionID=" + data[i][0] + " | FinalStatus='" + data[i][COL_FINALSTATUS - 1] + "' | raw col11='" + data[i][10] + "'");
  }
}

function debugForceApprove() {
  // Pehli pending submission ko force approve karo — direct test
  const subs = sh_(SHEET_SUBS);
  const data = subs.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  
  const COL_SUBMISSIONID = headers.indexOf("SubmissionID") + 1;
  const COL_FINALSTATUS  = headers.indexOf("FinalStatus")  + 1;
  
  Logger.log("COL_SUBMISSIONID=" + COL_SUBMISSIONID + " | COL_FINALSTATUS=" + COL_FINALSTATUS);
  
  for (let i = 1; i < data.length; i++) {
    const status = String(data[i][COL_FINALSTATUS - 1] || "").trim().toLowerCase();
    if (status === "pending" || status === "") {
      const sid = data[i][COL_SUBMISSIONID - 1];
      Logger.log("Testing write on row " + (i+1) + " | SubmissionID=" + sid);
      
      subs.getRange(i + 1, COL_FINALSTATUS).setValue("Approved");
      SpreadsheetApp.flush();
      
      const written = String(subs.getRange(i + 1, COL_FINALSTATUS).getValue()).trim();
      Logger.log("Written value = '" + written + "' | SUCCESS=" + (written === "Approved"));
      break;
    }
  }
}