(() => {
  const API_BASE = "/api";
  const SCHOOLS_API_URL = `${API_BASE}/schools`;
  const CURRENT_SCHOOL_STORAGE_KEY = "currentSchoolId";
  const AUTH_TOKEN_STORAGE_KEY = "authToken";
  const AUTH_USER_STORAGE_KEY = "authUser";

  const ROLE_SUPERADMIN = "superadmin";
  const ROLE_ADMIN_ESCOLA = "admin_escola";
  const ROLE_SOMENTE_LEITURA = "somente_leitura";
  const PERMISSION_KEYS = {
    menus: ["dashboard", "config", "schools", "users", "audit"],
    features: [
      "dashboard_manual_play",
      "config_schedule_write",
      "config_templates",
      "config_backup_export",
      "config_backup_import",
      "config_backup_restore",
      "users_create",
      "users_edit",
      "users_disable",
      "users_reset_password",
      "audit_view",
    ],
  };
  const ROLE_PERMISSION_DEFAULTS = {
    [ROLE_SUPERADMIN]: {
      menus: {
        dashboard: true,
        config: true,
        schools: true,
        users: true,
        audit: true,
      },
      features: {
        dashboard_manual_play: true,
        config_schedule_write: true,
        config_templates: true,
        config_backup_export: true,
        config_backup_import: true,
        config_backup_restore: true,
        users_create: true,
        users_edit: true,
        users_disable: true,
        users_reset_password: true,
        audit_view: true,
      },
    },
    [ROLE_ADMIN_ESCOLA]: {
      menus: {
        dashboard: true,
        config: true,
        schools: false,
        users: true,
        audit: true,
      },
      features: {
        dashboard_manual_play: true,
        config_schedule_write: true,
        config_templates: true,
        config_backup_export: true,
        config_backup_import: true,
        config_backup_restore: true,
        users_create: true,
        users_edit: true,
        users_disable: true,
        users_reset_password: false,
        audit_view: true,
      },
    },
    [ROLE_SOMENTE_LEITURA]: {
      menus: {
        dashboard: true,
        config: true,
        schools: false,
        users: false,
        audit: true,
      },
      features: {
        dashboard_manual_play: false,
        config_schedule_write: false,
        config_templates: false,
        config_backup_export: true,
        config_backup_import: false,
        config_backup_restore: false,
        users_create: false,
        users_edit: false,
        users_disable: false,
        users_reset_password: false,
        audit_view: true,
      },
    },
  };
  const PERMISSION_LABELS = {
    menus: {
      dashboard: "Menu Dashboard",
      config: "Menu Configuracoes",
      schools: "Menu Escolas",
      users: "Menu Usuarios",
      audit: "Menu Auditoria",
    },
    features: {
      dashboard_manual_play: "Dashboard: tocar sinal manual",
      config_schedule_write: "Config: editar horarios",
      config_templates: "Config: templates",
      config_backup_export: "Config: exportar backup",
      config_backup_import: "Config: importar backup",
      config_backup_restore: "Config: restaurar backups",
      users_create: "Usuarios: criar",
      users_edit: "Usuarios: editar",
      users_disable: "Usuarios: desativar",
      users_reset_password: "Usuarios: resetar senha",
      audit_view: "Auditoria: visualizar logs",
    },
  };
  const PERMISSION_MENU_GROUPS = [
    { menu: "dashboard", features: ["dashboard_manual_play"] },
    {
      menu: "config",
      features: [
        "config_schedule_write",
        "config_templates",
        "config_backup_export",
        "config_backup_import",
        "config_backup_restore",
      ],
    },
    { menu: "schools", features: [] },
    {
      menu: "users",
      features: ["users_create", "users_edit", "users_disable", "users_reset_password"],
    },
    { menu: "audit", features: ["audit_view"] },
  ];

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
  const navUsers = document.getElementById("navUsers");
  const navAudits = document.getElementById("navAudits");
  const dashboardSection = document.getElementById("dashboardSection");
  const configSection = document.getElementById("configSection");
  const schoolsSection = document.getElementById("schoolsSection");
  const usersSection = document.getElementById("usersSection");
  const auditSection = document.getElementById("auditSection");
  const pageEyebrow = document.getElementById("pageEyebrow");
  const pageTitle = document.getElementById("pageTitle");
  const sidebar = document.getElementById("sidebar");
  const dashboardDbStatus = document.getElementById("dashboardDbStatus");
  const dashboardDbLatency = document.getElementById("dashboardDbLatency");
  const dashboardOpenAlerts = document.getElementById("dashboardOpenAlerts");
  const dashboardSchoolsWithoutSchedule = document.getElementById("dashboardSchoolsWithoutSchedule");
  const dashboardMonitorCheckedAt = document.getElementById("dashboardMonitorCheckedAt");
  const dashboardAlertList = document.getElementById("dashboardAlertList");
  const refreshDashboardMonitorBtn = document.getElementById("refreshDashboardMonitorBtn");

  const dashboardSchoolSelect = document.getElementById("dashboardSchoolSelect");
  const configSchoolSelect = document.getElementById("configSchoolSelect");
  const templateSelect = document.getElementById("templateSelect");
  const saveTemplateBtn = document.getElementById("saveTemplateBtn");
  const cloneTemplateBtn = document.getElementById("cloneTemplateBtn");
  const exportBackupBtn = document.getElementById("exportBackupBtn");
  const importBackupInput = document.getElementById("importBackupInput");
  const backupSnapshotSelect = document.getElementById("backupSnapshotSelect");
  const refreshBackupsBtn = document.getElementById("refreshBackupsBtn");
  const previewBackupBtn = document.getElementById("previewBackupBtn");
  const restoreBackupBtn = document.getElementById("restoreBackupBtn");

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

  const usersTableBody = document.getElementById("usersTableBody");
  const userBtn = document.getElementById("userBtn");
  const userModal = document.getElementById("userModal");
  const userModalContent = document.getElementById("userModalContent");
  const userModalTitle = document.getElementById("userModalTitle");
  const userForm = document.getElementById("userForm");
  const cancelUserBtn = document.getElementById("cancelUserBtn");
  const userEditId = document.getElementById("userEditId");
  const userNameInput = document.getElementById("userNameInput");
  const userEmailInput = document.getElementById("userEmailInput");
  const userPasswordInput = document.getElementById("userPasswordInput");
  const userRoleInput = document.getElementById("userRoleInput");
  const userSchoolSelect = document.getElementById("userSchoolSelect");
  const userPermissionsGrid = document.getElementById("userPermissionsGrid");
  const userActiveInput = document.getElementById("userActiveInput");

  const auditSchoolFilter = document.getElementById("auditSchoolFilter");
  const auditUserFilter = document.getElementById("auditUserFilter");
  const auditActionFilter = document.getElementById("auditActionFilter");
  const auditFromDate = document.getElementById("auditFromDate");
  const auditToDate = document.getElementById("auditToDate");
  const auditApplyFiltersBtn = document.getElementById("auditApplyFiltersBtn");
  const refreshAuditBtn = document.getElementById("refreshAuditBtn");
  const auditTableBody = document.getElementById("auditTableBody");

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
  const changePasswordBtn = document.getElementById("changePasswordBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const changePasswordModal = document.getElementById("changePasswordModal");
  const changePasswordModalContent = document.getElementById("changePasswordModalContent");
  const changePasswordForm = document.getElementById("changePasswordForm");
  const currentPasswordInput = document.getElementById("currentPasswordInput");
  const newPasswordInput = document.getElementById("newPasswordInput");
  const confirmPasswordInput = document.getElementById("confirmPasswordInput");
  const cancelChangePasswordBtn = document.getElementById("cancelChangePasswordBtn");

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
  let users = [];
  let auditLogs = [];
  let backupSnapshots = [];
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

  function isSchoolAdmin() {
    return currentUser?.role === ROLE_ADMIN_ESCOLA;
  }

  function canWrite() {
    return Boolean(currentUser) && hasPermission("features.config_schedule_write");
  }

  function canManageUsers() {
    if (!currentUser) return false;
    if (!hasPermission("menus.users")) return false;
    return (
      hasPermission("features.users_create") ||
      hasPermission("features.users_edit") ||
      hasPermission("features.users_disable") ||
      hasPermission("features.users_reset_password")
    );
  }

  function canCreateUsers() {
    return Boolean(currentUser) && hasPermission("menus.users") && hasPermission("features.users_create");
  }

  function canViewAuditLogs() {
    return Boolean(currentUser) && hasPermission("menus.audit") && hasPermission("features.audit_view");
  }

  function canAccessConfigMenu() {
    return Boolean(currentUser) && hasPermission("menus.config");
  }

  function canAccessDashboardMenu() {
    return Boolean(currentUser) && hasPermission("menus.dashboard");
  }

  function canAccessSchoolsMenu() {
    return isSuperAdmin() && hasPermission("menus.schools");
  }

  function canUseTemplates() {
    return canAccessConfigMenu() && hasPermission("features.config_templates");
  }

  function canExportBackup() {
    return canAccessConfigMenu() && hasPermission("features.config_backup_export");
  }

  function canImportBackup() {
    return canAccessConfigMenu() && hasPermission("features.config_backup_import");
  }

  function canRestoreBackups() {
    return canAccessConfigMenu() && hasPermission("features.config_backup_restore");
  }

  function buildEmptyPermissions() {
    return {
      menus: Object.fromEntries(PERMISSION_KEYS.menus.map((key) => [key, false])),
      features: Object.fromEntries(PERMISSION_KEYS.features.map((key) => [key, false])),
    };
  }

  function normalizePermissionsPayload(rawPermissions, options = {}) {
    const includeAllKeys = options.includeAllKeys === true;
    const normalized = includeAllKeys ? buildEmptyPermissions() : { menus: {}, features: {} };
    if (!rawPermissions || typeof rawPermissions !== "object") return normalized;

    const rawMenus =
      rawPermissions.menus && typeof rawPermissions.menus === "object" ? rawPermissions.menus : {};
    const rawFeatures =
      rawPermissions.features && typeof rawPermissions.features === "object"
        ? rawPermissions.features
        : {};

    PERMISSION_KEYS.menus.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(rawMenus, key)) {
        normalized.menus[key] = Boolean(rawMenus[key]);
      }
    });

    PERMISSION_KEYS.features.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(rawFeatures, key)) {
        normalized.features[key] = Boolean(rawFeatures[key]);
      }
    });

    return normalized;
  }

  function getRoleDefaultPermissions(role) {
    const defaults = ROLE_PERMISSION_DEFAULTS[role] || buildEmptyPermissions();
    return {
      menus: { ...(defaults.menus || {}) },
      features: { ...(defaults.features || {}) },
    };
  }

  function getEffectivePermissions(role, customPermissions) {
    const defaults = getRoleDefaultPermissions(role);
    const custom = normalizePermissionsPayload(customPermissions);
    const effective = buildEmptyPermissions();

    PERMISSION_KEYS.menus.forEach((key) => {
      const allowedByRole = Boolean(defaults.menus[key]);
      const explicit = custom.menus[key];
      effective.menus[key] = allowedByRole ? explicit !== false : false;
    });

    PERMISSION_KEYS.features.forEach((key) => {
      const allowedByRole = Boolean(defaults.features[key]);
      const explicit = custom.features[key];
      effective.features[key] = allowedByRole ? explicit !== false : false;
    });

    return effective;
  }

  function getCurrentEffectivePermissions() {
    if (!currentUser) return buildEmptyPermissions();
    if (
      currentUser.effectivePermissions &&
      typeof currentUser.effectivePermissions === "object"
    ) {
      return normalizePermissionsPayload(currentUser.effectivePermissions, {
        includeAllKeys: true,
      });
    }
    return getEffectivePermissions(currentUser.role, currentUser.permissions);
  }

  function hasPermission(permissionPath) {
    const [section, key] = String(permissionPath || "").split(".");
    if (!section || !key) return false;
    const effective = getCurrentEffectivePermissions();
    if (section === "menus") return Boolean(effective.menus[key]);
    if (section === "features") return Boolean(effective.features[key]);
    return false;
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
    if (
      !authUserBadge ||
      !logoutBtn ||
      !authUserName ||
      !authUserRole ||
      !authUserIcon ||
      !changePasswordBtn
    ) {
      return;
    }

    if (!currentUser) {
      authUserBadge.classList.add("hidden");
      authUserBadge.classList.remove("inline-flex");
      changePasswordBtn.classList.add("hidden");
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
    changePasswordBtn.classList.remove("hidden");
    changePasswordBtn.classList.add("inline-flex");
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
    await loadBackupSnapshots();
    await loadDashboardMonitorInfo();

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
    if (target === "dashboard" && !canAccessDashboardMenu()) target = "config";
    if (target === "config" && !canAccessConfigMenu()) target = "dashboard";
    if (target === "schools" && !canAccessSchoolsMenu()) target = "dashboard";
    if (target === "users" && !canManageUsers()) target = "dashboard";
    if (target === "audit" && !canViewAuditLogs()) target = "dashboard";

    const fallbackOrder = ["dashboard", "config", "users", "audit", "schools"];
    const isAllowedTarget = (value) =>
      (value === "dashboard" && canAccessDashboardMenu()) ||
      (value === "config" && canAccessConfigMenu()) ||
      (value === "users" && canManageUsers()) ||
      (value === "audit" && canViewAuditLogs()) ||
      (value === "schools" && canAccessSchoolsMenu());
    if (!isAllowedTarget(target)) {
      target = fallbackOrder.find((value) => isAllowedTarget(value)) || "dashboard";
    }

    const showDashboard = target === "dashboard" && canAccessDashboardMenu();
    const showConfig = target === "config" && canAccessConfigMenu();
    const showSchools = target === "schools" && canAccessSchoolsMenu();
    const showUsers = target === "users" && canManageUsers();
    const showAudit = target === "audit" && canViewAuditLogs();

    dashboardSection?.classList.toggle("hidden", !showDashboard);
    configSection?.classList.toggle("hidden", !showConfig);
    schoolsSection?.classList.toggle("hidden", !showSchools);
    usersSection?.classList.toggle("hidden", !showUsers);
    auditSection?.classList.toggle("hidden", !showAudit);

    setNavState(navDashboard, showDashboard);
    setNavState(navConfig, showConfig);
    setNavState(navSchools, showSchools);
    setNavState(navUsers, showUsers);
    setNavState(navAudits, showAudit);

    if (showDashboard) setPageTitle("Sinais");
    if (showConfig) {
      setPageTitle("Configuracoes");
      if (!configLoaded) loadConfigSchedule();
    }
    if (showSchools) {
      setPageTitle("Escolas");
      renderSchoolsTable();
    }
    if (showUsers) {
      setPageTitle("Usuarios");
      renderUsersTable();
    }
    if (showAudit) {
      setPageTitle("Auditoria");
      renderAuditTable();
      loadAuditLogs();
    }

    closeSidebarOnMobile();
  }

  function applyPermissions() {
    if (navDashboard) {
      navDashboard.classList.toggle("hidden", !canAccessDashboardMenu());
    }
    if (navConfig) {
      navConfig.classList.toggle("hidden", !canAccessConfigMenu());
    }
    if (navSchools) {
      navSchools.classList.toggle("hidden", !canAccessSchoolsMenu());
    }
    if (navUsers) {
      navUsers.classList.toggle("hidden", !canManageUsers());
    }
    if (navAudits) {
      navAudits.classList.toggle("hidden", !canViewAuditLogs());
    }

    if (schoolBtn) {
      schoolBtn.disabled = !canAccessSchoolsMenu();
      schoolBtn.classList.toggle("opacity-50", !canAccessSchoolsMenu());
      schoolBtn.classList.toggle("cursor-not-allowed", !canAccessSchoolsMenu());
    }
    if (userBtn) {
      userBtn.disabled = !canCreateUsers();
      userBtn.classList.toggle("opacity-50", !canCreateUsers());
      userBtn.classList.toggle("cursor-not-allowed", !canCreateUsers());
    }

    const disableWrite = !canWrite();
    if (configBtn) {
      configBtn.disabled = disableWrite;
      configBtn.classList.toggle("opacity-50", disableWrite);
      configBtn.classList.toggle("cursor-not-allowed", disableWrite);
    }
    if (saveTemplateBtn) saveTemplateBtn.disabled = !canUseTemplates();
    if (cloneTemplateBtn) cloneTemplateBtn.disabled = !canUseTemplates();
    if (exportBackupBtn) exportBackupBtn.disabled = !canExportBackup();
    if (importBackupInput) importBackupInput.disabled = !canImportBackup();
    if (restoreBackupBtn) restoreBackupBtn.disabled = !canRestoreBackups();
    if (previewBackupBtn) previewBackupBtn.disabled = !canExportBackup();
    if (refreshBackupsBtn) refreshBackupsBtn.disabled = !canExportBackup();
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
    if (!canAccessSchoolsMenu()) {
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
    if (!canAccessSchoolsMenu()) return;
    if (!schoolForm) return;

    if (schoolEditId) schoolEditId.value = String(school.id);
    if (schoolNameInput) schoolNameInput.value = school.name || "";
    if (schoolSlugInput) schoolSlugInput.value = school.slug || "";
    if (schoolTimezoneInput) schoolTimezoneInput.value = school.timezone || "America/Sao_Paulo";
    if (schoolActiveInput) schoolActiveInput.checked = school.active !== false;
    if (schoolModalTitle) schoolModalTitle.textContent = "Editar Escola";

    openSchoolModal();
  }

  async function redirectToSchool(school) {
    if (!school?.id) return;
    if (school.active === false) {
      alert("Esta escola esta inativa. Ative a escola para acessar configuracoes.");
      return;
    }

    await setCurrentSchoolId(String(school.id));
    switchSection("config");
  }

  function buildSchoolOptions(select, selectedSchoolId) {
    if (!select) return;

    const activeSchools = getActiveSchools();
    const previous = String(selectedSchoolId || "");
    const allowPlaceholder = isSuperAdmin();

    select.innerHTML = "";
    if (allowPlaceholder) {
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Selecione a escola";
      select.appendChild(placeholder);
    }

    activeSchools.forEach((school) => {
      const option = document.createElement("option");
      option.value = String(school.id);
      option.textContent = school.name || "Sem nome";
      option.selected = option.value === previous;
      select.appendChild(option);
    });

    select.disabled = activeSchools.length === 0 || !isSuperAdmin();
  }

  async function syncSchoolSelectors() {
    const activeSchools = getActiveSchools();
    const current = String(getCurrentSchoolId() || "");
    const lockedSchoolId = !isSuperAdmin() ? String(currentUser?.schoolId || "") : "";
    const hasCurrent = activeSchools.some((school) => String(school.id) === current);
    const hasLocked = activeSchools.some((school) => String(school.id) === lockedSchoolId);
    const next = lockedSchoolId ? (hasLocked ? lockedSchoolId : "") : hasCurrent ? current : activeSchools[0]?.id || "";

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
            <button type="button" data-action="redirect" class="text-emerald-600 transition hover:text-emerald-800" title="Acessar escola">
              <i class="fas fa-arrow-right"></i>
            </button>
            <button type="button" data-action="edit" class="text-blue-600 transition hover:text-blue-800" title="Editar">
              <i class="fas fa-pen"></i>
            </button>
            <button type="button" data-action="delete" class="text-red-600 transition hover:text-red-800" title="Excluir">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;

      tr.querySelector('[data-action="redirect"]')?.addEventListener("click", () => {
        redirectToSchool(school);
      });

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
      buildAuditSchoolFilter();
    } catch (err) {
      console.error("Erro ao carregar escolas:", err);
      schools = [];
      renderSchoolsTable();
      buildAuditSchoolFilter();
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
    if (!canAccessSchoolsMenu()) {
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
    if (!canAccessSchoolsMenu()) return;
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

  function openUserModal() {
    if (!userModal || !userModalContent) return;
    userModal.classList.remove("hidden");
    userModal.classList.add("flex");

    setTimeout(() => {
      userModalContent.classList.remove("scale-95", "opacity-0");
    }, 30);
  }

  function closeUserModal() {
    if (!userModal || !userModalContent) return;
    userModalContent.classList.add("scale-95", "opacity-0");
    setTimeout(() => {
      userModal.classList.add("hidden");
      userModal.classList.remove("flex");
    }, 200);
  }

  function openChangePasswordModal() {
    if (!changePasswordModal || !changePasswordModalContent || !changePasswordForm) return;
    changePasswordForm.reset();
    changePasswordModal.classList.remove("hidden");
    changePasswordModal.classList.add("flex");
    setTimeout(() => {
      changePasswordModalContent.classList.remove("scale-95", "opacity-0");
    }, 30);
  }

  function closeChangePasswordModal() {
    if (!changePasswordModal || !changePasswordModalContent) return;
    changePasswordModalContent.classList.add("scale-95", "opacity-0");
    setTimeout(() => {
      changePasswordModal.classList.add("hidden");
      changePasswordModal.classList.remove("flex");
    }, 200);
  }

  function buildUserRoleOptions(selectedRole = ROLE_ADMIN_ESCOLA) {
    if (!userRoleInput) return;

    const roleOptions = isSuperAdmin()
      ? [
          { value: ROLE_ADMIN_ESCOLA, label: "Admin Escola" },
          { value: ROLE_SOMENTE_LEITURA, label: "Somente Leitura" },
          { value: ROLE_SUPERADMIN, label: "Superadmin" },
        ]
      : [
          { value: ROLE_ADMIN_ESCOLA, label: "Admin Escola" },
          { value: ROLE_SOMENTE_LEITURA, label: "Somente Leitura" },
        ];

    userRoleInput.innerHTML = "";
    roleOptions.forEach((roleOption) => {
      const option = document.createElement("option");
      option.value = roleOption.value;
      option.textContent = roleOption.label;
      userRoleInput.appendChild(option);
    });

    const allowedValues = roleOptions.map((roleOption) => roleOption.value);
    userRoleInput.value = allowedValues.includes(selectedRole) ? selectedRole : allowedValues[0];
  }

  function getManagedSchools() {
    const activeSchools = getActiveSchools();
    if (isSuperAdmin()) return activeSchools;
    if (!currentUser?.schoolId) return [];
    return activeSchools.filter(
      (school) => String(school.id) === String(currentUser.schoolId)
    );
  }

  function syncUserSchoolField(selectedSchoolId = "") {
    if (!userSchoolSelect || !userRoleInput) return;

    const role = userRoleInput.value;
    const managedSchools = getManagedSchools();
    userSchoolSelect.innerHTML = "";

    if (role === ROLE_SUPERADMIN) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Nao se aplica (superadmin)";
      userSchoolSelect.appendChild(option);
      userSchoolSelect.value = "";
      userSchoolSelect.disabled = true;
      return;
    }

    if (isSuperAdmin()) {
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Selecione a escola";
      userSchoolSelect.appendChild(placeholder);
    }

    managedSchools.forEach((school) => {
      const option = document.createElement("option");
      option.value = String(school.id);
      option.textContent = school.name || "Sem nome";
      userSchoolSelect.appendChild(option);
    });

    const preferred = String(selectedSchoolId || "");
    const exists = managedSchools.some((school) => String(school.id) === preferred);
    if (exists) {
      userSchoolSelect.value = preferred;
    } else if (isSuperAdmin()) {
      userSchoolSelect.value = "";
    } else {
      userSchoolSelect.value = String(currentUser?.schoolId || "");
    }

    userSchoolSelect.disabled = isSuperAdmin() ? managedSchools.length === 0 : true;
  }

  function buildUserPermissionsGrid(role, selectedPermissions = null) {
    if (!userPermissionsGrid) return;

    const defaultsForRole = getRoleDefaultPermissions(role);
    const normalizedSelected = normalizePermissionsPayload(selectedPermissions || {});
    userPermissionsGrid.innerHTML = "";

    const selectedMenus = {};
    const menuWrapper = document.createElement("div");
    menuWrapper.className =
      "rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900";

    const menuTitle = document.createElement("p");
    menuTitle.className =
      "mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
    menuTitle.textContent = "Menus";
    menuWrapper.appendChild(menuTitle);

    const menuList = document.createElement("div");
    menuList.className = "space-y-2";

    PERMISSION_KEYS.menus.forEach((menuKey) => {
      const roleAllowsMenu = Boolean(defaultsForRole.menus[menuKey]);
      const hasCustom = Object.prototype.hasOwnProperty.call(normalizedSelected.menus, menuKey);
      const checked = roleAllowsMenu && (hasCustom ? normalizedSelected.menus[menuKey] : true);
      selectedMenus[menuKey] = checked;

      const label = document.createElement("label");
      label.className = "flex items-center gap-2 text-xs";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = `perm_menus_${menuKey}`;
      input.dataset.section = "menus";
      input.dataset.key = menuKey;
      input.dataset.roleAllowed = roleAllowsMenu ? "true" : "false";
      input.checked = checked;
      input.disabled = !roleAllowsMenu;
      input.className =
        "h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40";

      const span = document.createElement("span");
      span.textContent = PERMISSION_LABELS.menus[menuKey] || menuKey;

      label.appendChild(input);
      label.appendChild(span);
      menuList.appendChild(label);
    });

    menuWrapper.appendChild(menuList);
    userPermissionsGrid.appendChild(menuWrapper);

    const featuresWrapper = document.createElement("div");
    featuresWrapper.className =
      "rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900";

    const featuresTitle = document.createElement("p");
    featuresTitle.className =
      "mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
    featuresTitle.textContent = "Funcoes por Menu";
    featuresWrapper.appendChild(featuresTitle);

    const featuresList = document.createElement("div");
    featuresList.className = "space-y-3";

    PERMISSION_MENU_GROUPS.forEach((group) => {
      const groupBlock = document.createElement("div");
      groupBlock.className = "rounded-lg border border-slate-200/80 p-2 dark:border-slate-700/80";

      const groupTitle = document.createElement("p");
      groupTitle.className = "mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500";
      groupTitle.textContent = PERMISSION_LABELS.menus[group.menu] || group.menu;
      groupBlock.appendChild(groupTitle);

      if (!group.features.length) {
        const text = document.createElement("p");
        text.className = "text-xs text-slate-500 dark:text-slate-400";
        text.textContent = "Sem funcoes extras neste menu.";
        groupBlock.appendChild(text);
        featuresList.appendChild(groupBlock);
        return;
      }

      const featureItems = document.createElement("div");
      featureItems.className = "space-y-2";

      group.features.forEach((featureKey) => {
        const roleAllowsFeature = Boolean(defaultsForRole.features[featureKey]);
        const hasCustom = Object.prototype.hasOwnProperty.call(
          normalizedSelected.features,
          featureKey
        );
        const checkedByCustomOrDefault = hasCustom ? normalizedSelected.features[featureKey] : true;
        const checked = roleAllowsFeature && selectedMenus[group.menu] && checkedByCustomOrDefault;

        const label = document.createElement("label");
        label.className = "flex items-center gap-2 text-xs";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.id = `perm_features_${featureKey}`;
        input.dataset.section = "features";
        input.dataset.key = featureKey;
        input.dataset.roleAllowed = roleAllowsFeature ? "true" : "false";
        input.dataset.menuKey = group.menu;
        input.checked = checked;
        input.disabled = !roleAllowsFeature || !selectedMenus[group.menu];
        input.className =
          "h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40";

        const span = document.createElement("span");
        span.textContent = PERMISSION_LABELS.features[featureKey] || featureKey;

        label.appendChild(input);
        label.appendChild(span);
        featureItems.appendChild(label);
      });

      groupBlock.appendChild(featureItems);
      featuresList.appendChild(groupBlock);
    });

    featuresWrapper.appendChild(featuresList);
    userPermissionsGrid.appendChild(featuresWrapper);

    const syncFeatureAvailability = () => {
      const menuSelection = normalizePermissionsPayload(collectUserPermissionsFromForm());
      PERMISSION_MENU_GROUPS.forEach((group) => {
        const menuIsChecked = Boolean(menuSelection.menus[group.menu]);
        group.features.forEach((featureKey) => {
          const featureInput = userPermissionsGrid.querySelector(
            `input[data-section="features"][data-key="${featureKey}"]`
          );
          if (!featureInput) return;
          const roleAllows = featureInput.dataset.roleAllowed === "true";
          const enabled = roleAllows && menuIsChecked;
          if (!enabled) featureInput.checked = false;
          featureInput.disabled = !enabled;
        });
      });
    };

    userPermissionsGrid
      .querySelectorAll('input[type="checkbox"][data-section="menus"][data-key]')
      .forEach((input) => input.addEventListener("change", syncFeatureAvailability));

    syncFeatureAvailability();
  }

  function collectUserPermissionsFromForm() {
    const collected = { menus: {}, features: {} };
    if (!userPermissionsGrid) return collected;

    userPermissionsGrid
      .querySelectorAll('input[type="checkbox"][data-section][data-key]')
      .forEach((checkbox) => {
        const section = checkbox.dataset.section;
        const key = checkbox.dataset.key;
        const roleAllowed = checkbox.dataset.roleAllowed === "true";
        if (!section || !key) return;
        if (!roleAllowed) return;
        if (!Object.prototype.hasOwnProperty.call(collected, section)) return;
        collected[section][key] = Boolean(checkbox.checked);
      });

    return collected;
  }

  function openNewUserModal() {
    if (!canCreateUsers()) {
      alert("Seu perfil nao pode criar usuarios.");
      return;
    }
    if (!userForm) return;

    userForm.reset();
    if (userEditId) userEditId.value = "";
    if (userModalTitle) userModalTitle.textContent = "Novo Usuario";
    if (userPasswordInput) userPasswordInput.required = true;
    if (userActiveInput) userActiveInput.checked = true;
    buildUserRoleOptions(ROLE_ADMIN_ESCOLA);
    buildUserPermissionsGrid(ROLE_ADMIN_ESCOLA, null);
    syncUserSchoolField(String(currentUser?.schoolId || ""));
    openUserModal();
  }

  function openEditUserModal(user) {
    if (!canManageUsers()) return;
    if (!canManageTargetUser(user) || !hasPermission("features.users_edit")) {
      alert("Sem permissao para editar este usuario.");
      return;
    }
    if (!userForm) return;

    if (userEditId) userEditId.value = String(user.id);
    if (userNameInput) userNameInput.value = user.name || "";
    if (userEmailInput) userEmailInput.value = user.email || "";
    if (userPasswordInput) {
      userPasswordInput.value = "";
      userPasswordInput.required = false;
    }
    if (userActiveInput) userActiveInput.checked = user.active !== false;
    if (userModalTitle) userModalTitle.textContent = "Editar Usuario";

    buildUserRoleOptions(user.role || ROLE_ADMIN_ESCOLA);
    buildUserPermissionsGrid(user.role || ROLE_ADMIN_ESCOLA, user.permissions || null);
    syncUserSchoolField(String(user.schoolId || ""));
    openUserModal();
  }

  function getSchoolNameById(schoolId) {
    const found = schools.find((school) => String(school.id) === String(schoolId));
    return found?.name || "-";
  }

  function canManageTargetUser(user) {
    if (!currentUser || !user) return false;
    if (isSuperAdmin()) return true;
    if (!isSchoolAdmin()) return false;
    if (user.role === ROLE_SUPERADMIN) return false;
    return String(user.schoolId || "") === String(currentUser.schoolId || "");
  }

  function renderUsersTable() {
    if (!usersTableBody) return;

    if (!canManageUsers()) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-6 text-center text-slate-400">
            Sem permissao para gerenciar usuarios
          </td>
        </tr>
      `;
      return;
    }

    if (!users.length) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-6 text-center text-slate-400">
            Nenhum usuario encontrado
          </td>
        </tr>
      `;
      return;
    }

    usersTableBody.innerHTML = "";

    users.forEach((user) => {
      const tr = document.createElement("tr");
      const schoolName =
        user.schoolName || (user.schoolId ? getSchoolNameById(user.schoolId) : "Todas");
      const canManage = canManageTargetUser(user);
      const isSelf = Number(user.id) === Number(currentUser?.id);
      const canEdit = canManage && hasPermission("features.users_edit");
      const canToggleActive = canManage && hasPermission("features.users_disable") && !isSelf;
      const canResetPassword =
        canManage && hasPermission("features.users_reset_password") && isSuperAdmin() && !isSelf;
      const deactivateLabel = user.active === false ? "Reativar" : "Desativar";
      const deactivateIcon = user.active === false ? "fa-user-check" : "fa-user-slash";

      tr.innerHTML = `
        <td class="px-4 py-3 font-medium">${user.name || "-"}</td>
        <td class="px-4 py-3">${user.email || "-"}</td>
        <td class="px-4 py-3">${formatRoleLabel(user.role)}</td>
        <td class="px-4 py-3">${schoolName}</td>
        <td class="px-4 py-3">
          <span class="rounded-full px-2 py-1 text-xs font-semibold ${
            user.active !== false
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          }">
            ${user.active !== false ? "Ativo" : "Inativo"}
          </span>
        </td>
        <td class="px-4 py-3 text-center">
          <div class="inline-flex items-center gap-3">
            ${
              canEdit
                ? `<button type="button" data-action="edit" class="text-blue-600 transition hover:text-blue-800" title="Editar">
                     <i class="fas fa-pen"></i>
                   </button>`
                : `<span class="text-xs text-slate-400">Sem permissao</span>`
            }
            ${
              canToggleActive
                ? `<button type="button" data-action="toggle-active" class="text-amber-600 transition hover:text-amber-800" title="${deactivateLabel}">
                     <i class="fas ${deactivateIcon}"></i>
                   </button>`
                : ""
            }
            ${
              canResetPassword
                ? `<button type="button" data-action="reset-password" class="text-violet-600 transition hover:text-violet-800" title="Reset de senha">
                     <i class="fas fa-key"></i>
                   </button>`
                : ""
            }
          </div>
        </td>
      `;

      tr.querySelector('[data-action="edit"]')?.addEventListener("click", () => {
        openEditUserModal(user);
      });
      tr.querySelector('[data-action="toggle-active"]')?.addEventListener("click", () => {
        toggleUserActive(user);
      });
      tr.querySelector('[data-action="reset-password"]')?.addEventListener("click", () => {
        resetUserPassword(user);
      });

      usersTableBody.appendChild(tr);
    });
  }

  async function loadUsers() {
    if (!usersTableBody) return;
    if (!canManageUsers()) {
      users = [];
      renderUsersTable();
      buildAuditUserFilter();
      return;
    }

    usersTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-center text-slate-500">
          Carregando usuarios...
        </td>
      </tr>
    `;

    try {
      const res = await apiFetch(`${API_BASE}/auth/users`);
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "fetch-users-error");
        throw new Error(reason);
      }

      const data = await res.json();
      users = Array.isArray(data) ? data : [];
      users.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      renderUsersTable();
      buildAuditUserFilter();
    } catch (err) {
      console.error("Erro ao carregar usuarios:", err);
      users = [];
      buildAuditUserFilter();
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-6 text-center text-red-600">
            Erro ao carregar usuarios
          </td>
        </tr>
      `;
    }
  }

  async function saveUser(event) {
    event.preventDefault();
    if (!canManageUsers()) {
      alert("Seu perfil nao pode gerenciar usuarios.");
      return;
    }
    if (
      !userNameInput ||
      !userEmailInput ||
      !userPasswordInput ||
      !userRoleInput ||
      !userSchoolSelect ||
      !userActiveInput
    ) {
      return;
    }

    const editId = userEditId?.value || "";
    if (editId && !hasPermission("features.users_edit")) {
      alert("Seu perfil nao pode editar usuarios.");
      return;
    }
    if (!editId && !hasPermission("features.users_create")) {
      alert("Seu perfil nao pode criar usuarios.");
      return;
    }
    if (editId) {
      const currentEditUser = users.find((item) => String(item.id) === String(editId));
      if (currentEditUser && !canManageTargetUser(currentEditUser)) {
        alert("Sem permissao para editar este usuario.");
        return;
      }
    }
    const name = userNameInput.value.trim();
    const email = userEmailInput.value.trim().toLowerCase();
    const password = userPasswordInput.value;
    const role = userRoleInput.value;

    if (editId && password.trim() && !isSuperAdmin()) {
      alert("Apenas superadmin pode resetar senha de outros usuarios.");
      return;
    }

    if (!name || !email) {
      alert("Informe nome e email.");
      return;
    }

    if (!editId && password.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    const payload = {
      name,
      email,
      role,
      active: userActiveInput.checked,
    };

    if (role !== ROLE_SUPERADMIN) {
      const schoolId = isSuperAdmin()
        ? Number.parseInt(String(userSchoolSelect.value || ""), 10)
        : Number.parseInt(String(currentUser?.schoolId || ""), 10);

      if (!schoolId) {
        alert("Selecione a escola do usuario.");
        return;
      }
      payload.schoolId = schoolId;
    } else {
      payload.schoolId = null;
    }

    if (password.trim()) {
      payload.password = password;
    }
    payload.permissions = collectUserPermissionsFromForm();

    const url = editId ? `${API_BASE}/auth/users/${editId}` : `${API_BASE}/auth/users`;
    const method = editId ? "PATCH" : "POST";

    try {
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "save-user-error");
        throw new Error(reason);
      }

      closeUserModal();
      await loadUsers();
      alert("Usuario salvo com sucesso.");
    } catch (err) {
      console.error("Erro ao salvar usuario:", err);
      alert("Erro ao salvar usuario.");
    }
  }

  async function toggleUserActive(user) {
    if (!user?.id) return;
    if (!canManageTargetUser(user)) {
      alert("Sem permissao para alterar este usuario.");
      return;
    }

    const nextActive = user.active === false;
    const actionLabel = nextActive ? "reativar" : "desativar";
    if (!confirm(`Deseja ${actionLabel} o usuario "${user.name}"?`)) return;

    try {
      const endpoint = nextActive
        ? `${API_BASE}/auth/users/${user.id}`
        : `${API_BASE}/auth/users/${user.id}`;
      const method = nextActive ? "PATCH" : "DELETE";
      const payload = nextActive ? { active: true } : null;

      const res = await apiFetch(endpoint, {
        method,
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "toggle-user-error");
        throw new Error(reason);
      }

      await loadUsers();
      alert(`Usuario ${nextActive ? "reativado" : "desativado"} com sucesso.`);
    } catch (error) {
      console.error("Erro ao alterar status do usuario:", error);
      alert("Erro ao alterar status do usuario.");
    }
  }

  async function resetUserPassword(user) {
    if (!isSuperAdmin() || !user?.id) return;
    const newPassword = prompt(`Nova senha para "${user.name}":`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE}/auth/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "reset-password-error");
        throw new Error(reason);
      }
      alert("Senha resetada com sucesso.");
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      alert("Erro ao resetar senha.");
    }
  }

  function summarizeSchedule(scheduleObject) {
    const source = scheduleObject && typeof scheduleObject === "object" ? scheduleObject : {};
    return {
      morning: Array.isArray(source.morning) ? source.morning.length : 0,
      afternoon: Array.isArray(source.afternoon) ? source.afternoon.length : 0,
      afternoonFriday: Array.isArray(source.afternoonFriday) ? source.afternoonFriday.length : 0,
    };
  }

  function formatScheduleSummary(summary) {
    return `Manha: ${summary.morning} | Tarde: ${summary.afternoon} | Sexta: ${summary.afternoonFriday}`;
  }

  async function loadBackupSnapshots() {
    if (!backupSnapshotSelect) return;
    const schoolId = getCurrentSchoolId();
    backupSnapshots = [];
    backupSnapshotSelect.innerHTML = `<option value="">Backups automaticos</option>`;

    if (!schoolId) {
      if (previewBackupBtn) previewBackupBtn.disabled = true;
      if (restoreBackupBtn) restoreBackupBtn.disabled = !canWrite();
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE}/schools/${schoolId}/backups?limit=40`);
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "fetch-backups-error");
        throw new Error(reason);
      }

      const data = await res.json();
      backupSnapshots = Array.isArray(data) ? data : [];
      backupSnapshots.forEach((backup) => {
        const option = document.createElement("option");
        option.value = String(backup.id);
        const createdAt = new Date(backup.createdAt).toLocaleString("pt-BR");
        option.textContent = `${createdAt} - ${backup.trigger || "manual"} (${formatScheduleSummary(
          backup.summary || summarizeSchedule(backup.schedule || {})
        )})`;
        backupSnapshotSelect.appendChild(option);
      });
      backupSnapshotSelect.disabled = backupSnapshots.length === 0;
      if (previewBackupBtn) previewBackupBtn.disabled = backupSnapshots.length === 0;
      if (restoreBackupBtn) restoreBackupBtn.disabled = backupSnapshots.length === 0 || !canWrite();
    } catch (error) {
      console.error("Erro ao carregar backups automaticos:", error);
      backupSnapshotSelect.disabled = true;
      if (previewBackupBtn) previewBackupBtn.disabled = true;
      if (restoreBackupBtn) restoreBackupBtn.disabled = true;
    }
  }

  function getSelectedBackupId() {
    const backupId = Number.parseInt(String(backupSnapshotSelect?.value || ""), 10);
    return Number.isInteger(backupId) && backupId > 0 ? backupId : null;
  }

  async function previewSelectedBackup() {
    const schoolId = getCurrentSchoolId();
    const backupId = getSelectedBackupId();
    if (!schoolId || !backupId) {
      alert("Selecione um backup.");
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE}/schools/${schoolId}/backups/${backupId}`);
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "preview-backup-error");
        throw new Error(reason);
      }
      const backup = await res.json();
      const summary = summarizeSchedule(backup.schedule);
      const schoolName = schools.find((item) => String(item.id) === String(schoolId))?.name || schoolId;
      alert(
        `Preview do backup #${backup.id}\n\nEscola: ${schoolName}\nGerado em: ${new Date(
          backup.createdAt
        ).toLocaleString("pt-BR")}\nTipo: ${backup.trigger || "-"}\n\n${formatScheduleSummary(summary)}`
      );
    } catch (error) {
      console.error("Erro ao carregar preview do backup:", error);
      alert("Erro ao carregar preview do backup.");
    }
  }

  async function restoreSelectedBackup() {
    if (!canWrite()) {
      alert("Seu perfil e somente leitura.");
      return;
    }

    const schoolId = getCurrentSchoolId();
    const backupId = getSelectedBackupId();
    if (!schoolId || !backupId) {
      alert("Selecione um backup.");
      return;
    }

    try {
      const previewRes = await apiFetch(`${API_BASE}/schools/${schoolId}/backups/${backupId}`);
      if (!previewRes.ok) {
        const reason = await readApiErrorMessage(previewRes, "preview-backup-error");
        throw new Error(reason);
      }
      const preview = await previewRes.json();
      const summary = summarizeSchedule(preview.schedule);

      if (
        !confirm(
          `Restaurar este backup?\n\n${formatScheduleSummary(summary)}\n\nIsso vai substituir os horarios atuais.`
        )
      ) {
        return;
      }

      const restoreRes = await apiFetch(`${API_BASE}/schools/${schoolId}/restore-backup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId }),
      });
      if (!restoreRes.ok) {
        const reason = await readApiErrorMessage(restoreRes, "restore-selected-backup-error");
        throw new Error(reason);
      }

      await loadConfigSchedule();
      await loadBackupSnapshots();
      window.dispatchEvent(new CustomEvent("school:changed", { detail: { schoolId } }));
      alert("Backup restaurado com sucesso.");
    } catch (error) {
      console.error("Erro ao restaurar backup selecionado:", error);
      alert("Erro ao restaurar backup.");
    }
  }

  function buildAuditSchoolFilter() {
    if (!auditSchoolFilter) return;
    const currentValue = String(auditSchoolFilter.value || "");
    const options = isSuperAdmin()
      ? getActiveSchools()
      : getActiveSchools().filter(
          (school) => String(school.id) === String(currentUser?.schoolId || "")
        );

    auditSchoolFilter.innerHTML = `<option value="">Todas escolas</option>`;
    options.forEach((school) => {
      const option = document.createElement("option");
      option.value = String(school.id);
      option.textContent = school.name || "Sem nome";
      auditSchoolFilter.appendChild(option);
    });

    const hasCurrent = options.some((school) => String(school.id) === currentValue);
    if (hasCurrent) {
      auditSchoolFilter.value = currentValue;
    } else if (!isSuperAdmin() && currentUser?.schoolId) {
      auditSchoolFilter.value = String(currentUser.schoolId);
    } else {
      auditSchoolFilter.value = "";
    }
    auditSchoolFilter.disabled = !isSuperAdmin();
  }

  function buildAuditUserFilter() {
    if (!auditUserFilter) return;
    const previousValue = String(auditUserFilter.value || "");
    auditUserFilter.innerHTML = `<option value="">Todos usuarios</option>`;

    const sourceUsers =
      users.length > 0
        ? users
        : currentUser
          ? [
              {
                id: currentUser.id,
                name: currentUser.name || currentUser.email || "Usuario atual",
              },
            ]
          : [];

    sourceUsers.forEach((user) => {
      const option = document.createElement("option");
      option.value = String(user.id);
      option.textContent = user.name || user.email || `Usuario ${user.id}`;
      auditUserFilter.appendChild(option);
    });

    const exists = sourceUsers.some((user) => String(user.id) === previousValue);
    auditUserFilter.value = exists ? previousValue : "";
  }

  function renderAuditTable() {
    if (!auditTableBody) return;

    if (!canViewAuditLogs()) {
      auditTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-6 text-center text-slate-400">Sem permissao para visualizar auditoria</td>
        </tr>
      `;
      return;
    }

    if (!auditLogs.length) {
      auditTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-6 text-center text-slate-400">Nenhum log encontrado</td>
        </tr>
      `;
      return;
    }

    auditTableBody.innerHTML = "";
    auditLogs.forEach((log) => {
      const tr = document.createElement("tr");
      const whenText = log.createdAt ? new Date(log.createdAt).toLocaleString("pt-BR") : "-";
      const detailParts = [];
      if (log.resourceId) detailParts.push(`ID: ${log.resourceId}`);
      if (log.ip) detailParts.push(`IP: ${log.ip}`);
      if (log.meta && typeof log.meta === "object") {
        const keys = Object.keys(log.meta).slice(0, 2);
        keys.forEach((key) => detailParts.push(`${key}: ${String(log.meta[key])}`));
      }
      tr.innerHTML = `
        <td class="px-4 py-3 whitespace-nowrap">${whenText}</td>
        <td class="px-4 py-3">${log.userName || log.userId || "-"}</td>
        <td class="px-4 py-3">${log.schoolName || log.schoolId || "-"}</td>
        <td class="px-4 py-3"><code class="text-xs">${log.action || "-"}</code></td>
        <td class="px-4 py-3">${log.resource || "-"}</td>
        <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">${detailParts.join(" | ") || "-"}</td>
      `;
      auditTableBody.appendChild(tr);
    });
  }

  async function loadAuditLogs() {
    if (!auditTableBody || !canViewAuditLogs()) return;

    auditTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-center text-slate-500">Carregando logs...</td>
      </tr>
    `;

    const params = new URLSearchParams();
    params.set("limit", "200");
    if (auditSchoolFilter?.value) params.set("schoolId", auditSchoolFilter.value);
    if (auditUserFilter?.value) params.set("userId", auditUserFilter.value);
    if (auditActionFilter?.value?.trim()) params.set("action", auditActionFilter.value.trim());
    if (auditFromDate?.value) params.set("from", auditFromDate.value);
    if (auditToDate?.value) params.set("to", auditToDate.value);

    try {
      const res = await apiFetch(`${API_BASE}/audit-logs?${params.toString()}`);
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "fetch-audit-logs-error");
        throw new Error(reason);
      }
      const data = await res.json();
      auditLogs = Array.isArray(data) ? data : [];
      renderAuditTable();
    } catch (error) {
      console.error("Erro ao carregar logs de auditoria:", error);
      auditLogs = [];
      auditTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-6 text-center text-red-600">Erro ao carregar logs</td>
        </tr>
      `;
    }
  }

  async function handleChangePasswordSubmit(event) {
    event.preventDefault();
    if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) return;

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Preencha todos os campos.");
      return;
    }
    if (newPassword.length < 6) {
      alert("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("A confirmacao da senha nao confere.");
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "change-password-error");
        throw new Error(reason);
      }
      closeChangePasswordModal();
      alert("Senha alterada com sucesso.");
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      alert("Erro ao alterar senha. Verifique sua senha atual.");
    }
  }

  async function loadDashboardMonitorInfo() {
    if (!dashboardDbStatus || !dashboardDbLatency || !dashboardOpenAlerts || !dashboardAlertList) return;

    try {
      const healthRes = await fetch(`${API_BASE}/health`);
      if (!healthRes.ok) throw new Error("health-check-failed");
      const health = await healthRes.json();
      const dbStatus = health?.database?.status === "up" ? "Banco online" : "Banco indisponivel";
      dashboardDbStatus.textContent = dbStatus;
      dashboardDbStatus.className =
        health?.database?.status === "up"
          ? "mt-2 text-xl font-extrabold text-emerald-600"
          : "mt-2 text-xl font-extrabold text-rose-600";
      const latency = Number.isFinite(health?.database?.latencyMs)
        ? `${health.database.latencyMs} ms`
        : "--";
      dashboardDbLatency.textContent = `Latencia: ${latency}`;
    } catch (_error) {
      dashboardDbStatus.textContent = "Banco indisponivel";
      dashboardDbStatus.className = "mt-2 text-xl font-extrabold text-rose-600";
      dashboardDbLatency.textContent = "Latencia: --";
    }

    if (!currentUser) {
      dashboardOpenAlerts.textContent = "--";
      dashboardSchoolsWithoutSchedule.textContent = "--";
      dashboardMonitorCheckedAt.textContent = "Ultima verificacao: --";
      dashboardAlertList.innerHTML = `<li class="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">Faca login para visualizar alertas.</li>`;
      return;
    }

    try {
      const [monitorRes, alertsRes] = await Promise.all([
        apiFetch(`${API_BASE}/monitor/status`),
        apiFetch(`${API_BASE}/alerts?status=open`),
      ]);

      let monitorPayload = null;
      if (monitorRes.ok) {
        monitorPayload = await monitorRes.json();
      }

      let alerts = [];
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        alerts = Array.isArray(data) ? data : [];
      }

      dashboardOpenAlerts.textContent = String(alerts.length);
      const withoutScheduleValue = Number.isFinite(monitorPayload?.schoolsWithoutSchedule)
        ? monitorPayload.schoolsWithoutSchedule
        : alerts.filter((item) => item.type === "school_without_schedule").length;
      if (dashboardSchoolsWithoutSchedule) {
        dashboardSchoolsWithoutSchedule.textContent = String(withoutScheduleValue);
      }
      if (dashboardMonitorCheckedAt) {
        const checkedAt = monitorPayload?.checkedAt
          ? new Date(monitorPayload.checkedAt).toLocaleString("pt-BR")
          : new Date().toLocaleString("pt-BR");
        dashboardMonitorCheckedAt.textContent = `Ultima verificacao: ${checkedAt}`;
      }

      if (!alerts.length) {
        dashboardAlertList.innerHTML = `<li class="rounded-xl bg-emerald-100 px-3 py-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Nenhum alerta aberto.</li>`;
        return;
      }

      dashboardAlertList.innerHTML = "";
      alerts.slice(0, 5).forEach((alertItem) => {
        const li = document.createElement("li");
        const severityClass =
          alertItem.severity === "critical"
            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
            : alertItem.severity === "warning"
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
        li.className = `rounded-xl px-3 py-2 ${severityClass}`;
        li.textContent = `${alertItem.schoolName || "Global"}: ${alertItem.message || "-"}`;
        dashboardAlertList.appendChild(li);
      });
    } catch (error) {
      console.error("Erro ao carregar monitoramento do dashboard:", error);
      dashboardAlertList.innerHTML = `<li class="rounded-xl bg-rose-100 px-3 py-2 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">Erro ao carregar alertas.</li>`;
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
      const parsedSchedule =
        payload && typeof payload === "object" && payload.schedule ? payload.schedule : payload;
      const summary = summarizeSchedule(parsedSchedule);

      if (
        !confirm(
          `Importar backup?\n\nPreview: ${formatScheduleSummary(
            summary
          )}\n\nOs horarios atuais da escola serao substituidos.`
        )
      ) {
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
      await loadBackupSnapshots();
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
      await loadUsers();
      await loadDashboardMonitorInfo();
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
      await loadDashboardMonitorInfo();
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
    users = [];
    auditLogs = [];
    backupSnapshots = [];
    renderSchoolsTable();
    renderUsersTable();
    renderAuditTable();
    buildAuditSchoolFilter();
    buildAuditUserFilter();
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
    loadDashboardMonitorInfo();
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

    navUsers?.addEventListener("click", (event) => {
      event.preventDefault();
      switchSection("users");
    });
    navAudits?.addEventListener("click", (event) => {
      event.preventDefault();
      switchSection("audit");
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

    userBtn?.addEventListener("click", openNewUserModal);
    cancelUserBtn?.addEventListener("click", closeUserModal);
    userRoleInput?.addEventListener("change", () => {
      const snapshot = collectUserPermissionsFromForm();
      buildUserPermissionsGrid(userRoleInput?.value || ROLE_ADMIN_ESCOLA, snapshot);
      syncUserSchoolField(userSchoolSelect?.value || "");
    });
    userForm?.addEventListener("submit", saveUser);

    saveTemplateBtn?.addEventListener("click", saveTemplateFromCurrentSchool);
    cloneTemplateBtn?.addEventListener("click", applySelectedTemplate);
    exportBackupBtn?.addEventListener("click", exportCurrentBackup);
    importBackupInput?.addEventListener("change", importBackupFromFile);
    refreshBackupsBtn?.addEventListener("click", loadBackupSnapshots);
    previewBackupBtn?.addEventListener("click", previewSelectedBackup);
    restoreBackupBtn?.addEventListener("click", restoreSelectedBackup);

    auditApplyFiltersBtn?.addEventListener("click", loadAuditLogs);
    refreshAuditBtn?.addEventListener("click", loadAuditLogs);

    refreshDashboardMonitorBtn?.addEventListener("click", loadDashboardMonitorInfo);

    changePasswordBtn?.addEventListener("click", openChangePasswordModal);
    cancelChangePasswordBtn?.addEventListener("click", closeChangePasswordModal);
    changePasswordForm?.addEventListener("submit", handleChangePasswordSubmit);

    loginForm?.addEventListener("submit", handleLoginSubmit);
    logoutBtn?.addEventListener("click", logout);

    modal?.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    schoolModal?.addEventListener("click", (event) => {
      if (event.target === schoolModal) closeSchoolModal();
    });

    userModal?.addEventListener("click", (event) => {
      if (event.target === userModal) closeUserModal();
    });
    changePasswordModal?.addEventListener("click", (event) => {
      if (event.target === changePasswordModal) closeChangePasswordModal();
    });
  }

  async function init() {
    bindEvents();
    updateConfigClock();
    setInterval(updateConfigClock, 1000);
    setInterval(loadDashboardMonitorInfo, 60000);

    const authenticated = await restoreSession();
    if (authenticated) {
      await loadSchools();
      await loadUsers();
      await loadAuditLogs();
      await loadDashboardMonitorInfo();
      switchSection("dashboard");
    } else {
      await loadDashboardMonitorInfo();
      switchSection("dashboard");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
