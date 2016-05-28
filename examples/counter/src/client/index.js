import React from 'react'
import { render } from 'react-dom'
import {createStore, applyMiddleware, combineReducers} from 'redux'
import SocketIoServerCommunicator from 'redux-live/lib/client/server-communicator/SocketIoServerCommunicator'
import client from 'redux-live/lib/client'
import {createReduxLiveMiddleware, reduxLiveReducer} from 'redux-live/lib/client'

import Counter from './components/Counter'
import counter from '../shared/reducers/index'

import SocketIoEvents from '../shared/socket-io-events'

const serverCommunicator = new SocketIoServerCommunicator();
const reduxLiveMiddleware = createReduxLiveMiddleware(serverCommunicator);

require("babel-polyfill");

const initialState = {
    counter: {value: 0},
    reduxLive: {
        streams: [{
            streamId: 'counter'
        }]
    }
};

function logger({ getState }) {
    return (next) => (action) => {
        console.log('Will dispatch', action);
        let returnValue = next(action);
        console.log('State after dispatch', getState());
        return returnValue
    }
}

const store = createStore(combineReducers({counter, reduxLive: reduxLiveReducer}), initialState, applyMiddleware(reduxLiveMiddleware, logger));
function renderCounter() {
    render(
        <Counter
            value={store.getState().counter.value}
            onIncrement={() => store.dispatch({ type: 'INCREMENT', reduxLive: {streamId: 'counter'} })}
            onDecrement={() => store.dispatch({ type: 'DECREMENT', reduxLive: {streamId: 'counter'} })}
        />,
        document.getElementById('root')
    );
}

renderCounter();
store.subscribe(renderCounter);
