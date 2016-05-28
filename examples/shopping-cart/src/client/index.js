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

const initialState = {
    cart: {
        id: 1,
        addedProducts: {}
    },
    reduxLive: {
        streams: [{
            streamId: {
                topic: 'carts',
                id: 1
            }
        }, {
            streamId: {
                topic: 'all-products'
            }
        }]
    }
};

function logger({getState}) {
    return (next) => (action) => {
        console.log('Will dispatch', action);
        let returnValue = next(action);
        console.log('State after dispatch', getState());
        return returnValue
    }
}

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
