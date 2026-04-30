(() => {
  const API_BASE = "/api";
  const SCHOOLS_API_URL = `${API_BASE}/schools`;
  const CURRENT_SCHOOL_STORAGE_KEY = "currentSchoolId";
  const AUTH_TOKEN_STORAGE_KEY = "authToken";
  const AUTH_USER_STORAGE_KEY = "authUser";
  const SIMULATION_SOURCE_TOKEN_KEY = "simulationSourceToken";
  const SIMULATION_SOURCE_USER_KEY = "simulationSourceUser";

  const ROLE_SUPERADMIN = "superadmin";
  const ROLE_ADMIN_ESCOLA = "admin_escola";
  const ROLE_SOMENTE_LEITURA = "somente_leitura";
  const PERMISSION_KEYS = {
    menus: ["dashboard", "config", "schools", "users", "audios", "audit"],
    features: [
      "dashboard_manual_section",
      "dashboard_manual_play",
      "dashboard_signal_audio",
      "dashboard_last_signal",
      "dashboard_next_signal",
      "dashboard_schedule_interface",
      "dashboard_database_status",
      "dashboard_open_alerts",
      "dashboard_schools_without_schedule",
      "dashboard_monitor_alerts",
      "dashboard_operational_history",
      "dashboard_http_metrics_view",
      "dashboard_http_metrics_filters",
      "config_schedule_write",
      "config_approve_changes",
      "config_auto_approve_changes",
      "config_templates",
      "config_backup_export",
      "config_backup_import",
      "config_backup_restore",
      "audio_manage",
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
        audios: true,
        audit: true,
      },
      features: {
        dashboard_manual_section: true,
        dashboard_manual_play: false,
        dashboard_signal_audio: true,
        dashboard_last_signal: true,
        dashboard_next_signal: true,
        dashboard_schedule_interface: true,
        dashboard_database_status: true,
        dashboard_open_alerts: true,
        dashboard_schools_without_schedule: true,
        dashboard_monitor_alerts: true,
        dashboard_operational_history: true,
        dashboard_http_metrics_view: true,
        dashboard_http_metrics_filters: true,
        config_schedule_write: true,
        config_approve_changes: true,
        config_auto_approve_changes: true,
        config_templates: true,
        config_backup_export: true,
        config_backup_import: true,
        config_backup_restore: true,
        audio_manage: true,
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
        audios: true,
        audit: true,
      },
      features: {
        dashboard_manual_section: true,
        dashboard_manual_play: true,
        dashboard_signal_audio: true,
        dashboard_last_signal: true,
        dashboard_next_signal: true,
        dashboard_schedule_interface: true,
        dashboard_database_status: true,
        dashboard_open_alerts: true,
        dashboard_schools_without_schedule: true,
        dashboard_monitor_alerts: true,
        dashboard_operational_history: false,
        dashboard_http_metrics_view: false,
        dashboard_http_metrics_filters: false,
        config_schedule_write: true,
        config_approve_changes: false,
        config_auto_approve_changes: false,
        config_templates: true,
        config_backup_export: true,
        config_backup_import: true,
        config_backup_restore: true,
        audio_manage: true,
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
        audios: false,
        audit: true,
      },
      features: {
        dashboard_manual_section: true,
        dashboard_manual_play: true,
        dashboard_signal_audio: true,
        dashboard_last_signal: true,
        dashboard_next_signal: true,
        dashboard_schedule_interface: true,
        dashboard_database_status: true,
        dashboard_open_alerts: true,
        dashboard_schools_without_schedule: true,
        dashboard_monitor_alerts: true,
        dashboard_operational_history: false,
        dashboard_http_metrics_view: false,
        dashboard_http_metrics_filters: false,
        config_schedule_write: false,
        config_approve_changes: false,
        config_auto_approve_changes: false,
        config_templates: false,
        config_backup_export: true,
        config_backup_import: false,
        config_backup_restore: false,
        audio_manage: false,
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
      audios: "Menu Audios",
      audit: "Menu Auditoria",
    },
    features: {
      dashboard_manual_section: "Dashboard: visualizar acionamento manual",
      dashboard_manual_play: "Dashboard: tocar audio manual",
      dashboard_signal_audio: "Dashboard: reproduzir audio dos sinais",
      dashboard_last_signal: "Dashboard: visualizar ultimo sinal",
      dashboard_next_signal: "Dashboard: visualizar proximo sinal",
      dashboard_schedule_interface: "Dashboard: visualizar interface de horarios",
      dashboard_database_status: "Dashboard: status do banco de dados",
      dashboard_open_alerts: "Dashboard: total de alertas",
      dashboard_schools_without_schedule: "Dashboard: escolas sem horario",
      dashboard_monitor_alerts: "Dashboard: lista de alertas de monitoramento",
      dashboard_operational_history: "Dashboard: grafico operacional",
      dashboard_http_metrics_view: "Dashboard: visualizar observabilidade HTTP",
      dashboard_http_metrics_filters: "Dashboard: filtrar observabilidade HTTP",
      config_schedule_write: "Config: editar horarios",
      config_approve_changes: "Config: aprovar mudancas de horario",
      config_auto_approve_changes: "Config: autoaprovar mudancas de horario",
      config_templates: "Config: templates",
      config_backup_export: "Config: exportar backup",
      config_backup_import: "Config: importar backup",
      config_backup_restore: "Config: restaurar backups",
      audio_manage: "Audios: gerenciar musicas",
      users_create: "Usuarios: criar",
      users_edit: "Usuarios: editar",
      users_disable: "Usuarios: desativar",
      users_reset_password: "Usuarios: resetar senha",
      audit_view: "Auditoria: visualizar logs",
    },
  };
  const PERMISSION_MENU_GROUPS = [
    {
      menu: "dashboard",
      features: [
        "dashboard_manual_section",
        "dashboard_manual_play",
        "dashboard_signal_audio",
        "dashboard_last_signal",
        "dashboard_next_signal",
        "dashboard_schedule_interface",
        "dashboard_database_status",
        "dashboard_open_alerts",
        "dashboard_schools_without_schedule",
        "dashboard_monitor_alerts",
        "dashboard_operational_history",
        "dashboard_http_metrics_view",
        "dashboard_http_metrics_filters",
      ],
    },
    {
      menu: "config",
      features: [
        "config_schedule_write",
        "config_approve_changes",
        "config_auto_approve_changes",
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
    { menu: "audios", features: ["audio_manage"] },
    { menu: "audit", features: ["audit_view"] },
  ];
  const USER_PERMISSION_PRESETS = {
    sinais: {
      label: "Sinais (Visualizacao + Audio)",
      role: ROLE_SOMENTE_LEITURA,
      permissions: {
        menus: {
          dashboard: true,
          config: false,
          schools: false,
          users: false,
          audit: false,
        },
        features: {
          dashboard_manual_section: true,
          dashboard_manual_play: true,
          dashboard_signal_audio: true,
          dashboard_last_signal: true,
          dashboard_next_signal: true,
          dashboard_schedule_interface: true,
          dashboard_database_status: false,
          dashboard_open_alerts: false,
          dashboard_schools_without_schedule: false,
          dashboard_monitor_alerts: false,
          dashboard_operational_history: false,
          dashboard_http_metrics_view: false,
          dashboard_http_metrics_filters: false,
          config_schedule_write: false,
          config_approve_changes: false,
          config_auto_approve_changes: false,
          config_templates: false,
          config_backup_export: false,
          config_backup_import: false,
          config_backup_restore: false,
          users_create: false,
          users_edit: false,
          users_disable: false,
          users_reset_password: false,
          audit_view: false,
        },
      },
    },
    ti: {
      label: "TI (Horarios + Usuarios da Escola)",
      role: ROLE_ADMIN_ESCOLA,
      permissions: {
        menus: {
          dashboard: true,
          config: true,
          schools: false,
          users: true,
          audit: true,
        },
        features: {
          dashboard_manual_section: true,
          dashboard_manual_play: true,
          dashboard_signal_audio: true,
          dashboard_last_signal: true,
          dashboard_next_signal: true,
          dashboard_schedule_interface: true,
          dashboard_database_status: true,
          dashboard_open_alerts: true,
          dashboard_schools_without_schedule: true,
          dashboard_monitor_alerts: true,
          dashboard_operational_history: false,
          dashboard_http_metrics_view: true,
          dashboard_http_metrics_filters: false,
          config_schedule_write: true,
          config_approve_changes: true,
          config_auto_approve_changes: true,
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
    },
    admin_super: {
      label: "Admin Super (Tudo Liberado)",
      role: ROLE_SUPERADMIN,
      permissions: {
        menus: {
          dashboard: true,
          config: true,
          schools: true,
          users: true,
          audit: true,
        },
        features: {
          dashboard_manual_section: true,
          dashboard_manual_play: true,
          dashboard_signal_audio: true,
          dashboard_last_signal: true,
          dashboard_next_signal: true,
          dashboard_schedule_interface: true,
          dashboard_database_status: true,
          dashboard_open_alerts: true,
          dashboard_schools_without_schedule: true,
          dashboard_monitor_alerts: true,
          dashboard_operational_history: true,
          dashboard_http_metrics_view: true,
          dashboard_http_metrics_filters: true,
          config_schedule_write: true,
          config_approve_changes: true,
          config_auto_approve_changes: true,
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
    },
  };

  const musicLabels = {};

  const navDashboard = document.getElementById("navDashboard");
  const navConfig = document.getElementById("navConfig");
  const navSchools = document.getElementById("navSchools");
  const navUsers = document.getElementById("navUsers");
  const navAudios = document.getElementById("navAudios");
  const navAudits = document.getElementById("navAudits");
  const dashboardSection = document.getElementById("dashboardSection");
  const configSection = document.getElementById("configSection");
  const schoolsSection = document.getElementById("schoolsSection");
  const usersSection = document.getElementById("usersSection");
  const audiosSection = document.getElementById("audiosSection");
  const auditSection = document.getElementById("auditSection");
  const pageEyebrow = document.getElementById("pageEyebrow");
  const pageTitle = document.getElementById("pageTitle");
  const pageTitleBlock = document.getElementById("pageTitleBlock");
  const bellIcon = document.getElementById("bellIcon");
  const countdownBadge = document.getElementById("countdownBadge");
  const sidebar = document.getElementById("sidebar");
  const dashboardManualCard = document.getElementById("dashboardManualCard");
  const dashboardLastSignalCard = document.getElementById("dashboardLastSignalCard");
  const dashboardNextSignalCard = document.getElementById("dashboardNextSignalCard");
  const dashboardScheduleSectionCard = document.getElementById("dashboardScheduleSectionCard");
  const dashboardDatabaseCard = document.getElementById("dashboardDatabaseCard");
  const dashboardOpenAlertsCard = document.getElementById("dashboardOpenAlertsCard");
  const dashboardSchoolsWithoutScheduleCard = document.getElementById("dashboardSchoolsWithoutScheduleCard");
  const dashboardMonitorAlertsCard = document.getElementById("dashboardMonitorAlertsCard");
  const dashboardDbStatus = document.getElementById("dashboardDbStatus");
  const dashboardDbLatency = document.getElementById("dashboardDbLatency");
  const dashboardOpenAlerts = document.getElementById("dashboardOpenAlerts");
  const dashboardSchoolsWithoutSchedule = document.getElementById("dashboardSchoolsWithoutSchedule");
  const dashboardMonitorCheckedAt = document.getElementById("dashboardMonitorCheckedAt");
  const dashboardAlertList = document.getElementById("dashboardAlertList");
  const refreshDashboardMonitorBtn = document.getElementById("refreshDashboardMonitorBtn");
  const dashboardManualPlayBtn = document.getElementById("btnManualPlay");
  const dashboardApiUptime = document.getElementById("dashboardApiUptime");
  const dashboardLastSweeps = document.getElementById("dashboardLastSweeps");
  const dashboardPlaybackFailures = document.getElementById("dashboardPlaybackFailures");
  const dashboardPendingApprovals = document.getElementById("dashboardPendingApprovals");
  const dashboardHttpMetricsCard = document.getElementById("dashboardHttpMetricsCard");
  const refreshHttpMetricsBtn = document.getElementById("refreshHttpMetricsBtn");
  const dashboardHttpMethodFilter = document.getElementById("dashboardHttpMethodFilter");
  const dashboardHttpWindowFilter = document.getElementById("dashboardHttpWindowFilter");
  const dashboardHttpTopNFilter = document.getElementById("dashboardHttpTopNFilter");
  const dashboardHttpTotalRequests = document.getElementById("dashboardHttpTotalRequests");
  const dashboardHttpTotalErrors = document.getElementById("dashboardHttpTotalErrors");
  const dashboardHttpTopEndpoint = document.getElementById("dashboardHttpTopEndpoint");
  const dashboardHttpLastSeen = document.getElementById("dashboardHttpLastSeen");
  const dashboardHttpMetricsBody = document.getElementById("dashboardHttpMetricsBody");
  const dashboardOperationalHistoryCard = document.getElementById("dashboardOperationalHistoryCard");
  const dashboardOperationalSchoolFilter = document.getElementById("dashboardOperationalSchoolFilter");
  const dashboardOperationalDays = document.getElementById("dashboardOperationalDays");
  const dashboardOperationalCanvas = document.getElementById("dashboardOperationalCanvas");
  const dashboardOperationalMeta = document.getElementById("dashboardOperationalMeta");

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
  const scheduleApprovalSection = document.getElementById("scheduleApprovalSection");
  const refreshScheduleRequestsBtn = document.getElementById("refreshScheduleRequestsBtn");
  const scheduleRequestsList = document.getElementById("scheduleRequestsList");

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
  const manualMusicSelect = document.getElementById("manualMusic");

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
  const userPresetSelect = document.getElementById("userPresetSelect");
  const applyUserPresetBtn = document.getElementById("applyUserPresetBtn");
  const resetUserOverridesBtn = document.getElementById("resetUserOverridesBtn");
  const userEffectivePermissionsPanel = document.getElementById("userEffectivePermissionsPanel");
  const userActiveInput = document.getElementById("userActiveInput");

  const audioForm = document.getElementById("audioForm");
  const audioFileInput = document.getElementById("audioFileInput");
  const audioFileMeta = document.getElementById("audioFileMeta");
  const audioTrackNameInput = document.getElementById("audioTrackNameInput");
  const audioClipStartInput = document.getElementById("audioClipStartInput");
  const audioClipRangeLabel = document.getElementById("audioClipRangeLabel");
  const audioTimeline = document.getElementById("audioTimeline");
  const audioWaveform = document.getElementById("audioWaveform");
  const audioClipWindow = document.getElementById("audioClipWindow");
  const audioTimelineHint = document.getElementById("audioTimelineHint");
  const previewAudioClipBtn = document.getElementById("previewAudioClipBtn");
  const saveAudioTrackBtn = document.getElementById("saveAudioTrackBtn");
  const refreshAudioTracksBtn = document.getElementById("refreshAudioTracksBtn");
  const audioTracksTableBody = document.getElementById("audioTracksTableBody");
  const audioStorageUsage = document.getElementById("audioStorageUsage");

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
  const toggleLoginPasswordBtn = document.getElementById("toggleLoginPassword");
  const authUserBadge = document.getElementById("authUserBadge");
  const authUserName = document.getElementById("authUserName");
  const authUserRole = document.getElementById("authUserRole");
  const authUserIcon = document.getElementById("authUserIcon");
  const changePasswordBtn = document.getElementById("changePasswordBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const simulationBanner = document.getElementById("simulationBanner");
  const simulationText = document.getElementById("simulationText");
  const exitSimulationBtn = document.getElementById("exitSimulationBtn");

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
  let audioTracks = [];
  let audioStorageStats = null;
  let selectedAudioFile = null;
  let selectedAudioBuffer = null;
  let previewAudioElement = null;
  let audioClipDragState = null;
  let auditLogs = [];
  let backupSnapshots = [];
  let pendingScheduleRequests = [];
  let currentUser = null;
  let dashboardMonitorLastLoadedAt = 0;
  let dashboardMonitorLastCacheKey = "";
  let dashboardMonitorInFlight = null;
  const DASHBOARD_MONITOR_AUTO_REFRESH_MS = 5 * 60 * 1000;
  const DASHBOARD_MONITOR_DEDUPE_MS = 20 * 1000;
  const feedbackUI = window.feedbackUI || {};
  const STRONG_PASSWORD_HINT =
    "A senha deve ter no minimo 10 caracteres com letra maiuscula, minuscula, numero e simbolo.";
  const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

  function isStrongPassword(value) {
    const password = String(value || "");
    return password.length >= 10 && STRONG_PASSWORD_REGEX.test(password);
  }

  function alert(message) {
    if (typeof feedbackUI.alert === "function") {
      feedbackUI.alert(message);
      return;
    }
    window.alert(message);
  }

  async function confirmAction(message, options = {}) {
    if (typeof feedbackUI.confirm === "function") {
      return feedbackUI.confirm(message, options);
    }
    return window.confirm(String(message || ""));
  }

  async function promptAction(message, options = {}) {
    if (typeof feedbackUI.prompt === "function") {
      return feedbackUI.prompt(message, options);
    }
    const fallback = window.prompt(String(message || ""));
    return fallback === null ? null : String(fallback || "").trim();
  }

  function getSchoolPublicSignalUrl(school) {
    const slug = String(school?.slug || "").trim();
    const token = String(school?.publicToken || "").trim();
    if (!slug && !token) return "";
    const friendlyName = String(slug || school?.name || "escola")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${window.location.origin}/sinal/${encodeURIComponent(friendlyName || token)}`;
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  async function copySchoolPublicSignalLink(school) {
    const url = getSchoolPublicSignalUrl(school);
    if (!url) {
      alert("Esta escola ainda nao possui link publico. Recarregue a pagina apos a migracao do banco.");
      return;
    }

    try {
      await copyTextToClipboard(url);
      alert(`Link publico copiado:\n${url}`);
    } catch (error) {
      console.error("Erro ao copiar link publico:", error);
      alert(`Nao foi possivel copiar automaticamente. Link publico:\n${url}`);
    }
  }

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
    return Boolean(currentUser) && !isSimulationActive() && hasPermission("features.config_schedule_write");
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
    return (
      Boolean(currentUser) &&
      !isSimulationActive() &&
      hasPermission("menus.users") &&
      hasPermission("features.users_create")
    );
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
    return isSuperAdmin() && !isSimulationActive() && hasPermission("menus.schools");
  }

  function canAccessAudiosMenu() {
    return Boolean(currentUser) && !isSimulationActive() && hasPermission("menus.audios");
  }

  function canManageAudioTracks() {
    return canAccessAudiosMenu() && hasPermission("features.audio_manage");
  }

  function canViewDashboardManualSection() {
    return canAccessDashboardMenu() && hasPermission("features.dashboard_manual_section");
  }

  function canUseDashboardSignalAudio() {
    return canAccessDashboardMenu() && hasPermission("features.dashboard_signal_audio");
  }

  function canPlayDashboardManualAudio() {
    return (
      canViewDashboardManualSection() &&
      canUseDashboardSignalAudio() &&
      hasPermission("features.dashboard_manual_play")
    );
  }

  function canViewDashboardLastSignal() {
    return canAccessDashboardMenu() && hasPermission("features.dashboard_last_signal");
  }

  function canViewDashboardNextSignal() {
    return canAccessDashboardMenu() && hasPermission("features.dashboard_next_signal");
  }

  function canViewDashboardScheduleInterface() {
    return canAccessDashboardMenu() && hasPermission("features.dashboard_schedule_interface");
  }

  function canViewDashboardDatabaseStatus() {
    return canAccessDashboardMenu() && hasPermission("features.dashboard_database_status");
  }

  function canViewDashboardOpenAlerts() {
    return canAccessDashboardMenu() && hasPermission("features.dashboard_open_alerts");
  }

  function canViewDashboardSchoolsWithoutSchedule() {
    return canAccessDashboardMenu() && hasPermission("features.dashboard_schools_without_schedule");
  }

  function canViewDashboardMonitorAlerts() {
    return canAccessDashboardMenu() && hasPermission("features.dashboard_monitor_alerts");
  }

  function canViewDashboardOperationalHistory() {
    return canAccessDashboardMenu() && hasPermission("features.dashboard_operational_history");
  }

  function canViewDashboardHttpMetrics() {
    return canAccessDashboardMenu() && hasPermission("features.dashboard_http_metrics_view");
  }

  function canFilterDashboardHttpMetrics() {
    return canViewDashboardHttpMetrics() && hasPermission("features.dashboard_http_metrics_filters");
  }

  function canUseTemplates() {
    return canAccessConfigMenu() && !isSimulationActive() && hasPermission("features.config_templates");
  }

  function canExportBackup() {
    return canAccessConfigMenu() && hasPermission("features.config_backup_export");
  }

  function canImportBackup() {
    return canAccessConfigMenu() && !isSimulationActive() && hasPermission("features.config_backup_import");
  }

  function canRestoreBackups() {
    return canAccessConfigMenu() && !isSimulationActive() && hasPermission("features.config_backup_restore");
  }

  function buildEmptyPermissions() {
    return {
      menus: Object.fromEntries(PERMISSION_KEYS.menus.map((key) => [key, false])),
      features: Object.fromEntries(PERMISSION_KEYS.features.map((key) => [key, false])),
    };
  }

  function hasOwn(objectValue, key) {
    return Object.prototype.hasOwnProperty.call(objectValue || {}, key);
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
      if (hasOwn(custom.menus, key)) {
        effective.menus[key] = Boolean(custom.menus[key]);
        return;
      }
      effective.menus[key] = Boolean(defaults.menus[key]);
    });

    PERMISSION_KEYS.features.forEach((key) => {
      if (hasOwn(custom.features, key)) {
        effective.features[key] = Boolean(custom.features[key]);
        return;
      }
      effective.features[key] = Boolean(defaults.features[key]);
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

  function clearAuthSession(options = {}) {
    const preserveSimulationSource = options.preserveSimulationSource === true;
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    localStorage.removeItem(CURRENT_SCHOOL_STORAGE_KEY);
    if (!preserveSimulationSource) {
      localStorage.removeItem(SIMULATION_SOURCE_TOKEN_KEY);
      localStorage.removeItem(SIMULATION_SOURCE_USER_KEY);
    }
  }

  function getSimulationSourceSession() {
    const token = localStorage.getItem(SIMULATION_SOURCE_TOKEN_KEY) || "";
    if (!token) return null;
    try {
      const userRaw = localStorage.getItem(SIMULATION_SOURCE_USER_KEY) || "{}";
      const user = JSON.parse(userRaw);
      return { token, user };
    } catch (_err) {
      return null;
    }
  }

  function setSimulationSourceSession(token, user) {
    if (!token) return;
    localStorage.setItem(SIMULATION_SOURCE_TOKEN_KEY, token);
    localStorage.setItem(SIMULATION_SOURCE_USER_KEY, JSON.stringify(user || {}));
  }

  function clearSimulationSourceSession() {
    localStorage.removeItem(SIMULATION_SOURCE_TOKEN_KEY);
    localStorage.removeItem(SIMULATION_SOURCE_USER_KEY);
  }

  function isSimulationActive() {
    return Boolean(currentUser?.simulation?.active);
  }

  function updateSimulationBanner() {
    if (!simulationBanner || !simulationText || !exitSimulationBtn) return;
    if (!isSimulationActive()) {
      simulationBanner.classList.add("hidden");
      return;
    }

    const sim = currentUser.simulation || {};
    const roleLabel = formatRoleLabel(sim.targetRole || currentUser.role);
    const schoolLabel = currentUser.schoolName || getSchoolNameById(currentUser.schoolId) || "-";
    simulationText.textContent = `Modo simulacao ativo: ${roleLabel} - ${schoolLabel}`;
    simulationBanner.classList.remove("hidden");
  }

  function setCurrentUser(user) {
    currentUser = user || null;
    window.currentUser = currentUser;
    updateUserBadge();
    updateSimulationBanner();
    syncOperationalHistorySchoolFilter();
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
    authUserRole.textContent = isSimulationActive()
      ? `${formatRoleLabel(currentUser.role)} (sim.)`
      : formatRoleLabel(currentUser.role);
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
    setTimeout(() => {
      loginEmail?.focus();
    }, 80);
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

  function setLoginLoading(isLoading) {
    if (!loginSubmitBtn) return;
    loginSubmitBtn.disabled = Boolean(isLoading);
    loginSubmitBtn.innerHTML = isLoading
      ? '<i class="fas fa-spinner animate-spin text-xs"></i><span data-login-label>Entrando...</span>'
      : '<span data-login-label>Entrar</span><i data-login-icon class="fas fa-arrow-right text-xs transition group-hover:translate-x-0.5"></i>';
  }

  function toggleLoginPasswordVisibility() {
    if (!loginPassword || !toggleLoginPasswordBtn) return;
    const shouldShow = loginPassword.type === "password";
    loginPassword.type = shouldShow ? "text" : "password";
    toggleLoginPasswordBtn.setAttribute("aria-label", shouldShow ? "Ocultar senha" : "Mostrar senha");
    toggleLoginPasswordBtn.setAttribute("title", shouldShow ? "Ocultar senha" : "Mostrar senha");
    toggleLoginPasswordBtn.innerHTML = shouldShow
      ? '<i class="fas fa-eye-slash"></i>'
      : '<i class="fas fa-eye"></i>';
    loginPassword.focus();
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

  async function startSimulationSession(payload) {
    if (!payload?.token || !payload?.user) {
      throw new Error("invalid_simulation_payload");
    }

    const previousSource = getSimulationSourceSession();
    if (!previousSource && !isSimulationActive()) {
      const token = getAuthToken();
      if (token && currentUser) {
        setSimulationSourceSession(token, currentUser);
      }
    }

    setAuthSession(payload.token, payload.user);
    setCurrentUser(payload.user);
    hideAuthOverlay();

    const targetSchoolId = payload.user?.schoolId ? String(payload.user.schoolId) : "";
    await loadSchools();
    await loadAudioTracks();
    if (targetSchoolId && String(getCurrentSchoolId() || "") !== targetSchoolId) {
      await setCurrentSchoolId(targetSchoolId, { dispatch: true });
    }
    await loadUsers();
    await loadAuditLogs();
    await loadDashboardMonitorInfo({ force: true });
    await loadConfigSchedule();
    switchSection("dashboard");
    broadcastAuthChanged(true);
  }

  async function exitSimulation() {
    const source = getSimulationSourceSession();
    if (!source?.token) {
      alert("Nao ha simulacao ativa.");
      return;
    }

    setAuthSession(source.token, source.user || {});
    clearSimulationSourceSession();

    const restored = await restoreSession();
    if (!restored) {
      alert("Nao foi possivel restaurar a sessao original.");
      return;
    }

    await loadSchools();
    await loadAudioTracks();
    await loadUsers();
    await loadAuditLogs();
    await loadDashboardMonitorInfo({ force: true });
    await loadConfigSchedule();
    switchSection("dashboard");
    broadcastAuthChanged(true);
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
    await loadScheduleChangeRequests();
    await loadDashboardMonitorInfo({ force: true });

    const configVisible = !configSection?.classList.contains("hidden");
    if (configVisible) {
      loadConfigSchedule();
    }
  }

  function setPageTitle(text) {
    if (pageEyebrow) pageEyebrow.textContent = "";
    if (pageTitle) pageTitle.textContent = text;
  }

  function applySuperadminDashboardHeaderVisibility(isDashboardActive) {
    const hideDashboardHeader = Boolean(isDashboardActive && isSuperAdmin());
    if (countdownBadge) {
      countdownBadge.classList.toggle("hidden", hideDashboardHeader);
    }
    if (bellIcon) {
      bellIcon.classList.toggle("hidden", hideDashboardHeader);
    }
    if (pageTitleBlock) {
      pageTitleBlock.classList.toggle("hidden", hideDashboardHeader);
    }
  }

  function switchSection(target) {
    if (target === "dashboard" && !canAccessDashboardMenu()) target = "config";
    if (target === "config" && !canAccessConfigMenu()) target = "dashboard";
    if (target === "schools" && !canAccessSchoolsMenu()) target = "dashboard";
    if (target === "users" && !canManageUsers()) target = "dashboard";
    if (target === "audios" && !canAccessAudiosMenu()) target = "dashboard";
    if (target === "audit" && !canViewAuditLogs()) target = "dashboard";

    const fallbackOrder = ["dashboard", "config", "audios", "users", "audit", "schools"];
    const isAllowedTarget = (value) =>
      (value === "dashboard" && canAccessDashboardMenu()) ||
      (value === "config" && canAccessConfigMenu()) ||
      (value === "users" && canManageUsers()) ||
      (value === "audios" && canAccessAudiosMenu()) ||
      (value === "audit" && canViewAuditLogs()) ||
      (value === "schools" && canAccessSchoolsMenu());
    if (!isAllowedTarget(target)) {
      target = fallbackOrder.find((value) => isAllowedTarget(value)) || "dashboard";
    }

    const showDashboard = target === "dashboard" && canAccessDashboardMenu();
    const showConfig = target === "config" && canAccessConfigMenu();
    const showSchools = target === "schools" && canAccessSchoolsMenu();
    const showUsers = target === "users" && canManageUsers();
    const showAudios = target === "audios" && canAccessAudiosMenu();
    const showAudit = target === "audit" && canViewAuditLogs();

    dashboardSection?.classList.toggle("hidden", !showDashboard);
    configSection?.classList.toggle("hidden", !showConfig);
    schoolsSection?.classList.toggle("hidden", !showSchools);
    usersSection?.classList.toggle("hidden", !showUsers);
    audiosSection?.classList.toggle("hidden", !showAudios);
    auditSection?.classList.toggle("hidden", !showAudit);

    setNavState(navDashboard, showDashboard);
    setNavState(navConfig, showConfig);
    setNavState(navSchools, showSchools);
    setNavState(navUsers, showUsers);
    setNavState(navAudios, showAudios);
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
    if (showAudios) {
      setPageTitle("Audios");
      renderAudioTracksTable();
    }
    if (showAudit) {
      setPageTitle("Auditoria");
      renderAuditTable();
      loadAuditLogs();
    }

    applySuperadminDashboardHeaderVisibility(showDashboard);

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
    if (navAudios) {
      navAudios.classList.toggle("hidden", !canAccessAudiosMenu());
    }
    if (navAudits) {
      navAudits.classList.toggle("hidden", !canViewAuditLogs());
    }
    if (dashboardManualCard) {
      dashboardManualCard.classList.toggle("hidden", !canViewDashboardManualSection());
    }
    if (dashboardLastSignalCard) {
      dashboardLastSignalCard.classList.toggle("hidden", !canViewDashboardLastSignal());
    }
    if (dashboardNextSignalCard) {
      dashboardNextSignalCard.classList.toggle("hidden", !canViewDashboardNextSignal());
    }
    if (dashboardScheduleSectionCard) {
      dashboardScheduleSectionCard.classList.toggle("hidden", !canViewDashboardScheduleInterface());
    }
    if (dashboardDatabaseCard) {
      dashboardDatabaseCard.classList.toggle("hidden", !canViewDashboardDatabaseStatus());
    }
    if (dashboardOpenAlertsCard) {
      dashboardOpenAlertsCard.classList.toggle("hidden", !canViewDashboardOpenAlerts());
    }
    if (dashboardSchoolsWithoutScheduleCard) {
      dashboardSchoolsWithoutScheduleCard.classList.toggle(
        "hidden",
        !canViewDashboardSchoolsWithoutSchedule()
      );
    }
    if (dashboardMonitorAlertsCard) {
      dashboardMonitorAlertsCard.classList.toggle("hidden", !canViewDashboardMonitorAlerts());
    }
    if (dashboardOperationalHistoryCard) {
      dashboardOperationalHistoryCard.classList.toggle("hidden", !canViewDashboardOperationalHistory());
    }
    if (dashboardHttpMetricsCard) {
      dashboardHttpMetricsCard.classList.toggle("hidden", !canViewDashboardHttpMetrics());
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
    if (dashboardManualPlayBtn) {
      const canPlayAudio = canPlayDashboardManualAudio() && getAllAudioTracks().length > 0;
      dashboardManualPlayBtn.disabled = !canPlayAudio;
      dashboardManualPlayBtn.classList.toggle("opacity-50", !canPlayAudio);
      dashboardManualPlayBtn.classList.toggle("cursor-not-allowed", !canPlayAudio);
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
    if (scheduleApprovalSection) {
      scheduleApprovalSection.classList.toggle("hidden", !canAccessConfigMenu());
    }
    if (refreshScheduleRequestsBtn) {
      refreshScheduleRequestsBtn.disabled = !canAccessConfigMenu();
    }
    if (dashboardOperationalSchoolFilter) {
      dashboardOperationalSchoolFilter.disabled = !canViewDashboardOperationalHistory();
    }
    if (dashboardOperationalDays) {
      dashboardOperationalDays.disabled = !canViewDashboardOperationalHistory();
    }
    if (refreshHttpMetricsBtn) {
      refreshHttpMetricsBtn.disabled = !canViewDashboardHttpMetrics();
    }
    if (dashboardHttpMethodFilter) {
      dashboardHttpMethodFilter.disabled = !canFilterDashboardHttpMetrics();
    }
    if (dashboardHttpWindowFilter) {
      dashboardHttpWindowFilter.disabled = !canFilterDashboardHttpMetrics();
    }
    if (dashboardHttpTopNFilter) {
      dashboardHttpTopNFilter.disabled = !canFilterDashboardHttpMetrics();
    }

    const isDashboardActive = Boolean(dashboardSection && !dashboardSection.classList.contains("hidden"));
    applySuperadminDashboardHeaderVisibility(isDashboardActive);
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

  function syncOperationalHistorySchoolFilter() {
    if (!dashboardOperationalSchoolFilter) return;

    const activeSchools = getActiveSchools();
    const previous = String(dashboardOperationalSchoolFilter.value || "");
    dashboardOperationalSchoolFilter.innerHTML = "";

    if (isSuperAdmin()) {
      const globalOption = document.createElement("option");
      globalOption.value = "";
      globalOption.textContent = "Visao global";
      dashboardOperationalSchoolFilter.appendChild(globalOption);
      activeSchools.forEach((school) => {
        const option = document.createElement("option");
        option.value = String(school.id);
        option.textContent = school.name || "Sem nome";
        dashboardOperationalSchoolFilter.appendChild(option);
      });
      const hasPrevious = Array.from(dashboardOperationalSchoolFilter.options).some(
        (opt) => opt.value === previous
      );
      dashboardOperationalSchoolFilter.value = hasPrevious ? previous : "";
      dashboardOperationalSchoolFilter.disabled = activeSchools.length === 0;
      return;
    }

    const ownSchoolId = String(currentUser?.schoolId || "");
    const school = activeSchools.find((item) => String(item.id) === ownSchoolId);
    const option = document.createElement("option");
    option.value = ownSchoolId;
    option.textContent = school?.name || "Minha escola";
    dashboardOperationalSchoolFilter.appendChild(option);
    dashboardOperationalSchoolFilter.value = ownSchoolId;
    dashboardOperationalSchoolFilter.disabled = true;
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
    syncOperationalHistorySchoolFilter();
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
            <button type="button" data-action="redirect" class="text-emerald-600 transition hover:text-emerald-800" title="Abrir configuracoes da escola">
              <i class="fas fa-arrow-right"></i>
            </button>
            <button type="button" data-action="copy-public-link" class="text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" title="Copiar link publico dos sinais">
              <i class="fas fa-link"></i>
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

      tr.querySelector('[data-action="copy-public-link"]')?.addEventListener("click", () => {
        copySchoolPublicSignalLink(school);
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
      syncOperationalHistorySchoolFilter();
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

  function getAllAudioTracks() {
    const dynamicTracks = audioTracks
      .filter((track) => track && track.active !== false && track.publicUrl)
      .map((track) => ({
        id: `audio-${track.id}`,
        name: track.name,
        value: track.publicUrl,
        url: track.publicUrl,
        active: track.active !== false,
        durationSeconds: track.durationSeconds || 20,
      }));
    return dynamicTracks;
  }

  function refreshAudioGlobals() {
    const allTracks = getAllAudioTracks();
    allTracks.forEach((track) => {
      musicLabels[track.value] = track.name;
    });
    window.audioTracks = allTracks;
    window.getAudioTrackUrl = (value) => {
      const track = getAllAudioTracks().find((item) => item.value === value);
      return track?.url || (String(value || "").startsWith("http") ? value : "");
    };
    window.getAudioTrackLabel = (value) => {
      const track = getAllAudioTracks().find((item) => item.value === value);
      return track?.name || value || "Sino Padrao";
    };
    window.dispatchEvent(new CustomEvent("audio:changed", { detail: { tracks: allTracks } }));
  }

  function populateAudioSelect(selectElement, selectedValue = "") {
    if (!selectElement) return;
    const previous = selectedValue || selectElement.value;
    selectElement.innerHTML = "";
    const tracks = getAllAudioTracks();
    if (!tracks.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Cadastre um audio";
      selectElement.appendChild(option);
      selectElement.disabled = true;
      return;
    }
    tracks.forEach((track) => {
      const option = document.createElement("option");
      option.value = track.value;
      option.textContent = track.name;
      selectElement.appendChild(option);
    });
    selectElement.disabled = false;
    if (previous && Array.from(selectElement.options).some((option) => option.value === previous)) {
      selectElement.value = previous;
    }
    if (audioFileInput) audioFileInput.disabled = !canManageAudioTracks();
    if (audioTrackNameInput) audioTrackNameInput.disabled = !canManageAudioTracks();
    if (refreshAudioTracksBtn) refreshAudioTracksBtn.disabled = !canAccessAudiosMenu();
  }

  function refreshAudioSelects() {
    populateAudioSelect(manualMusicSelect);
    populateAudioSelect(musicSelect);
    refreshAudioGlobals();
    applyPermissions();
  }

  function formatAudioSeconds(value) {
    const total = Math.max(0, Number(value) || 0);
    const minutes = Math.floor(total / 60);
    const seconds = Math.floor(total % 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function formatBytes(value) {
    const bytes = Number(value) || 0;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function renderAudioStorageUsage() {
    if (!audioStorageUsage) return;
    if (!audioStorageStats) {
      audioStorageUsage.textContent = "Uso do storage: --";
      audioStorageUsage.className =
        "mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300";
      return;
    }
    const total = Number(audioStorageStats.totalSizeBytes) || 0;
    const limit = Number(audioStorageStats.softLimitBytes) || 0;
    const pct = limit > 0 ? Math.min(999, (total / limit) * 100) : 0;
    const uploadMax = Number(audioStorageStats.uploadMaxBytes) || 0;
    audioStorageUsage.textContent = `Uso do storage: ${formatBytes(total)} de ${formatBytes(limit)} (${pct.toFixed(1)}%). Limite por upload: ${formatBytes(uploadMax)}.`;
    const warning = Boolean(audioStorageStats.warning);
    audioStorageUsage.className = warning
      ? "mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-200"
      : "mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300";
  }

  function updateAudioClipRangeLabel() {
    const start = Number.parseFloat(audioClipStartInput?.value || "0") || 0;
    const end = start + 20;
    if (audioClipRangeLabel) {
      audioClipRangeLabel.textContent = `${formatAudioSeconds(start)} - ${formatAudioSeconds(end)}`;
    }
    updateAudioClipWindowPosition();
  }

  function getAudioMaxClipStart() {
    return Number.parseFloat(audioClipStartInput?.max || "0") || 0;
  }

  function setAudioClipStart(nextStart) {
    if (!audioClipStartInput) return;
    const maxStart = getAudioMaxClipStart();
    const clamped = Math.min(Math.max(Number(nextStart) || 0, 0), maxStart);
    audioClipStartInput.value = String(clamped.toFixed(1));
    updateAudioClipRangeLabel();
  }

  function updateAudioClipWindowPosition() {
    if (!audioClipWindow || !selectedAudioBuffer) return;
    const duration = selectedAudioBuffer.duration || 20;
    const start = Number.parseFloat(audioClipStartInput?.value || "0") || 0;
    const widthPct = Math.min(100, (20 / duration) * 100);
    const leftPct = duration > 20 ? (start / duration) * 100 : 0;
    audioClipWindow.style.left = `${leftPct}%`;
    audioClipWindow.style.width = `${widthPct}%`;
    audioClipWindow.classList.remove("hidden");
    audioClipWindow.setAttribute("aria-valuemin", "0");
    audioClipWindow.setAttribute("aria-valuemax", String(getAudioMaxClipStart()));
    audioClipWindow.setAttribute("aria-valuenow", String(start));
    audioClipWindow.setAttribute("aria-valuetext", `${formatAudioSeconds(start)} ate ${formatAudioSeconds(start + 20)}`);
  }

  function renderAudioWaveform(audioBuffer) {
    if (!audioWaveform || !audioTimelineHint) return;
    audioWaveform.innerHTML = "";
    if (!audioBuffer) {
      audioTimelineHint.classList.remove("hidden");
      audioClipWindow?.classList.add("hidden");
      return;
    }

    const data = audioBuffer.getChannelData(0);
    const bars = 96;
    const samplesPerBar = Math.max(1, Math.floor(data.length / bars));
    for (let index = 0; index < bars; index += 1) {
      let sum = 0;
      const start = index * samplesPerBar;
      const end = Math.min(data.length, start + samplesPerBar);
      for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
        sum += Math.abs(data[sampleIndex] || 0);
      }
      const avg = sum / Math.max(1, end - start);
      const height = Math.max(10, Math.min(100, avg * 260));
      const bar = document.createElement("div");
      bar.className = "audio-waveform-bar flex-1 rounded-full bg-slate-500 dark:bg-slate-300";
      bar.style.height = `${height}%`;
      audioWaveform.appendChild(bar);
    }
    audioTimelineHint.classList.add("hidden");
    updateAudioClipWindowPosition();
  }

  function getAudioStartFromTimelineEvent(event, dragOffsetPx = 0) {
    if (!audioTimeline || !selectedAudioBuffer) return 0;
    const rect = audioTimeline.getBoundingClientRect();
    const duration = selectedAudioBuffer.duration || 20;
    const clipWidthPx = rect.width * Math.min(1, 20 / duration);
    const rawLeft = event.clientX - rect.left - dragOffsetPx;
    const maxLeft = Math.max(0, rect.width - clipWidthPx);
    const clampedLeft = Math.min(Math.max(rawLeft, 0), maxLeft);
    return maxLeft > 0 ? (clampedLeft / maxLeft) * getAudioMaxClipStart() : 0;
  }

  function beginAudioClipDrag(event) {
    if (!selectedAudioBuffer || !audioClipWindow) return;
    event.preventDefault();
    const windowRect = audioClipWindow.getBoundingClientRect();
    audioClipDragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - windowRect.left,
    };
    audioClipWindow.setPointerCapture?.(event.pointerId);
  }

  function moveAudioClipDrag(event) {
    if (!audioClipDragState) return;
    setAudioClipStart(getAudioStartFromTimelineEvent(event, audioClipDragState.offsetX));
  }

  function endAudioClipDrag(event) {
    if (!audioClipDragState) return;
    audioClipWindow?.releasePointerCapture?.(event.pointerId);
    audioClipDragState = null;
  }

  function handleAudioTimelineClick(event) {
    if (!selectedAudioBuffer || event.target === audioClipWindow || audioClipWindow?.contains(event.target)) {
      return;
    }
    if (!audioTimeline || !selectedAudioBuffer) return;
    const rect = audioTimeline.getBoundingClientRect();
    const duration = selectedAudioBuffer.duration || 20;
    const clipWidthPx = rect.width * Math.min(1, 20 / duration);
    setAudioClipStart(getAudioStartFromTimelineEvent(event, clipWidthPx / 2));
  }

  function handleAudioClipKeyboard(event) {
    if (!selectedAudioBuffer) return;
    const current = Number.parseFloat(audioClipStartInput?.value || "0") || 0;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setAudioClipStart(current - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setAudioClipStart(current + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setAudioClipStart(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setAudioClipStart(getAudioMaxClipStart());
    }
  }

  function resetAudioFormState() {
    selectedAudioFile = null;
    selectedAudioBuffer = null;
    if (previewAudioElement) {
      previewAudioElement.pause();
      previewAudioElement = null;
    }
    if (audioFileMeta) audioFileMeta.textContent = "Nenhum arquivo selecionado.";
    if (audioClipStartInput) {
      audioClipStartInput.value = "0";
      audioClipStartInput.max = "0";
      audioClipStartInput.disabled = true;
    }
    renderAudioWaveform(null);
    if (previewAudioClipBtn) previewAudioClipBtn.disabled = true;
    if (saveAudioTrackBtn) saveAudioTrackBtn.disabled = true;
    updateAudioClipRangeLabel();
  }

  async function decodeSelectedAudioFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) throw new Error("audio_context_unavailable");
    const context = new AudioContextCtor();
    try {
      return await context.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      if (typeof context.close === "function") context.close();
    }
  }

  function encodeAudioBufferToWav(audioBuffer, startSeconds, durationSeconds = 20) {
    const sampleRate = audioBuffer.sampleRate;
    const channels = Math.min(2, audioBuffer.numberOfChannels || 1);
    const startFrame = Math.max(0, Math.floor(startSeconds * sampleRate));
    const frameCount = Math.min(
      Math.floor(durationSeconds * sampleRate),
      Math.max(0, audioBuffer.length - startFrame)
    );
    const fadeOutFrames = Math.min(frameCount, Math.floor(4 * sampleRate));
    const bytesPerSample = 2;
    const blockAlign = channels * bytesPerSample;
    const dataSize = frameCount * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    let offset = 0;
    const writeString = (value) => {
      for (let i = 0; i < value.length; i += 1) {
        view.setUint8(offset + i, value.charCodeAt(i));
      }
      offset += value.length;
    };
    writeString("RIFF");
    view.setUint32(offset, 36 + dataSize, true);
    offset += 4;
    writeString("WAVE");
    writeString("fmt ");
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, channels, true);
    offset += 2;
    view.setUint32(offset, sampleRate, true);
    offset += 4;
    view.setUint32(offset, sampleRate * blockAlign, true);
    offset += 4;
    view.setUint16(offset, blockAlign, true);
    offset += 2;
    view.setUint16(offset, 16, true);
    offset += 2;
    writeString("data");
    view.setUint32(offset, dataSize, true);
    offset += 4;

    const channelData = Array.from({ length: channels }, (_, index) =>
      audioBuffer.getChannelData(Math.min(index, audioBuffer.numberOfChannels - 1))
    );
    for (let frame = 0; frame < frameCount; frame += 1) {
      const fadeMultiplier =
        fadeOutFrames > 0 && frame >= frameCount - fadeOutFrames
          ? Math.sin(Math.max(0, (frameCount - frame) / fadeOutFrames) * (Math.PI / 2))
          : 1;
      for (let channel = 0; channel < channels; channel += 1) {
        const sample = Math.max(
          -1,
          Math.min(1, (channelData[channel][startFrame + frame] || 0) * fadeMultiplier)
        );
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: "audio/wav" });
  }

  async function blobToBase64(blob) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return dataUrl.split(",")[1] || "";
  }

  async function loadAudioTracks() {
    refreshAudioSelects();
    if (!currentUser) return;
    try {
      const query = canManageAudioTracks() ? "?includeInactive=true" : "";
      const [tracksRes, statsRes] = await Promise.all([
        apiFetch(`${API_BASE}/audio-tracks${query}`),
        canManageAudioTracks()
          ? apiFetch(`${API_BASE}/audio-tracks/stats`)
          : Promise.resolve(null),
      ]);
      if (!tracksRes.ok) {
        const reason = await readApiErrorMessage(tracksRes, "fetch-audio-tracks-error");
        throw new Error(reason);
      }
      if (statsRes && statsRes.ok) {
        audioStorageStats = await statsRes.json();
      } else {
        audioStorageStats = null;
      }
      const data = await tracksRes.json();
      audioTracks = Array.isArray(data) ? data : [];
      refreshAudioSelects();
      renderAudioStorageUsage();
      renderAudioTracksTable();
    } catch (error) {
      console.error("Erro ao carregar audios:", error);
      renderAudioStorageUsage();
      renderAudioTracksTable("Erro ao carregar audios.");
    }
  }

  function renderAudioTracksTable(message = "") {
    if (!audioTracksTableBody) return;
    if (!canAccessAudiosMenu()) {
      audioTracksTableBody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-500">Sem permissao para gerenciar audios.</td></tr>`;
      return;
    }
    if (message) {
      audioTracksTableBody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-500">${message}</td></tr>`;
      return;
    }
    if (!audioTracks.length) {
      audioTracksTableBody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-500">Nenhum audio cadastrado.</td></tr>`;
      return;
    }
    audioTracksTableBody.innerHTML = "";
    audioTracks.forEach((track) => {
      const tr = document.createElement("tr");
      tr.className = "text-slate-700 dark:text-slate-200";
      tr.innerHTML = `
        <td class="py-3 pr-4 font-semibold">${track.name || "-"}</td>
        <td class="py-3 pr-4">${track.durationSeconds || 20}s<br><span class="text-xs text-slate-500">${formatBytes(track.sizeBytes)}</span></td>
        <td class="py-3 pr-4">${track.active === false ? "Inativo" : "Ativo"}</td>
        <td class="py-3 text-right">
          <button type="button" data-action="play" class="mr-2 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            <i class="fas fa-play"></i>
          </button>
          <button type="button" data-action="toggle" class="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            ${track.active === false ? "Ativar" : "Desativar"}
          </button>
          <button type="button" data-action="delete-permanent" class="ml-2 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/20">
            Excluir definitivo
          </button>
        </td>
      `;
      tr.querySelector('[data-action="play"]')?.addEventListener("click", () => {
        const audio = new Audio(track.publicUrl);
        audio.play().catch((error) => {
          console.error("Erro ao tocar audio cadastrado:", error);
          alert("Nao foi possivel tocar esse audio. Verifique se o bucket esta publico.");
        });
      });
      tr.querySelector('[data-action="toggle"]')?.addEventListener("click", () => {
        updateAudioTrackStatus(track, track.active === false);
      });
      tr.querySelector('[data-action="delete-permanent"]')?.addEventListener("click", () => {
        deleteAudioTrackPermanently(track);
      });
      audioTracksTableBody.appendChild(tr);
    });
  }

  async function handleAudioFileSelected() {
    const file = audioFileInput?.files?.[0];
    resetAudioFormState();
    if (!file) return;
    selectedAudioFile = file;
    try {
      selectedAudioBuffer = await decodeSelectedAudioFile(file);
      const duration = selectedAudioBuffer.duration || 0;
      if (duration < 20) {
        alert("O audio precisa ter pelo menos 20 segundos.");
        resetAudioFormState();
        return;
      }
      const maxStart = Math.max(0, duration - 20);
      if (audioFileMeta) {
        audioFileMeta.textContent = `${file.name} | ${formatAudioSeconds(duration)} | trecho de 20s`;
      }
      if (audioClipStartInput) {
        audioClipStartInput.max = String(maxStart.toFixed(1));
        audioClipStartInput.value = "0";
        audioClipStartInput.disabled = maxStart <= 0;
      }
      renderAudioWaveform(selectedAudioBuffer);
      if (previewAudioClipBtn) previewAudioClipBtn.disabled = false;
      if (saveAudioTrackBtn) saveAudioTrackBtn.disabled = false;
      if (audioTrackNameInput && !audioTrackNameInput.value.trim()) {
        audioTrackNameInput.value = file.name.replace(/\.[^.]+$/, "");
      }
      updateAudioClipRangeLabel();
    } catch (error) {
      console.error("Erro ao preparar audio:", error);
      alert("Nao foi possivel ler esse arquivo de audio.");
      resetAudioFormState();
    }
  }

  function previewSelectedAudioClip() {
    if (!selectedAudioBuffer) return;
    const start = Number.parseFloat(audioClipStartInput?.value || "0") || 0;
    const clipBlob = encodeAudioBufferToWav(selectedAudioBuffer, start, 20);
    const url = URL.createObjectURL(clipBlob);
    if (previewAudioElement) previewAudioElement.pause();
    previewAudioElement = new Audio(url);
    previewAudioElement.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
    previewAudioElement.play();
  }

  async function saveAudioTrack(event) {
    event.preventDefault();
    if (!canManageAudioTracks()) {
      alert("Sem permissao para gerenciar audios.");
      return;
    }
    if (!selectedAudioBuffer || !selectedAudioFile) {
      alert("Selecione um arquivo de audio.");
      return;
    }
    const name = String(audioTrackNameInput?.value || "").trim();
    if (!name) {
      alert("Informe o nome da musica.");
      return;
    }
    const start = Number.parseFloat(audioClipStartInput?.value || "0") || 0;
      const clipBlob = encodeAudioBufferToWav(selectedAudioBuffer, start, 20);
      const uploadLimit = Number(audioStorageStats?.uploadMaxBytes) || 3 * 1024 * 1024;
      if (clipBlob.size > uploadLimit) {
        alert(`O trecho ficou com ${formatBytes(clipBlob.size)}. O limite por upload e ${formatBytes(uploadLimit)}.`);
        return;
      }
      const audioBase64 = await blobToBase64(clipBlob);
    if (saveAudioTrackBtn) {
      saveAudioTrackBtn.disabled = true;
      saveAudioTrackBtn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> Salvando...';
    }
    try {
      const res = await apiFetch(`${API_BASE}/audio-tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          audioBase64,
          mimeType: "audio/wav",
          durationSeconds: 20,
          originalFileName: selectedAudioFile.name,
        }),
      });
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "save-audio-track-error");
        throw new Error(reason);
      }
      alert("Audio salvo com sucesso.");
      audioForm?.reset();
      resetAudioFormState();
      await loadAudioTracks();
    } catch (error) {
      console.error("Erro ao salvar audio:", error);
      alert("Erro ao salvar audio. Confira a configuracao do Supabase Storage.");
    } finally {
      if (saveAudioTrackBtn) {
        saveAudioTrackBtn.innerHTML = '<i class="fas fa-save"></i> Salvar audio';
        saveAudioTrackBtn.disabled = !selectedAudioBuffer;
      }
    }
  }

  async function updateAudioTrackStatus(track, active) {
    try {
      const res = await apiFetch(`${API_BASE}/audio-tracks/${track.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "update-audio-track-error");
        throw new Error(reason);
      }
      await loadAudioTracks();
    } catch (error) {
      console.error("Erro ao atualizar audio:", error);
      alert("Erro ao atualizar audio.");
    }
  }

  async function deleteAudioTrackPermanently(track) {
    if (!track?.id) return;
    const confirmed = await confirmAction(
      `Excluir definitivamente "${track.name}"? O arquivo sera removido do Supabase Storage se nao estiver em uso.`,
      {
        title: "Excluir audio definitivo",
        confirmLabel: "Excluir definitivo",
        cancelLabel: "Cancelar",
      }
    );
    if (!confirmed) return;

    try {
      const res = await apiFetch(`${API_BASE}/audio-tracks/${track.id}/permanent`, {
        method: "DELETE",
      });
      if (res.status === 409) {
        const payload = await res.json().catch(() => ({}));
        alert(`Este audio esta em uso em ${payload.usageCount || 1} horario(s). Remova dos horarios antes de excluir.`);
        return;
      }
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "delete-audio-track-error");
        throw new Error(reason);
      }
      alert("Audio excluido definitivamente.");
      await loadAudioTracks();
    } catch (error) {
      console.error("Erro ao excluir audio definitivo:", error);
      alert("Erro ao excluir audio definitivamente.");
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
    if (!(await confirmAction(`Excluir a escola "${school.name}"? Ela ficara inativa.`, {
      title: "Excluir escola",
      danger: true,
      confirmText: "Excluir",
    }))) {
      return;
    }

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

  function populateUserPresetOptions() {
    if (!userPresetSelect) return;
    const current = userPresetSelect.value || "";
    userPresetSelect.innerHTML = `<option value="">Preset de permissao</option>`;
    Object.entries(USER_PERMISSION_PRESETS).forEach(([key, preset]) => {
      if (!isSuperAdmin() && preset.role === ROLE_SUPERADMIN) return;
      const option = document.createElement("option");
      option.value = key;
      option.textContent = preset.label;
      userPresetSelect.appendChild(option);
    });
    userPresetSelect.value = current;
  }

  function applyUserPreset() {
    if (!userPresetSelect || !userRoleInput) return;
    const presetKey = userPresetSelect.value;
    if (!presetKey) {
      alert("Selecione um preset.");
      return;
    }

    const preset = USER_PERMISSION_PRESETS[presetKey];
    if (!preset) {
      alert("Preset invalido.");
      return;
    }

    const nextRole = preset.role || ROLE_ADMIN_ESCOLA;
    if (userRoleInput) {
      const allowedRoles = Array.from(userRoleInput.options).map((option) => option.value);
      if (!allowedRoles.includes(nextRole)) {
        alert("Seu perfil nao pode aplicar este preset de role.");
        return;
      }
      userRoleInput.value = nextRole;
    }

    buildUserPermissionsGrid(nextRole, preset.permissions || {});
    syncUserSchoolField(userSchoolSelect?.value || "");
    renderEffectivePermissionsPreview(nextRole);
  }

  function resetUserOverridesToProfileDefaults() {
    if (!userRoleInput) return;
    buildUserPermissionsGrid(userRoleInput.value || ROLE_ADMIN_ESCOLA, {});
    renderEffectivePermissionsPreview(userRoleInput.value || ROLE_ADMIN_ESCOLA);
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

    const buildPermissionRow = (
      section,
      key,
      labelText,
      defaultValue,
      selectedValue,
      compact = false
    ) => {
      const row = document.createElement("div");
      row.className = compact
        ? "flex flex-col gap-2 rounded-lg border border-slate-200/70 bg-white/80 p-2 dark:border-slate-700/80 dark:bg-slate-900/30 md:flex-row md:items-center md:justify-between"
        : "flex flex-col gap-2 rounded-lg border border-slate-200/80 bg-white/70 p-2 dark:border-slate-700/80 dark:bg-slate-900/40 md:flex-row md:items-center md:justify-between";

      const label = document.createElement("span");
      label.className = "text-xs";
      label.textContent = labelText;

      const select = document.createElement("select");
      select.dataset.permMode = "true";
      select.dataset.section = section;
      select.dataset.key = key;
      select.dataset.default = defaultValue ? "true" : "false";
      select.className =
        "rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800";

      const defaultLabel = defaultValue ? "Permitido" : "Bloqueado";
      const options = [
        { value: "inherit", text: `Padrao do perfil (${defaultLabel})` },
        { value: "allow", text: "Permitir" },
        { value: "deny", text: "Bloquear" },
      ];
      options.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.text;
        select.appendChild(option);
      });

      if (selectedValue === true) {
        select.value = "allow";
      } else if (selectedValue === false) {
        select.value = "deny";
      } else {
        select.value = "inherit";
      }

      row.appendChild(label);
      row.appendChild(select);
      return { row, select };
    };

    const resolvePermissionSelectValue = (select) => {
      if (!select) return false;
      if (select.value === "allow") return true;
      if (select.value === "deny") return false;
      return select.dataset.default === "true";
    };

    const menuSelectByKey = new Map();
    const featureGroupUiByMenu = new Map();

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
      const selectedValue = hasOwn(normalizedSelected.menus, menuKey)
        ? Boolean(normalizedSelected.menus[menuKey])
        : null;
      const { row, select } = buildPermissionRow(
        "menus",
        menuKey,
        PERMISSION_LABELS.menus[menuKey] || menuKey,
        Boolean(defaultsForRole.menus[menuKey]),
        selectedValue
      );
      row.dataset.menuKey = menuKey;
      select.dataset.menuKey = menuKey;
      menuSelectByKey.set(menuKey, select);
      menuList.appendChild(row);
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
    const featuresHint = document.createElement("p");
    featuresHint.className = "mb-3 text-[11px] text-slate-500 dark:text-slate-400";
    featuresHint.textContent =
      "Use os blocos abaixo para abrir apenas os menus que voce quer configurar.";
    featuresWrapper.appendChild(featuresHint);
    const featuresList = document.createElement("div");
    featuresList.className = "space-y-3";

    PERMISSION_MENU_GROUPS.forEach((group) => {
      const groupBlock = document.createElement("details");
      groupBlock.className =
        "group overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/70 dark:border-slate-700/80 dark:bg-slate-900/40";
      groupBlock.dataset.menuGroup = group.menu;

      const summary = document.createElement("summary");
      summary.className =
        "flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5";

      const summaryLabel = document.createElement("div");
      const groupTitle = document.createElement("p");
      groupTitle.className = "text-xs font-semibold text-slate-700 dark:text-slate-200";
      groupTitle.textContent = PERMISSION_LABELS.menus[group.menu] || group.menu;
      const groupMeta = document.createElement("p");
      groupMeta.className = "text-[11px] text-slate-500 dark:text-slate-400";
      groupMeta.textContent = `${group.features.length} funcao(oes)`;
      summaryLabel.appendChild(groupTitle);
      summaryLabel.appendChild(groupMeta);

      const summaryStatus = document.createElement("div");
      summaryStatus.className = "flex items-center gap-2";
      const statusBadge = document.createElement("span");
      statusBadge.className =
        "rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600";
      const chevron = document.createElement("span");
      chevron.className = "text-xs text-slate-400 transition-transform group-open:rotate-180";
      chevron.textContent = "v";
      summaryStatus.appendChild(statusBadge);
      summaryStatus.appendChild(chevron);

      summary.appendChild(summaryLabel);
      summary.appendChild(summaryStatus);
      groupBlock.appendChild(summary);

      const groupContent = document.createElement("div");
      groupContent.className = "border-t border-slate-200/70 px-3 pb-3 pt-2 dark:border-slate-700/70";
      const groupHelper = document.createElement("p");
      groupHelper.className = "mb-2 text-[11px] text-slate-500 dark:text-slate-400";
      groupContent.appendChild(groupHelper);

      if (!group.features.length) {
        const text = document.createElement("p");
        text.className = "text-xs text-slate-500 dark:text-slate-400";
        text.textContent = "Sem funcoes extras neste menu.";
        groupContent.appendChild(text);
        groupBlock.appendChild(groupContent);
        featuresList.appendChild(groupBlock);
        const selectedMenu = menuSelectByKey.get(group.menu);
        if (selectedMenu) groupBlock.open = resolvePermissionSelectValue(selectedMenu);
        featureGroupUiByMenu.set(group.menu, {
          container: groupContent,
          details: groupBlock,
          helper: groupHelper,
          statusBadge,
          featureSelects: [],
        });
        return;
      }

      const featureItems = document.createElement("div");
      featureItems.className = "space-y-2";
      const featureSelects = [];

      group.features.forEach((featureKey) => {
        const selectedValue = hasOwn(normalizedSelected.features, featureKey)
          ? Boolean(normalizedSelected.features[featureKey])
          : null;
        const { row, select } = buildPermissionRow(
          "features",
          featureKey,
          PERMISSION_LABELS.features[featureKey] || featureKey,
          Boolean(defaultsForRole.features[featureKey]),
          selectedValue,
          true
        );
        featureSelects.push(select);
        featureItems.appendChild(row);
      });

      const hasCustomFeatureOverride = featureSelects.some((select) => select.value !== "inherit");
      const selectedMenu = menuSelectByKey.get(group.menu);
      if (selectedMenu) {
        groupBlock.open = resolvePermissionSelectValue(selectedMenu) || hasCustomFeatureOverride;
      } else {
        groupBlock.open = hasCustomFeatureOverride;
      }

      groupContent.appendChild(featureItems);
      groupBlock.appendChild(groupContent);
      featuresList.appendChild(groupBlock);
      featureGroupUiByMenu.set(group.menu, {
        container: featureItems,
        details: groupBlock,
        helper: groupHelper,
        statusBadge,
        featureSelects,
      });
    });

    const syncFeatureGroupState = (menuKey) => {
      const select = menuSelectByKey.get(menuKey);
      const groupUi = featureGroupUiByMenu.get(menuKey);
      if (!select || !groupUi) return;

      const isMenuEnabled = resolvePermissionSelectValue(select);
      const hasCustomFeatureOverride = groupUi.featureSelects.some(
        (featureSelect) => featureSelect.value !== "inherit"
      );

      groupUi.statusBadge.textContent = isMenuEnabled ? "Ativo" : "Inativo";
      groupUi.statusBadge.className = isMenuEnabled
        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
        : "rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200";
      groupUi.helper.textContent = isMenuEnabled
        ? "Defina quais funcoes ficam ativas neste menu."
        : "Menu inativo. As funcoes abaixo so passam a valer quando o menu estiver ativo.";
      groupUi.container.classList.toggle("opacity-70", !isMenuEnabled);
      groupUi.container.classList.toggle("transition-opacity", true);

      if (isMenuEnabled && !groupUi.details.open) {
        groupUi.details.open = true;
      } else if (!isMenuEnabled && !hasCustomFeatureOverride) {
        groupUi.details.open = false;
      }
    };

    featuresWrapper.appendChild(featuresList);
    userPermissionsGrid.appendChild(featuresWrapper);

    const onPermissionsChanged = () => {
      PERMISSION_KEYS.menus.forEach((menuKey) => syncFeatureGroupState(menuKey));
      renderEffectivePermissionsPreview(role);
    };

    userPermissionsGrid
      .querySelectorAll('select[data-perm-mode="true"]')
      .forEach((input) => input.addEventListener("change", onPermissionsChanged));

    PERMISSION_KEYS.menus.forEach((menuKey) => syncFeatureGroupState(menuKey));
    renderEffectivePermissionsPreview(role);
  }

  function renderEffectivePermissionsPreview(role) {
    if (!userEffectivePermissionsPanel) return;
    const overrides = normalizePermissionsPayload(collectUserPermissionsFromForm());
    const effective = getEffectivePermissions(role, overrides);
    const enabledMenus = PERMISSION_KEYS.menus
      .filter((key) => effective.menus[key])
      .map((key) => PERMISSION_LABELS.menus[key] || key);
    const enabledFeatures = PERMISSION_KEYS.features
      .filter((key) => effective.features[key])
      .map((key) => PERMISSION_LABELS.features[key] || key);

    userEffectivePermissionsPanel.innerHTML = `
      <div class="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
        <p class="font-semibold">Permissoes efetivas (tempo real)</p>
        <p class="mt-1 text-slate-500 dark:text-slate-400">
          Menus: ${enabledMenus.length ? enabledMenus.join(", ") : "nenhum"}
        </p>
        <p class="mt-1 text-slate-500 dark:text-slate-400">
          Funcoes: ${enabledFeatures.length ? enabledFeatures.join(", ") : "nenhuma"}
        </p>
      </div>
    `;
  }

  function collectUserPermissionsFromForm() {
    const collected = { menus: {}, features: {} };
    if (!userPermissionsGrid) return collected;

    userPermissionsGrid
      .querySelectorAll('select[data-perm-mode="true"][data-section][data-key]')
      .forEach((select) => {
        const section = select.dataset.section;
        const key = select.dataset.key;
        if (!section || !key) return;
        if (!Object.prototype.hasOwnProperty.call(collected, section)) return;
        if (select.value === "inherit") return;
        collected[section][key] = select.value === "allow";
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
    populateUserPresetOptions();
    if (userPresetSelect) userPresetSelect.value = "";
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
    populateUserPresetOptions();
    if (userPresetSelect) userPresetSelect.value = "";
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
      const simulationWriteLocked = isSimulationActive();
      const canEdit = canManage && hasPermission("features.users_edit") && !simulationWriteLocked;
      const canToggleActive =
        canManage && hasPermission("features.users_disable") && !isSelf && !simulationWriteLocked;
      const canResetPassword =
        canManage &&
        hasPermission("features.users_reset_password") &&
        isSuperAdmin() &&
        !isSelf &&
        !simulationWriteLocked;
      const canSimulate = canManage && isSuperAdmin() && !isSelf && !isSimulationActive();
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
              canSimulate
                ? `<button type="button" data-action="simulate" class="text-emerald-600 transition hover:text-emerald-800" title="Simular login">
                     <i class="fas fa-arrow-right"></i>
                   </button>`
                : ""
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
      tr.querySelector('[data-action="simulate"]')?.addEventListener("click", () => {
        simulateUserAccess(user);
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

    if (!editId && !isStrongPassword(password)) {
      alert(STRONG_PASSWORD_HINT);
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
    if (!(await confirmAction(`Deseja ${actionLabel} o usuario "${user.name}"?`, {
      title: "Confirmar usuario",
      danger: !nextActive,
      confirmText: nextActive ? "Reativar" : "Desativar",
    }))) {
      return;
    }

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
    const newPassword = await promptAction(`Nova senha para "${user.name}":`, {
      title: "Resetar senha de usuario",
      inputType: "password",
      placeholder: "Digite a nova senha",
      confirmText: "Salvar senha",
    });
    if (!newPassword) return;
    if (!isStrongPassword(newPassword)) {
      alert(STRONG_PASSWORD_HINT);
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

  async function simulateUserAccess(user) {
    if (!isSuperAdmin() || !user?.id) {
      alert("Somente superadmin pode simular acessos.");
      return;
    }
    if (!user.active) {
      alert("Usuario inativo. Reative o usuario antes de simular.");
      return;
    }

    if (
      !(await confirmAction(
        `Simular login como "${user.name || user.email}"?\n\n` +
          "Voce podera sair da simulacao a qualquer momento.",
        {
          title: "Confirmar simulacao",
          confirmText: "Iniciar simulacao",
        }
      ))
    ) {
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE}/auth/simulate/user/${user.id}`, {
        method: "POST",
      });
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "simulate-user-error");
        throw new Error(reason);
      }
      const payload = await res.json();
      await startSimulationSession(payload);
    } catch (error) {
      console.error("Erro ao simular usuario:", error);
      alert("Erro ao iniciar simulacao de usuario.");
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

  function showScheduleChangeResultMessage(payload, successMessage = "") {
    if (payload?.pendingApproval) {
      alert("Solicitacao enviada para aprovacao manual.");
      return;
    }
    if (payload?.autoApproved) {
      alert("Mudanca autoaprovada e publicada.");
      return;
    }
    if (successMessage) {
      alert(successMessage);
    }
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

      if (!(await confirmAction(
        `Restaurar este backup?\n\n${formatScheduleSummary(summary)}\n\nIsso vai substituir os horarios atuais.`,
        {
          title: "Restaurar backup",
          danger: true,
          confirmText: "Restaurar",
        }
      ))) {
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
      const payload = await restoreRes.json().catch(() => ({}));

      await loadConfigSchedule();
      await loadScheduleChangeRequests();
      await loadBackupSnapshots();
      window.dispatchEvent(new CustomEvent("school:changed", { detail: { schoolId } }));
      showScheduleChangeResultMessage(payload, "Backup restaurado com sucesso.");
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
    if (!isStrongPassword(newPassword)) {
      alert(STRONG_PASSWORD_HINT);
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

  function formatHistoryDateLabel(dateValue) {
    if (!dateValue) return "--";
    const asDate = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(asDate.getTime())) return String(dateValue);
    return asDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  function renderOperationalHistoryChart(series) {
    if (!dashboardOperationalCanvas) return;
    const ctx = dashboardOperationalCanvas.getContext("2d");
    if (!ctx) return;

    const width = Math.max(360, dashboardOperationalCanvas.clientWidth || 900);
    const height = 260;
    const dpr = window.devicePixelRatio || 1;
    dashboardOperationalCanvas.width = Math.floor(width * dpr);
    dashboardOperationalCanvas.height = Math.floor(height * dpr);
    dashboardOperationalCanvas.style.width = `${width}px`;
    dashboardOperationalCanvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!Array.isArray(series) || !series.length) {
      ctx.fillStyle = "#64748b";
      ctx.font = "12px sans-serif";
      ctx.fillText("Sem dados historicos suficientes.", 16, 30);
      return;
    }

    const padding = { top: 14, right: 18, bottom: 38, left: 42 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const latencyValues = series.map((row) => Number(row.dbLatencyAvgMs) || 0);
    const playbackValues = series.map((row) => Number(row.playbackFailures) || 0);
    const alertValues = series.map((row) => Number(row.openAlerts) || 0);
    const maxValue = Math.max(1, ...latencyValues, ...playbackValues, ...alertValues);

    const getX = (index) => {
      if (series.length <= 1) return padding.left + plotWidth / 2;
      return padding.left + (index / (series.length - 1)) * plotWidth;
    };
    const getY = (value) => padding.top + plotHeight - (value / maxValue) * plotHeight;

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + plotHeight);
    ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
    ctx.stroke();

    const drawLine = (values, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      values.forEach((value, index) => {
        const x = getX(index);
        const y = getY(value);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = color;
      values.forEach((value, index) => {
        const x = getX(index);
        const y = getY(value);
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    drawLine(latencyValues, "#0284c7");
    drawLine(playbackValues, "#f97316");
    drawLine(alertValues, "#dc2626");

    ctx.fillStyle = "#64748b";
    ctx.font = "11px sans-serif";
    ctx.fillText("0", 8, padding.top + plotHeight + 4);
    ctx.fillText(String(Math.round(maxValue)), 8, padding.top + 4);

    const labelIndexes = Array.from(
      new Set([0, Math.floor((series.length - 1) / 2), series.length - 1])
    ).filter((index) => index >= 0);
    labelIndexes.forEach((index) => {
      const label = formatHistoryDateLabel(series[index]?.date);
      const x = getX(index);
      ctx.fillStyle = "#64748b";
      ctx.font = "11px sans-serif";
      ctx.fillText(label, x - 20, height - 12);
    });
  }

  async function loadDashboardOperationalHistory() {
    if (!dashboardOperationalCanvas || !dashboardOperationalMeta) return;

    if (!canViewDashboardOperationalHistory()) {
      dashboardOperationalMeta.textContent =
        "Sem permissao para visualizar historico operacional.";
      renderOperationalHistoryChart([]);
      return;
    }

    if (!currentUser) {
      dashboardOperationalMeta.textContent = "Faca login para carregar o historico.";
      renderOperationalHistoryChart([]);
      return;
    }

    const daysRaw = Number.parseInt(String(dashboardOperationalDays?.value || "14"), 10);
    const days = Number.isInteger(daysRaw) ? Math.min(Math.max(daysRaw, 3), 90) : 14;
    const schoolId = isSuperAdmin()
      ? String(dashboardOperationalSchoolFilter?.value || "")
      : String(currentUser.schoolId || "");

    const params = new URLSearchParams();
    params.set("days", String(days));
    if (schoolId) params.set("schoolId", schoolId);

    dashboardOperationalMeta.textContent = "Carregando historico operacional...";
    try {
      const res = await apiFetch(`${API_BASE}/monitor/history?${params.toString()}`);
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "fetch-monitor-history-error");
        throw new Error(reason);
      }

      const payload = await res.json();
      const series = Array.isArray(payload?.series) ? payload.series : [];
      renderOperationalHistoryChart(series);

      const labelScope = payload?.scope === "school"
        ? `Escola: ${getSchoolNameById(payload.schoolId) || payload.schoolId}`
        : "Escopo: global";
      const lastDate = series.length ? formatHistoryDateLabel(series[series.length - 1].date) : "--";
      dashboardOperationalMeta.textContent = `${labelScope} | ${days} dias | ultimo ponto: ${lastDate}`;
    } catch (error) {
      console.error("Erro ao carregar historico operacional:", error);
      dashboardOperationalMeta.textContent = "Erro ao carregar historico operacional.";
      renderOperationalHistoryChart([]);
    }
  }

  async function loadDashboardMonitorInfo(options = {}) {
    if (!dashboardDbStatus || !dashboardDbLatency || !dashboardOpenAlerts || !dashboardAlertList) return;

    const canSeeDb = canViewDashboardDatabaseStatus();
    const canSeeOpenAlerts = canViewDashboardOpenAlerts();
    const canSeeWithoutSchedule = canViewDashboardSchoolsWithoutSchedule();
    const canSeeMonitorAlerts = canViewDashboardMonitorAlerts();
    const canSeeHttpMetrics = canViewDashboardHttpMetrics();
    const shouldFetchMonitor = canSeeWithoutSchedule || canSeeHttpMetrics;
    const shouldFetchAlerts = (canSeeOpenAlerts || canSeeMonitorAlerts) && !shouldFetchMonitor;
    const force = options.force === true;
    const nowMs = Date.now();
    const monitorCacheKey = [
      currentUser?.id || "anonymous",
      currentUser?.role || "none",
      getCurrentSchoolId() || "none",
      canFilterDashboardHttpMetrics() ? dashboardHttpMethodFilter?.value || "ALL" : "ALL",
      canFilterDashboardHttpMetrics() ? dashboardHttpWindowFilter?.value || "60" : "60",
      canFilterDashboardHttpMetrics() ? dashboardHttpTopNFilter?.value || "10" : "10",
    ].join("|");

    if (!force && dashboardMonitorInFlight) {
      return dashboardMonitorInFlight;
    }

    if (
      !force &&
      dashboardMonitorLastCacheKey === monitorCacheKey &&
      nowMs - dashboardMonitorLastLoadedAt < DASHBOARD_MONITOR_DEDUPE_MS
    ) {
      return;
    }

    if (!canSeeDb) {
      dashboardDbStatus.textContent = "--";
      dashboardDbStatus.className = "mt-2 text-xl font-extrabold text-slate-500";
      dashboardDbLatency.textContent = "Latencia: --";
      if (dashboardApiUptime) dashboardApiUptime.textContent = "Uptime API: --";
      if (dashboardLastSweeps) dashboardLastSweeps.textContent = "Ultimas execucoes: --";
      resetDashboardHttpMetrics("Sem permissao para visualizar metricas HTTP.");
    }

    if (!currentUser) {
      dashboardOpenAlerts.textContent = "--";
      dashboardSchoolsWithoutSchedule.textContent = "--";
      dashboardMonitorCheckedAt.textContent = "Ultima verificacao: --";
      if (dashboardPlaybackFailures) dashboardPlaybackFailures.textContent = "Falhas de toque (24h): --";
      if (dashboardPendingApprovals) dashboardPendingApprovals.textContent = "Aprovacoes pendentes: --";
      if (dashboardApiUptime) dashboardApiUptime.textContent = "Uptime API: --";
      if (dashboardLastSweeps) dashboardLastSweeps.textContent = "Ultimas execucoes: --";
      if (canSeeMonitorAlerts) {
        dashboardAlertList.innerHTML = `<li class="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">Faca login para visualizar alertas.</li>`;
      } else {
        dashboardAlertList.innerHTML = `<li class="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">Sem permissao para visualizar alertas de monitoramento.</li>`;
      }
      resetDashboardHttpMetrics("Faca login para visualizar metricas HTTP.");
      renderOperationalHistoryChart([]);
      if (dashboardOperationalMeta) dashboardOperationalMeta.textContent = "Faca login para carregar o historico.";
      dashboardMonitorLastCacheKey = monitorCacheKey;
      dashboardMonitorLastLoadedAt = nowMs;
      return;
    }

    const runLoad = (async () => {
      let monitorPayload = null;

      const methodFilter = canFilterDashboardHttpMetrics()
        ? String(dashboardHttpMethodFilter?.value || "ALL").toUpperCase()
        : "ALL";
      const windowMinutesFilter = canFilterDashboardHttpMetrics()
        ? Number.parseInt(String(dashboardHttpWindowFilter?.value || "60"), 10)
        : 60;
      const topNFilter = canFilterDashboardHttpMetrics()
        ? Number.parseInt(String(dashboardHttpTopNFilter?.value || "10"), 10)
        : 10;
      const usesDefaultHttpMetricsFilters =
        methodFilter === "ALL" && windowMinutesFilter === 60 && topNFilter === 10;

      if (canSeeDb && !shouldFetchMonitor) {
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
          if (dashboardApiUptime) dashboardApiUptime.textContent = "Uptime API: --";
          if (dashboardLastSweeps) dashboardLastSweeps.textContent = "Ultimas execucoes: --";
          if (canSeeHttpMetrics) {
            resetDashboardHttpMetrics("Sem dados enquanto o banco estiver indisponivel.");
          }
        }
      }

      try {
      const httpMetricsParams = new URLSearchParams();
      httpMetricsParams.set("method", methodFilter);
      httpMetricsParams.set("windowMinutes", String(windowMinutesFilter));
      httpMetricsParams.set("topN", String(topNFilter));

      const [monitorRes, alertsRes, httpMetricsRes] = await Promise.all([
        shouldFetchMonitor ? apiFetch(`${API_BASE}/monitor/status`) : Promise.resolve(null),
        shouldFetchAlerts ? apiFetch(`${API_BASE}/alerts?status=open`) : Promise.resolve(null),
        canSeeHttpMetrics && !usesDefaultHttpMetricsFilters
          ? apiFetch(`${API_BASE}/monitor/http-metrics?${httpMetricsParams.toString()}`)
          : Promise.resolve(null),
      ]);

      if (monitorRes && monitorRes.ok) {
        monitorPayload = await monitorRes.json();
      }

      if (canSeeDb && monitorPayload?.database) {
        const dbStatus =
          monitorPayload.database.status === "up" ? "Banco online" : "Banco indisponivel";
        dashboardDbStatus.textContent = dbStatus;
        dashboardDbStatus.className =
          monitorPayload.database.status === "up"
            ? "mt-2 text-xl font-extrabold text-emerald-600"
            : "mt-2 text-xl font-extrabold text-rose-600";
        const latency = Number.isFinite(monitorPayload.database.latencyMs)
          ? `${monitorPayload.database.latencyMs} ms`
          : "--";
        dashboardDbLatency.textContent = `Latencia: ${latency}`;
      }

      let httpMetricsPayload = null;
      if (httpMetricsRes && httpMetricsRes.ok) {
        httpMetricsPayload = await httpMetricsRes.json();
      }

      let alerts = [];
      if (alertsRes && alertsRes.ok) {
        const data = await alertsRes.json();
        alerts = Array.isArray(data) ? data : [];
      }

      if (canSeeOpenAlerts) {
        const openAlertsValue = Number.isFinite(monitorPayload?.openAlertsTotal)
          ? monitorPayload.openAlertsTotal
          : alerts.length;
        dashboardOpenAlerts.textContent = String(openAlertsValue);
      } else {
        dashboardOpenAlerts.textContent = "--";
      }

      if (canSeeWithoutSchedule && dashboardSchoolsWithoutSchedule) {
        const withoutScheduleValue = Number.isFinite(monitorPayload?.schoolsWithoutSchedule)
          ? monitorPayload.schoolsWithoutSchedule
          : alerts.filter((item) => item.type === "school_without_schedule").length;
        dashboardSchoolsWithoutSchedule.textContent = String(withoutScheduleValue);
      } else if (dashboardSchoolsWithoutSchedule) {
        dashboardSchoolsWithoutSchedule.textContent = "--";
      }

      if (dashboardMonitorCheckedAt) {
        if (canSeeWithoutSchedule) {
          const checkedAt = monitorPayload?.checkedAt
            ? new Date(monitorPayload.checkedAt).toLocaleString("pt-BR")
            : new Date().toLocaleString("pt-BR");
          dashboardMonitorCheckedAt.textContent = `Ultima verificacao: ${checkedAt}`;
        } else {
          dashboardMonitorCheckedAt.textContent = "Ultima verificacao: --";
        }
      }

      if (dashboardPlaybackFailures) {
        const playbackValue = Number.isFinite(monitorPayload?.playbackFailuresLast24h)
          ? monitorPayload.playbackFailuresLast24h
          : "--";
        dashboardPlaybackFailures.textContent = `Falhas de toque (24h): ${playbackValue}`;
      }

      if (dashboardPendingApprovals) {
        const pendingValue = Number.isFinite(monitorPayload?.pendingApprovals)
          ? monitorPayload.pendingApprovals
          : "--";
        dashboardPendingApprovals.textContent = `Aprovacoes pendentes: ${pendingValue}`;
      }

      if (dashboardApiUptime) {
        const uptimeSeconds = Number.isFinite(monitorPayload?.runtime?.uptimeSeconds)
          ? monitorPayload.runtime.uptimeSeconds
          : null;
        const uptimeText =
          uptimeSeconds === null
            ? "--"
            : `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`;
        dashboardApiUptime.textContent = `Uptime API: ${uptimeText}`;
      }

      if (dashboardLastSweeps) {
        const monitorAt = monitorPayload?.runtime?.lastMonitoringSweepAt
          ? new Date(monitorPayload.runtime.lastMonitoringSweepAt).toLocaleString("pt-BR")
          : "--";
        const backupAt = monitorPayload?.runtime?.lastDailyBackupSweepAt
          ? new Date(monitorPayload.runtime.lastDailyBackupSweepAt).toLocaleString("pt-BR")
          : "--";
        dashboardLastSweeps.textContent = `Ultimas execucoes: monitor ${monitorAt} | backup ${backupAt}`;
      }

      if (canSeeHttpMetrics) {
        if (httpMetricsPayload?.metrics) {
          renderDashboardHttpMetrics(httpMetricsPayload.metrics, "endpoint");
        } else if (monitorPayload?.runtime?.httpMetrics) {
          renderDashboardHttpMetrics(monitorPayload.runtime.httpMetrics, "monitor");
        } else {
          resetDashboardHttpMetrics("Metricas HTTP indisponiveis no momento.");
        }
      } else {
        resetDashboardHttpMetrics("Sem permissao para visualizar metricas HTTP.");
      }

      if (!canSeeMonitorAlerts) {
        dashboardAlertList.innerHTML = `<li class="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">Sem permissao para visualizar alertas de monitoramento.</li>`;
        await loadDashboardOperationalHistory();
        return;
      }
      dashboardAlertList.innerHTML = "";
      const schoolsStatus = Array.isArray(monitorPayload?.schoolsStatus)
        ? monitorPayload.schoolsStatus
        : [];
      if (schoolsStatus.length) {
        schoolsStatus.slice(0, 5).forEach((schoolStatus) => {
          const li = document.createElement("li");
          const toneClass = schoolStatus.hasSchedule
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
          li.className = `rounded-xl px-3 py-2 ${toneClass}`;
          li.textContent = `${schoolStatus.schoolName}: ${
            schoolStatus.hasSchedule ? "com horarios" : "sem horarios"
          } | alertas: ${schoolStatus.openAlerts || 0} | pendentes: ${
            schoolStatus.pendingApprovals || 0
          }`;
          dashboardAlertList.appendChild(li);
        });
      }

      if (!alerts.length && !schoolsStatus.length) {
        const openAlertsValue = Number.isFinite(monitorPayload?.openAlertsTotal)
          ? monitorPayload.openAlertsTotal
          : 0;
        if (openAlertsValue > 0) {
          dashboardAlertList.innerHTML = `<li class="rounded-xl bg-amber-100 px-3 py-2 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">${openAlertsValue} alerta(s) aberto(s).</li>`;
          await loadDashboardOperationalHistory();
          return;
        }
        dashboardAlertList.innerHTML = `<li class="rounded-xl bg-emerald-100 px-3 py-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Nenhum alerta aberto.</li>`;
        await loadDashboardOperationalHistory();
        return;
      }

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
      dashboardMonitorLastCacheKey = monitorCacheKey;
      dashboardMonitorLastLoadedAt = Date.now();
      await loadDashboardOperationalHistory();
    } catch (error) {
      console.error("Erro ao carregar monitoramento do dashboard:", error);
      if (canSeeOpenAlerts) {
        dashboardOpenAlerts.textContent = "--";
      }
      if (canSeeWithoutSchedule) {
        dashboardSchoolsWithoutSchedule.textContent = "--";
        dashboardMonitorCheckedAt.textContent = "Ultima verificacao: --";
      }
      if (dashboardPlaybackFailures) dashboardPlaybackFailures.textContent = "Falhas de toque (24h): --";
      if (dashboardPendingApprovals) dashboardPendingApprovals.textContent = "Aprovacoes pendentes: --";
      if (dashboardApiUptime) dashboardApiUptime.textContent = "Uptime API: --";
      if (dashboardLastSweeps) dashboardLastSweeps.textContent = "Ultimas execucoes: --";
      if (canSeeHttpMetrics) {
        resetDashboardHttpMetrics("Erro ao carregar metricas HTTP.");
      } else {
        resetDashboardHttpMetrics("Sem permissao para visualizar metricas HTTP.");
      }
      if (canSeeMonitorAlerts) {
        dashboardAlertList.innerHTML = `<li class="rounded-xl bg-rose-100 px-3 py-2 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">Erro ao carregar alertas.</li>`;
      } else {
        dashboardAlertList.innerHTML = `<li class="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">Sem permissao para visualizar alertas de monitoramento.</li>`;
      }
      await loadDashboardOperationalHistory();
    }
    })();

    dashboardMonitorInFlight = runLoad;
    try {
      await runLoad;
    } finally {
      dashboardMonitorLastCacheKey = monitorCacheKey;
      dashboardMonitorLastLoadedAt = Date.now();
      if (dashboardMonitorInFlight === runLoad) {
        dashboardMonitorInFlight = null;
      }
    }
  }

  function resetDashboardHttpMetrics(message = "Carregando metricas HTTP...") {
    if (dashboardHttpTotalRequests) dashboardHttpTotalRequests.textContent = "--";
    if (dashboardHttpTotalErrors) dashboardHttpTotalErrors.textContent = "--";
    if (dashboardHttpTopEndpoint) dashboardHttpTopEndpoint.textContent = "--";
    if (dashboardHttpLastSeen) dashboardHttpLastSeen.textContent = "Ultima coleta: --";
    if (dashboardHttpMetricsBody) {
      dashboardHttpMetricsBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-3 text-slate-500 dark:text-slate-400">${message}</td>
        </tr>
      `;
    }
  }

  function renderDashboardHttpMetrics(payload, sourceLabel = "monitor") {
    const metrics = payload?.metrics || payload || {};
    const endpoints = Array.isArray(metrics.endpoints) ? metrics.endpoints : [];
    const scope = metrics.scope && typeof metrics.scope === "object" ? metrics.scope : {};

    if (dashboardHttpTotalRequests) {
      dashboardHttpTotalRequests.textContent = Number.isFinite(metrics.totalRequests)
        ? String(metrics.totalRequests)
        : "--";
    }
    if (dashboardHttpTotalErrors) {
      dashboardHttpTotalErrors.textContent = Number.isFinite(metrics.totalErrors)
        ? String(metrics.totalErrors)
        : "--";
    }

    const first = endpoints[0] || null;
    if (dashboardHttpTopEndpoint) {
      dashboardHttpTopEndpoint.textContent = first
        ? `${first.endpoint} (${first.requests} req)`
        : "Sem dados";
    }
    if (dashboardHttpLastSeen) {
      const lastSeen = first?.lastSeenAt ? new Date(first.lastSeenAt).toLocaleString("pt-BR") : "--";
      const scopeText = `janela: ${scope.windowMinutes || "--"} min | metodo: ${scope.method || "ALL"} | top: ${scope.topN || endpoints.length || "--"}`;
      dashboardHttpLastSeen.textContent = `Ultima coleta: ${lastSeen} | fonte: ${sourceLabel} | ${scopeText}`;
    }

    if (!dashboardHttpMetricsBody) return;
    if (!endpoints.length) {
      dashboardHttpMetricsBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-3 text-slate-500 dark:text-slate-400">Sem endpoints registrados.</td>
        </tr>
      `;
      return;
    }

    dashboardHttpMetricsBody.innerHTML = "";
    endpoints.forEach((item) => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-slate-200/70 dark:border-slate-800/70";
      const errorRate = Number.isFinite(item.errorRate) ? `${(item.errorRate * 100).toFixed(2)}%` : "--";
      const latencyAvg = Number.isFinite(item.latencyAvgMs) ? `${item.latencyAvgMs} ms` : "--";
      const latencyMax = Number.isFinite(item.latencyMaxMs) ? `${item.latencyMaxMs} ms` : "--";
      tr.innerHTML = `
        <td class="py-2 pr-3 font-semibold text-slate-700 dark:text-slate-200">${item.endpoint || "-"}</td>
        <td class="py-2 pr-3">${item.requests ?? "--"}</td>
        <td class="py-2 pr-3">${item.errors ?? "--"}</td>
        <td class="py-2 pr-3">${errorRate}</td>
        <td class="py-2 pr-3">${latencyAvg}</td>
        <td class="py-2 pr-3">${latencyMax}</td>
        <td class="py-2 pr-3">${item.lastStatusCode ?? "--"}</td>
      `;
      dashboardHttpMetricsBody.appendChild(tr);
    });
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
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  }

  function canApproveScheduleChanges() {
    return (
      Boolean(currentUser) &&
      !isSimulationActive() &&
      isSuperAdmin() &&
      hasPermission("menus.config") &&
      hasPermission("features.config_approve_changes")
    );
  }

  function getSignalsByTime(schedule, period) {
    const list = Array.isArray(schedule?.[period]) ? schedule[period] : [];
    const map = new Map();
    list.forEach((item) => {
      const time = String(item?.time || "").trim();
      if (!time) return;
      map.set(time, {
        time,
        name: String(item?.name || "").trim(),
        music: String(item?.music || "").trim(),
        duration: Number(item?.duration) || 15,
      });
    });
    return map;
  }

  function computeScheduleDiff(beforePayload, afterPayload) {
    const periodDiffs = {};
    PERIODS.forEach((period) => {
      const beforeMap = getSignalsByTime(beforePayload || {}, period);
      const afterMap = getSignalsByTime(afterPayload || {}, period);
      const times = new Set([...beforeMap.keys(), ...afterMap.keys()]);
      const items = [];
      Array.from(times)
        .sort((a, b) => a.localeCompare(b))
        .forEach((time) => {
          const before = beforeMap.get(time) || null;
          const after = afterMap.get(time) || null;
          if (!before && after) {
            items.push({ type: "added", time, before: null, after });
            return;
          }
          if (before && !after) {
            items.push({ type: "removed", time, before, after: null });
            return;
          }
          if (!before || !after) return;
          const changed =
            before.name !== after.name ||
            before.music !== after.music ||
            Number(before.duration) !== Number(after.duration);
          if (changed) {
            items.push({ type: "changed", time, before, after });
          }
        });
      periodDiffs[period] = items;
    });
    return periodDiffs;
  }

  function renderScheduleDiffHtml(beforePayload, afterPayload) {
    const diff = computeScheduleDiff(beforePayload, afterPayload);
    const totalChanges = PERIODS.reduce(
      (sum, period) => sum + (Array.isArray(diff[period]) ? diff[period].length : 0),
      0
    );
    if (!totalChanges) {
      return `<p class="mt-2 text-xs text-slate-500 dark:text-slate-400">Sem diferencas detectadas entre antes e depois.</p>`;
    }

    const periodBlocks = PERIODS.map((period) => {
      const changes = diff[period] || [];
      if (!changes.length) return "";
      const lines = changes
        .map((item) => {
          if (item.type === "added") {
            return `<li class="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">+ ${item.time} | ${item.after.name} | ${item.after.music} | ${item.after.duration}s</li>`;
          }
          if (item.type === "removed") {
            return `<li class="rounded-md bg-rose-50 px-2 py-1 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">- ${item.time} | ${item.before.name} | ${item.before.music} | ${item.before.duration}s</li>`;
          }
          return `<li class="rounded-md bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">~ ${item.time} | ${item.before.name} -> ${item.after.name} | ${item.before.music} -> ${item.after.music} | ${item.before.duration}s -> ${item.after.duration}s</li>`;
        })
        .join("");
      return `
        <div class="mt-2">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">${periods[period] || period}</p>
          <ul class="mt-1 space-y-1 text-xs">${lines}</ul>
        </div>
      `;
    }).join("");

    return `<div class="mt-2">${periodBlocks}</div>`;
  }

  function renderScheduleChangeRequests() {
    if (!scheduleRequestsList) return;
    if (!canAccessConfigMenu()) {
      scheduleRequestsList.innerHTML = `<li class="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">Sem permissao para visualizar aprovacoes.</li>`;
      return;
    }
    if (!pendingScheduleRequests.length) {
      scheduleRequestsList.innerHTML = `<li class="rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Nenhuma solicitacao pendente para esta escola.</li>`;
      return;
    }

    scheduleRequestsList.innerHTML = "";
    pendingScheduleRequests.forEach((requestItem) => {
      const li = document.createElement("li");
      li.className = "rounded-xl border border-slate-200 p-3 dark:border-slate-700";
      const createdAt = requestItem.createdAt
        ? new Date(requestItem.createdAt).toLocaleString("pt-BR")
        : "--";
      const summary = requestItem.payloadSummary
        ? formatScheduleSummary(requestItem.payloadSummary)
        : "Sem resumo";
      const beforeSummary = requestItem.beforeSummary
        ? formatScheduleSummary(requestItem.beforeSummary)
        : "Sem resumo";
      const statusColor =
        requestItem.status === "approved"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          : requestItem.status === "rejected"
            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";

      li.innerHTML = `
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-sm font-semibold">${requestItem.proposedByName || "Usuario"} - ${createdAt}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Antes: ${beforeSummary}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Depois: ${summary}</p>
          </div>
          <span class="inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusColor}">
            ${requestItem.status}
          </span>
        </div>
        ${renderScheduleDiffHtml(requestItem.beforePayload || {}, requestItem.payload || {})}
      `;

      if (canApproveScheduleChanges() && requestItem.status === "pending") {
        const actions = document.createElement("div");
        actions.className = "mt-3 inline-flex items-center gap-2";
        actions.innerHTML = `
          <button type="button" data-action="approve" class="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
            Aprovar
          </button>
          <button type="button" data-action="reject" class="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700">
            Rejeitar
          </button>
        `;
        actions.querySelector('[data-action="approve"]')?.addEventListener("click", () => {
          approveScheduleChangeRequest(requestItem);
        });
        actions.querySelector('[data-action="reject"]')?.addEventListener("click", () => {
          rejectScheduleChangeRequest(requestItem);
        });
        li.appendChild(actions);
      }

      scheduleRequestsList.appendChild(li);
    });
  }

  async function loadScheduleChangeRequests() {
    if (!scheduleRequestsList) return;
    const schoolId = getCurrentSchoolId();
    pendingScheduleRequests = [];

    if (!schoolId) {
      renderScheduleChangeRequests();
      return;
    }
    if (!canAccessConfigMenu()) {
      renderScheduleChangeRequests();
      return;
    }

    scheduleRequestsList.innerHTML = `<li class="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">Carregando solicitacoes...</li>`;

    try {
      const statusQuery = canApproveScheduleChanges() ? "pending" : "";
      const params = new URLSearchParams();
      if (statusQuery) params.set("status", statusQuery);
      params.set("limit", "25");
      const query = params.toString() ? `?${params.toString()}` : "";

      const res = await apiFetch(`${SCHOOLS_API_URL}/${schoolId}/change-requests${query}`);
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "fetch-change-requests-error");
        throw new Error(reason);
      }
      const data = await res.json();
      pendingScheduleRequests = Array.isArray(data) ? data : [];
      renderScheduleChangeRequests();
    } catch (error) {
      console.error("Erro ao carregar solicitacoes de mudanca:", error);
      scheduleRequestsList.innerHTML = `<li class="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">Erro ao carregar solicitacoes.</li>`;
    }
  }

  async function approveScheduleChangeRequest(requestItem) {
    if (!requestItem?.id || !canApproveScheduleChanges()) return;
    if (!(await confirmAction("Aprovar esta solicitacao e publicar os horarios?", {
      title: "Aprovar solicitacao",
      confirmText: "Aprovar",
    }))) {
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE}/change-requests/${requestItem.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Aprovado pelo superadmin" }),
      });
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "approve-change-request-error");
        throw new Error(reason);
      }
      await loadConfigSchedule();
      await loadScheduleChangeRequests();
      window.dispatchEvent(
        new CustomEvent("school:changed", { detail: { schoolId: getCurrentSchoolId() } })
      );
      alert("Solicitacao aprovada e publicada.");
    } catch (error) {
      console.error("Erro ao aprovar solicitacao:", error);
      alert("Erro ao aprovar solicitacao.");
    }
  }

  async function rejectScheduleChangeRequest(requestItem) {
    if (!requestItem?.id || !canApproveScheduleChanges()) return;
    const note = await promptAction("Motivo da rejeicao (opcional):", {
      title: "Rejeitar solicitacao",
      placeholder: "Descreva o motivo (opcional)",
      confirmText: "Rejeitar",
    });
    if (note === null) return;
    try {
      const res = await apiFetch(`${API_BASE}/change-requests/${requestItem.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note || "" }),
      });
      if (!res.ok) {
        const reason = await readApiErrorMessage(res, "reject-change-request-error");
        throw new Error(reason);
      }
      await loadScheduleChangeRequests();
      alert("Solicitacao rejeitada.");
    } catch (error) {
      console.error("Erro ao rejeitar solicitacao:", error);
      alert("Erro ao rejeitar solicitacao.");
    }
  }

  async function deleteSignal(period, time) {
    if (!canWrite()) {
      alert("Seu perfil e somente leitura.");
      return;
    }
    if (!(await confirmAction(`Remover o sinal das ${time}?`, {
      title: "Remover horario",
      danger: true,
      confirmText: "Remover",
    }))) {
      return;
    }

    const schoolId = getCurrentSchoolId();
    if (!schoolId) {
      alert("Selecione uma escola.");
      return;
    }

    try {
      const data = await fetchScheduleBySchoolId(schoolId);
      if (!data) throw new Error("missing-schedule");

      data[period] = (data[period] || []).filter((item) => item.time !== time);
      const saveResult = await saveScheduleBySchoolId(schoolId, data);
      await loadConfigSchedule();
      await loadScheduleChangeRequests();
      window.dispatchEvent(new CustomEvent("school:changed", { detail: { schoolId } }));
      showScheduleChangeResultMessage(saveResult?.body);
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
    if (!music) {
      alert("Cadastre e selecione um audio antes de salvar o horario.");
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

      const saveResult = await saveScheduleBySchoolId(schoolId, data);
      closeModal();
      await loadConfigSchedule();
      await loadScheduleChangeRequests();
      window.dispatchEvent(new CustomEvent("school:changed", { detail: { schoolId } }));
      showScheduleChangeResultMessage(saveResult?.body);
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

    const templateName = await promptAction("Nome do template:", {
      title: "Salvar template",
      placeholder: "Ex.: Grade Padrao Manha",
      confirmText: "Salvar",
    });
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

    if (!(await confirmAction("Aplicar template? Isso vai substituir os horarios atuais da escola.", {
      title: "Aplicar template",
      danger: true,
      confirmText: "Aplicar",
    }))) {
      return;
    }

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
      const payload = await res.json().catch(() => ({}));
      await loadConfigSchedule();
      await loadScheduleChangeRequests();
      window.dispatchEvent(new CustomEvent("school:changed", { detail: { schoolId } }));
      showScheduleChangeResultMessage(payload, "Template aplicado com sucesso.");
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

      if (!(await confirmAction(
        `Importar backup?\n\nPreview: ${formatScheduleSummary(
          summary
        )}\n\nOs horarios atuais da escola serao substituidos.`,
        {
          title: "Importar backup",
          danger: true,
          confirmText: "Importar",
        }
      ))) {
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
      const responsePayload = await res.json().catch(() => ({}));

      await loadConfigSchedule();
      await loadScheduleChangeRequests();
      await loadBackupSnapshots();
      window.dispatchEvent(new CustomEvent("school:changed", { detail: { schoolId } }));
      showScheduleChangeResultMessage(responsePayload, "Backup importado com sucesso.");
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

    setLoginLoading(true);

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
      clearSimulationSourceSession();
      setAuthSession(data.token, data.user);
      setCurrentUser(data.user);
      hideAuthOverlay();
      await loadSchools();
      await loadAudioTracks();
      await loadUsers();
      await loadDashboardMonitorInfo({ force: true });
      switchSection("dashboard");
      broadcastAuthChanged(true);
      if (loginForm) loginForm.reset();
    } catch (err) {
      console.error("Erro no login:", err);
      showLoginError("Credenciais invalidas ou usuario sem acesso.");
    } finally {
      setLoginLoading(false);
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
      await loadDashboardMonitorInfo({ force: true });
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
    populateUserPresetOptions();

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
    navAudios?.addEventListener("click", (event) => {
      event.preventDefault();
      switchSection("audios");
    });
    navAudits?.addEventListener("click", (event) => {
      event.preventDefault();
      switchSection("audit");
    });

    dashboardSchoolSelect?.addEventListener("change", (event) => {
      setCurrentSchoolId(event.target.value);
    });
    dashboardOperationalSchoolFilter?.addEventListener("change", loadDashboardOperationalHistory);
    dashboardOperationalDays?.addEventListener("change", loadDashboardOperationalHistory);

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
    applyUserPresetBtn?.addEventListener("click", applyUserPreset);
    resetUserOverridesBtn?.addEventListener("click", resetUserOverridesToProfileDefaults);
    userForm?.addEventListener("submit", saveUser);
    audioFileInput?.addEventListener("change", handleAudioFileSelected);
    audioClipStartInput?.addEventListener("input", updateAudioClipRangeLabel);
    audioTimeline?.addEventListener("pointerdown", handleAudioTimelineClick);
    audioClipWindow?.addEventListener("pointerdown", beginAudioClipDrag);
    audioClipWindow?.addEventListener("pointermove", moveAudioClipDrag);
    audioClipWindow?.addEventListener("pointerup", endAudioClipDrag);
    audioClipWindow?.addEventListener("pointercancel", endAudioClipDrag);
    audioClipWindow?.addEventListener("keydown", handleAudioClipKeyboard);
    previewAudioClipBtn?.addEventListener("click", previewSelectedAudioClip);
    audioForm?.addEventListener("submit", saveAudioTrack);
    refreshAudioTracksBtn?.addEventListener("click", loadAudioTracks);

    saveTemplateBtn?.addEventListener("click", saveTemplateFromCurrentSchool);
    cloneTemplateBtn?.addEventListener("click", applySelectedTemplate);
    exportBackupBtn?.addEventListener("click", exportCurrentBackup);
    importBackupInput?.addEventListener("change", importBackupFromFile);
    refreshBackupsBtn?.addEventListener("click", loadBackupSnapshots);
    previewBackupBtn?.addEventListener("click", previewSelectedBackup);
    restoreBackupBtn?.addEventListener("click", restoreSelectedBackup);
    refreshScheduleRequestsBtn?.addEventListener("click", loadScheduleChangeRequests);

    auditApplyFiltersBtn?.addEventListener("click", loadAuditLogs);
    refreshAuditBtn?.addEventListener("click", loadAuditLogs);

    refreshDashboardMonitorBtn?.addEventListener("click", () =>
      loadDashboardMonitorInfo({ force: true })
    );
    refreshHttpMetricsBtn?.addEventListener("click", () =>
      loadDashboardMonitorInfo({ force: true })
    );
    dashboardHttpMethodFilter?.addEventListener("change", () => {
      if (canFilterDashboardHttpMetrics()) loadDashboardMonitorInfo({ force: true });
    });
    dashboardHttpWindowFilter?.addEventListener("change", () => {
      if (canFilterDashboardHttpMetrics()) loadDashboardMonitorInfo({ force: true });
    });
    dashboardHttpTopNFilter?.addEventListener("change", () => {
      if (canFilterDashboardHttpMetrics()) loadDashboardMonitorInfo({ force: true });
    });

    changePasswordBtn?.addEventListener("click", openChangePasswordModal);
    cancelChangePasswordBtn?.addEventListener("click", closeChangePasswordModal);
    changePasswordForm?.addEventListener("submit", handleChangePasswordSubmit);

    loginForm?.addEventListener("submit", handleLoginSubmit);
    toggleLoginPasswordBtn?.addEventListener("click", toggleLoginPasswordVisibility);
    loginEmail?.addEventListener("input", () => showLoginError(""));
    loginPassword?.addEventListener("input", () => showLoginError(""));
    logoutBtn?.addEventListener("click", logout);
    exitSimulationBtn?.addEventListener("click", exitSimulation);

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
    setInterval(() => {
      const dashboardVisible = !dashboardSection?.classList.contains("hidden");
      if (dashboardVisible && currentUser) {
        loadDashboardMonitorInfo();
      }
    }, DASHBOARD_MONITOR_AUTO_REFRESH_MS);

    const authenticated = await restoreSession();
    if (authenticated) {
      await loadSchools();
      await loadAudioTracks();
      await loadUsers();
      await loadAuditLogs();
      await loadDashboardMonitorInfo();
      switchSection("dashboard");
    } else {
      switchSection("dashboard");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
