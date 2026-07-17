variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "azs" {
  type    = list(string)
  default = ["ap-south-1a", "ap-south-1b"]
}

variable "web_image" {
  type    = string
  default = "ghcr.io/mulaqat/mulaqat-web:latest"
}

variable "api_image" {
  type    = string
  default = "ghcr.io/mulaqat/mulaqat-api:latest"
}

variable "ai_image" {
  type    = string
  default = "ghcr.io/mulaqat/mulaqat-ai:latest"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "media_bucket_name" {
  type    = string
  default = "mulaqat-dev-media"
}

variable "app_secrets" {
  type      = map(string)
  sensitive = true
  default   = {}
}

variable "vector_store_mode" {
  type    = string
  default = "qdrant_cloud"

  validation {
    condition     = contains(["qdrant_cloud", "self_hosted"], var.vector_store_mode)
    error_message = "vector_store_mode must be qdrant_cloud or self_hosted."
  }
}
