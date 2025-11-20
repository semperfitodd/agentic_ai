module "step_function" {
  source  = "terraform-aws-modules/step-functions/aws"
  version = "5.0.2"

  name = "${var.environment}_workflow"
  type = "STANDARD"

  attach_policies_for_integrations = true

  definition = jsonencode({
    Comment = "Agentic AI Lambda Workflow"
    StartAt = "TempFunction"
    States = {
      TempFunction = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = module.lambda_temp.lambda_function_arn
          Payload = {
            "input.$" = "$"
          }
        }
        ResultSelector = {
          "statusCode.$" = "$.StatusCode"
          "body.$"       = "$.Payload"
        }
        ResultPath = "$.tempResult"
        Next       = "Success"
      }

      Success = {
        Type = "Succeed"
      }
    }
  })

  service_integrations = {
    lambda = {
      lambda = [
        module.lambda_temp.lambda_function_arn
      ]
    }
  }

  logging_configuration = {
    include_execution_data = true
    level                  = "ALL"
  }

  cloudwatch_log_group_retention_in_days = 7

  tags = var.tags
}