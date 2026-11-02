module "lambda_fetch_pr_details" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.13"

  function_name = "${var.environment}_fetch_pr_details"
  description   = "${replace(var.environment, "_", " ")} fetch GitHub PR details"
  handler       = "index.handler"
  runtime       = local.lambda_defaults.runtime
  publish       = local.lambda_defaults.publish
  timeout       = 60
  memory_size   = 512

  environment_variables = merge(local.lambda_common_env, {
    RESULTS_BUCKET = module.s3_results_bucket.s3_bucket_id
  })

  create_package          = false
  local_existing_package  = local.lambda_stub_zip
  ignore_source_code_hash = true

  attach_policies = true
  policies        = ["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"]

  attach_policy_statements = true
  policy_statements = {
    s3_write = {
      effect    = "Allow"
      actions   = ["s3:PutObject"]
      resources = [local.results_users_object_arn]
    }
    kms_decrypt = local.github_token_decrypt_statement
  }

  cloudwatch_logs_retention_in_days = local.lambda_defaults.cloudwatch_logs_retention_in_days
  tags                              = local.lambda_defaults.tags

}
