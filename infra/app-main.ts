#!/usr/bin/env node
import { AppContext } from '../lib/template/app-context';
import { ThingInstallerStack } from './stack/iot/thing-installer-stack';


const appContext = new AppContext({
    appConfigEnvName: 'APP_CONFIG',
});

if (appContext.stackCommonProps != undefined) {
    new ThingInstallerStack(appContext, appContext.appConfig.Stack.ThingInstaller);
} else {
    console.error('[Error] wrong AppConfigFile');
}
