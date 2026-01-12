#!/usr/bin/env python3
"""
RabbitMQ Connection Script for The ICONIC
Automates the process of connecting to RabbitMQ on staging/production via AWS SSM port forwarding.
"""

import boto3
import subprocess
import sys
import argparse
import os
import configparser
from typing import Optional
from pathlib import Path


# Constants
INSTANCE_NAME_PATTERN = 'owms'  # EC2 instance naming pattern to search for

# Environment configurations
ENV_CONFIGS = {
    'staging': {
        'profile': 'TheIconicStagingOMSOperator-101627990447',
        'account_id': '101627990447',
        'region': 'ap-southeast-2',  # Sydney region where ti-owms-stg-syd-cron instance is located
        'rabbitmq_host': 'b-f99ce4a2-cc49-47d3-a170-f8abd1929417.mq.ap-southeast-2.amazonaws.com',
        'sso_start_url': 'https://zalora-ops.awsapps.com/start#',
        'sso_region': 'ap-southeast-1',
    },
    'production': {
        'profile': 'TheIconicProductionOMSOperator-057253213810',
        'account_id': '057253213810',
        'region': 'ap-southeast-2',
        'rabbitmq_host': 'b-a798f3c9-b120-4663-97ec-f34258637f4f.mq.ap-southeast-2.amazonaws.com',
        'sso_start_url': 'https://zalora-ops.awsapps.com/start#',
        'sso_region': 'ap-southeast-1',
    }
}


class RabbitMQConnector:
    """Handles connection to RabbitMQ via AWS SSM."""

    def __init__(self, environment: str = 'production'):
        """
        Initialize the RabbitMQ connector.

        Args:
            environment: Environment name (staging or production)
        """
        if environment not in ENV_CONFIGS:
            raise ValueError(f"Invalid environment: {environment}. Must be one of: {list(ENV_CONFIGS.keys())}")

        self.environment = environment
        self.config = ENV_CONFIGS[environment]
        self.profile = self.config['profile']
        self.region = self.config['region']
        self.rabbitmq_host = self.config['rabbitmq_host']
        self.remote_port = 443
        self.local_port = 8443

    def get_aws_config_path(self) -> Path:
        """Get AWS config file path."""
        aws_config_dir = Path.home() / '.aws'
        return aws_config_dir / 'config'

    def check_profile_exists(self) -> bool:
        """
        Check if AWS SSO profile exists in config.

        Flow: Looks for the profile section in ~/.aws/config file
        This is the first step to determine if initial AWS SSO setup is needed.

        Returns:
            True if profile exists, False otherwise
        """
        config_path = self.get_aws_config_path()
        if not config_path.exists():
            return False

        try:
            config = configparser.ConfigParser()
            config.read(config_path)
            profile_section = f'profile {self.profile}'
            return profile_section in config
        except Exception:
            return False

    def configure_sso_profile(self) -> bool:
        """
        Configure AWS SSO profile using aws configure sso.

        Flow:
        1. Runs 'aws configure sso' command interactively
        2. User authenticates via browser
        3. User selects AWS account and IAM role
        4. Profile is saved to ~/.aws/config for future use

        This is a one-time setup per environment. Once configured, the profile
        persists and you won't need to do this again.

        Returns:
            True if configuration successful, False otherwise
        """
        print(f"\nAWS SSO profile '{self.profile}' not found.")
        print("Let's set it up now...\n")

        cmd = ['aws', 'configure', 'sso']

        # Display pre-configured values that will be used
        # The user still needs to select account and role interactively
        print(f"SSO Start URL: {self.config['sso_start_url']}")
        print(f"SSO Region: {self.config['sso_region']}")
        print(f"CLI default Region: {self.config['region']}")
        print(f"CLI default output format: json")
        print(f"CLI profile name: {self.profile}")
        print("\nYou'll need to:")
        print(f"  1. Authenticate in your browser")
        print(f"  2. Select account: {self.config['account_id']}")
        print(f"  3. Select the appropriate role\n")

        try:
            # Run aws configure sso interactively
            # The command opens a browser for authentication and prompts for selections
            result = subprocess.run(cmd)

            if result.returncode == 0:
                print(f"\n✓ Profile '{self.profile}' configured successfully!")
                return True
            else:
                print(f"\n✗ Failed to configure profile '{self.profile}'")
                return False

        except Exception as e:
            print(f"Error configuring SSO profile: {e}")
            return False

    def check_sso_login(self) -> bool:
        """
        Check if AWS SSO session is valid.

        Flow: Attempts to call AWS STS GetCallerIdentity to verify credentials
        SSO sessions typically expire after 8 hours and need re-authentication.

        Returns:
            True if SSO session is valid, False otherwise
        """
        try:
            # Create a boto3 session with the configured profile
            session = boto3.Session(profile_name=self.profile, region_name=self.region)
            sts_client = session.client('sts')
            # Test the credentials by calling STS - will fail if session expired
            sts_client.get_caller_identity()
            return True
        except Exception:
            # Any exception means the session is invalid or expired
            return False

    def run_sso_login(self) -> bool:
        """
        Run AWS SSO login command.

        Flow:
        1. Executes 'aws sso login --profile <profile_name>'
        2. Opens browser for authentication
        3. User authorizes the AWS CLI application
        4. Session credentials are cached locally (~/.aws/sso/cache/)

        These cached credentials are valid for 8 hours before requiring re-login.

        Returns:
            True if login successful, False otherwise
        """
        print(f"\nRunning: aws sso login --profile {self.profile}")
        print("This will open your browser for authentication...\n")

        cmd = ['aws', 'sso', 'login', '--profile', self.profile]

        try:
            result = subprocess.run(cmd)
            return result.returncode == 0
        except Exception as e:
            print(f"Error running SSO login: {e}")
            return False

    def ensure_sso_setup(self) -> bool:
        """
        Ensure SSO profile is configured and session is valid.

        Flow - This is the orchestration method that:
        STEP 1: Check if profile exists in ~/.aws/config
                → If NO: Run interactive profile configuration
                → If YES: Continue to step 2

        STEP 2: Validate current SSO session
                → If VALID: Proceed to connection
                → If EXPIRED/INVALID: Prompt user to re-login

        This ensures all prerequisites are met before attempting AWS operations.

        Returns:
            True if setup successful, False otherwise
        """
        # STEP 1: Check if profile exists in ~/.aws/config
        if not self.check_profile_exists():
            print(f"Setting up AWS SSO profile for {self.environment} environment...")
            if not self.configure_sso_profile():
                return False

        # STEP 2: Check if the SSO session is still valid
        print("\nChecking AWS SSO session...")
        if self.check_sso_login():
            print("✓ SSO session is valid.")
            return True

        # Session expired - prompt for re-login
        print("SSO session has expired or is not configured.")
        response = input(f"Run 'aws sso login --profile {self.profile}'? (y/n): ")

        if response.lower() in ['y', 'yes']:
            return self.run_sso_login()
        else:
            print("\nPlease login manually with:")
            print(f"  aws sso login --profile {self.profile}")
            return False

    def get_ec2_instance_id(self) -> Optional[str]:
        """
        Get the EC2 instance ID for the OWMS cron instance.

        Flow:
        1. Query EC2 API to find instances matching the name pattern '*owms*cron*'
        2. Filter to only include instances in 'running' state
        3. If multiple instances found, use the first one (with warning)
        4. Return the instance ID to be used as SSM bastion

        The cron instance is used because it has SSM agent installed and has
        network access to the RabbitMQ broker.

        Returns:
            Instance ID or None if not found
        """
        try:
            session = boto3.Session(profile_name=self.profile, region_name=self.region)
            ec2_client = session.client('ec2')

            # Search for running EC2 instances with 'owms' and 'cron' in the Name tag
            # These instances have SSM agent and network access to RabbitMQ
            response = ec2_client.describe_instances(
                Filters=[
                    {
                        'Name': 'tag:Name',
                        'Values': [f'*{INSTANCE_NAME_PATTERN}*cron*']
                    },
                    {
                        'Name': 'instance-state-name',
                        'Values': ['running']  # Only running instances
                    }
                ]
            )

            # Extract instance IDs and names from the response
            instances = []
            for reservation in response['Reservations']:
                for instance in reservation['Instances']:
                    instance_id = instance['InstanceId']
                    name = next(
                        (tag['Value'] for tag in instance.get('Tags', []) if tag['Key'] == 'Name'),
                        'N/A'
                    )
                    instances.append((instance_id, name))

            if not instances:
                print(f"No running instances found matching pattern '*{INSTANCE_NAME_PATTERN}*cron*'")
                return None

            instance_id = instances[0][0]
            print(f"✓ Found instance: {instances[0][1]} ({instance_id})")
            return instance_id

        except Exception as e:
            print(f"Error getting EC2 instance: {e}")
            print(f"\nMake sure you've logged in with: aws sso login --profile {self.profile}")
            return None

    def start_port_forwarding(self, instance_id: str) -> int:
        """
        Start SSM port forwarding session to RabbitMQ.

        Flow:
        1. Execute 'aws ssm start-session' with port forwarding parameters
        2. SSM connects to the EC2 instance (no SSH keys needed)
        3. EC2 instance forwards traffic to RabbitMQ host on port 443
        4. Local port 8443 is mapped to the remote RabbitMQ port
        5. Session remains active until Ctrl+C or connection drops

        Architecture:
        [Your Computer:8443] → [SSM] → [EC2 Instance] → [RabbitMQ:443]

        Security benefits:
        - No public IP or inbound security group rules needed
        - No SSH keys to manage
        - All traffic encrypted through AWS SSM
        - IAM-based authentication and authorization

        Args:
            instance_id: EC2 instance ID to use as bastion

        Returns:
            Exit code from the SSM session
        """
        # Build the AWS SSM command with port forwarding parameters
        cmd = [
            'aws', 'ssm', 'start-session',
            '--target', instance_id,
            '--document-name', 'AWS-StartPortForwardingSessionToRemoteHost',
            '--profile', self.profile,
            '--region', self.region,
            '--parameters', f'{{"host":["{self.rabbitmq_host}"],"portNumber":["{self.remote_port}"],"localPortNumber":["{self.local_port}"]}}'
        ]

        print(f"\n{'='*60}")
        print(f"Starting port forwarding session to {self.environment.upper()} RabbitMQ...")
        print(f"{'='*60}")
        print(f"Environment:  {self.environment}")
        print(f"Profile:      {self.profile}")
        print(f"RabbitMQ URL: https://localhost:{self.local_port}")
        print(f"{'='*60}\n")
        print("Press Ctrl+C to terminate the session.\n")

        try:
            # This is a blocking call - runs until terminated
            result = subprocess.run(cmd)
            return result.returncode
        except KeyboardInterrupt:
            print("\n\nSession terminated by user.")
            return 0
        except Exception as e:
            print(f"Error starting port forwarding: {e}")
            return 1

    def connect(self):
        """
        Main method to establish connection to RabbitMQ.

        Complete Flow:
        ┌─────────────────────────────────────────────────────────────┐
        │ STEP 1: AWS SSO Setup & Authentication                      │
        │ ├─ Check if profile exists in ~/.aws/config                 │
        │ ├─ Configure profile if needed (one-time setup)             │
        │ └─ Validate/refresh SSO session (browser auth if expired)   │
        └─────────────────────────────────────────────────────────────┘
                                    ↓
        ┌─────────────────────────────────────────────────────────────┐
        │ STEP 2: Find EC2 Bastion Instance                           │
        │ └─ Query EC2 API for running 'owms*cron*' instance          │
        └─────────────────────────────────────────────────────────────┘
                                    ↓
        ┌─────────────────────────────────────────────────────────────┐
        │ STEP 3: Establish Port Forwarding                           │
        │ └─ Start SSM session: localhost:8443 → EC2 → RabbitMQ:443   │
        └─────────────────────────────────────────────────────────────┘

        After successful connection, access RabbitMQ at https://localhost:8443
        """
        print(f"\n{'='*60}")
        print(f"RabbitMQ Connection - {self.environment.upper()} Environment")
        print(f"{'='*60}\n")

        # STEP 1: Ensure AWS SSO profile exists and session is valid
        if not self.ensure_sso_setup():
            print("\nCannot proceed without valid AWS SSO session.")
            sys.exit(1)

        # STEP 2: Find the EC2 instance to use as bastion
        print("\nFinding EC2 cron instance...")
        instance_id = self.get_ec2_instance_id()
        if not instance_id:
            print("\nFailed to find EC2 instance automatically.")
            sys.exit(1)

        # STEP 3: Start the port forwarding session (blocking call)
        return self.start_port_forwarding(instance_id)


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description='Connect to RabbitMQ (staging/production) via SSM port forwarding',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Connect to production (default)
  python rabbitmq_connect.py

  # Connect to staging
  python rabbitmq_connect.py --env staging

Available environments:
  - staging:    TheIconicStagingOMSOperator-101627990447
  - production: TheIconicProductionOMSOperator-057253213810
        '''
    )

    parser.add_argument(
        '--env',
        '--environment',
        dest='environment',
        choices=['staging', 'production'],
        default='production',
        help='Environment to connect to (default: production)'
    )

    args = parser.parse_args()

    try:
        connector = RabbitMQConnector(environment=args.environment)
        sys.exit(connector.connect())
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
