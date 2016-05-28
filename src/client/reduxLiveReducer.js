import _ from 'lodash'

import {CONFIRM_ACTION, UNSUBSCRIBE_TO_STREAM} from './constants/ActionTypes'
import {SET_STREAM_INITIAL_STATE} from '../shared/constants/ActionTypes'

function reduxLiveReducer(state = {streams: []}, action) {
    switch (action.type) {
        case CONFIRM_ACTION:
            const newStreams = state.streams.map(stream => {
                if (_.isEqual(stream.streamId, action.streamId)) {
                    return {
                        ...stream,
                        sequenceNumber: stream.sequenceNumber + 1,
                        pendingActions: _.drop(stream.pendingActions)
                    }
                } else {
                    return stream
                }
            });
            return {
                ...state,
                streams: newStreams
            };
        case SET_STREAM_INITIAL_STATE:
            const newStream = {
                streamId: action.reduxLive.streamId,
                sequenceNumber: action.reduxLive.sequenceNumber,
                pendingActions: []
            };
            return {
                ...state,
                streams: state.streams.filter(stream => !_.isEqual(stream.streamId, action.reduxLive.streamId)).concat(newStream),
            };
        case UNSUBSCRIBE_TO_STREAM:
            return {
                ...state,
                streams: state.streams.filter(stream => {
                    return !_.isEqual(stream.streamId, action.streamId)
                })
            };
        default:
            if (!action.reduxLive) {
                return state
            } else if (action.reduxLive.sequenceNumber) {
                return applyServerAction(action, state)
            } else {
                return applyClientAction(action, state)
            }
    }
}

function applyServerAction(action, state) {
    const streams = state.streams.map(stream => {
        if (_.isEqual(stream.streamId, action.reduxLive.streamId)) {
            return {
                ...stream,
                sequenceNumber: action.reduxLive.sequenceNumber,
                pendingActions: action.reduxLive.pendingActions
            }
        } else {
            return stream
        }
    });
    return {
        ...state,
        streams: streams
    }
}

function applyClientAction(action, state) {
    const streams = state.streams.map(stream => {
        if (_.isEqual(stream.streamId, action.reduxLive.streamId)) {
            return {
                ...stream,
                pendingActions: stream.pendingActions.concat(_.omit(action, 'reduxLive'))
            }
        } else {
            return stream
        }
    });
    return {
        ...state,
        streams: streams
    }
}

export default reduxLiveReducer
