import cdk = require('@aws-cdk/core');
import lambda = require('@aws-cdk/aws-lambda');
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import { S3EventSource } from '@aws-cdk/aws-lambda-event-sources';

export interface LambdaPatternConstructProps {
  projectFullName: string;
  baseName: string;
  lambdaPath: string;
  policies: string[] | iam.PolicyStatement[];
  handler?: string;
  environments?: any;
  timeout?: cdk.Duration;
  bucket?: s3.Bucket;
  layerArns?: string[];
  bucketPrefix?: string[];
  bucketSuffix?: string[];
}

export class LambdaPatternConstruct extends cdk.Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly lambdaRole: iam.Role;

  constructor(scope: cdk.Construct, id: string, props: LambdaPatternConstructProps) {
    super(scope, id);

    const lambdaName: string = `${props.projectFullName}-${props.baseName}-Lambda`;
    const roleName: string = `${props.projectFullName}-${props.baseName}-Lambda-Role`;

    this.lambdaRole = this.createRole(roleName, props.policies);
    this.lambdaFunction = this.createLambda(lambdaName, props.lambdaPath, this.lambdaRole, props);
  }

  private createLambda(lambdaName: string, lambdaPath: string, lambdaRole: iam.Role, props: LambdaPatternConstructProps): lambda.Function {
    var layers = this.loadLayers(lambdaName, props.layerArns!);

    const lambdaFunction = new lambda.Function(this, lambdaName, {
      functionName: lambdaName,
      code: lambda.Code.fromAsset(lambdaPath),
      handler: props.handler != undefined ? props.handler : 'handler.handle',
      runtime: lambda.Runtime.PYTHON_3_9,
      timeout: props.timeout != undefined ? props.timeout : cdk.Duration.seconds(60 * 3),
      role: lambdaRole,
      environment: props.environments,
      layers: layers.length > 0 ? layers : undefined,
    });

    if (props.bucket != undefined) {
      const filterList: any[] = [];
      // const filters: any = {};
      if (props.bucketPrefix != undefined && props.bucketPrefix.length > 0) {
        for (var item of props.bucketPrefix) {
          lambdaFunction.addEventSource(new S3EventSource(props.bucket, {
            events: [s3.EventType.OBJECT_CREATED_PUT, s3.EventType.OBJECT_CREATED_COPY],
            filters: [{prefix: item}]
          }));
          // filterList.push({prefix: item});
          // filters['prefix'] = props.bucketPrefix;
        }
      }
      if (props.bucketSuffix != undefined && props.bucketSuffix.length > 0) {
        for (var item of props.bucketSuffix) {
          lambdaFunction.addEventSource(new S3EventSource(props.bucket, {
            events: [s3.EventType.OBJECT_CREATED_PUT, s3.EventType.OBJECT_CREATED_COPY],
            filters: [{suffix: item}]
          }));
          // filterList.push({suffix: item});
          // filters['suffix'] = props.bucketSuffix;
        }
      }
      // lambdaFunction.addEventSource(new S3EventSource(props.bucket, {
      //   events: [s3.EventType.OBJECT_CREATED],
      //   filters: filterList
      // }));
    }

    return lambdaFunction;
  }

  private createRole(roleName: string, policies: string[] | iam.PolicyStatement[]): iam.Role {
    const role = new iam.Role(this, roleName, {
      roleName: roleName,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    role.addManagedPolicy({ managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' });
    for (var item of policies) {
      if (item instanceof iam.PolicyStatement) {
        role.addToPolicy(item);
      } else {
        role.addManagedPolicy({ managedPolicyArn: item });
      }
    }

    return role;
  }

  private loadLayers(lambdaName: string, layerArns: string[]): any[] {
    var layers = [];

    if (layerArns != undefined && layerArns.length > 0) {
      for (var arn of layerArns) {
        let list: string[] = arn.split(':');
        layers.push(lambda.LayerVersion.fromLayerVersionArn(this, `${lambdaName}-${list[list.length - 2]}-layer`, arn))
      }
    }

    return layers;
  }
}