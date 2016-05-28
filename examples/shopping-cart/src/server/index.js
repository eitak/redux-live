import express from 'express'
import http from 'http'
import path from 'path'
import _ from 'lodash'
import socketIo from 'socket.io'
import {createStore, applyMiddleware} from 'redux'

import LocalDb from 'redux-live/lib/server/db/LocalDb'
import SocketIoClientCommunicator from 'redux-live/lib/server/client-communicator/SocketIoClientCommunicator'
import ReduxLiveServer from 'redux-live/lib/server'

import {cart, product} from '../shared/reducers/index'
import {ADD_TO_CART, UPDATE_INVENTORY, REMOVE_FROM_CART} from '../shared/constants/ActionTypes'

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
db.createStream({topic: 'carts', id: 1}, {addedProducts: {}, id: 1});
db.createStream({topic: 'all-products'}, {productIds: productIds});
db.createStream({topic: 'products', id: 'product-1'}, {"title": "iPad 4 Mini", "price": 500.01, "inventory": 2});
db.createStream({topic: 'products', id: 'product-2'}, {"title": "H&M T-Shirt White", "price": 10.99, "inventory": 10});
db.createStream({topic: 'products', id: 'product-3'}, {
    "title": "Charli XCX - Sucker CD",
    "price": 19.99,
    "inventory": 5
});

const clientCommunicator = new SocketIoClientCommunicator(server);

const reduxLiveServer = new ReduxLiveServer({
    getReducer: streamId => {
        if (streamId.topic === 'products') return product;
        if (streamId.topic === 'carts') return cart;
        return _.identity
    }, db, clientCommunicator
});


db.onNewAction({topic: 'carts', id: 1}, async action => {
    if (action.type === ADD_TO_CART) {
        const productId = action.productId;
        const streamId = {
            topic: 'products',
            id: productId
        };

        const snapshot = await db.getSnapshot(streamId);
        const currentInventory = snapshot.inventory;
        if (currentInventory === 0) {
            await reduxLiveServer.saveAction({
                type: REMOVE_FROM_CART,
                productId: productId,
                reduxLive: {
                    ...action.reduxLive,
                    sequenceNumber: action.reduxLive.sequenceNumber + 1
                }
            });
            return
        }


        try {
            await reduxLiveServer.saveAction({
                type: UPDATE_INVENTORY,
                inventory: currentInventory - 1,
                productId: productId,
                reduxLive: {
                    sequenceNumber: snapshot.reduxLive.sequenceNumber + 1,
                    streamId: {
                        topic: 'products',
                        id: productId
                    }
                }
            })
        } catch (err) {
            console.error('Failed to update inventory', err);
            await reduxLiveServer.saveAction({
                type: REMOVE_FROM_CART,
                productId: productId,
                reduxLive: {
                    ...action.reduxLive,
                    sequenceNumber: action.reduxLive.sequenceNumber + 1
                }
            })
        }
    }
});

/**
 * Start app
 */
const port = process.env.PORT || '3000';
server.listen(port, () => {
    console.log(`shopping cart app listening on port ${port}`);
    reduxLiveServer.start();
});
