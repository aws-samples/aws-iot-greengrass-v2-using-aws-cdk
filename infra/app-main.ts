#!/usr/bin/env node
import { AppContext } from '../lib/template/app-context';
import { ThingInstallerStack } from './stack/iot/thing-installer-stack';
import { ThingMonitorStack } from './stack/iot/thing-monitor-stack';
import { ComponentUploadStack } from './stack/greengrass/component-upload-stack';
import { ComponentDeploymentStack } from './stack/greengrass/component-deployment-stack';
import { DataPipelineStack } from './stack/data/data-pipeline-stack';
import { CicdPipelineStack } from './stack/ops/cicd-pipeline-stack';

const appContext = new AppContext({
    appConfigEnvName: 'APP_CONFIG',
});

if (appContext.stackCommonProps != undefined) {
    new ThingInstallerStack(appContext, appContext.appConfig.Stack.ThingInstaller);
    new ThingMonitorStack(appContext, appContext.appConfig.Stack.ThingMonitor);
    
    new ComponentUploadStack(appContext, appContext.appConfig.Stack.ComponentUpload);
    new ComponentDeploymentStack(appContext, appContext.appConfig.Stack.ComponentDeployment);
    
    new DataPipelineStack(appContext, appContext.appConfig.Stack.DataPipeline);

    new CicdPipelineStack(appContext, appContext.appConfig.Stack.CicdPipeline);
} else {
    console.error('[Error] wrong AppConfigFile');
}
