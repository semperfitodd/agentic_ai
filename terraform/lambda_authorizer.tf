module "lambda_authorizer" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_authorizer"
  description   = "${replace(var.environment, "_", " ")} API authorizer"
  handler       = "index.handler"
  runtime       = local.lambda_defaults.runtime
  publish       = local.lambda_defaults.publish
  timeout       = 30

  environment_variables = merge(local.lambda_common_env, {
    API_KEY_SECRET = aws_secretsmanager_secret.api_key.name
  })

  create_package          = false
  local_existing_package  = local.lambda_stub_zip
  ignore_source_code_hash = true

  attach_policies = true
  policies        = ["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"]

  attach_policy_statements = true
  policy_statements = {
    secrets = {
      effect    = "Allow"
      actions   = ["secretsmanager:GetSecretValue"]
      resources = [aws_secretsmanager_secret.api_key.arn]
    }
  }

  allowed_triggers = {
    AllowExecutionFromAPIGateway = {
      service    = "apigateway"
      source_arn = "${module.api_gateway.api_execution_arn}/*/*"
    }
  }

  cloudwatch_logs_retention_in_days = local.lambda_defaults.cloudwatch_logs_retention_in_days
  tags                              = local.lambda_defaults.tags
}

resource "aws_secretsmanager_secret" "api_key" {
  name        = "${var.environment}_api_key"
  description = "${replace(var.environment, "_", " ")} API key"

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "api_key_version" {
  secret_id     = aws_secretsmanager_secret.api_key.id
  secret_string = jsonencode({ "API_KEY" : random_string.api_key.result })
}

resource "random_string" "api_key" {
  length  = 64
  lower   = true
  numeric = true
  special = false
  upper   = true

}
