(() => {
  const API_BASE = "/api";
  const SCHOOLS_API_URL = `${API_BASE}/schools`;
  const CURRENT_SCHOOL_STORAGE_KEY = "currentSchoolId";
  const AUTH_TOKEN_STORAGE_KEY = "authToken";
  const AUTH_USER_STORAGE_KEY = "authUser";

  const ROLE_SUPERADMIN = "superadmin";
  const ROLE_ADMIN_ESCOLA = "admin_escola";
  const ROLE_SOMENTE_LEITURA = "somente_leitura";

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
  const navSchools = document.getElementById("navSchools");
  const dashboardSection = document.getElementById("dashboardSection");
  const configSection = document.getElementById("configSection");
  const schoolsSection = document.getElementById("schoolsSection");
  const pageEyebrow = document.getElementById("pageEyebrow");
  const pageTitle = document.getElementById("pageTitle");
  const sidebar = document.getElementById("sidebar");

  const dashboardSchoolSelect = document.getElementById("dashboardSchoolSelect");
  const configSchoolSelect = document.getElementById("configSchoolSelect");
  const templateSelect = document.getElementById("templateSelect");
  const saveTemplateBtn = document.getElementById("saveTemplateBtn");
  const cloneTemplateBtn = document.getElementById("cloneTemplateBtn");
  const exportBackupBtn = document.getElementById("exportBackupBtn");
  const importBackupInput = document.getElementById("importBackupInput");

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

  const schoolsTableBody = document.getElementById("schoolsTableBody");
  const schoolBtn = document.getElementById("schoolBtn");
  const schoolModal = document.getElementById("schoolModal");
  const schoolModalContent = document.getElementById("schoolModalContent");
  const schoolModalTitle = document.getElementById("schoolModalTitle");
  const schoolForm = document.getElementById("schoolForm");
  const cancelSchoolBtn = document.getElementById("cancelSchoolBtn");
  const schoolEditId = document.getElementById("schoolEditId");
  const schoolNameInput = document.getElementById("schoolNameInput");
  const schoolSlugInput = document.getElementById("schoolSlugInput");
  const schoolTimezoneInput = document.getElementById("schoolTimezoneInput");
  const schoolActiveInput = document.getElementById("schoolActiveInput");

  const authOverlay = document.getElementById("authOverlay");
  const loginForm = document.getElementById("loginForm");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginError = document.getElementById("loginError");
  const loginSubmitBtn = document.getElementById("loginSubmitBtn");
  const authUserBadge = document.getElementById("authUserBadge");
  const authUserName = document.getElementById("authUserName");
  const authUserRole = document.getElementById("authUserRole");
  const authUserIcon = document.getElementById("authUserIcon");
  const logoutBtn = document.getElementById("logoutBtn");

  const navActiveClasses = ["bg-slate-900", "text-white", "shadow-soft", "dark:bg-slate-800"];
  const navInactiveClasses = [
    "text-slate-700",
    "dark:text-slate-200",
    "hover:bg-slate-100",
    "dark:hover:bg-slate-800",
  ];

  const periods = {
    morning: "Manha",
    afternoon: "Tarde",
    afternoonFriday: "Tarde de Sexta",
  };

  let configLoaded = false;
  let schools = [];
  let templates = [];
  let currentUser = null;

  function formatRoleLabel(role) {
    const labels = {
      [ROLE_SUPERADMIN]: "Superadmin",
      [ROLE_ADMIN_ESCOLA]: "Admin Escola",
      [ROLE_SOMENTE_LEITURA]: "Somente Leitura",
    };
    return labels[role] || "Perfil";
  }

  function isSuperAdmin() {
    return currentUser?.role === ROLE_SUPERADMIN;
  }

  function canWrite() {
    return currentUser && currentUser.role !== ROLE_SOMENTE_LEITURA;
  }

  function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
  }

  function setAuthSession(token, user) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user || {}));
  }

  function clearAuthSession() {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    localStorage.removeItem(CURRENT_SCHOOL_STORAGE_KEY);
  }

  function setCurrentUser(user) {
    currentUser = user || null;
    window.currentUser = currentUser;
    updateUserBadge();
    applyPermissions();
  }

  function updateUserBadge() {
    if (!authUserBadge || !logoutBtn || !authUserName || !authUserRole || !authUserIcon) return;

    if (!currentUser) {
      authUserBadge.classList.add("hidden");
      authUserBadge.classList.remove("inline-flex");
      logoutBtn.classList.add("hidden");
      return;
    }

    authUserName.textContent = currentUser.name || currentUser.email || "Usuario";
    authUserRole.textContent = formatRoleLabel(currentUser.role);
    authUserIcon.className =
      currentUser.role === ROLE_SUPERADMIN
        ? "fas fa-user-shield text-blue-600 dark:text-sky-300"
        : "fas fa-user text-blue-600 dark:text-sky-300";

    authUserBadge.classList.remove("hidden");
    authUserBadge.classList.add("inline-flex");
    logoutBtn.classList.remove("hidden");
    logoutBtn.classList.add("inline-flex");
  }

  function showAuthOverlay() {
    if (!authOverlay) return;
    authOverlay.classList.remove("hidden");
    authOverlay.classList.add("flex");
  }

  function hideAuthOverlay() {
    if (!authOverlay) return;
    authOverlay.classList.add("hidden");
    authOverlay.classList.remove("flex");
  }

  function showLoginError(message) {
    if (!loginError) return;
    if (!message) {
      loginError.classList.add("hidden");
      loginError.textContent = "";
      return;
    }
    loginError.textContent = message;
    loginError.classList.remove("hidden");
  }

  function broadcastAuthChanged(authenticated) {
    window.dispatchEvent(
      new CustomEvent("auth:changed", {
        detail: {
          authenticated: Boolean(authenticated),
          user: currentUser,
        },
      })
    );
  }

  async function apiFetch(url, options = {}) {
    const token = getAuthToken();
    const headers = new Headers(options.headers || {});
    if (token && !options.noAuth) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && !options.allow401) {
      clearAuthSession();
      setCurrentUser(null);
      showAuthOverlay();
      broadcastAuthChanged(false);
      throw new Error("unauthorized");
    }

    return response;
  }

  async function readApiErrorMessage(response, fallbackCode) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.clone().json();
      const code = body?.error || fallbackCode;
      const detailMessage =
        body?.detail?.message ||
        body?.detail ||
        body?.message ||
        "";
      message = detailMessage ? `${code}: ${detailMessage}` : code;
    } catch (_err) {
      const text = await response.clone().text().catch(() => "");
      if (text) message = text;
    }
    return message;
  }

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

  function getCurrentSchoolId() {
    return localStorage.getItem(CURRENT_SCHOOL_STORAGE_KEY) || "";
  }

  function getActiveSchools() {
    return schools.filter((school) => school.active !== false);
  }

  async function setCurrentSchoolId(nextSchoolId, options = {}) {
    const current = getCurrentSchoolId();
    const next = String(nextSchoolId || "");

    if (next) {
      localStorage.setItem(CURRENT_SCHOOL_STORAGE_KEY, next);
    } else {
      localStorage.removeItem(CURRENT_SCHOOL_STORAGE_KEY);
    }

    if (dashboardSchoolSelect) dashboardSchoolSelect.value = next;
    if (configSchoolSelect) configSchoolSelect.value = next;

    configLoaded = false;

    if (current !== next && options.dispatch !== false) {
      window.dispatchEvent(
        new CustomEvent("school:changed", {
          detail: { schoolId: next },
        })
      );
    }

    await loadTemplates();

    const configVisible = !configSection?.classList.contains("hidden");
    if (configVisible) {
      loadConfigSchedule();
    }
  }

  function setPageTitle(text) {
    if (pageEyebrow) pageEyebrow.textContent = "";
    if (pageTitle) pageTitle.textContent = text;
  }

  function switchSection(target) {
    const showDashboard = target === "dashboard";
    const showConfig = target === "config";
    const showSchools = target === "schools" && isSuperAdmin();

    dashboardSection?.classList.toggle("hidden", !showDashboard);
    configSection?.classList.toggle("hidden", !showConfig);
    schoolsSection?.classList.toggle("hidden", !showSchools);

    setNavState(navDashboard, showDashboard);
    setNavState(navConfig, showConfig);
    setNavState(navSchools, showSchools);

    if (showDashboard) setPageTitle("Sinais");
    if (showConfig) {
      setPageTitle("Configuracoes");
      if (!configLoaded) loadConfigSchedule();
    }
    if (showSchools) {
      setPageTitle("Escolas");
      renderSchoolsTable();
    }

    closeSidebarOnMobile();
  }

  function applyPermissions() {
    if (navSchools) {
      navSchools.classList.toggle("hidden", !isSuperAdmin());
    }

    if (schoolBtn) {
      schoolBtn.disabled = !isSuperAdmin();
      schoolBtn.classList.toggle("opacity-50", !isSuperAdmin());
      schoolBtn.classList.toggle("cursor-not-allowed", !isSuperAdmin());
    }

    const disableWrite = !canWrite();
    if (configBtn) {
      configBtn.disabled = disableWrite;
      configBtn.classList.toggle("opacity-50", disableWrite);
      configBtn.classList.toggle("cursor-not-allowed", disableWrite);
    }
    if (saveTemplateBtn) saveTemplateBtn.disabled = disableWrite;
    if (cloneTemplateBtn) cloneTemplateBtn.disabled = disableWrite;
    if (importBackupInput) importBackupInput.disabled = disableWrite;
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

  function openSchoolModal() {
    if (!schoolModal || !schoolModalContent) return;
    schoolModal.classList.remove("hidden");
    schoolModal.classList.add("flex");

    setTimeout(() => {
      schoolModalContent.classList.remove("scale-95", "opacity-0");
    }, 30);
  }

  function closeSchoolModal() {
    if (!schoolModal || !schoolModalContent) return;
    schoolModalContent.classList.add("scale-95", "opacity-0");
    setTimeout(() => {
      schoolModal.classList.add("hidden");
      schoolModal.classList.remove("flex");
    }, 200);
  }

  function openNewModal() {
    if (!canWrite()) {
      alert("Seu perfil e somente leitura.");
      return;
    }

    const schoolId = getCurrentSchoolId();
    if (!schoolId) {
      alert("Selecione uma escola para cadastrar horarios.");
      return;
    }
    if (!scheduleForm) return;

    scheduleForm.reset();
    if (editMode) editMode.value = "false";
    if (modalTitle) modalTitle.textContent = "Novo Horario";
    ensureDurationOption(15);
    openModal();
  }

  function openEditModal(period, signal) {
    if (!canWrite()) return;
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

  function openNewSchoolModal() {
    if (!isSuperAdmin()) {
      alert("Apenas superadmin pode gerenciar escolas.");
      return;
    }
    if (!schoolForm) return;

    schoolForm.reset();
    if (schoolEditId) schoolEditId.value = "";
    if (schoolModalTitle) schoolModalTitle.textContent = "Nova Escola";
    if (schoolTimezoneInput) schoolTimezoneInput.value = "America/Sao_Paulo";
    if (schoolActiveInput) schoolActiveInput.checked = true;
    openSchoolModal();
  }

  function openEditSchoolModal(school) {
    if (!isSuperAdmin()) return;
    if (!schoolForm) return;

    if (schoolEditId) schoolEditId.value = String(school.id);
    if (schoolNameInput) schoolNameInput.value = school.name || "";
    if (schoolSlugInput) schoolSlugInput.value = school.slug || "";
    if (schoolTimezoneInput) schoolTimezoneInput.value = school.timezone || "America/Sao_Paulo";
    if (schoolActiveInput) schoolActiveInput.checked = school.active !== false;
    if (schoolModalTitle) schoolModalTitle.textContent = "Editar Escola";

    openSchoolModal();
  }

  function buildSchoolOptions(select, selectedSchoolId) {
    if (!select) return;

    const activeSchools = getActiveSchools();
    const previous = String(selectedSchoolId || "");

    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecione a escola";
    select.appendChild(placeholder);

    activeSchools.forEach((school) => {
      const option = document.createElement("option");
      option.value = String(school.id);
      option.textContent = school.name || "Sem nome";
      option.selected = option.value === previous;
      select.appendChild(option);
    });

    select.disabled = activeSchools.length === 0;
  }

  async function syncSchoolSelectors() {
    const activeSchools = getActiveSchools();
    const current = getCurrentSchoolId();
    const hasCurrent = activeSchools.some((school) => String(school.id) === String(current));
    const next = hasCurrent ? current : activeSchools[0]?.id || "";

    buildSchoolOptions(dashboardSchoolSelect, next);
    buildSchoolOptions(configSchoolSelect, next);
    await setCurrentSchoolId(next, { dispatch: current !== String(next) });
  }

  function renderSchoolsTable() {
    if (!schoolsTableBody) return;

    if (!schools.length) {
      schoolsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="py-6 text-center text-slate-400">
            Nenhuma escola cadastrada
          </td>
        </tr>
      `;
      return;
    }

    schoolsTableBody.innerHTML = "";

    schools.forEach((school) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="px-4 py-3 font-medium">${school.name || "-"}</td>
        <td class="px-4 py-3">${school.slug || "-"}</td>
        <td class="px-4 py-3">${school.timezone || "-"}</td>
        <td class="px-4 py-3">
          <span class="rounded-full px-2 py-1 text-xs font-semibold ${
            school.active !== false
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          }">
            ${school.active !== false ? "Ativa" : "Inativa"}
          </span>
        </td>
        <td class="px-4 py-3 text-center">
          <div class="inline-flex items-center gap-3">
            <button type="button" data-action="edit" class="text-blue-600 transition hover:text-blue-800" title="Editar">
              <i class="fas fa-pen"></i>
            </button>
            <button type="button" data-action="delete" class="text-red-600 transition hover:text-red-800" title="Excluir">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;

      tr.querySelector('[data-action="edit"]')?.addEventListener("click", () => {
        openEditSchoolModal(school);
      });

      tr.querySelector('[data-action="delete"]')?.addEventListener("click", () => {
        deleteSchool(school);
      });

      schoolsTableBody.appendChild(tr);
    });
  }

  async function loadSchools() {
    if (!schoolsTableBody) return;

    schoolsTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="py-6 text-center text-slate-500">
          Carregando escolas...
        </td>
      </tr>
    `;

    try {
      const query = isSuperAdmin() ? "?includeInactive=true" : "";
      const res = await apiFetch(`${SCHOOLS_API_URL}${query}`);
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "fetch-schools-error");
        throw new Error(reason);
      }

      const data = await res.json();
      schools = Array.isArray(data) ? data : [];
      schools.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

      await syncSchoolSelectors();
      renderSchoolsTable();
    } catch (err) {
      console.error("Erro ao carregar escolas:", err);
      schools = [];
      renderSchoolsTable();
      buildSchoolOptions(dashboardSchoolSelect, "");
      buildSchoolOptions(configSchoolSelect, "");
      await setCurrentSchoolId("", { dispatch: true });
    }
  }

  async function loadTemplates() {
    if (!templateSelect) return;

    const schoolId = getCurrentSchoolId();
    if (!schoolId) {
      templateSelect.innerHTML = `<option value="">Template</option>`;
      templateSelect.disabled = true;
      templates = [];
      return;
    }

    try {
      const query = isSuperAdmin() ? `?schoolId=${encodeURIComponent(schoolId)}` : "";
      const res = await apiFetch(`${API_BASE}/templates${query}`);
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "fetch-templates-error");
        throw new Error(reason);
      }

      const data = await res.json();
      templates = Array.isArray(data) ? data : [];
      templateSelect.innerHTML = `<option value="">Template</option>`;
      templates.forEach((template) => {
        const option = document.createElement("option");
        option.value = String(template.id);
        option.textContent = template.name;
        templateSelect.appendChild(option);
      });
      templateSelect.disabled = templates.length === 0;
    } catch (err) {
      console.error("Erro ao carregar templates:", err);
      templates = [];
      templateSelect.innerHTML = `<option value="">Template</option>`;
      templateSelect.disabled = true;
    }
  }

  async function saveSchool(event) {
    event.preventDefault();
    if (!isSuperAdmin()) {
      alert("Apenas superadmin pode gerenciar escolas.");
      return;
    }
    if (!schoolNameInput || !schoolTimezoneInput || !schoolActiveInput) return;

    const editId = schoolEditId?.value || "";
    const payload = {
      name: schoolNameInput.value.trim(),
      timezone: schoolTimezoneInput.value.trim() || "America/Sao_Paulo",
      active: schoolActiveInput.checked,
    };

    const slug = schoolSlugInput?.value?.trim();
    if (slug) payload.slug = slug;

    if (!payload.name) {
      alert("Informe o nome da escola.");
      return;
    }

    const url = editId ? `${SCHOOLS_API_URL}/${editId}` : SCHOOLS_API_URL;
    const method = editId ? "PATCH" : "POST";

    try {
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "save-school-error");
        throw new Error(reason);
      }

      closeSchoolModal();
      await loadSchools();
      alert("Escola salva com sucesso.");
    } catch (err) {
      console.error("Erro ao salvar escola:", err);
      alert("Erro ao salvar escola.");
    }
  }

  async function deleteSchool(school) {
    if (!isSuperAdmin()) return;
    if (!school?.id) return;
    if (!confirm(`Excluir a escola "${school.name}"? Ela ficara inativa.`)) return;

    try {
      const res = await apiFetch(`${SCHOOLS_API_URL}/${school.id}`, { method: "DELETE" });
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "delete-school-error");
        throw new Error(reason);
      }
      await loadSchools();
      alert("Escola desativada com sucesso.");
    } catch (err) {
      console.error("Erro ao excluir escola:", err);
      alert("Erro ao excluir escola.");
    }
  }

  async function fetchScheduleBySchoolId(schoolId) {
    if (!schoolId) return null;
    const res = await apiFetch(`${SCHOOLS_API_URL}/${schoolId}/schedule`);
    if (!res.ok) {
      const reason = await readApiErrorMessage(res, "fetch-schedule-error");
      throw new Error(reason);
    }
    const data = await res.json();
    return data && typeof data === "object"
      ? data
      : { morning: [], afternoon: [], afternoonFriday: [] };
  }

  async function saveScheduleBySchoolId(schoolId, payload) {
    const res = await apiFetch(`${SCHOOLS_API_URL}/${schoolId}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const reason = await readApiErrorMessage(res, "save-schedule-error");
      throw new Error(reason);
    }
  }

  async function deleteSignal(period, time) {
    if (!canWrite()) {
      alert("Seu perfil e somente leitura.");
      return;
    }
    if (!confirm(`Remover o sinal das ${time}?`)) return;

    const schoolId = getCurrentSchoolId();
    if (!schoolId) {
      alert("Selecione uma escola.");
      return;
    }

    try {
      const data = await fetchScheduleBySchoolId(schoolId);
      if (!data) throw new Error("missing-schedule");

      data[period] = (data[period] || []).filter((item) => item.time !== time);
      await saveScheduleBySchoolId(schoolId, data);
      await loadConfigSchedule();
      window.dispatchEvent(new CustomEvent("school:changed", { detail: { schoolId } }));
    } catch (err) {
      console.error("Erro ao remover sinal:", err);
      alert("Erro ao remover horario.");
    }
  }

  async function loadConfigSchedule() {
    if (!scheduleTable) return;

    const schoolId = getCurrentSchoolId();
    if (!schoolId) {
      scheduleTable.innerHTML = `
        <tr>
          <td colspan="6" class="py-6 text-center text-slate-500">
            Selecione uma escola para ver os horarios
          </td>
        </tr>
      `;
      return;
    }

    scheduleTable.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-center text-slate-500">
          Carregando horarios...
        </td>
      </tr>
    `;

    const selectedFilter = filterPeriod?.value || "all";

    try {
      const data = await fetchScheduleBySchoolId(schoolId);
      scheduleTable.innerHTML = "";
      let hasData = false;

      Object.entries(periods).forEach(([key, label]) => {
        if (selectedFilter !== "all" && selectedFilter !== key) return;

        const list = Array.isArray(data[key]) ? data[key] : [];
        list.sort((a, b) => String(a.time).localeCompare(String(b.time)));

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
              ${
                canWrite()
                  ? `<button class="text-red-600 transition hover:text-red-800" type="button" title="Remover">
                      <i class="fas fa-trash"></i>
                    </button>`
                  : `<span class="text-xs text-slate-400">Somente leitura</span>`
              }
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
    if (!canWrite()) {
      alert("Seu perfil e somente leitura.");
      return;
    }
    if (!periodSelect || !timeInput || !nameInput || !musicSelect || !durationSelect) return;

    const schoolId = getCurrentSchoolId();
    if (!schoolId) {
      alert("Selecione uma escola.");
      return;
    }

    const isEdit = editMode?.value === "true";
    const period = periodSelect.value;
    const time = timeInput.value;
    const name = nameInput.value.trim();
    const music = musicSelect.value;
    const duration = parseInt(durationSelect.value, 10) || 15;

    if (!name) {
      alert("Informe uma descricao.");
      return;
    }

    try {
      const data = await fetchScheduleBySchoolId(schoolId);
      if (!data) throw new Error("fetch-schedule-empty");

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
        data[key].sort((a, b) => String(a.time).localeCompare(String(b.time)));
      });

      await saveScheduleBySchoolId(schoolId, data);
      closeModal();
      await loadConfigSchedule();
      window.dispatchEvent(new CustomEvent("school:changed", { detail: { schoolId } }));
    } catch (err) {
      console.error("Erro ao salvar horario:", err);
      alert("Erro ao salvar horario.");
    }
  }

  async function saveTemplateFromCurrentSchool() {
    if (!canWrite()) {
      alert("Seu perfil e somente leitura.");
      return;
    }
    const schoolId = getCurrentSchoolId();
    if (!schoolId) {
      alert("Selecione uma escola.");
      return;
    }

    const templateName = prompt("Nome do template:");
    if (!templateName) return;

    try {
      const res = await apiFetch(`${API_BASE}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          sourceSchoolId: Number(schoolId),
        }),
      });
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "save-template-error");
        throw new Error(reason);
      }
      await loadTemplates();
      alert("Template salvo com sucesso.");
    } catch (err) {
      console.error("Erro ao salvar template:", err);
      alert("Erro ao salvar template.");
    }
  }

  async function applySelectedTemplate() {
    if (!canWrite()) {
      alert("Seu perfil e somente leitura.");
      return;
    }
    const schoolId = getCurrentSchoolId();
    const templateId = templateSelect?.value;

    if (!schoolId) {
      alert("Selecione uma escola.");
      return;
    }
    if (!templateId) {
      alert("Selecione um template.");
      return;
    }

    if (!confirm("Aplicar template? Isso vai substituir os horarios atuais da escola.")) return;

    try {
      const res = await apiFetch(`${API_BASE}/templates/${templateId}/clone-to-school`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetSchoolId: Number(schoolId) }),
      });
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "apply-template-error");
        throw new Error(reason);
      }
      await loadConfigSchedule();
      window.dispatchEvent(new CustomEvent("school:changed", { detail: { schoolId } }));
      alert("Template aplicado com sucesso.");
    } catch (err) {
      console.error("Erro ao aplicar template:", err);
      alert("Erro ao aplicar template.");
    }
  }

  async function exportCurrentBackup() {
    const schoolId = getCurrentSchoolId();
    if (!schoolId) {
      alert("Selecione uma escola.");
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE}/schools/${schoolId}/backup`);
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "export-backup-error");
        throw new Error(reason);
      }

      const backup = await res.json();
      const content = JSON.stringify(backup, null, 2);
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
        now.getDate()
      ).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-escola-${schoolId}-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao exportar backup:", err);
      alert("Erro ao exportar backup.");
    }
  }

  async function importBackupFromFile(event) {
    if (!canWrite()) {
      alert("Seu perfil e somente leitura.");
      event.target.value = "";
      return;
    }

    const schoolId = getCurrentSchoolId();
    if (!schoolId) {
      alert("Selecione uma escola.");
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      if (!confirm("Importar backup? Os horarios atuais da escola serao substituidos.")) {
        event.target.value = "";
        return;
      }

      const res = await apiFetch(`${API_BASE}/schools/${schoolId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "restore-backup-error");
        throw new Error(reason);
      }

      await loadConfigSchedule();
      window.dispatchEvent(new CustomEvent("school:changed", { detail: { schoolId } }));
      alert("Backup importado com sucesso.");
    } catch (err) {
      console.error("Erro ao importar backup:", err);
      alert("Erro ao importar backup. Verifique o JSON.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    showLoginError("");

    const email = String(loginEmail?.value || "").trim().toLowerCase();
    const password = String(loginPassword?.value || "");
    if (!email || !password) {
      showLoginError("Informe email e senha.");
      return;
    }

    if (loginSubmitBtn) {
      loginSubmitBtn.disabled = true;
      loginSubmitBtn.textContent = "Entrando...";
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "login_failed");
        throw new Error(reason);
      }

      const data = await res.json();
      setAuthSession(data.token, data.user);
      setCurrentUser(data.user);
      hideAuthOverlay();
      await loadSchools();
      switchSection("dashboard");
      broadcastAuthChanged(true);
      if (loginForm) loginForm.reset();
    } catch (err) {
      console.error("Erro no login:", err);
      showLoginError("Credenciais invalidas ou usuario sem acesso.");
    } finally {
      if (loginSubmitBtn) {
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = "Entrar";
      }
    }
  }

  async function restoreSession() {
    const token = getAuthToken();
    if (!token) {
      clearAuthSession();
      setCurrentUser(null);
      showAuthOverlay();
      broadcastAuthChanged(false);
      return false;
    }

    try {
      const res = await apiFetch(`${API_BASE}/auth/me`, { allow401: true });
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "session_invalid");
        throw new Error(reason);
      }

      const data = await res.json();
      setCurrentUser(data.user);
      hideAuthOverlay();
      broadcastAuthChanged(true);
      return true;
    } catch (err) {
      console.error("Sessao invalida:", err);
      clearAuthSession();
      setCurrentUser(null);
      showAuthOverlay();
      broadcastAuthChanged(false);
      return false;
    }
  }

  async function logout() {
    clearAuthSession();
    setCurrentUser(null);
    schools = [];
    templates = [];
    renderSchoolsTable();
    if (scheduleTable) {
      scheduleTable.innerHTML = `
        <tr>
          <td colspan="6" class="py-6 text-center text-slate-500">
            Faca login para carregar horarios
          </td>
        </tr>
      `;
    }
    showAuthOverlay();
    broadcastAuthChanged(false);
  }

  function bindEvents() {
    window.apiFetch = apiFetch;
    window.getAuthToken = getAuthToken;
    window.getCurrentSchoolId = getCurrentSchoolId;
    window.isAuthenticated = () => Boolean(getAuthToken() && currentUser);

    navDashboard?.addEventListener("click", (event) => {
      event.preventDefault();
      switchSection("dashboard");
    });

    navConfig?.addEventListener("click", (event) => {
      event.preventDefault();
      switchSection("config");
    });

    navSchools?.addEventListener("click", (event) => {
      event.preventDefault();
      switchSection("schools");
    });

    dashboardSchoolSelect?.addEventListener("change", (event) => {
      setCurrentSchoolId(event.target.value);
    });

    configSchoolSelect?.addEventListener("change", (event) => {
      setCurrentSchoolId(event.target.value);
    });

    filterPeriod?.addEventListener("change", loadConfigSchedule);
    configBtn?.addEventListener("click", openNewModal);
    cancelConfigBtn?.addEventListener("click", closeModal);
    scheduleForm?.addEventListener("submit", saveSchedule);

    schoolBtn?.addEventListener("click", openNewSchoolModal);
    cancelSchoolBtn?.addEventListener("click", closeSchoolModal);
    schoolForm?.addEventListener("submit", saveSchool);

    saveTemplateBtn?.addEventListener("click", saveTemplateFromCurrentSchool);
    cloneTemplateBtn?.addEventListener("click", applySelectedTemplate);
    exportBackupBtn?.addEventListener("click", exportCurrentBackup);
    importBackupInput?.addEventListener("change", importBackupFromFile);

    loginForm?.addEventListener("submit", handleLoginSubmit);
    logoutBtn?.addEventListener("click", logout);

    modal?.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    schoolModal?.addEventListener("click", (event) => {
      if (event.target === schoolModal) closeSchoolModal();
    });
  }

  async function init() {
    bindEvents();
    updateConfigClock();
    setInterval(updateConfigClock, 1000);

    const authenticated = await restoreSession();
    if (authenticated) {
      await loadSchools();
      switchSection("dashboard");
    } else {
      switchSection("dashboard");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
