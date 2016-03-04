import {ServerActionManager} from '../../src/server/server'

describe('ServerActionManager', () => {

    var underTest, actionsSaved;

    const actions = [
        { stateId: 'test-state-id', sequenceNumber: 1, action: 'action1' },
        { stateId: 'test-state-id', sequenceNumber: 2, action: 'action2', parent: 'action1-id' },
        { stateId: 'test-state-id', sequenceNumber: 3, action: 'action3', parent: 'action2-id' }
    ];
    const clientId = 'test-client';

    beforeEach(() => {
        actionsSaved = [];
        underTest = new ServerActionManager(
            (sequenceNumber) => Promise.resolve(actions[sequenceNumber - 1]),
            () => Promise.resolve(3),
            (action) => { actionsSaved.push(action); return Promise.resolve() },
            (a1, a2) => [`(${a1}-${a2})`, `(${a1}x${a2})`]);
    });

    it('should reject actions with parent not saved on the server', async function() {
        try {
            await underTest.applyClientAction({
                stateId: 'test-state-id',
                sequenceNumber: 5,
                action: 'action4',
                clientId: clientId
            });
            should.fail('no error was thrown when it should have been');
        } catch (err) {
            // expected
        }

        actionsSaved.should.be.empty();
    });

    it('should save actions where the parent is the last saved action', async function() {
        const actionToSave = {
            stateId: 'test-state-id',
            sequenceNumber: 4,
            action: 'action4',
            clientId: clientId
        };
        await underTest.applyClientAction(actionToSave);

        actionsSaved.should.have.length(1);
        actionsSaved[0].should.eql(actionToSave);
    });

    it('should save actions where the parent is not the last saved action', async function() {
        const actionToSave = {
            stateId: 'test-state-id',
            sequenceNumber: 2,
            action: 'action4',
            clientId: clientId
        };
        await underTest.applyClientAction(actionToSave);

        actionsSaved.should.have.length(1);
        actionsSaved[0].should.eql({
            stateId: 'test-state-id',
            sequenceNumber: 4,
            action: '((action4xaction2)xaction3)',
            clientId: clientId
        });
    });

    it('should retry saving actions when the state changes in between retrieving actions and attempting save', () => {

    });

});
