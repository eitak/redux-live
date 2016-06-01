import {SET_STREAM_INITIAL_STATE, SUBSCRIBE_TO_STREAM} from 'redux-live/lib/shared/constants/ActionTypes'

const subscribeProductsMiddleware = store => next => action => {
    const containsProducts = action.type === SET_STREAM_INITIAL_STATE
        && action.reduxLive.streamId.topic === 'all-products';
    if (containsProducts) {
        action.state.productIds.forEach(productId => {
            const subscribeToProductAction = {type: SUBSCRIBE_TO_STREAM, streamId: {topic: 'products', id: productId}};
            store.dispatch(subscribeToProductAction)
        })
    }

    next(action)
};

export default subscribeProductsMiddleware;
