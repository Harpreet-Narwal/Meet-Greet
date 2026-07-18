import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { CurrentUser, type AuthenticatedUser } from "../auth/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ChatService } from "./chat.service";

const SendSchema = z.object({ body: z.string().min(1).max(2000) });

@ApiTags("chat")
@ApiBearerAuth()
@Controller("chats")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  @ApiOperation({ summary: "Your chats (direct sparks + table groups; expired ones hidden)" })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.chat.myChats(user.id);
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "Messages in a chat you're a member of" })
  messages(@CurrentUser() user: AuthenticatedUser, @Param("id") chatId: string) {
    return this.chat.messages(user.id, chatId);
  }

  @Post(":id/messages")
  @ApiOperation({ summary: "Send a message (also broadcast over the socket)" })
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") chatId: string,
    @Body(new ZodValidationPipe(SendSchema)) body: z.infer<typeof SendSchema>,
  ) {
    return this.chat.send(user.id, chatId, body.body);
  }
}
