
-- =============================================================================
-- SISTEMA DE MANIFESTO OPERACIONAL (SMO) - SCRIPT DE ESTRUTURA COMPLETO V2.5
-- =============================================================================

-- 1. TABELA PRINCIPAL DE MONITORAMENTO (SMO_Sistema)
CREATE TABLE IF NOT EXISTS public."SMO_Sistema" (
    id bigint primary key generated always as identity,
    "ID_Manifesto" text unique not null,
    "Usuario_Sistema" text,
    "CIA" text not null,
    "Manifesto_Puxado" text,
    "Manifesto_Recebido" text,
    "Manifesto_Iniciado" text,
    "Manifesto_Disponivel" text,
    "Manifesto_em_Conferência" text,
    "Manifesto_Pendente" text,
    "Manifesto_Completo" text,
    "Representante_CIA" text,
    "Manifesto_Entregue" text,
    "Status" text default 'Manifesto Recebido',
    "Turno" text,
    "Carimbo_Data/HR" text,
    "Usuario_Ação" text,
    "Usuario_Operação" text,
    created_at timestamptz default now()
);

-- 2. TABELA DE AUDITORIA E LOGS (SMO_Operacional)
CREATE TABLE IF NOT EXISTS public."SMO_Operacional" (
    id bigint primary key generated always as identity,
    "ID_Manifesto" text not null,
    "Ação" text not null,
    "Usuario" text not null,
    "Justificativa" text,
    "Created_At_BR" text,
    created_at timestamptz default now()
);

-- 3. TABELA DE PERFIS DE ACESSO (Cadastro_de_Perfil)
CREATE TABLE IF NOT EXISTS public."Cadastro_de_Perfil" (
    id bigint primary key generated always as identity,
    "Usuario" text unique not null,
    "Senha" text not null,
    "Nome_Completo" text,
    "sesson_id" text,
    "Session_Data/HR" text,
    created_at timestamptz default now()
);

-- 4. TABELA DE FUNCIONÁRIOS (Funcionarios_WFS)
CREATE TABLE IF NOT EXISTS public."Funcionarios_WFS" (
    id bigint primary key generated always as identity,
    "Nome" text not null,
    "Cargo" text,
    "Ativo" boolean default true,
    created_at timestamptz default now()
);

-- 5. TABELA DE AVALIAÇÕES TÉCNICAS (SMO_Avaliacoes)
-- IMPORTANTE: A restrição UNIQUE em Nome_Funcionario resolve o erro 42P10
CREATE TABLE IF NOT EXISTS public."SMO_Avaliacoes" (
    id bigint primary key generated always as identity,
    "Nome_Funcionario" text UNIQUE not null,
    "Cargo" text,
    "Tentativa_1" integer,
    "Data_Tentativa_1" text,
    "Tentativa_2" integer,
    "Data_Tentativa_2" text,
    "Tentativa_3" integer,
    "Data_Tentativa_3" text,
    "Status" text, -- APROVADO / REPROVADO
    created_at timestamptz default now()
);
