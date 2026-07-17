import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { JwtPayload } from "./auth.types";

export interface AuthenticatedUser {
  id: string;
  role: JwtPayload["role"];
}

/** Injects {id, role} extracted from the verified JWT by JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
