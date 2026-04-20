locals {
  sfn_lambda_retry = [
    {
      ErrorEquals     = ["Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException", "Lambda.TooManyRequestsException"]
      IntervalSeconds = 2
      MaxAttempts     = 3
      BackoffRate     = 2
    }
  ]

  sfn_lambda_catch = [
    {
      ErrorEquals = ["States.ALL"]
      ResultPath  = "$.error"
      Next        = "WorkflowError"
    }
  ]
}

module "step_function" {
  source  = "terraform-aws-modules/step-functions/aws"
  version = "~> 5.0"

  name = "${var.environment}_sprint_pr_intelligence"
  type = "STANDARD"

  attach_policies_for_integrations = true

  definition = jsonencode({
    Comment = "Sprint PR Intelligence Workflow"
    StartAt = "ParseRepos"
    States = {
      ParseRepos = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = module.lambda_parse_repos.lambda_function_arn
          Payload = {
            "repos.$"       = "$.repos"
            "since.$"       = "$.since"
            "until.$"       = "$.until"
            "githubToken.$" = "$.githubToken"
            "sprintName.$"  = "$.sprintName"
          }
        }
        ResultSelector = {
          "statusCode.$" = "$.Payload.statusCode"
          "body.$"       = "$.Payload.body"
        }
        ResultPath = "$.parsedRepos"
        Retry      = local.sfn_lambda_retry
        Catch = [
          {
            ErrorEquals = ["States.ALL"]
            ResultPath  = "$.error"
            Next        = "ParseError"
          }
        ]
        Next = "CheckParseSuccess"
      }

      CheckParseSuccess = {
        Type = "Choice"
        Choices = [
          {
            Variable      = "$.parsedRepos.statusCode"
            NumericEquals = 200
            Next          = "ExtractParsedData"
          }
        ]
        Default = "ParseError"
      }

      ExtractParsedData = {
        Type = "Pass"
        Parameters = {
          "repos.$"       = "$.parsedRepos.body.repos"
          "since.$"       = "$.parsedRepos.body.since"
          "until.$"       = "$.parsedRepos.body.until"
          "githubToken.$" = "$.parsedRepos.body.githubToken"
          "sprintName.$"  = "$.parsedRepos.body.sprintName"
        }
        Next = "FetchRepoData"
      }

      ParseError = {
        Type = "Pass"
        Parameters = {
          statusCode = 400
          body = {
            "error"     = "Failed to parse repository URLs"
            "details.$" = "$.parsedRepos.body.error"
          }
        }
        End = true
      }

      FetchRepoData = {
        Type           = "Map"
        ItemsPath      = "$.repos"
        MaxConcurrency = 5
        Parameters = {
          "owner.$"       = "$$.Map.Item.Value.owner"
          "repo.$"        = "$$.Map.Item.Value.repo"
          "since.$"       = "$.since"
          "until.$"       = "$.until"
          "githubToken.$" = "$.githubToken"
        }
        Iterator = {
          StartAt = "FetchSingleRepo"
          States = {
            FetchSingleRepo = {
              Type     = "Task"
              Resource = "arn:aws:states:::lambda:invoke"
              Parameters = {
                FunctionName = module.lambda_fetch_repo_data.lambda_function_arn
                Payload = {
                  "owner.$"       = "$.owner"
                  "repo.$"        = "$.repo"
                  "since.$"       = "$.since"
                  "until.$"       = "$.until"
                  "githubToken.$" = "$.githubToken"
                }
              }
              ResultSelector = {
                "statusCode.$" = "$.Payload.statusCode"
                "body.$"       = "$.Payload.body"
              }
              Retry = local.sfn_lambda_retry
              Catch = [
                {
                  ErrorEquals = ["States.ALL"]
                  ResultPath  = "$.error"
                  Next        = "FetchRepoError"
                }
              ]
              End = true
            }
            FetchRepoError = {
              Type = "Pass"
              Parameters = {
                statusCode = 500
                body = {
                  "error"   = "Failed to fetch repo data"
                  "owner.$" = "$.owner"
                  "repo.$"  = "$.repo"
                  prs       = []
                  prCount   = 0
                }
              }
              End = true
            }
          }
        }
        ResultPath = "$.repoDataResults"
        Next       = "PrepareData"
      }

      PrepareData = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = module.lambda_prepare_data.lambda_function_arn
          Payload = {
            "since.$"           = "$.since"
            "until.$"           = "$.until"
            "githubToken.$"     = "$.githubToken"
            "sprintName.$"      = "$.sprintName"
            "repos.$"           = "$.repos"
            "repoDataResults.$" = "$.repoDataResults"
          }
        }
        ResultSelector = {
          "statusCode.$" = "$.Payload.statusCode"
          "body.$"       = "$.Payload.body"
        }
        ResultPath = "$.preparedData"
        Retry      = local.sfn_lambda_retry
        Catch      = local.sfn_lambda_catch
        Next       = "CheckIfPRsExist"
      }

      CheckIfPRsExist = {
        Type = "Choice"
        Choices = [
          {
            Variable           = "$.preparedData.body.totalPRs"
            NumericGreaterThan = 0
            Next               = "FetchPRDetails"
          }
        ]
        Default = "NoPRsFound"
      }

      NoPRsFound = {
        Type = "Pass"
        Parameters = {
          statusCode = 200
          body = {
            "sprintName.$"  = "$.sprintName"
            "since.$"       = "$.since"
            "until.$"       = "$.until"
            "repos.$"       = "$.repos"
            totalPRs        = 0
            report          = "No pull requests were merged during this sprint period."
            "generatedAt.$" = "$$.State.EnteredTime"
          }
        }
        End = true
      }

      FetchPRDetails = {
        Type           = "Map"
        ItemsPath      = "$.preparedData.body.prDetailsInputs"
        MaxConcurrency = 10
        Parameters = {
          "owner.$"       = "$$.Map.Item.Value.owner"
          "repo.$"        = "$$.Map.Item.Value.repo"
          "prNumber.$"    = "$$.Map.Item.Value.prNumber"
          "githubToken.$" = "$.githubToken"
        }
        Iterator = {
          StartAt = "FetchSinglePRDetails"
          States = {
            FetchSinglePRDetails = {
              Type     = "Task"
              Resource = "arn:aws:states:::lambda:invoke"
              Parameters = {
                FunctionName = module.lambda_fetch_pr_details.lambda_function_arn
                Payload = {
                  "owner.$"       = "$.owner"
                  "repo.$"        = "$.repo"
                  "prNumber.$"    = "$.prNumber"
                  "githubToken.$" = "$.githubToken"
                }
              }
              Retry = local.sfn_lambda_retry
              Catch = [
                {
                  ErrorEquals = ["States.ALL"]
                  ResultPath  = "$.error"
                  Next        = "FetchPRDetailsError"
                }
              ]
              End = true
            }
            FetchPRDetailsError = {
              Type = "Pass"
              Parameters = {
                "owner.$"    = "$.owner"
                "repo.$"     = "$.repo"
                "prNumber.$" = "$.prNumber"
                "error"      = "Failed to fetch PR details"
              }
              End = true
            }
          }
        }
        ResultPath = null
        Next       = "PrepareAnalysisInput"
      }

      PrepareAnalysisInput = {
        Type = "Pass"
        Parameters = {
          "since.$"       = "$.since"
          "until.$"       = "$.until"
          "sprintName.$"  = "$.sprintName"
          "repos.$"       = "$.repos"
          "githubToken.$" = "$.githubToken"
          "prList.$"      = "$.preparedData.body.prDetailsInputs"
          "readmeS3Key.$" = "$.preparedData.body.readmeS3Key"
          "s3Bucket.$"    = "$.preparedData.body.s3Bucket"
          "totalPRs.$"    = "$.preparedData.body.totalPRs"
        }
        OutputPath = "$"
        Next       = "AnalyzePRs"
      }

      AnalyzePRs = {
        Type           = "Map"
        ItemsPath      = "$.prList"
        MaxConcurrency = 10
        Parameters = {
          "owner.$"       = "$$.Map.Item.Value.owner"
          "repo.$"        = "$$.Map.Item.Value.repo"
          "prNumber.$"    = "$$.Map.Item.Value.prNumber"
          "readmeS3Key.$" = "$.readmeS3Key"
          "s3Bucket.$"    = "$.s3Bucket"
        }
        Iterator = {
          StartAt = "AnalyzeSinglePR"
          States = {
            AnalyzeSinglePR = {
              Type     = "Task"
              Resource = "arn:aws:states:::lambda:invoke"
              Parameters = {
                FunctionName = module.lambda_analyze_pr.lambda_function_arn
                Payload = {
                  "owner.$"       = "$.owner"
                  "repo.$"        = "$.repo"
                  "prNumber.$"    = "$.prNumber"
                  "readmeS3Key.$" = "$.readmeS3Key"
                  "s3Bucket.$"    = "$.s3Bucket"
                }
              }
              Retry = local.sfn_lambda_retry
              Catch = [
                {
                  ErrorEquals = ["States.ALL"]
                  ResultPath  = "$.error"
                  Next        = "AnalysisErrorHandler"
                }
              ]
              End = true
            }
            AnalysisErrorHandler = {
              Type = "Pass"
              Parameters = {
                "owner.$"    = "$.owner"
                "repo.$"     = "$.repo"
                "prNumber.$" = "$.prNumber"
                "error"      = "Analysis failed"
              }
              End = true
            }
          }
        }
        ResultPath = null
        Next       = "AggregateSprint"
      }

      AggregateSprint = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = module.lambda_aggregate_sprint.lambda_function_arn
          Payload = {
            "sprintName.$" = "$.sprintName"
            "since.$"      = "$.since"
            "until.$"      = "$.until"
            "repos.$"      = "$.repos"
            "analyses.$"   = "$.prList"
          }
        }
        ResultSelector = {
          "body.$" = "$.Payload.body"
        }
        Retry = local.sfn_lambda_retry
        Catch = local.sfn_lambda_catch
        Next  = "CheckAggregateSuccess"
      }

      CheckAggregateSuccess = {
        Type = "Choice"
        Choices = [
          {
            Variable  = "$.body.markdownS3Key"
            IsPresent = true
            Next      = "StoreResults"
          }
        ]
        Default = "NoValidAnalyses"
      }

      NoValidAnalyses = {
        Type       = "Pass"
        Parameters = { "body.$" = "$.body" }
        End        = true
      }

      StoreResults = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = module.lambda_store_results.lambda_function_arn
          Payload = {
            "statusCode" = 200
            "body.$"     = "$.body"
          }
        }
        ResultSelector = {
          "sprintName.$" = "$.Payload.body.sprintName"
          "since.$"      = "$.Payload.body.since"
          "until.$"      = "$.Payload.body.until"
          "totalPRs.$"   = "$.Payload.body.totalPRs"
          "s3Location.$" = "$.Payload.body.s3Location"
        }
        Retry = local.sfn_lambda_retry
        Catch = local.sfn_lambda_catch
        Next  = "Success"
      }

      WorkflowError = {
        Type = "Pass"
        Parameters = {
          statusCode = 500
          body = {
            "error"     = "Workflow execution failed"
            "details.$" = "$.error"
          }
        }
        End = true
      }

      Success = {
        Type = "Pass"
        End  = true
      }
    }
  })

  service_integrations = {
    lambda = {
      lambda = [
        module.lambda_parse_repos.lambda_function_arn,
        module.lambda_fetch_repo_data.lambda_function_arn,
        module.lambda_prepare_data.lambda_function_arn,
        module.lambda_fetch_pr_details.lambda_function_arn,
        module.lambda_analyze_pr.lambda_function_arn,
        module.lambda_aggregate_sprint.lambda_function_arn,
        module.lambda_store_results.lambda_function_arn
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
