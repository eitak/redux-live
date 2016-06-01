import _ from 'lodash'

import {SET_STREAM_INITIAL_STATE} from 'redux-live/lib/shared/constants/ActionTypes'
import {ADD_TO_CART, REMOVE_FROM_CART} from '../../shared/constants/ActionTypes'

export default function cart(state = {addedProducts: {}}, action) {
    switch (action.type) {
        case SET_STREAM_INITIAL_STATE:
            if (action.reduxLive.streamId.topic === 'carts') {
                return action.state
            } else {
                return state
            }
        case ADD_TO_CART:
            return addToCart(action.productId, state);
        case REMOVE_FROM_CART:
            return removeFromCart(action.productId, state);
        default:
            return state
    }
}

function addToCart(productId, state) {
    const newCount = (state.addedProducts[productId] || {quantity: 0}).quantity + 1;
    return {
        ...state,
        addedProducts: Object.assign({}, state.addedProducts, {[productId]: {quantity: newCount}})
    }
}

function removeFromCart(productId, state) {
    const newCount = Math.max((state.addedProducts[productId] || {quantity: 0}).quantity - 1, 0);
    if (newCount === 0) {
        return {...state, addedProducts: _.omit(state.addedProducts, productId)}
    } else {
        return {...state, addedProducts: Object.assign({}, state.addedProducts, {[productId]: {quantity: newCount}})}
    }
}
