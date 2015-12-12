import { SAVE_ACTION } from '../shared/events'
import socketio from 'socket.io'

export default (server, dbChangeEmitter, saveAction) => {

    const io = socketio(server);

    dbChangeEmitter.on('new-action', action => {
        io.emit(action.stateId, action);
    });

    io.on('connection', socket => {
        socket.on(SAVE_ACTION, saveAction);
    });

}
