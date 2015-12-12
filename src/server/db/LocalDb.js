import shortId from 'shortId'
import util from 'util'
import { EventEmitter } from 'events'

class LocalDb {

    constructor(initialState) {
        this.initialState = Object.assign({}, initialState, {sequenceNumber: 0, items: []});
        this.actions = {};
        this.states = {};
        this.states['4131LD3El'] = Object.assign({}, this.initialState, {stateId: '4131LD3El'});
        this.actions['4131LD3El'] = [];
        this.eventEmitter = new EventEmitter();
    }

    createNewStateId() {
        var stateId = shortId.generate();
        while (this.states[stateId]) {
            stateId = shortId.generate();
        }
        this.states[stateId] = Object.assign({}, this.initialState, {stateId: stateId});
        this.actions[stateId] = [];

        return Promise.resolve(stateId);
    }

    getState(stateId) {
        return Promise.resolve(this.states[stateId])
    }

    saveState(state) {
        this.states[state.stateId] = state;
        return Promise.resolve();
    }

    getActions(stateId) {
        return Promise.resolve(this.actions[stateId]);
    }

    saveAction(action) {
        const stateId = action.stateId;
        this.actions[stateId] = this.actions[stateId].concat(action);
        this.eventEmitter.emit('new-action', action);
        return Promise.resolve();
    }

}

export default LocalDb;
