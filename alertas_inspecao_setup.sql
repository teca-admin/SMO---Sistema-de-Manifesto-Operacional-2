-- =============================================================================
-- ALERTA DE INSPEÇÃO RAIO-X NA EXPEDIÇÃO (última linha de defesa)
-- Criado em: 06/08/2026
-- =============================================================================
-- Este script é ADITIVO: cria apenas objetos NOVOS no schema smo.
-- Nenhuma tabela, coluna, view ou função existente é alterada ou removida.
--
-- Fluxo:
--   robô PowerShell (TECA) --UPSERT--> Alertas_Inspecao --polling--> SMO (expedição)
--                                              ^
--                                    "CONFIRMO QUE VI" grava quem viu
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FILA DE ALERTAS
--    Uma linha por presença de carga puxada pendente de inspeção.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS smo."Alertas_Inspecao" (
    id                BIGSERIAL PRIMARY KEY,

    -- Identificação da carga (vem do TECAPLUS)
    presenca          TEXT NOT NULL,
    tipo_internacao   TEXT,
    internador        TEXT,
    hora_puxe         TEXT,

    -- Por que está sendo cobrada:
    --   'SEM_INSPECAO'            = sem foto no J:\ e sem justificativa no Sheets
    --   'ISENTA_SEM_JUSTIFICATIVA'= internador isento (Validação 03) mas sem justificar
    motivo            TEXT NOT NULL DEFAULT 'SEM_INSPECAO',

    -- Ciclo de vida:
    --   'ABERTO'     = ninguém viu ainda            -> modal aparece
    --   'CONFIRMADO' = alguém confirmou que viu     -> modal some (volta após X min)
    --   'RESOLVIDO'  = carga inspecionada/justificada -> nunca mais aparece
    status            TEXT NOT NULL DEFAULT 'ABERTO',

    detectado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Rastro da última confirmação
    confirmado_por    TEXT,
    confirmado_em     TIMESTAMPTZ,
    confirmacoes      INTEGER NOT NULL DEFAULT 0,

    resolvido_em      TIMESTAMPTZ
);

-- Uma presença só pode ter UM alerta ativo por vez.
-- É isso que faz o UPSERT do robô ser idempotente: rodar de novo não duplica.
CREATE UNIQUE INDEX IF NOT EXISTS alertas_inspecao_presenca_ativa
    ON smo."Alertas_Inspecao" (presenca)
    WHERE status <> 'RESOLVIDO';

-- O SMO consulta sempre por status; este índice mantém o polling barato.
CREATE INDEX IF NOT EXISTS alertas_inspecao_status
    ON smo."Alertas_Inspecao" (status, confirmado_em);

-- -----------------------------------------------------------------------------
-- 2. LOG DE CONFIRMAÇÕES
--    Mesma ideia do SMO_Operacional: a tabela acima guarda o estado atual,
--    esta guarda o histórico completo de quem viu o quê e quando.
--    É a prova de auditoria — nunca sofre UPDATE, só INSERT.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS smo."Alertas_Inspecao_Log" (
    id             BIGSERIAL PRIMARY KEY,
    alerta_id      BIGINT,
    presenca       TEXT NOT NULL,
    usuario        TEXT NOT NULL,
    acao           TEXT NOT NULL DEFAULT 'CONFIRMADO',
    qtd_no_lote    INTEGER,
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    criado_em_br   TEXT
);

CREATE INDEX IF NOT EXISTS alertas_inspecao_log_presenca
    ON smo."Alertas_Inspecao_Log" (presenca, criado_em DESC);

-- -----------------------------------------------------------------------------
-- 3. PERMISSÕES
--    O SMO acessa o banco com a chave anon (não usa Supabase Auth — o login é
--    por consulta à tabela Cadastro_de_Perfil). Seguimos exatamente o mesmo
--    padrão já usado pelas tabelas existentes deste sistema.
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA smo TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE ON smo."Alertas_Inspecao"     TO anon, authenticated, service_role;
GRANT SELECT, INSERT          ON smo."Alertas_Inspecao_Log" TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON SEQUENCE smo."Alertas_Inspecao_id_seq"     TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE smo."Alertas_Inspecao_Log_id_seq" TO anon, authenticated, service_role;

-- Recarrega o cache de schema do PostgREST para as tabelas novas aparecerem na API
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- CONFERÊNCIA (rode depois; deve retornar as duas tabelas)
-- =============================================================================
-- SELECT table_name FROM information_schema.tables
--  WHERE table_schema = 'smo' AND table_name LIKE 'Alertas_Inspecao%';
