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

variable "bedrock_model_id" {
  description = "AWS Bedrock model ID for AI analysis"
  type        = string
  default     = "us.anthropic.claude-opus-5-5"
}

variable "log_level" {
  description = "Lambda log level (info, debug, warn, error)"
  type        = string
  default     = "info"
  validation {
    condition     = contains(["info", "debug", "warn", "error"], var.log_level)
    error_message = "log_level must be one of: info, debug, warn, error."
  }
}

variable "ios_auth_callback_url" {
  description = "OAuth redirect URI used by the iOS app's ASWebAuthenticationSession"
  type        = string
  default     = "arcagent://auth/callback"
}

variable "auth_dev_callback_urls" {
  description = "Additional OAuth redirect URIs for local development (e.g. http://localhost:3000/)"
  type        = list(string)
  default     = []
}

variable "google_client_id" {
  description = "Google OAuth client ID for Cognito federation; empty disables Google sign-in"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth client secret for Cognito federation"
  type        = string
  default     = ""
  sensitive   = true
}

variable "apple_services_id" {
  description = "Apple Services ID for Sign in with Apple; empty disables Apple sign-in"
  type        = string
  default     = ""
}

variable "apple_team_id" {
  description = "Apple Developer Team ID for Sign in with Apple"
  type        = string
  default     = ""
}

variable "apple_key_id" {
  description = "Key ID of the Sign in with Apple private key"
  type        = string
  default     = ""
}

variable "apple_private_key" {
  description = "Sign in with Apple private key (.p8 contents)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "github_repo" {
  description = "GitHub repository in owner/repo format — used to scope the OIDC trust policy"
  type        = string
  default     = "semperfitodd/agentic_ai"
}
