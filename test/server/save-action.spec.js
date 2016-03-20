import createSaveActionFunction from '../../src/server/save-action'

describe('saveAction', () => {

    let actionsSaved, snapshotsSaved;

    const actions = [
        {sequenceNumber: 1, action: {type: 'action1'}},
        {sequenceNumber: 2, action: {type: 'action2'}},
        {sequenceNumber: 3, action: {type: 'action3'}}
    ];
    const clientId = 'test-client';
    const stateId = 'test-state';

    const underTest = createSaveActionFunction({
            getActionBySequenceNumber: (stateId, sequenceNumber) => Promise.resolve(actions[sequenceNumber - 1]),
            saveAction: (stateId, action) => {
                actionsSaved.push(action);
                return Promise.resolve()
            },
            getSnapshot: stateId => {
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
        }, (a1, a2) => [{type: `(${a1.type}-${a2.type})`}, {type: `(${a1.type}x${a2.type})`}],
        (state, action) => {
            {
                return {
                    actions: state.actions.concat(action)
                }
            }
        });

    beforeEach(() => {
        actionsSaved = [];
        snapshotsSaved = [];
    });

    it('should reject actions with parent not saved on the server', async function () {
        const actionToSave = {
            sequenceNumber: 5,
            action: {type: 'action4'},
            clientId: clientId
        };
        try {
            await underTest(stateId, actionToSave);
            should.fail('no error was thrown when it should have been');
        } catch (err) {
            // expected
        }

        actionsSaved.should.be.empty();
    });

    it('should save actions where the parent is the last saved action', async function () {
        const actionToSave = {
            sequenceNumber: 4,
            action: {type: 'action4'},
            clientId: clientId
        };
        await underTest(stateId, actionToSave);

        actionsSaved.should.have.length(1);
        actionsSaved[0].should.eql(actionToSave);

        snapshotsSaved.should.have.length(1);
        snapshotsSaved[0].should.eql({
            sequenceNumber: 4,
            state: {
                actions: [{type: '@@redux/INIT'}, {type: 'action4'}]
            }
        });
    });

    it('should save actions where the parent is not the last saved action', async function () {
        const actionToSave = {
            sequenceNumber: 2,
            action: {type: 'action4'},
            clientId: clientId
        };
        await underTest(stateId, actionToSave);

        actionsSaved.should.have.length(1);
        actionsSaved[0].should.eql({
            sequenceNumber: 4,
            action: {type: '((action4xaction2)xaction3)'},
            clientId: clientId
        });

        snapshotsSaved.should.have.length(1);
        snapshotsSaved[0].should.eql({
            sequenceNumber: 4,
            state: {
                actions: [{type: '@@redux/INIT'}, {type: '((action4xaction2)xaction3)'}]
            }
        })
    });

    it('should retry saving actions when the state changes in between retrieving actions and attempting save', () => {

    });

});
