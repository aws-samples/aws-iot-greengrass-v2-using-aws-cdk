import json
import boto3
from botocore.exceptions import ClientError

credentialDurationInSec = 3600


def createRoleAlias(props):
    alias_role_name = str(props['IoTRoleAliasName'])
    token_role_arn = str(props['TokenRoleARN'])
    print('Role creation: requested', alias_role_name)

    try:
        client = boto3.client('iot')
        response = client.create_role_alias(
            roleAlias=alias_role_name,
            roleArn=token_role_arn,
            credentialDurationSeconds=credentialDurationInSec
        )
        print('Role creation: success', response)
        return response['roleAlias']
    except Exception as e:
        print("Role creation: fail", e)
        return None


def deleteRoleAlias(role_alias_name):
    print("Role deletion : requested", role_alias_name)

    try:
        client = boto3.client('iot')
        client.delete_role_alias(
            roleAlias=role_alias_name
        )
        print("Role deletion : success")
        return role_alias_name
    except Exception as e:
        print("Role deletion: ", e)
        return None


def handle(event, context):
    print('event-->', json.dumps(event))

    request_type = event['RequestType']
    physical_id = None

    if request_type == 'Create':
        physical_id = createRoleAlias(event['ResourceProperties'])
    elif request_type == 'Delete':
        physical_id = deleteRoleAlias(event['PhysicalResourceId'])
    elif request_type == 'Update':
        deleteRoleAlias(event['PhysicalResourceId'])
        physical_id = createRoleAlias(event['ResourceProperties'])

    if physical_id != None:
        return { 'PhysicalResourceId': physical_id }
    else:
        raise Exception('Fail to handl IoTRoleAlias')
