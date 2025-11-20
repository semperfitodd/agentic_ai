module "step_function" {
  source  = "terraform-aws-modules/step-functions/aws"
  version = "5.0.2"

  name = "${var.environment}_sprint_pr_intelligence"
  type = "STANDARD"

  attach_policies_for_integrations = true

  definition = jsonencode({
    Comment = "Sprint PR Intelligence Workflow"
    StartAt = "ParseRepos"
    States = {
      # Step 0: Parse repository URLs into owner/repo format
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
        Next       = "CheckParseSuccess"
      }

      # Check if parsing was successful
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

      # Extract parsed data
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

      # Parse error state
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

      # Step 1: Fetch README and PRs for each repository (parallel)
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
              End = true
            }
          }
        }
        ResultPath = "$.repoDataResults"
        Next       = "PrepareData"
      }

      # Step 2: Prepare and flatten data structure
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
        Next       = "CheckIfPRsExist"
      }

      # Step 3: Check if any PRs exist
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

      # Step 3a: If no PRs, return empty report
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

      # Step 4: Fetch detailed info for each PR (parallel) - stores to S3 only
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
              End = true
            }
          }
        }
        ResultPath = null
        Next       = "PrepareAnalysisInput"
      }

      # Prepare input for analysis step - REPLACE state with minimal data only
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
        Next       = "LogPRDetailsSize"
      }

      # Log the count of PR details results
      LogPRDetailsSize = {
        Type    = "Pass"
        Comment = "PR details fetched and stored in S3"
        Next    = "AnalyzePRs"
      }

      # Step 5: Analyze each PR with LLM (parallel) - stores to S3 only
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
              Retry = [
                {
                  ErrorEquals = [
                    "Lambda.ServiceException",
                    "Lambda.AWSLambdaException",
                    "Lambda.SdkClientException",
                    "Lambda.TooManyRequestsException"
                  ]
                  IntervalSeconds = 2
                  MaxAttempts     = 3
                  BackoffRate     = 2
                }
              ]
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
        Next       = "PrepareAggregationInput"
      }

      # Aggregation uses same state - no preparation needed
      PrepareAggregationInput = {
        Type       = "Pass"
        OutputPath = "$"
        Next       = "LogAnalysisSize"
      }

      # Log the count of analysis results
      LogAnalysisSize = {
        Type    = "Pass"
        Comment = "PR analyses complete and stored in S3"
        Next    = "AggregateSprint"
      }

      # Step 6: Aggregate all analyses into final sprint report (markdown only)
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
          "sprintName.$"      = "$.Payload.body.sprintName"
          "since.$"           = "$.Payload.body.since"
          "until.$"           = "$.Payload.body.until"
          "repos.$"           = "$.Payload.body.repos"
          "totalPRs.$"        = "$.Payload.body.totalPRs"
          "markdownS3Key.$"   = "$.Payload.body.markdownS3Key"
          "s3Bucket.$"        = "$.Payload.body.s3Bucket"
          "generatedAt.$"     = "$.Payload.body.generatedAt"
          "skippedAnalyses.$" = "$.Payload.body.skippedAnalyses"
        }
        Next = "StoreResults"
      }

      # Step 7: Store results to S3 (markdown)
      StoreResults = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = module.lambda_store_results.lambda_function_arn
          Payload = {
            "statusCode" = 200
            "body.$"     = "$"
          }
        }
        ResultSelector = {
          "sprintName.$" = "$.Payload.body.sprintName"
          "since.$"      = "$.Payload.body.since"
          "until.$"      = "$.Payload.body.until"
          "totalPRs.$"   = "$.Payload.body.totalPRs"
          "s3Location.$" = "$.Payload.body.s3Location"
        }
        Next = "Success"
      }

      # Final success state - return S3 location metadata only
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
