class LocalDb {

    const actions = {};

    getActionBySequenceNumber(sequenceNumber, stateId) {
        const actionsForState = this.actions[stateId];
        if (!actionsForState) {
            return Promise.reject();
        }

        if (actionsForState.length < sequenceNumber) {
            return Promise.reject();
        }

        return Promise.resolve(actionsForState[sequenceNumber - 1]);
    }

    getLastSequenceNumber(stateId) {
        const actionsForState = this.actions[stateId];
        if (!actionsForState || actionsForState.length === 0) {
            return Promise.resolve(-1);
        }

        return Promise.resolve(actionsForState.length);
    }

    saveAction(action) {
        const stateId = action.stateId;
        if (!this.actions[stateId]) {
            this.actions[stateId] = [];
        }

        this.actions[stateId].push(action);
        return Promise.resolve();
    }
}
