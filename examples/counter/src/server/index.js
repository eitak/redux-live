import express from 'express'
import http from 'http'
import path from 'path'
import {createStore, applyMiddleware} from 'redux'

import LocalDb from 'redux-live-localdb'
import ClientCommunicator from 'redux-live-socketio/ClientCommunicator'
import {ReduxLiveServer} from 'redux-live/server'

import counter from '../shared/reducers/index'

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
const db = new LocalDb();
db.createStream('counter', {value: 0});
const clientCommunicator = new ClientCommunicator(server);

const reduxLiveServer = new ReduxLiveServer({reducer: counter, db, clientCommunicator});

/**
 * Start app
 */
const port = process.env.PORT || '3000';
server.listen(port, () => {
    console.log(`counter app listening on port ${port}`);
    reduxLiveServer.start();
});
