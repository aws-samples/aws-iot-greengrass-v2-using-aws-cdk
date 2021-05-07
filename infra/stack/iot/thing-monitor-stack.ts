import * as cdk from '@aws-cdk/core';
import * as iot from '@aws-cdk/aws-iot';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as cr from '@aws-cdk/custom-resources';

import * as base from '../../../lib/template/stack/base/base-stack';
import { AppContext } from '../../../lib/template/app-context';
import { LambdaPatternConstruct } from '../../../lib/template/pattern/lambda-construct';

export class ThingMonitorStack extends base.BaseStack {

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);

        this.enableThingEventMessage();

        const table = new ddb.Table(this, 'ThingMonitor', {
            tableName: `${this.projectPrefix}-ThingMonitor`,
            partitionKey: {
                name: 'thingName',
                type: ddb.AttributeType.STRING
            },
            sortKey: {
                name: 'timestamp',
                type: ddb.AttributeType.NUMBER
            }
        });

        const ruleList: any[] = [
            { name: 'thing_created', topic: 'created' },
            { name: 'thing_updated', topic: 'updated' },
            { name: 'thing_deleted', topic: 'deleted' },
        ];

        ruleList.forEach((rule) => { this.createIotRule(rule.name, rule.topic, table) });
    }

    private enableThingEventMessage() {
        const provider = new cr.Provider(this, 'EnableThingEventProvider', {
            onEventHandler: this.createEnableThingEventMessageLambda('EnableThingEventLambda')
        });

        // https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/iot.html#IoT.Client.update_event_configurations
        new cdk.CustomResource(this, `EnableThingEventCR`, {
            serviceToken: provider.serviceToken,
            properties: {
                Type: 'THING',
                Enable: 'true'
            }
        });
    }

    private createEnableThingEventMessageLambda(baseName: string): lambda.Function {
        return new LambdaPatternConstruct(this, baseName, {
            baseName: baseName,
            lambdaPath: 'codes/lambda/custom_iot_event_msg/src',
            projectFullName: this.projectPrefix,
            policies: [
                new iam.PolicyStatement({
                    actions: [
                        "iot:*"
                    ],
                    effect: iam.Effect.ALLOW,
                    resources: ['*']
                })
            ]
        }).lambdaFunction;
    }

    // https://docs.aws.amazon.com/iot/latest/developerguide/registry-events.html
    private createIotRule(ruleName: string, topic: string, table: ddb.Table) {
        const sql = `SELECT * FROM '$aws/events/thing/+/${topic}'`;
        // const sql = `SELECT * FROM '$aws/events/thing/#'`;

        const role = new iam.Role(this, `${ruleName}Role`, {
            roleName: `${this.projectPrefix}-${ruleName}Role`,
            assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
        });

        role.addToPolicy(
            new iam.PolicyStatement({
                resources: [table.tableArn],
                actions: [
                    "dynamodb:BatchGetItem",
                    "dynamodb:GetRecords",
                    "dynamodb:GetShardIterator",
                    "dynamodb:Query",
                    "dynamodb:GetItem",
                    "dynamodb:Scan",
                    "dynamodb:ConditionCheckItem",
                    "dynamodb:BatchWriteItem",
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem"
                ]
            })
        );

        new iot.CfnTopicRule(this, ruleName, {
            ruleName: `${this.projectPrefix.toLowerCase().replace('-', '_')}_${ruleName}`,
            topicRulePayload: {
                ruleDisabled: false,
                sql: sql,
                awsIotSqlVersion: '2016-03-23',
                actions: [{ dynamoDBv2: { putItem: { tableName: table.tableName }, roleArn: role.roleArn } }]
            }
        });
    }
}
