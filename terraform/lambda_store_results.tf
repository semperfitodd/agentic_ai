module "lambda_store_results" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_store_results"
  description   = "${replace(var.environment, "_", " ")} store sprint results to S3"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256

  environment_variables = {
    RESULTS_BUCKET = module.s3_results_bucket.s3_bucket_id
  }

  source_path = [
    {
      path             = "${path.module}/lambda_store_results"
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
    s3_write = {
      effect = "Allow"
      actions = [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ]
      resources = ["${module.s3_results_bucket.s3_bucket_arn}/*"]
    }
  }

  cloudwatch_logs_retention_in_days = 3

  tags = var.tags
}

