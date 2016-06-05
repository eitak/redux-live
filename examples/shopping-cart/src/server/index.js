import express from 'express'
import http from 'http'
import path from 'path'
import _ from 'lodash'
import {createStore, applyMiddleware} from 'redux'
import uuid from 'node-uuid'

import LocalDb from 'redux-live-localdb'
import ClientCommunicator from 'redux-live-socketio/ClientCommunicator'
import {ReduxLiveServer} from 'redux-live/server'
import {ReduxLiveActionTypes} from 'redux-live/shared'

import {cart, product} from '../shared/reducers/index'
import createCart from './createCart'

require("babel-polyfill");

const app = express();
const server = http.Server(app);

/**
 * Static files
 */
app.use(express.static(__dirname + '/../../build/client'));

/**
 * Error handling
 */
app.use((err, req, res, next) => {
    console.trace(err);
    console.error(err);
    res.status(err.status || 500);
    res.send({
        message: err.message,
        error: err
    });
});

/**
 * Routes
 */
app.get('/', (req, res) => {
    res.sendFile(path.resolve('views/index.html'))
});

/**
 * Redux Live initialisation
 */
const productIds = ['product-1', 'product-2', 'product-3'];

const db = new LocalDb();
db.createStream({topic: 'all-products'}, {productIds: productIds});
db.createStream({topic: 'products', id: 'product-1'}, {"title": "iPad 4 Mini", "price": 500.01, "inventory": 2});
db.createStream({topic: 'products', id: 'product-2'}, {"title": "H&M T-Shirt White", "price": 10.99, "inventory": 10});
db.createStream({topic: 'products', id: 'product-3'}, {
    "title": "Charli XCX - Sucker CD",
    "price": 19.99,
    "inventory": 5
});

const clientCommunicator = new ClientCommunicator(server, streamId => streamId.topic + '/' + streamId.id);

const reduxLiveServer = new ReduxLiveServer({
    getReducer: streamId => {
        if (streamId.topic === 'products') return product;
        if (streamId.topic === 'carts') return cart;
        return _.identity
    }, db, clientCommunicator
});

clientCommunicator.onNewClient(clientId => {
    const cartId = uuid.v4();
    createCart(reduxLiveServer, cartId);
    clientCommunicator.sendActionToClient(clientId, {
        type: ReduxLiveActionTypes.SUBSCRIBE_TO_STREAM,
        streamId: {
            topic: 'carts',
            id: cartId
        }
    })
});

/**
 * Start app
 */
const port = process.env.PORT || '3000';
server.listen(port, () => {
    console.log(`shopping cart app listening on port ${port}`);
    reduxLiveServer.start();
});
