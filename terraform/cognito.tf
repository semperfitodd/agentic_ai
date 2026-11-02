resource "aws_cognito_user_pool" "main" {
  depends_on = [aws_iam_role_policy.github_actions]

  name = "${var.environment}_users"

  user_pool_tier           = "ESSENTIALS"
  deletion_protection      = "ACTIVE"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  mfa_configuration        = "OPTIONAL"

  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 3
  }

  software_token_mfa_configuration {
    enabled = true
  }

  tags = merge(var.tags, { Name = "${var.environment}_users" })
}

resource "aws_cognito_user_pool_client" "app" {
  depends_on = [aws_cognito_identity_provider.google, aws_cognito_identity_provider.apple]

  name         = "${var.environment}_app"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret                      = false
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid"]
  callback_urls                        = local.auth_redirect_urls
  logout_urls                          = local.auth_redirect_urls
  supported_identity_providers         = local.client_identity_providers
  explicit_auth_flows                  = ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH"]
  enable_token_revocation              = true
  prevent_user_existence_errors        = "ENABLED"

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}

module "auth_certificate" {
  source  = "terraform-aws-modules/acm/aws"
  version = "~> 6.3"

  domain_name       = local.auth_domain_name
  zone_id           = data.aws_route53_zone.public.zone_id
  validation_method = "DNS"

  tags = merge(var.tags, { Name = local.auth_domain_name })
}

resource "aws_cognito_user_pool_domain" "main" {
  domain                = local.auth_domain_name
  certificate_arn       = module.auth_certificate.acm_certificate_arn
  user_pool_id          = aws_cognito_user_pool.main.id
  managed_login_version = 2

  # Cognito rejects a custom domain until the parent domain resolves, which the site alias provides.
  depends_on = [aws_route53_record.site]
}

resource "aws_route53_record" "auth" {
  zone_id = data.aws_route53_zone.public.zone_id
  name    = local.auth_domain_name
  type    = "A"

  alias {
    name                   = aws_cognito_user_pool_domain.main.cloudfront_distribution
    zone_id                = aws_cognito_user_pool_domain.main.cloudfront_distribution_zone_id
    evaluate_target_health = false
  }
}

resource "aws_cognito_managed_login_branding" "app" {
  client_id    = aws_cognito_user_pool_client.app.id
  user_pool_id = aws_cognito_user_pool.main.id

  use_cognito_provided_values = true
}

locals {
  google_enabled = var.google_client_id != ""
  apple_enabled  = var.apple_services_id != ""

  federated_identity_providers = concat(
    local.google_enabled ? ["Google"] : [],
    local.apple_enabled ? ["SignInWithApple"] : [],
  )

  # Until a social provider is configured the client falls back to admin-created Cognito users only.
  client_identity_providers = length(local.federated_identity_providers) > 0 ? local.federated_identity_providers : ["COGNITO"]
}

resource "aws_cognito_identity_provider" "google" {
  count = local.google_enabled ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    authorize_scopes = "openid email profile"
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
  }

  attribute_mapping = {
    email          = "email"
    email_verified = "email_verified"
    username       = "sub"
  }
}

resource "aws_cognito_identity_provider" "apple" {
  count = local.apple_enabled ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "SignInWithApple"
  provider_type = "SignInWithApple"

  provider_details = {
    authorize_scopes = "email name"
    client_id        = var.apple_services_id
    key_id           = var.apple_key_id
    private_key      = var.apple_private_key
    team_id          = var.apple_team_id
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}
