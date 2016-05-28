import React, {Component, PropTypes} from 'react'
import {connect} from 'react-redux'
import {addToCart} from '../actions'
import ProductItem from '../components/ProductItem'
import ProductsList from '../components/ProductsList'

class ProductsContainer extends Component {
    render() {
        const { products } = this.props;
        return (
            <ProductsList title="Products">
                {products.map(product =>
                    <ProductItem
                        key={product.id}
                        product={product}
                        onAddToCartClicked={() => this.props.addToCart(product.id, this.props.cartId)}/>
                )}
            </ProductsList>
        )
    }
}

ProductsContainer.propTypes = {
    products: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        price: PropTypes.number.isRequired,
        inventory: PropTypes.number.isRequired
    })).isRequired,
    addToCart: PropTypes.func.isRequired,
    cartId: PropTypes.number.isRequired
};

function mapStateToProps(state) {
    return {
        products: Object.keys(state.products).map(id => {return {...state.products[id], id}}),
        cartId: state.cart.id
    }
}

export default connect(
    mapStateToProps,
    {addToCart}
)(ProductsContainer)
