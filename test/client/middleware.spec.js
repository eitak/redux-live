import {createStore, applyMiddleware} from 'redux'

import createReduxLiveMiddleware from '../../src/client/createReduxLiveMiddleware'
import {CONFIRM_ACTION, UNSUBSCRIBE_TO_STREAM, SUBSCRIBE_TO_STREAM} from '../../src/client/constants/ActionTypes'

require('should');

const reduxInitialAction = {type: '@@redux/INIT'};

describe('createReduxLiveMiddleware', () => {

    const reducer = (state = {actions: []}, action) => {
        return {...state, actions: state.actions.concat(action)}
    };

    let underTest, savedActions, sendNewServerAction, confirmAction, subscribedStreams;

    beforeEach(() => {
        subscribedStreams = [];
        savedActions = [];
        underTest = createReduxLiveMiddleware({
                subscribeStream: streamId => subscribedStreams.push(streamId),
                unsubscribeStream: streamId => {
                    const index = subscribedStreams.indexOf(streamId);
                    subscribedStreams.splice(index, 1);
                },
                saveActionOnServer: action => savedActions.push(action),
                onNewActionFromServer: cb => sendNewServerAction = cb,
                onConfirmAction: cb => confirmAction = cb
            },
            (a1, a2) => [{type: `(${a1.type}-${a2.type})`}, {type: `(${a1.type}x${a2.type})`}]
        );
    });

    it('should not save irrelevant actions to server', () => {
        // before
        const store = createStore(reducer, getState(), applyMiddleware(underTest));
        const action = {type: 'TEST_TYPE', reduxLive: {streamId: 'irrelevant-stream'}};

        // when
        store.dispatch(action);

        // then
        savedActions.should.be.empty();
        store.getState().actions.should.eql([reduxInitialAction, action])
    });

    it('should save relevant actions to server', () => {
        // before
        const store = createStore(reducer, getState(), applyMiddleware(underTest));
        const action = {type: 'TEST_TYPE', reduxLive: {streamId: 'test-stream'}};

        // when
        store.dispatch(action);

        // then
        savedActions.should.eql([{type: 'TEST_TYPE', reduxLive: {streamId: 'test-stream', sequenceNumber: 4}}]);
        store.getState().actions.should.eql([reduxInitialAction, action])
    });

    it('should not save action if there are pending actions', () => {
        // before
        const store = createStore(reducer, getState({type: 'PENDING_ACTION'}), applyMiddleware(underTest));
        const action = {type: 'TEST_TYPE', reduxLive: {streamId: 'test-stream'}};

        // when
        store.dispatch(action);

        // then
        savedActions.should.be.empty();
        store.getState().actions.should.eql([reduxInitialAction, action])
    });

    it('should send next action after confirmation', () => {
        // before
        const state = getState({type: 'PENDING_ACTION1'}, {type: 'PENDING_ACTION2'});
        const store = createStore(reducer, state, applyMiddleware(underTest));

        // when
        confirmAction('test-stream');

        // then
        savedActions.should.eql([{
            type: 'PENDING_ACTION2', reduxLive: {
                streamId: 'test-stream',
                sequenceNumber: 5
            }
        }]);
        store.getState().actions.should.eql([reduxInitialAction, {type: CONFIRM_ACTION, streamId: 'test-stream'}])
    });

    it('should send server actions to client', () => {
        // before
        const store = createStore(reducer, getState(), applyMiddleware(underTest));
        const serverAction = {type: 'SERVER_ACTION', reduxLive: {streamId: 'test-stream', sequenceNumber: 4}};

        // when
        sendNewServerAction(serverAction);

        // then
        store.getState().actions.should.eql([reduxInitialAction, {
            type: 'SERVER_ACTION', reduxLive: {
                streamId: 'test-stream',
                sequenceNumber: 4,
                pendingActions: []
            }
        }])
    });

    it('should send transformed server action to client when there are pending actions', () => {
        // before
        const store = createStore(reducer, getState({type: 'CLIENT'}), applyMiddleware(underTest));
        const serverAction = {type: 'SERVER', reduxLive: {streamId: 'test-stream', sequenceNumber: 4}};

        // when
        sendNewServerAction(serverAction);

        // then
        store.getState().actions.should.eql([reduxInitialAction, {
            type: '(CLIENT-SERVER)',
            reduxLive: {
                streamId: 'test-stream',
                sequenceNumber: 4,
                pendingActions: [{type: '(CLIENTxSERVER)'}]
            }
        }])
    });

    it('should subscribe to a stream', () => {
        // before
        const store = createStore(reducer, getState(), applyMiddleware(underTest));
        const action = {type: SUBSCRIBE_TO_STREAM, streamId: 'new-stream'};

        // when
        store.dispatch(action);

        // then
        subscribedStreams.should.eql(['test-stream', 'new-stream'])
    });

    it('should unsubscribe from a stream', () => {
        // before
        const store = createStore(reducer, getState(), applyMiddleware(underTest));
        const action = {type: UNSUBSCRIBE_TO_STREAM, streamId: 'test-stream'};

        // when
        store.dispatch(action);

        // then
        subscribedStreams.should.be.empty()
    });

    it('should handle incorrect sequence numbers from server', () => {
        // TODO
    });

});

function getState(...pendingActions) {
    return {
        actions: [],
        reduxLive: {
            streams: [{
                streamId: 'test-stream',
                sequenceNumber: 3,
                pendingActions: pendingActions
            }]
        }
    }
}
