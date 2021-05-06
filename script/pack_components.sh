#!/bin/sh

# Configuration File Path
APP_CONFIG=$1

PROJECT_NAME=$(cat $APP_CONFIG | jq -r '.Project.Name') #ex> IoTData
PROJECT_STAGE=$(cat $APP_CONFIG | jq -r '.Project.Stage') #ex> Dev
PROJECT_PREFIX=$PROJECT_NAME$PROJECT_STAGE

SAMPLE_LOGGER_NAME=$(cat $APP_CONFIG | jq -r '.Stack.GreengrassComponent.SampleLogger.Name') 
SAMPLE_LOGGER_PATH=$(cat $APP_CONFIG | jq -r '.Stack.GreengrassComponent.SampleLogger.CodePath') 


echo ==-------SampleLoggerComponent---------==
echo $SAMPLE_LOGGER_NAME
echo $SAMPLE_LOGGER_PATH
COMP_NAME=$SAMPLE_LOGGER_NAME
BASE_PATH=$SAMPLE_LOGGER_PATH

ZIP_FILE=$PROJECT_PREFIX-$COMP_NAME.zip
cd $BASE_PATH
if [ -d "zip" ]; then
    rm -r "zip"
fi
mkdir zip
cd src
zip -r $ZIP_FILE ./*  -x \*__pycache__\*
mv $ZIP_FILE ../zip
cd ../../../..
echo .
echo .

