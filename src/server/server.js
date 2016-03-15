import _ from 'lodash'

class ServerActionManager {

    constructor(db, client, mergeActions) {
        this.db = db;
        this.mergeActions = mergeActions;
        this.db.onNewAction(client.emitAction.bind(client));
        client.onSaveActionRequest(this.saveAction.bind(this));
    }

    async saveAction(stateId, action) {
        const lastSequenceNumber = await this.db.getLastSequenceNumber(stateId);
        const nextSequenceNumber = lastSequenceNumber + 1;

        const invalidSequenceNumber = action.sequenceNumber < 0 || action.sequenceNumber > nextSequenceNumber;
        if (invalidSequenceNumber) {
            console.error('Invalid sequence number %d', action.sequenceNumber);
            throw new Error('Invalid sequence number %d', action.sequenceNumber);
        }

        const serverActions = await Promise.all(_.range(action.sequenceNumber, nextSequenceNumber)
                .map((sequenceNumber) => this.db.getActionBySequenceNumber(stateId, sequenceNumber)));

        const actionToSave = serverActions
            .reduce((transformedAction, serverAction) => {
                const mergedActions = this.mergeActions(transformedAction, serverAction.action);
                return mergedActions[1];
            }, action.action);

        console.log('Saving for stateId: %s, clientId: %s, sequenceNumber: %s, action: %j',
            stateId, action.clientId, nextSequenceNumber, actionToSave);
        await this.db.saveAction(stateId, {
            sequenceNumber: nextSequenceNumber,
            clientId: action.clientId,
            action: actionToSave
        });
    }

}

export default ServerActionManager
