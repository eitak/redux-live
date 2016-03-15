import { EventEmitter } from 'events'
import Events from './../events'

const NEW_ACTION_EVENT = 'new-action';

class LocalDb {

    constructor() {
        this._eventEmitter = new EventEmitter();
        this._actions = {};
        this._snapshots = {};
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

    // should always be consistent
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

    // should always be consistent
    getLastSequenceNumber(stateId) {
        const actionsForState = this._actions[stateId];
        if (!actionsForState || actionsForState.length === 0) {
            return Promise.resolve(0);
        }

        return Promise.resolve(actionsForState.length);
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
