# Deploy da Edge Function - Consultar CNPJ

## 1. Criar o projeto Supabase Local (se não existir)

```bash
# Na raiz do projeto bellog
cd bellog
npx supabase init
```

## 2. Estrutura de Arquivos

```
bellog/
├── supabase/
│   └── functions/
│       └── consult-cnpj/
│           └── index.ts       ← Edge Function
├── src/
│   └── services/
│       ├── cnpj-api.service.ts      ← Usado pelo frontend
│       └── cnpj-consult.service.ts ← Wrapper com fallback
```

## 3. Deploy da Edge Function

### Opção 1: Via CLI (recomendado)
```bash
# Deploy para produção
npx supabase functions deploy consult-cnpj

# Deploy para ambiente de staging
npx supabase functions deploy consult-cnpj --project-ref <PROJECT_REF>
```

### Opção 2: Via Dashboard Supabase
1. Acessar: https://supabase.com/dashboard
2. Selecionar projeto
3. Ir para: Edge Functions → New Function
4. Criar função `consult-cnpj`
5. Colar o código de `supabase/functions/consult-cnpj/index.ts`

## 4. Variáveis de Ambiente

A Edge Function usa:
- `SUPABASE_URL` - já configurado automaticamente
- `SUPABASE_ANON_KEY` - já configurado automaticamente

Não precisa de variáveis adicionais.

## 5. Testar a Edge Function

```bash
# Via supabase CLI
npx supabase functions invoke consult-cnpj --json --body '{"cnpj": "43297315000155"}'
```

## 6. Código da Edge Function

O código está em: `supabase/functions/consult-cnpj/index.ts`

```typescript
// Resume:
// - Recebe CNPJ via POST
// - Consulta API da Receita Federal
// - Retorna dados da empresa ou erro
```

## 7. Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FLUXO COM EDGE FUNCTION                       │
└─────────────────────────────────────────────────────────────────────┘

Frontend                          Edge Function                    API Receita
   │                                    │                               │
   │  1. Importa XML                   │                               │
   │  2. Chama cnpj-api.service         │                               │
   │       ↓                            │                               │
   │  3. cnpj-consult.service           │                               │
   │       ↓                            │                               │
   │  4. supabase.functions.invoke      │                               │
   │       'consult-cnpj'               │                               │
   │                                    │  5. fetch()                  │
   │                                    │  receitanet.gov.br           │
   │                                    │       ↓                       │
   │                                    │  6. Retorna dados            │
   │                                    │       ↓                       │
   │  7. Recebe dados                   │                               │
   │       ↓                            │                               │
   │  8. Cria empresa + role + endereço  │                               │
   │       ↓                            │                               │
   │  9. Associa à nota fiscal          │                               │
```

## 8. Troubleshooting

### Erro: "Function not found"
```bash
# Verificar se a função existe
npx supabase functions list
```

### Erro: "Unauthorized"
```bash
# Regenerar anon key no dashboard do Supabase
# Settings → API → anon key
```

### Erro: "CORS" no browser
- A Edge Function já tem headers CORS configurados
- Se ainda der erro, verificar se o projeto está ativo

## 9. Quando a Edge Function não funcionar

O código tem fallback:
1. Tenta Edge Function → se falhar
2. Tenta API direta → se falhar
3. Cria empresa com CNPJ apenas (sem dados da Receita)

O fallback está em `cnpj-consult.service.ts`:
```typescript
export const fetchCompanyData = async (cnpj: string): Promise<CompanyData | null> => {
  // 1. Tenta Edge Function
  const edgeResult = await fetchCnpjFromEdgeFunction(cnpj)
  if (edgeResult) return edgeResult

  // 2. Fallback para API direta
  return fetchCnpjFromApi(cnpj)
}
```

## 10. Configuração de ambiente local

Para testar localmente:
```bash
# Iniciar Supabase local
npx supabase start

# A Edge Function estará disponível em
# http://localhost:54321/functions/v1/consult-cnpj
```