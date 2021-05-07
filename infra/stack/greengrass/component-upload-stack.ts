import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from "@aws-cdk/aws-s3-deployment";

import * as base from '../../../lib/template/stack/base/base-stack';
import { AppContext } from '../../../lib/template/app-context';


export class ComponentUploadStack extends base.BaseStack {
    private bucket: s3.Bucket;
    private bucketKey: string;

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);

        this.bucket = this.createS3Bucket(this.stackConfig.BucketName);
        this.putParameter('gg-comp-upload-bucket-name', this.bucket.bucketName);

        this.bucketKey = this.stackConfig.BucketPrefix;
        const componentConfig: any = this.commonProps.appConfig.Stack['ComponentDeployment']

        this.uploadComponentToS3(componentConfig['SampleLogger']);
    }

    private uploadComponentToS3(config: any) {
        const compName = `${this.projectPrefix}-${config['Name']}`;
        const compVersion = config['Version'];
        const codePath = `${config['CodePath']}/zip`;
        
        new s3deploy.BucketDeployment(this, `${compName}-${compVersion}`, {
            sources: [s3deploy.Source.asset(codePath)],
            destinationBucket: this.bucket,
            destinationKeyPrefix: `${this.bucketKey}/${compName}/${compVersion}`
          });
    }
}
