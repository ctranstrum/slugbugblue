variable "capacity" {
  description = "The minimum read/write capacity of the database"
  default     = 5
}

variable "env" {
  description = "The environment you are creating the database in"
}

variable "max_capacity" {
  description = "The maximum read/write capacity to autoscale to"
  default     = 20
}

variable "tags" {
  type        = "map"
  description = "A map of tags to tag your resources with tagginess"
}
