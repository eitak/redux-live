import React from 'react'
import { render } from 'react-dom'

import initializeClient from 'redux-live/lib/client/index'
import SocketIo from 'redux-live/lib/client/repository/socketio'
import createStore from 'redux-live/lib/client/store/redux'

import Counter from './components/Counter'
import sharedOptions from '../shared/redux-live-options'

const socketio = new SocketIo('count');

initializeClient({...sharedOptions, repository: socketio})
    .then((store) => {
        console.log(store.getState());
        function renderCounter() {
            render(
                <Counter
                    value={store.getState().value}
                    onIncrement={() => store.dispatch({ type: 'INCREMENT' })}
                    onDecrement={() => store.dispatch({ type: 'DECREMENT' })}
                />,
                document.getElementById('root')
            );
        }

        renderCounter();
        store.subscribe(renderCounter)
    });
