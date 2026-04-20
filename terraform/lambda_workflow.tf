module "lambda_workflow" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_workflow_proxy"
  description   = "${replace(var.environment, "_", " ")} workflow proxy"
  handler       = "index.handler"
  runtime       = local.lambda_defaults.runtime
  publish       = local.lambda_defaults.publish
  timeout       = 30

  environment_variables = merge(local.lambda_common_env, {
    STATE_MACHINE_ARN = module.step_function.state_machine_arn
  })

  create_package          = false
  local_existing_package  = local.lambda_stub_zip
  ignore_source_code_hash = true

  attach_policies = true
  policies        = ["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"]

  attach_policy_statements = true
  policy_statements = {
    stepfunctions = {
      effect    = "Allow"
      actions   = ["states:StartExecution"]
      resources = [module.step_function.state_machine_arn]
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
