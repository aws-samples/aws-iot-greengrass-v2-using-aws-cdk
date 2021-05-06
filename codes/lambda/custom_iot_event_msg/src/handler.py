import json
import boto3
from botocore.exceptions import ClientError

def update_thing_event(props):
    type = str(props['Type'])
    enable = True if str(props['Enable']).lower() == 'true' else False

    print('update thing event: requested', type, enable)

    try:
        client = boto3.client('iot')
        response = client.update_event_configurations(
            eventConfigurations={
                type: {
                    'Enabled': enable
                }
            }
        )
        print('update thing event: success', response)
        return type + '-' + str(enable)
    except Exception as e:
        print("update thing event: fail", e)
        return None


def disable_thing_event(id):
    print('disable thing event: requested')

    try:
        client = boto3.client('iot')
        response = client.update_event_configurations(
            eventConfigurations={
                type: {
                    'Enabled': False
                }
            }
        )
        print('update thing event: success', response)
        return 'ok'
    except Exception as e:
        print("update thing event: fail", e)
        return None


def handle(event, context):
    print('event-->', json.dumps(event))

    request_type = event['RequestType']
    physical_id = None

    if request_type == 'Create':
        physical_id = update_thing_event(event['ResourceProperties'])
    elif request_type == 'Delete':
        physical_id = event['PhysicalResourceId']
    elif request_type == 'Update':
        physical_id = update_thing_event(event['ResourceProperties'])

    if physical_id != None:
        return { 'PhysicalResourceId': physical_id }
    else:
        raise Exception('Fail to handl iot-event-message')
