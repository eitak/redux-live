import {createStore} from 'redux'
import _ from 'lodash'

import {defaultMergeActions} from '../shared/Defaults'
import {defaultIsActionValid} from './Defaults'
import {SET_STREAM_INITIAL_STATE} from '../shared/constants/ActionTypes'

class ReduxLiveServer {

    constructor({getReducer, reducer, mergeActions=defaultMergeActions, isActionValid=defaultIsActionValid, db, clientCommunicator}) {
        this.getReducer = getReducer ? getReducer : () => reducer;
        this.mergeActions = mergeActions;
        this.isActionValid = isActionValid;
        this.db = db;
        this.clientCommunicator = clientCommunicator;
    }

    start() {
        this.clientCommunicator.onNewAction(async action => {
            await this.saveAction(action)
        });

        this.db.onNewAction(action => {
            this.clientCommunicator.sendAction(action)
        });

        this.clientCommunicator.onNewSubscription(async (clientId, streamId) => {
            const currentSnapshot = await this.db.getSnapshot(streamId);
            const action = {
                type: SET_STREAM_INITIAL_STATE,
                state: _.omit(currentSnapshot, 'reduxLive'),
                reduxLive: {
                    streamId: streamId,
                    sequenceNumber: currentSnapshot.reduxLive.sequenceNumber
                }
            };

            this.clientCommunicator.sendActionToClient(clientId, action)
        });
    }

    async saveAction(action) {
        if (!this.isActionValid(action)) {
            console.error('Received invalid action: %j', action);
            return;
        }

        const streamId = action.reduxLive.streamId;

        const previousSnapshot = await this.db.getSnapshot(streamId);
        const lastSequenceNumber = previousSnapshot.reduxLive.sequenceNumber;
        const nextSequenceNumber = lastSequenceNumber + 1;

        const sequenceNumber = action.reduxLive.sequenceNumber;
        const invalidSequenceNumber = sequenceNumber <= 0 || sequenceNumber > nextSequenceNumber;
        if (invalidSequenceNumber) {
            console.error('Action has invalid sequence number %j', action);
            return;
        }

        const serverActions = await Promise.all(_.range(sequenceNumber, nextSequenceNumber)
            .map((sequenceNumber) => this.db.getAction(streamId, sequenceNumber)));

        const transformedAction = serverActions
            .reduce((transformedAction, serverAction) => {
                const mergedActions = this.mergeActions(transformedAction, serverAction);
                return mergedActions[1];
            }, action);

        const actionToSave = {
            ...transformedAction,
            reduxLive: {
                ...action.reduxLive,
                sequenceNumber: nextSequenceNumber,
                streamId: streamId
            }
        };

        const store = createStore(this.getReducer(streamId), previousSnapshot);
        store.dispatch(actionToSave);

        await this.db.saveSnapshot({
            ...store.getState(),
            reduxLive: {
                sequenceNumber: nextSequenceNumber,
                streamId: streamId
            }
        });
        await this.db.saveAction(actionToSave);
    }

}

export default ReduxLiveServer
