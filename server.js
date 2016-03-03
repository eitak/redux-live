import _ from 'lodash'

export class ServerActionManager {

    constructor(getActionBySequenceNumber, getLastSequenceNumber, saveAction, mergeActions) {
        this.getActionBySequenceNumber = getActionBySequenceNumber;
        this.getLastSequenceNumber = getLastSequenceNumber;
        this.saveAction = saveAction;
        this.mergeActions = mergeActions;
    }

    applyClientAction(action) {
        const lastSequenceNumber = this.getLastSequenceNumber(action.stateId);
        const nextSequenceNumber = lastSequenceNumber + 1;

        if (action.sequenceNumber > nextSequenceNumber) {
            throw new Error('Invalid sequence number');
        }

        const serverActions = _.range(action.sequenceNumber, nextSequenceNumber)
                .map((sequenceNumber) => this.getActionBySequenceNumber(sequenceNumber).action);

        const actionToSave = serverActions
            .reduce((transformedAction, serverAction) => {
                const mergedActions = this.mergeActions(transformedAction, serverAction);
                return mergedActions[1];
            }, action.action);

        this.saveAction({
            sequenceNumber: nextSequenceNumber,
            clientId: action.clientId,
            stateId: action.stateId,
            action: actionToSave
        });
    }

}
