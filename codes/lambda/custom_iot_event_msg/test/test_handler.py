import os
import sys
import json

sys.path.append(os.path.dirname(os.path.abspath(os.path.dirname(__file__)))+'/src')
import handler

os.environ['AWS_PROFILE'] = 'cdk-demo'

def test_hander():
    event = {}
    event['RequestType'] = 'Create'
    event['ResourceProperties'] = {
        'Type': 'THING',
        'Enable': True
    }

    handler.handle(event, None)

test_hander()