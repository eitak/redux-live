import _ from 'lodash'
import { createStore } from 'redux'

function createSaveActionFunction ({ db, mergeActions, reducer, isActionValid=() => true }) {

    return async function saveAction({stateId, clientId, sequenceNumber, action}) {
        delete action._originatedFromServer;

        const previousSnapshot = await db.getSnapshot(stateId);
        const lastSequenceNumber = previousSnapshot.sequenceNumber;
        const nextSequenceNumber = lastSequenceNumber + 1;

        const invalidSequenceNumber = sequenceNumber <= 0 || sequenceNumber > nextSequenceNumber;
        if (invalidSequenceNumber) {
            console.error('Invalid sequence number %d', sequenceNumber);
            throw new Error('Invalid sequence number %d', sequenceNumber);
        }

        const currentState = previousSnapshot.state;
        const validAction = isActionValid(currentState, action, clientId);
        if (!validAction) {
            console.error('Action is not valid for stateId %s: %j', stateId, action);
            throw new Error('Invalid action %j', action);
        }

        const serverActions = await Promise.all(_.range(sequenceNumber, nextSequenceNumber)
            .map((sequenceNumber) => db.getActionBySequenceNumber(stateId, sequenceNumber)));

        const actionToSave = serverActions
            .reduce((transformedAction, serverAction) => {
                const mergedActions = mergeActions(transformedAction, serverAction);
                return mergedActions[1];
            }, action);

        const recordToSave = {
            clientId: clientId,
            sequenceNumber: nextSequenceNumber,
            action: actionToSave
        };

        await db.saveAction(stateId, recordToSave);

        const store = createStore(reducer, currentState);
        store.dispatch(actionToSave);

        await db.saveSnapshot(stateId, {
            sequenceNumber: nextSequenceNumber,
            state: store.getState()
        });
    }

}

export default createSaveActionFunction
