import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cr from '@aws-cdk/custom-resources';

import * as base from '../../../lib/template/stack/base/base-stack';
import { AppContext } from '../../../lib/template/app-context';

export class IoTThingStack extends base.BaseStack {

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);

        this.exportOutput('ThingNamePrefix', `${this.stackConfig.ThingGroupName}-${this.stackConfig.ThingNamePrefix}-${this.stackConfig.ThingPostCode}-${this.stackConfig.ThingShopCode}`);
        this.exportOutput('ThingGroupName', this.stackConfig.ThingGroupName);
        this.exportOutput('ProjectPrefix', this.projectPrefix);
        this.exportOutput('ProjectRegion', this.region);

        this.createCredential();

        this.createIoTThingGroup(this.stackConfig.ThingGroupName);
        this.createIoTRoleAlias('GreengrassV2TokenExchangeRole', this.account);
    }

    private createIoTThingGroup(groupName: string) {
        const lambdaBaseName: string = 'create-iot-thing-group';
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
                "iot:CreateThingGroup",
                "iot:DeleteThingGroup"
            ],
            effect: iam.Effect.ALLOW,
            resources: ['*']
        }));

        const func = new lambda.Function(this, lambdaBaseName, {
            functionName: `${lambdaName}Function`,
            code: lambda.Code.fromAsset('./codes/lambda/custom_iot_thing_group/src'),
            handler: 'handler.handle',
            timeout: cdk.Duration.seconds(120),
            runtime: lambda.Runtime.PYTHON_3_6,
            role: lambdaRole,
        });

        const provider = new cr.Provider(this, 'CreateIotGroupProvider', {
            onEventHandler: func
        });

        new cdk.CustomResource(this, `CreateIotGroupCustomResource`, {
            serviceToken: provider.serviceToken,
            properties: {
                ThingGroupName: groupName,
            }
        });
    }

    private createCredential() {
        const selection = this.stackConfig.CredentialSelection;

        const thingProvisionPolicyStatement = this.createThingInstallerProvisionPolicy();
        const thingDevEnvPolicyStatement = this.createThingInstallerDevEnvPolicy();

        if (selection === 'UserCredential') {
            const iamUserName = this.stackConfig.CredentialCases[selection].ThingSetupUserName;
            const installerGroup = this.createThingInstallerIamGroup(thingProvisionPolicyStatement, thingDevEnvPolicyStatement);
            this.addThingInstallerIamUser(installerGroup, iamUserName);
        } else if (selection === 'TempCredential') {
            const tempRoleName = this.stackConfig.CredentialCases[selection].TempSetupRoleName;
            this.createInstallerTempRole(thingProvisionPolicyStatement, thingDevEnvPolicyStatement, tempRoleName);
        }
    }

    // https://docs.aws.amazon.com/greengrass/v2/developerguide/provision-minimal-iam-policy.html
    private createThingInstallerProvisionPolicy(): iam.PolicyStatement {
        const statement = {
            "Effect": "Allow",
            "Action": [
                "iot:AddThingToThingGroup",
                "iot:AttachPolicy",
                "iot:AttachThingPrincipal",
                "iot:CreateKeysAndCertificate",
                "iot:CreatePolicy",
                "iot:CreateRoleAlias",
                "iot:CreateThing",
                "iot:DescribeEndpoint",
                "iot:DescribeRoleAlias",
                "iot:DescribeThingGroup",
                "iot:GetPolicy",
                "iam:GetRole",
                "iam:CreateRole",
                "iam:PassRole",
                "iam:CreatePolicy",
                "iam:AttachRolePolicy",
                "iam:GetPolicy",
                "sts:GetCallerIdentity"
            ],
            "Resource": "*"
        };

        return iam.PolicyStatement.fromJson(statement);
    }

    private createThingInstallerDevEnvPolicy(): iam.PolicyStatement {
        const statement = {
            "Sid": "DeployDevTools",
            "Effect": "Allow",
            "Action": [
                "greengrass:CreateDeployment",
                "iot:CancelJob",
                "iot:CreateJob",
                "iot:DeleteThingShadow",
                "iot:DescribeJob",
                "iot:DescribeThing",
                "iot:DescribeThingGroup",
                "iot:GetThingShadow",
                "iot:UpdateJob",
                "iot:UpdateThingShadow"
            ],
            "Resource": "*"
        };

        return iam.PolicyStatement.fromJson(statement);
    }

    private createThingInstallerIamGroup(provisionStatement: iam.PolicyStatement, devEnvStatement: iam.PolicyStatement): iam.Group {
        const group = new iam.Group(this, 'InstallerGroup', {
            groupName: `${this.projectPrefix}-InstallerGroup`
        });

        group.addToPolicy(provisionStatement);
        group.addToPolicy(devEnvStatement);

        this.exportOutput('InstallerGroup', group.groupName);

        return group;
    }

    private addThingInstallerIamUser(group: iam.Group, userName: string) {
        const user = new iam.User(this, 'InstallerUser', {
            userName: `${this.projectPrefix}-${userName}`,
            password: cdk.SecretValue.plainText('UserIot1234'),
            groups: [group]
        });

        this.exportOutput('InstallerUser', user.userName);
    }

    private createInstallerTempRole(provisionStatement: iam.PolicyStatement, devEnvStatement: iam.PolicyStatement, roleName: string) {
        const tempRole = new iam.Role(this, roleName, {
            roleName: `${this.projectPrefix}-${roleName}`,
            assumedBy: new iam.AccountPrincipal(this.account)
        });

        tempRole.addToPolicy(provisionStatement);
        tempRole.addToPolicy(devEnvStatement);

        this.exportOutput('InstallerTempRoleARN', tempRole.roleArn)
    }

    private createIoTRoleAlias(roleName: string, account: string) {

        const tokenRole = new iam.Role(this, roleName, {
            roleName: `${this.projectPrefix}-${roleName}`,
            assumedBy: new iam.ServicePrincipal('credentials.iot.amazonaws.com'),
        });
        tokenRole.addToPolicy(this.createGreengrassV2TokenExchangeRoleAccessPolicy());
        
        tokenRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "s3:GetObject",
                "s3:PutObject",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStreams"
            ],
            resources: ["*"]
        }));

        const tokenRoleAliasName = `${this.projectPrefix}-${roleName}Alias`;
        const provider = this.createCustomResourceProvider(`${roleName}ProivderLambda`);
        new cdk.CustomResource(this, `IoTRoleAliasCustomResource`, {
            serviceToken: provider.serviceToken,
            properties: {
                TokenRoleARN: tokenRole.roleArn,
                IoTRoleAliasName: tokenRoleAliasName
            }
        });

        this.exportOutput('IoTTokenRole', tokenRole.roleName);
        this.exportOutput('IoTTokenRoleAlias', tokenRoleAliasName);
    }

    private createGreengrassV2TokenExchangeRoleAccessPolicy(): iam.PolicyStatement {
        const policy = iam.PolicyStatement.fromJson({
            "Effect": "Allow",
            "Action": [
                "iot:DescribeCertificate",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStreams",
                "iot:Connect",
                "iot:Publish",
                "iot:Subscribe",
                "iot:Receive",
                "s3:GetBucketLocation"
            ],
            "Resource": "*"
        });

        return policy;
    }

    private createCustomResourceProvider(lambdaBaseName: string): cr.Provider {
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
                "iot:*"],
            effect: iam.Effect.ALLOW,
            resources: ['*']
        }));

        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                "iam:*"],
            effect: iam.Effect.ALLOW,
            resources: ['*']
        }));

        const lambdaTimeout:number = Number(this.stackConfig.LambdaTimeout);
        const func = new lambda.Function(this, lambdaBaseName, {
            functionName: `${lambdaName}Function`,
            code: lambda.Code.fromAsset('./codes/lambda/custom_iot_role_alias/src'),
            handler: 'handler.handle',
            timeout: cdk.Duration.seconds(lambdaTimeout),
            runtime: lambda.Runtime.PYTHON_3_6,
            role: lambdaRole,
        });

        return new cr.Provider(this, 'IoTRoleAlias', {
            onEventHandler: func
        });
    }
}
