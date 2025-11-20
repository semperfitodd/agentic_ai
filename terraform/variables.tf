variable "domain" {
  description = "Base domain for the website and API"
  type        = string
  validation {
    condition     = can(regex("^[a-zA-Z0-9.-]+$", var.domain))
    error_message = "Domain must be a valid domain name."
  }
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9_-]+$", var.environment))
    error_message = "Environment must contain only lowercase letters, numbers, hyphens, and underscores."
  }
}

variable "region" {
  description = "AWS region for all resources"
  type        = string
  default     = null
  validation {
    condition     = can(regex("^[a-z]+-[a-z]+-[0-9]+$", var.region))
    error_message = "Region must be a valid AWS region format (e.g., us-east-1, eu-west-1)."
  }
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
