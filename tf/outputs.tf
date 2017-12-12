output "access_logs" {
  description = "The S3 bucket where http access is logged"
  value       = "${module.www.access_logs}"
}

output "cloudfront_name" {
  description = "The website's cloudfront domain name"
  value       = "${module.www.cloudfront_name}"
}

output "database_name" {
  description = "The name of the DynamoDB database"
  value       = "${module.db.name}"
}

output "domain_names" {
  description = "The domain names you can use to access the website"
  value       = ["${module.www.domain_names}"]
}

output "s3_website" {
  description = "The S3 bucket containing the static website"
  value       = "${module.www.s3_website}"
}
