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

  environment_variables = {
    BEDROCK_MODEL_ID = local.bedrock_model_id
    RESULTS_BUCKET   = module.s3_results_bucket.s3_bucket_id
  }

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
        "arn:aws:bedrock:${var.region}:*:inference-profile/${local.bedrock_model_id}",
        "arn:aws:bedrock:*::foundation-model/*anthropic.claude*"
      ]
    }
    s3_write = {
      effect = "Allow"
      actions = [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ]
      resources = ["${module.s3_results_bucket.s3_bucket_arn}/pr-analyses/*"]
    }
    s3_read = {
      effect = "Allow"
      actions = [
        "s3:GetObject",
        "s3:ListBucket"
      ]
      resources = [
        "${module.s3_results_bucket.s3_bucket_arn}/pr-details/*",
        "${module.s3_results_bucket.s3_bucket_arn}/readmes/*",
        module.s3_results_bucket.s3_bucket_arn
      ]
    }
  }

  cloudwatch_logs_retention_in_days = 3

  tags = var.tags
}

