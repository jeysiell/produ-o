(() => {
  const PERIOD_LABELS = {
    morning: "Manha",
    afternoon: "Tarde",
    afternoonFriday: "Sexta a tarde",
  };
  const PERIODS = ["morning", "afternoon", "afternoonFriday"];

  const state = {
    school: null,
    schedule: { morning: [], afternoon: [], afternoonFriday: [] },
    signals: [],
    audioTracks: [],
    audioEnabled: false,
    currentAudio: null,
    playedKeys: new Set(),
  };

  const schoolName = document.getElementById("schoolName");
  const playerStatus = document.getElementById("playerStatus");
  const enableAudioBtn = document.getElementById("enableAudioBtn");
  const clock = document.getElementById("clock");
  const todayDate = document.getElementById("todayDate");
  const nextSignal = document.getElementById("nextSignal");
  const signalCount = document.getElementById("signalCount");
  const scheduledStatus = document.getElementById("scheduledStatus");
  const playingSignal = document.getElementById("playingSignal");
  const audioBadge = document.getElementById("audioBadge");
  const audioHint = document.getElementById("audioHint");
  const audioCount = document.getElementById("audioCount");
  const manualSignalSelect = document.getElementById("manualSignalSelect");
  const manualPlayBtn = document.getElementById("manualPlayBtn");
  const scheduleSections = document.getElementById("scheduleSections");

  function getTokenFromPath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  function normalizeSchedule(schedule) {
    const normalized = {};
    PERIODS.forEach((period) => {
      normalized[period] = Array.isArray(schedule?.[period]) ? schedule[period] : [];
    });
    return normalized;
  }

  function getTodayPeriodKey() {
    const timezone = state.school?.timezone || "America/Sao_Paulo";
    let weekday = "";
    try {
      weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: timezone }).format(
        new Date()
      );
    } catch (_error) {
      weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date());
    }
    if (weekday === "Fri") return "afternoonFriday";
    return "afternoon";
  }

  function getSchoolTimeParts() {
    const timezone = state.school?.timezone || "America/Sao_Paulo";
    let parts;
    try {
      parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
    } catch (_error) {
      parts = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
    }
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      dateKey: `${values.year}-${values.month}-${values.day}`,
      hour: values.hour || "00",
      minute: values.minute || "00",
    };
  }

  function getSignalsForToday() {
    const todayAfternoon = getTodayPeriodKey();
    return [...state.schedule.morning, ...state.schedule[todayAfternoon]]
      .filter((signal) => signal?.time && signal?.music)
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));
  }

  function formatSignalLabel(signal) {
    return `${signal.time || "--:--"} - ${signal.name || "Sinal"}`;
  }

  function formatAudioTrackLabel(track) {
    const duration = Number(track.durationSeconds) || 20;
    return `${track.name || "Musica"} - ${duration}s`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setStatus(message, isError = false) {
    playerStatus.textContent = message;
    playerStatus.className = `mt-1 text-sm ${
      isError ? "text-rose-600 dark:text-rose-300" : "text-slate-500 dark:text-slate-400"
    }`;
  }

  function renderSchedule() {
    scheduleSections.innerHTML = "";

    PERIODS.forEach((period) => {
      const section = document.createElement("article");
      section.className =
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900";

      const items = state.schedule[period] || [];
      const rows = items.length
        ? items
            .map(
              (signal) => `
                <li class="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">${escapeHtml(signal.name || "Sinal")}</p>
                    <p class="text-xs font-semibold text-slate-500 dark:text-slate-500">${signal.duration || 20}s</p>
                  </div>
                  <span class="shrink-0 rounded-lg bg-cyan-100 px-2.5 py-1 text-sm font-black tabular-nums text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-200">
                    ${escapeHtml(signal.time || "--:--")}
                  </span>
                </li>
              `
            )
            .join("")
        : `<li class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500">Sem sinais cadastrados.</li>`;

      section.innerHTML = `
        <h3 class="text-base font-black">${PERIOD_LABELS[period]}</h3>
        <ul class="mt-3 space-y-2">${rows}</ul>
      `;
      scheduleSections.appendChild(section);
    });
  }

  function renderManualOptions() {
    const options = state.audioTracks
      .filter((track) => track?.publicUrl)
      .map((track) => ({
        name: track.name || "Musica",
        music: track.publicUrl,
        duration: Number(track.durationSeconds) || 20,
        durationSeconds: Number(track.durationSeconds) || 20,
      }));

    if (!options.length) {
      manualSignalSelect.innerHTML = `<option value="">Nenhum audio cadastrado</option>`;
      manualPlayBtn.disabled = true;
      state.manualOptions = [];
      if (audioCount) audioCount.textContent = "Nenhuma musica cadastrada no banco de dados.";
      return;
    }

    manualSignalSelect.innerHTML = [
      `<option value="">Selecione uma musica</option>`,
      ...options.map(
        (signal, index) =>
          `<option value="${index}">${escapeHtml(formatAudioTrackLabel(signal))}</option>`
      ),
    ].join("");
    manualPlayBtn.disabled = true;
    if (audioCount) {
      audioCount.textContent = `${options.length} musica${options.length === 1 ? "" : "s"} cadastrada${options.length === 1 ? "" : "s"} disponivel${options.length === 1 ? "" : "s"}.`;
    }
    manualPlayBtn.dataset.optionCount = String(options.length);
    state.manualOptions = options;
  }

  function updateNextSignal() {
    const schoolTime = getSchoolTimeParts();
    const nowMinutes = Number(schoolTime.hour) * 60 + Number(schoolTime.minute);
    const todaySignals = getSignalsForToday();
    const upcoming = todaySignals.find((signal) => {
      const [hour, minute] = String(signal.time || "").split(":").map(Number);
      return Number.isFinite(hour) && Number.isFinite(minute) && hour * 60 + minute >= nowMinutes;
    });
    nextSignal.textContent = upcoming ? formatSignalLabel(upcoming) : "Nenhum sinal restante hoje";
    if (signalCount) {
      signalCount.textContent = `${todaySignals.length} hoje`;
    }
    if (scheduledStatus) {
      scheduledStatus.textContent = upcoming
        ? "A pagina toca automaticamente quando o som esta ativo."
        : "Todos os sinais de hoje ja passaram.";
    }
  }

  async function playSignal(signal, source = "manual") {
    if (!signal?.music) return;
    if (!state.audioEnabled && source !== "manual") {
      audioHint.textContent = "Som bloqueado neste aparelho. Toque em Ativar som para liberar.";
      return;
    }

    if (state.currentAudio) {
      state.currentAudio.pause();
      state.currentAudio.currentTime = 0;
    }

    const audio = new Audio(signal.music);
    audio.preload = "auto";
    state.currentAudio = audio;
    playingSignal.textContent = signal.name || "Sinal";
    audioHint.textContent = "Reproduzindo audio cadastrado.";

    try {
      await audio.play();
      setAudioEnabled(true);
    } catch (error) {
      console.error("Erro ao tocar audio publico:", error);
      audioHint.textContent = "Nao foi possivel tocar. Verifique o volume do aparelho e tente novamente.";
    }
  }

  function setAudioEnabled(enabled) {
    state.audioEnabled = Boolean(enabled);

    if (!state.audioEnabled && state.currentAudio) {
      state.currentAudio.pause();
      state.currentAudio.currentTime = 0;
      state.currentAudio = null;
      playingSignal.textContent = "Nenhum";
    }

    if (state.audioEnabled) {
      audioHint.textContent = "Som ativo. A pagina pode tocar os proximos sinais enquanto estiver aberta.";
      enableAudioBtn.innerHTML = `<i class="fas fa-volume-high"></i> Som ativo`;
      enableAudioBtn.classList.remove("bg-slate-950", "hover:bg-slate-800");
      enableAudioBtn.classList.add("bg-emerald-600", "hover:bg-emerald-700");
      if (audioBadge) {
        audioBadge.textContent = "Ativo";
        audioBadge.className =
          "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300";
      }
      return;
    }

    audioHint.textContent = "Som desativado. Os proximos sinais nao serao tocados automaticamente.";
    enableAudioBtn.innerHTML = `<i class="fas fa-volume-xmark"></i> Som desativado`;
    enableAudioBtn.classList.remove("bg-emerald-600", "hover:bg-emerald-700");
    enableAudioBtn.classList.add("bg-slate-950", "hover:bg-slate-800");
    if (audioBadge) {
      audioBadge.textContent = "Desativado";
      audioBadge.className =
        "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    }
  }

  function checkScheduledSignal() {
    const schoolTime = getSchoolTimeParts();
    const currentTime = `${schoolTime.hour}:${schoolTime.minute}`;
    const dateKey = schoolTime.dateKey;

    getSignalsForToday()
      .filter((signal) => signal.time === currentTime)
      .forEach((signal) => {
        const key = `${dateKey}-${signal.time}-${signal.name}`;
        if (state.playedKeys.has(key)) return;
        state.playedKeys.add(key);
        playSignal(signal, "scheduled");
      });
  }

  function tick() {
    const schoolTime = getSchoolTimeParts();
    clock.textContent = `${schoolTime.hour}:${schoolTime.minute}`;
    if (todayDate) {
      const timezone = state.school?.timezone || "America/Sao_Paulo";
      try {
        todayDate.textContent = new Intl.DateTimeFormat("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          timeZone: timezone,
        }).format(new Date());
      } catch (_error) {
        todayDate.textContent = new Intl.DateTimeFormat("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        }).format(new Date());
      }
    }
    updateNextSignal();
    checkScheduledSignal();
  }

  async function loadPlayer() {
    const token = getTokenFromPath();
    if (!token) {
      setStatus("Link publico invalido.", true);
      return;
    }

    try {
      const response = await fetch(`/api/public/schools/${encodeURIComponent(token)}/player`);
      if (!response.ok) {
        throw new Error(response.status === 404 ? "Link publico nao encontrado." : "Falha ao carregar.");
      }

      const payload = await response.json();
      state.school = payload.school || null;
      state.schedule = normalizeSchedule(payload.schedule);
      state.signals = PERIODS.flatMap((period) => state.schedule[period] || []);
      state.audioTracks = Array.isArray(payload.audioTracks) ? payload.audioTracks : [];

      schoolName.textContent = state.school?.name || "Player publico";
      setStatus("Link publico de sinais. Sem acesso ao painel administrativo.");
      renderSchedule();
      renderManualOptions();
      tick();
    } catch (error) {
      console.error("Erro ao carregar player publico:", error);
      schoolName.textContent = "Link indisponivel";
      setStatus(error.message || "Nao foi possivel carregar o player publico.", true);
      manualSignalSelect.innerHTML = `<option value="">Indisponivel</option>`;
      manualPlayBtn.disabled = true;
    }
  }

  enableAudioBtn?.addEventListener("click", () => {
    setAudioEnabled(!state.audioEnabled);
  });

  manualPlayBtn?.addEventListener("click", () => {
    const selected = Number.parseInt(manualSignalSelect.value, 10);
    const signal = state.manualOptions?.[selected];
    if (signal) playSignal(signal, "manual");
  });

  manualSignalSelect?.addEventListener("change", () => {
    manualPlayBtn.disabled = manualSignalSelect.value === "";
  });

  document.documentElement.classList.remove("dark");
  loadPlayer();
  setInterval(tick, 1000);
})();
