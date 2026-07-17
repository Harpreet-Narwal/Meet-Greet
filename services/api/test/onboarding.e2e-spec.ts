import { createServer, type Server } from "node:http";

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";

/**
 * The full M1 journey against real Postgres + Redis (seeded), with services/ai
 * replaced by a deterministic stub so the suite needs no LLM stack.
 */
describe("onboarding: otp → quiz → archetype (e2e)", () => {
  let app: INestApplication;
  let aiStub: Server;
  let aiStubSawAuth: string | null = null;

  const phone = `+9190${String(Date.now()).slice(-8)}`;
  let accessToken = "";
  let refreshToken = "";

  beforeAll(async () => {
    aiStub = createServer((req, res) => {
      aiStubSawAuth = req.headers.authorization ?? null;
      if (req.method === "POST" && req.url === "/profile/compute") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const parsed = JSON.parse(body) as { first_name: string | null };
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              traits: { energy: 0.62, depth: 0.41, novelty: 0.1, structure: -0.2 },
              humor_styles: ["dry"],
              archetype: "Warm Firecracker",
              archetype_emoji: "🔥",
              blurb: `${parsed.first_name ?? "You"}, tables fight over you.`,
            }),
          );
        });
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => aiStub.listen(8091, "127.0.0.1", resolve));

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1", { exclude: ["health", "ready"] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await new Promise<void>((resolve) => aiStub.close(() => resolve()));
  });

  it("requests an OTP for a fresh phone", async () => {
    await request(app.getHttpServer())
      .post("/v1/auth/otp/request")
      .send({ phone })
      .expect(200, { sent: true });
  });

  it("rejects a wrong code without leaking which part failed", async () => {
    const response = await request(app.getHttpServer())
      .post("/v1/auth/otp/verify")
      .send({ phone, code: "123456" })
      .expect(401);
    expect(JSON.stringify(response.body)).not.toContain("phone");
  });

  it("accepts the dev code and issues a token pair", async () => {
    const response = await request(app.getHttpServer())
      .post("/v1/auth/otp/verify")
      .send({ phone, code: "000000" })
      .expect(200);
    expect(response.body.is_new_user).toBe(true);
    accessToken = response.body.access_token;
    refreshToken = response.body.refresh_token;
    expect(accessToken).toBeTruthy();
  });

  it("guards /me: no token → 401, refresh token → 401, access token → profile", async () => {
    await request(app.getHttpServer()).get("/v1/me").expect(401);
    await request(app.getHttpServer())
      .get("/v1/me")
      .set("Authorization", `Bearer ${refreshToken}`)
      .expect(401);
    const response = await request(app.getHttpServer())
      .get("/v1/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(response.body.user.phone).toBe(phone);
    expect(response.body.personality).toBeNull();
  });

  it("updates the profile name", async () => {
    const response = await request(app.getHttpServer())
      .patch("/v1/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ first_name: "Test", full_name: "Test Table" })
      .expect(200);
    expect(response.body.user.first_name).toBe("Test");
  });

  it("serves the seeded 15-question quiz without exposing trait weights", async () => {
    const response = await request(app.getHttpServer())
      .get("/v1/quiz")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(response.body.questions).toHaveLength(15);
    expect(JSON.stringify(response.body)).not.toContain("trait_weights");
  });

  it("submits answers → ai computes → archetype persisted with facets applied", async () => {
    const quiz = await request(app.getHttpServer())
      .get("/v1/quiz")
      .set("Authorization", `Bearer ${accessToken}`);

    const answers = quiz.body.questions.map(
      (question: {
        id: string;
        ord: number;
        kind: string;
        options: { id: string }[];
      }) => {
        if (question.kind === "slider") {
          return { kind: "slider", question_id: question.id, value: 0.5 };
        }
        if (question.kind === "multi") {
          const count = question.ord === 10 ? 3 : question.ord === 9 ? 2 : 1;
          return {
            kind: "multi",
            question_id: question.id,
            option_ids: question.options.slice(0, count).map((option) => option.id),
          };
        }
        return {
          kind: question.kind,
          question_id: question.id,
          option_id: question.options[0]?.id ?? "missing-option",
        };
      },
    );

    const response = await request(app.getHttpServer())
      .post("/v1/quiz/responses")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ quiz_version: "v1", answers })
      .expect(201);
    expect(response.body.personality.archetype).toBe("Warm Firecracker");
    expect(aiStubSawAuth).toBe("Bearer dev-internal-token-change-me");

    const me = await request(app.getHttpServer())
      .get("/v1/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.personality.archetype).toBe("Warm Firecracker");
    expect(me.body.personality.archetype_emoji).toBe("🔥");
    // Q10 facet → interests, Q11 → dietary, Q12 → languages, Q13 → intent
    expect(me.body.user.interests).toHaveLength(3);
    expect(me.body.user.dietary).toBe("veg");
    expect(me.body.user.languages).toEqual(["English"]);
    expect(me.body.user.relationship_intent).toBe("friends_only");
  });

  it("refreshes the token pair", async () => {
    const response = await request(app.getHttpServer())
      .post("/v1/auth/refresh")
      .send({ refresh_token: refreshToken })
      .expect(200);
    expect(response.body.access_token).toBeTruthy();
    expect(response.body.refresh_token).toBeTruthy();
  });
});
