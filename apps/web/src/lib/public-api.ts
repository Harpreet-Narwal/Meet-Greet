import "server-only";

import { API_BASE } from "./config";

export interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: "dinner" | "run_club" | "game_night" | "chai" | "trek";
  starts_at: string;
  duration_min: number;
  price_inr: number;
  budget_band: "budget" | "moderate" | "premium";
  women_only: boolean;
  status: string;
  city_slug: string;
  neighborhood_teaser: string | null;
  seats_total: number;
  seats_left: number;
  venue: {
    name: string;
    address: string;
    neighborhood: string;
    lat: number;
    lng: number;
  } | null;
}

export interface PublicCity {
  slug: string;
  name: string;
  state: string;
  is_live: boolean;
}

/** ISR fetch for public catalogue data (plan §8: revalidate 300). */
export async function publicApi<T>(path: string, revalidate = 300): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}/v1${path}`, { next: { revalidate } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const EVENT_TYPE_LABELS: Record<PublicEvent["type"], string> = {
  dinner: "Dinner",
  run_club: "Run club",
  game_night: "Game night",
  chai: "Chai & chill",
  trek: "Trek",
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function formatEventDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
