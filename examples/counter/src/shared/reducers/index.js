export default function counter(state, action) {
  switch (action.type) {
    case 'INCREMENT':
      return {...state, value: state.value + 1};
    case 'DECREMENT':
      return {...state, value: state.value - 1};
    default:
      return state
  }
}
