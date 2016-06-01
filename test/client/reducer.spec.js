import {createStore} from 'redux'

import reduxLiveReducer from '../../src/client/reduxLiveReducer'
import {SET_STREAM_INITIAL_STATE, CONFIRM_ACTION, UNSUBSCRIBE_TO_STREAM} from '../../src/shared/constants/ActionTypes'

require('should');

describe('reduxLiveReducer', () => {

    const initialState = {
        streams: [{
            streamId: 'stream1',
            sequenceNumber: 3,
            pendingActions: [{type: 'ACTION_1'}]
        }]
    };

    let store;

    beforeEach(() => {
        store = createStore(reduxLiveReducer, initialState);
    });

    it('should set stream initial state', () => {
        // when
        store.dispatch({type: SET_STREAM_INITIAL_STATE, reduxLive: {streamId: 'stream2', sequenceNumber: 4}});

        // then
        const result = store.getState();

        result.streams.should.have.length(2);

        const newStream = result.streams[1];
        newStream.should.eql({
            streamId: 'stream2',
            sequenceNumber: 4,
            pendingActions: []
        })
    });

    it('should unsubscribe a stream', () => {
        // when
        store.dispatch({type: UNSUBSCRIBE_TO_STREAM, streamId: 'stream1'});

        // then
        const result = store.getState();

        result.streams.should.be.empty()
    });

    it('should apply client action', () => {
        // when
        store.dispatch({type: 'ACTION_2', reduxLive: {streamId: 'stream1'}});

        // then
        const result = store.getState();

        result.streams.should.have.length(1);

        result.streams[0].should.eql({
            streamId: 'stream1',
            sequenceNumber: 3,
            pendingActions: [{type: 'ACTION_1'}, {type: 'ACTION_2'}]
        })
    });

    it('should not apply irrelevant actions', () => {
        // when
        store.dispatch({type: 'TEST_ACTION', reduxLive: {streamId: 'irrelevant-stream'}});

        // then
        const result = store.getState();

        result.streams.should.have.length(1);

        result.streams[0].should.eql({
            streamId: 'stream1',
            sequenceNumber: 3,
            pendingActions: [{type: 'ACTION_1'}]
        })
    });

    it('should apply server action', () => {
        // when
        store.dispatch({type: 'TEST_ACTION', reduxLive: {
            streamId: 'stream1',
            sequenceNumber: 4,
            pendingActions: [{type: 'ACTION_1_TRANSFORMED'}]
        }});

        // then
        const result = store.getState();

        result.streams.should.have.length(1);

        result.streams[0].should.eql({
            streamId: 'stream1',
            sequenceNumber: 4,
            pendingActions: [{type: 'ACTION_1_TRANSFORMED'}]
        })
    });

    it('should confirm client action', () => {
        // when
        store.dispatch({type: CONFIRM_ACTION, streamId: 'stream1'});

        // then
        const result = store.getState();

        result.streams.should.have.length(1);
        result.streams[0].should.eql({
            streamId: 'stream1',
            sequenceNumber: 4,
            pendingActions: []
        })
    })

});
