import { EventEmitter } from 'events'

const NEW_ACTION_EVENT = 'new-action';

class LocalDb {

    constructor() {
        this._eventEmitter = new EventEmitter();
        this._actions = {};
        this._snapshots = {};
    }

    deleteStream(streamId) {
        delete this._actions[streamId];
        delete this._snapshots[streamId];
    }

    createStream(streamId, initialState={}) {
        const existingSnapshot = this._snapshots[streamId];
        if (existingSnapshot) {
            Promise.reject(`State already exists for state ID ${streamId}`);
            return;
        }

        this._actions[streamId] = {};
        this._snapshots[streamId] = {
            ...initialState,
            reduxLive: {
                sequenceNumber: 0,
                streamId: streamId
            }
        };

        return Promise.resolve()
    }

    getSnapshot(streamId) {
        const snapshot = this._snapshots[streamId];
        if (!snapshot) {
            return Promise.reject(`No state for stream ID ${streamId}`);
        }

        return Promise.resolve(snapshot);
    }

    async clearOldActions(streamId, recordsToKeep=10) {
        const snapshot = await this.getSnapshot(streamId);
        let sequenceNumber = snapshot.reduxLive.sequenceNumber - recordsToKeep + 1; // keep last 10 actions
        while (this._actions[streamId] && this._actions[streamId][sequenceNumber]) {
            delete this._actions[streamId][sequenceNumber];
            sequenceNumber = sequenceNumber - 1;
        }
    }

    async saveSnapshot(snapshot) {
        const streamId = snapshot.reduxLive.streamId;
        const previousSnapshot = await this.getSnapshot(streamId);
        if (previousSnapshot.reduxLive.sequenceNumber !== snapshot.reduxLive.sequenceNumber - 1) {
            console.warn('Ignoring request to save snapshot, as it has unexpected sequence number' +
                ' %j', snapshot);
            return;
        }
        this._snapshots[streamId] = snapshot;
    }

    async getAction(streamId, sequenceNumber) {
        const actionsForState = this._actions[streamId];
        if (!actionsForState) {
            throw new Error(`Could not find action with sequence number ${sequenceNumber} and stream ID ${streamId}`);
        }

        const snapshot = await this.getSnapshot(streamId);
        if (snapshot.reduxLive.sequenceNumber < sequenceNumber) {
            throw new Error(`Could not find action with sequence number ${sequenceNumber} and stream ID ${streamId}`);
        }

        return actionsForState[sequenceNumber];
    }

    saveAction(action) {
        const streamId = action.reduxLive.streamId;
        if (!this._actions[streamId]) {
            Promise.reject(`No state found for stream ID ${streamId}`);
        }

        if (this._actions[streamId].length !== action.reduxLive.sequenceNumber) {
            Promise.reject(`Invalid sequence number for stream ID ${streamId}`);
        }

        this._actions[streamId][action.reduxLive.sequenceNumber] = action;
        this._eventEmitter.emit(NEW_ACTION_EVENT, action);
        return Promise.resolve();
    }

    onNewAction(cb) {
        this._eventEmitter.on(NEW_ACTION_EVENT, cb)
    }

}

export default LocalDb;
