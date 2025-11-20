output "api_url" {
  value = local.api_domain_name
}

output "frontend_url" {
  value = local.domain_name
}

output "results_bucket" {
  description = "S3 bucket for sprint reports"
  value       = module.s3_results_bucket.s3_bucket_id
}
