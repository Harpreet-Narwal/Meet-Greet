variable "name" { type = string }
variable "region" { type = string }
variable "cluster_arn" { type = string }
variable "cluster_name" { type = string }
variable "vpc_id" { type = string }
variable "vpc_cidr" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "image" { type = string }
variable "container_port" { type = number }
variable "execution_role_arn" { type = string }
variable "task_role_arn" { type = string }

variable "internal" {
  type        = bool
  default     = false
  description = "true → ALB is VPC-internal (the ai service is never public)"
}

variable "cpu" {
  type    = number
  default = 256
}

variable "memory" {
  type    = number
  default = 512
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "max_count" {
  type    = number
  default = 4
}

variable "health_check_path" {
  type    = string
  default = "/health"
}

variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "secret_arns" {
  type        = map(string)
  default     = {}
  description = "env name → SSM parameter ARN"
}
