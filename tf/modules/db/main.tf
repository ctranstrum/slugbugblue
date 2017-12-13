resource "aws_dynamodb_table" "db" {
  name           = "${var.env}-db"
  read_capacity  = "${var.capacity}"
  write_capacity = "${var.capacity}"
  hash_key       = "PKey"
  range_key      = "SKey"
  tags           = "${var.tags}"

  attribute {
    name = "PKey"
    type = "S"
  }

  attribute {
    name = "SKey"
    type = "S"
  }

  ttl {
    enabled        = true
    attribute_name = "TTL"
  }

  lifecycle {
    ignore_changes = ["read_capacity", "write_capacity"]
  }
}

resource "aws_appautoscaling_target" "db_write_target" {
  max_capacity       = "${var.max_capacity}"
  min_capacity       = "${var.capacity}"
  resource_id        = "table/${aws_dynamodb_table.db.id}"
  role_arn           = "${aws_iam_role.db_autoscale.arn}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "db_write_policy" {
  name               = "DynamoDBWriteCapacityUtilization:${aws_appautoscaling_target.db_write_target.resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = "${aws_appautoscaling_target.db_write_target.resource_id}"
  scalable_dimension = "${aws_appautoscaling_target.db_write_target.scalable_dimension}"
  service_namespace  = "${aws_appautoscaling_target.db_write_target.service_namespace}"

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }

    target_value = 80
  }
}

resource "aws_appautoscaling_target" "db_read_target" {
  max_capacity       = "${var.max_capacity}"
  min_capacity       = "${var.capacity}"
  resource_id        = "table/${aws_dynamodb_table.db.id}"
  role_arn           = "${aws_iam_role.db_autoscale.arn}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "db_read_policy" {
  name               = "DynamoDBReadCapacityUtilization:${aws_appautoscaling_target.db_read_target.resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = "${aws_appautoscaling_target.db_read_target.resource_id}"
  scalable_dimension = "${aws_appautoscaling_target.db_read_target.scalable_dimension}"
  service_namespace  = "${aws_appautoscaling_target.db_read_target.service_namespace}"

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }

    target_value = 80
  }
}

data "aws_iam_policy_document" "db_autoscale_policy" {
  statement {
    actions = [
      "cloudwatch:DeleteAlarms",
      "cloudwatch:DescribeAlarms",
      "cloudwatch:PutMetricAlarm",
      "dynamodb:DescribeTable",
      "dynamodb:UpdateTable",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_policy" "db_autoscale" {
  name   = "${var.env}-db-autoscale-policy"
  path   = "/${var.env}/policy/db/"
  policy = "${data.aws_iam_policy_document.db_autoscale_policy.json}"
}

data "aws_iam_policy_document" "db_autoscale_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["application-autoscaling.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "db_autoscale" {
  name               = "${var.env}-autoscale-role"
  path               = "/${var.env}/role/db/"
  assume_role_policy = "${data.aws_iam_policy_document.db_autoscale_role.json}"
}

resource "aws_iam_role_policy_attachment" "db_autoscale" {
  role       = "${aws_iam_role.db_autoscale.name}"
  policy_arn = "${aws_iam_policy.db_autoscale.arn}"
}
