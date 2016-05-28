import {CHECKOUT_REQUEST, ADD_TO_CART} from '../../shared/constants/ActionTypes'

export function checkout(cartId) {
    return {
        type: CHECKOUT_REQUEST,
        reduxLive: {
            streamId: {
                topic: 'carts',
                id: cartId
            }
        }
    }
}

export function addToCart(productId, cartId) {
    return {
        type: ADD_TO_CART,
        productId,
        reduxLive: {
            streamId: {
                topic: 'carts',
                id: cartId
            }
        }
    }
}
