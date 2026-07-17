import { BadRequestException, Body, Controller, Get, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthenticatedUser } from "../auth/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { S3Service } from "../storage/s3.service";
import { UsersService, type MeResponse } from "./users.service";
import {
  PhotoPresignSchema,
  UpdateMeSchema,
  type PhotoPresignDto,
  type UpdateMeDto,
} from "./users.types";

@ApiTags("me")
@ApiBearerAuth()
@Controller("me")
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly s3: S3Service,
  ) {}

  @Get()
  @ApiOperation({ summary: "Profile + personality + counters" })
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<MeResponse> {
    return this.users.getMe(user.id);
  }

  @Patch()
  @ApiOperation({ summary: "Update profile fields" })
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(UpdateMeSchema)) body: UpdateMeDto,
  ): Promise<MeResponse> {
    return this.users.updateMe(user.id, body);
  }

  @Post("photo")
  @ApiOperation({ summary: "Presigned upload URL for a profile/selfie photo" })
  async presignPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(PhotoPresignSchema)) body: PhotoPresignDto,
  ): Promise<{ upload_url: string; public_url: string; key: string }> {
    try {
      return await this.s3.presignPhotoUpload(user.id, body.content_type);
    } catch (error) {
      throw new BadRequestException(String(error));
    }
  }
}
