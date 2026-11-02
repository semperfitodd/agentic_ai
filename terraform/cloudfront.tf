data "aws_route53_zone" "public" {
  name         = var.domain
  private_zone = false
}

module "cdn" {
  source  = "terraform-aws-modules/cloudfront/aws"
  version = "~> 6.7"

  aliases             = [local.domain_name]
  comment             = "${local.domain_name} Site CDN"
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = "PriceClass_100"
  retain_on_delete    = false
  wait_for_deployment = false

  default_root_object = "index.html"

  # Serve prerendered routes: /features -> /features/index.html. Unknown paths still fall back to /index.html below.
  cloudfront_functions = {
    index_rewrite = {
      name    = "${local.environment}-index-rewrite"
      comment = "Map extensionless paths to prerendered index.html files"
      publish = true
      code    = <<-EOT
        function handler(event) {
          var request = event.request;
          var uri = request.uri;
          if (uri.endsWith('/')) {
            request.uri = uri + 'index.html';
          } else if (uri.lastIndexOf('.') < uri.lastIndexOf('/')) {
            request.uri = uri + '/index.html';
          }
          return request;
        }
      EOT
    }
  }

  origin_access_control = {
    (local.domain_name) = {
      description      = "${local.domain_name} CloudFront access to S3"
      origin_type      = "s3"
      signing_behavior = "always"
      signing_protocol = "sigv4"
    }
  }
  custom_error_response = [
    {
      error_code            = 403
      response_code         = 200
      response_page_path    = "/index.html"
      error_caching_min_ttl = 0
    },
    {
      error_code            = 404
      response_code         = 200
      response_page_path    = "/index.html"
      error_caching_min_ttl = 0
    }
  ]

  origin = {
    s3_primary = {
      domain_name               = module.site_s3_bucket.s3_bucket_bucket_domain_name
      origin_access_control_key = local.domain_name
    }
  }

  default_cache_behavior = {
    target_origin_id       = "s3_primary"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]
    compress        = true

    function_association = {
      viewer-request = {
        function_key = "index_rewrite"
      }
    }
  }

  viewer_certificate = {
    acm_certificate_arn = aws_acm_certificate.site.arn
    ssl_support_method  = "sni-only"
  }

  tags = merge(var.tags, {
    Name = local.domain_name
  })
}

resource "aws_acm_certificate" "site" {
  domain_name       = local.domain_name
  validation_method = "DNS"

  tags = merge(var.tags, {
    Name = local.domain_name
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "site" {
  zone_id = data.aws_route53_zone.public.zone_id
  name    = local.domain_name
  type    = "A"

  alias {
    name                   = module.cdn.cloudfront_distribution_domain_name
    zone_id                = module.cdn.cloudfront_distribution_hosted_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "site_verify" {
  for_each = {
    for dvo in aws_acm_certificate.site.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.public.zone_id
}

resource "aws_route53_record" "google_site_verification" {
  zone_id = data.aws_route53_zone.public.zone_id
  name    = local.domain_name
  type    = "TXT"
  ttl     = 300
  records = ["google-site-verification=ylJMKxS3KA26LDJ_JxLMzx6n_Psxub42AW9yBf14ZXs"]
}
