resource "random_string" "this" {
  length  = 6
  special = false
  upper   = false
}

resource "aws_secretsmanager_secret" "google_token" {
  name        = "${var.environment}_google_token"
  description = "${replace(var.environment, "_", " ")} Google Token"

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "google_token" {
  secret_id = aws_secretsmanager_secret.google_token.id

  secret_string = jsonencode({ "google_token" : "" })

  lifecycle { ignore_changes = [secret_string] }
}