ALTER TABLE sucursales
    ADD COLUMN IF NOT EXISTS printer_token_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS printer_agent_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS printer_fallback_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS printer_status VARCHAR(255) DEFAULT 'offline',
    ADD COLUMN IF NOT EXISTS printer_app_version VARCHAR(255),
    ADD COLUMN IF NOT EXISTS printer_last_seen_at TIMESTAMP WITH TIME ZONE;

DROP TABLE IF EXISTS printer_devices;
DROP TABLE IF EXISTS printer_agents;

ALTER TABLE produccion_areas
    ADD COLUMN IF NOT EXISTS impresora_display_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS impresora_config JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS printer_jobs (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(255),
    source_event VARCHAR(255),
    payload JSONB DEFAULT '{}'::jsonb,
    colaborador JSONB DEFAULT '{}'::jsonb,
    printer_area VARCHAR(255),
    printer_name VARCHAR(255),
    engine VARCHAR(255) DEFAULT 'sumatra-pdf',
    status VARCHAR(255) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    received_at TIMESTAMP WITH TIME ZONE,
    printed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    sucursal VARCHAR(255),
    empresa VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sucursales_printer_token_hash_idx ON sucursales (printer_token_hash);
CREATE INDEX IF NOT EXISTS printer_jobs_sucursal_status_idx ON printer_jobs (sucursal, status);
