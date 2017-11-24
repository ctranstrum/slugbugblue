# This module creates the website

It uses an S3 bucket to host the static files. And a CloudFront distribution to serve them. While CloudFront has cool CDN features, the main reason we are using it is because S3-websites don't allow for https by themselves. Yeah, maybe that'll change at some point in the future. But for now, it's CloudFront, baby.

Strangely enough, CloudFront won't use https to the S3 bucket if it is configured as a website, but it will if it's just a plain old S3 bucket. Go figure.

Note that serving https on a custom domain requires a certificate from Amazon Certificate Manager. Since the process for that requires manual intervention, it can't be automated. So you will need to get the certificate yourself before you run this module.

If you choose to resolve the apex of your domain to this website, the ACM certificate will need to have both domains on the certificate.
