module "lambda_get_markdown" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_get_markdown"
  description   = "${replace(var.environment, "_", " ")} get markdown report function"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 512

  environment_variables = {
    RESULTS_BUCKET = module.s3_results_bucket.s3_bucket_id
  }

  source_path = [
    {
      path             = "${path.module}/lambda_get_markdown"
      npm_requirements = true
      commands = [
        "npm install",
        "npm run build",
        ":zip"
      ]
    }
  ]

  attach_policies = true
  policies        = ["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"]

  attach_policy_statements = true
  policy_statements = {
    s3_read = {
      effect = "Allow"
      actions = [
        "s3:GetObject"
      ]
      resources = ["${module.s3_results_bucket.s3_bucket_arn}/*"]
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

