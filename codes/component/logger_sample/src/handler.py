import os
import sys
import json
import time
import datetime
import uuid

curr_dir = os.path.abspath(os.path.dirname(__file__))
sys.path.append(curr_dir)

import logger
logger.info('---> Current Directory- {}'.format(curr_dir))

_topic = None
_thing_name = None
_version = None
_sample_file_name = 'sample_data.json'


import awsiot.greengrasscoreipc
from awsiot.greengrasscoreipc.model import (
    QOS,
    PublishToIoTCoreRequest
)
_ipc_client = awsiot.greengrasscoreipc.connect()


def publish_data(topic, message: str):
    logger.info('--->publish_data: topic- {}'.format(topic))
    logger.info('--->publish_data: message- {}'.format(message))

    TIMEOUT = 10
    qos = QOS.AT_LEAST_ONCE

    request = PublishToIoTCoreRequest()
    request.topic_name = topic
    request.payload = bytes(message, "utf-8")
    request.qos = qos

    operation = _ipc_client.new_publish_to_iot_core()
    operation.activate(request)
    
    future = operation.get_response()
    future.result(TIMEOUT)


def utc_time():
    return datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'


def create_data(sample, count):
    sample['ThingName'] = _thing_name
    sample['MessageID'] = str(uuid.uuid1())

    sample['@timestamp'] = utc_time()
    sample['FuncionVersion'] = _version
    
    sample['Message']['Count'] = count
    sample['Message']['Value'] = datetime.datetime.utcnow().second
    
    message = json.dumps(sample)
    logger.info('--->create_data: data- {}'.format(message))
    return message


def load_sample_data(file_name: str):
    with open(curr_dir + '/' + file_name) as f:
        sample = json.load(f)
        return sample


def load_environ():
    global _topic, _thing_name, _version
    _topic = os.environ.get('RULE_TOPIC', 'test/rule/topic')
    _thing_name = os.environ.get('AWS_IOT_THING_NAME', 'DevLocal')
    _version = os.environ.get('FUNCTION_VERION', 'not-defined')
    logger.info('--->load_environ: topic- {}'.format(_topic))
    logger.info('--->load_environ: lambda version- {} at {}--==<<'.format(_version, str(datetime.datetime.now())))


def run():
    logger.info('------------------------run-------------------')
    load_environ()

    sample = load_sample_data(_sample_file_name)
    topic = '{}/{}'.format(_topic, _thing_name)

    count = 0
    sleep_time_in_sec = int(os.environ.get('SLEEP_TIME', '30'))
    while True:
        count = count + 1
        message = create_data(sample, count)

        publish_data(topic, message)

        logger.info('--->run: sleep- {}'.format(sleep_time_in_sec))
        time.sleep(sleep_time_in_sec)


def handle(event, context):
    # this method is a dummy
    run()


handle(None, None)