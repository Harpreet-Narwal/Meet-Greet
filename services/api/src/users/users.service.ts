import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { PersonalityProfile, User } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import type { UpdateMeDto } from "./users.types";

export interface MeResponse {
  user: {
    id: string;
    phone: string;
    email: string | null;
    full_name: string | null;
    first_name: string | null;
    dob: string | null;
    gender: User["gender"];
    city_slug: string | null;
    photo_url: string | null;
    selfie_verified: boolean;
    role: User["role"];
    relationship_intent: User["relationshipIntent"];
    dietary: User["dietary"];
    languages: string[];
    interests: string[];
    bio: string | null;
  };
  personality: {
    quiz_version: string;
    traits: { energy: number; depth: number; novelty: number; structure: number };
    humor_styles: string[];
    archetype: string;
    archetype_emoji: string;
    completed_at: string;
  } | null;
  counters: { events_attended: number; people_met: number };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private toMeResponse(
    user: User & { city: { slug: string } | null; personalityProfile: PersonalityProfile | null },
    countersInput: { events_attended: number; people_met: number },
  ): MeResponse {
    return {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        full_name: user.fullName,
        first_name: user.firstName,
        dob: user.dob ? user.dob.toISOString().slice(0, 10) : null,
        gender: user.gender,
        city_slug: user.city?.slug ?? null,
        photo_url: user.photoUrl,
        selfie_verified: user.selfieVerified,
        role: user.role,
        relationship_intent: user.relationshipIntent,
        dietary: user.dietary,
        languages: user.languages,
        interests: user.interests,
        bio: user.bio,
      },
      personality: user.personalityProfile
        ? {
            quiz_version: user.personalityProfile.quizVersion,
            traits: {
              energy: user.personalityProfile.traitEnergy,
              depth: user.personalityProfile.traitDepth,
              novelty: user.personalityProfile.traitNovelty,
              structure: user.personalityProfile.traitStructure,
            },
            humor_styles: user.personalityProfile.humorStyles,
            archetype: user.personalityProfile.archetype,
            archetype_emoji: user.personalityProfile.archetypeEmoji,
            completed_at: user.personalityProfile.completedAt.toISOString(),
          }
        : null,
      counters: countersInput,
    };
  }

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { city: { select: { slug: true } }, personalityProfile: true },
    });
    if (!user) throw new NotFoundException("account not found");

    const events_attended = await this.prisma.booking.count({
      where: { userId, status: "checked_in" },
    });
    return this.toMeResponse(user, { events_attended, people_met: 0 });
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<MeResponse> {
    let cityId: string | undefined;
    if (dto.city_slug) {
      const city = await this.prisma.city.findUnique({ where: { slug: dto.city_slug } });
      if (!city) throw new BadRequestException(`unknown city: ${dto.city_slug}`);
      cityId = city.id;
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.full_name,
        firstName: dto.first_name,
        dob: dto.dob,
        gender: dto.gender,
        cityId,
        bio: dto.bio,
        photoUrl: dto.photo_url,
        relationshipIntent: dto.relationship_intent,
        dietary: dto.dietary,
        languages: dto.languages,
        interests: dto.interests,
      },
    });
    return this.getMe(userId);
  }
}
