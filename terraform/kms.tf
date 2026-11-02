resource "aws_kms_key" "github_token" {
  depends_on = [aws_iam_role_policy.github_actions]

  description             = "${replace(var.environment, "_", " ")} per-execution GitHub token encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = var.tags
}

locals {
  github_token_decrypt_statement = {
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = [aws_kms_key.github_token.arn]
  }
}

resource "aws_kms_alias" "github_token" {
  name          = "alias/${var.environment}_github_token"
  target_key_id = aws_kms_key.github_token.key_id
}
