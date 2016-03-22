import socketio from 'socket.io'
import SocketIoEvents  from '../../shared/events'
import { EventEmitter } from 'events'
import uuid from 'node-uuid'

const SAVE_ACTION_EVENT = 'save-action';

class SocketIoClient {

    constructor(opts) {
        if (opts.server) {
            this.io = socketio(opts.server);
        } else if (opts.socketio) {
            this.io = opts.socketio;
        } else {
            throw new Error('Invalid options in constructor of SocketIoClient. Require one of server or socketio option.')
        }

        this._eventEmitter = new EventEmitter();
    }

    onNewClient(cb) {
        this.io.on('connection', socket => {
            socket.on(SocketIoEvents.INIT, (stateId, sendInitialData) => {
                const clientId = uuid.v4();
                cb({stateId, clientId, sendInitialData});

                socket.on(SocketIoEvents.SAVE_ACTION, (request) => {
                    const requestWithClientId = Object.assign({}, request, {clientId: clientId});
                    this._eventEmitter.emit(SAVE_ACTION_EVENT, stateId, requestWithClientId)
                });

            });
        });
    }

    emitAction(stateId, actionSavedEvent) {
        this.io.emit(stateId, actionSavedEvent);
    }

    onSaveActionRequest(cb) {
        this._eventEmitter.on(SAVE_ACTION_EVENT, (stateId, request) => {
            cb({...request, stateId});
        })
    }

}

export default SocketIoClient;
