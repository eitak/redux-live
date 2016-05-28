export const defaultMergeActions = (action1, action2) => [action2, action1];
export const defaultGetSocketIoRoom = streamId => streamId;

export default {
    mergeActions: defaultMergeActions
};
