provider "aws" {
  region = "us-east-1"
}

locals {
  tags {
    env = "${var.env}"
  }
}

####################################
### Create the s3 static website ###
module "www" {
  source = "./modules/www"

  domain              = "${var.domain}"
  www                 = "${var.www}"
  create_apex_website = "${var.create_apex_website}"
  zone_id             = "${local.zone_id}"
  tags                = "${local.tags}"
}

###############################
### We need a database, too ###
module "db" {
  source = "./modules/db"

  env          = "${var.env}"
  capacity     = "${var.db_capacity}"
  max_capacity = "${var.db_max_capacity}"
  tags         = "${local.tags}"
}

###########################
### Automagic variables ###
locals {
  // acct_id = "${data.aws_caller_identity.tf.account_id}"
  zone_id = "${data.aws_route53_zone.domain.zone_id}"
}

data "aws_route53_zone" "domain" {
  name = "${var.domain}"
}

// data "aws_caller_identity" "tf" {}

