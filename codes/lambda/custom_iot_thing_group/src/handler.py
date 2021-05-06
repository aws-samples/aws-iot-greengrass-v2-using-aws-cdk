import os
import json
import boto3
from botocore.exceptions import ClientError


def create_iot_thing_group(props):
    group_name = str(props['ThingGroupName'])

    try:
        client = boto3.client('iot')
        response = client.create_thing_group(
            thingGroupName=group_name,
        )
        print('create_iot_thing_group: success', response)
        return response['thingGroupArn']
    except Exception as e:
        print("create_iot_thing_group: fail", e)
        return None


def delete_iot_thing_group(thing_group_arn: str):
    print("delete_iot_thing_group: requested", thing_group_arn)

    try:
        client = boto3.client('iot')
        response = client.delete_thing_group(
            thingGroupName=thing_group_arn.split('/')[-1]
        )
        print('delete_iot_thing_group: success', response)
        return response['message'] if 'message' in response else thing_group_arn
    except Exception as e:
        print("delete_iot_thing_group: fail", e)
        return None


def handle(event, context):
    print('event-->', json.dumps(event))

    request_type = event['RequestType']
    physical_id = None

    if request_type == 'Create':
        physical_id = create_iot_thing_group(event['ResourceProperties'])
    elif request_type == 'Update':
        physical_id = delete_iot_thing_group(event['PhysicalResourceId'])
        physical_id = create_iot_thing_group(event['ResourceProperties'])
    elif request_type == 'Delete':
        physical_id = delete_iot_thing_group(event['PhysicalResourceId'])

    if physical_id != None:
        return { 'PhysicalResourceId': physical_id }
    else:
        raise Exception('Fail to handl Greengrass Deployment')
