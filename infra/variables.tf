variable "aws_region" {
  type        = string
  description = "AWS Target Region"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Deployment environment name"
  default     = "production"
}

variable "project_name" {
  type        = string
  description = "Project/application name"
  default     = "calbooks"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR range for the VPC"
  default     = "10.0.0.0/16"
}

variable "db_instance_class" {
  type        = string
  description = "RDS PostgreSQL Instance Type"
  default     = "db.t4g.medium"
}

variable "redis_node_type" {
  type        = string
  description = "Redis ElastiCache Node Type"
  default     = "cache.t4g.medium"
}

variable "container_port_backend" {
  type        = number
  description = "Port exposed by the backend container"
  default     = 5000
}

variable "container_port_frontend" {
  type        = number
  description = "Port exposed by the frontend container"
  default     = 80
}
