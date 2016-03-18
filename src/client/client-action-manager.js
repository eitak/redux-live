require("babel-polyfill");

class ClientActionManager {

    constructor(saveAction, dispatchAction, mergeActions, sequenceNumber, clientId) {
        this.saveAction = saveAction;
        this.dispatchAction = dispatchAction;
        this.actionsToSave = [];
        this.mergeActions = mergeActions;
        this.sequenceNumber = sequenceNumber;
        this.clientId = clientId;
    }

    async applyClientAction(action) {
        if (action._originatedFromServer) {
            return;
        }

        this.actionsToSave.push(action);

        if (this.actionsToSave.length === 1) {
            await this._saveAction();
        }
    }

    async applyServerAction(action) {
        const expectedSequenceNumber = this.sequenceNumber + 1;
        const invalidSequenceNumber = action.sequenceNumber !== expectedSequenceNumber;
        if (invalidSequenceNumber) {
            console.error('Received action with invalid sequence number (expected %d): %j', expectedSequenceNumber, action);
            return;
        }

        this.sequenceNumber = action.sequenceNumber;

        const isKnownAction = this.clientId === action.clientId;
        if (isKnownAction) {
            console.log('Received confirmation that our action saved: %j', action);
            this.actionsToSave.shift();
            await this._saveAction();
            return;
        }

        console.log('Received new action from the server: %j', action);

        const transformedActions = this.actionsToSave
            .reduce((transformedActions, clientActionToSave) => {
                const actionToMergeWith = transformedActions.newAction;
                const mergedActions = this.mergeActions(clientActionToSave, actionToMergeWith);
                transformedActions.transformedClientActions.push(mergedActions[1]);
                transformedActions.newAction = mergedActions[0];
                return transformedActions;
            }, {transformedClientActions: [], newAction: action.action});

        await this.dispatchAction(Object.assign({}, transformedActions.newAction, {_originatedFromServer: true}));
        this.actionsToSave = transformedActions.transformedClientActions;
    }

    async _saveAction() {
        if (this.actionsToSave.length > 0) {
            const actionToSave = {
                action: this.actionsToSave[0],
                sequenceNumber: this.sequenceNumber + 1,
                clientId: this.clientId
            };
            console.log('Save action: %j', actionToSave);
            await this.saveAction(actionToSave);
        }
    }

}

export default ClientActionManager;
