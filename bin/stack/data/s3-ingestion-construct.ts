import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as iot from '@aws-cdk/aws-iot';

import * as base from '../../../lib/template/construct/base/base-construct';


export interface ConstructProps extends base.ConstructCommonProps {

}

export class S3IngestionConstruct extends base.BaseConstruct {

    public dataIotBucket: s3.Bucket;

    constructor(scope: cdk.Construct, id: string, props: ConstructProps) {
        super(scope, id, props);

        this.dataIotBucket = this.createS3Bucket(this.stackConfig.S3BucketName);

        this.createIoTRuleToS3(this.stackConfig.S3IngestionRuleName, this.dataIotBucket);
    }

    private createIoTRuleToS3(ruleNameSuffix: string, bucket: s3.Bucket) {
        const ruleName = `${this.projectPrefix}_${ruleNameSuffix}`.toLowerCase().replace('-', '_');
        const sql = `SELECT * FROM '#'`; // $aws/rules/rule_name/thing-name/data-type

        const role = new iam.Role(this, `${ruleNameSuffix}Role`, {
            roleName: `${this.projectPrefix}-${ruleNameSuffix}Role`,
            assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
        });
        role.addToPolicy(
            new iam.PolicyStatement({
                resources: ["*"],
                actions: [
                    "s3:PutObject"
                ]
            })
        );

        const bucketKey: string = ruleNameSuffix + '/${topic(1)}/${topic(2)}/${topic(3)}'
                       + '${parse_time("yyyy-MM-dd", timestamp(), "UTC")}/${timestamp()}.json';
        const bucketErroKey: string = 'fail/${timestamp()}.json';

        new iot.CfnTopicRule(this, ruleNameSuffix, {
            ruleName: ruleName,
            topicRulePayload: {
                ruleDisabled: false,
                sql: sql,
                awsIotSqlVersion: '2016-03-23',
                actions: [{ s3: { bucketName: bucket.bucketName, key: bucketKey, roleArn: role.roleArn } }],
                errorAction: { s3: { bucketName: bucket.bucketName, key: bucketErroKey, roleArn: role.roleArn } }
            }
        });
    }
}
