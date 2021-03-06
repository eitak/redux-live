import LocalDb from 'redux-live-localdb'
import ReduxLiveServer from '../../../src/lib/server/ReduxLiveServer'

import {SET_STREAM_INITIAL_STATE} from '../../../src/lib/shared/constants/ActionTypes'

require("babel-polyfill");
require('should');

describe('ReduxLiveServer', () => {

    let underTest, db, actionsSentToClients, sendActionFromClient, registerNewSubscription, registerNewClient, actionsSentToSpecificClients;

    beforeEach(() => {
        db = new LocalDb();
        actionsSentToClients = [];
        actionsSentToSpecificClients = [];

        underTest = new ReduxLiveServer({
            reducer: (state = {actions: []}, action) => {
                if (action.type === '@@redux/INIT') {
                    return state
                } else {
                    return {...state, actions: state.actions.concat(action)}
                }
            },
            mergeActions: (a1, a2) => [{type: `(${a1.type}-${a2.type})`}, {type: `(${a1.type}x${a2.type})`}],
            isActionValid: (action) => action.type !== 'INVALID_ACTION',
            db: db,
            clientCommunicator: {
                sendAction: (action) => actionsSentToClients.push(action),
                sendActionToClient: (clientId, action) => {
                    if (!actionsSentToSpecificClients[clientId]) {
                        actionsSentToSpecificClients[clientId] =  []
                    }
                    actionsSentToSpecificClients[clientId].push(action)
                },
                onNewAction: cb => sendActionFromClient = cb,
                onNewSubscription: cb => registerNewSubscription = cb,
                onNewClient: cb => registerNewClient = cb
            }
        });

        db.createStream('test-stream', {actions: []})
    });

    describe('start', () => {

        it('should save actions from clients after starting', async () => {
            // before
            const action = {type: 'ACTION_1', reduxLive: {streamId: 'test-stream', sequenceNumber: 1}};

            // when
            await underTest.start();
            await sendActionFromClient(action);

            // then
            const savedAction = await db.getAction('test-stream', 1);
            savedAction.reduxLive.sequenceNumber.should.eql(1);
            savedAction.reduxLive.streamId.should.eql('test-stream');
            savedAction.type.should.eql('ACTION_1');

            const snapshot = await db.getSnapshot('test-stream');
            snapshot.reduxLive.sequenceNumber.should.eql(1);
            snapshot.actions.should.eql([savedAction]);
        });

        it('should send new actions to clients after starting', async () => {
            // before
            const action = {type: 'TEST_ACTION', reduxLive: {streamId: 'test-stream', sequenceNumber: 1}};

            // when
            await underTest.start();
            await registerNewSubscription('test-client', 'test-stream');
            await db.saveAction(action);

            // then
            actionsSentToClients.should.eql([action])
        });

        it('should send initial state to new clients after starting', async () => {
            // when
            await underTest.start();
            await registerNewSubscription('test-client', 'test-stream');

            // then
            actionsSentToSpecificClients['test-client'].should.eql([{
                type: SET_STREAM_INITIAL_STATE,
                state: {
                    actions: []
                },
                reduxLive: {
                    streamId: 'test-stream',
                    sequenceNumber: 0
                }
            }])
        })

    });

    describe('saveAction', () => {

        it('should reject actions with parent not saved on the server', async () => {
            // when
            await underTest.saveAction({type: 'ACTION_TYPE', reduxLive: {streamId: 'test-stream', sequenceNumber: 3}});

            // then
            const snapshot = await db.getSnapshot('test-stream');
            snapshot.reduxLive.sequenceNumber.should.eql(0);
            snapshot.actions.should.eql([])
        });

        it('should reject actions which are invalid', async (done) => {
            // when
            await underTest.saveAction({
                type: 'INVALID_ACTION',
                reduxLive: {streamId: 'test-stream', sequenceNumber: 1}
            });

            // then
            const snapshot = await db.getSnapshot('test-stream');
            snapshot.reduxLive.sequenceNumber.should.eql(0);
            snapshot.actions.should.eql([]);

            try {
                await db.getAction('test-stream', 1);
                done(new Error('Expected no action for sequence number 1'))
            } catch (err) {
                done()
            }
        });

        it('should save actions where the parent is the last saved action', async () => {
            // before
            const action = {type: 'ACTION_1', reduxLive: {streamId: 'test-stream', sequenceNumber: 1}};

            // when
            await underTest.saveAction(action);

            // then
            const savedAction = await db.getAction('test-stream', 1);
            savedAction.reduxLive.sequenceNumber.should.eql(1);
            savedAction.reduxLive.streamId.should.eql('test-stream');
            savedAction.type.should.eql('ACTION_1');

            const snapshot = await db.getSnapshot('test-stream');
            snapshot.reduxLive.sequenceNumber.should.eql(1);
            snapshot.actions.should.eql([savedAction]);
        });

        it('should save actions where the parent is not the last saved action', async () => {
            // before
            const action1 = {type: 'SERVER', reduxLive: {streamId: 'test-stream', sequenceNumber: 1}};
            const action2 = {type: 'CLIENT', reduxLive: {streamId: 'test-stream', sequenceNumber: 1}};
            await underTest.saveAction(action1); // action already on server beforehand

            // when
            await underTest.saveAction(action2);

            // then
            const savedAction = await db.getAction('test-stream', 2);
            savedAction.reduxLive.sequenceNumber.should.eql(2);
            savedAction.reduxLive.streamId.should.eql('test-stream');
            savedAction.type.should.eql('(CLIENTxSERVER)');

            const snapshot = await db.getSnapshot('test-stream');
            snapshot.reduxLive.sequenceNumber.should.eql(2);
            snapshot.actions.should.have.lengthOf(2);
            snapshot.actions[1].should.eql(savedAction)
        });

        it('should retry saving actions when the state changes in between retrieving actions and attempting save', () => {

        });

    });
});
