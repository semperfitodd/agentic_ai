module "lambda_aggregate_sprint" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_aggregate_sprint"
  description   = "${replace(var.environment, "_", " ")} aggregate sprint report function"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 512

  source_path = [
    {
      path             = "${path.module}/lambda_aggregate_sprint"
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

  cloudwatch_logs_retention_in_days = 3

  tags = var.tags
}

