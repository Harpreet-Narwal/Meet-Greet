import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload, TokenPair } from "./auth.types";

const ACCESS_TTL = "15m";
const REFRESH_TTL = "30d";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async issueTokens(userId: string, role: JwtPayload["role"]): Promise<TokenPair> {
    const [access_token, refresh_token] = await Promise.all([
      this.jwt.signAsync({ sub: userId, role, type: "access" }, { expiresIn: ACCESS_TTL }),
      this.jwt.signAsync({ sub: userId, role, type: "refresh" }, { expiresIn: REFRESH_TTL }),
    ]);
    return { access_token, refresh_token };
  }

  /** OTP verified → find-or-create the user for this phone and issue tokens. */
  async loginWithPhone(phone: string): Promise<TokenPair & { is_new_user: boolean }> {
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing && existing.status !== "active") {
      throw new UnauthorizedException("this account is suspended");
    }
    const user =
      existing ??
      (await this.prisma.user.create({
        data: { phone },
      }));
    const tokens = await this.issueTokens(user.id, user.role);
    return { ...tokens, is_new_user: !existing };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException("invalid or expired refresh token");
    }
    if (payload.type !== "refresh") {
      throw new UnauthorizedException("not a refresh token");
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "active") {
      throw new UnauthorizedException("account unavailable");
    }
    return this.issueTokens(user.id, user.role);
  }
}
