import uuid from 'node-uuid'

export class ClientActionManager {

    constructor(sendActionToServer, sendActionToClient, mergeActions, lastSequenceNumber, clientId, stateId) {
        this.sendActionToServer = sendActionToServer;
        this.sendActionToClient = sendActionToClient;
        this.clientActionsToSave = [];
        this.mergeActions = mergeActions;
        this.lastSequenceNumber = lastSequenceNumber;
        this.clientId = clientId;
    }

    applyClientAction(action) {
        const actionToSave = {
            action: action,
            clientId: this.clientId
        };

        this.clientActionsToSave.push(actionToSave);

        if (this.clientActionsToSave.length === 1) {
            this._sendNextActionToServer();
        }

        console.log('Sending action to client: %j', action);
        this.sendActionToClient(action);
    }

    _sendNextActionToServer() {
        if (this.clientActionsToSave.length > 0) {
            var actionToSave = Object.assign({}, this.clientActionsToSave[0], {
                sequenceNumber: this.lastSequenceNumber + 1,
                stateId: this.stateId
            });
            console.log('Sending action to server: %j', actionToSave);
            this.sendActionToServer(actionToSave);
        }
    }

    applyServerAction(action) {
        const expectedSequenceNumber = this.lastSequenceNumber + 1;
        var invalidSequenceNumber = action.sequenceNumber !== expectedSequenceNumber;
        if (invalidSequenceNumber) {
            console.error('Received action with invalid sequence number (expected %d): %j', expectedSequenceNumber, action);
            return;
        }

        this.lastSequenceNumber = action.sequenceNumber;

        const isKnownAction = this.clientId === action.clientId;
        if (isKnownAction) {
            console.log('Received confirmation that our action saved: %j', action.action);
            this.clientActionsToSave.shift();
            this._sendNextActionToServer();
            return;
        }

        console.log('Received new action from the server: %j', action);

        const transformedActions = this.clientActionsToSave
            .reduce((transformedActions, nextAction) => {
                const actionToMergeWith = transformedActions.serverAction;
                const mergedActions = this.mergeActions(nextAction.action, actionToMergeWith.action);
                transformedActions.clientActions.push(Object.assign({}, actionToMergeWith, {action: mergedActions[1]}));
                transformedActions.serverAction = Object.assign({}, nextAction, {action: mergedActions[0]});
                return transformedActions;
            }, {clientActions: [], serverAction: action});

        const transformedServerAction = transformedActions.serverAction;
        this.sendActionToClient(transformedServerAction.action);
        this.clientActionsToSave = transformedActions.clientActions;
    }

}
