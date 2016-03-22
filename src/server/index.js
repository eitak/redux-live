import createSaveActionFunction from './save-action'

const SERVER_CLIENT_ID = 'SERVER';

function initializeServer({ dbClass, client, mergeActions, reducer, isActionValid, initialState }) {
    const db = new dbClass({...initialState, clientId: SERVER_CLIENT_ID});
    function reducerWithClientId(state, action) {
        return {...reducer(state, action), clientId: SERVER_CLIENT_ID};
    }

    const saveAction = createSaveActionFunction({ db, mergeActions, reducer: reducerWithClientId, isActionValid });

    db.onNewAction(client.emitAction.bind(client));
    client.onSaveActionRequest(saveAction);
    client.onNewClient(async ({stateId, clientId, sendInitialData}) => {
        const snapshot = await db.getSnapshot(stateId);
        sendInitialData({sequenceNumber: snapshot.sequenceNumber, clientId: clientId, state: snapshot.state});
    });
    return {saveAction, db};
}

export default initializeServer;
