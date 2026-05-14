-- ════════════════════════════════════════════════════════════════
-- CarpiCalc — Migración 002: admin role + trial 15 días + fix has_active
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════
--
-- Tres cambios:
--   1. Trial pasa de 14 a 15 días (para coincidir con publicidad)
--   2. has_active_subscription() ahora respeta app_role = 'admin'
--      (un admin nunca queda bloqueado por RLS, independiente del trial)
--   3. Fix bug en has_active_subscription: removidos los `IS NULL` que
--      dejaban suscripciones bloqueadas como activas por accidente
-- ════════════════════════════════════════════════════════════════

-- ── 1. Trial 14 → 15 días ──────────────────────────────────────
-- Cambio el DEFAULT del campo trial_ends_at para nuevos registros.
ALTER TABLE subscriptions
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + INTERVAL '15 days');

-- También actualizamos el trigger que crea la suscripción inicial.
-- (Re-creamos la función completa para que el INTERVAL sea consistente.)
CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- 1. Crear profile (no toca app_role — admins se setean manualmente)
  INSERT INTO profiles (id, email, nombre)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'nombre', ''));

  -- 2. Crear workspace
  INSERT INTO workspaces (owner_id, nombre)
  VALUES (new.id, 'Mi Taller')
  RETURNING id INTO new_workspace_id;

  -- 3. Crear trial de 15 días automáticamente
  INSERT INTO subscriptions (workspace_id, plan_id, estado, trial_ends_at)
  VALUES (new_workspace_id, 'bronce', 'trialing', now() + INTERVAL '15 days');

  RETURN new;
END;
$$;

-- ── 2. has_active_subscription respeta app_role = 'admin' ──────
-- Un admin nunca queda bloqueado por RLS independiente del estado del trial.
-- Bug fix: removidos los `IS NULL` que dejaban trial vencido como activo.
CREATE OR REPLACE FUNCTION has_active_subscription()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  -- Admin siempre tiene acceso
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND app_role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM subscriptions
    WHERE workspace_id = my_workspace_id()
    AND (
      -- Trial vigente
      (estado = 'trialing' AND trial_ends_at > now())
      OR
      -- Suscripción activa con período pagado vigente
      (estado = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    )
  );
$$;

-- ── 3. Promover tu cuenta a admin ──────────────────────────────
-- IMPORTANTE: reemplazá 'tu@email.com' por tu email real antes de correr.
-- Esto solo afecta TU fila — no le da admin a nadie más.
--
-- UPDATE profiles SET app_role = 'admin' WHERE email = 'tu@email.com';
