###############################################
### Create S3 bucket to host static website ###
locals {
  website = "${var.www}.${var.domain}"
  aliases = "${compact(list(local.website, var.create_apex_website ? "${var.domain}" : ""))}"
}

resource "aws_s3_bucket" "www" {
  bucket = "${local.website}"
  acl    = "private"
  policy = "${data.aws_iam_policy_document.www.json}"
  tags   = "${var.tags}"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    enabled = true

    noncurrent_version_expiration {
      days = 30
    }
  }
}

data "aws_iam_policy_document" "www" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["arn:aws:s3:::${local.website}/*"]

    principals {
      type        = "AWS"
      identifiers = ["${aws_cloudfront_origin_access_identity.www.iam_arn}"]
    }
  }

  statement {
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${local.website}"]

    principals {
      type        = "AWS"
      identifiers = ["${aws_cloudfront_origin_access_identity.www.iam_arn}"]
    }
  }
}

resource "aws_s3_bucket" "logs" {
  bucket = "${local.website}.logs"
  acl    = "private"
  tags   = "${var.tags}"

  lifecycle_rule {
    enabled = true

    expiration {
      days = 90
    }
  }
}

##########################################
### Create the cloudfront distribution ###
resource "aws_cloudfront_distribution" "www" {
  aliases             = ["${local.aliases}"]
  comment             = "${local.website}"
  price_class         = "PriceClass_200"
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  tags                = "${var.tags}"

  viewer_certificate {
    acm_certificate_arn      = "${data.aws_acm_certificate.www.arn}"
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2018"
  }

  origin {
    domain_name = "${aws_s3_bucket.www.bucket_domain_name}"
    origin_id   = "www"

    s3_origin_config {
      origin_access_identity = "${aws_cloudfront_origin_access_identity.www.cloudfront_access_identity_path}"
    }
  }

  default_cache_behavior {
    target_origin_id       = "www"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    min_ttl                = 60
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }
  }

  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  logging_config {
    include_cookies = false
    bucket          = "${aws_s3_bucket.logs.bucket_domain_name}"
    prefix          = "www/"
  }
}

resource "aws_cloudfront_origin_access_identity" "www" {
  comment = "${local.website}"
}

data "aws_acm_certificate" "www" {
  domain = "${local.website}"
}

############################
### Set up CNAME records ###
resource "aws_route53_record" "www" {
  count   = "${length(local.aliases)}"
  zone_id = "${var.zone_id}"
  name    = "${local.aliases[count.index]}"
  type    = "A"

  alias {
    name                   = "${aws_cloudfront_distribution.www.domain_name}"
    zone_id                = "${aws_cloudfront_distribution.www.hosted_zone_id}"
    evaluate_target_health = false
  }
}
