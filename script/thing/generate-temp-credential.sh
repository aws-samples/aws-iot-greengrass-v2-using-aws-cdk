#!/bin/sh

# Configuration File Path
CONFIG_INFRA=$1     #ex> config/app-config-dev.json
CONFIG_THING=$2 #ex> script/thing/install-gg-config-thing-IotData-Dev.json

PROJECT_NAME=$(cat $CONFIG_INFRA | jq -r '.Project.Name')   #ex> IoTData
PROJECT_STAGE=$(cat $CONFIG_INFRA | jq -r '.Project.Stage') #ex> Dev
PROJECT_ACCOUNT=$(cat $CONFIG_INFRA | jq -r '.Project.Account') #ex> 123456789
PROFILE_NAME=$(cat $CONFIG_INFRA | jq -r '.Project.Profile') #ex> cdk-demo
PROJECT_PREFIX=$PROJECT_NAME$PROJECT_STAGE

JQ_ARG='.["'$PROJECT_PREFIX'-IoTThingStack"].OutputInstallerTempRole'
ROLE_NAME=$(cat $CONFIG_THING | jq -r $JQ_ARG) #ex>  

echo ==--------ConfigInfo---------==
echo $CONFIG_INFRA
echo $CONFIG_THING
echo $PROFILE_NAME
echo $PROJECT_PREFIX
echo $JQ_ARG
echo $ROLE_NAME
echo .
echo .

aws sts assume-role --role-arn arn:aws:iam::"$PROJECT_ACCOUNT":role/"$ROLE_NAME" --role-session-name "TempRoleSession01" --profile $PROFILE_NAME > script/thing/install-gg-config-credential-$PROJECT_NAME-$PROJECT_STAGE.json