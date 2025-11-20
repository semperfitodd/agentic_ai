module "step_function" {
  source  = "terraform-aws-modules/step-functions/aws"
  version = "5.0.2"

  name = "${var.environment}_sprint_pr_intelligence"
  type = "EXPRESS"

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
            "error"       = "Failed to parse repository URLs"
            "details.$"   = "$.parsedRepos.body.error"
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
            Variable      = "$.preparedData.body.totalPRs"
            NumericGreaterThan = 0
            Next          = "FetchPRDetails"
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

      # Step 4: Fetch detailed info for each PR (parallel)
      FetchPRDetails = {
        Type           = "Map"
        ItemsPath      = "$.preparedData.body.prDetailsInputs"
        MaxConcurrency = 10
        Parameters = {
          "owner.$"       = "$$.Map.Item.Value.owner"
          "repo.$"        = "$$.Map.Item.Value.repo"
          "prNumber.$"    = "$$.Map.Item.Value.prNumber"
          "readme.$"      = "$$.Map.Item.Value.readme"
          "githubToken.$" = "$$.Map.Item.Value.githubToken"
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
              ResultSelector = {
                "statusCode.$" = "$.Payload.statusCode"
                "body.$"       = "$.Payload.body"
                "readme.$"     = "$.readme"
              }
              End = true
            }
          }
        }
        ResultPath = "$.prDetailsResults"
        Next       = "AnalyzePRs"
      }

      # Step 5: Analyze each PR with LLM (parallel)
      AnalyzePRs = {
        Type           = "Map"
        ItemsPath      = "$.prDetailsResults"
        MaxConcurrency = 10
        Parameters = {
          "owner.$"    = "$$.Map.Item.Value.body.owner"
          "repo.$"     = "$$.Map.Item.Value.body.repo"
          "readme.$"   = "$$.Map.Item.Value.readme"
          "pr.$"       = "$$.Map.Item.Value.body.pr"
          "comments.$" = "$$.Map.Item.Value.body.comments"
          "reviews.$"  = "$$.Map.Item.Value.body.reviews"
          "files.$"    = "$$.Map.Item.Value.body.files"
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
                  "owner.$"    = "$.owner"
                  "repo.$"     = "$.repo"
                  "readme.$"   = "$.readme"
                  "pr.$"       = "$.pr"
                  "comments.$" = "$.comments"
                  "reviews.$"  = "$.reviews"
                  "files.$"    = "$.files"
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
        ResultPath = "$.analysisResults"
        Next       = "AggregateSprint"
      }

      # Step 6: Aggregate all analyses into final sprint report
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
            "analyses.$"   = "$.analysisResults[*].body"
          }
        }
        ResultSelector = {
          "statusCode.$" = "$.Payload.statusCode"
          "body.$"       = "$.Payload.body"
        }
        ResultPath = "$.finalReport"
        Next       = "Success"
      }

      # Final success state
      Success = {
        Type = "Pass"
        Parameters = {
          "statusCode" = 200
          "body.$"     = "$.finalReport.body"
        }
        End = true
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
        module.lambda_aggregate_sprint.lambda_function_arn
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
