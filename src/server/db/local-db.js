import { EventEmitter } from 'events'

const NEW_ACTION_EVENT = 'new-action';

class LocalDb {

    constructor(initialState) {
        this._eventEmitter = new EventEmitter();
        this._actions = {};
        this._snapshots = {};
        this.initialState = initialState;
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
                state: this.initialState
            })
        }

        return Promise.resolve(snapshot);
    }

    async clearOldActions(stateId, recordsToKeep=10) {
        const snapshot = await this.getSnapshot(stateId);
        let sequenceNumber = snapshot.sequenceNumber - recordsToKeep + 1; // keep last 10 actions
        while (this._actions[stateId] && this._actions[stateId][sequenceNumber]) {
            delete this._actions[stateId][sequenceNumber];
            sequenceNumber = sequenceNumber - 1;
        }
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

    async getActionBySequenceNumber(stateId, sequenceNumber) {
        const actionsForState = this._actions[stateId];
        if (!actionsForState) {
            throw new Error(`Could not find action with sequence number ${sequenceNumber} and stateId ${stateId}`);
        }

        const snapshot = await this.getSnapshot(stateId);
        if (snapshot.sequenceNumber < sequenceNumber) {
            throw new Error(`Could not find action with sequence number ${sequenceNumber} and stateId ${stateId}`);
        }

        return actionsForState[sequenceNumber];
    }

    saveAction(stateId, actionRecord) {
        if (!this._actions[stateId]) {
            this._actions[stateId] = {};
        }

        this._actions[stateId][actionRecord.sequenceNumber] = actionRecord;
        this._eventEmitter.emit(NEW_ACTION_EVENT, stateId, actionRecord);
        return Promise.resolve();
    }

    onNewAction(cb) {
        this._eventEmitter.on(NEW_ACTION_EVENT, cb)
    }

}

export default LocalDb;
