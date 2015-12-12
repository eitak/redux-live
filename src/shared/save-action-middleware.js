const createSaveActionMiddleware = (serverActions, saveAction) => store => next => action => {
    if (serverActions.indexOf(action.type) < 0) {
        return next(action);
    }

    const initialState = store.getState();
    if (action.sequenceNumber !== initialState.sequenceNumber + 1) {
        console.log(`Action has sequence number: ${action.sequenceNumber}; expected it to be ${initialState.sequenceNumber + 1}. Ignoring action.`);
        return initialState;
    }

    if (action.stateId !== initialState.stateId) {
        console.log(`Action has stateId: ${action.stateId}; expected it to be ${initialState.stateId}. Ignoring action.`);
        return initialState;
    }

    const result = next(action);

    const newState = store.getState();
    if (initialState === newState) {
        console.log('Not saving action, as there was no change.', action);
    } else if (action.timestamp) {
        console.log('Not saving action, as it is already saved.');
    } else {
        saveAction(action, newState);
    }

    return result;
};

export default createSaveActionMiddleware;
