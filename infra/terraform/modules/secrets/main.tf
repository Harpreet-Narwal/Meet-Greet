terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = ">= 5.0" }
  }
}

# App env vars as SecureString parameters under /mulaqat/<env>/…
# Values are supplied out-of-band (CI or operator) — never committed.
resource "aws_ssm_parameter" "this" {
  # Keys are env-var names (not secret); values stay sensitive on each.value.
  for_each = nonsensitive(var.parameters)

  name  = "/${var.prefix}/${each.key}"
  type  = "SecureString"
  value = sensitive(each.value)

  lifecycle {
    ignore_changes = [value] # operators rotate values outside terraform
  }
}
