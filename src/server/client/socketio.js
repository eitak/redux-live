import socketio from 'socket.io'
import SocketIoEvents  from '../../shared/events'
import Events from './../events'
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

        this.io.on('connection', socket => {
            socket.on(SocketIoEvents.INIT, async (stateId, cb) => {
                const clientId = uuid.v4();
                const snapshot = await opts.getSnapshot(stateId);
                cb({sequenceNumber: snapshot.sequenceNumber, clientId: clientId, state: snapshot.state});

                socket.on(SocketIoEvents.SAVE_ACTION, (requestedStateId, action) => {
                    console.log('Received action from client %s for stateId: %s; action: %j', clientId, requestedStateId, action);
                    if (stateId !== requestedStateId) {
                        console.error('Received bad state from client - got: %s, expected %s', requestedStateId, stateId);
                    }
                    const actionWithClientId = Object.assign({}, action, {clientId: clientId});
                    this._eventEmitter.emit(SAVE_ACTION_EVENT, stateId, actionWithClientId)
                });

            });
        });

    }

    emitAction(stateId, action) {
        console.log('Emitting action for state %s: %j', stateId, action);
        this.io.emit(stateId, action);
    }

    onSaveActionRequest(cb) {
        this._eventEmitter.on(SAVE_ACTION_EVENT, (stateId, action) => {
            console.log('Got save action request for state %s, action %j', stateId, action);
            cb(stateId, action);
        })
    }

}

export default SocketIoClient;
