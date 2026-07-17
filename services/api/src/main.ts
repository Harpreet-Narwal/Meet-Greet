import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";
import { env } from "./config/env";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  // Business routes live under /v1; health probes and docs stay at the root.
  app.setGlobalPrefix("v1", { exclude: ["health", "ready"] });

  const openApiConfig = new DocumentBuilder()
    .setTitle("Mulaqat API")
    .setDescription(
      "Personality-matched social dining — events, bookings, matching, games, connections.",
    )
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup("docs", app, document, { jsonDocumentUrl: "docs-json" });

  // No host arg → dual-stack (::) so both IPv4 and IPv6 localhost probes work.
  await app.listen(env.PORT);
}

void bootstrap();
