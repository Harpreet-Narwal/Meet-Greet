import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";
import { env } from "./config/env";

async function bootstrap(): Promise<void> {
  // `rawBody` keeps the untouched request bytes alongside the parsed body.
  // Razorpay signs the exact bytes it sent, so verifying against a re-serialised
  // object would fail on any key reordering or whitespace difference.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  // Business routes live under /v1; health probes and docs stay at the root.
  app.setGlobalPrefix("v1", { exclude: ["health", "ready"] });

  // CORS stays off unless an origin list is configured. The Next.js app talks to
  // the api server-side through the BFF and never needs it; the Expo Web dev
  // target does, because it is a real browser on its own origin. An explicit
  // allowlist — never a wildcard, since these routes take bearer tokens.
  const corsOrigins = env.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (corsOrigins.length > 0) {
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    });
  }

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
