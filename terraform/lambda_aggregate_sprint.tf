module "lambda_aggregate_sprint" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_aggregate_sprint"
  description   = "${replace(var.environment, "_", " ")} aggregate sprint report with Bedrock"
  handler       = "index.handler"
  runtime       = local.lambda_defaults.runtime
  publish       = local.lambda_defaults.publish
  timeout       = 300
  memory_size   = 1024

  environment_variables = merge(local.lambda_common_env, {
    BEDROCK_MODEL_ID = local.bedrock_model_id
    RESULTS_BUCKET   = module.s3_results_bucket.s3_bucket_id
  })

  create_package          = false
  local_existing_package  = local.lambda_stub_zip
  ignore_source_code_hash = true

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
      effect    = "Allow"
      actions   = ["s3:GetObject", "s3:ListBucket"]
      resources = ["${module.s3_results_bucket.s3_bucket_arn}/pr-analyses/*", module.s3_results_bucket.s3_bucket_arn]
    }
    s3_write = {
      effect    = "Allow"
      actions   = ["s3:PutObject"]
      resources = ["${module.s3_results_bucket.s3_bucket_arn}/reports/*"]
    }
  }

  cloudwatch_logs_retention_in_days = local.lambda_defaults.cloudwatch_logs_retention_in_days
  tags                              = local.lambda_defaults.tags
}
