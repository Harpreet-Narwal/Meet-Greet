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
    let response: Response;
    try {
      response = await fetch(`${env.AI_URL}${path}`, {
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
}
