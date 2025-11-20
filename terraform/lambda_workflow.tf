module "lambda_workflow" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_workflow_proxy"
  description   = "${replace(var.environment, "_", " ")} workflow proxy function"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 30

  environment_variables = {
    STATE_MACHINE_ARN = module.step_function.state_machine_arn
  }

  source_path = [
    {
      path             = "${path.module}/lambda_workflow"
      npm_requirements = true
      commands = [
        "npm install",
        "npm run build",
        ":zip"
      ]
      patterns = [
        "!node_modules/.+",
        "node_modules/.+\\.so$"
      ]
    }
  ]

  attach_policies = true
  policies        = ["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"]

  attach_policy_statements = true
  policy_statements = {
    stepfunctions = {
      effect = "Allow"
      actions = [
        "states:StartExecution",
        "states:StartSyncExecution"
      ]
      resources = [module.step_function.state_machine_arn]
    }
  }

  allowed_triggers = {
    AllowExecutionFromAPIGateway = {
      service    = "apigateway"
      source_arn = "${module.api_gateway.api_execution_arn}/*/*"
    }
  }

  cloudwatch_logs_retention_in_days = 3

  tags = var.tags
}

