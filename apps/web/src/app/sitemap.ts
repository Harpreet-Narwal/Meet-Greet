import type { MetadataRoute } from "next";

import { APP_URL } from "@/lib/config";
import { publicApi, type PublicCity, type PublicEvent } from "@/lib/public-api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, events] = await Promise.all([
    publicApi<PublicCity[]>("/cities", 3600),
    publicApi<PublicEvent[]>("/events?city=bangalore", 3600),
  ]);

  return [
    { url: APP_URL, changeFrequency: "daily", priority: 1 },
    { url: `${APP_URL}/how-it-works`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${APP_URL}/pricing`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${APP_URL}/safety`, changeFrequency: "monthly", priority: 0.8 },
    ...(cities ?? []).map((city) => ({
      url: `${APP_URL}/cities/${city.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...(events ?? []).map((event) => ({
      url: `${APP_URL}/events/${event.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
  ];
}
