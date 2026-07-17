variable "prefix" {
  type        = string
  description = "SSM path prefix, e.g. mulaqat/dev"
}

variable "parameters" {
  type        = map(string)
  sensitive   = true
  description = "parameter name → initial value (rotated out-of-band afterwards)"
}
