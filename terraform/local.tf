locals {
  api_domain_name = "api.${var.domain}"

  domain_name = "${local.environment}.${var.domain}"

  environment = replace(var.environment, "_", "-")
}