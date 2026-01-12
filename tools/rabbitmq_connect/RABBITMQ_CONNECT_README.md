# RabbitMQ Connection Automation

This Python script automates the process of connecting to RabbitMQ on The ICONIC staging/production environments via AWS SSM port forwarding.

## Features

- **Multi-environment support**: Connect to staging or production
- **Automatic AWS SSO setup**: Configures AWS SSO profiles if they don't exist
- **Auto-login**: Prompts for SSO login if session has expired
- **Auto-discovery**: Automatically finds the EC2 cron instance
- **Port forwarding**: Establishes SSM session for secure RabbitMQ access

## AWS Service Clarification

This script uses **AWS Systems Manager Session Manager** for port forwarding, which is fully supported and actively maintained by AWS.

**Note**: AWS Systems Manager includes multiple tools. The recent announcement about AWS Systems Manager Change Manager being deprecated (Nov 2025) does **NOT** affect this script. We use:
- ✅ **Session Manager** (for port forwarding) - Fully supported
- ❌ **Change Manager** (for ITSM workflows) - Being deprecated (not used by this script)

Session Manager port forwarding remains a core AWS capability with no planned deprecation.

## Prerequisites

1. **AWS CLI** - Install from https://aws.amazon.com/cli/
2. **Session Manager Plugin** - Install from https://docs.aws.amazon.com/systems-manager/latest/userguide/install-plugin-macos-overview.html
3. **Python 3.7+** with boto3

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements-rabbitmq.txt
```

2. That's it! The script will automatically configure AWS SSO profiles when you first run it.

## Usage

### Basic Usage

**Connect to production (default):**
```bash
python rabbitmq_connect.py
```

**Connect to staging:**
```bash
python rabbitmq_connect.py --env staging
```

### What the script does:

1. **Checks if AWS SSO profile exists**
   - If not found, runs `aws configure sso` interactively
   - You'll need to:
     - Authenticate in your browser
     - Select the correct account
     - Select the appropriate role

2. **Validates SSO session**
   - If expired, prompts you to login with browser authentication

3. **Finds EC2 instance**
   - Auto-detects the OWMS cron EC2 instance

4. **Establishes connection**
   - Creates SSM port forwarding session
   - Makes RabbitMQ accessible at `https://localhost:8443`

### Command-line Options

**View all options:**
```bash
python rabbitmq_connect.py --help
```

## Environment Configurations

### Staging
- **Profile**: `TheIconicStagingOMSOperator-101627990447`
- **Account ID**: `101627990447`
- **Region**: `ap-southeast-1`
- **SSO Start URL**: `https://zalora-ops.awsapps.com/start#`

### Production
- **Profile**: `TheIconicProductionOMSOperator-057253213810`
- **Account ID**: `057253213810`
- **Region**: `ap-southeast-2`
- **SSO Start URL**: `https://zalora-ops.awsapps.com/start#`

## How It Works

1. **Profile Detection**: Checks if AWS SSO profile exists in `~/.aws/config`
2. **SSO Configuration**: If profile doesn't exist, runs `aws configure sso` to set it up
3. **SSO Session Check**: Validates your AWS SSO session and prompts for login if expired
4. **EC2 Instance Discovery**: Uses boto3 to search for running EC2 instances with "owms" and "cron" in their Name tag
5. **SSM Port Forwarding**: Establishes an SSM session to forward RabbitMQ traffic through the EC2 instance
6. **Local Access**: RabbitMQ becomes accessible at `https://localhost:8443` (or your specified local port)

## First Time Setup

When you run the script for the first time for an environment, it will:

1. Detect that the AWS SSO profile doesn't exist
2. Run `aws configure sso` interactively
3. Prompt you with the following information (pre-filled where possible):
   ```
   SSO Start URL: https://zalora-ops.awsapps.com/start#
   SSO Region: ap-southeast-1
   CLI default Region: ap-southeast-1 (for staging) or ap-southeast-2 (for production)
   CLI default output format: json
   CLI profile name: TheIconicStagingOMSOperator-101627990447 (or production equivalent)
   ```
4. Open your browser for authentication
5. Ask you to select the account (the account ID will be shown in the script output)
6. Ask you to select the appropriate role

After the initial setup, the profile will be saved and you won't need to configure it again.

## Troubleshooting

### "Token has expired and refresh failed"
- The script will automatically detect this and prompt you to login
- Answer 'y' when prompted to run SSO login automatically
- Your browser will open for authentication

### "No running instances found"
- Verify the instance naming pattern matches "owms*cron*"
- Check that the instance is in "running" state in the AWS console
- Ensure your IAM permissions include EC2 describe permissions

### "Error starting port forwarding"
- Ensure Session Manager Plugin is installed
- Verify your IAM permissions include SSM access
- Check that the EC2 instance has SSM agent running

### "Profile configuration failed"
- Make sure AWS CLI is installed and up to date
- Check that you have internet connectivity
- Verify you can access https://zalora-ops.awsapps.com/start#
- Ensure you selected the correct account and role during setup

### Need to reconfigure a profile?
If you need to reconfigure an existing profile:
```bash
aws configure sso --profile TheIconicStagingOMSOperator-101627990447
```
or
```bash
aws configure sso --profile TheIconicProductionOMSOperator-057253213810
```

## Accessing RabbitMQ

Once the script is running, you can access RabbitMQ at:
- **URL**: https://localhost:8443
- Use your RabbitMQ credentials to login

To terminate the session, press `Ctrl+C` in the terminal.

## Manual SSO Login

If you prefer to login manually before running the script:

**Staging:**
```bash
aws sso login --profile TheIconicStagingOMSOperator-101627990447
```

**Production:**
```bash
aws sso login --profile TheIconicProductionOMSOperator-057253213810
```

## Examples

**Daily workflow (production):**
```bash
# Just run the script - it handles everything
python rabbitmq_connect.py
```

**Staging debugging session:**
```bash
# Connect to staging environment
python rabbitmq_connect.py --env staging
```

## Notes

## Technical Details

### AWS Systems Manager Components Used

This script leverages the following AWS Systems Manager capabilities:
- **Session Manager**: Provides secure shell access and port forwarding
- **SSM Agent**: Runs on EC2 instances to enable Systems Manager functionality
- **Port Forwarding Document**: `AWS-StartPortForwardingSessionToRemoteHost`

### Security Benefits

- No need to open inbound ports in security groups
- No bastion hosts required
- No SSH keys to manage
- All sessions are logged and auditable through AWS CloudTrail
- Connections are encrypted and use IAM for authentication
