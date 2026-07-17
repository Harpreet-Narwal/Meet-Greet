# Mulaqat Infrastructure (Terraform)

**Isolated workspace.** Nothing here imports from application code, and no application
workspace imports from here. It has its own CI pipeline (`.github/workflows/ci-terraform.yml`).

## Layout

```
modules/
  network/       VPC, public/private subnets, NAT, routing
  ecs-service/   Reusable Fargate service + ALB (used 3× — web, api, ai)
  rds/           Postgres 16 (pgvector via app migrations)
  redis/         ElastiCache Redis 7
  s3-cdn/        Media bucket + CloudFront
  dns/           Route53 + ACM
  secrets/       SSM Parameter Store (SecureString)
envs/
  dev/           Thin root composing the modules for dev
  prod/          Same, prod sizing + deletion protection
```

Region: `ap-south-1` (Mumbai). Remote state: S3 + DynamoDB lock — configure per env with a
backend file (never committed):

```bash
cd envs/dev
terraform init -backend-config=backend.hcl   # bucket, key, region, dynamodb_table
terraform plan
```

## Prod notes

- **Qdrant**: set `vector_store_mode = "qdrant_cloud"` and provide the URL/key via SSM
  (default), or `"self_hosted"` to run Qdrant as an ECS service (EFS volume — lands M7).
- **Ollama is local-dev only.** Prod points `LLM_PROVIDER` at a hosted API purely via env
  vars in SSM — zero application code changes (that's why the provider abstraction exists).
- App secrets live in SSM Parameter Store via the `secrets` module; task definitions read
  them at start. Never put secret values in `.tfvars` that get committed.

## Extracting to a standalone repo (designed-in)

1. `git mv infra/terraform <new-repo>` — the workspace has no external code references.
2. Move `.github/workflows/ci-terraform.yml` and delete its `paths:` filter.
3. Done. State, backends, and module paths are all relative to this folder.
