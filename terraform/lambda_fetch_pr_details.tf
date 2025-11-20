module "lambda_fetch_pr_details" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_fetch_pr_details"
  description   = "${replace(var.environment, "_", " ")} fetch GitHub PR details function"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 512

  source_path = [
    {
      path             = "${path.module}/lambda_fetch_pr_details"
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

