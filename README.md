# AWS IoT Greengrass OnBoarding and Data Logging using AWS CDK

This repository provides an example case for collecing devices's data through AWS IoT Greengrass2.0-based devices. All necessary cloud resources are created and distributed through AWS CDK.

## Solution Architecture

- Thing OnBoarding: Greengrass2.0 Installer with a customized IAM Role
- Thing Monitoring: IoT Core's Thing Event -> IoT Rule -> DynamoDB 
- Data Ingestion: Thing Logger Lambda -> IoT Rule -> S3
- CICD Pipeline: Thing Logger Lambda -> Greengrass Components -> Greengrass Deployments

![solution-arcitecture](docs/asset/solution-architecture.png)

## CDK-Project Build & Deploy

To efficiently define and provision serverless resources, [AWS Cloud Development Kit(CDK)](https://aws.amazon.com/cdk) which is an open source software development framework to define your cloud application resources using familiar programming languages is utilized .

![AWSCDKIntro](docs/asset/aws_cdk_intro.png)

Because this solusion is implemented in CDK, we can deploy these cloud resources using CDK CLI. Among the various languages supported, this solution used typescript. Because the types of **typescript** are very strict, with the help of auto-completion, typescrip offers a very nice combination with AWS CDK.

***Caution***: This solution contains not-free tier AWS services. So be careful about the possible costs.

### **Prerequisites**

First of all, AWS Account and IAM User is required. And then the following must be installed.

- AWS CLI: aws configure --profile [profile name]
- Node.js: node --version
- AWS CDK: cdk --version
- [jq](https://stedolan.github.io/jq/): jq --version

Please refer to the kind guide in [CDK Workshop](https://cdkworkshop.com/15-prerequisites.html).

### ***Check cdk project's default launch config***

The `cdk.json` file tells the CDK Toolkit how to execute your app.

### ***Set up deploy config***

The `config/app-config.json` files tell how to configure deploy condition & stack condition. First of all, set the path of the configuration file through an environment variable.

```bash
export APP_CONFIG=config/app-config.json
```

### ***Install dependecies & Bootstrap***

```bash
sh ./script/setup_initial.sh
```

### ***Deploy stacks***

```bash
sh ./script/deploy_stacks.sh
```

### ***Destroy stacks***

Execute the following command, which will destroy all resources except S3 Buckets and DynamoDB Tables. So destroy these resources in AWS web console manually.

```bash
sh ./script/destroy_stacks.sh
```

### ***CDK Useful commands***

* `npm install`     install dependencies
* `cdk list`        list up stacks
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## How to install thing

### ***Prepare two xxx-config.json files for thing installer***

Please prepare the following two config json files.

```bash
sh script/deploy_stacks.sh config/app-config.json # generated-> install-gg-config-thing-IotData-Demo.json
sh script/thing/generate-temp-credential.sh config/app-config.json script/thing/install-gg-config-thing-IotData-Demo.json # generated-> install-gg-config-credential-IotData-Demo.json
```

### ***Transfer these files into target devices***

* script/thing/install-gg-config-credential-IotData-Demo.json
* script/thing/install-gg-config-thing-IotData-Demo.json
* script/thing/install-gg-thing.sh

![install-script](docs/asset/install-script.png)

### ***Install Greengrass***

1. Change a thing name in ***install-gg-config-thing-IotData-Demo.json***

```bash
{
  "IotDataDemo-IoTThingStack": {
    "OutputThingNamePrefix": "Ver01-KO-0000", <---- Change this value
    "OutputIoTTokenRoleAlias": "IotDataDemo-GreengrassV2TokenExchangeRoleAlias",
    "OutputThingGroupName": "Ver01Dev",
    "OutputIoTTokenRole": "IotDataDemo-GreengrassV2TokenExchangeRole",
    "OutputProjectRegion": "ap-northeast-2",
    "OutputProjectPrefix": "IotDataDemo",
    "OutputInstallerTempRole": "IotDataDemo-InstallerTempRole"
  }
}
```

2. Run the following commands

```bash
sudo apt-get install jq
sudo python3 -m pip install awsiotsdk
sudo pip3 install boto3 # optional
sudo sh ./install-gg-thing.sh install-gg-config-thing-IotData-Demo.json install-gg-config-credential-IotData-Demo.json
```

### ***Check greengrass system-service***

```bash
sudo systemctl status greengrass
```

### ***Check greengass log***

```bash
sudo tail -f /greengrass/v2/log/greengrass.log
sudo tail -f /greengrass/v2/log/com.xxx.xxx.xxx.log
```

## How to collect data

A Lambda-based Greengrass component is provided with Greengrass's deployments. Please update lambda(in `codes/lambda/comp_logger_sample`) to customize your logging logic.

After updating your logic, jut git push the changes! And then CICD pipeline will automatically deploy that through CodePipeline & Greengrass deployments.
