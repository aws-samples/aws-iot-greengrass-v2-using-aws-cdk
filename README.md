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

The `config/app-config-demo.json` files tell how to configure deploy condition & stack condition. First of all, set the path of the configuration file through an environment variable.

```bash
export APP_CONFIG=config/app-config-demo.json
```

### ***Install dependecies & Bootstrap***

```bash
sh ./script/setup_initial.sh config/app-config-demo.json
```

### ***Pack IoT Greengrass components***

```bash
sh ./script/pack_components.sh config/app-config-demo.json
```

Check whether ***zip*** directory is created in ***codes/component/logger_sample***.

### ***Deploy stacks(1st provisioning: without Firehose to ES)***

Before deployment, check whether all configurations are ready. Please execute the following command.

```bash
cdk list
...
...
==> CDK App-Config File is config/app-config-demo.json, which is from Environment-Variable.
==> Repository Selection:  CodeCommit
IotDataDemo-CicdPipelineStack
IotDataDemo-DataPipelineStack
IotDataDemo-GreengrassComponentStack
IotDataDemo-GreengrassUploadStack
IotDataDemo-IoTThingStack
IotDataDemo-ThingMonitorStack
```

Check if you can see the list of stacks as shown above.

If there is no problem, finally run the following command.

```bash
sh ./script/deploy_stacks.sh config/app-config-demo.json
```

### ***Deploy stacks(2nd provisioning: with Firehose to ES)***

For access Elasticsearch, we need to set up ***Role Mapping*** in Elasticsearch.

First of all, log in Kibana, you can find ID/PW in ***SecreteManager*** like this.
![secrete-manager](docs/asset/secrete-manager.png)

And then, add backend role in Kibana-Security like this, your role arn looks like this.
```arn:aws:iam::75157*******/IotDataDemo-Firehose2ESRole```

![role-mapping](docs/asset/role-mapping.png)

Enable a IoT rule option(***IoTRuleEnable***) in ***config/app-config-demo.json*** for Firehose-ES like this.

```json
...
...
    "DataPipeline": {
        "Name": "DataPipelineStack",

        "IoTRuleEnable": true, <----- enable this value
        "IoTRuleTopic": "$aws/rules",
        "IoTRuleTopic-Desc": "https://docs.aws.amazon.com/iot/latest/developerguide/iot-basic-ingest.html",
        "IoTRuleNameFirehoseIngestion": "firehose_ingestion",

        "DomainName": "iot-data",
        "MasterUserName": "iotdataadmin",
        "ESConditionAddress": [],
        "ElasticsearchSelection": "DEVELOP",
        "ElasticsearchCandidate": {
            "DEVELOP": {
            },
            "CUSTOM": {
                "VolumeSize": 40,
                "AZCount": 3,
                "MasterNodeCount": 3,
                "MasterNodeType": "r5.large.elasticsearch",
                "DataNodeCount": 3,
                "DataNodeType": "r5.large.elasticsearch"
            },
            "LEGACY": {
                "DomainEndpoint": ""
            }
        }
    },
...
...
```

Finally run the following command.

```bash
sh ./script/deploy_stacks.sh config/app-config-demo.json
```

### ***Destroy stacks***

Execute the following command, which will destroy all resources except S3 Buckets and DynamoDB Tables. So destroy these resources in AWS web console manually.

```bash
sh ./script/destroy_stacks.sh config/app-config-demo.json
```

### ***CDK Useful commands***

* `npm install`     install dependencies
* `cdk list`        list up stacks
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## How to install thing

### Generate `install-gg-config-[ProjectPrefix].json`

Please prepare `install-gg-config-[ProjectPrefix]`.json file, where ***[ProjectPrefix]*** is "Project Name" + "Project Stage" in ***app-config-demo.json***. For example, ***IotDataDemo*** is [ProjectPrefix] in this default ***app-config-demo.json***.

```bash
sh script/deploy_stacks.sh config/app-config-demo.json # generated-> script/thing/output-iot-thing-stack-[ProjectPrefix].json
python3 script/thing/generate-install-gg-config.py -a config/app-config-demo.json -t script/thing/output-iot-thing-stack-[ProjectPrefix].json # generated-> script/thing/install-gg-config-[ProjectPrefix].json
```

Check whether ***install-gg-config-[ProjectPrefix].json*** is created in ***script/thing*** directory.

### Transfer a config file into target device and execute a script in target devices

![install-script](docs/asset/install-script.png)

* script/thing/install-gg-config-[ProjectPrefix].json
* script/thing/install-gg-thing.sh

### Install Greengrass

1. Update a unique thing name in ***install-gg-config-[ProjectPrefix].json***

```bash
{
    "IotDataDemo-IoTThingStack": {
        "OutputThingNamePrefix": "demo-dev-ver01-xxxxx", <--- append a extra & unique suffix thing name !!
        "OutputIoTTokenRoleAlias": "IotDataDemo-GreengrassV2TokenExchangeRoleAlias",
        "OutputInstallerTempRoleARN": "arn:aws:iam::75157*******:role/IotDataDemo-InstallerTempRole",
        "OutputThingGroupName": "demo-dev",
        "OutputIoTTokenRole": "IotDataDemo-GreengrassV2TokenExchangeRole",
        "OutputProjectRegion": "us-east-2",
        "OutputProjectPrefix": "IotDataDemo"
    },
    "Credentials": {
        "AccessKeyId": "ASIA257JKJDEARSDWWIT",
        "SecretAccessKey": "wiGuoJ/2pg5ue5TFJ6zF3f22wcq5b5dCyExDvYEY",
        "SessionToken": "FwoGZXIvYXdzELn//////////wEaDDiSD0li77wnn+e1NiK/Ae7CoclJAt4dV0diah/AjCwUUeRf44dtGVWFw7ZQDkBj732rFTcc5/FLL3+GcEDlAw4VUso5tG6dI/JVwzWBWnKDk9UWF4QBnCVYxSp9Jpcup06eJ44NYhuMMA8KTSY+Ea9Kf2JAVvG4hVKGEteJwU+lC5tUkuhcLtKaAuTdxefc6jyH9qfmIJcUfjpeDNm9+3OHOhsQrTWE+4a4VYgTP5PR7w7ouWNktlE5X/1z3L+sQ7D8rmtcZdgLef4h3+E2KMOQ0IQGMi2UR6B/e4Pj4ybeLdXk62+p3alCLzPNWo/Nh2N9nbak9FTb2TRk70WiFGT5jJ0=",
        "Expiration": "2021-05-06 16:16:19+00:00"
    },
    "ProjectPrefix": "IotDataDemo"
}
```

2. Run the following commands

```bash
sudo sh ./install-gg-thing.sh install-gg-config-[ProjectPrefix].json
```

Result of install-script
![result-install-script](docs/asset/result-install-script.png)

Result of Greengrass-deployment
![result-deployment](docs/asset/result-deployment.png)

### Check greengrass system-service

```bash
sudo systemctl status greengrass
```

Result of Greengrass-service
![result-service-status](docs/asset/result-service-status.png)

### Check greengass log

```bash
sudo tail -f /greengrass/v2/logs/greengrass.log
sudo tail -f /greengrass/v2/logs/com.xxx.xxx.xxx.log
```

Result of Greengrass-log
![result-tail-log](docs/asset/result-tail-log.png)

## How to update data-collector lambda

A Greengrass component is provided with Greengrass's deployments. Please update component code(in `codes/component/logger_sample`) to customize your logging logic.

Note that when code changes are made, be sure to increase component's version in ***config/app-config-demo.json*** and then re-create the zip file in ***codes/component/logger_sample/zip*** using the following command.

```bash
sh ./script/pack_components.sh config/app-config-demo.json
```

After updating your logic, just git push the changes! And then CICD pipeline will automatically deploy that through CodePipeline & Greengrass deployments.
