# SinalTech Multi-School

Painel web com backend Node.js + PostgreSQL para gerenciar sinais de varias escolas com autenticacao, perfis, auditoria e monitoramento.

## 1. Configurar ambiente

1. Copie `.env.example` para `.env`.
2. Preencha:
- Banco: `DATABASE_URL` (ou `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).
- Seguranca: `JWT_SECRET`.
- Opcional: `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `MONITOR_INTERVAL_MS`.

## 2. Criar tabelas

Execute o SQL de [`db/schema.sql`](./db/schema.sql).

Observacao: o `server.js` tambem tenta garantir o schema automaticamente no startup.

## 3. Instalar e executar

```bash
npm install
npm run start
```

Aplicacao: `http://localhost:3000`

## Perfis de acesso

- `superadmin`: gerencia usuarios, escolas, horarios, templates, backups, alertas e monitoramento.
- `admin_escola`: gerencia apenas a propria escola.
- `somente_leitura`: visualiza dados da propria escola, sem alteracoes.

## Endpoints principais

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password` (self-service)
- `GET /api/auth/users` (superadmin/admin_escola)
- `POST /api/auth/users` (superadmin/admin_escola, com escopo)
- `PATCH /api/auth/users/:id` (superadmin/admin_escola, com escopo)
- `DELETE /api/auth/users/:id` (soft delete/desativacao)
- `POST /api/auth/users/:id/reset-password` (superadmin)

### Escolas e horarios
- `GET /api/schools`
- `POST /api/schools` (superadmin)
- `PATCH /api/schools/:id` (superadmin)
- `DELETE /api/schools/:id` (superadmin, soft delete)
- `GET /api/schools/:id/schedule`
- `PUT /api/schools/:id/schedule`

### Templates
- `GET /api/templates`
- `POST /api/templates`
- `POST /api/templates/:id/clone-to-school`

### Backup / restore
- `GET /api/schools/:id/backup`
- `POST /api/schools/:id/restore`
- `GET /api/schools/:id/backups` (historico automatico/manual)
- `GET /api/schools/:id/backups/:backupId` (preview)
- `POST /api/schools/:id/restore-backup` (restaura snapshot selecionado)

### Auditoria / alertas / monitoramento
- `GET /api/audit-logs` (filtros: `schoolId`, `userId`, `action`, `from`, `to`)
- `GET /api/alerts`
- `PATCH /api/alerts/:id/resolve`
- `POST /api/monitor/playback-error`
- `GET /api/monitor/status` (global para superadmin, escopo escola para demais)
- `GET /api/health` (status da API + banco)

## Troubleshooting

- Se `/api/health` retornar `database_unavailable`, confira `detail` (ambiente local).
- Se o erro for `ENOTFOUND`, pode ser DNS local. Use `DB_DNS_SERVERS`.
- Em algumas redes, prefira Supabase **Transaction Pooler** ao host direto `db.<project-ref>.supabase.co`.
