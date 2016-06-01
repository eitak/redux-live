import io from 'socket.io-client'
import {EventEmitter} from 'events'

import {SAVE_ACTION, UNSUBSCRIBE_TO_STREAM, SUBSCRIBE_TO_STREAM, NEW_ACTION} from '../../shared/constants/SocketIoEvents'
import {defaultGetSocketIoRoom} from '../../shared/Defaults'

class SocketIoServerCommunicator {

    constructor(namespace) {
        this.socket = io(namespace);
        this.socket.on('connect', () => {
            this._newActionEventEmitter.emit('CONNECT')
        });

        this._newActionEventEmitter = new EventEmitter();

        this.socket.on(NEW_ACTION, action => {
            if (action.reduxLive && action.reduxLive.clientId === this.socket.id) {
                this._newActionEventEmitter.emit('CONFIRM', action.reduxLive.streamId)
            } else {
                this._newActionEventEmitter.emit('NEW_ACTION', action)
            }
        });
    }

    subscribeStream(streamId) {
        this.socket.emit(SUBSCRIBE_TO_STREAM, streamId)
    }

    unsubscribeStream(streamId) {
        this.socket.emit(UNSUBSCRIBE_TO_STREAM, streamId)
    }

    saveActionOnServer(action) {
        this.socket.emit(SAVE_ACTION, action)
    }

    onConnect(cb) {
        this._newActionEventEmitter.on('CONNECT', cb)
    }

    onNewActionFromServer(cb) {
        this._newActionEventEmitter.on('NEW_ACTION', cb)
    }

    onConfirmAction(cb) {
        this._newActionEventEmitter.on('CONFIRM', cb)
    }

}

export default SocketIoServerCommunicator
