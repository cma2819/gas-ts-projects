export type Properties = {
    tracker: {
        username: string;
        password: string;
        baseUrl: string;
        eventPk: string;
    }
}

export const runtimeProperties = (): Properties => {
    const scriptProperties = PropertiesService.getScriptProperties();
    const [
        username,
        password,
        baseUrl,
        eventPk,
    ] = [
    scriptProperties.getProperty('TRACKER_USERNAME'),
     scriptProperties.getProperty('TRACKER_PASS'),
     scriptProperties.getProperty('TRACKER_BASE_URL'),
     scriptProperties.getProperty('TRACKER_EVENT_ID'),
    ]

    if (!(username && password && baseUrl && eventPk)) {
        throw new Error('Script properties not defined');
    }

    return {
        tracker: {
            username,
            password,
            baseUrl,
            eventPk
        }
    }
}