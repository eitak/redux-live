import {SET_STREAM_INITIAL_STATE} from 'redux-live/lib/shared/constants/ActionTypes'
import {ADD_TO_CART} from '../../shared/constants/ActionTypes'

export default function cart(state = {addedProducts: {}}, action) {
    switch (action.type) {
        case SET_STREAM_INITIAL_STATE:
            if (action.reduxLive.streamId.topic === 'carts') {
                return action.state
            } else {
                return state
            }
        case ADD_TO_CART:
            const productId = action.productId;
            const newCount = (state.addedProducts[productId] || {quantity: 0}).quantity + 1;
            return {
                ...state,
                addedProducts: Object.assign({}, state.addedProducts, {[productId]: {quantity: newCount}})
            };
        default:
            return state
    }
}
