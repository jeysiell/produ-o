(() => {
  const API_URL = "https://sinal.onrender.com/api/schedule";

  const musicLabels = {
    "musica1.mp3": "Tu me Sondas",
    "musica2.mp3": "Eu Amo a Minha Escola",
    "musica3.mp3": "My Lighthouse",
    "musica4.mp3": "Amor Teimoso",
    "musica5.mp3": "Minha vida e uma viagem",
    "musica6.mp3": "A Biblia",
  };

  const navDashboard = document.getElementById("navDashboard");
  const navConfig = document.getElementById("navConfig");
  const dashboardSection = document.getElementById("dashboardSection");
  const configSection = document.getElementById("configSection");
  const pageEyebrow = document.getElementById("pageEyebrow");
  const pageTitle = document.getElementById("pageTitle");
  const sidebar = document.getElementById("sidebar");

  const filterPeriod = document.getElementById("configFilterPeriod");
  const scheduleTable = document.getElementById("configScheduleTable");
  const configBtn = document.getElementById("configBtn");
  const configClock = document.getElementById("configCurrentTime");

  const modal = document.getElementById("configModal");
  const modalContent = document.getElementById("modalContent");
  const modalTitle = document.getElementById("modalTitle");
  const scheduleForm = document.getElementById("scheduleForm");
  const cancelConfigBtn = document.getElementById("cancelConfigBtn");

  const editMode = document.getElementById("editMode");
  const editPeriod = document.getElementById("editPeriod");
  const editTimeOriginal = document.getElementById("editTimeOriginal");
  const periodSelect = document.getElementById("periodSelect");
  const timeInput = document.getElementById("timeInput");
  const nameInput = document.getElementById("nameInput");
  const musicSelect = document.getElementById("musicSelect");
  const durationSelect = document.getElementById("durationSelect");

  const navActiveClasses = ["bg-slate-900", "text-white", "shadow-soft", "dark:bg-slate-800"];
  const navInactiveClasses = [
    "text-slate-700",
    "dark:text-slate-200",
    "hover:bg-slate-100",
    "dark:hover:bg-slate-800",
  ];

  let configLoaded = false;

  function closeSidebarOnMobile() {
    if (window.innerWidth < 768) {
      sidebar?.classList.add("-translate-x-full");
    }
  }

  function setNavState(el, isActive) {
    if (!el) return;

    if (isActive) {
      el.classList.add(...navActiveClasses);
      el.classList.remove(...navInactiveClasses);
    } else {
      el.classList.remove(...navActiveClasses);
      el.classList.add(...navInactiveClasses);
    }
  }

  function switchSection(target) {
    const showConfig = target === "config";

    dashboardSection?.classList.toggle("hidden", showConfig);
    configSection?.classList.toggle("hidden", !showConfig);

    setNavState(navDashboard, !showConfig);
    setNavState(navConfig, showConfig);

    if (showConfig) {
      if (pageEyebrow) pageEyebrow.textContent = "";
      if (pageTitle) pageTitle.textContent = "Configurações";
      if (!configLoaded) {
        loadConfigSchedule();
      }
    } else {
      if (pageEyebrow) pageEyebrow.textContent = "";
      if (pageTitle) pageTitle.textContent = "Sinais";
    }

    closeSidebarOnMobile();
  }

  function updateConfigClock() {
    if (!configClock) return;
    configClock.textContent = new Date().toLocaleTimeString("pt-BR");
  }

  function ensureDurationOption(value) {
    if (!durationSelect) return;
    const valueStr = String(value || 15);
    const exists = Array.from(durationSelect.options).some((opt) => opt.value === valueStr);
    if (!exists) {
      const option = document.createElement("option");
      option.value = valueStr;
      option.textContent = `${valueStr} segundos`;
      durationSelect.appendChild(option);
    }
    durationSelect.value = valueStr;
  }

  function openModal() {
    if (!modal || !modalContent) return;
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    setTimeout(() => {
      modalContent.classList.remove("scale-95", "opacity-0");
    }, 30);
  }

  function closeModal() {
    if (!modal || !modalContent) return;

    modalContent.classList.add("scale-95", "opacity-0");
    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }, 200);
  }

  function openNewModal() {
    if (!scheduleForm) return;
    scheduleForm.reset();
    if (editMode) editMode.value = "false";
    if (modalTitle) modalTitle.textContent = "Novo Horario";
    ensureDurationOption(15);
    openModal();
  }

  function openEditModal(period, signal) {
    if (!editMode || !editPeriod || !editTimeOriginal) return;

    editMode.value = "true";
    editPeriod.value = period;
    editTimeOriginal.value = signal.time;
    if (modalTitle) modalTitle.textContent = "Editar Horario";

    if (periodSelect) periodSelect.value = period;
    if (timeInput) timeInput.value = signal.time;
    if (nameInput) nameInput.value = signal.name;
    if (musicSelect) musicSelect.value = signal.music;
    ensureDurationOption(signal.duration || 15);

    openModal();
  }

  async function deleteSignal(period, time) {
    if (!confirm(`Remover o sinal das ${time}?`)) return;

    try {
      const res = await fetch(`${API_URL}/${period}/${time}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete-error");
      await loadConfigSchedule();
    } catch (err) {
      console.error("Erro ao remover sinal:", err);
      alert("Erro ao remover horario.");
    }
  }

  async function loadConfigSchedule() {
    if (!scheduleTable) return;

    scheduleTable.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-center text-slate-500">
          Carregando horarios...
        </td>
      </tr>
    `;

    const selectedFilter = filterPeriod?.value || "all";
    const periods = {
      morning: "Manha",
      afternoon: "Tarde",
      afternoonFriday: "Tarde de Sexta",
    };

    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("fetch-error");

      const data = await res.json();
      scheduleTable.innerHTML = "";
      let hasData = false;

      Object.entries(periods).forEach(([key, label]) => {
        if (selectedFilter !== "all" && selectedFilter !== key) return;

        const list = Array.isArray(data[key]) ? data[key] : [];
        list.sort((a, b) => a.time.localeCompare(b.time));

        list.forEach((signal) => {
          hasData = true;
          const tr = document.createElement("tr");
          tr.className =
            "cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/60";
          tr.innerHTML = `
            <td class="px-4 py-3">${label}</td>
            <td class="px-4 py-3">${signal.time}</td>
            <td class="px-4 py-3">${signal.name}</td>
            <td class="px-4 py-3">${musicLabels[signal.music] || signal.music}</td>
            <td class="px-4 py-3">${signal.duration || 15}s</td>
            <td class="px-4 py-3 text-center">
              <button class="text-red-600 transition hover:text-red-800" type="button" title="Remover">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          `;

          tr.querySelector("button")?.addEventListener("click", (event) => {
            event.stopPropagation();
            deleteSignal(key, signal.time);
          });

          tr.addEventListener("click", () => openEditModal(key, signal));
          scheduleTable.appendChild(tr);
        });
      });

      if (!hasData) {
        scheduleTable.innerHTML = `
          <tr>
            <td colspan="6" class="py-6 text-center text-slate-400">
              Nenhum horario cadastrado
            </td>
          </tr>
        `;
      }

      configLoaded = true;
    } catch (err) {
      console.error("Erro ao carregar horarios:", err);
      scheduleTable.innerHTML = `
        <tr>
          <td colspan="6" class="py-6 text-center text-red-600">
            Erro ao carregar horarios
          </td>
        </tr>
      `;
    }
  }

  async function saveSchedule(event) {
    event.preventDefault();
    if (!periodSelect || !timeInput || !nameInput || !musicSelect || !durationSelect) return;

    const isEdit = editMode?.value === "true";
    const period = periodSelect.value;
    const time = timeInput.value;
    const name = nameInput.value;
    const music = musicSelect.value;
    const duration = parseInt(durationSelect.value, 10) || 15;

    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("fetch-error");

      const data = await res.json();

      if (isEdit && editPeriod && editTimeOriginal) {
        const originalPeriod = editPeriod.value;
        const originalTime = editTimeOriginal.value;
        data[originalPeriod] = (data[originalPeriod] || []).filter(
          (item) => item.time !== originalTime
        );
      }

      data[period] = data[period] || [];

      const exists = data[period].some((item) => item.time === time);
      if (exists) {
        alert("Ja existe um sinal nesse horario.");
        return;
      }

      data[period].push({ time, name, music, duration });

      Object.keys(data).forEach((key) => {
        data[key].sort((a, b) => a.time.localeCompare(b.time));
      });

      const putRes = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!putRes.ok) throw new Error("save-error");

      closeModal();
      await loadConfigSchedule();
    } catch (err) {
      console.error("Erro ao salvar horario:", err);
      alert("Erro ao salvar horario.");
    }
  }

  function bindEvents() {
    navDashboard?.addEventListener("click", (event) => {
      event.preventDefault();
      switchSection("dashboard");
    });

    navConfig?.addEventListener("click", (event) => {
      event.preventDefault();
      switchSection("config");
    });

    filterPeriod?.addEventListener("change", loadConfigSchedule);
    configBtn?.addEventListener("click", openNewModal);
    cancelConfigBtn?.addEventListener("click", closeModal);
    scheduleForm?.addEventListener("submit", saveSchedule);

    modal?.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
  }

  function init() {
    bindEvents();
    updateConfigClock();
    setInterval(updateConfigClock, 1000);
    switchSection("dashboard");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
