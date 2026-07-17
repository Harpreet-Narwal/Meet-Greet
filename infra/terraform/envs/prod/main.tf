provider "aws" {
  region = var.region
}

locals {
  name = "mulaqat-prod"
}

module "network" {
  source = "../../modules/network"
  name   = local.name
  azs    = var.azs
}

# ── ECS cluster + shared task roles ─────────────────────────────────────────

resource "aws_ecs_cluster" "this" {
  name = local.name
}

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task_execution" {
  name               = "${local.name}-task-exec"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ssm_read" {
  statement {
    actions   = ["ssm:GetParameters", "ssm:GetParameter"]
    resources = ["arn:aws:ssm:${var.region}:*:parameter/mulaqat/prod/*"]
  }
}

resource "aws_iam_role_policy" "task_execution_ssm" {
  name   = "${local.name}-ssm-read"
  role   = aws_iam_role.task_execution.id
  policy = data.aws_iam_policy_document.ssm_read.json
}

resource "aws_iam_role" "task" {
  name               = "${local.name}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

# ── The three application services ──────────────────────────────────────────

module "web" {
  source             = "../../modules/ecs-service"
  name               = "${local.name}-web"
  region             = var.region
  cluster_arn        = aws_ecs_cluster.this.arn
  cluster_name       = aws_ecs_cluster.this.name
  vpc_id             = module.network.vpc_id
  vpc_cidr           = "10.0.0.0/16"
  public_subnet_ids  = module.network.public_subnet_ids
  private_subnet_ids = module.network.private_subnet_ids
  image              = var.web_image
  container_port     = 3000
  execution_role_arn = aws_iam_role.task_execution.arn
  task_role_arn      = aws_iam_role.task.arn
}

module "api" {
  source             = "../../modules/ecs-service"
  name               = "${local.name}-api"
  region             = var.region
  cluster_arn        = aws_ecs_cluster.this.arn
  cluster_name       = aws_ecs_cluster.this.name
  vpc_id             = module.network.vpc_id
  vpc_cidr           = "10.0.0.0/16"
  public_subnet_ids  = module.network.public_subnet_ids
  private_subnet_ids = module.network.private_subnet_ids
  image              = var.api_image
  container_port     = 4000
  execution_role_arn = aws_iam_role.task_execution.arn
  task_role_arn      = aws_iam_role.task.arn
}

# ai is internal-only — never public (plan §1)
module "ai" {
  source             = "../../modules/ecs-service"
  name               = "${local.name}-ai"
  region             = var.region
  cluster_arn        = aws_ecs_cluster.this.arn
  cluster_name       = aws_ecs_cluster.this.name
  vpc_id             = module.network.vpc_id
  vpc_cidr           = "10.0.0.0/16"
  public_subnet_ids  = module.network.public_subnet_ids
  private_subnet_ids = module.network.private_subnet_ids
  image              = var.ai_image
  container_port     = 8000
  internal           = true
  execution_role_arn = aws_iam_role.task_execution.arn
  task_role_arn      = aws_iam_role.task.arn
}

# ── Data stores ─────────────────────────────────────────────────────────────

module "rds" {
  source              = "../../modules/rds"
  name                = local.name
  vpc_id              = module.network.vpc_id
  subnet_ids          = module.network.private_subnet_ids
  password            = var.db_password
  instance_class      = "db.t4g.medium"
  allocated_storage   = 100
  deletion_protection = true
  allowed_security_group_ids = [
    module.api.service_security_group_id,
    module.ai.service_security_group_id,
  ]
}

module "redis" {
  source     = "../../modules/redis"
  name       = local.name
  vpc_id     = module.network.vpc_id
  subnet_ids = module.network.private_subnet_ids
  node_type  = "cache.t4g.small"
  num_nodes  = 2
  allowed_security_group_ids = [
    module.api.service_security_group_id,
  ]
}

module "media" {
  source      = "../../modules/s3-cdn"
  bucket_name = var.media_bucket_name
}

module "secrets" {
  source     = "../../modules/secrets"
  prefix     = "mulaqat/prod"
  parameters = var.app_secrets
}

# Qdrant: "qdrant_cloud" (default — operator provides URL/key via SSM) or
# "self_hosted" (ECS + EFS volume, lands in M7).
# TODO(M7): self-hosted qdrant service behind var.vector_store_mode.
