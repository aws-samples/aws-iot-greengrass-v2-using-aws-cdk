import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as iot from '@aws-cdk/aws-iot';
import * as es from '@aws-cdk/aws-elasticsearch';
import * as hose from '@aws-cdk/aws-kinesisfirehose';

import * as base from '../../../lib/template/stack/base/base-stack';
import { AppContext } from '../../../lib/template/app-context';


enum ElasticsearchSelection {
    DEVELOP,
    CUSTOM,
    LEGACY
}

export class DataPipelineStack extends base.BaseStack {

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);

        const domain = this.createElasticsearch();

        const fhose = this.createFirehose2ES(domain);

        if (fhose != undefined) {
            this.createIoTRuleToFirehose(stackConfig.IoTRuleNameFirehoseIngestion, fhose.deliveryStreamName!);
        }
    }

    private createFirehose2ES(domain: es.IDomain): hose.CfnDeliveryStream|undefined {
        const esBucket = this.createS3Bucket('firehost-es')

        const baseName = 'Firehose2ES';
        const role = new iam.Role(this, `${baseName}Role`, {
            roleName: `${this.projectPrefix}-${baseName}Role`,
            assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
        });
        role.addToPolicy(
            new iam.PolicyStatement({
                resources: ['*'],
                actions: [
                    'es:ESHttpPost',
                    'es:ESHttpPut',
                    'es:ESHttpGet',
                    // 'es:*',
                    'es:DescribeElasticsearchDomain',
                    'es:DescribeElasticsearchDomains',
                    'es:DescribeElasticsearchDomainConfig',
                ]
            })
        );
        role.addToPolicy(
            new iam.PolicyStatement({
                resources: ['*'],
                actions: [
                    's3:AbortMultipartUpload',
                    's3:GetBucketLocation',
                    's3:GetObject',
                    's3:ListBucket',
                    's3:ListBucketMultipartUploads',
                    's3:PutObject',
                ]
            })
        );
        role.addToPolicy(
            new iam.PolicyStatement({
                resources: ['*'],
                actions: [
                    'logs:PutLogEvents'
                ]
            })
        );
        this.exportOutput('Firehose2ESRole', role.roleArn)

        if (this.stackConfig.IoTRuleEnable) {
            // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-kinesisfirehose-deliverystream-elasticsearchdestinationconfiguration.html#cfn-kinesisfirehose-deliverystream-elasticsearchdestinationconfiguration-indexrotationperiod
            const fhose = new hose.CfnDeliveryStream(this, 'firehose', {
                deliveryStreamName: `${this.projectPrefix}-ES-Delivery`,
                elasticsearchDestinationConfiguration: {
                    indexName: 'index-thing-data',
                    domainArn:domain.domainArn,
                    roleArn: role.roleArn,
                    indexRotationPeriod: 'OneDay',
                    s3BackupMode: 'FailedDocumentsOnly',
                    s3Configuration: {
                        bucketArn: esBucket.bucketArn,
                        roleArn: role.roleArn,
                        prefix: 'fail',
                    }
                }
            });
            return fhose;
        } else {
            return undefined;
        }
    }

    private createIoTRuleToFirehose(ruleNameSuffix: string, streamName: string) {
        const ruleName = `${this.projectPrefix}_${ruleNameSuffix}`.toLowerCase().replace('-', '_');
        const sql = `SELECT * FROM '#'`; // $aws/rules/rule_name/thing-name/data-type

        const role = new iam.Role(this, `${ruleNameSuffix}Role`, {
            roleName: `${this.projectPrefix}-${ruleNameSuffix}Role`,
            assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
        });
        role.addToPolicy(
            new iam.PolicyStatement({
                resources: ['*'],
                actions: [
                    'firehose:*'
                ]
            })
        );

        new iot.CfnTopicRule(this, ruleNameSuffix, {
            ruleName: ruleName,
            topicRulePayload: {
                ruleDisabled: false,
                sql: sql,
                awsIotSqlVersion: '2016-03-23',
                actions: [{ firehose: { deliveryStreamName: streamName, roleArn: role.roleArn } }],
            }
        });
    }

    private createElasticsearch(): es.IDomain {
        let domain = undefined;
        const temp: string = this.stackConfig.ElasticsearchSelection;
        const selection: ElasticsearchSelection = (<any>ElasticsearchSelection)[temp];
        const selectionName = Object.values(ElasticsearchSelection)[selection];
        console.info('==> Elasticsearch Selection: ', selectionName);

        const domainName = this.stackConfig.DomainName;
        const fullDomainName = `${this.projectPrefix}-${domainName}`.toLowerCase().replace('_', '-');
        const masterUserName = this.stackConfig.MasterUserName;
        const conditions = this.createPolicyConditions(this.stackConfig.ESConditionAddress);

        if (selection == ElasticsearchSelection.DEVELOP) {
            const config = this.stackConfig.ElasticsearchCandidate[selectionName]

            domain = new es.Domain(this, domainName, {
                domainName: fullDomainName,
                version: es.ElasticsearchVersion.V7_9,
                enforceHttps: true,
                nodeToNodeEncryption: true,
                encryptionAtRest: {
                    enabled: true,
                },
                capacity: {
                    masterNodeInstanceType: config.MasterNodeType,
                    dataNodeInstanceType: config.DataNodeType
                },

                logging: {
                    slowSearchLogEnabled: true,
                    appLogEnabled: true,
                    slowIndexLogEnabled: true,
                },
                fineGrainedAccessControl: {
                    masterUserName: masterUserName,
                },
                useUnsignedBasicAuth: false,
                accessPolicies: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        principals: [new iam.AnyPrincipal()],
                        resources: [`arn:aws:es:${this.region}:${this.account}:domain/${fullDomainName}/*`],
                        actions: [
                            'es:ESHttp*',
                        ],
                        conditions: conditions
                    })
                ]
            });
        } else if (selection == ElasticsearchSelection.CUSTOM) {
            const config = this.stackConfig.ElasticsearchCandidate[selectionName]

            domain = new es.Domain(this, domainName, {
                domainName: fullDomainName,
                version: es.ElasticsearchVersion.V7_9,
                capacity: {
                    masterNodes: config.MasterNodeCount,
                    masterNodeInstanceType: config.MasterNodeType,
                    dataNodes: config.DataNodeCount,
                    dataNodeInstanceType: config.DataNodeType
                },
                ebs: {
                    volumeSize: config.VolumeSize
                },
                zoneAwareness: {
                    availabilityZoneCount: config.AZCount
                },
                enforceHttps: true,
                nodeToNodeEncryption: true,
                encryptionAtRest: {
                    enabled: true,
                },
                fineGrainedAccessControl: {
                    masterUserName: masterUserName,
                },
                useUnsignedBasicAuth: false,
                accessPolicies: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        principals: [new iam.AnyPrincipal()],
                        resources: [`arn:aws:es:${this.region}:${this.account}:domain/${fullDomainName}/*`],
                        actions: [
                            'es:ESHttp*',
                        ],
                        conditions: conditions
                    })
                ]
            });

        } else if (selection == ElasticsearchSelection.LEGACY) {
            const config = this.stackConfig.ElasticsearchCandidate[selectionName]

            const domainEndpoint = config.DomainEndpoint;
            domain = es.Domain.fromDomainEndpoint(this, domainName, domainEndpoint);
        } else {
            console.error('Elasticsearch Creation Fail - Wrong Selection');
        }

        return domain!;
    }

    private createPolicyConditions(ipAddressList: string[]): any {
        const condition: any = {};

        if (ipAddressList.length > 0) {
            condition['IpAddress'] = {
                'aws:SourceIp': ipAddressList
            }
        }

        return condition
    }
}
