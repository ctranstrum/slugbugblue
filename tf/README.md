# Prerequisites

You must manually create an IAM user with permissions to create and destroy AWS resources.

You must configure the AWS credentials in your environment to authenticate as that user.

You must have an existing Route53-managed domain name.

You must obtain a certificate from Amazon Certificate Manager for the name(s) of the website.

In order to use an S3 backend:
* You must create an S3 bucket, private, with encryption, for use as the S3 backend.
* You must create a DynamoDB table with a primary key named LockID to enable the S3 backend.
  * Your IAM user must be given dynamodb:\* permissions to that table.

# Running terraform

Don't run terraform from the `tf` directory. Terraform is a pain in the patootey when it comes to handling environments. So we have environments in subdirectories. And then we run from there.

But the only thing we really want to be different between dev and prod are a few variables. The rest of the configuration should apply equally. Terraform doesn't let us do that easily. So we link back to a common parent directory, and in the `dev` and `prod` directories we edit only the files that need to be different.

That's usually just going to be `backend.tf` and `terraform.tfvars`.

So start in the `tf/dev` directory, and edit the files (not the symlinks) and then run `terraform init` and `terraform plan` and `terraform apply` to your heart's content.
