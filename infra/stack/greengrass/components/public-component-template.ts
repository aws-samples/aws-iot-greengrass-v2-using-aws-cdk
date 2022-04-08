
export interface PublicComponentTemplateProps {
    componentName: string;
    componentVersion: string;

    configurationUpdate: any
}

export class PublicComponentTemplate {

    constructor(components: any, props: PublicComponentTemplateProps) {
        const compName = props.componentName;
        const compVersion = props.componentVersion;

        components[compName] = {
            componentVersion: compVersion,
            configurationUpdate: {
                merge: JSON.stringify(props.configurationUpdate)
            }
        };
    }
}