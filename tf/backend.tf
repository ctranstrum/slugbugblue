terraform {
  backend "s3" {
    bucket         = "do-not-use"
    dynamodb_table = "terraform"
    encrypt        = "in-this"
    key            = "directory"
    region         = "try-dev-or-prod"
  }
}
