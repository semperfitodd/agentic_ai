module "lambda_aggregate_sprint" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_aggregate_sprint"
  description   = "${replace(var.environment, "_", " ")} aggregate sprint report function"
  handler       = "index.handler"
  publish       = true
  runtime       = "nodejs20.x"
  timeout       = 300
  memory_size   = 1024

  environment_variables = {
    BEDROCK_MODEL_ID = local.bedrock_model_id
    RESULTS_BUCKET   = module.s3_results_bucket.s3_bucket_id
  }

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

  attach_policy_statements = true
  policy_statements = {
    bedrock = {
      effect = "Allow"
      actions = [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ]
      resources = [
        "arn:aws:bedrock:${var.region}:*:inference-profile/${local.bedrock_model_id}",
        "arn:aws:bedrock:*::foundation-model/*anthropic.claude*"
      ]
    }
    s3_read = {
      effect = "Allow"
      actions = [
        "s3:GetObject"
      ]
      resources = ["${module.s3_results_bucket.s3_bucket_arn}/pr-analyses/*"]
    }
    s3_write = {
      effect = "Allow"
      actions = [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ]
      resources = ["${module.s3_results_bucket.s3_bucket_arn}/sprint-reports/*"]
    }
  }

  cloudwatch_logs_retention_in_days = 3

  tags = var.tags
}

