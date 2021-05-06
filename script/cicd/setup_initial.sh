#!/bin/sh

# Configuration File Path
# CONFIG_INFRA=config/app-config.json
CONFIG_INFRA=$1

echo ==--------InstallDedendencies---------==
npm install -g aws-cdk
npm install -g typescript
echo ==--------CheckDedendencies---------==
aws --version
npm --version
tsc --version
cdk --version
jq --version

ACCOUNT=$(cat $CONFIG_INFRA | jq -r '.Project.Account') #ex> 123456789123
REGION=$(cat $CONFIG_INFRA | jq -r '.Project.Region') #ex> us-east-1

echo ==--------ConfigInfo---------==
echo $CONFIG_INFRA
echo $ACCOUNT
echo $REGION
cat $CONFIG_INFRA
echo .
echo .

echo ==--------InstallLambdaLayerForES---------==
BASE_DIR=codes/layer/python-http-request
mkdir $BASE_DIR/python
cd $BASE_DIR
pip3 install -r requirements.txt --target ./python/
cd ../../../..
echo .
echo .

echo ==--------InstallCDKDependencies---------==
npm install
echo .
echo .

echo ==--------BootstrapCDKEnvironment---------==
cdk bootstrap aws://$ACCOUNT/$REGION
echo .
echo .
