module "lambda_fetch_repo_data" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_fetch_repo_data"
  description   = "${replace(var.environment, "_", " ")} fetch GitHub repo data function"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 512

  source_path = [
    {
      path             = "${path.module}/lambda_fetch_repo_data"
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

