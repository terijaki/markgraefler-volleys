# Email Proxy AWS Manual Setup

This document records the manual AWS setup for the email proxy feature.

## Overview

The email proxy uses SES receipt rules to route inbound member alias emails to S3, where a Lambda processor forwards them to member private inboxes.

## Production Environment (markgraefler-volleys.de)

### S3 Bucket

- **Name**: `mv-mail-inbound-883425316554-eu-central-1-an`
- **Region**: `eu-central-1`
- **Encryption**: Enabled
- **Lifecycle Policy**:
  - Expire current versions of objects: **14 days**
- **EventBridge Notifications**: Enabled (sends all events to default EventBridge bus)

### SES Receipt Rule Set

- **Rule Set Name**: `mv-inbound-prod`
- **Status**: Active
- **Region**: `eu-central-1`

### SES Receipt Rule

- **Rule Name**: `store-inbound-prod`
- **Status**: Enabled
- **Recipient Conditions**: `markgraefler-volleys.de` (catch-all)
- **Security & Protection**:
  - Spam and virus scanning: **Enabled**
  - TLS requirement: **Optional**
- **Action**: Write to S3 bucket
  - Bucket: `mv-mail-inbound-883425316554-eu-central-1-an`
  - IAM Role: `ses-write-to-s3-role` (or similar auto-generated name)
    - Trust policy includes: SES service principal with source account and source ARN conditions
    - Permission policy allows: `s3:PutObject` on the inbound bucket

### DNS & Identity

- **SES Domain Identity**: `markgraefler-volleys.de` (manually verified in prior setup)
- **Inbound MX Record (required)**:
  - Name: `markgraefler-volleys.de`
  - Type: `MX`
  - Value: `10 inbound-smtp.eu-central-1.amazonaws.com.`
  - TTL: `300`
- **DKIM Records**: Configured in Route53 (see DNS stack)
- **SPF/DMARC**: Configured per existing mail setup

## Development Environment (new.markgraefler-volleys.de)

### S3 Bucket

- **Name**: `mv-mail-inbound-926634327887-eu-central-1-an`
- **Region**: `eu-central-1`
- **Encryption**: Enabled
- **Lifecycle Policy**:
  - Expire current versions of objects: **3 days**
- **EventBridge Notifications**: Enabled (sends all events to default EventBridge bus)

### SES Receipt Rule Set

- **Rule Set Name**: `mv-inbound-dev`
- **Status**: Active
- **Region**: `eu-central-1`

### SES Receipt Rule

- **Rule Name**: `store-inbound-dev`
- **Status**: Enabled
- **Recipient Conditions**: `new.markgraefler-volleys.de` (catch-all)
- **Security & Protection**:
  - Spam and virus scanning: **Enabled**
  - TLS requirement: **Optional**
- **Action**: Write to S3 bucket
  - Bucket: `mv-mail-inbound-926634327887-eu-central-1-an`
  - IAM Role: `ses-write-to-s3-role` (or similar auto-generated name)
    - Trust policy includes: SES service principal with source account and source ARN conditions
    - Permission policy allows: `s3:PutObject` on the inbound bucket (example):
      ```json
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": "s3:PutObject",
            "Resource": "arn:aws:s3:::mv-mail-inbound-926634327887-eu-central-1-an/*"
          }
        ]
      }
      ```

### DNS & Identity

- **SES Domain Identity**: `new.markgraefler-volleys.de` (manually verified)
- **Inbound MX Record (required)**:
  - Name: `new.markgraefler-volleys.de`
  - Type: `MX`
  - Value: `10 inbound-smtp.eu-central-1.amazonaws.com.`
  - TTL: `300`
- **DKIM Records**: Configured in Route53 (dev hosted zone)
- **SPF/DMARC**: Configured per existing dev mail setup
