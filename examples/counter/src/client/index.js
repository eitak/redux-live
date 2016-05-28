import React from 'react'
import {render} from 'react-dom'
import {Provider} from 'react-redux'
import {createStore, applyMiddleware, combineReducers} from 'redux'

import SocketIoServerCommunicator from 'redux-live/lib/client/server-communicator/SocketIoServerCommunicator'
import {createReduxLiveMiddleware, reduxLiveReducer} from 'redux-live/lib/client'

import Counter from './components/Counter'
import counter from '../shared/reducers/index'

require("babel-polyfill");

const serverCommunicator = new SocketIoServerCommunicator();
const reduxLiveMiddleware = createReduxLiveMiddleware(serverCommunicator);

const initialState = {
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
