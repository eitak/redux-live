import createSaveActionFunction from './save-action'

function initializeServer(db, client, mergeActions) {
    const saveAction = createSaveActionFunction(db, mergeActions);
    db.onNewAction(client.emitAction.bind(client));
    client.onSaveActionRequest(saveAction);
}

export default initializeServer;
