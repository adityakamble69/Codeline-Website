// ================================================================
// CODELINE.AI — Admin Performance Patch
// PASTE THIS inside admin.html, just before the closing </script> tag
//
// Fixes:
//   1. loadInterns  — joining data ab cached fetch se aayega (no double wait)
//   2. loadActiveInterns — interns_all cache use karega
//   3. openSendDocModal — doc status ab 30-sec cache se load hoga (instant reopen)
//   4. openJlVerifyStep — phone number joining cache se milega (no extra call)
//   5. loadEnrolledStudents — cachedGET use karega
// ================================================================

// ── Cache TTL override (optional): doc-status 60 sec tak fresh rakho ──
// Agar CACHE_TTL app.js mein 30000 (30s) hai, to ye theek hai.
// Doc status slower change hota hai, isliye hum ek alag longer TTL use karenge.
const DOC_STATUS_TTL = 60 * 1000; // 60 seconds

// ── Joining data global store (shared between loadInterns + openJlVerifyStep) ──
let _joiningDataCache = null;
let _joiningDataTs = 0;
const JOINING_CACHE_TTL = 45 * 1000; // 45 seconds

async function _getJoiningCached(silent = true) {
  const now = Date.now();
  if (_joiningDataCache && (now - _joiningDataTs) < JOINING_CACHE_TTL) {
    return _joiningDataCache;
  }
  const data = await apiGET({
    action: "getJoiningInterns",
    adminId: admin.adminId,
    adminPass: admin.adminPass,
    status: ""
  }, silent);
  if (data && data.success) {
    _joiningDataCache = data;
    _joiningDataTs = Date.now();
  }
  return data;
}

// ── Doc status cache (per internId) ──
const _docStatusCache = {};

async function _getDocStatusCached(internId, silent = true) {
  const entry = _docStatusCache[internId];
  const now = Date.now();
  if (entry && (now - entry.ts) < DOC_STATUS_TTL) {
    return entry.data;
  }
  const data = await apiGET({
    action: "getInternDocStatus",
    adminId: admin.adminId,
    adminPass: admin.adminPass,
    internId
  }, silent);
  if (data && data.success) {
    _docStatusCache[internId] = { data, ts: Date.now() };
  }
  return data;
}

function _invalidateDocStatusCache(internId) {
  delete _docStatusCache[internId];
}

// ================================================================
// FIX 1: loadInterns — joining data parallel fetch karo, sequential nahi
// ================================================================
async function loadInterns(silent = false) {
  const requestId = ++currentInternRequestId;
  const filterEl = document.getElementById("filterBatch");
  const batchId = filterEl ? filterEl.value : "";
  const cacheKey = "interns_" + (batchId || "all");

  const tb = document.getElementById("internTable");
  if (!cacheGet(cacheKey)) {
    tb.innerHTML = `
      <tr><td colspan="7" style="padding:0;">
        <div style="display:flex;flex-direction:column;gap:8px;padding:10px 0;">
          ${[1, 2, 3, 4, 5].map(() => `
            <div style="height:38px;border-radius:10px;
              background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);
              background-size:200% 100%;
              animation:shimmer 1.2s infinite;">
            </div>`).join("")}
        </div>
      </td></tr>`;
  }

  // ✅ FIX: joining + interns dono PARALLEL fetch karo (Promise.all)
  // Pehle cached joining data check karo — agar fresh hai toh network hit nahi
  const [internResult, joiningResult] = await Promise.all([
    // interns: cachedGET ke through (returns via callback, wrap in promise)
    new Promise(resolve => {
      cachedGET(
        { action: "getInternsList", adminId: admin.adminId, adminPass: admin.adminPass, batchId },
        cacheKey,
        (data, fromCache) => resolve({ data, fromCache })
      );
    }),
    // joining: apna cache use karo
    _getJoiningCached(true).catch(() => null)
  ]);

  // Build joining date map from cached/fresh joining data
  let joiningDateMap = {};
  try {
    const jData = joiningResult;
    if (jData && jData.success && jData.joiningInterns) {
      jData.joiningInterns.forEach(j => {
        const em = (j["Email"] || j.Email || "").trim().toLowerCase();
        const dt = toDateInputValue(j["Joining Date"] || j.JoiningDate || "");
        if (em && dt) joiningDateMap[em] = dt;
      });
    }
  } catch (e) { }

  // Render
  const { data } = internResult;
  if (requestId !== currentInternRequestId) return;
  if (!data || !data.success) {
    if (!silent) toast(data?.message || "Load failed ❌", "error");
    return;
  }

  const list = data.interns || [];
  const countEl = document.getElementById("batchCount");
  if (countEl) countEl.innerText = list.length;

  if (list.length === 0) {
    tb.innerHTML = `<tr><td colspan="7">No interns found ✅</td></tr>`;
    return;
  }

  const rows = list.map(i => {
    const emailKey = (i.Email || "").trim().toLowerCase();
    const joinDate = joiningDateMap[emailKey] || "";
    return `
    <tr>
      <td><b>${i.InternID}</b></td>
      <td>${escapeHTML(i.Name)}</td>
      <td>${escapeHTML(i.Email)}</td>
      <td>${escapeHTML(i.BatchName)}</td>
      <td>${escapeHTML(i.Duration)}</td>
      <td>${joinDate ? formatDate(joinDate) : (i.CreatedAt ? formatDate(i.CreatedAt) : "-")}</td>
      <td>
        <div class="actionWrap" id="aw_${i.InternID}">
          <button class="dotBtn" onclick="toggleActionMenu('${i.InternID}', event)">⋮</button>
          <div class="actionMenu" id="am_${i.InternID}">
            <button class="actionMenuItem view" onclick="closeAllMenus();openInternOverview('${i.InternID}')">
              <span class="actionMenuIcon">👁️</span> View Overview
            </button>
            <button class="actionMenuItem warn" onclick='closeAllMenus();openWarnModal(${JSON.stringify(JSON.stringify({ InternID: i.InternID, Name: i.Name, Email: i.Email }))})'>
              <span class="actionMenuIcon">⚠️</span> Send Warning
            </button>
            <button class="actionMenuItem remove" onclick='closeAllMenus();openRemoveModal(${JSON.stringify(JSON.stringify({ InternID: i.InternID, Name: i.Name, Email: i.Email, BatchName: i.BatchName }))})'>
              <span class="actionMenuIcon">🗑️</span> Remove Intern
            </button>
          </div>
        </div>
      </td>
    </tr>`;
  }).join("");
  tb.innerHTML = rows;
}

// ================================================================
// FIX 2: loadActiveInterns (Send Docs page) — interns_all cache use karo
// ================================================================
async function loadActiveInterns(silent = false) {
  const cacheKey = "interns_all";
  const tb = document.getElementById("activeInternsTable");

  // Show shimmer only if cache is empty
  if (!cacheGet(cacheKey)) {
    tb.innerHTML = `
      <tr><td colspan="6" style="padding:0;">
        <div style="display:flex;flex-direction:column;gap:8px;padding:10px 0;">
          ${[1,2,3,4].map(() => `
            <div style="height:38px;border-radius:10px;
              background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);
              background-size:200% 100%;animation:shimmer 1.2s infinite;"></div>`).join("")}
        </div>
      </td></tr>`;
  }

  await cachedGET(
    { action: "getInternsList", adminId: admin.adminId, adminPass: admin.adminPass, batchId: "" },
    cacheKey,
    function (data, fromCache) {
      if (!data || !data.success) {
        tb.innerHTML = `<tr><td colspan="7"><div class="emptyEnrolled"><span>⚠️</span>${escapeHTML(data?.message || "Failed ❌")}</div></td></tr>`;
        return;
      }
      ALL_ACTIVE_INTERNS = data.interns || [];
      renderDocInternTable(ALL_ACTIVE_INTERNS);
    }
  );
}

// ================================================================
// FIX 3: openSendDocModal — doc status cache se load karo
// ================================================================
async function openSendDocModal(internJson) {
  const i = typeof internJson === "string" ? JSON.parse(internJson) : internJson;
  CURRENT_DOC_INTERN = i;
  GENERATED_DOC_LINK = "";
  SELECTED_DOCS = [];
  VERIFIED_DOC_DATA = {};
  window._currentDocStatus = {};

  // Reset all rows
  document.querySelectorAll(".docOptRow").forEach(row => {
    row.classList.remove("sent", "selected");
    row.style.opacity = "";
    row.style.cursor = "";
    row.style.borderColor = "";
    row.style.background = "";
    row.style.pointerEvents = "";
    const chk = row.querySelector("input[type=checkbox]");
    if (chk) { chk.checked = false; chk.disabled = false; }
    const badge = row.querySelector(".sentBadgeWrap");
    if (badge) badge.style.display = "none";
  });

  // Fill intern info
  document.getElementById("docInternAvatar").innerText = (i.Name || "?")[0].toUpperCase();
  document.getElementById("docInternName").innerText = i.Name || "-";
  document.getElementById("docInternEmail").innerText = i.Email || "-";
  document.getElementById("docInternBatch").innerText =
    `${i.BatchName || ""} · ${i.Duration || ""} · ID: ${i.InternID}`;
  document.getElementById("docModalMeta").innerText = `Intern: ${i.Email}`;
  document.getElementById("docEmailTo").value = i.Email || "";
  document.getElementById("docSelectedSummary").style.display = "none";
  document.getElementById("docStep1Msg").innerText = "";
  document.getElementById("docSendMsg").innerText = "";

  _showDocStep(1);
  document.getElementById("sendDocModal").classList.add("show");

  const proceedBtn = document.querySelector("#docStep1 .btn.primary");

  // ✅ FIX: check cache pehle — agar cached hai toh loader bhi nahi dikhega
  const hasCached = _docStatusCache[i.InternID] &&
    (Date.now() - _docStatusCache[i.InternID].ts) < DOC_STATUS_TTL;

  if (!hasCached && proceedBtn) {
    proceedBtn.disabled = true;
    proceedBtn.innerText = "⏳ Checking sent documents...";
    proceedBtn.style.background = "";
    proceedBtn.style.borderColor = "";
    proceedBtn.style.color = "";
  }

  try {
    const statusData = await _getDocStatusCached(i.InternID, true);

    if (statusData && statusData.success && statusData.status) {
      window._currentDocStatus = statusData.status;

      let unsentCount = 0;

      document.querySelectorAll(".docOptRow").forEach(row => {
        const key = row.dataset.key;
        const val = statusData.status[key];
        const chk = row.querySelector("input[type=checkbox]");
        const badgeWrap = row.querySelector(".sentBadgeWrap");
        const dateSpan = row.querySelector(".sentDate");

        if (val && String(val).trim() !== "") {
          row.classList.add("sent");
          row.style.opacity = "0.6";
          row.style.cursor = "not-allowed";
          row.style.borderColor = "rgba(0,200,100,0.25)";
          row.style.background = "rgba(0,200,100,0.04)";
          row.style.pointerEvents = "none";
          if (chk) { chk.disabled = true; chk.checked = false; }
          if (badgeWrap) badgeWrap.style.display = "block";
          if (dateSpan) dateSpan.innerText = String(val).replace("✅ ", "").trim();
        } else {
          row.style.pointerEvents = "";
          unsentCount++;
        }
      });

      if (unsentCount === 0) {
        document.getElementById("docStep1Msg").innerHTML =
          `<span style="color:#00c864;font-weight:800;">✅ Saare documents pehle se send ho chuke hain.</span>`;
        if (proceedBtn) {
          proceedBtn.disabled = true;
          proceedBtn.innerText = "✅ All Documents Already Sent";
          proceedBtn.style.background = "rgba(0,200,100,0.10)";
          proceedBtn.style.borderColor = "rgba(0,200,100,0.30)";
          proceedBtn.style.color = "#00c864";
        }
        return;
      }
    }
  } catch (e) {
    console.log("Doc status fetch failed:", e);
    window._currentDocStatus = {};
  }

  if (proceedBtn) {
    proceedBtn.disabled = false;
    proceedBtn.innerText = "⚡ Create Documents → Get Link";
    proceedBtn.style.background = "";
    proceedBtn.style.borderColor = "";
    proceedBtn.style.color = "";
  }
}

// ── After document is sent, invalidate that intern's doc status cache ──
// Wrap the original sendDocuments function to invalidate on success
const _origSendDocuments = typeof sendDocuments === "function" ? sendDocuments : null;
if (_origSendDocuments) {
  sendDocuments = async function () {
    await _origSendDocuments();
    // Invalidate doc cache for this intern after send
    if (CURRENT_DOC_INTERN && CURRENT_DOC_INTERN.InternID) {
      _invalidateDocStatusCache(CURRENT_DOC_INTERN.InternID);
      // Also invalidate interns list cache so doc badges refresh on table
      cacheInvalidate("interns_all");
    }
  };
}

// ================================================================
// FIX 4: openJlVerifyStep — phone from joining cache, no extra API call
// ================================================================
async function openJlVerifyStep() {
  const i = CURRENT_DOC_INTERN;
  if (!i) return;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  document.getElementById("jlRefAutoPrefix").innerText = "AST26-27/INS/ME/TC";
  document.getElementById("jlRefSerial").value = "";
  document.getElementById("jlRefPreview").innerText = "— Serial number daalo";
  document.getElementById("jlRefNo").value = "";
  if (typeof buildJlRefNo === "function") buildJlRefNo();

  document.getElementById("jlFullName").value = i.Name || "";
  document.getElementById("jlCurrentDate").value = todayStr;
  document.getElementById("jlVfMsg").innerText = "";

  let joiningDate = toDateInputValue(i.CreatedAt || "");
  if (!joiningDate) joiningDate = todayStr;
  document.getElementById("jlJoiningDate").value = joiningDate;

  // ✅ FIX: joining cache se phone lo — no extra API call
  let mobile = i.Phone || i.Mobile || "";
  if (!mobile) {
    try {
      const jData = await _getJoiningCached(true);
      if (jData && jData.success && jData.joiningInterns) {
        const match = jData.joiningInterns.find(j =>
          (j["Email"] || j.Email || "").trim().toLowerCase() ===
          (i.Email || "").trim().toLowerCase()
        );
        if (match) mobile = match["Phone"] || match.Phone || "";
      }
    } catch (e) { /* silent */ }
  }

  const mobileEl = document.getElementById("jlMobile");
  if (mobileEl) mobileEl.value = mobile;

  _showDocStep("verifyJoining");
}

// ================================================================
// FIX 5: loadEnrolledStudents — cachedGET use karo
// ================================================================
async function loadEnrolledStudents(silent = false) {
  const cacheKey = "joiningInterns_all";

  // Show shimmer if no cache
  const tb = document.getElementById("enrolledTable");
  if (!cacheGet(cacheKey) && tb) {
    tb.innerHTML = `
      <tr><td colspan="7" style="padding:0;">
        <div style="display:flex;flex-direction:column;gap:8px;padding:10px 0;">
          ${[1,2,3].map(() => `
            <div style="height:40px;border-radius:10px;
              background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);
              background-size:200% 100%;animation:shimmer 1.2s infinite;"></div>`).join("")}
        </div>
      </td></tr>`;
  }

  await cachedGET(
    { action: "getJoiningInterns", adminId: admin.adminId, adminPass: admin.adminPass, status: "" },
    cacheKey,
    function (data, fromCache) {
      // Also update the shared joining cache for loadInterns + openJlVerifyStep
      if (data && data.success) {
        _joiningDataCache = data;
        _joiningDataTs = Date.now();
      }

      if (!data || !data.success) {
        if (tb) tb.innerHTML = `<tr><td colspan="7"><div class="emptyEnrolled"><span>⚠️</span>${escapeHTML(data?.message || "Failed ❌")}</div></td></tr>`;
        return;
      }

      const raw = data.joiningInterns || [];

      const list = raw.map(s => ({
        FullName: s.FullName || [s["First Name"], s["Middle Name"], s["Last Name"]].filter(Boolean).join(" ") || "-",
        FirstName: s["First Name"] || "",
        MiddleName: s["Middle Name"] || "",
        LastName: s["Last Name"] || "",
        Email: s["Email"] || s.Email || "-",
        Phone: s["Phone"] || s.Phone || "-",
        Duration: s["Duration"] || s.Duration || "-",
        JoiningDate: toDateInputValue(s["Joining Date"] || s.JoiningDate || ""),
        CVLink: s["CV Link"] || s.CVLink || "",
        LetterLink: s["Letter Link"] || s.LetterLink || "",
        Status: s["Status"] || s.Status || "Pending",
        RemovalReason: s["Removal Reason"] || s.RemovalReason || "",
        RemovedAt: s["Removed At"] || s.RemovedAt || "",
        _raw: s
      }));

      const total = list.length;
      const pending = list.filter(s => s.Status === "Pending").length;
      const accepted = list.filter(s => s.Status === "Accepted").length;
      const removed = list.filter(s => s.Status === "Removed").length;
      const declined = list.filter(s => s.Status === "Declined").length;

      document.getElementById("tagTotal").innerText = `${total} Total`;
      document.getElementById("tagPending").innerText = `${pending} Pending`;
      document.getElementById("tagApproved").innerText = `${accepted + removed} Accepted`;
      document.getElementById("tagRejected").innerText = `${declined} Declined`;

      if (!tb) return;

      if (list.length === 0) {
        tb.innerHTML = `<tr><td colspan="7"><div class="emptyEnrolled"><span>📋</span>No joining form submissions yet</div></td></tr>`;
        return;
      }

      tb.innerHTML = list.map((s, idx) => {
        let statusCell = "";
        if (s.Status === "Removed") {
          statusCell = `
          <div style="display:inline-flex;flex-direction:column;gap:5px;">
            <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;
              font-size:11px;font-weight:800;letter-spacing:0.4px;text-transform:uppercase;
              background:rgba(255,60,60,0.14);border:1px solid rgba(255,60,60,0.40);color:#ff4444;">
              🗑️ Removed
            </span>
            <div style="background:rgba(255,60,60,0.08);border:1px solid rgba(255,60,60,0.22);
              border-radius:8px;padding:5px 9px;min-width:140px;">
              <div style="font-size:10px;font-weight:800;color:#ff6060;margin-bottom:2px;">Reason</div>
              <div style="font-size:11px;color:var(--muted);line-height:1.4;">${escapeHTML(s.RemovalReason || "-")}</div>
              ${s.RemovedAt ? `<div style="font-size:10px;color:var(--muted);opacity:0.6;margin-top:2px;">${escapeHTML(s.RemovedAt)}</div>` : ""}
            </div>
          </div>`;
        } else if (s.Status === "Accepted") {
          statusCell = `<span class="statusPill approved">✅ Accepted</span>`;
        } else if (s.Status === "Declined") {
          statusCell = `<span class="statusPill rejected">❌ Declined</span>`;
        } else {
          statusCell = `<span class="statusPill pending">⏳ Pending</span>`;
        }

        const cvBtn = s.CVLink ? `<a href="${escapeHTML(s.CVLink)}" target="_blank" class="btn" style="font-size:11px;padding:5px 10px;">📄 CV</a>` : "";
        const letterBtn = s.LetterLink ? `<a href="${escapeHTML(s.LetterLink)}" target="_blank" class="btn" style="font-size:11px;padding:5px 10px;">📝 Letter</a>` : "";

        const actionBtns = s.Status === "Pending" ? `
        <button class="btn primary" style="font-size:11px;padding:5px 10px;background:rgba(0,200,100,0.15);
          border-color:rgba(0,200,100,0.4);color:#00c864;"
          onclick='openEnrolledReview(${JSON.stringify(JSON.stringify(s._raw))}, "accept")'>
          ✅ Accept
        </button>
        <button class="btn danger" style="font-size:11px;padding:5px 10px;"
          onclick='openEnrolledReview(${JSON.stringify(JSON.stringify(s._raw))}, "reject")'>
          ❌ Reject
        </button>` : `<span style="font-size:11px;color:var(--muted);font-style:italic;">—</span>`;

        return `
        <tr>
          <td style="color:var(--muted);font-size:12px;">${idx + 1}</td>
          <td>
            <div style="font-weight:800;font-size:13px;">${escapeHTML(s.FullName)}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">${escapeHTML(s.Duration)}</div>
          </td>
          <td style="font-size:12px;">${escapeHTML(s.Email)}</td>
          <td style="font-size:12px;">${escapeHTML(s.Phone)}</td>
          <td style="font-size:12px;">${formatDate(s.JoiningDate)}</td>
          <td>${statusCell}</td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
              ${cvBtn}${letterBtn}${actionBtns}
            </div>
          </td>
        </tr>`;
      }).join("");
    }
  );
}

// ================================================================
// Cache invalidation on status change — joining cache bhi reset karo
// ================================================================
const _origReviewStatus = typeof submitReviewStatus === "function" ? submitReviewStatus : null;
if (_origReviewStatus) {
  submitReviewStatus = async function (decision) {
    await _origReviewStatus(decision);
    // Reset joining caches after status change
    _joiningDataCache = null;
    _joiningDataTs = 0;
    cacheInvalidate("joiningInterns_all");
  };
}