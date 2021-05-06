import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as gg2 from '@aws-cdk/aws-greengrassv2';
import * as cr from '@aws-cdk/custom-resources';

import * as base from '../../../lib/template/stack/base/base-stack';
import { AppContext } from '../../../lib/template/app-context';

export class GreengrassComponentStack extends base.BaseStack {

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);

        const components = {};

        this.createLambdaSampleComponent(
            this.stackConfig.LambdaName, 
            this.stackConfig.CodePath,
            components);
        
        // this.createLambdaRealComponent(
        //     this.stackConfig.LambdaName, 
        //     this.stackConfig.CodePath,
        //     this.stackConfig.PublishTopic,
        //     components);
        
        this.deployComponents(components);
    }

    private createLambdaSampleComponent(basicName: string, codePath: string, components: any) {
        const lambdaFunc = this.createComponentLambda(basicName, codePath);

        const ruleNameSuffix = this.commonProps.appConfig.Stack.DataPipeline.S3IngestionRuleName;
        const ruleName = `${this.projectPrefix}_${ruleNameSuffix}`.toLowerCase().replace('-', '_');
        
        const topicPrefix = this.commonProps.appConfig.Stack.DataPipeline.IoTRuleTopic;
        const topic = `${topicPrefix}/${ruleName}`;

        const sampleComp = new gg2.CfnComponentVersion(this, `${basicName}Comp`, {
            lambdaFunction: {
                lambdaArn: lambdaFunc.currentVersion.functionArn,
                componentLambdaParameters: {
                    environmentVariables: {
                        RULE_TOPIC: topic,
                        SLEEP_TIME: '10',
                        FUNCTION_VERION: lambdaFunc.currentVersion.functionArn,
                    }
                },
            }
        });

        const topicWild = `${topic}/#`;
        components[lambdaFunc.functionName] = {
            componentVersion: sampleComp.attrComponentVersion,
            configurationUpdate: {
                merge: JSON.stringify({
                    "accessControl": {
                        "aws.greengrass.ipc.mqttproxy": {
                          "com.log.sample:mqttproxy:1": {
                            "policyDescription": "Allows access to publish to test/topic.",
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

    private createComponentLambda(baseName: string, codePath: string): lambda.Function {
        const lambdaName: string = `${this.projectPrefix}-${baseName}`;

        const lambdaRole = new iam.Role(this, `${baseName}Role`, {
            roleName: `${lambdaName}Role`,
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' }
            ]
        });

        const lambdaTimeout:number = Number(this.stackConfig.LambdaTimeout);
        const lambdaFunc = new lambda.Function(this, baseName, {
            functionName: `${lambdaName}Function`,
            code: lambda.Code.fromAsset(codePath),
            handler: 'handler.handle',
            timeout: cdk.Duration.seconds(lambdaTimeout),
            runtime: lambda.Runtime.PYTHON_3_7,
            role: lambdaRole
        });
        lambdaFunc.currentVersion.addAlias(this.commonProps.appConfig.Project.Stage);

        return lambdaFunc;
    }

    private deployComponents(components: any) {
        const deplymentName = this.projectPrefix;
        const thingGroupName = this.commonProps.appConfig.Stack.IoTThing.ThingGroupName;
        const thingTargetArn = `arn:aws:iot:${this.region}:${this.account}:thinggroup/${thingGroupName}`

        const name = 'ComponentDeploymnet';
        const provider = this.createComponentDeploymnetProvider(`${name}ProivderLambda`);
        new cdk.CustomResource(this, `ComponentDeploymnetCustomResource`, {
            serviceToken: provider.serviceToken,
            properties: {
                TARGET_ARN: thingTargetArn,
                DEPLOYMENT_NAME: deplymentName,
                COMPONENTS: JSON.stringify(components)
            }
        });
    }

    private createComponentDeploymnetProvider(lambdaBaseName: string): cr.Provider {
        const lambdaName: string = `${this.projectPrefix}-${lambdaBaseName}`;

        const lambdaRole = new iam.Role(this, `${lambdaBaseName}Role`, {
            roleName: `${lambdaName}Role`,
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' }
            ]
        });

        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                "iot:*",
                "greengrass:*"
            ],
            effect: iam.Effect.ALLOW,
            resources: ['*']
        }));

        const lambdaTimeout:number = Number(this.stackConfig.LambdaTimeout);
        const func = new lambda.Function(this, lambdaBaseName, {
            functionName: `${lambdaName}Function`,
            code: lambda.Code.fromAsset('./codes/lambda/custom_gg_comp_deploy/src'),
            handler: 'handler.handle',
            timeout: cdk.Duration.seconds(lambdaTimeout),
            runtime: lambda.Runtime.PYTHON_3_6,
            role: lambdaRole,
        });

        return new cr.Provider(this, 'GreengrassCompDeploy', {
            onEventHandler: func
        });
    }
}
