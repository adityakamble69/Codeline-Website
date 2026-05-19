// ✅ YOUR WEB APP URL (must end with /exec)
const API_URL =
  "https://script.google.com/macros/s/AKfycbyre3WRylngGgsaSbyJbolJbb2902-J9BxBYdVnxkjJ-QPsEGAkyS4kHXOISZXkqRo/exec";

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
// API Calls
// ===============================
async function apiPOST(payload, silent = false) {
  try {
    showLoader(true, "Loading...", silent);
    const res = await fetch(API_URL, {
      method: "POST",
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

async function apiGET(params = {}, silent = false) {
  try {
    showLoader(true, "Loading...", silent);
    const url = API_URL + "?" + new URLSearchParams(params).toString();
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    return JSON.parse(text);
  } catch (err) {
    console.error("GET Error:", err);
    return { success: false, message: "Server connection failed ❌" };
  } finally {
    showLoader(false, "", silent);
  }
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