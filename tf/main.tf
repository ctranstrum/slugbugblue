provider "aws" {
  region = "us-east-1"
}

####################################
### Create the s3 static website ###
module "www" {
  source = "./modules/www"

  domain              = "${var.domain}"
  www                 = "${var.www}"
  create_apex_website = "${var.create_apex_website}"

  tags {
    env = "${var.env}"
  }
}
