# Bellog — Guia Técnico

## Stack

- React 19 + TypeScript 5 + Tailwind CSS 3
- Vite 8 (build e dev server)
- Supabase (PostgreSQL + Auth + Realtime + Storage)
- Zod (validação de formulários)
- Vitest + React Testing Library (testes)

## Comandos

```bash
npm run dev              # inicia dev server
npm run build            # build de produção (TypeScript + Vite)
npm run typecheck        # TypeScript sem emitir arquivos (tsc --noEmit)
npm run lint             # ESLint
npm run test             # Vitest em modo watch
npm run test:run         # Vitest single run (usado no CI)
npm run test:coverage    # Vitest com relatório de cobertura → ./coverage/
```

## CI e Coverage

### GitHub Actions — `.github/workflows/ci.yml`

Executa automaticamente em todo PR e em push para `master`, `main` ou `develop`.

Pipeline:
1. `npm run typecheck` — TypeScript sem erros
2. `npm run build` — build de produção sem erros
3. `npm run test:run` — 83/83 testes passando
4. `npm run test:coverage` — relatório de cobertura gerado

**Cobertura atual (linha de base):**

| Módulo | Statements | Branches | Funcs |
|---|---|---|---|
| `features/drivers` | ~42% | ~35% | ~44% |
| `features/vehicles` | ~37% | ~36% | ~50% |
| `shared/components` | ~48% | ~75% | ~50% |
| `features/companies` | ~20% | ~16% | ~16% |
| `apps/mobile/services` | ~10% | ~3% | ~11% |

> Coverage **não bloqueia** PR por meta ainda. O relatório é informativo.
> Pasta `coverage/` está no `.gitignore` — não vai para o repositório.

### Próximo passo de coverage

Depois de adicionar testes de mobile routes, uploads e XML import:
- Definir meta mínima por módulo em `vitest.config.ts` via `coverage.thresholds`
- Sugestão inicial: 60% para `/features/` críticas, 40% global

## Arquitetura

```
src/
├── apps/
│   ├── admin/       # AdminApp — web, Supabase Auth
│   └── mobile/      # MobileApp — token SASI (legado)
├── features/        # Serviços de dados compartilhados (source of truth)
├── modules/         # Módulos de UI por feature
├── hooks/           # Custom React hooks (consomem features/)
├── services/        # Serviços com lógica própria (email, storage, attachment, cnpj, mobile)
├── lib/             # Config Supabase + tipos do banco
├── shared/          # Componentes reutilizáveis
└── layouts/         # MainLayout, Sidebar
```

### Regra de organização

- **Nova lógica de dados** → `/features/<nome>/api/`
- **Novo módulo de UI** → `/modules/<nome>/`
- **Novo hook de estado** → `/hooks/use<Nome>.ts` consumindo `/features/`
- **`/services/`** contém apenas serviços com lógica própria sem equivalente em `/features/`:
  `email.service.ts`, `storage.service.ts`, `attachment.service.ts`,
  `cnpj-consult.service.ts`, `cnpj-provider.ts`, `mobile/`

## Convenção do banco de dados

| Prefixo | Uso |
|---|---|
| `master_*` | Entidades de negócio (empresas, veículos, motoristas, usuários) |
| `ref_*` | Catálogos/enums (status, tipos, categorias, motivos) |
| `trx_*` | Dados transacionais (rotas, notas fiscais, importações) |
| `rel_*` | Relacionamentos muitos-para-muitos (nota↔rota, motorista↔rota) |

### Campos padrão em todas as tabelas

- `is_active` (boolean) — use para ativar/inativar registros. **Nunca use DELETE direto.**
- `is_test` (boolean) — filtre `is_test = false` em produção. **Sempre incluir este filtro.**
- `created_at`, `updated_at`, `created_by`, `updated_by` — auditoria automática.

## Arquitetura de Permissões (Fase 2 — 2026-06-20)

### Dois eixos distintos

| Eixo | Controla | Tabela-fonte | Quem preenche |
|---|---|---|---|
| **Cargo** | **O QUE** o usuário pode fazer (ações) | `master_user_role_permission` | Tela Configurações > Cargos |
| **Usuário** | **ONDE** o usuário acessa (páginas) | `rel_user_role_page` | Tela Configurações > Usuários |

**Regra fundamental:** O Cargo nunca adiciona páginas ao usuário. O Cargo define as ações que o usuário poderá executar nas páginas que já recebeu.

### Fluxo de save do Usuário

`UsersPage.handleSaveUser` → RPC `save_user_page_access_from_role(p_user_id, p_role_id, p_page_ids, p_is_test)`

A RPC:
1. Valida usuário + cargo + páginas no ambiente informado
2. Calcula `can_*` a partir das permissões do cargo em `master_user_role_permission`
3. Faz DELETE + INSERT atômico em `rel_user_role_page`

### Fluxo de save do Cargo

`CargosPage.handleSaveCargo` → RPC `save_user_role_with_permissions(...)` → chama `sync_users_actions_by_role(p_role_id, p_is_test)`

`sync_users_actions_by_role` recalcula `can_*` em todos os registros `rel_user_role_page` dos usuários ativos desse cargo, sem adicionar nem remover páginas.

### Mapeamento de código de permissão → can_*

| Permissão (code) | can_view | can_create | can_edit | can_update | can_activate | can_inactivate |
|---|---|---|---|---|---|---|
| VIEW | ✅ | | | | | |
| CREATE | ✅ | ✅ | | | | |
| UPDATE | ✅ | | ✅ | ✅ | | |
| ACTIVATE | ✅ | | | | ✅ | |
| INACTIVATE | ✅ | | | | | ✅ |

### Serviços e RPCs envolvidos

| Arquivo | Exporta | Propósito |
|---|---|---|
| `features/users/api/user-page-access.service.ts` | `saveUserPageAccessFromRole` | Chama RPC de save |
| `supabase/migrations/202606200004_*.sql` | `save_user_page_access_from_role`, `sync_users_actions_by_role` | RPCs PL/pgSQL |
| `features/roles/api/save-cargo.service.ts` | `saveCargoWithPermissions` | Chama `save_user_role_with_permissions` |

### Regras do campo Permissão no Cargo

- Todo cargo **sempre** inclui a permissão VIEW/Visualizar.
- VIEW é localizado pelo campo `code = 'VIEW'` — **nunca por ID fixo**.
- O save usa o RPC `save_user_role_with_permissions(...)` — transacional.
- `master_user_role_permission` **não tem** `is_active`, `is_test` — não filtrar nesses campos ao inserir.

### Fase 3 (pendente)

Enforcement nos botões de ação e guards de rota com base em `rel_user_role_page.can_*`.  
Sidebar e `AdminApp` **não devem ser alterados** antes da Fase 3.

### Filtros de master_system_permission

Sempre usar `.eq('is_active', true).eq('is_test', false)` ao buscar permissões disponíveis.  
Função: `fetchActivePermissions()` em `features/roles/api/role-permissions.service.ts`.

### UserModal — páginas e ações

`UserModal` carrega páginas de `master_system_page` com `is_active=true` e `is_test` do ambiente via `getEnvironment()`.  
Quando um cargo é selecionado, exibe um preview somente-leitura das ações herdadas desse cargo.  
Se a query de páginas falhar, exibe `pagesError` e deixa o campo vazio. **Não há fallback hardcoded.**

## Regras importantes

### Status e referências

- **Nunca use ID fixo de status.** Busque sempre pelo `slug` ou `code` via query, pois IDs variam entre ambientes.
- **Nunca use fallback permissivo** para flags como `allows_route_edition` — se o campo for nulo, trate como `false`.

### Operações de banco

- **Não insira rota direto pelo frontend** sem passar por RPC quando houver função definida.
- **Não faça DELETE** — use `is_active = false` (soft-delete).
- **Use `is_test = false`** em todas as queries de produção.

### Autenticação

- **AdminApp**: Supabase Auth (`/apps/admin/App.tsx`). Ponto de entrada: `main.tsx` → `AdminApp`.
- **MobileApp**: token SASI via `services/mobile/` (legado). Ponto de entrada: `main.tsx` → `MobileApp` quando path começa com `/my-routes`, `/delivery`, `/chegada` ou `/arrival-client`.

### Supabase

- **Schema cache**: após alterar o schema do banco, execute `supabase db reset` ou aguarde a invalidação de cache antes de testar queries que usam novos campos.
- **Realtime**: usado em `hooks/useRealtime.ts` para sincronização de invoices e vehicles. Cuidado ao adicionar subscriptions — elas persistem enquanto o componente estiver montado.

## Email, convite e primeiro acesso (AWS SES)

Envio de email é feito por SMTP direto no AWS SES, via edge functions Deno.

### Edge functions

| Função | Papel | Autorização |
|---|---|---|
| `_shared/smtp-client.ts` | `SMTPClient`: handshake SMTP (TCP→EHLO→STARTTLS→TLS→AUTH LOGIN), `sendEmail()` e `testConnection()` | — |
| `send-email` | Envio genérico interno (MIME texto+HTML) | **apenas** `service_role_key` (chamada interna entre functions) |
| `invite-user` | Convida usuário: cria conta + registra em `master_system_user` + envia email | JWT válido + usuário ativo em `master_system_user` |
| `send-password-reset` | Reset de senha (rate limit + anti-enumeração) | público (`verify_jwt=false`) |
| `test-smtp-connection` | Testa credenciais SMTP sem enviar email | JWT válido + usuário ativo em `master_system_user` |

> `send-first-access-email` e `enviar-email` usam um **AWS Lambda HTTP separado** (não o SMTP). Não confundir com o caminho `send-email`/SMTP acima.

Todas com `verify_jwt = false` no `config.toml` — a validação é feita no código de cada função.

### Secrets necessárias (Supabase → Edge Functions → Secrets)

`SMTP_SERVER`, `SMTP_PORT` (587/STARTTLS), `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_SENDER_EMAIL` (verificado no SES), `FRONTEND_URL`.
As credenciais SMTP do SES são geradas em **SES → SMTP Settings** (diferentes das chaves IAM).
`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` são **injetadas automaticamente** — não configurar.

> Deploy das functions é **separado** do Vercel (que só publica o frontend): `supabase functions deploy <nome>`.

### Fluxo de convite + primeiro acesso (Opção B — senha temporária)

1. Admin convida em **Usuários → Novo** → `UsersPage.handleSaveUser` → `inviteUser()` (`features/email/api/email.service.ts`) → edge function `invite-user`.
2. `invite-user`: `auth.admin.createUser` com **senha temporária** (que também vira a senha real de login e é gravada em `user_metadata.temp_password`); faz upsert em `master_system_user`; retorna `user_id = master_system_user.id` (usado por `saveUserPageAccessFromRole`); envia email (template Bellog) com **email + senha temporária + link de login** via `send-email`/SMTP.
3. O convidado faz login com a senha temporária → `LoginPage` propaga `temp_password` + `needs_password_change` → `AdminApp` mostra `FirstAccessPage`.
4. `FirstAccessPage` valida a senha temporária, chama `supabase.auth.updateUser({ password })` e **limpa** `needs_password_change`/`temp_password`.

**Contratos a preservar:** `invite-user` deve retornar `user_id = master_system_user.id` (não o id do Auth); a linha em `master_system_user` precisa nascer com o `is_test` que o frontend envia (`is_test` no payload), senão `saveUserPageAccessFromRole` falha com "Usuário não encontrado".

**Tradeoff (Opção B):** a senha temporária trafega em texto no email e fica em `user_metadata` até a troca no primeiro acesso. Para endurecer, migrar para link de recovery nativo (`auth.admin.generateLink({ type: 'recovery' })`) — exige que `ForgotPasswordPage` entre no passo de formulário ao receber o callback `#access_token`.

**Hardening já aplicado:** `invite-user` sanitiza email (rejeita CR/LF e formato inválido) e nome (strip CR/LF) contra injeção de cabeçalho SMTP/MIME.

## Padrão de settings

As páginas de configuração em `modules/settings/pages/` seguem o padrão:

1. Hook `use<Entidade>` em `/hooks/` consumindo feature de `/features/`
2. Tabela com `SharedTable` + `AppIcon`
3. Drawer com formulário de criação/edição
4. Modal de confirmação para inativação
5. `Toggle` para ativar/inativar registros

## Testes

### Cobertura atual (83 testes / 6 arquivos)

| Arquivo | Testes | Coberturas |
|---|---|---|
| `src/modules/assign-notes/assign-notes.test.tsx` | 33 | buildRouteCard, addNote, notesAvailable, removeNote, allows_route_edition (fail-closed), capacidade |
| `src/features/vehicles/api/vehicle.service.test.ts` | 9 | canInactivateVehicle, setActive, create (placa duplicada) |
| `src/features/drivers/api/driver.service.test.ts` | 11 | canInactivateDriver, toggleActive, cpfExists (normalização CPF) |
| `src/features/companies/api/company.service.test.ts` | 16 | cnpjExists, canInactivateDestination, canInactivateSupplier, createWithAddress (CNPJ duplicado) |
| `src/apps/mobile/services/external-provider.api.test.ts` | 8 | getSasiTokenFromUrl, hasSasiToken |
| `src/shared/components/ErrorBoundary.test.tsx` | 3 | error boundary |
| `src/testing/factories.ts` | — | makeVehicle, makeDriver, makeCompany, makeDestination, makeSupplier, makeRoute, makeInvoice, makeRouteInvoice, makeRouteDeliveryStatus, makeRouteStatus, makePersonCompanyRoleType |

### Regras de cobertura de testes

- Testes co-localizados com o arquivo testado (sufixo `.test.ts` ou `.test.tsx`)
- Mocks de serviços apontam para `/features/<nome>` (não `/services/`)
- Factories em `src/testing/factories.ts` — usar `is_test: true`, IDs gerados por contador (sem IDs fixos)
- Mock de Supabase: usar `qb()` helper dentro de cada arquivo de teste (não compartilhado)
- `vi.clearAllMocks()` + `vi.mocked(getEnvironment).mockReturnValue('development')` em cada `beforeEach`
- Falha fechada (`fail-closed`): `allows_route_edition === true` — nunca tratar `null`/`undefined` como permissivo

### Padrão de mock Supabase em testes unitários

```typescript
vi.mock('../../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
  getEnvironment: vi.fn().mockReturnValue('development'),
}))

// Helper para criar mock encadeável + thenable
function qb(result) { /* ver vehicle.service.test.ts */ }

// Por teste: mockReturnValueOnce para múltiplas queries na mesma função
vi.mocked(supabase.from)
  .mockReturnValueOnce(qb({ data: vehicle, error: null }))  // 1ª query
  .mockReturnValueOnce(qb({ data: [], error: null }))       // 2ª query
```

### Nota sobre ESLint em arquivos de teste

Arquivos de teste com mock Supabase (`as any`) devem iniciar com:
```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
```
Os `as any` são necessários para o mock do query builder encadeado. Isso não afeta código de produção.

### Próximas recomendações para cobertura de testes

- Testes de rotas mobile (`my-routes.service.ts`) — motorista vê somente suas rotas
- Testes de upload (`storage.service.ts`) — bucket/path corretos para canhoto e NFD
- Testes de importação XML (`import.service.ts` ou similar)
- Configurar CI rodando `npm run build && npm run test` em cada PR
- Configurar `npm run test:coverage` e definir meta de cobertura por módulo

## N+1 queries conhecidas

- `hooks/useRouteHistory.ts`: faz fallback para `routeService.getHistory()` quando não há histórico na tabela — pode gerar queries adicionais em listas grandes.
- Verificar `delivery.service.ts` — refatoração em andamento para consolidar queries de entrega.

## Migração /services → /features e /apps — CONCLUÍDA ✅

A pasta `/services/` foi **removida completamente** em 2026-06-19. Todo código migrado para a arquitetura correta.

### Regra de dependência entre features

- `features/attachments` **pode** depender de `features/storage`
- `features/storage` **não pode** depender de `features/attachments` (storage é genérico)
- `modules/` **pode** importar de `apps/mobile/services/` apenas quando o módulo é exclusivo do MobileApp (ex: `arrival-client`)
- `apps/admin/` **não deve** depender de `apps/mobile/services/`

### Plano de migração — Histórico

**Etapa 1 — CNPJ** ✅ Concluída (2026-06-19)
- `cnpj-consult.service.ts` → movido para `features/cnpj/api/cnpj-consult.service.ts`
- `cnpj-provider.ts` → movido para `features/cnpj/api/cnpj-provider.ts`
- Imports atualizados em `features/cnpj/api/cnpj-api.service.ts` e `features/company-resolver/api/company-resolver.service.ts`

**Etapa 2 — Storage + Attachment** ✅ Concluída (2026-06-19)
- `storage.service.ts` → movido para `features/storage/api/storage.service.ts`
- `attachment.service.ts` → movido para `features/attachments/api/attachment.service.ts`
- Imports atualizados em: `modules/routes/components/RouteNoteDetail.tsx`, `modules/delivery/components/FiscalNoteModal.tsx`, `modules/delivery/presentation/components/FiscalNoteModal.tsx`, `modules/routes/components/OccurrenceDetailModal.tsx`

**Etapa 3 — Email** ✅ Concluída (2026-06-19)
- `email.service.ts` → movido para `features/email/api/email.service.ts`
- Import atualizado em `modules/users/UsersPage.tsx`

**Etapa 4 — Mobile** ✅ Concluída (2026-06-19)
- `services/mobile/` (7 arquivos) → movidos para `apps/mobile/services/`
- `driver.repository.ts` único import corrigido: `../../lib/supabase` → `../../../lib/supabase`
- `getSasiTokenFromUrl` adicionado ao `apps/mobile/services/index.ts` (não estava no index antigo)
- Import em `apps/mobile/App.tsx`: `../../services/mobile` → `./services`
- Import em `modules/arrival-client/services/arrival-client.service.ts`: `../../../services/mobile/external-provider.api` → `../../../apps/mobile/services`
- Pasta `/services/` removida completamente (ficou vazia)
- Build e testes verdes (23/23)

## Auditoria de mocks — CONCLUÍDA ✅ (2026-06-19)

**Resultado:** Nenhum mock vaza para runtime. Código de produção limpo.

### Removido
- 12 arquivos `.mock.ts` órfãos (não importados por nenhum arquivo de produção)
- `VITE_USE_MOCK_AUTH=true` removido do `.env` (nunca era lido)
- Pastas `data/` vazias removidas: `modules/settings/data/`, `modules/routes/data/`, `modules/notes/data/`, `modules/assign-notes/data/`, `shared/data/`

### Mocks legítimos mantidos
- `src/modules/assign-notes/assign-notes.test.tsx` — usa `vi.mock()` para services, dados inline locais. Correto.
- `src/shared/components/ErrorBoundary.test.tsx` — usa `vi.spyOn(console.error)`. Correto.

### Único ponto de atenção restante

## Fallback em UserModal

`modules/users/components/UserModal.tsx` tem um fallback com labels hardcoded (`Rotas`, `Notas`, `Usuários`...) que ativa quando a query `master_system_page` falha. Risco baixo (UI apenas, sem impacto em regra de negócio), mas deve ser monitorado quando a tabela for populada.
