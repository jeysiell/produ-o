// ==============================
// 🔔 SISTEMA SINALTECH ENTERPRISE
// ==============================

let schedule = {};
let currentPeriod = null;
let nextTimeout = null;
let sinaisTocadosHoje = new Set();
let audioContext = null;
let currentSource = null;
let countdownInterval = null;

// ==============================
// 🔹 CARREGAR HORÁRIOS
// ==============================
async function loadSchedule() {
  try {
    const response = await fetch("https://sinal.onrender.com/api/schedule");
    if (!response.ok) throw new Error();

    schedule = await response.json();

    currentPeriod = detectCurrentPeriod();
    renderScheduleByPeriod(currentPeriod);
    startScheduler();
  } catch (err) {
    console.error("Erro ao carregar horários:", err);
    schedule = {};
  }
  const select = document.getElementById("periodFilter");
  if (select) select.value = currentPeriod;
}

// ==============================
// 🕒 DETECTAR PERÍODO
// ==============================
// ==============================
// 🕒 DETECTAR PERÍODO (Corrigido para Sexta)
// ==============================
function detectCurrentPeriod() {
  const now = new Date();
  const day = now.getDay();
  const total = now.getHours() * 60 + now.getMinutes();

  if (total >= 360 && total < 775) return "morning";
  if (total >= 775 && total < 1140) {
    // Se for sexta (5), retorna o período especial, senão o normal
    return day === 5 ? "afternoonFriday" : "afternoon";
  }
  return "night";
}

// ==============================
// ⏳ CONTADOR ÚNICO
// ==============================
function startRealCountdown(targetDate) {
  if (countdownInterval) clearInterval(countdownInterval);

  const el = document.getElementById("countdown");
  if (!el || !targetDate) return;

  countdownInterval = setInterval(() => {
    const diff = targetDate - new Date();

    if (diff <= 0) {
      el.textContent = "00:00";
      clearInterval(countdownInterval);
      return;
    }

    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    el.textContent =
      String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }, 1000);
}

// ==============================
// 🎶 ÁUDIO
// ==============================
async function initAudio(music = "sino.mp3", duration = 12, volume = 0.9) {
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
    console.error("Erro áudio:", err);
  }
}

function renderScheduleByPeriod(period) {
  const tableIds = {
    morning: "scheduleTable-morning",
    afternoon: "scheduleTable-afternoon",
    afternoonFriday: "scheduleTable-afternoonFriday",
  };

  const musicLabels = {
    "musica1.mp3": "🎵 Tu Me Sondas",
    "musica2.mp3": "🎵 Eu Amo Minha Escola",
    "musica3.mp3": "🎵 My Lighthouse",
    "musica4.mp3": "🎵 Amor Teimoso",
    "musica5.mp3": "🎵 Minha vida e uma viagem",
    "musica6.mp3": "🎵 A Biblia",
  };

  // 🔹 Esconde todas as tabelas
  Object.values(tableIds).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  const tableBody = document.getElementById(tableIds[period]);
  if (!tableBody) return;

  // Esconde as outras e limpa
  Object.values(tableIds).forEach((id) =>
    document.getElementById(id)?.classList.add("hidden")
  );
  tableBody.classList.remove("hidden");
  tableBody.innerHTML = "";

  const signals = schedule[period] || [];
  const title = document.getElementById("currentPeriodName");
  if (title) title.textContent = getPeriodLabel(period);

  signals.forEach((signal, index) => {
    const row = document.createElement("tr");

    // ID ÚNICO para podermos achar a linha quando o sinal tocar
    const rowId = `row-${signal.time.replace(":", "-")}`;
    row.id = rowId;

    row.className =
      index % 2 === 0
        ? "bg-slate-50 dark:bg-slate-800 transition-colors"
        : "bg-white dark:bg-slate-900 transition-colors";

    const friendlyMusic =
      musicLabels[signal.music] || signal.music || "🔔 Sino Padrão";

    row.innerHTML = `
      <td class="py-3 px-4 w-10 text-center">
        <i class="fas fa-volume-up playing-icon"></i>
      </td>
      <td class="py-3 px-4 font-bold">${signal.time}</td>
      <td class="py-3 px-4 font-medium">${signal.name}</td>
      <td class="py-3 px-4 text-slate-500">${friendlyMusic}</td>
      <td class="py-3 px-4">${signal.duration ? signal.duration + "s" : ""}</td>
    `;
    tableBody.appendChild(row);
  });
}

function getPeriodLabel(period) {
  const labels = {
    morning: "Período da Manhã ☀️",
    afternoon: "Período da Tarde 🌤️",
    afternoonFriday: "Sexta Especial 🎉",
  };

  return labels[period] || "Período";
}

// ==============================
// 🧭 AGENDADOR
// ==============================
function startScheduler() {
  if (nextTimeout) clearTimeout(nextTimeout);

  const now = new Date();
  const todayKey = now.toDateString();

  if (startScheduler.lastDay !== todayKey) {
    sinaisTocadosHoje.clear();
    startScheduler.lastDay = todayKey;
  }

  const signals = getAllSignalsForToday().sort((a, b) => a.date - b.date);

  const next = signals.find((s) => s.date > now);

  if (!next) return;

  updateSignalUI(getLastSignalToday(), next);
  startRealCountdown(next.date);

  nextTimeout = setTimeout(() => {
    tocarSinal(next.original);
  }, next.date - now);
}

// ==============================
// 📅 SINAIS DO DIA (Corrigido o conflito de Duplicidade)
// ==============================
function getAllSignalsForToday() {
  const now = new Date();
  const day = now.getDay();
  const isFriday = day === 5;

  // Criamos a lista de períodos sem duplicar a tarde
  let periods = ["morning"];

  if (isFriday) {
    periods.push("afternoonFriday"); // Na sexta, entra SÓ a especial
  } else {
    periods.push("afternoon"); // Dias normais, entra a tarde padrão
  }

  let result = [];
  periods.forEach((period) => {
    (schedule[period] || []).forEach((signal) => {
      const [h, m] = signal.time.split(":").map(Number);
      const date = new Date();
      date.setHours(h, m, 0, 0);

      result.push({ ...signal, period, date, original: signal });
    });
  });

  return result;
}
// ==============================
// 🔔 TOCAR
// ==============================
function tocarSinal(signal) {
  const id = `${signal.time}-${signal.name}-${new Date().toDateString()}`;
  if (sinaisTocadosHoje.has(id)) return;

  sinaisTocadosHoje.add(id);

  // --- ATIVAR ÍCONE NA TABELA ---
  const rowId = `row-${signal.time.replace(":", "-")}`;
  const rowElement = document.getElementById(rowId);

  if (rowElement) {
    rowElement.classList.add("row-playing");

    // Remove o destaque após o tempo da música (ou 15s padrão)
    const duration = (signal.duration || 15) * 1000;
    setTimeout(() => {
      rowElement.classList.remove("row-playing");
    }, duration);
  }

  initAudio(signal.music, signal.duration);
  setTimeout(startScheduler, 500);
}

// ==============================
// 🧱 UI
// ==============================
function updateSignalUI(current, next) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set("currentSignalTime", current?.time || "--:--");
  set("currentSignalName", current?.name || "Aguardando...");
  set("nextSignalTime", next?.time || "--:--");
  set("nextSignalName", next?.name || "Fim do período");
}

function getLastSignalToday() {
  const now = new Date();
  return (
    getAllSignalsForToday()
      .filter((s) => s.date <= now)
      .sort((a, b) => b.date - a.date)[0] || null
  );
}

// ==============================
// 🌙 DARK MODE PROFISSIONAL
// ==============================
function initDarkMode() {
  const toggle = document.getElementById("darkToggle");
  if (!toggle) return;

  // Atualiza ícone
  function updateIcon() {
    if (document.documentElement.classList.contains("dark")) {
      toggle.textContent = "☀️";
    } else {
      toggle.textContent = "🌙";
    }
  }

  // Estado salvo
  if (localStorage.getItem("darkMode") === "true") {
    document.documentElement.classList.add("dark");
  }

  updateIcon();

  toggle.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");

    const isDark = document.documentElement.classList.contains("dark");

    localStorage.setItem("darkMode", isDark);

    updateIcon();
  });
}

// ==============================
// ⏰ RELÓGIO
// ==============================
function initClock() {
  const el = document.getElementById("currentTime");

  setInterval(() => {
    el.textContent = new Date().toLocaleTimeString("pt-BR");
  }, 1000);
}

// ==============================
// 🚀 WAKE UP API (Render Cold Start)
// ==============================
async function wakeUpAPI() {
  const overlay = document.getElementById("overlayWakeup");
  const status = document.getElementById("statusWake");
  const button = document.getElementById("btnWakeOk");
  const icon = document.getElementById("wakeIcon");

  try {
    status.textContent = "Iniciando servidor...";

    const response = await fetch("https://sinal.onrender.com/api/schedule");

    if (!response.ok) throw new Error();

    // ✅ SUCESSO
    status.textContent = "Sistema online";

    // 🔥 TRANSFORMA SPINNER EM CHECK VERDE
    icon.classList.remove(
      "animate-spin",
      "border-4",
      "border-blue-500",
      "border-t-transparent",
      "rounded-full"
    );

    icon.innerHTML = `
      <i class="fas fa-check text-white text-xl"></i>
    `;

    icon.classList.add(
      "bg-green-500",
      "flex",
      "items-center",
      "justify-center",
      "rounded-full",
      "scale-0"
    );

    // animação de entrada
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
    status.textContent = "Erro ao conectar ❌";

    icon.classList.remove("animate-spin");
    icon.innerHTML = `<i class="fas fa-times text-white text-xl"></i>`;
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

// ==============================
// 🕹️ CONTROLE MANUAL
// ==============================
document
  .getElementById("btnManualPlay")
  ?.addEventListener("click", function () {
    const music = document.getElementById("manualMusic").value;
    const duration =
      parseInt(document.getElementById("manualDuration").value) || 12;
    const btn = this;

    // 1. Bloqueia o botão temporariamente
    btn.disabled = true;
    btn.classList.replace("bg-blue-600", "bg-slate-500");
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner animate-spin"></i> TOCANDO...`;

    // 2. Atualiza os cards de status na interface
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    const now = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    set("currentSignalTime", now);
    set("currentSignalName", "Acionamento Manual (Backup)");

    // 3. Executa o áudio usando sua função original
    initAudio(music, duration);

    // 4. Feedback visual no ícone do sino (header)
    const bell = document.getElementById("bellIcon");
    bell?.classList.add("animate-bounce");

    // 5. Libera o botão após a duração
    setTimeout(() => {
      btn.disabled = false;
      btn.classList.replace("bg-slate-500", "bg-blue-600");
      btn.innerHTML = originalText;
      bell?.classList.remove("animate-bounce");
    }, duration * 1000);
  });

// ==============================
// 🚀 INIT
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
  await wakeUpAPI();
  await loadSchedule();

  initDarkMode();
  initClock();

  // Sidebar
  document.getElementById("menuBtn")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.remove("-translate-x-full");
  });

  document.getElementById("closeSidebar")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.add("-translate-x-full");
  });
  // ==============================
  // 🎛 FILTRO DE PERÍODO
  // ==============================
  const periodFilter = document.getElementById("periodFilter");

  periodFilter?.addEventListener("change", (e) => {
    const selected = e.target.value;

    currentPeriod = selected; // atualiza período ativo
    renderScheduleByPeriod(selected);
  });
});
