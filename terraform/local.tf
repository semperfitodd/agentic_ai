locals {
  api_domain_name  = "api.${var.domain}"
  auth_domain_name = "auth.${local.domain_name}"
  auth_redirect_urls = concat(
    ["https://${local.domain_name}/", var.ios_auth_callback_url],
    var.auth_dev_callback_urls,
  )
  bedrock_model_id = var.bedrock_model_id
  # Cross-region profiles (us./eu./apac./global.) route to the same foundation model in several regions.
  bedrock_foundation_model_id = replace(var.bedrock_model_id, "/^(us|eu|apac|global)\\./", "")
  bedrock_invoke_statement = {
    effect  = "Allow"
    actions = ["bedrock:InvokeModel"]
    resources = [
      "arn:aws:bedrock:${var.region}:${data.aws_caller_identity.current.account_id}:inference-profile/${var.bedrock_model_id}",
      "arn:aws:bedrock:*::foundation-model/${local.bedrock_foundation_model_id}",
    ]
  }
  domain_name = "${local.environment}.${var.domain}"
  environment = replace(var.environment, "_", "-")

  lambda_defaults = {
    runtime                           = "nodejs24.x"
    publish                           = true
    cloudwatch_logs_retention_in_days = 30
    tags                              = var.tags
  }

  lambda_common_env = {
    LOG_LEVEL       = var.log_level
    FRONTEND_ORIGIN = "https://${local.domain_name}"
  }

  lambda_stub_zip = "${path.module}/lambda_stub.zip"
}
