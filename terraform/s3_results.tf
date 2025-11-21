module "s3_results_bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 5.0"

  bucket = "${local.environment}-sprint-reports-${random_string.this.result}"

  force_destroy = true

  versioning = {
    enabled = true
  }

  lifecycle_rule = [
    {
      id      = "expire-old-reports"
      enabled = true

      expiration = {
        days = 3
      }
    }
  ]

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "AES256"
      }
    }
  }

  tags = var.tags
}

