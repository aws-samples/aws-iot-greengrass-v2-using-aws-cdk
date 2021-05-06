import os
import json
import argparse
import datetime
import boto3

def convert_datetime(o):
    if isinstance(o, datetime.datetime):
        return o.__str__()

if __name__ == '__main__':
    print('--->Start<---')

    parser = argparse.ArgumentParser(description='Generate overall configuration file')
    parser.add_argument('-a', '--app', required=True, help='app-config.json')
    parser.add_argument('-t', '--thing', required=True, help='thing-config.json')
    args = parser.parse_args()
    print('==>Input: ', args.app, args.thing)

    with open(args.app) as f:
        app = json.load(f)
    with open(args.thing) as f:
        thing = json.load(f)

    project_name = app['Project']['Name']
    project_stage = app['Project']['Stage']
    project_account = app['Project']['Account']
    profile_name = app['Project']['Profile']
    project_prefix = project_name + project_stage

    role_arn = thing[project_prefix+'-IoTThingStack']['OutputInstallerTempRoleARN']
    role_session_name = '{}-TempRoleSession'.format(project_prefix)

    target_file = 'script/thing/install-gg-config-{}.json'.format(project_prefix)

    os.environ['AWS_PROFILE'] = profile_name
    client = boto3.client('sts')
    response = client.assume_role(
        RoleArn=role_arn,
        RoleSessionName=role_session_name
    )
    thing['Credentials'] = response['Credentials']

    thing['ProjectPrefix'] = project_prefix

    with open(target_file, 'w') as f:
        json.dump(thing, f, default = convert_datetime)
        print('Config', json.dumps(thing, default = convert_datetime))

    print('--->Finish<---')
