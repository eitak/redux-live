import { EventEmitter } from 'events'

const NEW_ACTION_EVENT = 'new-action';

class LocalDb {

    constructor() {
        this._eventEmitter = new EventEmitter();
        this._actions = {};
        this._snapshots = {};
    }

    deleteState(stateId) {
        delete this._actions[stateId];
        delete this._snapshots[stateId];
    }

    getSnapshot(stateId) {
        const snapshot = this._snapshots[stateId];
        if (!snapshot) {
            return Promise.resolve({
                sequenceNumber: 0,
                state: {amount: 0}
            })
        }

        return Promise.resolve({
            sequenceNumber: this._actions[stateId].length,
            state: snapshot
        });
    }

    async saveSnapshot(stateId, snapshot) {
        const previousSnapshot = await this.getSnapshot(stateId);
        if (previousSnapshot.sequenceNumber !== snapshot.sequenceNumber - 1) {
            console.warn('Ignoring request to save snapshot, as it has unexpected sequence number' +
                ' {stateId: %s, snapshot: %j}', stateId, snapshot);
            return;
        }
        this._snapshots[stateId] = snapshot;
    }

    getActionBySequenceNumber(stateId, sequenceNumber) {
        const actionsForState = this._actions[stateId];
        if (!actionsForState) {
            return Promise.reject();
        }

        if (actionsForState.length < sequenceNumber) {
            return Promise.reject();
        }

        return Promise.resolve(actionsForState[sequenceNumber - 1]);
    }

    saveAction(stateId, action) {
        if (!this._actions[stateId]) {
            this._actions[stateId] = [];
            this._snapshots[stateId] = {amount: 0};
        }

        this._actions[stateId].push(action);
        var newAmount = this._snapshots[stateId].amount + action.action.amount;
        this._snapshots[stateId] = {
           amount: newAmount
        };
        this._eventEmitter.emit(NEW_ACTION_EVENT, stateId, action);
        return Promise.resolve();
    }

    onNewAction(cb) {
        this._eventEmitter.on(NEW_ACTION_EVENT, cb)
    }

}

export default LocalDb;
