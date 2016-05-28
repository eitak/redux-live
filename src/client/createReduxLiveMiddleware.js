import _ from 'lodash'

import {CONFIRM_ACTION, UNSUBSCRIBE_TO_STREAM, SUBSCRIBE_TO_STREAM} from './constants/ActionTypes'
import {SET_STREAM_INITIAL_STATE} from '../shared/constants/ActionTypes'
import {defaultMergeActions} from '../shared/Defaults'

function createReduxLiveMiddleware(serverCommunicator, mergeActions=defaultMergeActions) {
    return store => {
        for (let stream of store.getState().reduxLive.streams) {
            serverCommunicator.subscribeStream(stream.streamId)
        }

        return next => {
            serverCommunicator.onNewActionFromServer(action => {
                const state = store.getState();
                const stream = getStream(state, action.reduxLive.streamId);

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
                const stream = getStream(state, streamId);
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
                console.log(action);

                if (action.type === SUBSCRIBE_TO_STREAM) {
                    serverCommunicator.saveActionOnServer(action);
                    serverCommunicator.subscribeStream(action.streamId);
                    return
                }

                if (action.type === SET_STREAM_INITIAL_STATE) {
                    next(action);
                    return
                }

                if (action.type === UNSUBSCRIBE_TO_STREAM) {
                    serverCommunicator.unsubscribeStream(action.streamId);
                    next(action);
                    return
                }

                if (!action.reduxLive) {
                    next(action);
                    return
                }

                const state = store.getState();

                const streamId = action.reduxLive.streamId;
                const stream = getStream(state, streamId);
                const shouldSaveAction = stream && stream.pendingActions && stream.pendingActions.length === 0;
                if (shouldSaveAction) {
                    serverCommunicator.saveActionOnServer({
                        ...action,
                        reduxLive: {
                            streamId: streamId,
                            sequenceNumber: stream.sequenceNumber + 1
                        }
                    })
                }

                next(action)
            }
        }
    }
}

function getStream(state, streamId) {
    const relevantStreams = state.reduxLive.streams.filter(stream => {
        return _.isEqual(stream.streamId, streamId)
    });
    if (relevantStreams.length === 1) {
        return relevantStreams[0]
    } else {
        return false
    }
}

export default createReduxLiveMiddleware
