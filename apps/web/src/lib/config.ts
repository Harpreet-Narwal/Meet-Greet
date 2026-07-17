/** Server-side api base — http://api:4000 in compose, localhost in bare dev. */
export const API_BASE =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
