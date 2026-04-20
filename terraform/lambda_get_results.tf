module "lambda_get_results" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.1"

  function_name = "${var.environment}_get_results"
  description   = "${replace(var.environment, "_", " ")} retrieve sprint results"
  handler       = "index.handler"
  runtime       = local.lambda_defaults.runtime
  publish       = local.lambda_defaults.publish
  timeout       = 30
  memory_size   = 256

  environment_variables = merge(local.lambda_common_env, {
    RESULTS_BUCKET = module.s3_results_bucket.s3_bucket_id
    API_URL        = "https://${local.api_domain_name}"
  })

  create_package          = false
  local_existing_package  = local.lambda_stub_zip
  ignore_source_code_hash = true

  attach_policies = true
  policies        = ["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"]

  attach_policy_statements = true
  policy_statements = {
    s3_read = {
      effect    = "Allow"
      actions   = ["s3:GetObject", "s3:ListBucket"]
      resources = [module.s3_results_bucket.s3_bucket_arn, "${module.s3_results_bucket.s3_bucket_arn}/*"]
    }
    sfn_describe = {
      effect    = "Allow"
      actions   = ["states:DescribeExecution"]
      resources = ["*"]
    }
  }

  allowed_triggers = {
    AllowExecutionFromAPIGateway = {
      service    = "apigateway"
      source_arn = "${module.api_gateway.api_execution_arn}/*/*"
    }
  }

  cloudwatch_logs_retention_in_days = local.lambda_defaults.cloudwatch_logs_retention_in_days
  tags                              = local.lambda_defaults.tags

}
