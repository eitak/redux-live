export class ClientActionManager {

    constructor(sendActionToServer, sendActionToClient, mergeActions, lastSequenceNumber, clientId, stateId) {
        this.sendActionToServer = sendActionToServer;
        this.sendActionToClient = sendActionToClient;
        this.clientActionsToSave = [];
        this.mergeActions = mergeActions;
        this.lastSequenceNumber = lastSequenceNumber;
        this.clientId = clientId;
        this.stateId = stateId;
    }

    async applyClientAction(action) {
        this.clientActionsToSave.push(action);

        if (this.clientActionsToSave.length === 1) {
            await this._sendNextActionToServer();
        }

        console.log('Sending action to client: %j', action);
        await this.sendActionToClient(action);
    }

    async applyServerAction(action) {
        const validStateId = action.stateId === this.stateId;
        if (!validStateId) {
            console.error('Received action with invalid state ID (expected %s): %j', this.stateId, action);
            return;
        }

        const expectedSequenceNumber = this.lastSequenceNumber + 1;
        const invalidSequenceNumber = action.sequenceNumber !== expectedSequenceNumber;
        if (invalidSequenceNumber) {
            console.error('Received action with invalid sequence number (expected %d): %j', expectedSequenceNumber, action);
            return;
        }

        this.lastSequenceNumber = action.sequenceNumber;

        const isKnownAction = this.clientId === action.clientId;
        if (isKnownAction) {
            console.log('Received confirmation that our action saved: %j', action.action);
            this.clientActionsToSave.shift();
            await this._sendNextActionToServer();
            return;
        }

        console.log('Received new action from the server: %j', action);

        const transformedActions = this.clientActionsToSave
            .reduce((transformedActions, nextAction) => {
                const actionToMergeWith = transformedActions.serverAction;
                const mergedActions = this.mergeActions(nextAction, actionToMergeWith);
                transformedActions.clientActions.push(mergedActions[1]);
                transformedActions.serverAction = mergedActions[0];
                return transformedActions;
            }, {clientActions: [], serverAction: action.action});

        await this.sendActionToClient(transformedActions.serverAction);
        this.clientActionsToSave = transformedActions.clientActions;
    }

    async _sendNextActionToServer() {
        if (this.clientActionsToSave.length > 0) {
            const actionToSave = {
                action: this.clientActionsToSave[0],
                sequenceNumber: this.lastSequenceNumber + 1,
                clientId: this.clientId,
                stateId: this.stateId
            };
            console.log('Sending action to server: %j', actionToSave);
            await this.sendActionToServer(actionToSave);
        }
    }

}
