variable "domain_name" { type = string }
variable "zone_id" { type = string }

variable "alias_records" {
  type = map(object({
    dns_name = string
    zone_id  = string
  }))
  default     = {}
  description = "record name → ALB alias target"
}
