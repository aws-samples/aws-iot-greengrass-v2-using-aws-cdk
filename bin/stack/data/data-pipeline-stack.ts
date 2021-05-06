import * as base from '../../../lib/template/stack/base/base-stack';
import { AppContext } from '../../../lib/template/app-context';

import * as ingestion from './s3-ingestion-construct'


export class DataPipelineStack extends base.BaseStack {

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);

        const s3Ingestion = new ingestion.S3IngestionConstruct(this, 's3-ingestion', {
            projectPrefix: this.projectPrefix,
            appConfig: this.commonProps.appConfig,
            appConfigPath: this.commonProps.appConfigPath,
            stackConfig: this.stackConfig,
            account: this.account,
            region: this.region,
        })
    }
}
