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

output "cognito_client_id" {
  description = "Cognito app client ID — use as REACT_APP_COGNITO_CLIENT_ID repo variable and Secrets.cognitoClientId in the iOS app"
  value       = aws_cognito_user_pool_client.app.id
}

output "cognito_authority" {
  description = "Cognito OIDC issuer — use as REACT_APP_COGNITO_AUTHORITY repo variable"
  value       = "https://${aws_cognito_user_pool.main.endpoint}"
}

output "cognito_domain" {
  description = "Cognito managed login base URL — use as Secrets.cognitoDomain in the iOS app"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}"
}

output "cognito_idp_response_url" {
  description = "Redirect URI to register with the Google OAuth client and the Apple Services ID"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}/oauth2/idpresponse"
}

output "cognito_user_pool_id" {
  description = "Cognito user pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "github_token_kms_key_arn" {
  description = "KMS key ARN used to encrypt GitHub tokens passed through Step Functions"
  value       = aws_kms_key.github_token.arn
}
