# Lambda Temp - TypeScript Hello World

A simple Hello World Lambda function written in TypeScript.

## Overview

This Lambda function is automatically built and packaged by Terraform using the AWS Lambda module.
No manual build steps are required - Terraform handles the TypeScript compilation and packaging.

## Response Format

The Lambda function returns a JSON response with:
- `message`: "Hello World!"
- `timestamp`: Current ISO timestamp
- `environment`: Environment variable from Lambda configuration

## Development

The function uses TypeScript with AWS Lambda types for better development experience.
Dependencies are defined in `package.json` and will be automatically installed during Terraform deployment.

