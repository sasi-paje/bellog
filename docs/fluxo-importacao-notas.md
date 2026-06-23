# Fluxo de Importação e Listagem de Notas Fiscais

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DE IMPORTAÇÃO DE NOTAS                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────────┐     ┌──────────────────────────────┐
│   Usuário    │────▶│  ImportNotesModal │────▶│   xml-import.service.ts    │
│  (UI)        │     │  (seleciona XML)  │     │   (parseNFeXml)            │
└──────────────┘     └──────────────────┘     └──────────────┬───────────────┘
                                                            │
                           ┌────────────────────────────────┤
                           ▼                                ▼
                ┌──────────────────────┐       ┌─────────────────────────────┐
                │  Fornecedor (emit)   │       │  Destino (dest)            │
                │  CNPJ do XML         │       │  CNPJ do XML               │
                └──────────┬───────────┘       └──────────────┬──────────────┘
                           │                                   │
                           ▼                                   ▼
                ┌─────────────────────────────────────────────────────────────────┐
                │                    cnpj-api.service.ts                        │
                │                    findOrCreateCompany(cnpj, roleType)         │
                └─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │  SUPPLIER (fornecedor)        │  DESTINATION (destino)       │
        └───────────────────┘           └───────────────────┘
                    │                               │
                    ▼                               ▼
        ┌─────────────────────────────────────────────────────────────────────┐
        │                   company.service.ts                                 │
        │                   create() + createRole() + createAddress()          │
        └─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────────────────┐
        │                      Database Tables                                 │
        │  ┌──────────────────────┐  ┌──────────────────────────────────┐   │
        │  │ master_person_company │  │ rel_person_company_role_type     │   │
        │  │ - cnpj               │  │ - id_company                    │   │
        │  │ - legal_name         │  │ - id_company_role_type           │   │
        │  │ - trade_name         │  │ - is_test                        │   │
        │  │ - email              │  └──────────────────────────────────┘   │
        │  │ - phone              │  ┌──────────────────────────────────┐   │
        │  └──────────────────────┘  │ master_person_company_address  │   │
        │  ┌──────────────────────┐  │ - street, city, state, etc.    │   │
        │  │ trx_fiscal_invoice   │  └──────────────────────────────────┘   │
        │  │ - invoice_number     │                                          │
        │  │ - id_supplier_company│                                          │
        │  │ - id_customer_company│                                         │
        │  └──────────────────────┘                                          │
        └─────────────────────────────────────────────────────────────────────┘
```

## 1. Services Envolvidos

### 1.1 xml-import.service.ts
**Responsabilidade**: Parse do XML e orchestration do fluxo

```typescript
// Funções principais:
- parseNFeXml(content: string): XmlInvoiceData | null
- importFromXml(files: File[]): Promise<{ success: number; failed: number }>

// Fluxo:
// 1. Ler arquivo XML
// 2. Parsear dados da nota (nNF, serie, chNFe, emit CNPJ, dest CNPJ, pesos, etc)
// 3. Para cada CNPJ (fornecedor e destino):
//    - Chamar cnpjApiService.findOrCreateCompany(cnpj, roleType)
// 4. Inserir trx_fiscal_invoice com ids das empresas
```

### 1.2 cnpj-api.service.ts
**Responsabilidade**: Buscar/criar empresa por CNPJ

```typescript
// Funções principais:
- findCompanyByCnpj(cnpj: string): Promise<number | null>
  // Busca empresa existente no banco por CNPJ

- fetchCnpjFromApi(cnpj: string): Promise<CompanyData | null>
  // Consulta API externa (Receitanet) - opcional

- createCompany(companyData: CompanyData, roleTypeCode?: string): Promise<number | null>
  // Cria empresa + endereço + role relationship

- addRoleToCompany(companyId: number, roleTypeCode: string): Promise<void>
  // Adiciona role a empresa existente

- findOrCreateCompany(cnpj: string, roleTypeCode?: string): Promise<number | null>
  // Orquestra: busca no banco → se não existir, cria
```

### 1.3 company.service.ts
**Responsabilidade**: CRUD de empresas

```typescript
// Funções principais:
- create(data: CompanyFormData): Promise<CompanyWithAddress>
- update(id: string, data: Partial<CompanyFormData>): Promise<CompanyWithAddress>
- delete(id: string): Promise<void>
- getById(id: string): Promise<CompanyWithAddress | null>
- list(params?: ListParams): Promise<CompanyWithAddress[]>
- listDeliveryLocations(): Promise<CompanyOption[]>
- listSuppliersByRole(): Promise<CompanyOption[]>
- listByRoleType(roleTypeCode: string): Promise<CompanyOption[]>
```

### 1.4 fiscal-invoice.service.ts
**Responsabilidade**: CRUD de notas fiscais

```typescript
// Funções principais:
- list(params?: ListParams): Promise<{ data: InvoiceListItem[]; total: number }>
- getById(id: string): Promise<InvoiceListItem | null>
- getByRouteId(routeId: string): Promise<InvoiceListItem[]>
- createFromForm(data: CreateInvoiceFormData): Promise<void>
- update(id: string, data: Partial<UpdateInvoiceData>): Promise<void>
```

---

## 2. Estrutura de Dados

### 2.1 XML Invoice Data (do parsing)
```typescript
interface XmlInvoiceData {
  invoice_number: string      // nNF
  serie?: string              // serie
  invoice_access_key?: string // chNFe
  supplier_doc?: string      // emit -> CNPJ
  customer_doc?: string       // dest -> CNPJ
  box_quantity?: number       // qCom
  gross_weight?: number      // pesoB
  net_weight?: number        // pesoL
  invoice_amount?: number    // vNF
  invoice_issue_date?: string // dhEmi ou dEmi
}
```

### 2.2 Company Data (para API)
```typescript
interface CompanyData {
  cnpj: string
  razao_legal: string
  nome_fantasia?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
  telefone?: string
  email?: string
}
```

### 2.3 Invoice List Item (para UI)
```typescript
interface InvoiceListItem {
  id: string
  invoice_number: string
  serie?: string
  value: number
  weight: number
  gross_weight?: number
  volume: number
  attempt_number?: number
  issue_date?: string
  status?: string
  status_description?: string
  route_number?: string
  supplier_name?: string      // nome do fornecedor (via join)
  destination_name?: string   // nome do destino (via join)
  is_active: boolean
  id_customer_company?: number
  id_supplier_company?: number
}
```

---

## 3. Fluxo Detalhado de Importação

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        IMPORTAÇÃO DE XML                                        │
└─────────────────────────────────────────────────────────────────────────────────┘

1. Usuário seleciona arquivo(s) XML no ImportNotesModal
   │
   ▼
2. xml-import.service.importFromXml(files)
   │
   ▼
3. Para cada arquivo:
   │
   ├── a) Ler conteúdo do arquivo
   │
   ├── b) parseNFeXml(content)
   │       └─> Extrai dados do XML (nota, fornecedor, destino, pesos)
   │
   ├── c) Processar FORNECEDOR (supplier_doc)
   │       └─> cnpjApiService.findOrCreateCompany(cnpj, 'SUPPLIER')
   │           │
   │           ├── findCompanyByCnpj(cnpj)
   │           │       └─> SELECT id FROM master_person_company WHERE cnpj = ?
   │           │
   │           └── Se não encontrar:
   │               └─> createCompany(data, 'SUPPLIER')
   │                   │
   │                   ├── INSERT master_person_company
   │                   │
   │                   ├── INSERT master_person_company_address (se API retornou dados)
   │                   │
   │                   └── INSERT rel_person_company_role_type
   │                           (roleType = 'SUPPLIER', is_test = true)
   │
   ├── d) Processar DESTINO (customer_doc)
   │       └─> cnpjApiService.findOrCreateCompany(cnpj, 'DESTINATION')
   │           └─> Mesmo fluxo, mas com roleType = 'DESTINATION'
   │
   ├── e) Verificar se nota já existe
   │       └─> SELECT id FROM trx_fiscal_invoice
   │           WHERE invoice_number = ? AND invoice_series = ? AND is_test = ?
   │
   ├── f) Se não existe:
   │       └─> INSERT trx_fiscal_invoice
   │           ├── id_supplier_company = ID do fornecedor
   │           ├── id_customer_company = ID do destino
   │           └── demais campos da nota
   │
   └── g) Resultado: { success: N, failed: N }
```

---

## 4. Fluxo de Listagem

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         LISTAGEM DE NOTAS                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

1. Componente NotesPage chama fiscalInvoiceService.list(params)
   │
   ▼
2. fiscal-invoice.service.ts list(params)
   │
   ├── a) Query trx_fiscal_invoice com filtros
   │       WHERE is_test = ? AND is_active = true
   │       + paginação + search + date filters
   │
   ├── b) Para cada nota, extrair supplierIds e destIds
   │
   ├── c) Query master_person_company para supplierIds
   │       └─> Buscar trade_name para cada fornecedor
   │
   ├── d) Query master_person_company para destIds
   │       └─> Buscar trade_name para cada destino
   │
   └── e) Mapear resultado
           └── supplier_name = trade_name do fornecedor
           └── destination_name = trade_name do destino
   │
   ▼
3. Retornar { data: InvoiceListItem[], total: number }
   │
   ▼
4. NotesPage renderiza NotesTable
   │
   ▼
5. NotesTable exibe:
   │── Column "Fornecedor" → supplier_name
   │── Column "Destino" → destination_name
   └── Demais colunas da nota
```

---

## 5. Tabelas do Banco

### 5.1 master_person_company
```sql
-- Dados principais da empresa
id          -- PK
cnpj        -- CNPJ único por is_test
legal_name  -- Razão Social
trade_name  -- Nome Fantasia
email       -- Email
phone       -- Telefone
is_active   -- true
is_test     -- conforme ambiente (true para dev/test)
```

### 5.2 master_person_company_address
```sql
-- Endereço da empresa
id                     -- PK
id_company             -- FK -> master_person_company
id_company_address_type-- FK -> ref_person_company_address_type
street                 -- logradouro
street_number          -- número
complement             -- complemento
district               -- bairro
city                   -- cidade
state                  -- UF
zip_code               -- CEP
is_primary            -- true (endereço principal)
is_active             -- true
is_test               -- conforme ambiente
```

### 5.3 rel_person_company_role_type
```sql
-- Relação empresa <-> role (fornecedor/destino)
id                     -- PK
id_company             -- FK -> master_person_company
id_company_role_type   -- FK -> ref_person_company_role_type
is_active             -- true
is_test               -- conforme ambiente
```

### 5.4 ref_person_company_role_type
```sql
-- Catálogo de roles
id          -- PK
code        -- 'SUPPLIER' ou 'DESTINATION'
description-- Descrição
is_active   -- true
is_test    -- conforme ambiente
```

### 5.5 trx_fiscal_invoice
```sql
-- Nota fiscal
id                     -- PK
invoice_number         -- Número da nota
invoice_series         -- Série
invoice_issue_date     -- Data de emissão
id_supplier_company    -- FK -> master_person_company (fornecedor)
id_customer_company    -- FK -> master_person_company (destino)
box_quantity           -- Quantidade
gross_weight           -- Peso bruto
net_weight             -- Peso líquido
invoice_amount         -- Valor
is_active              -- true
is_test               -- conforme ambiente
```

---

## 6. Roles de Empresa

```typescript
// Códigos de role para empresas
const CompanyRoleType = {
  SUPPLIER: 'SUPPLIER',    // Fornecedor/Emissor da nota
  DESTINATION: 'DESTINATION', // Destinatário/Local de entrega
} as const

// A consulta usa:
// listByRoleType('SUPPLIER') → lista fornecedores
// listByRoleType('DESTINATION') → lista destinos
```

---

## 7. UI - Renderização

### 7.1 Notas Page (listagem)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Notas                                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┬──────────┬───────────┬───────────┬───────────┬──────────┐       │
│  │ N° Nota │ Série    │ Fornecedor│ Destino   │ Peso      │ Volume   │       │
│  ├─────────┼──────────┼───────────┼───────────┼───────────┼──────────┤       │
│  │ 1848    │ -        │ TREBESCHI │ 060572... │ 2.000 kg  │ 2        │       │
│  │ 338271  │ -        │ VIGOR     │ 074439... │ 15.000 kg │ 20       │       │
│  │ 81726   │ -        │ PETRUZ   │ 074814... │ 1.500 kg  │ 5        │       │
│  └─────────┴──────────┴───────────┴───────────┴───────────┴──────────┘       │
│                                                                              │
│  Fornecedor: vem de id_supplier_company → trade_name                        │
│  Destino: vem de id_customer_company → trade_name                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Dropdowns (Create/Edit)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Criar Nota                                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Fornecedor:  [─────────────▼─────────────]                                 │
│               │ GDC ALIMENTOS S.A                         │                │
│               │ TREBESCHI LTDA                             │                │
│               │ VIGOR SA                                   │                │
│               └──────────────────────────────────────────┘                │
│                                                                              │
│  Local de Entrega: [─────────────▼─────────────]                           │
│               │ 06057223032103                           │                │
│               │ 07443925000741                            │                │
│               └──────────────────────────────────────────┘                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Resumo

| Etapa | Service | Ação |
|-------|---------|------|
| 1. Parse XML | xml-import.service | Extrai dados do XML |
| 2. Processa CNPJ Fornecedor | cnpj-api.service | Busca/cria empresa com role SUPPLIER |
| 3. Processa CNPJ Destino | cnpj-api.service | Busca/cria empresa com role DESTINATION |
| 4. Persiste Nota | xml-import.service | Insere trx_fiscal_invoice |
| 5. Lista Notas | fiscal-invoice.service | Query com JOINs para nomes |
| 6. Exibe UI | NotesPage/NotesTable | Renderiza supplier_name e destination_name |