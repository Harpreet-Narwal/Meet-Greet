// Runs before any e2e module import: point the api at the in-test AI stub.
process.env.AI_URL = process.env.AI_URL_OVERRIDE ?? "http://127.0.0.1:8091";
