const main = () => {
    const props = runtimeProperties();

    const bids = loadBidsFromSheet();

    const trackerModule = tracker(props.tracker);

    const {csrftoken, sessionId} = trackerModule.loginTracker();
    if (!csrftoken || !sessionId) {
        throw new Error('Failed');
    }
    trackerModule.postBids(bids, {csrfToken: csrftoken, sessionId});
}