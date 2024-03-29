variable "lambda_layer_arn" {
  description = "Lambda layer ARN"
}

variable "timeout" {
  default = 300
}

variable "memory" {
  default = 356
}

variable "subnets" {
  default = []
}

variable "security_group" {
  default = ""
}

variable "environment_variables" {}

variable "runtime" {
  default = "nodejs14.x"
}

variable "enabled" {
  default = 1
}

variable "event_pattern" {}

variable "code_source" {
  default = "src"
}

variable "name" {
  default = "EcsTaskStopped"
}
