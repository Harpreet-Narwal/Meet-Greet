import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { MailService } from "./mail.service";
import { RemindersService } from "./reminders.service";

@Module({
  imports: [PrismaModule],
  providers: [MailService, RemindersService],
  exports: [MailService, RemindersService],
})
export class MailModule {}
