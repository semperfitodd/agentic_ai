module "lambda_delete_account" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.13"

  function_name = "${var.environment}_delete_account"
  description   = "${replace(var.environment, "_", " ")} delete the calling user's account"
  handler       = "index.handler"
  runtime       = local.lambda_defaults.runtime
  publish       = local.lambda_defaults.publish
  timeout       = 30

  environment_variables = merge(local.lambda_common_env, {
    USER_POOL_ID = aws_cognito_user_pool.main.id
  })

  create_package          = false
  local_existing_package  = local.lambda_stub_zip
  ignore_source_code_hash = true

  attach_policies = true
  policies        = ["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"]

  attach_policy_statements = true
  policy_statements = {
    cognito_delete = {
      effect    = "Allow"
      actions   = ["cognito-idp:AdminDeleteUser"]
      resources = [aws_cognito_user_pool.main.arn]
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
