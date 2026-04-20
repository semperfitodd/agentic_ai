locals {
  api_domain_name  = "api.${var.domain}"
  bedrock_model_id = var.bedrock_model_id
  domain_name      = "${local.environment}.${var.domain}"
  environment      = replace(var.environment, "_", "-")

  lambda_defaults = {
    runtime                           = "nodejs20.x"
    publish                           = true
    cloudwatch_logs_retention_in_days = 7
    tags                              = var.tags
  }

  lambda_common_env = {
    LOG_LEVEL       = var.log_level
    FRONTEND_ORIGIN = "https://${local.domain_name}"
  }

  lambda_stub_zip = "${path.module}/lambda_stub.zip"
}
