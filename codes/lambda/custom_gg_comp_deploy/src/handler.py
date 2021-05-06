import os
import json
import boto3
from botocore.exceptions import ClientError


def deploy_components(props):
    target_arn = str(props['TARGET_ARN'])
    deployment_name = str(props['DEPLOYMENT_NAME'])
    components = str(props['COMPONENTS'])
    print('Deploy Components===>', components)

    try:
        client = boto3.client('greengrassv2')
        response = client.create_deployment(
            targetArn=target_arn,
            deploymentName=deployment_name,
            components=json.loads(components)
        )
        print('deploy_components: success', response)
        return response['deploymentId']
    except Exception as e:
        print("deploy_components: fail", e)
        return None


def cancel_components(deployment_id):
    print("cancel_components: requested", deployment_id)

    try:
        client = boto3.client('greengrassv2')
        response = client.cancel_deployment(
            deploymentId=deployment_id
        )
        print('cancel_components: success', response)
        return response['message'] if 'message' in response else 'Ok'
    except Exception as e:
        print("cancel_components: fail", e)
        return None


def handle(event, context):
    print('event-->', json.dumps(event))

    request_type = event['RequestType']
    physical_id = None

    if request_type == 'Create':
        physical_id = deploy_components(event['ResourceProperties'])
    elif request_type == 'Update':
        physical_id = deploy_components(event['ResourceProperties'])
    elif request_type == 'Delete':
        # physical_id = cancel_components(event['PhysicalResourceId'])
        physical_id = event['PhysicalResourceId']

    if physical_id != None:
        return { 'PhysicalResourceId': physical_id }
    else:
        raise Exception('Fail to handl Greengrass Deployment')
