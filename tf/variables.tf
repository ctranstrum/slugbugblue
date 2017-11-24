variable "create_apex_website" {
  description = "Redirect domain.com to www.domain.com"
  default     = false
}

variable "domain" {
  description = "Your domain name"
  default     = "example.com"
}

variable "env" {
  description = "The environment you are creating"
  default     = "prod"
}

variable "www" {
  description = "The prefix for your website"
  default     = "www"
}
