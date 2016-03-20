import createSaveActionFunction from './save-action'

function initializeServer({ db, client, mergeActions, reducer, isActionValid }) {
    const saveAction = createSaveActionFunction({ db, mergeActions, reducer, isActionValid });
    db.onNewAction(client.emitAction.bind(client));
    client.onSaveActionRequest(saveAction);
    return saveAction;
}

export default initializeServer;
