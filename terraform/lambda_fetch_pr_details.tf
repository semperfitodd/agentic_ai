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

  attach_policy_statements = true
  policy_statements = {
    s3_put = {
      effect = "Allow"
      actions = [
        "s3:PutObject"
      ]
      resources = [
        "${module.s3_results_bucket.s3_bucket_arn}/*"
      ]
    }
  }

  environment_variables = {
    RESULTS_BUCKET = module.s3_results_bucket.s3_bucket_id
  }

  cloudwatch_logs_retention_in_days = 3

  tags = var.tags
}

