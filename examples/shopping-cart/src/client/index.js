import React from 'react'
import {render} from 'react-dom'
import {createStore, applyMiddleware, combineReducers} from 'redux'
import {Provider} from 'react-redux'

import SocketIoServerCommunicator from 'redux-live/lib/client/server-communicator/SocketIoServerCommunicator'
import {createReduxLiveMiddleware, reduxLiveReducer} from 'redux-live/lib/client'

import App from './containers/App'
import {cart, products} from '../shared/reducers'
import subscribeProductsMiddleware from './middleware/subscribeProductsMiddleware'

require("babel-polyfill");

const serverCommunicator = new SocketIoServerCommunicator();
const reduxLiveMiddleware = createReduxLiveMiddleware(serverCommunicator);

serverCommunicator.onConnect(() => {
    const cartId = serverCommunicator.socket.id;
    const initialState = {
        cart: {
            id: cartId,
            addedProducts: {}
        },
        reduxLive: {
            streams: [{
                streamId: {
                    topic: 'carts',
                    id: cartId
                }
            }, {
                streamId: {
                    topic: 'all-products'
                }
            }]
        }
    };

    const reducer = combineReducers({cart, products, reduxLive: reduxLiveReducer});
    const middleware = applyMiddleware(reduxLiveMiddleware, subscribeProductsMiddleware, logger);
    const store = createStore(reducer, initialState, middleware);
    function renderApp() {
        render(
            <Provider store={store}>
                <App />
            </Provider>,
            document.getElementById('root')
        );
    }

    renderApp();
    store.subscribe(renderApp);
});


function logger({getState}) {
    return (next) => (action) => {
        console.log('Will dispatch', action);
        let returnValue = next(action);
        console.log('State after dispatch', getState());
        return returnValue
    }
}
