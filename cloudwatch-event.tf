// ECS Task Stopped
resource "aws_cloudwatch_event_rule" "ecs_taskstopped_rule" {
  name        = "ecs_taskstopped_rule"
  description = "Event rule to capture ecs stops task in API cluster"

  event_pattern = <<PATTERN
{
  "source": [
    "aws.ecs"
  ],
  "detail-type": [
    "ECS Task State Change"
  ],
  "detail": {
    "clusterArn": ${var.ecs_clusters_arn},
    "lastStatus": [
      "STOPPED",
      "RUNNING"
    ]
  }
}
PATTERN

}

resource "aws_cloudwatch_event_target" "ecs_taskstopped_target" {
  rule      = aws_cloudwatch_event_rule.ecs_taskstopped_rule.name
  target_id = "ecs_taskstopped_target"
  arn       = module.lambda_ecs_task_stopped.lambda_arn
}

resource "aws_lambda_permission" "allow_invocation_ecsStopped" {
  statement_id  = "AllowExecutionEcsStopped"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda_ecs_task_stopped.lambda_arn
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.ecs_taskstopped_rule.arn
}