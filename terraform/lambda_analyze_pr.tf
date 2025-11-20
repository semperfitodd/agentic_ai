module "lambda_analyze_pr" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_analyze_pr"
  description   = "${replace(var.environment, "_", " ")} analyze PR with LLM function"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 180
  memory_size   = 1024

  source_path = [
    {
      path             = "${path.module}/lambda_analyze_pr"
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
    bedrock = {
      effect = "Allow"
      actions = [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ]
      resources = [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
        "arn:aws:bedrock:us-east-1:*:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0"
      ]
    }
  }

  cloudwatch_logs_retention_in_days = 3

  tags = var.tags
}

