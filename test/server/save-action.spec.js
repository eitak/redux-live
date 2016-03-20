import createSaveActionFunction from '../../src/server/save-action'

describe('saveAction', () => {

    let actionsSaved, snapshotsSaved;

    const actions = [
        {sequenceNumber: 1, type: 'action1'},
        {sequenceNumber: 2, type: 'action2'},
        {sequenceNumber: 3, type: 'action3'}
    ];
    const clientId = 'test-client';
    const stateId = 'test-state';

    const db = {
        getActionBySequenceNumber: (stateId, sequenceNumber) => Promise.resolve(actions[sequenceNumber - 1]),
        saveAction: (stateId, action) => {
            actionsSaved.push(action);
            return Promise.resolve()
        },
        getSnapshot: () => {
            return {
                sequenceNumber: 3,
                state: {actions: []}
            }
        },
        saveSnapshot: (stateId, snapshot) => {
            snapshotsSaved.push(snapshot);
            return Promise.resolve()
        },
        onNewAction: (cb) => dbEventEmitter.on('new-action', cb)
    };
    const mergeActions = (a1, a2) => [{type: `(${a1.type}-${a2.type})`}, {type: `(${a1.type}x${a2.type})`}];
    const reducer = (state, action) => { return {actions: state.actions.concat(action.type)} };
    const isActionValid = (state, action) => action.type !== 'invalid-action';
    const underTest = createSaveActionFunction({ db, mergeActions, reducer, isActionValid });

    beforeEach(() => {
        actionsSaved = [];
        snapshotsSaved = [];
    });

    it('should reject actions with parent not saved on the server', async function () {
        const actionToSave = {type: 'action4'};
        try {
            await underTest(stateId, clientId, 5, actionToSave);
            should.fail('no error was thrown when it should have been');
        } catch (err) {
            // expected
        }

        actionsSaved.should.be.empty();
        snapshotsSaved.should.be.empty();
    });

    it('should reject actions which are not valid', async function () {
        const actionToSave = {type: 'invalid-action'};
        try {
            await underTest(stateId, clientId, 3, actionToSave);
            should.fail('no error was thrown when it should have been');
        } catch (err) {
            // expected
        }

        actionsSaved.should.be.empty();
        snapshotsSaved.should.be.empty();
    });


    it('should save actions where the parent is the last saved action', async function () {
        const actionToSave = {type: 'action4'};
        await underTest(stateId, clientId, 4, actionToSave);

        actionsSaved.should.have.length(1);
        actionsSaved[0].should.eql({
            action: actionToSave,
            clientId: clientId,
            sequenceNumber: 4
        });

        snapshotsSaved.should.have.length(1);
        snapshotsSaved[0].should.eql({
            sequenceNumber: 4,
            state: {
                actions: ['@@redux/INIT', 'action4']
            }
        });
    });

    it('should save actions where the parent is not the last saved action', async function () {
        const actionToSave = {type: 'action4'};
        await underTest(stateId, clientId, 2, actionToSave);

        actionsSaved.should.have.length(1);
        actionsSaved[0].should.eql({
            action: {
                type: '((action4xaction2)xaction3)'
            },
            clientId: clientId,
            sequenceNumber: 4
        });

        snapshotsSaved.should.have.length(1);
        snapshotsSaved[0].should.eql({
            sequenceNumber: 4,
            state: {
                actions: ['@@redux/INIT', '((action4xaction2)xaction3)']
            }
        })
    });

    it('should retry saving actions when the state changes in between retrieving actions and attempting save', () => {

    });

});
