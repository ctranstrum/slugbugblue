variable "api" {
  description = "The prefix for the API of the website"
  default     = "api"
}

variable "create_apex_website" {
  description = "Redirect domain.com to www.domain.com"
  default     = false
}

variable "db_capacity" {
  description = "The minimum read/write capacity of the database"
  default     = 5
}

variable "db_max_capacity" {
  description = "The maximum read/write database autoscale capacity"
  default     = 20
}

variable "domain" {
  description = "Your domain name"
  default     = "example.com"
}

variable "env" {
  description = "The environment you are creating"
  default     = "prod"
}

variable "region" {
  description = "The AWS region in which to build your AWS resources"
  default     = "us-east-1"
}

variable "www" {
  description = "The prefix for your website"
  default     = "www"
}
