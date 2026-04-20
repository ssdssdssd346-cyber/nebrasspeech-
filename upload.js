(() => {
  "use strict";

  const audioInput = document.getElementById("audioFileInput");
  const clearAudioBtn = document.getElementById("clearAudioBtn");
  const audioInfo = document.getElementById("audioInfo");
  const audioPlayer = document.getElementById("audioPlayer");
  const sessionTitleInput = document.getElementById("sessionTitle");

  const statusPill = document.getElementById("statusPill");
  const msg = document.getElementById("messageBox");
  const editor = document.getElementById("editor");
  const wordCount = document.getElementById("wordCount");
  const charCount = document.getElementById("charCount");

  const fontMinusBtn = document.getElementById("fontMinusBtn");
  const fontPlusBtn = document.getElementById("fontPlusBtn");
  const fontFamilySelect = document.getElementById("fontFamilySelect");
  const alignLeftBtn = document.getElementById("alignLeftBtn");
  const alignCenterBtn = document.getElementById("alignCenterBtn");
  const alignRightBtn = document.getElementById("alignRightBtn");
  const readingModeBtn = document.getElementById("readingModeBtn");

  const highlightSelect = document.getElementById("highlightSelect");
  const applyHighlightBtn = document.getElementById("applyHighlightBtn");

  const cleanBtn = document.getElementById("cleanBtn");
  const copyBtn = document.getElementById("copyBtn");
  const saveDraftBtn = document.getElementById("saveDraftBtn");
  const clearTextBtn = document.getElementById("clearTextBtn");

  const findInput = document.getElementById("findInput");
  const replaceInput = document.getElementById("replaceInput");
  const findBtn = document.getElementById("findBtn");
  const findNextBtn = document.getElementById("findNextBtn");
  const clearFindBtn = document.getElementById("clearFindBtn");
  const replaceOneBtn = document.getElementById("replaceOneBtn");
  const replaceAllBtn = document.getElementById("replaceAllBtn");

  function show(text, type = "") {
    if (!msg) return;
    msg.textContent = text || "";
    msg.className = "message-box";
    if (type) msg.classList.add(type);
  }

  function setStatus(text) {
    if (statusPill) statusPill.textContent = text;
  }

  function redirectToLogin() { location.href = "/login"; }

  function getToken() {
    try {
      const raw = localStorage.getItem("nebras_auth");
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.access_token) return parsed.access_token;
    } catch {}
    return (
      localStorage.getItem("access_token") ||
      localStorage.getItem("nebras_token") ||
      null
    );
  }

  async function apiFetch(url, options = {}) {
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    const isForm = options.body instanceof FormData;
    if (!isForm && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (!headers.has("Accept")) headers.set("Accept", "application/json");

    const res = await fetch(url, { ...options, headers });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error((data && data.error) ? data.error : `Request failed (${res.status})`);
    }
    return data;
  }

  function updateCounts() {
    if (!editor) return;
    const text = (editor.innerText || "").trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    if (wordCount) wordCount.textContent = `Words: ${words}`;
    if (charCount) charCount.textContent = `Chars: ${text.length}`;
  }

  let reading = false;
  let lastFind = -1;

  async function transcribeFile(file) {
    try {
      setStatus("Uploading…");
      show("Uploading and transcribing, please wait…");

      const fd = new FormData();
      fd.append("audio", file);
      if (sessionTitleInput) fd.append("title", sessionTitleInput.value.trim());

      // الـ endpoint الصحيح
      const data = await apiFetch("/upload-transcribe-save", { method: "POST", body: fd });
      const text = data && data.transcription ? String(data.transcription) : "";

      if (editor) editor.textContent = text;
      updateCounts();

      setStatus("Ready");
      show("Transcription completed and session saved!", "success");
    } catch (err) {
      setStatus("Error");
      show(err.message || "Transcription failed.", "error");
    }
  }

  function clearAudio() {
    if (audioInput) audioInput.value = "";
    if (audioPlayer) { audioPlayer.removeAttribute("src"); audioPlayer.load(); }
    if (audioInfo) audioInfo.textContent = "";
    setStatus("Ready");
    show("");
  }

  function setFontSize(delta) {
    if (!editor) return;
    const cur = parseFloat(getComputedStyle(editor).fontSize) || 16;
    editor.style.fontSize = `${Math.min(28, Math.max(12, cur + delta))}px`;
  }

  function setFontFamily(v) {
    if (!editor) return;
    if (v === "serif") editor.style.fontFamily = "Georgia, serif";
    else if (v === "mono") editor.style.fontFamily = "monospace";
    else editor.style.fontFamily = "system-ui, sans-serif";
  }

  function setAlign(a) { if (editor) editor.style.textAlign = a; }

  function cleanText() {
    if (!editor) return;
    let t = editor.innerText || "";
    t = t.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    editor.textContent = t;
    updateCounts();
    show("Cleaned.", "success");
  }

  async function copyAll() {
    await navigator.clipboard.writeText(editor?.innerText || "");
    show("Copied.", "success");
  }

  function saveDraft() {
    localStorage.setItem("nebras_upload_draft", editor?.innerHTML || "");
    show("Draft saved.", "success");
  }

  function loadDraft() {
    const raw = localStorage.getItem("nebras_upload_draft");
    if (raw && editor) editor.innerHTML = raw;
    updateCounts();
  }

  function clearText() {
    if (editor) editor.innerHTML = "";
    updateCounts();
  }

  function findText(next = false) {
    if (!editor) return;
    const q = String(findInput?.value || "").trim();
    if (!q) return;
    const text = editor.innerText || "";
    const idx = text.toLowerCase().indexOf(q.toLowerCase(), next ? lastFind + 1 : 0);
    if (idx === -1) { show("No match.", "error"); lastFind = -1; return; }
    lastFind = idx;
    show(`Found at position ${idx + 1}.`, "success");
  }

  function replaceOne() {
    const q = String(findInput?.value || "").trim();
    const r = String(replaceInput?.value || "");
    if (!q || !editor) return;
    const text = editor.innerText || "";
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return show("No match.", "error");
    editor.textContent = text.slice(0, idx) + r + text.slice(idx + q.length);
    updateCounts();
    show("Replaced one.", "success");
  }

  function replaceAll() {
    const q = String(findInput?.value || "").trim();
    const r = String(replaceInput?.value || "");
    if (!q || !editor) return;
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    editor.textContent = (editor.innerText || "").replace(re, r);
    updateCounts();
    show("Replaced all.", "success");
  }

  function clearFind() {
    if (findInput) findInput.value = "";
    if (replaceInput) replaceInput.value = "";
    lastFind = -1;
    show("");
  }

  function toggleReading() {
    reading = !reading;
    document.body.classList.toggle("reading-mode", reading);
  }

  // ===== Init =====
  if (!getToken()) redirectToLogin();

  if (editor) editor.addEventListener("input", updateCounts);

  if (audioInput) {
    audioInput.addEventListener("change", () => {
      const file = audioInput.files && audioInput.files[0];
      if (!file) return;
      if (audioInfo) audioInfo.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      if (audioPlayer) audioPlayer.src = URL.createObjectURL(file);
      transcribeFile(file);
    });
  }

  if (clearAudioBtn) clearAudioBtn.addEventListener("click", clearAudio);
  if (fontMinusBtn) fontMinusBtn.addEventListener("click", () => setFontSize(-1));
  if (fontPlusBtn) fontPlusBtn.addEventListener("click", () => setFontSize(1));
  if (fontFamilySelect) fontFamilySelect.addEventListener("change", () => setFontFamily(fontFamilySelect.value));
  if (alignLeftBtn) alignLeftBtn.addEventListener("click", () => setAlign("left"));
  if (alignCenterBtn) alignCenterBtn.addEventListener("click", () => setAlign("center"));
  if (alignRightBtn) alignRightBtn.addEventListener("click", () => setAlign("right"));
  if (readingModeBtn) readingModeBtn.addEventListener("click", toggleReading);
  if (cleanBtn) cleanBtn.addEventListener("click", cleanText);
  if (copyBtn) copyBtn.addEventListener("click", () => copyAll().catch(() => show("Copy failed.", "error")));
  if (saveDraftBtn) saveDraftBtn.addEventListener("click", saveDraft);
  if (clearTextBtn) clearTextBtn.addEventListener("click", clearText);
  if (findBtn) findBtn.addEventListener("click", () => findText(false));
  if (findNextBtn) findNextBtn.addEventListener("click", () => findText(true));
  if (clearFindBtn) clearFindBtn.addEventListener("click", clearFind);
  if (replaceOneBtn) replaceOneBtn.addEventListener("click", replaceOne);
  if (replaceAllBtn) replaceAllBtn.addEventListener("click", replaceAll);

  if (applyHighlightBtn && highlightSelect) {
    applyHighlightBtn.addEventListener("click", () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (range.collapsed) return;
      const span = document.createElement("span");
      span.className = `highlight ${highlightSelect.value}`;
      range.surroundContents(span);
      sel.removeAllRanges();
      updateCounts();
    });
  }

  const translateBtn = document.getElementById("translateBtn");
  const translateLang = document.getElementById("translateLang");
  const clearTranslateBtn = document.getElementById("clearTranslateBtn");
  const translateBox = document.getElementById("translateBox");
  const translatedEditor = document.getElementById("translatedEditor");

  async function translateText() {
    if (!editor) return;
    const text = (editor.innerText || "").trim();
    if (!text) { show("لا يوجد نص للترجمة.", "error"); return; }

    const targetLang = translateLang ? translateLang.value : "en";

    try {
      setStatus("Translating…");
      show("جاري الترجمة…");

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();

      const translated = data?.[0]?.map(s => s?.[0]).filter(Boolean).join("") || "";
      if (translated) {
        if (translatedEditor) translatedEditor.textContent = translated;
        if (translateBox) translateBox.style.display = "";
        if (clearTranslateBtn) clearTranslateBtn.style.display = "";
        setStatus("Ready");
        show("تمت الترجمة بنجاح ✅", "success");
      } else {
        throw new Error("فشلت الترجمة، تأكدي من الاتصال بالإنترنت.");
      }
    } catch (err) {
      setStatus("Error");
      show(err.message || "خطأ في الترجمة.", "error");
    }
  }

  function clearTranslation() {
    if (translatedEditor) translatedEditor.textContent = "";
    if (translateBox) translateBox.style.display = "none";
    if (clearTranslateBtn) clearTranslateBtn.style.display = "none";
    show("");
  }

  if (translateBtn) translateBtn.addEventListener("click", translateText);
  if (clearTranslateBtn) clearTranslateBtn.addEventListener("click", clearTranslation);

  setStatus("Ready");
  loadDraft();
})();