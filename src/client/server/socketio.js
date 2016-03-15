import io from 'socket.io-client'
import SocketIoEvents  from '../../shared/events'

class SocketIoServer {

    constructor(stateId) {
        this.socket = io();
        this.stateId = stateId;
        this._initialDataPromise = new Promise((resolve) => {
            this.socket.emit(SocketIoEvents.INIT, stateId, resolve);
        });
    }

    sendActionToServer(action) {
        this.socket.emit(SocketIoEvents.SAVE_ACTION, action);
    }

    async getClientId() {
        const initialData = await this._initialDataPromise;
        return initialData.clientId;
    }

    async getSequenceNumber() {
        const initialData = await this._initialDataPromise;
        return initialData.sequenceNumber;
    }

    onNewActionFromServer(cb) {
        this.socket.on(this.stateId, cb);
    }

}

export default SocketIoServer;

