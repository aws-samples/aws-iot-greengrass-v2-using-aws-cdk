#!/bin/sh

# Configuration File Path
CONFIG_INFRA=$1

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

echo ==--------DestroyStacksStepByStep---------==
cdk destroy *-DataPipelineStack --force --profile $PROFILE_NAME
cdk destroy *-ThingSimulationStack --force --profile $PROFILE_NAME
cdk destroy *-GreengrassComponentStack --force --profile $PROFILE_NAME
cdk destroy *-ThingMonitorStack --force --profile $PROFILE_NAME
cdk destroy *-IoTThingStack --force --profile $PROFILE_NAME
echo .
echo .
