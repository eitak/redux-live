import { createStore, applyMiddleware } from 'redux'
import socketioClient from 'socket.io-client'

import createSaveActionMiddleware from '../shared/save-action-middleware'
import { SAVE_ACTION } from '../shared/events'

export default (initialState, reducer, actions) => {

    const socket = socketioClient();

    const saveActionMiddleware = createSaveActionMiddleware(actions, action => {
        socket.emit(SAVE_ACTION, action);
    });
    const createStoreWithMiddleware = applyMiddleware(saveActionMiddleware)(createStore);

    const store = createStoreWithMiddleware(reducer, initialState);

    const stateId = store.getState().stateId;
    socket.on(stateId, action => {
        store.dispatch(action);
    });

    return store;

}
