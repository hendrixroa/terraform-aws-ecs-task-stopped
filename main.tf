module "lambda_ecs_task_stopped" {
  source               = "hendrixroa/lambda/aws"
  enabled              = var.enabled
  code_location        = "./src/"
  filename             = "ecsTaskStopped.zip"
  lambda_iam_role      = aws_iam_role.lambda_alerting_role.arn
  lambda_function_name = "EcsTaskStopped"
  lambda_runtime       = var.runtime
  timeout              = var.timeout
  memory               = var.memory
  layer_arn            = var.lambda_layer_arn

  subnets = var.subnets
  sg_ids  = [ var.security_group ]

  environment_variables = var.environment_variables
}