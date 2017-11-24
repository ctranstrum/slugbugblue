# Terraform me up

Use this directory to run terraform against your dev environment. That's usually going to be on a server that, though publicly accessible, isn't advertised to the world.

To save yourself the trouble of typing in the terraform variables each time you run terraform, simply create a terraform.tfvars file with the correct variable names and values.

For example:

    create_apex_website = false
    domain = mydomain.com
    env = dev
    www = beta
