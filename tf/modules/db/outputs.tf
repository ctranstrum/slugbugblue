output "name" {
  value = "${aws_dynamodb_table.db.id}"
}

output "arn" {
  value = "${aws_dynamodb_table.db.arn}"
}
