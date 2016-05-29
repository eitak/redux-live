import React, {Component, PropTypes} from 'react'
import {connect} from 'react-redux'

import Cart from '../components/Cart'
import {checkout} from '../actions'

class CartContainer extends Component {
    render() {
        const {products, total} = this.props;

        return (
            <Cart
                products={products}
                total={total}
                onCheckoutClicked={() => this.props.checkout(this.props.cartId)}/>
        )
    }
}

CartContainer.propTypes = {
    products: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        price: PropTypes.number.isRequired,
        quantity: PropTypes.number.isRequired
    })).isRequired,
    total: PropTypes.string.isRequired,
    checkout: PropTypes.func.isRequired,
    cartId: PropTypes.string.isRequired
};

function getProductsInCart(state) {
    return Object.keys(state.cart.addedProducts)
        .filter(productId => state.products[productId])
        .map(productId => {
            return {
                ...state.products[productId],
                id: productId,
                quantity: state.cart.addedProducts[productId].quantity
            }
        });
}

function getTotal(state) {
    return getProductsInCart(state)
        .reduce((total, product) => total + (product.price * product.quantity), 0)
        .toFixed(2)
}

const mapStateToProps = (state) => {
    return {
        products: getProductsInCart(state),
        cartId: state.cart.id,
        total: getTotal(state)
    }
};

export default connect(
    mapStateToProps,
    {checkout}
)(CartContainer)
