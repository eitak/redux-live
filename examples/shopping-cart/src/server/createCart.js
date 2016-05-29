import {ADD_TO_CART, UPDATE_INVENTORY, REMOVE_FROM_CART, CHECKOUT_REQUEST, CHECKOUT_SUCCESS} from '../shared/constants/ActionTypes'

function createCart(reduxLiveServer, id) {
    reduxLiveServer.db.createStream({topic: 'carts', id: id}, {addedProducts: {}, id: id});
    reduxLiveServer.db.onNewActionFromStream({topic: 'carts', id: id}, async action => {
        if (action.type === ADD_TO_CART) {
            await updateInventory(reduxLiveServer, action)
        }
        if (action.type === CHECKOUT_REQUEST) {
            await reduxLiveServer.saveAction({
                type: CHECKOUT_SUCCESS,
                reduxLive: {
                    ...action.reduxLive,
                    sequenceNumber: action.reduxLive.sequenceNumber + 1
                }
            });
            createCart(reduxLiveServer)
        }
    });

    return id;
}

async function updateInventory(reduxLiveServer, action) {
    const productId = action.productId;
    const streamId = {
        topic: 'products',
        id: productId
    };

    const snapshot = await reduxLiveServer.db.getSnapshot(streamId);
    const currentInventory = snapshot.inventory;
    if (currentInventory === 0) {
        await reduxLiveServer.saveAction({
            type: REMOVE_FROM_CART,
            productId: productId,
            reduxLive: {
                ...action.reduxLive,
                sequenceNumber: action.reduxLive.sequenceNumber + 1
            }
        });
        return
    }

    try {
        await reduxLiveServer.saveAction({
            type: UPDATE_INVENTORY,
            inventory: currentInventory - 1,
            productId: productId,
            reduxLive: {
                sequenceNumber: snapshot.reduxLive.sequenceNumber + 1,
                streamId: {
                    topic: 'products',
                    id: productId
                }
            }
        })
    } catch (err) {
        console.error('Failed to update inventory', err);
        await reduxLiveServer.saveAction({
            type: REMOVE_FROM_CART,
            productId: productId,
            reduxLive: {
                ...action.reduxLive,
                sequenceNumber: action.reduxLive.sequenceNumber + 1
            }
        })
    }

}

export default createCart;
