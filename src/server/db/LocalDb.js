import {EventEmitter} from 'events'
import _ from 'lodash'
import hash from 'object-hash'

const NEW_ACTION_EVENT = 'new-action';

class LocalDb {

    constructor() {
        this._eventEmitter = new EventEmitter();
        this._actions = {};
        this._snapshots = {};
    }

    deleteStream(streamId) {
        const streamIdKey = hash(streamId);
        delete this._actions[streamIdKey];
        delete this._snapshots[streamIdKey];
    }

    createStream(streamId, initialState={}) {
        const streamIdKey = hash(streamId);

        const existingSnapshot = this._snapshots[streamIdKey];
        if (existingSnapshot) {
            Promise.reject(`State already exists for state ID ${streamId}`);
            return;
        }

        this._actions[streamIdKey] = {};
        this._snapshots[streamIdKey] = {
            ...initialState,
            reduxLive: {
                sequenceNumber: 0,
                streamId: streamId
            }
        };

        return Promise.resolve()
    }

    getSnapshot(streamId) {
        const streamIdKey = hash(streamId);
        const snapshot = this._snapshots[streamIdKey];
        if (!snapshot) {
            return Promise.reject(`No state for stream ID ${streamId}`);
        }

        return Promise.resolve(snapshot);
    }

    async clearOldActions(streamId, recordsToKeep=10) {
        const snapshot = await this.getSnapshot(streamId);
        let sequenceNumber = snapshot.reduxLive.sequenceNumber - recordsToKeep + 1; // keep last 10 actions

        const streamIdKey = hash(streamId);
        while (this._actions[streamIdKey] && this._actions[streamIdKey][sequenceNumber]) {
            delete this._actions[streamIdKey][sequenceNumber];
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

        const streamIdKey = hash(streamId);
        this._snapshots[streamIdKey] = snapshot;
    }

    async getAction(streamId, sequenceNumber) {
        const streamIdKey = hash(streamId);
        const actionsForState = this._actions[streamIdKey];
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
        const streamIdKey = hash(streamId);
        if (!this._actions[streamIdKey]) {
            Promise.reject(`No state found for stream ID ${streamId}`);
        }

        if (this._actions[streamIdKey].length !== action.reduxLive.sequenceNumber) {
            Promise.reject(`Invalid sequence number for stream ID ${streamId}`);
        }

        this._actions[streamIdKey][action.reduxLive.sequenceNumber] = action;
        this._eventEmitter.emit(NEW_ACTION_EVENT + streamIdKey, action);
        this._eventEmitter.emit(NEW_ACTION_EVENT, action);
        return Promise.resolve();
    }

    onNewAction(cb) {
        this._eventEmitter.on(NEW_ACTION_EVENT, action => {
            cb(action)
        })
    }

    onNewActionFromStream(streamId, cb) {
        this._eventEmitter.on(NEW_ACTION_EVENT + hash(streamId), action => {
            cb(action)
        })
    }

}

export default LocalDb;
