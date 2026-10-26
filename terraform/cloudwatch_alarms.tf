resource "aws_cloudwatch_metric_alarm" "step_function_executions_failed" {
  depends_on = [aws_iam_role_policy.github_actions]

  alarm_name          = "${var.environment}_sprint_sfn_executions_failed"
  alarm_description   = "Sprint intelligence Step Functions reported failed executions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ExecutionsFailed"
  namespace           = "AWS/States"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    StateMachineArn = module.step_function.state_machine_arn
  }

  tags = var.tags
}
