(() => {
  "use strict";

  const startBtn = document.getElementById("startRecBtn");
  const stopBtn = document.getElementById("stopRecBtn");
  const clearAudioBtn = document.getElementById("clearAudioBtn");
  const saveSessionBtn = document.getElementById("saveSessionBtn");
  const sessionTitle = document.getElementById("sessionTitle");

  const statusPill = document.getElementById("statusPill");
  const recTimer = document.getElementById("recTimer");
  const audioInfo = document.getElementById("audioInfo");
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

  const cleanBtn = document.getElementById("cleanBtn");
  const copyBtn = document.getElementById("copyBtn");
  const saveDraftBtn = document.getElementById("saveDraftBtn");
  const clearTextBtn = document.getElementById("clearTextBtn");

  const highlightSelect = document.getElementById("highlightSelect");
  const applyHighlightBtn = document.getElementById("applyHighlightBtn");

  const findInput = document.getElementById("findInput");
  const replaceInput = document.getElementById("replaceInput");
  const findBtn = document.getElementById("findBtn");
  const findNextBtn = document.getElementById("findNextBtn");
  const clearFindBtn = document.getElementById("clearFindBtn");
  const replaceOneBtn = document.getElementById("replaceOneBtn");
  const replaceAllBtn = document.getElementById("replaceAllBtn");

  let mediaRecorder = null;
  let streamRef = null;
  let finalChunks = [];
  let uploadQueue = Promise.resolve();
  let isRecording = false;
  let chunkCounter = 0;
  let timerId = null;
  let startedAt = 0;
  let reading = false;
  let lastFind = -1;

  function show(text, type = "") {
    if (!msg) return;
    msg.textContent = text || "";
    msg.className = "message-box";
    if (type) msg.classList.add(type);
  }

  function setStatus(text) {
    if (statusPill) statusPill.textContent = text;
  }

  function redirectToLogin() {
    location.href = "/login";
  }

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
    if (!token) {
      redirectToLogin();
      return;
    }

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);

    const isFormData = options.body instanceof FormData;
    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    const res = await fetch(url, { ...options, headers });

    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");

    if (!res.ok) {
      const errMsg = data?.error || `Request failed (${res.status})`;
      throw new Error(errMsg);
    }

    return data;
  }

  function updateCounts() {
    if (!editor) return;
    const text = (editor.innerText || "").trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;

    if (wordCount) wordCount.textContent = `Words: ${words}`;
    if (charCount) charCount.textContent = `Chars: ${chars}`;
  }

  function setFontSize(delta) {
    if (!editor) return;
    const cur = parseFloat(getComputedStyle(editor).fontSize) || 16;
    const next = Math.max(12, Math.min(28, cur + delta));
    editor.style.fontSize = `${next}px`;
  }

  function setFontFamily(value) {
    if (!editor) return;
    if (value === "serif") {
      editor.style.fontFamily = "Georgia, 'Times New Roman', serif";
    } else if (value === "mono") {
      editor.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    } else {
      editor.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    }
  }

  function setAlign(value) {
    if (!editor) return;
    editor.style.textAlign = value;
  }

  function cleanText() {
    if (!editor) return;
    let text = editor.innerText || "";
    text = text.replace(/[ \t]+/g, " ");
    text = text.replace(/\n{3,}/g, "\n\n");
    editor.textContent = text.trim();
    updateCounts();
    show("Cleaned.", "success");
  }

  async function copyAll() {
    if (!editor) return;
    await navigator.clipboard.writeText(editor.innerText || "");
    show("Copied.", "success");
  }

  function saveDraft() {
    if (!editor) return;
    localStorage.setItem("nebras_live_draft", editor.innerHTML || "");
    show("Draft saved.", "success");
  }

  function loadDraft() {
    const raw = localStorage.getItem("nebras_live_draft");
    if (raw && editor) editor.innerHTML = raw;
    updateCounts();
  }

  function applyHighlight() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      show("اختاري النص أولاً ثم اضغطي Apply Highlight.", "error");
      return;
    }

    const colorClass = highlightSelect ? highlightSelect.value : "hl-yellow";
    const range = selection.getRangeAt(0);

    // تأكد إن النص المحدد داخل الـ editor
    if (!editor.contains(range.commonAncestorContainer)) {
      show("اختاري النص داخل المحرر.", "error");
      return;
    }

    const span = document.createElement("span");
    span.className = `highlight ${colorClass}`;
    range.surroundContents(span);
    selection.removeAllRanges();
    updateCounts();
    show("تم تطبيق اللون.", "success");
  }

  function clearText() {
    if (!editor) return;
    editor.innerHTML = "";
    updateCounts();
  }

  function findText(next = false) {
    if (!editor) return;
    const q = String(findInput?.value || "").trim();
    if (!q) return;

    const text = editor.innerText || "";
    const start = next ? lastFind + 1 : 0;
    const idx = text.toLowerCase().indexOf(q.toLowerCase(), start);

    if (idx === -1) {
      lastFind = -1;
      show("No match.", "error");
      return;
    }

    lastFind = idx;
    show(`Found at position ${idx + 1}.`, "success");
  }

  function replaceOne() {
    if (!editor) return;
    const q = String(findInput?.value || "").trim();
    const r = String(replaceInput?.value || "");
    if (!q) return;

    const text = editor.innerText || "";
    const idx = text.toLowerCase().indexOf(q.toLowerCase());

    if (idx === -1) {
      show("No match to replace.", "error");
      return;
    }

    editor.textContent = text.slice(0, idx) + r + text.slice(idx + q.length);
    updateCounts();
    show("Replaced one.", "success");
  }

  function replaceAll() {
    if (!editor) return;
    const q = String(findInput?.value || "").trim();
    const r = String(replaceInput?.value || "");
    if (!q) return;

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

  function startTimer() {
    startedAt = Date.now();
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
      const ss = String(seconds % 60).padStart(2, "0");
      if (recTimer) recTimer.textContent = `${mm}:${ss}`;
    }, 250);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function pickMimeType() {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg"
    ];

    for (const mime of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return "";
  }

  function appendTranscript(text) {
    if (!editor || !text) return;

    const current = editor.innerText || "";
    const trimmed = String(text).trim();
    if (!trimmed) return;

    editor.textContent = current ? `${current} ${trimmed}` : trimmed;
    updateCounts();
  }

  async function sendChunk(blob) {
    if (!blob || blob.size === 0) return;

    const fd = new FormData();
    const file = new File([blob], `live_chunk_${chunkCounter}.webm`, {
      type: blob.type || "audio/webm"
    });

    fd.append("audio", file);

    const data = await apiFetch("/live-transcribe", {
      method: "POST",
      body: fd
    });

    if (data?.transcription) {
      appendTranscript(data.transcription);
    }
  }

  async function saveFinalSession() {
    try {
      const finalBlob = new Blob(finalChunks, { type: "audio/webm" });
      const finalFile = new File([finalBlob], "live_final.ogg", { type: "audio/ogg" });

      const fd = new FormData();
      fd.append("audio", finalFile);
      fd.append("title", (sessionTitle?.value || "").trim() || "Live Session");
      fd.append("transcript", editor ? (editor.innerText || "") : "");

      const data = await apiFetch("/live-final-save", {
        method: "POST",
        body: fd
      });

      if (audioInfo) {
        audioInfo.textContent = `Final recording saved (${(finalBlob.size / 1024).toFixed(1)} KB)`;
      }

      show(data?.message || "Live session saved successfully.", "success");
      setStatus("Saved");
    } catch (err) {
      console.error(err);
      setStatus("Error");
      show(err.message || "Saving live session failed.", "error");
    }
  }

  async function startRecording() {
    try {
      show("");
      setStatus("Recording...");

      streamRef = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = pickMimeType();
      mediaRecorder = mimeType
        ? new MediaRecorder(streamRef, { mimeType })
        : new MediaRecorder(streamRef);

      finalChunks = [];
      uploadQueue = Promise.resolve();
      isRecording = true;
      chunkCounter = 0;

      mediaRecorder.ondataavailable = (e) => {
        if (!e.data || e.data.size === 0) return;

        finalChunks.push(e.data);

        if (!isRecording) return;

        chunkCounter += 1;
        uploadQueue = uploadQueue
          .then(() => sendChunk(e.data))
          .catch((err) => {
            console.error(err);
            show(err.message || "Chunk upload failed.", "error");
          });
      };

      mediaRecorder.onstop = async () => {
        isRecording = false;
        stopTimer();

        if (streamRef) {
          streamRef.getTracks().forEach(track => track.stop());
          streamRef = null;
        }

        try {
          await uploadQueue;
          await saveFinalSession();
        } catch (err) {
          console.error(err);
          setStatus("Error");
        }
      };

      mediaRecorder.start(3000);

      if (audioInfo) audioInfo.textContent = "Streaming audio every 3 seconds...";
      if (startBtn) startBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = false;

      startTimer();
    } catch (err) {
      console.error(err);
      setStatus("Error");
      show(err.message || "Microphone access failed.", "error");
    }
  }

  function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;

    setStatus("Stopping...");
    isRecording = false;

    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;

    mediaRecorder.stop();
  }

  function clearAudio() {
    if (audioInfo) audioInfo.textContent = "";
    setStatus("Ready");
    show("");
  }

  const token = getToken();
  if (!token) redirectToLogin();

  if (editor) editor.addEventListener("input", updateCounts);

  if (startBtn) startBtn.addEventListener("click", startRecording);
  if (stopBtn) stopBtn.addEventListener("click", stopRecording);
  if (clearAudioBtn) clearAudioBtn.addEventListener("click", clearAudio);

  if (saveSessionBtn) {
    saveSessionBtn.addEventListener("click", () => {
      show("In live mode, saving is done automatically after pressing Stop Recording.", "success");
    });
  }

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
  if (applyHighlightBtn) applyHighlightBtn.addEventListener("click", applyHighlight);

  if (clearTextBtn) clearTextBtn.addEventListener("click", clearText);

  if (findBtn) findBtn.addEventListener("click", () => findText(false));
  if (findNextBtn) findNextBtn.addEventListener("click", () => findText(true));
  if (clearFindBtn) clearFindBtn.addEventListener("click", clearFind);
  if (replaceOneBtn) replaceOneBtn.addEventListener("click", replaceOne);
  if (replaceAllBtn) replaceAllBtn.addEventListener("click", replaceAll);

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

  if (recTimer) recTimer.textContent = "00:00";
  setStatus("Ready");
  loadDraft();
})();