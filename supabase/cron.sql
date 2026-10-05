-- Agenda o resumo diario (07:00 de Brasilia = 10:00 UTC).
-- Troque SEU_SEGREDO_AQUI por uma string aleatoria longa (so voce conhece) e
-- cadastre exatamente a mesma string como secret TRIGGER_SECRET na funcao
-- daily-digest. NAO commite esse arquivo com o valor real preenchido.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select
  cron.schedule(
    'taskin-daily-digest',
    '0 10 * * *',
    $$
    select
      net.http_post(
        url := 'https://SEU_PROJECT_REF.supabase.co/functions/v1/daily-digest',
        headers := '{"Content-Type":"application/json","x-trigger-secret":"SEU_SEGREDO_AQUI"}'::jsonb,
        body := '{}'::jsonb
      );
    $$
  );
