const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const outPath = path.resolve(__dirname, "Manual-SinalTech.pdf");

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 40, right: 42, bottom: 40, left: 42 },
  info: {
    Title: "Manual do Sistema - SinalTech Multi-School",
    Author: "SinalTech",
    Subject: "Manual de uso, configuracoes e operacao",
    Keywords: "sinaltech,multi-school,manual,operacao",
    CreationDate: new Date(),
  },
});

doc.pipe(fs.createWriteStream(outPath));

const colors = {
  ink: "#0f1c33",
  muted: "#4f5f80",
  line: "#d5def0",
  card: "#ffffff",
  primary: "#1f5eff",
  ok: "#1f9d5b",
  warn: "#c77a00",
  bad: "#c62828",
  bg: "#f5f8ff",
};

function ensureSpace(minHeight = 80) {
  if (doc.y + minHeight > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function title(text) {
  ensureSpace(40);
  doc.moveDown(0.2);
  doc.fillColor(colors.ink).font("Helvetica-Bold").fontSize(21).text(text);
  doc.moveDown(0.35);
}

function subtitle(text) {
  ensureSpace(28);
  doc.fillColor(colors.ink).font("Helvetica-Bold").fontSize(15).text(text);
  doc.moveDown(0.2);
}

function paragraph(text) {
  ensureSpace(55);
  doc.fillColor(colors.ink).font("Helvetica").fontSize(10.8).text(text, {
    lineGap: 2.4,
  });
  doc.moveDown(0.25);
}

function bullet(text) {
  ensureSpace(20);
  const x = doc.x;
  const y = doc.y + 4;
  doc.circle(x + 3.3, y, 1.8).fill(colors.primary);
  doc.fillColor(colors.ink).font("Helvetica").fontSize(10.5).text(`  ${text}`, x + 9, doc.y, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 12,
  });
  doc.moveDown(0.1);
}

function cardHeader(text) {
  ensureSpace(28);
  const x = doc.page.margins.left;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;
  doc.roundedRect(x, y, w, 22, 8).fillAndStroke("#edf3ff", "#d5e2ff");
  doc.fillColor("#1a3878").font("Helvetica-Bold").fontSize(10.8).text(text, x + 10, y + 6);
  doc.y = y + 28;
}

function drawCover() {
  const x = doc.page.margins.left;
  const y = doc.page.margins.top;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const h = 170;

  doc.roundedRect(x, y, w, h, 14).fill("#1f5eff");
  doc.roundedRect(x + 8, y + 8, w - 16, h - 16, 10).fill("#2f75ff");
  doc.roundedRect(x + 16, y + 16, w - 32, h - 32, 8).fill("#428cff");

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(30).text("SinalTech", x + 26, y + 34);
  doc.fontSize(19).text("Manual do Sistema Multi-School", x + 26, y + 72);
  doc.font("Helvetica").fontSize(11).fillColor("#eaf2ff").text(
    "Guia completo de configuracao, uso, permissao, operacao e monitoramento",
    x + 26,
    y + 106
  );
  doc.font("Helvetica").fontSize(10).fillColor("#d9e9ff").text(
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    x + 26,
    y + 132
  );
  doc.y = y + h + 16;
}

function drawArchitectureDiagram() {
  ensureSpace(220);
  const x = doc.page.margins.left;
  const y = doc.y;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const h = 200;

  doc.roundedRect(x, y, w, h, 10).fillAndStroke("#ffffff", colors.line);

  const box = (bx, by, bw, bh, titleText, sub, fill = "#fff", stroke = colors.line) => {
    doc.roundedRect(bx, by, bw, bh, 8).fillAndStroke(fill, stroke);
    doc.fillColor(colors.ink).font("Helvetica-Bold").fontSize(11).text(titleText, bx + 8, by + 14, {
      width: bw - 16,
      align: "center",
    });
    doc.fillColor(colors.muted).font("Helvetica").fontSize(9).text(sub, bx + 10, by + 34, {
      width: bw - 20,
      align: "center",
    });
  };

  const b1 = { x: x + 20, y: y + 48, w: 145, h: 70 };
  const b2 = { x: x + 220, y: y + 38, w: 190, h: 92 };
  const b3 = { x: x + 465, y: y + 48, w: 145, h: 70 };
  const b4 = { x: x + 220, y: y + 145, w: 190, h: 40 };

  box(b1.x, b1.y, b1.w, b1.h, "Navegador", "Dashboard / Config / Admin");
  box(b2.x, b2.y, b2.w, b2.h, "API Express", "Auth, permissoes, regras", "#edf3ff", "#c7d8ff");
  box(b3.x, b3.y, b3.w, b3.h, "PostgreSQL", "Dados de negocio");
  box(b4.x, b4.y, b4.w, b4.h, "Operacao", "Alertas, auditoria, backup", "#f3f7ff", "#d7e3ff");

  const arrow = (x1, y1, x2, y2) => {
    doc.moveTo(x1, y1).lineTo(x2, y2).lineWidth(1.4).strokeColor("#355fb6").stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    const p1 = { x: x2 - 8 * Math.cos(a - 0.4), y: y2 - 8 * Math.sin(a - 0.4) };
    const p2 = { x: x2 - 8 * Math.cos(a + 0.4), y: y2 - 8 * Math.sin(a + 0.4) };
    doc.moveTo(x2, y2).lineTo(p1.x, p1.y).lineTo(p2.x, p2.y).closePath().fill("#355fb6");
  };

  arrow(b1.x + b1.w, b1.y + b1.h / 2, b2.x, b2.y + b2.h / 2);
  arrow(b2.x + b2.w, b2.y + b2.h / 2, b3.x, b3.y + b3.h / 2);
  arrow(b2.x + b2.w / 2, b2.y + b2.h, b4.x + b4.w / 2, b4.y);

  doc.y = y + h + 12;
}

function drawRoleTable() {
  ensureSpace(220);
  const x = doc.page.margins.left;
  const y = doc.y;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const h = 188;
  doc.roundedRect(x, y, w, h, 10).fillAndStroke("#ffffff", colors.line);

  const cols = [140, 120, 130, w - 390];
  const rows = [26, 54, 54, 54];
  let xx = x;
  let yy = y;

  const drawCell = (cx, cy, cw, ch, text, opts = {}) => {
    doc.rect(cx, cy, cw, ch).fillAndStroke(opts.fill || "#fff", colors.line);
    doc.fillColor(opts.color || colors.ink).font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.4).text(
      text,
      cx + 6,
      cy + 7,
      { width: cw - 12, align: opts.align || "left" }
    );
  };

  const headers = ["Perfil", "Escopo", "Escrita", "Observacoes"];
  xx = x;
  for (let i = 0; i < cols.length; i += 1) {
    drawCell(xx, yy, cols[i], rows[0], headers[i], { bold: true, fill: "#eef4ff", color: "#183c7c" });
    xx += cols[i];
  }

  const data = [
    ["superadmin", "Global", "Sim", "Gerencia tudo; aprova solicitacoes; simula usuarios"],
    ["admin_escola", "1 escola", "Sim", "Escreve na propria escola; aprova apenas se permitido"],
    ["somente_leitura", "1 escola", "Nao", "Uso operacional; sem alteracoes de dados"],
  ];

  yy = y + rows[0];
  data.forEach((line) => {
    xx = x;
    for (let i = 0; i < cols.length; i += 1) {
      const color = i === 2 ? (line[i] === "Sim" ? colors.ok : colors.bad) : colors.ink;
      drawCell(xx, yy, cols[i], rows[1], line[i], { color });
      xx += cols[i];
    }
    yy += rows[1];
  });
  doc.y = y + h + 12;
}

function drawApprovalFlow() {
  ensureSpace(220);
  const x = doc.page.margins.left;
  const y = doc.y;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const h = 200;

  doc.roundedRect(x, y, w, h, 10).fillAndStroke("#ffffff", colors.line);

  const box = (bx, by, bw, bh, fill, stroke, t1, t2) => {
    doc.roundedRect(bx, by, bw, bh, 8).fillAndStroke(fill, stroke);
    doc.fillColor(colors.ink).font("Helvetica-Bold").fontSize(10).text(t1, bx + 8, by + 14, {
      width: bw - 16,
      align: "center",
    });
    if (t2) {
      doc.fillColor(colors.muted).font("Helvetica").fontSize(8.8).text(t2, bx + 10, by + 32, {
        width: bw - 20,
        align: "center",
      });
    }
  };

  const b1 = { x: x + 20, y: y + 64, w: 130, h: 56 };
  const b2 = { x: x + 190, y: y + 52, w: 190, h: 80 };
  const b3 = { x: x + 430, y: y + 30, w: 170, h: 72 };
  const b4 = { x: x + 430, y: y + 122, w: 170, h: 58 };

  box(b1.x, b1.y, b1.w, b1.h, "#fff", colors.line, "Salvar mudanca", "horario/template/backup");
  box(b2.x, b2.y, b2.w, b2.h, "#fff", colors.line, "Tem config_auto_approve_changes?", "decisao por permissao");
  box(b3.x, b3.y, b3.w, b3.h, "#e8f8ef", "#98dbb8", "SIM", "publica na hora (approved)");
  box(b4.x, b4.y, b4.w, b4.h, "#fff7ea", "#f0cf95", "NAO", "solicitacao pendente");

  const arrow = (x1, y1, x2, y2, c = "#355fb6") => {
    doc.moveTo(x1, y1).lineTo(x2, y2).lineWidth(1.4).strokeColor(c).stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    const p1 = { x: x2 - 7 * Math.cos(a - 0.42), y: y2 - 7 * Math.sin(a - 0.42) };
    const p2 = { x: x2 - 7 * Math.cos(a + 0.42), y: y2 - 7 * Math.sin(a + 0.42) };
    doc.moveTo(x2, y2).lineTo(p1.x, p1.y).lineTo(p2.x, p2.y).closePath().fill(c);
  };

  arrow(b1.x + b1.w, b1.y + b1.h / 2, b2.x, b2.y + b2.h / 2);
  arrow(b2.x + b2.w, b2.y + 25, b3.x, b3.y + 22, colors.ok);
  arrow(b2.x + b2.w, b2.y + 58, b4.x, b4.y + 25, colors.warn);
  doc.fillColor(colors.ok).font("Helvetica-Bold").fontSize(8.7).text("SIM", b2.x + b2.w + 7, b2.y + 10);
  doc.fillColor(colors.warn).font("Helvetica-Bold").fontSize(8.7).text("NAO", b2.x + b2.w + 7, b2.y + 66);
  doc.y = y + h + 12;
}

function writePermissionsCatalog() {
  subtitle("Catalogo de permissoes");
  paragraph("As permissoes sao divididas em menus e funcoes. No cadastro/edicao de usuario, o sistema aplica heranca do perfil e permite override.");

  cardHeader("Menus");
  ["dashboard", "config", "schools", "users", "audit"].forEach((x) => bullet(x));
  doc.moveDown(0.3);

  cardHeader("Funcoes do Dashboard");
  [
    "dashboard_manual_section",
    "dashboard_manual_play",
    "dashboard_last_signal",
    "dashboard_next_signal",
    "dashboard_schedule_interface",
    "dashboard_database_status",
    "dashboard_open_alerts",
    "dashboard_schools_without_schedule",
    "dashboard_monitor_alerts",
    "dashboard_operational_history",
  ].forEach((x) => bullet(x));
  doc.moveDown(0.3);

  cardHeader("Funcoes de Configuracao");
  [
    "config_schedule_write",
    "config_approve_changes",
    "config_auto_approve_changes",
    "config_templates",
    "config_backup_export",
    "config_backup_import",
    "config_backup_restore",
  ].forEach((x) => bullet(x));
  doc.moveDown(0.3);

  cardHeader("Funcoes de Usuarios e Auditoria");
  ["users_create", "users_edit", "users_disable", "users_reset_password", "audit_view"].forEach((x) => bullet(x));
  doc.moveDown(0.3);
}

function writeEnvTable() {
  subtitle("Variaveis de ambiente");
  paragraph("Configure o ambiente antes de subir a API.");

  const entries = [
    ["PORT", "Porta local da API", "3000"],
    ["DATABASE_URL", "Conexao completa PostgreSQL", "Obrigatoria se nao usar DB_*"],
    ["DB_HOST", "Host do banco", "Alternativa ao DATABASE_URL"],
    ["DB_PORT", "Porta do banco", "5432 ou 6543 (pooler)"],
    ["DB_NAME", "Nome do banco", "postgres"],
    ["DB_USER", "Usuario do banco", "postgres / pooler user"],
    ["DB_PASSWORD", "Senha do banco", "Obrigatoria com DB_*"],
    ["DB_DNS_SERVERS", "Fallback DNS", "8.8.8.8,1.1.1.1"],
    ["JWT_SECRET", "Segredo dos tokens", "Obrigatorio em producao"],
    ["JWT_EXPIRES_IN", "Expiracao token principal", "12h"],
    ["SIMULATION_TOKEN_TTL", "Expiracao token simulacao", "30m"],
    ["DEFAULT_ADMIN_*", "Seed inicial do superadmin", "Usado so se nao houver usuarios"],
    ["MONITOR_INTERVAL_MS", "Intervalo sweep monitor", "300000"],
    ["DAILY_BACKUP_INTERVAL_MS", "Intervalo backup diario", "86400000"],
  ];

  ensureSpace(320);
  const x = doc.page.margins.left;
  const y = doc.y;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const cols = [165, 220, w - 385];
  const rowH = 21;
  const tableH = rowH * (entries.length + 1);
  doc.roundedRect(x, y, w, tableH, 8).fillAndStroke("#fff", colors.line);

  let yy = y;
  const drawRow = (a, b, c, head = false) => {
    let xx = x;
    const fill = head ? "#eef4ff" : "#fff";
    const font = head ? "Helvetica-Bold" : "Helvetica";
    [a, b, c].forEach((txt, i) => {
      doc.rect(xx, yy, cols[i], rowH).fillAndStroke(fill, colors.line);
      doc.fillColor(head ? "#15387a" : colors.ink).font(font).fontSize(8.4).text(txt, xx + 6, yy + 6, {
        width: cols[i] - 10,
      });
      xx += cols[i];
    });
    yy += rowH;
  };

  drawRow("Variavel", "Descricao", "Observacao", true);
  entries.forEach((line) => drawRow(line[0], line[1], line[2]));
  doc.y = y + tableH + 12;
}

function writeMenuUsage() {
  subtitle("Guia de uso por menu");

  cardHeader("Dashboard");
  bullet("Visualizar ultimo e proximo sinal.");
  bullet("Acionamento manual de audio, se permitido.");
  bullet("Status do banco, alertas e escolas sem horario.");
  bullet("Grafico de historico operacional com filtro de escola.");

  cardHeader("Configuracoes");
  bullet("Selecionar escola e periodo.");
  bullet("Cadastrar, editar e remover horarios.");
  bullet("Aplicar templates.");
  bullet("Exportar, importar e restaurar backup.");
  bullet("Gerenciar solicitacoes de mudanca.");

  cardHeader("Escolas");
  bullet("Criar, editar e desativar escola.");
  bullet("A seta da lista redireciona para configuracoes da escola.");

  cardHeader("Usuarios");
  bullet("Criar/editar/desativar usuario.");
  bullet("Definir permissoes por menu e funcao.");
  bullet("Aplicar presets e visualizar permissoes efetivas.");
  bullet("Simular login de usuario (superadmin).");

  cardHeader("Auditoria");
  bullet("Filtrar logs por escola, usuario, acao e periodo.");
  bullet("Rastrear alteracoes e eventos operacionais.");
}

function writeApiSummary() {
  subtitle("API de referencia");
  paragraph("Principais endpoints disponiveis no backend.");
  const groups = [
    ["Sistema", ["GET /api/health"]],
    ["Auth", ["POST /api/auth/login", "GET /api/auth/me", "POST /api/auth/change-password", "POST /api/auth/simulate/user/:id"]],
    ["Usuarios", ["GET /api/auth/users", "POST /api/auth/users", "PATCH /api/auth/users/:id", "DELETE /api/auth/users/:id", "POST /api/auth/users/:id/reset-password"]],
    ["Escolas e Horarios", ["GET/POST/PATCH/DELETE /api/schools", "GET /api/schools/:id/schedule", "PUT /api/schools/:id/schedule"]],
    ["Aprovacoes", ["GET /api/schools/:id/change-requests", "POST /api/change-requests/:id/approve", "POST /api/change-requests/:id/reject"]],
    ["Templates", ["GET /api/templates", "POST /api/templates", "POST /api/templates/:id/clone-to-school"]],
    ["Backups", ["GET /api/schools/:id/backup", "GET /api/schools/:id/backups", "GET /api/schools/:id/backups/:backupId", "POST /api/schools/:id/restore", "POST /api/schools/:id/restore-backup"]],
    ["Operacao", ["GET /api/alerts", "PATCH /api/alerts/:id/resolve", "POST /api/monitor/playback-error", "GET /api/monitor/status", "GET /api/monitor/history"]],
  ];

  groups.forEach(([name, lines]) => {
    cardHeader(name);
    lines.forEach((l) => bullet(l));
  });
}

function writeTroubleshooting() {
  subtitle("Troubleshooting");
  bullet("EADDRINUSE: porta ja em uso. Finalizar processo antigo ou alterar PORT.");
  bullet("database_unavailable: validar conexao, credenciais, SSL e firewall.");
  bullet("simulation_read_only: sessao de simulacao bloqueia escrita no backend.");
  bullet("permission_denied: revisar permissao efetiva do usuario (perfil + override).");
  bullet("api_route_not_found: confirmar rota, deploy e handler serverless.");
}

function writeChecklist() {
  subtitle("Checklist diario");
  cardHeader("Inicio do dia");
  bullet("Validar /api/health.");
  bullet("Conferir dashboard de alertas.");
  bullet("Checar escolas sem horario.");

  cardHeader("Durante o dia");
  bullet("Monitorar falhas de toque.");
  bullet("Aprovar pendencias manuais, se aplicavel.");
  bullet("Revisar eventos de auditoria importantes.");

  cardHeader("Fim do dia");
  bullet("Verificar backup diario.");
  bullet("Resolver alertas em aberto.");
  bullet("Conferir tendencia no historico operacional.");
}

drawCover();
title("1) Visao geral");
paragraph(
  "O SinalTech Multi-School centraliza o gerenciamento de sinais para varias escolas em um unico sistema. O acesso e controlado por perfil e permissoes granulares, com auditoria completa e monitoramento operacional."
);
bullet("Multi-escola com escopo por usuario.");
bullet("Permissoes por menu e por funcao.");
bullet("Fluxo de aprovacao manual e autoaprovacao de mudancas.");
bullet("Backups, templates e restauracao.");
bullet("Logs de auditoria e alertas operacionais.");

title("2) Arquitetura do sistema");
drawArchitectureDiagram();

title("3) Perfis de acesso");
drawRoleTable();

title("4) Fluxo de aprovacao de mudancas");
drawApprovalFlow();

title("5) Configuracao tecnica");
writeEnvTable();

title("6) Catalogo de permissoes");
writePermissionsCatalog();

doc.addPage();
title("7) Operacao do painel");
writeMenuUsage();

title("8) API e integracoes");
writeApiSummary();

title("9) Suporte operacional");
writeTroubleshooting();
writeChecklist();

doc.moveDown(1.2);
doc.font("Helvetica").fontSize(9).fillColor(colors.muted).text(
  "Manual gerado automaticamente por script local em docs/generate-manual-pdf.js",
  { align: "left" }
);

doc.end();

