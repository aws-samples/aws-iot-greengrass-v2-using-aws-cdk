import os
import sys
import json
import time
import datetime

curr_dir = os.path.abspath(os.path.dirname(__file__))
sys.path.append(curr_dir)

import logger
logger.info('(4)====>LOAD Path===>{}'.format(curr_dir))

_enable_publish = False

_topic = None
_thing_name = None
_version = None

import awsiot.greengrasscoreipc
from awsiot.greengrasscoreipc.model import (
    QOS,
    PublishToIoTCoreRequest
)
_ipc_client = awsiot.greengrasscoreipc.connect()


def publish_data(topic, message: str):
    logger.info('---publish_data: {}'.format(message))
    logger.info('---topic: {}'.format(topic))

    if _enable_publish == True:
        logger.info('--------try to publish-----2')
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
    else:
        logger.info('--------publish disabled-----')
    

def create_data(sample, count):
    sample['count'] = count
    sample['thingName'] = _thing_name
    sample['funcName'] = _version
    
    message = json.dumps(sample)
    logger.info('---create_data: {}'.format(message))
    return message


def load_sample():
    with open(curr_dir + '/' + 'event_01.json') as f:
        sample = json.load(f)
        return sample


def load_environ():
    global _topic, _thing_name, _version
    _topic = os.environ.get('RULE_TOPIC', 'test/rule/topic')
    _thing_name = os.environ.get('AWS_IOT_THING_NAME', 'DevLocal')
    _version = os.environ.get('FUNCTION_VERION', 'not-defined')
    logger.info('>>==--topic: {}'.format(_topic))
    logger.info('>>==--Lambda Loading... version:{} at {}--==<<'.format(_version, str(datetime.datetime.now())))


def run():
    logger.info('------------------------run-------------------')
    load_environ()

    sample = load_sample()
    type = sample['type'] if 'type' in sample else 'no-type'
    topic = '{}/{}/{}'.format(_topic, _thing_name, type)

    count = 0
    sleep_time_in_sec = int(os.environ.get('SLEEP_TIME', 'not-defined'))
    while True:
        count = count + 1
        message = create_data(sample, count)

        publish_data(topic, message)

        logger.info('--------sleep----{}'.format(sleep_time_in_sec))
        logger.info('>>==--Lambda Loading... (77)version:{} --==<<'.format(os.environ.get('FUNCTION_VERION', 'not-defined'), str(datetime.datetime.now())))
        logger.info('>>==--Lambda Loading... (77)version:{} --==<<'.format(os.environ.get('FUNCTION_VERION2', 'not-defined')))
        logger.info('>>==--Lambda Loading... (77)version:{} --==<<'.format(os.environ.get('FUNCTION_VERION3', 'not-defined')))
        logger.info('>>==--Lambda Loading... SLEEP_TIME:{} --==<<'.format(os.environ.get('SLEEP_TIME', 'not-defined')))
        logger.info('>>==--Lambda Loading... SLEEP_TIME2:{} --==<<'.format(os.environ.get('SLEEP_TIME2', 'not-defined')))
        
        time.sleep(sleep_time_in_sec)


def handle(event, context):
    # this method is a dummy
    logger.info('-------handle')


run()