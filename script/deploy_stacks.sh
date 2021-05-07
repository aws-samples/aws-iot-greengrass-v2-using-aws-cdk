#!/bin/sh

# Configuration File Path
APP_CONFIG=$1

PROJECT_NAME=$(cat $APP_CONFIG | jq -r '.Project.Name') #ex> IoTData
PROJECT_STAGE=$(cat $APP_CONFIG | jq -r '.Project.Stage') #ex> Dev
PROFILE_NAME=$(cat $APP_CONFIG | jq -r '.Project.Profile') #ex> cdk-demo

echo ==--------ConfigInfo---------==
echo $APP_CONFIG
echo $PROFILE_NAME
echo .
echo .

echo ==--------ListStacks---------==
cdk list
echo .
echo .

echo ==--------PackComponents---------==
sh script/pack_components.sh $APP_CONFIG
echo .
echo .

echo ==--------DeployStacksStepByStep---------==
cdk deploy *-ThingInstallerStack --require-approval never --profile $PROFILE_NAME --outputs-file ./script/thing/outout-thing-installer-stack-$PROJECT_NAME$PROJECT_STAGE.json
cdk deploy *-ThingMonitorStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-ComponentUploadStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-ComponentDeploymentStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-DataPipelineStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-CicdPipelineStack --require-approval never --profile $PROFILE_NAME
echo .
echo .
