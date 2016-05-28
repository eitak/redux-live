import socketio from 'socket.io'
import {EventEmitter} from 'events'

import {SAVE_ACTION, SUBSCRIBE_TO_STREAM, UNSUBSCRIBE_TO_STREAM, NEW_ACTION} from '../../shared/constants/SocketIoEvents'
import {defaultGetSocketIoRoom} from '../../shared/Defaults'

class SocketIoClientCommunicator {

    constructor(socketIoOpts, getSocketIoRoom = defaultGetSocketIoRoom) {
        this.io = socketio(socketIoOpts);
        this._eventEmitter = new EventEmitter();
        this._getSocketIoRoom = getSocketIoRoom;

        this.io.on('connection', socket => {
            const clientId = socket.client.id;
            console.log('Connected client: %s', clientId);

            socket.on(SUBSCRIBE_TO_STREAM, streamId => {
                console.log('Client %s subscribed to stream %j', clientId, streamId);
                const room = getSocketIoRoom(streamId);
                socket.join(room);
                this._eventEmitter.emit('NEW_CLIENT', clientId, streamId)
            });

            socket.on(UNSUBSCRIBE_TO_STREAM, streamId => {
                console.log('Client %s unsubscribed to stream %j', clientId, streamId);
                const room = getSocketIoRoom(streamId);
                socket.leave(room)
            });

            socket.on(SAVE_ACTION, action => {
                console.log('Received action from client %s; action: %j', clientId, action);
                const actionWithClientId = {
                    ...action,
                    reduxLive: {
                        ...action.reduxLive,
                        clientId: clientId
                    }
                };
                this._eventEmitter.emit('SAVE_ACTION', actionWithClientId)
            });

        });
    }


    sendActionToClient(clientId, action) {
        console.log('Sending action to client %s : %j', clientId, action);
        this.io.sockets.in(`/#${clientId}`).emit(NEW_ACTION, action);
    }

    onNewClient(cb) {
        this._eventEmitter.on('NEW_CLIENT', cb)
    }

    onNewAction(cb) {
        this._eventEmitter.on('SAVE_ACTION', cb)
    }

    sendAction(action) {
        console.log('Sending action : %j', action);
        this.io.sockets.in(this._getSocketIoRoom(action.reduxLive.streamId)).emit(NEW_ACTION, action);
    }

}

export default SocketIoClientCommunicator
