-- NOF-MP-23
-- Idempotent cleanup for legacy Telegram placeholder email domains.
-- Safe output policy: aggregate counts only; never select or print email values.

BEGIN;

UPDATE dragon_forge."user"
SET email = regexp_replace(lower(email), '@telegram\.example\.com$', '@telegram.forgath.ru')
WHERE lower(email) ~ '^[0-9]+@telegram\.example\.com$'
  AND NOT EXISTS (
    SELECT 1
    FROM dragon_forge."user" existing
    WHERE lower(existing.email) = regexp_replace(lower(dragon_forge."user".email), '@telegram\.example\.com$', '@telegram.forgath.ru')
  );

COMMIT;

SELECT
  count(*) FILTER (WHERE lower(email) LIKE '%@telegram.example.com') AS remaining_telegram_example_placeholder_count,
  count(*) FILTER (WHERE lower(email) LIKE '%@telegram.forgath.ru') AS telegram_forgath_placeholder_count,
  count(*) FILTER (WHERE lower(email) LIKE '%example.com') AS remaining_example_com_count
FROM dragon_forge."user";
