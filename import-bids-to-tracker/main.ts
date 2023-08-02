const main = () => {
    const props = runtimeProperties();

    const bids = loadBidsFromSheet();

    const trackerModule = tracker(props.tracker);

    Logger.log(trackerModule.loginTracker());
}