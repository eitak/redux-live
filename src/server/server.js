import _ from 'lodash'

export class ServerActionManager {

    constructor(getActionBySequenceNumber, getLastSequenceNumber, saveAction, mergeActions) {
        this.getActionBySequenceNumber = getActionBySequenceNumber; // MUST be consistent reads
        this.getLastSequenceNumber = getLastSequenceNumber; // MUST be consistent reads
        this.saveAction = saveAction;
        this.mergeActions = mergeActions;
    }

    async applyClientAction(action) {
        const stateId = action.stateId;
        const lastSequenceNumber = await this.getLastSequenceNumber(stateId);
        const nextSequenceNumber = lastSequenceNumber + 1;

        if (action.sequenceNumber > nextSequenceNumber) {
            throw new Error('Invalid sequence number %d', action.sequenceNumber);
        }

        const serverActions = await Promise.all(_.range(action.sequenceNumber, nextSequenceNumber)
                .map((sequenceNumber) => this.getActionBySequenceNumber(sequenceNumber, stateId)));

        const actionToSave = serverActions
            .reduce((transformedAction, serverAction) => {
                const mergedActions = this.mergeActions(transformedAction, serverAction.action);
                return mergedActions[1];
            }, action.action);

        await this.saveAction({
            sequenceNumber: nextSequenceNumber,
            clientId: action.clientId,
            stateId: stateId,
            action: actionToSave
        });
    }

}
