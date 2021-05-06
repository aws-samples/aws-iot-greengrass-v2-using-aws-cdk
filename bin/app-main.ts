#!/usr/bin/env node
import { AppContext } from '../lib/template/app-context';
import { IoTThingStack } from './stack/iot/iot-thing-stack';
import { ThingMonitorStack } from './stack/iot/thing-monitor-stack';
import { GreengrassUploadStack } from './stack/iot/gg-upload-stack';
import { GreengrassComponentStack } from './stack/iot/gg-componet-stack';
import { DataPipelineStack } from './stack/data/data-pipeline-stack';
import { CicdPipelineStack } from './stack/ops/cicd-pipeline-stack';

const appContext = new AppContext({
    appConfigEnvName: 'APP_CONFIG',
});

if (appContext.stackCommonProps != undefined) {
    new IoTThingStack(appContext, appContext.appConfig.Stack.IoTThing);
    new ThingMonitorStack(appContext, appContext.appConfig.Stack.ThingMonitor);
    
    new GreengrassUploadStack(appContext, appContext.appConfig.Stack.GreengrassUpload);
    new GreengrassComponentStack(appContext, appContext.appConfig.Stack.GreengrassComponent);
    
    new DataPipelineStack(appContext, appContext.appConfig.Stack.DataPipeline);

    new CicdPipelineStack(appContext, appContext.appConfig.Stack.CicdPipeline);
} else {
    console.error('[Error] wrong AppConfigFile');
}
