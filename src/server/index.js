import createSaveActionFunction from './save-action'
import {serverDefaults} from '../shared/defaults'

const SERVER_CLIENT_ID = 'SERVER';

function initializeServer(opts) {
    const { dbClass, client, mergeActions, reducer, isActionValid, initialState } = {...serverDefaults, ...opts};
    const db = new dbClass({...initialState, clientId: SERVER_CLIENT_ID});
    function reducerWithClientId(state, action) {
        return {...reducer(state, action), clientId: SERVER_CLIENT_ID};
    }

    const saveAction = createSaveActionFunction({ db, mergeActions, reducer: reducerWithClientId, isActionValid });

    db.onNewAction(client.emitAction.bind(client));
    client.onSaveActionRequest(saveAction);
    client.onNewClient(async ({stateId, clientId, sendInitialData}) => {
        try {
            const snapshot = await db.getSnapshot(stateId);
            sendInitialData({sequenceNumber: snapshot.sequenceNumber, clientId: clientId, state: snapshot.state});
        } catch (e) {
            console.error('Could not get initial data for state ID %s', stateId, e);
        }
    });
    return {saveAction, db};
}

export default initializeServer;
