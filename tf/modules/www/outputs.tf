output "access_logs" {
  description = "The S3 bucket where http access is logged"
  value       = "${aws_s3_bucket.logs.id}"
}

output "cloudfront_name" {
  description = "The domain name of the cloudfront distribution"
  value       = "${aws_cloudfront_distribution.www.domain_name}"
}

output "domain_names" {
  description = "The domain names you can use to access the website"
  value       = ["${aws_route53_record.www.*.fqdn}"]
}

output "s3_website" {
  description = "The S3 bucket containing the static website"
  value       = "${aws_s3_bucket.www.id}"
}
