import _ from 'lodash'

export class ServerActionManager {

    constructor(db, mergeActions) {
        this.db = db;
        this.mergeActions = mergeActions;
    }

    async applyClientAction(action) {
        const stateId = action.stateId;
        const lastSequenceNumber = await this.db.getLastSequenceNumber(stateId);
        const nextSequenceNumber = lastSequenceNumber + 1;

        const invalidSequenceNumber = action.sequenceNumber < 0 || action.sequenceNumber > nextSequenceNumber;
        if (invalidSequenceNumber) {
            throw new Error('Invalid sequence number %d', action.sequenceNumber);
        }

        const serverActions = await Promise.all(_.range(action.sequenceNumber, nextSequenceNumber)
                .map((sequenceNumber) => this.db.getActionBySequenceNumber(sequenceNumber, stateId)));

        const actionToSave = serverActions
            .reduce((transformedAction, serverAction) => {
                const mergedActions = this.mergeActions(transformedAction, serverAction.action);
                return mergedActions[1];
            }, action.action);

        await this.db.saveAction({
            sequenceNumber: nextSequenceNumber,
            clientId: action.clientId,
            stateId: stateId,
            action: actionToSave
        });
    }

}
