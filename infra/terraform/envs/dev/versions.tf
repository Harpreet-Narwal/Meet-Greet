terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }

  # Remote state: S3 + DynamoDB lock. Configure with -backend-config=backend.hcl
  # (bucket/key/region/dynamodb_table) — never committed.
  backend "s3" {}
}
