import {SET_STREAM_INITIAL_STATE} from 'redux-live/lib/shared/constants/ActionTypes'
import {UPDATE_INVENTORY} from '../../shared/constants/ActionTypes'

export function products(state = {}, action) {
    switch (action.type) {
        case SET_STREAM_INITIAL_STATE:
            if (action.reduxLive.streamId.topic === 'products') {
                return Object.assign({}, state, {[action.reduxLive.streamId.id]: action.state})
            } else {
                return state
            }
        case UPDATE_INVENTORY:
            const productId = action.productId;
            return {...state, [productId]: product(state[productId], action)};
        default:
            return state
    }
}

export function product(state={inventory: 0}, action) {
    switch (action.type) {
        case UPDATE_INVENTORY:
            return Object.assign({}, state, {...state, inventory: action.inventory});
        default:
            return state
    }
}
