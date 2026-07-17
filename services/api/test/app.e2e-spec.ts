import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";

/**
 * Boots the real AppModule against real Postgres + Redis
 * (compose stack locally, service containers in CI).
 */
describe("api bootstrap (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1", { exclude: ["health", "ready"] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health → 200 without touching dependencies", async () => {
    const response = await request(app.getHttpServer()).get("/health").expect(200);
    expect(response.body).toEqual({ status: "ok", service: "api" });
  });

  it("GET /ready → 200 with db and redis up", async () => {
    const response = await request(app.getHttpServer()).get("/ready").expect(200);
    expect(response.body).toEqual({ status: "ready", db: "up", redis: "up" });
  });
});
