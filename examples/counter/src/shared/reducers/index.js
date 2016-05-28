import {SET_STREAM_INITIAL_STATE} from 'redux-live/lib/shared/constants/ActionTypes'

export default function counter(state = {value: 0}, action) {
    switch (action.type) {
        case 'INCREMENT':
            return {...state, value: state.value + 1};
        case 'DECREMENT':
            return {...state, value: state.value - 1};
        case SET_STREAM_INITIAL_STATE:
            return {...state, value: action.state.value};
        default:
            return state
    }
}
