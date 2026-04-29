let schedule = { morning: [], afternoon: [], afternoonFriday: [] };
let currentPeriod = null;
let nextTimeout = null;
let sinaisTocadosHoje = new Set();
let audioContext = null;
let currentSource = null;
let countdownInterval = null;
let dashboardSignalAudioEnabled = true;

const API_BASE = "/api";
const AUTH_TOKEN_STORAGE_KEY = "authToken";
const AUTH_USER_STORAGE_KEY = "authUser";
const CURRENT_SCHOOL_STORAGE_KEY = "currentSchoolId";
const PERIODS = ["morning", "afternoon", "afternoonFriday"];
const ROLE_SOMENTE_LEITURA = "somente_leitura";

function getAuthToken() {
  if (typeof window.getAuthToken === "function") {
    return window.getAuthToken() || "";
  }
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

async function apiFetchWithAuth(url, options = {}) {
  if (typeof window.apiFetch === "function") {
    return window.apiFetch(url, options);
  }

  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token && !options.noAuth) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

function getCurrentSchoolId() {
  if (typeof window.getCurrentSchoolId === "function") {
    return window.getCurrentSchoolId() || "";
  }
  return localStorage.getItem(CURRENT_SCHOOL_STORAGE_KEY) || "";
}

function getAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_err) {
    return null;
  }
}

function applyDashboardPermissions(user) {
  const hasDashboardFeature = (featureKey) => {
    if (!user) return false;
    const effective = user.effectivePermissions;
    if (!effective || typeof effective !== "object") return false;
    if (!effective?.menus?.dashboard) return false;
    return Boolean(effective?.features?.[featureKey]);
  };

  const canSeeManualSection = hasDashboardFeature("dashboard_manual_section");
  const canUseSignalAudio = hasDashboardFeature("dashboard_signal_audio");
  dashboardSignalAudioEnabled = canUseSignalAudio;
  const canPlayManual =
    canSeeManualSection && canUseSignalAudio && hasDashboardFeature("dashboard_manual_play");
  const canSeeLastSignal = hasDashboardFeature("dashboard_last_signal");
  const canSeeNextSignal = hasDashboardFeature("dashboard_next_signal");
  const canSeeScheduleInterface = hasDashboardFeature("dashboard_schedule_interface");

  const toggleSection = (elementId, shouldShow) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.toggle("hidden", !shouldShow);
  };

  toggleSection("dashboardManualCard", canSeeManualSection);
  toggleSection("dashboardLastSignalCard", canSeeLastSignal);
  toggleSection("dashboardNextSignalCard", canSeeNextSignal);
  toggleSection("dashboardScheduleSectionCard", canSeeScheduleInterface);

  const manualBtn = document.getElementById("btnManualPlay");
  if (!manualBtn) return;

  manualBtn.disabled = !canPlayManual;
  manualBtn.classList.toggle("opacity-50", !canPlayManual);
  manualBtn.classList.toggle("cursor-not-allowed", !canPlayManual);
}

function clearTimers() {
  if (nextTimeout) {
    clearTimeout(nextTimeout);
    nextTimeout = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function resetDashboardState() {
  schedule = { morning: [], afternoon: [], afternoonFriday: [] };
  currentPeriod = PERIODS.includes(currentPeriod) ? currentPeriod : "morning";
  renderScheduleByPeriod(currentPeriod);
  updateSignalUI(null, null);
  const countdown = document.getElementById("countdown");
  if (countdown) countdown.textContent = "--:--";
}

async function loadSchedule() {
  clearTimers();

  const schoolId = getCurrentSchoolId();
  const token = getAuthToken();
  const select = document.getElementById("periodFilter");

  if (!token || !schoolId) {
    resetDashboardState();
    if (select) select.value = currentPeriod || "morning";
    return;
  }

  try {
    const response = await apiFetchWithAuth(`${API_BASE}/schools/${schoolId}/schedule`);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        resetDashboardState();
        return;
      }
      throw new Error("schedule-fetch-error");
    }

    const payload = await response.json();
    schedule =
      payload && typeof payload === "object"
        ? payload
        : { morning: [], afternoon: [], afternoonFriday: [] };

    if (!PERIODS.includes(currentPeriod)) {
      const detected = detectCurrentPeriod();
      currentPeriod = PERIODS.includes(detected) ? detected : "morning";
    }

    renderScheduleByPeriod(currentPeriod);
    startScheduler();
  } catch (err) {
    console.error("Erro ao carregar horarios:", err);
    resetDashboardState();
  }

  if (select && PERIODS.includes(currentPeriod)) {
    select.value = currentPeriod;
  }
}

function detectCurrentPeriod() {
  const now = new Date();
  const day = now.getDay();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();

  if (totalMinutes >= 360 && totalMinutes < 775) return "morning";
  if (totalMinutes >= 775 && totalMinutes < 1140) {
    return day === 5 ? "afternoonFriday" : "afternoon";
  }
  return "night";
}

function startRealCountdown(targetDate) {
  if (countdownInterval) clearInterval(countdownInterval);

  const el = document.getElementById("countdown");
  if (!el || !targetDate) return;

  countdownInterval = setInterval(() => {
    const diff = targetDate - new Date();

    if (diff <= 0) {
      el.textContent = "00:00";
      clearInterval(countdownInterval);
      countdownInterval = null;
      return;
    }

    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, 1000);
}

async function reportPlaybackError(error, music, duration) {
  try {
    const schoolId = Number.parseInt(getCurrentSchoolId(), 10);
    if (!schoolId) return;

    await apiFetchWithAuth(`${API_BASE}/monitor/playback-error`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId,
        message: "Erro ao tocar audio do sinal",
        context: {
          detail: error?.message || String(error),
          music,
          duration,
          browserTime: new Date().toISOString(),
        },
      }),
    });
  } catch (_err) {
    // Do not block UI if monitor endpoint fails.
  }
}

async function initAudio(music = "sino.mp3", duration = 12, volume = 0.9) {
  if (!dashboardSignalAudioEnabled) return;

  try {
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    if (currentSource) {
      currentSource.audio.pause();
      currentSource.source.disconnect();
      currentSource.gain.disconnect();
      currentSource = null;
    }

    const audio = new Audio(`./assets/audio/${music}`);
    const source = audioContext.createMediaElementSource(audio);
    const gain = audioContext.createGain();

    source.connect(gain);
    gain.connect(audioContext.destination);

    const now = audioContext.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.setValueAtTime(volume, now + duration - 1);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    await audio.play();
    currentSource = { audio, source, gain };

    setTimeout(() => {
      audio.pause();
      source.disconnect();
      gain.disconnect();
      currentSource = null;
    }, duration * 1000);
  } catch (err) {
    console.error("Erro audio:", err);
    reportPlaybackError(err, music, duration);
  }
}

function renderScheduleByPeriod(period) {
  const tableIds = {
    morning: "scheduleTable-morning",
    afternoon: "scheduleTable-afternoon",
    afternoonFriday: "scheduleTable-afternoonFriday",
  };

  const musicLabels = {
    "musica1.mp3": "Tu Me Sondas",
    "musica2.mp3": "Eu Amo Minha Escola",
    "musica3.mp3": "My Lighthouse",
    "musica4.mp3": "Amor Teimoso",
    "musica5.mp3": "Minha vida e uma viagem",
    "musica6.mp3": "A Biblia",
  };

  Object.values(tableIds).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  const safePeriod = PERIODS.includes(period) ? period : "morning";
  const tableBody = document.getElementById(tableIds[safePeriod]);
  if (!tableBody) return;

  tableBody.classList.remove("hidden");
  tableBody.innerHTML = "";

  const signals = Array.isArray(schedule[safePeriod]) ? schedule[safePeriod] : [];
  const title = document.getElementById("currentPeriodName");
  if (title) title.textContent = getPeriodLabel(safePeriod);

  signals.forEach((signal, index) => {
    const row = document.createElement("tr");
    const rowId = `row-${String(signal.time || "").replace(":", "-")}`;
    row.id = rowId;

    row.className =
      index % 2 === 0
        ? "bg-slate-50 dark:bg-slate-800 transition-colors"
        : "bg-white dark:bg-slate-900 transition-colors";

    const friendlyMusic = musicLabels[signal.music] || signal.music || "Sino Padrao";

    row.innerHTML = `
      <td class="py-3 px-4 w-10 text-center">
        <i class="fas fa-volume-up playing-icon"></i>
      </td>
      <td class="py-3 px-4 font-bold">${signal.time || "--:--"}</td>
      <td class="py-3 px-4 font-medium">${signal.name || "-"}</td>
      <td class="py-3 px-4 text-slate-500">${friendlyMusic}</td>
      <td class="py-3 px-4">${signal.duration ? `${signal.duration}s` : ""}</td>
    `;
    tableBody.appendChild(row);
  });
}

function getPeriodLabel(period) {
  const labels = {
    morning: "Periodo da Manha",
    afternoon: "Periodo da Tarde",
    afternoonFriday: "Sexta Especial",
  };
  return labels[period] || "Periodo";
}

function startScheduler() {
  if (nextTimeout) clearTimeout(nextTimeout);

  const now = new Date();
  const todayKey = now.toDateString();

  if (startScheduler.lastDay !== todayKey) {
    sinaisTocadosHoje.clear();
    startScheduler.lastDay = todayKey;
  }

  const signals = getAllSignalsForToday().sort((a, b) => a.date - b.date);
  const next = signals.find((signal) => signal.date > now) || null;
  const last = getLastSignalToday();

  updateSignalUI(last, next);

  if (!next) {
    const countdown = document.getElementById("countdown");
    if (countdown) countdown.textContent = "00:00";
    return;
  }

  startRealCountdown(next.date);
  nextTimeout = setTimeout(() => {
    tocarSinal(next.original);
  }, next.date - now);
}

function getAllSignalsForToday() {
  const day = new Date().getDay();
  const isFriday = day === 5;
  const periods = ["morning", isFriday ? "afternoonFriday" : "afternoon"];

  const result = [];
  periods.forEach((period) => {
    (schedule[period] || []).forEach((signal) => {
      const [h, m] = String(signal.time || "00:00").split(":").map(Number);
      const date = new Date();
      date.setHours(h || 0, m || 0, 0, 0);
      result.push({ ...signal, period, date, original: signal });
    });
  });

  return result;
}

function tocarSinal(signal) {
  if (!signal) return;

  const id = `${signal.time}-${signal.name}-${new Date().toDateString()}`;
  if (sinaisTocadosHoje.has(id)) return;
  sinaisTocadosHoje.add(id);

  const rowId = `row-${String(signal.time || "").replace(":", "-")}`;
  const rowElement = document.getElementById(rowId);
  if (rowElement && dashboardSignalAudioEnabled) {
    rowElement.classList.add("row-playing");
    const duration = (signal.duration || 15) * 1000;
    setTimeout(() => {
      rowElement.classList.remove("row-playing");
    }, duration);
  }

  if (dashboardSignalAudioEnabled) {
    initAudio(signal.music, signal.duration);
  }
  setTimeout(startScheduler, 500);
}

function updateSignalUI(current, next) {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText("currentSignalTime", current?.time || "--:--");
  setText("currentSignalName", current?.name || "Aguardando...");
  setText("nextSignalTime", next?.time || "--:--");
  setText("nextSignalName", next?.name || "Fim do periodo");
}

function getLastSignalToday() {
  const now = new Date();
  return (
    getAllSignalsForToday()
      .filter((signal) => signal.date <= now)
      .sort((a, b) => b.date - a.date)[0] || null
  );
}

function initDarkMode() {
  const toggle = document.getElementById("darkToggle");
  if (!toggle) return;
  const moonIcon = toggle.querySelector('[data-theme-icon="moon"]');
  const sunIcon = toggle.querySelector('[data-theme-icon="sun"]');

  function updateThemeButton() {
    const isDark = document.documentElement.classList.contains("dark");
    moonIcon?.classList.toggle("hidden", isDark);
    sunIcon?.classList.toggle("hidden", !isDark);

    const label = isDark ? "Ativar tema claro" : "Ativar tema escuro";
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
  }

  if (localStorage.getItem("darkMode") === "true") {
    document.documentElement.classList.add("dark");
  }

  updateThemeButton();

  toggle.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    const isDark = document.documentElement.classList.contains("dark");
    localStorage.setItem("darkMode", String(isDark));
    updateThemeButton();
  });
}

function initClock() {
  const el = document.getElementById("currentTime");
  if (!el) return;

  setInterval(() => {
    el.textContent = new Date().toLocaleTimeString("pt-BR");
  }, 1000);
}

async function wakeUpAPI() {
  const overlay = document.getElementById("overlayWakeup");
  const status = document.getElementById("statusWake");
  const button = document.getElementById("btnWakeOk");
  const icon = document.getElementById("wakeIcon");

  if (!overlay || !status || !button || !icon) return;

  try {
    status.textContent = "Iniciando servidor...";
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) throw new Error("health-error");

    status.textContent = "Sistema online";
    icon.classList.remove(
      "animate-spin",
      "border-4",
      "border-blue-500",
      "border-t-transparent",
      "rounded-full"
    );

    icon.innerHTML = '<i class="fas fa-check text-white text-xl"></i>';
    icon.classList.add(
      "bg-green-500",
      "flex",
      "items-center",
      "justify-center",
      "rounded-full",
      "scale-0"
    );

    setTimeout(() => {
      icon.classList.add("transition", "duration-300", "scale-100");
    }, 50);

    button.disabled = false;
    button.classList.remove("opacity-50", "cursor-not-allowed");
    button.classList.add("bg-green-600", "hover:bg-green-700");

    button.addEventListener("click", () => {
      overlay.classList.add("opacity-0");
      setTimeout(() => {
        overlay.style.display = "none";
      }, 300);
    });
  } catch (err) {
    status.textContent = "Erro ao conectar";
    icon.classList.remove("animate-spin");
    icon.innerHTML = '<i class="fas fa-times text-white text-xl"></i>';
    icon.classList.add(
      "bg-red-500",
      "flex",
      "items-center",
      "justify-center",
      "rounded-full"
    );

    console.error("Wake error:", err);
  }
}

document
  .getElementById("btnManualPlay")
  ?.addEventListener("click", function manualPlayHandler() {
    if (this.disabled) return;
    const music = document.getElementById("manualMusic")?.value || "musica1.mp3";
    const duration = parseInt(document.getElementById("manualDuration")?.value, 10) || 12;
    const btn = this;

    btn.disabled = true;
    btn.classList.replace("bg-blue-600", "bg-slate-500");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> TOCANDO...';

    const now = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText("currentSignalTime", now);
    setText("currentSignalName", "Acionamento Manual");
    initAudio(music, duration);

    const bell = document.getElementById("bellIcon");
    bell?.classList.add("animate-bounce");

    setTimeout(() => {
      btn.disabled = false;
      btn.classList.replace("bg-slate-500", "bg-blue-600");
      btn.innerHTML = originalText;
      bell?.classList.remove("animate-bounce");
    }, duration * 1000);
  });

document.addEventListener("DOMContentLoaded", async () => {
  await wakeUpAPI();
  currentPeriod = PERIODS.includes(detectCurrentPeriod()) ? detectCurrentPeriod() : "morning";
  applyDashboardPermissions(getAuthUser());
  if (getAuthToken()) {
    await loadSchedule();
  } else {
    resetDashboardState();
  }

  initDarkMode();
  initClock();

  document.getElementById("menuBtn")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.remove("-translate-x-full");
  });

  document.getElementById("closeSidebar")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.add("-translate-x-full");
  });

  document.getElementById("periodFilter")?.addEventListener("change", (event) => {
    const selected = event.target.value;
    if (!PERIODS.includes(selected)) return;
    currentPeriod = selected;
    renderScheduleByPeriod(currentPeriod);
  });

  window.addEventListener("school:changed", () => {
    loadSchedule();
  });

  window.addEventListener("auth:changed", (event) => {
    if (event?.detail?.authenticated) {
      applyDashboardPermissions(event?.detail?.user || getAuthUser());
      loadSchedule();
    } else {
      applyDashboardPermissions(null);
      resetDashboardState();
    }
  });
});
