import ClientActionManager from './client-action-manager'
import { EventEmitter } from 'events'
import createStore from './store/redux'
import {clientDefaults} from '../shared/defaults'

const NEW_ACTION_EVENT = 'new-action';

async function initializeClient(opts) {
    const { repository, reducer, additionalEnhancer, mergeActions, isActionValid} = {...clientDefaults, ...opts};
    const initialState = await repository.getInitialState();
    const clientId = await repository.getClientId();
    const sequenceNumber = await repository.getSequenceNumber();

    const newClientActionEventEmitter = new EventEmitter();
    const saveAction = (action) => newClientActionEventEmitter.emit(NEW_ACTION_EVENT, action);
    const store = createStore({
        reducer,
        additionalEnhancer,
        initialState,
        saveAction,
        clientId,
        isActionValid
    });

    const actionManager = new ClientActionManager(repository.saveAction.bind(repository),
        store.dispatch.bind(store), mergeActions, sequenceNumber, clientId);

    repository.onNewActionFromServer(actionManager.applyServerAction.bind(actionManager));
    newClientActionEventEmitter.on(NEW_ACTION_EVENT, actionManager.applyClientAction.bind(actionManager));

    return store;
}

export default initializeClient;
