import {ReduxLiveActionTypes} from 'redux-live/shared'

const subscribeProductsMiddleware = store => next => action => {
    const containsProducts = action.type === ReduxLiveActionTypes.SET_STREAM_INITIAL_STATE
        && action.reduxLive.streamId.topic === 'all-products';
    if (containsProducts) {
        action.state.productIds.forEach(productId => {
            const subscribeToProductAction = {
                type: ReduxLiveActionTypes.SUBSCRIBE_TO_STREAM,
                streamId: {topic: 'products', id: productId}
            };
            store.dispatch(subscribeToProductAction)
        })
    }

    next(action)
};

export default subscribeProductsMiddleware;
