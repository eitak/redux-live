import { createStore, applyMiddleware } from 'redux'
import moment from 'moment'

import SaveActionMiddleware from '../shared/save-action-middleware'
import SocketioConnection from './socketio'
import RestApiRouter from './express-router'

const wrap = fn => (...args) => fn(...args).catch(args[2]);

export default class ReduxLiveServer {

    constructor(server, db, reducer, actions) {
        this.server = server;
        this.db = db;
        this.reducer = reducer;
        this.actions = actions;

        this.saveActionToDb = wrap(async(action, state) => {
            try {
                const actionToSave = Object.assign({}, action, {timestamp: moment().unix()});
                await this.db.saveAction(actionToSave);
                await this.db.saveState(state);
            } catch (e) {
                console.error('Failed to save action', e);
            }
        });
    }

    createSocketioConnection() {
        const saveActionMiddleware = SaveActionMiddleware(this.actions, this.saveActionToDb);
        const createStoreWithMiddleware = applyMiddleware(saveActionMiddleware)(createStore);

        return SocketioConnection(this.server, this.db.eventEmitter, wrap(async action => {
            const state = await this.db.getState(action.stateId);
            const store = createStoreWithMiddleware(this.reducer, state);
            store.dispatch(action);
        }));
    }

    createRestApiRouter() {
        return RestApiRouter(this.saveActionToDb);
    }

}
