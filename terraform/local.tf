locals {
  api_domain_name = "api.${var.domain}"

  bedrock_model_id = var.bedrock_model_id

  domain_name = "${local.environment}.${var.domain}"

  environment = replace(var.environment, "_", "-")
}