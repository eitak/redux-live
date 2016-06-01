import _ from 'lodash'

import {SET_STREAM_INITIAL_STATE, CONFIRM_ACTION, UNSUBSCRIBE_TO_STREAM, SUBSCRIBE_TO_STREAM} from '../shared/constants/ActionTypes'
import {defaultMergeActions} from '../shared/Defaults'

const streamActionTypes = [UNSUBSCRIBE_TO_STREAM, SUBSCRIBE_TO_STREAM, SET_STREAM_INITIAL_STATE];

function createReduxLiveMiddleware(serverCommunicator, mergeActions = defaultMergeActions) {
    return store => {
        for (let stream of store.getState().reduxLive.streams) {
            serverCommunicator.subscribeStream(stream.streamId)
        }

        function handleStreamAction(action) {
            switch (action.type) {
                case SUBSCRIBE_TO_STREAM: return serverCommunicator.subscribeStream(action.streamId);
                case UNSUBSCRIBE_TO_STREAM: return serverCommunicator.unsubscribeStream(action.streamId)
            }
        }

        return next => {
            serverCommunicator.onNewActionFromServer(action => {
                if (streamActionTypes.indexOf(action.type) >= 0) {
                    handleStreamAction(action);
                    next(action);
                    return
                }

                const state = store.getState();
                const stream = getStream(state, action.reduxLive);

                const pendingActions = stream.pendingActions || [];
                const transformedActions = pendingActions
                    .reduce((transformedActions, clientActionToSave) => {
                        const actionToMergeWith = transformedActions.newAction;
                        const mergedActions = mergeActions(clientActionToSave, actionToMergeWith);
                        transformedActions.transformedClientActions.push(mergedActions[1]);
                        transformedActions.newAction = mergedActions[0];
                        return transformedActions
                    }, {transformedClientActions: [], newAction: action});

                next({
                    ...transformedActions.newAction,
                    reduxLive: {
                        ...action.reduxLive,
                        pendingActions: transformedActions.transformedClientActions
                    }
                })
            });

            serverCommunicator.onConfirmAction(streamId => {
                const state = store.getState();
                const stream = getStream(state, {streamId});
                if (stream) {
                    const shouldSavePendingAction = stream.pendingActions.length > 1;
                    if (shouldSavePendingAction) {
                        serverCommunicator.saveActionOnServer({
                            ...stream.pendingActions[1],
                            reduxLive: {
                                streamId: streamId,
                                sequenceNumber: stream.sequenceNumber + 2
                            }
                        })
                    }
                    next({type: CONFIRM_ACTION, streamId: streamId})
                }
            });

            return action => {
                if (streamActionTypes.indexOf(action.type) >= 0) {
                    handleStreamAction(action);
                    next(action);
                    return
                }

                const state = store.getState();

                const stream = getStream(state, action.reduxLive);
                const shouldSaveAction = stream && stream.pendingActions && stream.pendingActions.length === 0;
                if (shouldSaveAction) {
                    serverCommunicator.saveActionOnServer({
                        ...action,
                        reduxLive: {
                            streamId: stream.streamId,
                            sequenceNumber: stream.sequenceNumber + 1
                        }
                    })
                }

                next(action)
            }
        }
    }
}

function getStream(state, reduxLive) {
    if (!reduxLive) {
        return false
    }

    const relevantStreams = state.reduxLive.streams.filter(stream => {
        return _.isEqual(stream.streamId, reduxLive.streamId)
    });
    if (relevantStreams.length === 1) {
        return relevantStreams[0]
    } else {
        return false
    }
}

export default createReduxLiveMiddleware
