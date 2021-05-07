import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as gg2 from '@aws-cdk/aws-greengrassv2';

import * as base from '../../../../lib/template/construct/base/base-construct';

export interface ConstructProps extends base.ConstructCommonProps {
    bucket: s3.IBucket;
    compConfig: any;
    components: any;
}

export class SampleLoggerComponent extends base.BaseConstruct {
    private compName: string;

    constructor(scope: cdk.Construct, id: string, props: ConstructProps) {
        super(scope, id, props);

        this.compName = `${this.projectPrefix}-${props.compConfig['Name']}`;
        
        const iotRuleTopic = this.parseRuleTopic();

        const receipe: any = this.createRecipe(props.bucket, props.compConfig, iotRuleTopic);

        const ggComponent = new gg2.CfnComponentVersion(this, `${this.compName}Comp`, {
            inlineRecipe: JSON.stringify(receipe)
        });

        this.addAccessControl(props.components, ggComponent, iotRuleTopic);
    }

    private parseRuleTopic(): string {
        const ruleNameSuffix = this.commonProps.appConfig.Stack.DataPipeline.IoTRuleNameFirehoseIngestion;
        const ruleName = `${this.projectPrefix}_${ruleNameSuffix}`.toLowerCase().replace('-', '_');
        const topicPrefix = this.commonProps.appConfig.Stack.DataPipeline.IoTRuleTopic;
        const topic = `${topicPrefix}/${ruleName}`;

        return topic;
    }

    private createRecipe(bucket: s3.IBucket, compConfig: any, ruleTopic: string): any {
        const compVersion = compConfig['Version'];
        const bucketKey = this.commonProps.appConfig.Stack.ComponentUpload.BucketPrefix;

        const recipe: any = {
            "RecipeFormatVersion": "2020-01-25",
            "ComponentName": this.compName,
            "ComponentVersion": compVersion,
            "ComponentDescription": `This component's name is ${this.compName}`,
            "ComponentPublisher": "beat",
            "ComponentConfiguration": {
                "DefaultConfiguration": {
                    
                }
            },
            "Manifests": [
                {
                    "Platform": {
                        "os": "linux"
                    },
                    "Lifecycle": {
                        "Setenv": {
                            "COMP_NAME_VERION": `${this.compName}:${compVersion}`,
                            "RULE_TOPIC": ruleTopic,
                            "SLEEP_TIME": '22',
                            "FUNCTION_VERION": `${this.compName}:${compVersion}`,
                        },
                        "Install": {
                            "script": `pip3 install -r {artifacts:decompressedPath}/${this.compName}/requirements.txt`
                        },
                        "Run": {
                            "script": `python3 {artifacts:decompressedPath}/${this.compName}/handler.py`
                        },
                    },
                    "Artifacts": [
                        {
                            "URI": `s3://${bucket.bucketName}/${bucketKey}/${this.compName}/${compVersion}/${this.compName}.zip`,
                            "Unarchive": "ZIP"
                        }
                    ]
                }
            ]
        };

        return recipe;
    }

    private addAccessControl(components: any, ggComponent: gg2.CfnComponentVersion, iotRuleTopic: string) {
        const topicWild = `${iotRuleTopic}/#`;

        components[this.compName] = {
            componentVersion: ggComponent.attrComponentVersion,
            configurationUpdate: {
                merge: JSON.stringify({
                    "accessControl": {
                        "aws.greengrass.ipc.mqttproxy": {
                            "sample-logger:mqttproxy:1": {
                                "policyDescription": "Allows access to publish to IoTCore",
                                "operations": [
                                    "aws.greengrass#PublishToIoTCore"
                                ],
                                "resources": [
                                    topicWild
                                ]
                            }
                        }
                    }
                })
            }
        };
    }
}