import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

/** Restrict a route to the given roles (stacks on top of the JWT guard). */
export const Roles = (...roles: ("host" | "admin")[]) => SetMetadata(ROLES_KEY, roles);
