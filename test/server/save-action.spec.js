import createSaveActionFunction from '../../src/server/save-action'

describe('saveAction', () => {

    let actionsSaved;

    const actions = [
        {sequenceNumber: 1, action: 'action1'},
        {sequenceNumber: 2, action: 'action2'},
        {sequenceNumber: 3, action: 'action3'}
    ];
    const clientId = 'test-client';
    const stateId = 'test-state';

    const underTest = createSaveActionFunction({
        getActionBySequenceNumber: (stateId, sequenceNumber) => Promise.resolve(actions[sequenceNumber - 1]),
        getLastSequenceNumber: () => Promise.resolve(3),
        saveAction: (stateId, action) => {
            actionsSaved.push(action);
            return Promise.resolve()
        },
        onNewAction: (cb) => dbEventEmitter.on('new-action', cb)
    }, (a1, a2) => [`(${a1}-${a2})`, `(${a1}x${a2})`]);

    beforeEach(() => {
        actionsSaved = [];
    });

    it('should reject actions with parent not saved on the server', async function () {
        const actionToSave = {
            sequenceNumber: 5,
            action: 'action4',
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
            action: 'action4',
            clientId: clientId
        };
        await underTest(stateId, actionToSave);

        actionsSaved.should.have.length(1);
        actionsSaved[0].should.eql(actionToSave);
    });

    it('should save actions where the parent is not the last saved action', async function () {
        const actionToSave = {
            sequenceNumber: 2,
            action: 'action4',
            clientId: clientId
        };
        await underTest(stateId, actionToSave);

        actionsSaved.should.have.length(1);
        actionsSaved[0].should.eql({
            sequenceNumber: 4,
            action: '((action4xaction2)xaction3)',
            clientId: clientId
        });
    });

    it('should retry saving actions when the state changes in between retrieving actions and attempting save', () => {

    });

});
