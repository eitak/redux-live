import LocalDb from '../server/db/local-db'

const sharedDefaults = {
    mergeActions: (action1, action2) => [action2, action1],
    isActionValid: () => true
};

export const serverDefaults = {...sharedDefaults,
    dbClass: LocalDb
};

export const clientDefaults = {...sharedDefaults};
