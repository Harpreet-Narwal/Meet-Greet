import { Injectable, ServiceUnavailableException } from "@nestjs/common";

import { env } from "../config/env";

export interface ProfileComputeRequest {
  quiz_version: string;
  first_name: string | null;
  answers: { question_id: string; weights: Record<string, number>; humor_styles: string[] }[];
  trait_max: Record<string, number>;
}

export interface ProfileComputeResponse {
  traits: { energy: number; depth: number; novelty: number; structure: number };
  humor_styles: string[];
  archetype: string;
  archetype_emoji: string;
  blurb: string;
}

/** Thin internal-HTTP client for services/ai. Never exposed to browsers. */
@Injectable()
export class AiClient {
  private async post<T>(path: string, body: unknown): Promise<T> {
    // Resolve at call time so tests can retarget the ai service per-suite
    // (env is parsed once at import; process.env may be updated later).
    const aiUrl = process.env.AI_URL ?? env.AI_URL;
    let response: Response;
    try {
      response = await fetch(`${aiUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.INTERNAL_API_TOKEN}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ServiceUnavailableException("matching service unreachable");
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new ServiceUnavailableException(
        `matching service error ${response.status}: ${detail.slice(0, 300)}`,
      );
    }
    return (await response.json()) as T;
  }

  computeProfile(request: ProfileComputeRequest): Promise<ProfileComputeResponse> {
    return this.post<ProfileComputeResponse>("/profile/compute", request);
  }

  composeTables(request: MatchComposeRequest): Promise<MatchComposeResponse> {
    return this.post<MatchComposeResponse>("/match/compose", request);
  }
}

export interface MatchAttendee {
  user_id: string;
  energy: number;
  depth: number;
  novelty: number;
  structure: number;
  humor_styles: string[];
  interests: string[];
  languages: string[];
  age: number | null;
  gender: "woman" | "man" | "nonbinary" | "prefer_not" | null;
  dietary: string | null;
  intent: string | null;
}

export interface MatchComposeRequest {
  event_id: string;
  attendees: MatchAttendee[];
  params: { table_size: number; women_only: boolean; seed: number };
  blocked_pairs: [string, string][];
}

export interface MatchComposeTable {
  table_number: number;
  user_ids: string[];
  score: number;
  explain: Record<string, unknown>;
}

export interface MatchComposeResponse {
  algo_version: string;
  tables: MatchComposeTable[];
  score_summary: Record<string, unknown>;
}
