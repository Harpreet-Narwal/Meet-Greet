import { Module } from "@nestjs/common";

import { BookingMailService } from "./booking-mail.service";
import { PrismaModule } from "../prisma/prisma.module";
import { MailService } from "./mail.service";
import { RemindersService } from "./reminders.service";

@Module({
  imports: [PrismaModule],
  providers: [MailService, RemindersService, BookingMailService],
  exports: [MailService, RemindersService, BookingMailService],
})
export class MailModule {}
