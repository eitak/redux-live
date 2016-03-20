import socketio from 'socket.io'
import SocketIoEvents  from '../../shared/events'
import { EventEmitter } from 'events'
import uuid from 'node-uuid'

const SAVE_ACTION_EVENT = 'save-action';

class SocketIoClient {

    constructor(db, opts) {
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
                const snapshot = await db.getSnapshot(stateId);
                cb({sequenceNumber: snapshot.sequenceNumber, clientId: clientId, state: snapshot.state});

                socket.on(SocketIoEvents.SAVE_ACTION, (request) => {
                    console.log('Received save action request from client %s for stateId: %s; action: %j',
                        clientId, stateId, request);

                    const requestWithClientId = Object.assign({}, request, {clientId: clientId});
                    this._eventEmitter.emit(SAVE_ACTION_EVENT, stateId, requestWithClientId)
                });

            });
        });

    }

    emitAction(stateId, actionSavedEvent) {
        console.log('Emitting action saved event for state %s: %j', stateId, actionSavedEvent);
        this.io.emit(stateId, actionSavedEvent);
    }

    onSaveActionRequest(cb) {
        this._eventEmitter.on(SAVE_ACTION_EVENT, (stateId, request) => {
            cb(stateId, request.clientId, request.sequenceNumber, request.action);
        })
    }

}

export default SocketIoClient;
