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
    emphasizedSignalKey: "",
    timelineRenderedMinute: null,
    timelineUserScrolledAt: 0,
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
  const themeToggleBtn = document.getElementById("themeToggleBtn");

  const TIMELINE_IDLE_SCROLL_MS = 8000;

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

  function getPeriodKeyForDate(date = new Date()) {
    const timezone = state.school?.timezone || "America/Sao_Paulo";
    let weekday = "";
    try {
      weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: timezone }).format(
        date
      );
    } catch (_error) {
      weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
    }
    if (weekday === "Fri") return "afternoonFriday";
    return "afternoon";
  }

  function getTodayPeriodKey() {
    return getPeriodKeyForDate(new Date());
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

  function getSchoolCalendarDate(dayOffset = 0) {
    const schoolTime = getSchoolTimeParts();
    const [year, month, day] = schoolTime.dateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + dayOffset, 12, 0, 0));
  }

  function getDayOffsetLabel(dayOffset) {
    if (dayOffset === 0) return "hoje";
    if (dayOffset === 1) return "amanhã";
    return `em ${dayOffset} dias`;
  }

  function getSignalsForDayOffset(dayOffset = 0) {
    const targetDate = getSchoolCalendarDate(dayOffset);
    const afternoonPeriod = getPeriodKeyForDate(targetDate);
    return [...state.schedule.morning, ...state.schedule[afternoonPeriod]]
      .filter((signal) => signal?.time && signal?.music)
      .sort((a, b) => String(a.time).localeCompare(String(b.time)))
      .map((signal) => ({
        ...signal,
        dayOffset,
        dayLabel: getDayOffsetLabel(dayOffset),
      }));
  }

  function getSignalsForToday() {
    return getSignalsForDayOffset(0);
  }

  function getTimelineSignals(nowMinutes = getCurrentMinutes()) {
    const todaySignals = getSignalsForToday();
    const upcomingToday = todaySignals.find((signal) => {
      const minutes = getSignalMinutes(signal);
      return minutes !== null && minutes >= nowMinutes;
    });
    if (upcomingToday || !todaySignals.length) return todaySignals;

    const tomorrowSignals = getSignalsForDayOffset(1);
    return [...todaySignals, ...tomorrowSignals];
  }

  function formatSignalLabel(signal) {
    return `${signal.name || "Sinal"}`;
  }

  function getSignalKey(signal) {
    return `${signal?.dayOffset || 0}-${signal?.time || ""}-${signal?.name || ""}-${signal?.music || ""}`;
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
    playerStatus.className = `mt-3 text-base ${isError ? "text-rose-300" : "text-slate-300"}`;
  }

  function getSignalMinutes(signal) {
    const [hour, minute] = String(signal?.time || "").split(":").map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
  }

  function getCurrentMinutes() {
    const schoolTime = getSchoolTimeParts();
    return Number(schoolTime.hour) * 60 + Number(schoolTime.minute);
  }

  function getSignalStatus(signal, upcoming, nowMinutes) {
    if (upcoming && signal === upcoming) return "next";
    if (Number(signal?.dayOffset) > 0) return "waiting";
    const signalMinutes = getSignalMinutes(signal);
    if (signalMinutes !== null && signalMinutes < nowMinutes) return "done";
    return "waiting";
  }

  function getLastPlayedSignal(todaySignals, nowMinutes) {
    return [...todaySignals]
      .filter((signal) => {
        const minutes = getSignalMinutes(signal);
        return minutes !== null && minutes < nowMinutes;
      })
      .pop() || null;
  }

  function formatMinutesUntil(signal, nowMinutes) {
    const signalMinutes = getSignalMinutes(signal);
    if (signalMinutes === null) return "";
    if (Number(signal?.dayOffset) > 0) return signal?.dayLabel || "proximo dia";
    const diff = Math.max(0, signalMinutes - nowMinutes);
    if (diff === 0) return "agora";
    if (diff === 1) return "falta 1 min";
    return `faltam ${diff} min`;
  }

  function getTimelineFocus(todaySignals, nowMinutes) {
    const upcoming = todaySignals.find((signal) => {
      const minutes = getSignalMinutes(signal);
      return Number(signal?.dayOffset) > 0 || (minutes !== null && minutes >= nowMinutes);
    });
    const lastPlayed = getLastPlayedSignal(todaySignals, nowMinutes);
    return upcoming || lastPlayed || todaySignals[0] || null;
  }

  function syncEmphasizedSignal(todaySignals, nowMinutes) {
    const focus = getTimelineFocus(todaySignals, nowMinutes);
    state.emphasizedSignalKey = focus ? getSignalKey(focus) : "";
    return focus;
  }

  function scrollTimelineToEmphasis({ behavior = "smooth" } = {}) {
    if (!scheduleSections || !state.emphasizedSignalKey) return;
    const target = Array.from(scheduleSections.children).find(
      (element) => element.dataset.signalKey === state.emphasizedSignalKey
    );
    if (!target) return;

    const containerRect = scheduleSections.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const relativeTop = targetRect.top - containerRect.top + scheduleSections.scrollTop;
    const centeredTop = relativeTop - scheduleSections.clientHeight / 2 + targetRect.height / 2;
    const maxTop = Math.max(0, scheduleSections.scrollHeight - scheduleSections.clientHeight);
    const nextTop = Math.min(Math.max(0, centeredTop), maxTop);
    scheduleSections.scrollTo({ top: nextTop, behavior });
  }

  function renderSchedule(options = {}) {
    const previousScrollTop = scheduleSections.scrollTop;
    scheduleSections.innerHTML = "";
    const nowMinutes = getCurrentMinutes();
    state.timelineRenderedMinute = nowMinutes;
    const timelineSignals = getTimelineSignals(nowMinutes);
    const upcoming = timelineSignals.find((signal) => {
      const minutes = getSignalMinutes(signal);
      return Number(signal?.dayOffset) > 0 || (minutes !== null && minutes >= nowMinutes);
    }) || timelineSignals.find((signal) => Number(signal?.dayOffset) > 0) || null;
    syncEmphasizedSignal(timelineSignals, nowMinutes);

    if (!timelineSignals.length) {
      scheduleSections.innerHTML = `
        <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm font-bold text-slate-500 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          Nenhum sinal cadastrado para hoje.
        </div>
      `;
      return;
    }

    timelineSignals.forEach((signal) => {
      const status = getSignalStatus(signal, upcoming, nowMinutes);
      const row = document.createElement("article");
      const statusStyles = {
        done: {
          dot: "bg-cyan-500",
          panel: "bg-white dark:bg-slate-800",
          label: "Concluido",
          labelClass: "text-cyan-700 dark:text-cyan-300",
          meta: "ja tocou",
        },
        next: {
          dot: "bg-sky-600 ring-8 ring-sky-100 dark:ring-sky-900",
          panel:
            "bg-sky-50 ring-2 ring-sky-500 shadow-lg shadow-sky-200/70 dark:bg-sky-950/50 dark:ring-sky-400 dark:shadow-sky-950/30",
          label: "Proximo",
          labelClass: "text-sky-700 dark:text-sky-300",
          meta: formatMinutesUntil(signal, nowMinutes),
        },
        waiting: {
          dot: "bg-slate-300 dark:bg-slate-600",
          panel: "bg-white dark:bg-slate-800",
          label: "Aguardando",
          labelClass: "text-slate-500 dark:text-slate-400",
          meta: "aguardando",
        },
      }[status];

      row.dataset.signalKey = getSignalKey(signal);
      row.className = `grid min-h-[92px] grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-2xl ${statusStyles.panel} p-3 shadow-sm transition-colors`;
      row.innerHTML = `
        <div class="flex flex-col items-center">
          <span class="mt-1 h-4 w-4 rounded-full ${statusStyles.dot}"></span>
          <span class="mt-2 h-full w-0.5 rounded-full bg-slate-200 dark:bg-slate-700"></span>
        </div>
        <div class="min-w-0">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="truncate text-lg font-black text-slate-950 dark:text-slate-100">${escapeHtml(signal.name || "Sinal")}</p>
              <p class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">${escapeHtml(signal.time || "--:--")} - ${escapeHtml(statusStyles.meta)}</p>
              ${Number(signal?.dayOffset) > 0 ? `<p class="mt-1 text-xs font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">${escapeHtml(signal.dayLabel || "proximo dia")}</p>` : ""}
            </div>
            <span class="shrink-0 text-sm font-black ${statusStyles.labelClass}">${statusStyles.label}</span>
          </div>
        </div>
      `;
      scheduleSections.appendChild(row);
    });

    if (options.scrollToEmphasis) {
      scrollTimelineToEmphasis({ behavior: options.behavior || "auto" });
    } else {
      scheduleSections.scrollTop = previousScrollTop;
    }
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
    const nowMinutes = getCurrentMinutes();
    const todaySignals = getSignalsForToday();
    const upcomingToday = todaySignals.find((signal) => {
      const minutes = getSignalMinutes(signal);
      return minutes !== null && minutes >= nowMinutes;
    });
    const upcoming = upcomingToday || getSignalsForDayOffset(1)[0] || null;
    const lastPlayed = getLastPlayedSignal(todaySignals, nowMinutes);
    syncEmphasizedSignal(getTimelineSignals(nowMinutes), nowMinutes);
    nextSignal.textContent = upcoming ? formatSignalLabel(upcoming) : "Nenhum proximo sinal cadastrado";
    if (signalCount) {
      signalCount.textContent =
        upcomingToday || !upcoming
          ? `${todaySignals.length} sinal${todaySignals.length === 1 ? "" : "is"} hoje`
          : `${todaySignals.length} hoje - proximo amanhã`;
    }
    if (audioCount) audioCount.textContent = `${todaySignals.length} horario${todaySignals.length === 1 ? "" : "s"}`;
    if (playingSignal) {
      playingSignal.textContent = lastPlayed
        ? `${lastPlayed.name || "Sinal"} • ${lastPlayed.time || "--:--"}`
        : "Nenhum ainda";
    }
    if (scheduledStatus) {
      scheduledStatus.textContent = upcoming
        ? `${upcoming.time || "--:--"} • ${formatMinutesUntil(upcoming, nowMinutes)}`
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
    }

    if (state.audioEnabled) {
      audioHint.textContent = "Som ativo. A pagina pode tocar os proximos sinais enquanto estiver aberta.";
      enableAudioBtn.innerHTML = `<i class="fas fa-volume-high"></i> Som ativo`;
      enableAudioBtn.className =
        "mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-2 text-base font-black text-white transition hover:bg-cyan-700";
      if (audioBadge) {
        audioBadge.textContent = "Ativo";
        audioBadge.className =
          "shrink-0 rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300";
      }
      return;
    }

    audioHint.textContent = "Som desativado. Os proximos sinais nao serao tocados automaticamente.";
    enableAudioBtn.innerHTML = `<i class="fas fa-volume-high"></i> Ativar som`;
    enableAudioBtn.className =
      "mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-2 text-base font-black text-white transition hover:bg-sky-700";
    if (audioBadge) {
      audioBadge.textContent = "Desativado";
      audioBadge.className =
        "shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-700 dark:text-slate-300";
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
    const previousEmphasisKey = state.emphasizedSignalKey;
    const previousRenderedMinute = state.timelineRenderedMinute;
    updateNextSignal();
    if (previousEmphasisKey !== state.emphasizedSignalKey) {
      renderSchedule({ scrollToEmphasis: true, behavior: "smooth" });
    } else if (previousRenderedMinute !== getCurrentMinutes()) {
      renderSchedule();
    }
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
      setStatus("");
      renderSchedule({ scrollToEmphasis: true, behavior: "auto" });
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

  scheduleSections?.addEventListener("scroll", () => {
    state.timelineUserScrolledAt = Date.now();
  });

  function readStoredTheme() {
    try {
      return window.localStorage.getItem("darkMode");
    } catch (_error) {
      return null;
    }
  }

  function storeTheme(isDark) {
    try {
      window.localStorage.setItem("darkMode", String(isDark));
    } catch (_error) {
      // Theme still changes for the current page even when storage is unavailable.
    }
  }

  function updateThemeButton() {
    if (!themeToggleBtn) return;
    const isDark = document.documentElement.classList.contains("dark");
    themeToggleBtn.querySelector('[data-theme-icon="moon"]')?.classList.toggle("hidden", isDark);
    themeToggleBtn.querySelector('[data-theme-icon="sun"]')?.classList.toggle("hidden", !isDark);
    const label = isDark ? "Ativar tema claro" : "Ativar tema escuro";
    themeToggleBtn.setAttribute("aria-label", label);
    themeToggleBtn.setAttribute("title", label);
  }

  function setTheme(isDark) {
    document.documentElement.classList.toggle("dark", isDark);
    storeTheme(isDark);
    updateThemeButton();
  }

  function loadTheme() {
    const savedTheme = readStoredTheme();
    if (savedTheme !== null) {
      setTheme(savedTheme === "true");
      return;
    }
    setTheme(window.matchMedia?.("(prefers-color-scheme: dark)")?.matches || false);
  }

  themeToggleBtn?.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    storeTheme(document.documentElement.classList.contains("dark"));
    updateThemeButton();
  });

  loadTheme();
  loadPlayer();
  setInterval(tick, 1000);
  setInterval(() => {
    if (Date.now() - state.timelineUserScrolledAt < TIMELINE_IDLE_SCROLL_MS) return;
    scrollTimelineToEmphasis({ behavior: "smooth" });
  }, 5000);
})();
