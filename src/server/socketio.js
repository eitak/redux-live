import { SAVE_ACTION } from '../shared/events'
import socketio from 'socket.io'

export default (server, dbChangeEmitter, createStore) => {

    const io = socketio(server);

    dbChangeEmitter.on('new-action', action => {
        io.emit(action.stateId, action);
    });

    io.on('connection', socket => {
        socket.on(SAVE_ACTION, action => {
            const store = createStore(reducer, db.getState(action.stateId));
            store.dispatch(action);
        });
    });

    return io;

}
