module "lambda_parse_repos" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_parse_repos"
  description   = "${replace(var.environment, "_", " ")} parse GitHub repo URLs function"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256

  source_path = [
    {
      path             = "${path.module}/lambda_parse_repos"
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

