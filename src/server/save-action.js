import _ from 'lodash'
import { createStore } from 'redux'

function createSaveActionFunction (db, mergeActions, reducer) {

    return async function saveAction(stateId, action) {
        const previousSnapshot = await db.getSnapshot(stateId);
        const lastSequenceNumber = previousSnapshot.sequenceNumber;
        const nextSequenceNumber = lastSequenceNumber + 1;

        const invalidSequenceNumber = action.sequenceNumber < 0 || action.sequenceNumber > nextSequenceNumber;
        if (invalidSequenceNumber) {
            console.error('Invalid sequence number %d', action.sequenceNumber);
            throw new Error('Invalid sequence number %d', action.sequenceNumber);
        }

        const serverActions = await Promise.all(_.range(action.sequenceNumber, nextSequenceNumber)
            .map((sequenceNumber) => db.getActionBySequenceNumber(stateId, sequenceNumber)));

        const actionToSave = serverActions
            .reduce((transformedAction, serverAction) => {
                const mergedActions = mergeActions(transformedAction, serverAction.action);
                return mergedActions[1];
            }, action.action);

        console.log('Saving for stateId: %s, clientId: %s, sequenceNumber: %s, action: %j',
            stateId, action.clientId, nextSequenceNumber, actionToSave);

        await db.saveAction(stateId, {
            sequenceNumber: nextSequenceNumber,
            clientId: action.clientId,
            action: actionToSave
        });

        const store = createStore(reducer, previousSnapshot.state);
        store.dispatch(actionToSave);

        await db.saveSnapshot(stateId, {
            sequenceNumber: nextSequenceNumber,
            state: store.getState()
        });
    }

}

export default createSaveActionFunction
