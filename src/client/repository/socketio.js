import io from 'socket.io-client'
import SocketIoEvents  from '../../shared/events'

class SocketIo {

    constructor(stateId) {
        this.socket = io();
        this.stateId = stateId;
        this._initialDataPromise = new Promise((resolve) => {
            this.socket.emit(SocketIoEvents.INIT, stateId, resolve);
        });
    }

    saveAction(saveActionRequest) {
        this.socket.emit(SocketIoEvents.SAVE_ACTION, saveActionRequest);
        return Promise.resolve();
    }

    async getClientId() {
        const initialData = await this._initialDataPromise;
        return initialData.clientId;
    }

    async getSequenceNumber() {
        const initialData = await this._initialDataPromise;
        return initialData.sequenceNumber;
    }

    async getInitialState() {
        const initialData = await this._initialDataPromise;
        return initialData.state;
    }

    onNewActionFromServer(cb) {
        this.socket.on(this.stateId, cb);
    }

}

export default SocketIo;

