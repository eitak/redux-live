import { createStore, applyMiddleware, compose } from 'redux'

const createReduxState = (reducer, additionalMiddleware) => (initialState, saveAction) => {
    const saveActionMiddleware = () => {
        return (next) => (action) => {
            const nextAction = next(action);
            saveAction(nextAction);
            return nextAction;
        }
    };
    const middleware = additionalMiddleware ? compose(additionalMiddleware, saveActionMiddleware) : saveActionMiddleware;
    return createStore(reducer, initialState, applyMiddleware(middleware));
};

export default createReduxState;
