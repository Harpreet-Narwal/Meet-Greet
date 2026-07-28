// Runs before any e2e module import: point the api at the in-test AI stub.
process.env.AI_URL = process.env.AI_URL_OVERRIDE ?? "http://127.0.0.1:8091";

// Jest only defaults NODE_ENV to "test" when it is UNSET, and both the docker
// container and CI already export it. Without this the RateLimitGuard's
// `NODE_ENV === "test"` bypass never fires, and matching.e2e-spec — which logs
// in 30 guests from one IP against a 10/min OTP cap — starts collecting 429s
// from guest 11 onward. Set it here, before src/config/env parses it.
process.env.NODE_ENV = "test";
