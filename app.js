// ✅ YOUR WEB APP URL (must end with /exec)
const API_URL =
  "https://script.google.com/macros/s/AKfycbyptMCQoSfECGTEijIib5MpC4ittQZBJDiVXMYsZxcs6qC4tfZ8rZwZsi9tvgaxaa4H/exec";
// ===============================
// Loader + Toast
// ===============================
let LOADER_LOCK = false;

function showLoader(show = true, text = "Loading...", silent = false) {
  if (silent) return; // 🔥 AUTO REFRESH FIX

  const overlay = document.getElementById("loaderOverlay");
  const loaderText = document.getElementById("loaderText");

  if (!overlay) return;

  if (show) {
    if (LOADER_LOCK) return;
    LOADER_LOCK = true;
    if (loaderText) loaderText.innerText = text;
    overlay.style.display = "flex";
  } else {
    LOADER_LOCK = false;
    overlay.style.display = "none";
  }
}

function toast(msg, type = "success") {
  const el = document.getElementById("toast");
  if (!el) return;

  el.className = `toast ${type} show`;
  el.innerText = msg;

  setTimeout(() => el.classList.remove("show"), 2500);
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
// 🔥 FIXED API CALL (NO CORS ERROR)
// ===============================
async function apiPOST(payload, silent = false) {
  try {
    showLoader(true, "Loading...", silent);

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
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

    const res = await fetch(url, {
      method: "GET",
    });

    const text = await res.text();

    return JSON.parse(text);
  } catch (err) {
    console.error("GET Error:", err);
    return { success: false, message: "Server connection failed ❌" };
  } finally {
    showLoader(false, "", silent);
  }
}

function triggerPhotoUpload() {
  document.getElementById("photoUpload").click();
}

async function uploadPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async function () {
    const base64 = reader.result.split(",")[1];

    showLoader(true, "Uploading Photo...");

    const data = await apiPOST({
      action: "uploadInternPhoto",
      internId: intern.InternID,
      base64: base64,
      mimeType: file.type,
      fileName: intern.InternID + "_photo",
    });

    showLoader(false);

    if (data.success) {
      // update session
      intern.Photo = data.photoUrl;
      saveSession("intern", intern);

      // update UI
      const img = document.getElementById("profileAvatarImg");
      const fallback = document.getElementById("avatarFallback");

      if (img) {
        img.src = data.photoUrl + "&t=" + Date.now();
        img.style.display = "block";
      }

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
  if (input) {
    input.addEventListener("change", uploadPhoto);
  }
});
