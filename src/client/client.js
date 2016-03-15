require("babel-polyfill");

class ClientActionManager {

    constructor(client, sendActionToClient, mergeActions, stateId) {
        this.client = client;
        this.sendActionToClient = sendActionToClient;
        this.clientActionsToSave = [];
        this.mergeActions = mergeActions;
        this.lastSequenceNumberPromise = client.getSequenceNumber();
        client.onNewActionFromServer(this.applyServerAction.bind(this));
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
        const lastSequenceNumber = await this.lastSequenceNumberPromise;
        const expectedSequenceNumber = lastSequenceNumber + 1;
        const invalidSequenceNumber = action.sequenceNumber !== expectedSequenceNumber;
        if (invalidSequenceNumber) {
            console.error('Received action with invalid sequence number (expected %d): %j', expectedSequenceNumber, action);
            return;
        }

        this.lastSequenceNumberPromise = Promise.resolve(action.sequenceNumber);

        const clientId = await this.client.getClientId();
        const isKnownAction = clientId === action.clientId;
        if (isKnownAction) {
            console.log('Received confirmation that our action saved: %j', action);
            this.clientActionsToSave.shift();
            await this._sendNextActionToServer();
            return;
        }

        console.log('Received new action from the server: %j', action);

        const transformedActions = this.clientActionsToSave
            .reduce((transformedActions, clientActionToSave) => {
                const actionToMergeWith = transformedActions.newAction;
                const mergedActions = this.mergeActions(clientActionToSave, actionToMergeWith);
                transformedActions.transformedClientActions.push(mergedActions[1]);
                transformedActions.newAction = mergedActions[0];
                return transformedActions;
            }, {transformedClientActions: [], newAction: action.action});

        await this.sendActionToClient(transformedActions.newAction);
        this.clientActionsToSave = transformedActions.transformedClientActions;
    }

    async _sendNextActionToServer() {
        if (this.clientActionsToSave.length > 0) {
            const clientId = await this.client.getClientId();
            console.log(this.lastSequenceNumberPromise);
            const lastSequenceNumber = await this.lastSequenceNumberPromise;
            console.log(lastSequenceNumber);
            const actionToSave = {
                action: this.clientActionsToSave[0],
                sequenceNumber: lastSequenceNumber + 1,
                clientId: clientId
            };
            console.log('Sending action to server: %j', actionToSave);
            await this.client.sendActionToServer(actionToSave);
        }
    }

}

export default ClientActionManager;
