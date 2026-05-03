-- ════════════════════════════════════════════════════════════════
-- CarpiCalc — Schema inicial
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════

-- ── 1. PROFILES (extiende auth.users) ───────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  nombre     TEXT,
  app_role   TEXT NOT NULL DEFAULT 'user' CHECK (app_role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 2. WORKSPACES (el "taller" de cada carpintero) ───────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL DEFAULT 'Mi Taller',
  owner_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 3. SUSCRIPCIONES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mp_preapproval_id    TEXT UNIQUE,         -- MercadoPago ID de suscripción
  plan_id              TEXT NOT NULL DEFAULT 'bronce',
  estado               TEXT NOT NULL DEFAULT 'trialing'
                       CHECK (estado IN ('trialing','active','past_due','canceled','unpaid')),
  trial_ends_at        TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  current_period_end   TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- ── 4. DATOS DE DOMINIO ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS modulos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  codigo       TEXT NOT NULL,
  datos        JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workspace_id, codigo)
);

CREATE TABLE IF NOT EXISTS costos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  datos        JSONB NOT NULL DEFAULT '{}',
  version      BIGINT DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS presupuestos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  datos        JSONB NOT NULL DEFAULT '{}',
  estado       TEXT NOT NULL DEFAULT 'nuevo',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS perfil_taller (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  datos        JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS historial_precios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  snapshot     JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE costos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_taller     ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_precios ENABLE ROW LEVEL SECURITY;

-- Helper: workspace del usuario autenticado
CREATE OR REPLACE FUNCTION my_workspace_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM workspaces WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- Helper: suscripción activa
CREATE OR REPLACE FUNCTION has_active_subscription()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE workspace_id = my_workspace_id()
    AND estado IN ('trialing', 'active')
    AND (trial_ends_at IS NULL OR trial_ends_at > now()
         OR current_period_end IS NULL OR current_period_end > now())
  );
$$;

-- ── Políticas profiles ───────────────────────────────────────────
CREATE POLICY "perfil propio" ON profiles
  FOR ALL USING (id = auth.uid());

-- ── Políticas workspaces ─────────────────────────────────────────
CREATE POLICY "workspace propio" ON workspaces
  FOR ALL USING (owner_id = auth.uid());

-- ── Políticas subscriptions ──────────────────────────────────────
CREATE POLICY "ver suscripcion propia" ON subscriptions
  FOR SELECT USING (workspace_id = my_workspace_id());

-- Solo service_role puede escribir (webhook de MercadoPago)
-- Las inserciones desde la app usan service_role, no anon

-- ── Políticas datos de dominio (mismo patrón para todas) ─────────
CREATE POLICY "modulos propios" ON modulos
  FOR ALL USING (workspace_id = my_workspace_id() AND has_active_subscription());

CREATE POLICY "costos propios" ON costos
  FOR ALL USING (workspace_id = my_workspace_id() AND has_active_subscription());

CREATE POLICY "presupuestos propios" ON presupuestos
  FOR ALL USING (workspace_id = my_workspace_id() AND has_active_subscription());

CREATE POLICY "perfil_taller propio" ON perfil_taller
  FOR ALL USING (workspace_id = my_workspace_id());

CREATE POLICY "historial propio" ON historial_precios
  FOR ALL USING (workspace_id = my_workspace_id() AND has_active_subscription());

-- ════════════════════════════════════════════════════════════════
-- TRIGGER: crear workspace + suscripción trial al registrarse
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- 1. Crear profile
  INSERT INTO profiles (id, email, nombre)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'nombre');

  -- 2. Crear workspace del taller
  INSERT INTO workspaces (owner_id, nombre)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre_taller', 'Mi Taller'))
  RETURNING id INTO new_workspace_id;

  -- 3. Crear trial de 14 días automáticamente
  INSERT INTO subscriptions (workspace_id, plan_id, estado, trial_ends_at)
  VALUES (new_workspace_id, 'bronce', 'trialing', now() + INTERVAL '14 days');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
