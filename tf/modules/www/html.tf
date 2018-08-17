######################################
### Upload files to the S3 website ###
locals {
  mime_types {
    css  = "text/css"
    gif  = "image/gif"
    html = "text/html"
    ico  = "image/x-icon"
    jpg  = "image/jpeg"
    js   = "application/javascript"
    json = "application/json"
    png  = "image/png"
  }
}

resource "aws_s3_bucket_object" "html_files" {
  count         = "${length(local.files)}"
  content_type  = "${local.mime_types["${replace(local.files[count.index], "/.*\\./", "")}"]}"
  bucket        = "${aws_s3_bucket.www.id}"
  key           = "${element(local.files, count.index)}"
  source        = "${path.root}/html/${local.files[count.index]}"
  etag          = "${md5(file("${path.root}/html/${local.files[count.index]}"))}"
  cache_control = "max-age=${var.www == "dev" ? 30 : 3600}"
}

###############################
### List of files to upload ###
locals {
  files = [
    "404.html",
    "favicon.ico",
    "index.html",
    "mre/slug01.jpg",
    "mre/slug02.png",
    "mre/slug03.png",
    "mre/slug04.jpg",
    "mre/slug05.jpg",
    "sbb.css",
    "sbb.js",
  ]
}
