# Terraform Plan: Backend Docker Deployment from ECR to EC2 (Absolute Minimal - Security Neglected - Public RDS)

**DISCLAIMER: This plan outlines an absolute minimal setup with a PUBLICLY EXPOSED RDS DATABASE and Docker deployment for experimental purposes ONLY. It actively neglects critical security best practices and SHOULD NOT be used for any real-world application, including development environments exposed to the internet, due to EXTREME security risks. Passing sensitive credentials directly as variables is especially dangerous.**

This document outlines the plan for deploying a Dockerized NestJS backend application (from ECR) to an AWS EC2 instance using Terraform, with the RDS database also being publicly accessible and connected to via the internet.

## I. Prerequisites

1.  **Existing AWS & Terraform Environment:** Your AWS account is set up, and you are actively using Terraform.
2.  **EC2 Key Pair:** An existing EC2 key pair for SSH access.
3.  **Backend Docker Image in ECR:** A Docker image of your backend application pushed to Amazon ECR.
    - You will need the ECR Image URI (e.g., `<account_id>.dkr.ecr.<region>.amazonaws.com/<repo_name>:<tag>`).

## II. Terraform Configuration Structure (Simplified)

```
infra/terraform/
├── main.tf             # Main configuration, EC2, EIP, RDS
├── variables.tf        # Input variables
├── outputs.tf          # Outputs (EC2 public IP, RDS public endpoint)
├── providers.tf        # AWS provider configuration
├── security_groups.tf  # Simplified Security Group definitions
├── rds.tf              # RDS PostgreSQL instance configuration
├── iam.tf              # IAM Role for EC2 to access ECR
└── user_data/
    └── setup_docker_backend.sh.tpl # TEMPLATE for bootstrapping the EC2 instance with Docker
```

## III. Core Resources & Configuration (Minimal with Public RDS & Docker from ECR)

### 1. Provider Configuration (`providers.tf`)
   - Configure the AWS provider with region and version.

### 2. Variables (`variables.tf`)
   - `aws_region`: AWS region (e.g., "us-east-1")
   - `ec2_instance_type`: e.g., "t2.micro" or "t3.micro" (for free tier)
   - `ec2_key_name`: Name of your EC2 key pair.
   - `ecr_image_uri`: The full URI of your backend Docker image in ECR.

   # Backend Application Configuration
   - `app_host`: Application host binding inside the container (e.g., "0.0.0.0").
   - `app_port_container`: Port the application *inside the Docker container* listens on (e.g., 3000).
   - `app_port_host`: Port on the EC2 host to map to the container port (e.g., 80 or 3000).

   # Database Configuration (PostgreSQL)
   - `db_host_rds_variable_marker`: Not used directly, indicates these are for RDS. Set `db_username`, `db_password`, `db_database`.
   - `db_username`: Username for RDS.
   - `db_password`: Password for RDS. **Sensitive**.
   - `db_database`: Database name for RDS.

   # AWS Credentials (WARNING: Highly Sensitive - for app use, not EC2 role)
   - `app_aws_access_key_id`: AWS Access Key ID for the application. **Sensitive**.
   - `app_aws_secret_access_key`: AWS Secret Access Key for the application. **Sensitive**.
   - `app_aws_region`: AWS Region for the application (can be same as `aws_region` or different).

   # LLM Providers (WARNING: Sensitive API Keys)
   - `llm_provider`: (e.g., "openai", "anthropic")
   - `anthropic_api_key`: **Sensitive**.
   - `openai_api_key`: **Sensitive**.
   - `grok_api_key`: **Sensitive**.
   - `grok_model_name`

   # Audio Storage Configuration
   - `aws_s3_bucket_audio`
   - `aws_transcribe_output_bucket`

   # Cognito
   - `cognito_region`
   - `cognito_user_pool_id`
   - `cognito_client_id`

   # Transcription Provider
   - `transcription_provider`

### 3. Networking
   - **Use Default VPC:** EC2 and RDS will use the default VPC.

### 4. Security Groups (`security_groups.tf`)
   - **EC2 Security Group (`aws_security_group` "sg_ec2_backend_minimal"):**
     - Inbound SSH (port 22) from your IP.
     - Inbound TCP on `var.app_port_host` from anywhere (0.0.0.0/0) to access the application.
     - Outbound all traffic.
   - **RDS Security Group (`aws_security_group` "sg_rds_backend_public"):**
     - Inbound PostgreSQL (port 5432) from anywhere (`0.0.0.0/0`). **WARNING: Highly Insecure.**

### 5. IAM Role for EC2 (`iam.tf`)
   - `aws_iam_role` "ec2_ecr_role": For EC2 service.
   - `aws_iam_policy_attachment` "ec2_ecr_policy_attachment": Attach the `AmazonEC2ContainerRegistryReadOnly` managed policy to allow pulling from ECR.
   - `aws_iam_instance_profile` "ec2_ecr_instance_profile": To associate the role with the EC2 instance.

### 6. RDS PostgreSQL Instance (`rds.tf`)
   - `aws_db_instance` "rds_backend_public":
     - `engine = "postgres"`, `instance_class`, `allocated_storage`.
     - `db_name = var.db_database`
     - `username = var.db_username`
     - `password = var.db_password`
     - `vpc_security_group_ids` = [ID of `sg_rds_backend_public`].
     - `skip_final_snapshot = true`, `publicly_accessible = true`, `multi_az = false`.

### 7. EC2 Instance (`main.tf`)
   - `data "aws_ami"` to get the latest Amazon Linux 2.
   - `aws_instance`:
     - `ami` = from data source.
     - `instance_type` = from variable.
     - `key_name` = from variable.
     - `iam_instance_profile` = `aws_iam_instance_profile.ec2_ecr_instance_profile.name`.
     - `vpc_security_group_ids` = [ID of `sg_ec2_backend_minimal`].
     - `user_data` = `templatefile("${path.module}/user_data/setup_docker_backend.sh.tpl", { 
         ecr_image_uri                 = var.ecr_image_uri,
         app_host_tf                   = var.app_host,
         app_port_container_tf         = var.app_port_container,
         app_port_host_tf              = var.app_port_host,
         # DB creds for RDS
         db_host_tf                    = aws_db_instance.rds_backend_public.endpoint,
         db_port_tf                    = aws_db_instance.rds_backend_public.port,
         db_username_tf                = var.db_username,
         db_password_tf                = var.db_password,
         db_database_tf                = var.db_database,
         # App-specific AWS creds
         app_aws_access_key_id_tf      = var.app_aws_access_key_id,
         app_aws_secret_access_key_tf  = var.app_aws_secret_access_key,
         app_aws_region_tf             = var.app_aws_region,
         # LLM
         llm_provider_tf               = var.llm_provider,
         anthropic_api_key_tf          = var.anthropic_api_key,
         openai_api_key_tf             = var.openai_api_key,
         grok_api_key_tf               = var.grok_api_key,
         grok_model_name_tf            = var.grok_model_name,
         # Audio Storage
         aws_s3_bucket_audio_tf        = var.aws_s3_bucket_audio,
         aws_transcribe_output_bucket_tf = var.aws_transcribe_output_bucket,
         # Cognito
         cognito_region_tf             = var.cognito_region,
         cognito_user_pool_id_tf       = var.cognito_user_pool_id,
         cognito_client_id_tf          = var.cognito_client_id,
         # Transcription
         transcription_provider_tf     = var.transcription_provider
       })`
     - `tags` = { Name = "docker-backend-ec2-public-rds" }
   - `aws_eip` and `aws_eip_association`.

### 8. User Data Script Template (`user_data/setup_docker_backend.sh.tpl`)
   - This script template will run on the first boot.
   - **Variables expected:** All `..._tf` variables passed from `templatefile` above.
   - **Steps:**
     ```bash
     #!/bin/bash
     # Install Docker
     sudo yum update -y
     sudo amazon-linux-extras install docker -y
     sudo service docker start
     sudo usermod -a -G docker ec2-user

     # Create .env file for Docker container
     sudo mkdir -p /srv/backend-app
     ENV_FILE="/srv/backend-app/.env"

     echo "APP_PORT=${app_port_container_tf}" > $ENV_FILE
     echo "APP_HOST=${app_host_tf}" >> $ENV_FILE

     echo "DB_HOST=${db_host_tf}" >> $ENV_FILE
     echo "DB_PORT=${db_port_tf}" >> $ENV_FILE
     echo "DB_USERNAME=${db_username_tf}" >> $ENV_FILE
     echo "DB_PASSWORD=${db_password_tf}" >> $ENV_FILE
     echo "DB_DATABASE=${db_database_tf}" >> $ENV_FILE

     echo "AWS_ACCESS_KEY_ID=${app_aws_access_key_id_tf}" >> $ENV_FILE
     echo "AWS_SECRET_ACCESS_KEY=${app_aws_secret_access_key_tf}" >> $ENV_FILE
     echo "AWS_REGION=${app_aws_region_tf}" >> $ENV_FILE

     echo "LLM_PROVIDER=${llm_provider_tf}" >> $ENV_FILE
     echo "ANTHROPIC_API_KEY=${anthropic_api_key_tf}" >> $ENV_FILE
     echo "OPENAI_API_KEY=${openai_api_key_tf}" >> $ENV_FILE
     echo "GROK_API_KEY=${grok_api_key_tf}" >> $ENV_FILE
     echo "GROK_MODEL_NAME=${grok_model_name_tf}" >> $ENV_FILE

     echo "AWS_S3_BUCKET_AUDIO=${aws_s3_bucket_audio_tf}" >> $ENV_FILE
     echo "AWS_TRANSCRIBE_OUTPUT_BUCKET=${aws_transcribe_output_bucket_tf}" >> $ENV_FILE

     echo "COGNITO_REGION=${cognito_region_tf}" >> $ENV_FILE
     echo "COGNITO_USER_POOL_ID=${cognito_user_pool_id_tf}" >> $ENV_FILE
     echo "COGNITO_CLIENT_ID=${cognito_client_id_tf}" >> $ENV_FILE

     echo "TRANSCRIPTION_PROVIDER=${transcription_provider_tf}" >> $ENV_FILE

     # Pull Docker image from ECR
     docker pull ${ecr_image_uri}

     # Run Docker container
     docker run -d \
       -p ${app_port_host_tf}:${app_port_container_tf} \
       --env-file $ENV_FILE \
       --restart always \
       ${ecr_image_uri}
     ```

### 9. Outputs (`outputs.tf`)
   - `ec2_public_ip`: Public IP of the EC2 instance.
   - `application_url`: Constructed URL like `http://${aws_eip.backend.public_ip}:${var.app_port_host}`.
   - `rds_public_endpoint`: Public endpoint of the RDS instance.

## IV. Deployment Steps

1.  **Build and Push Docker Image to ECR:** (Manual step or via CI/CD before Terraform apply)
2.  Initialize Terraform: `terraform init`
3.  Review the plan: `terraform plan -var-file="terraform.tfvars"` (ensure all new variables, including sensitive ones, are set in your `terraform.tfvars` file)
4.  Apply the configuration: `terraform apply -var-file="terraform.tfvars"`
5.  Access your application via the `application_url` output.

## V. Post-Deployment Manual Tasks & Considerations

-   **Application Code Updates:** Build a new Docker image, push to ECR, then either:
    -   Manually SSH into EC2, `docker pull` new image, stop old container, run new container.
    -   Or, re-run `terraform apply` if the `ecr_image_uri` variable (e.g., image tag) is updated.
-   **OS & Software Patching:** (Docker host OS) Ignored in this "security neglected" scenario.
-   **All other typical operational tasks are explicitly omitted.**

This plan provides the absolute bare minimum with a publicly exposed database and Docker deployment. Remember the EXTREME risks, especially when handling sensitive credentials this way. 