variable "name" {
  type        = string
  description = "Prefix for all network resources (e.g. mulaqat-dev)"
}

variable "cidr_block" {
  type        = string
  default     = "10.0.0.0/16"
  description = "VPC CIDR"
}

variable "azs" {
  type        = list(string)
  description = "Availability zones (e.g. [\"ap-south-1a\", \"ap-south-1b\"])"
}
