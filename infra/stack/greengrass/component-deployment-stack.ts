import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cr from '@aws-cdk/custom-resources';
import * as s3 from '@aws-cdk/aws-s3';

import * as base from '../../../lib/template/stack/base/base-stack';
import { AppContext } from '../../../lib/template/app-context';

import * as sample_logger from './components/sample-logger-componet-construct';


export class ComponentDeploymentStack extends base.BaseStack {
    
    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);
        
        const components: any = {};
        const uploadBucket = s3.Bucket.fromBucketName(this, 'gg-upload-bucket', this.getParameter('gg-comp-upload-bucket-name')); 

        new sample_logger.SampleLoggerComponent(this, stackConfig.SampleLogger.Name, {
            projectPrefix: this.projectPrefix,
            appConfig: this.commonProps.appConfig,
            appConfigPath: this.commonProps.appConfigPath,
            stackConfig: this.stackConfig,
            account: this.account,
            region: this.region,

            bucket: uploadBucket,
            compConfig: stackConfig.SampleLogger,
            components: components
        })

        this.deployComponents(components);
    }

    private deployComponents(components: any) {
        const deplymentName = this.projectPrefix;
        const thingGroupName = this.commonProps.appConfig.Stack.ThingInstaller.ThingGroupName;
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

        const func = new lambda.Function(this, lambdaBaseName, {
            functionName: `${lambdaName}Function`,
            code: lambda.Code.fromAsset('./codes/lambda/custom_gg_comp_deploy/src'),
            handler: 'handler.handle',
            timeout: cdk.Duration.seconds(600),
            runtime: lambda.Runtime.PYTHON_3_6,
            role: lambdaRole,
        });

        return new cr.Provider(this, 'GreengrassCompDeploy', {
            onEventHandler: func
        });
    }
}
