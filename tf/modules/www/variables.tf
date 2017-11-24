variable "create_apex_website" {
  description = "Redirect domain.com to www.domain.com"
  default     = false
}

variable "domain" {
  description = "Your domain name"
}

variable "tags" {
  description = "A map of tags for tagging things with tags"
  type        = "map"
}

variable "www" {
  description = "Usually www, but hey, it's your life"
  default     = "www"
}
