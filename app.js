// ✅ YOUR WEB APP URL (must end with /exec)
const API_URL =
  "https://script.google.com/macros/s/AKfycbxlJPuo-vIKTG6yrBLkry_t59pV9pfv9bFrppPKZWBTSiBZvhhpIuG6_YSmbH1nQaTX/exec";

// ===============================
// ⚡ CACHE LAYER
// Stale-while-revalidate:
//   pehle cache se instant dikhao,
//   background mein fresh fetch karo
// ===============================
const _cache = {};
const CACHE_TTL = 30 * 1000; // 30 seconds

function cacheSet(key, data) {
  _cache[key] = { data, ts: Date.now() };
}

function cacheGet(key) {
  const entry = _cache[key];
  return entry ? entry.data : null;
}

function cacheIsFresh(key) {
  const entry = _cache[key];
  if (!entry) return false;
  return (Date.now() - entry.ts) < CACHE_TTL;
}

function cacheInvalidate(key) {
  delete _cache[key];
}

// cachedGET — pehle cache se render, fir background refresh
// onData(data, fromCache) do baar call ho sakta hai
async function cachedGET(params, cacheKey, onData) {
  const cached = cacheGet(cacheKey);

  if (cached) {
    // Instant render from cache (no loader)
    onData(cached, true);

    // Fresh hai toh network skip
    if (cacheIsFresh(cacheKey)) return;

    // Background silent refresh
    apiGET(params, true).then(fresh => {
      if (fresh && fresh.success) {
        cacheSet(cacheKey, fresh);
        onData(fresh, false);
      }
    });
  } else {
    // Pehli baar — loader ke saath fetch
    const data = await apiGET(params, false);
    if (data && data.success) {
      cacheSet(cacheKey, data);
    }
    onData(data, false);
  }
}

// ===============================
// Loader — Counter Based (no flicker)
// ===============================
let _loaderCount = 0;
let _loaderTimer = null;

function showLoader(show = true, text = "Loading...", silent = false) {
  if (silent) return;

  const overlay = document.getElementById("loaderOverlay");
  const loaderText = document.getElementById("loaderText");
  if (!overlay) return;

  if (show) {
    _loaderCount++;
    if (_loaderCount === 1) {
      if (_loaderTimer) { clearTimeout(_loaderTimer); _loaderTimer = null; }
      if (loaderText) loaderText.innerText = text || "Loading...";
      overlay.style.display = "flex";
    }
  } else {
    _loaderCount = Math.max(0, _loaderCount - 1);
    if (_loaderCount === 0) {
      _loaderTimer = setTimeout(() => {
        if (_loaderCount === 0) overlay.style.display = "none";
        _loaderTimer = null;
      }, 80);
    }
  }
}

function hideLoaderForce() {
  _loaderCount = 0;
  if (_loaderTimer) { clearTimeout(_loaderTimer); _loaderTimer = null; }
  const overlay = document.getElementById("loaderOverlay");
  if (overlay) overlay.style.display = "none";
}

// ===============================
// Toast
// ===============================
let _toastTimer = null;

function toast(msg, type = "success") {
  const el = document.getElementById("toast");
  if (!el) return;
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  el.className = `toast ${type} show`;
  el.innerText = msg;
  _toastTimer = setTimeout(() => {
    el.classList.remove("show");
    _toastTimer = null;
  }, 2500);
}

// ===============================
// Session
// ===============================
function saveSession(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSession(key) {
  const v = localStorage.getItem(key);
  return v ? JSON.parse(v) : null;
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

// ===============================
// Request Queue — simultaneous requests throttle karo
// GAS 302 redirect issue fix: ek saath max 3 requests
// ===============================
const _requestQueue = [];
let _activeRequests = 0;
const MAX_CONCURRENT = 3;

function _processQueue() {
  if (_activeRequests >= MAX_CONCURRENT || _requestQueue.length === 0) return;
  const { params, silent, resolve } = _requestQueue.shift();
  _activeRequests++;
  _jsonpGET(params, silent).then(data => {
    _activeRequests--;
    resolve(data);
    _processQueue();
  });
}

// ===============================
// JSONP Helper — CORS bypass for GET
// Google Apps Script ContentService CORS
// headers support nahi karta, isliye JSONP
// use karte hain GET requests ke liye.
// onerror pe fetch fallback — GAS redirect handle karta hai
// ===============================
function _jsonpGET(params, silent = false) {
  return new Promise((resolve) => {
    const cbName = "_jcb_" + Date.now() + "_" + Math.floor(Math.random() * 9999);
    const script = document.createElement("script");

    // Timeout — 20 seconds
    const timer = setTimeout(() => {
      cleanup();
      console.warn("JSONP timeout for action:", params.action);
      resolve({ success: false, message: "Request timeout ❌" });
    }, 20000);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
      if (!silent) showLoader(false);
    }

    window[cbName] = function (data) {
      cleanup();
      resolve(data);
    };

    // JSONP fail hone par fetch fallback try karo
    // GAS kabhi kabhi JSONP requests ko redirect karta hai
    // fetch redirect follow kar sakta hai, script tag nahi
    script.onerror = async function () {
      cleanup();
      try {
        const urlParams = new URLSearchParams(Object.assign({}, params));
        const res = await fetch(API_URL + "?" + urlParams.toString(), {
          redirect: "follow",
          mode: "cors"
        });
        const text = await res.text();
        // GAS response JSONP wrapper ke saath ya bina bhi aa sakta hai
        // dono cases handle karo
        const clean = text.replace(/^[^\(]*\(/, "").replace(/\);?\s*$/, "").trim();
        try {
          resolve(JSON.parse(clean));
        } catch {
          try {
            resolve(JSON.parse(text));
          } catch {
            console.error("JSONP + Fetch parse failed for action:", params.action);
            resolve({ success: false, message: "Parse error ❌" });
          }
        }
      } catch (fetchErr) {
        console.error("JSONP + Fetch both failed for action:", params.action, fetchErr.message);
        resolve({ success: false, message: "Server connection failed ❌" });
      }
    };

    const urlParams = Object.assign({}, params, { callback: cbName });
    script.src = API_URL + "?" + new URLSearchParams(urlParams).toString();

    if (!silent) showLoader(true, "Loading...");
    document.head.appendChild(script);
  });
}

// ===============================
// API Calls
// ===============================

// POST — CORS se exempt hai jab Content-Type: text/plain ho
async function apiPOST(payload, silent = false) {
  try {
    showLoader(true, "Loading...", silent);
    const res = await fetch(API_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    return JSON.parse(text);
  } catch (err) {
    console.error("POST Error:", err);
    return { success: false, message: "Server connection failed ❌" };
  } finally {
    showLoader(false, "", silent);
  }
}

// GET — Queue ke through JSONP use karta hai
// Max 3 concurrent requests — GAS redirect errors fix
async function apiGET(params = {}, silent = false) {
  return new Promise((resolve) => {
    _requestQueue.push({ params, silent, resolve });
    _processQueue();
  });
}

// ===============================
// Debounce utility
// ===============================
function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ===============================
// Photo Upload
// ===============================
function triggerPhotoUpload() {
  document.getElementById("photoUpload").click();
}

async function uploadPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function () {
    const base64 = reader.result.split(",")[1];

    const data = await apiPOST({
      action: "uploadInternPhoto",
      internId: intern.InternID,
      base64: base64,
      mimeType: file.type,
      fileName: intern.InternID + "_photo",
    });

    if (data.success) {
      intern.Photo = data.photoUrl;
      saveSession("intern", intern);

      const img = document.getElementById("profileAvatarImg");
      const fallback = document.getElementById("avatarFallback");
      if (img) { img.src = data.photoUrl + "&t=" + Date.now(); img.style.display = "block"; }
      if (fallback) fallback.style.display = "none";

      toast("Photo Updated ✅", "success");
      loadProfile();
    } else {
      toast(data.message || "Upload failed ❌", "error");
    }
  };
  reader.readAsDataURL(file);
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("photoUpload");
  if (input) input.addEventListener("change", uploadPhoto);
});