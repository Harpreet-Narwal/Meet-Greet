-- Base migration: extensions + UUID v7 generator.
-- pgvector lives here so the ai service (read-only on core tables, own `ai` schema)
-- can rely on the extension existing.
CREATE EXTENSION IF NOT EXISTS vector;

-- UUID v7: time-ordered UUIDs (plan §5). Postgres 16 has no native uuidv7,
-- so we overlay a millisecond timestamp onto a random v4 and set version bits.
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
BEGIN
  RETURN encode(
    set_bit(
      set_bit(
        overlay(
          uuid_send(gen_random_uuid())
          placing substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
          from 1 for 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex')::uuid;
END
$$
LANGUAGE plpgsql
VOLATILE;
