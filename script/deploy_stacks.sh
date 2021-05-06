#!/bin/sh

# Configuration File Path
CONFIG_INFRA=$1

PROJECT_NAME=$(cat $CONFIG_INFRA | jq -r '.Project.Name') #ex> IoTData
PROJECT_STAGE=$(cat $CONFIG_INFRA | jq -r '.Project.Stage') #ex> Dev
PROFILE_NAME=$(cat $CONFIG_INFRA | jq -r '.Project.Profile') #ex> cdk-demo

echo ==--------ConfigInfo---------==
echo $CONFIG_INFRA
echo $PROFILE_NAME
echo .
echo .

echo ==--------ListStacks---------==
cdk list
echo .
echo .

echo ==--------DeployStacksStepByStep---------==
cdk deploy *-IoTThingStack --require-approval never --profile $PROFILE_NAME --outputs-file ./script/thing/output-iot-thing-stack-$PROJECT_NAME$PROJECT_STAGE.json
cdk deploy *-ThingMonitorStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-GreengrassUploadStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-GreengrassComponentStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-DataPipelineStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-CicdPipelineStack --require-approval never --profile $PROFILE_NAME
echo .
echo .
