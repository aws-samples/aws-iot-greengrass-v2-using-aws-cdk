import os
import sys
import json

sys.path.append(os.path.dirname(os.path.abspath(os.path.dirname(__file__)))+'/src')
import handler

os.environ['AWS_PROFILE'] = 'cdk-demo'


def create_components():
    comps = {}
    comps['IotDataDev-LambdaCompSampleFunction'] = {
        'componentVersion': '7.0.0',
        'configurationUpdate': {
        'merge': "{\"Message\":\"Please~~~\"}"
        }
    }
    return json.dumps(comps)


def test_handle():
    event = {}
    event['RequestType'] = 'Create'
    event['ResourceProperties'] = {
        'TARGET_ARN': 'arn:aws:iot:ap-northeast-2:xxxxxxxxxx:thinggroup/Ver01Dev',
        'DEPLOYMENT_NAME': 'Ver01Dev',
        'COMPONENTS': create_components()
    }

    handler.handle(event, None)

test_handle()