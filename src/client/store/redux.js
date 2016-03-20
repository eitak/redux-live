import { createStore, applyMiddleware, compose, combineReducers } from 'redux'

function createReduxStore({ reducer, additionalEnhancer, initialState, saveAction, clientId, isActionValid }) {
    function reducerWithClientId(state, action) {
        return {...reducer(state, action), clientId};
    }

    const saveActionMiddleware = applyMiddleware((store) => {
        return (next) => (action) => {
            const state = store.getState();
            const validAction = action._originatedFromServer || isActionValid(state, action, clientId);
            if (!validAction) {
                console.warn('Rejecting action %j as it is not valid for the current state: %j', action, state);
                return;
            }
            const nextAction = next(action);
            saveAction(nextAction);
            return nextAction;
        }
    });

    const enhancer = additionalEnhancer ? compose(additionalEnhancer, saveActionMiddleware) : saveActionMiddleware;
    return createStore(reducerWithClientId, initialState, enhancer);
}

export default createReduxStore;
