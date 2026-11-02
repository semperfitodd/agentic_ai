terraform {
  required_version = ">= 1.10.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.71.0, < 7.0.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.9"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "Agentic AI Demo"
      Owner       = "Todd"
      Provisioner = "Terraform"
      Environment = var.environment
    }
  }
}