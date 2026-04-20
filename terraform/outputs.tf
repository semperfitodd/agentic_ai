output "api_key_secret_name" {
  description = "Secrets Manager secret name containing the API key"
  value       = aws_secretsmanager_secret.api_key.name
}

output "api_url" {
  description = "API Gateway base URL"
  value       = "https://${local.api_domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — use as CLOUDFRONT_DISTRIBUTION_ID repo variable"
  value       = module.cdn.cloudfront_distribution_id
}
output "frontend_url" {
  description = "Frontend CloudFront URL"
  value       = "https://${local.domain_name}"
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC — use as AWS_ROLE_ARN repo variable"
  value       = aws_iam_role.github_actions.arn
}

output "results_bucket" {
  description = "S3 bucket name for sprint reports"
  value       = module.s3_results_bucket.s3_bucket_id
}

output "site_bucket_name" {
  description = "S3 bucket name for the static frontend — use as SITE_BUCKET repo variable"
  value       = module.site_s3_bucket.s3_bucket_id
}
