import ClientActionManager from './client-action-manager'
import { EventEmitter } from 'events'

async function initializeClient(repository, createStore, mergeActions) {

    const initialState = await repository.getInitialState();
    const clientId = await repository.getClientId();
    const sequenceNumber = await repository.getSequenceNumber();

    const newClientActionEventEmitter = new EventEmitter();
    const store = createStore(initialState, (action) => newClientActionEventEmitter.emit('new-action', action));

    const actionManager = new ClientActionManager(repository.saveAction.bind(repository),
        store.dispatch.bind(store), mergeActions, sequenceNumber, clientId);

    repository.onNewActionFromServer(actionManager.applyServerAction.bind(actionManager));
    console.log(actionManager);
    newClientActionEventEmitter.on('new-action', actionManager.applyClientAction.bind(actionManager));

    return store;
}

export default initializeClient;
