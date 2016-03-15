import { EventEmitter } from 'events'
import ClientActionManager from '../../src/client/client'

require("babel-polyfill");
require('should');

describe('ClientActionManager', () => {

    var underTest, actionsSentToServer, actionsSentToClient;
    const serverEventEmitter = new EventEmitter();

    const action1 = 'action1';
    const action2 = 'action2';
    const action3 = 'action3';
    const action4 = 'action4';
    const action5 = 'action5';

    const clientId = 'test-client';
    const stateId = 'test-state';

    beforeEach(() => {
        actionsSentToClient = [];
        actionsSentToServer = [];
        underTest = new ClientActionManager({
                sendActionToServer: (action) => {
                    actionsSentToServer.push(action);
                    return Promise.resolve()
                },
                getClientId: () => {
                    return Promise.resolve(clientId)
                },
                getSequenceNumber: () => {
                    return Promise.resolve(1)
                },
                onNewActionFromServer: (cb) => { serverEventEmitter.on('new-action', cb) },
            },
            (action) => { actionsSentToClient.push(action); return Promise.resolve() },
            (a1, a2) => [`(${a1}-${a2})`, `(${a1}x${a2})`],
            stateId);
    });

    it('should apply client actions and send request to server', async function () {
        await underTest.applyClientAction(action1);

        actionsSentToClient.should.have.length(1);
        actionsSentToClient[0].should.eql(action1);

        actionsSentToServer.should.have.length(1);
        actionsSentToServer[0].action.should.eql(action1);
        actionsSentToServer[0].sequenceNumber.should.eql(2);
    });

    it('should apply actions received from the server', async function () {
        await underTest.applyServerAction({action: action1, sequenceNumber: 2, stateId: stateId});

        actionsSentToClient.should.have.length(1);
        actionsSentToClient[0].should.eql(action1);

        actionsSentToServer.should.be.empty();
    });

    it('should set the sequence number as the last server sequence number + 1', async function () {
        await underTest.applyServerAction({action: action1, sequenceNumber: 2, stateId: stateId});

        await underTest.applyClientAction(action2);

        actionsSentToClient.should.have.length(2);
        actionsSentToClient[0].should.eql(action1);
        actionsSentToClient[1].should.eql(action2);

        actionsSentToServer.should.have.length(1);
        actionsSentToServer[0].action.should.eql(action2);
        actionsSentToServer[0].sequenceNumber.should.eql(3);
    });

    it('should ignore server actions which were initiated by this client', async function () {
        await underTest.applyServerAction({action: action1, sequenceNumber: 2, clientId: clientId, stateId: stateId});

        actionsSentToServer.should.have.length(0);
        actionsSentToClient.should.have.length(0);
    });

    it('should ignore server actions which have the same sequence number as the last one', async function () {
        await underTest.applyServerAction({action: action1, sequenceNumber: 1, stateId: stateId});

        actionsSentToServer.should.have.length(0);
        actionsSentToClient.should.have.length(0);
    });

    it('should apply transformed action to client', async function () {
        await underTest.applyClientAction(action1);
        await underTest.applyServerAction({action: action2, sequenceNumber: 2, stateId: stateId});

        actionsSentToServer.should.have.length(1);
        actionsSentToServer[0].action.should.eql(action1);
        actionsSentToServer[0].sequenceNumber.should.eql(2);

        actionsSentToClient.should.have.length(2);
        actionsSentToClient[0].should.eql(action1);
        actionsSentToClient[1].should.eql('(action1-action2)');
    });

    it('should handle a more complex transformation', async function () {
        await underTest.applyClientAction(action1);
        await underTest.applyClientAction(action2);
        await underTest.applyServerAction({sequenceNumber: 2, action: action3, stateId: stateId});
        await underTest.applyClientAction(action5);
        await underTest.applyServerAction({sequenceNumber: 3, action: action4, stateId: stateId});

        actionsSentToClient.should.have.length(5);
        actionsSentToClient[0].should.eql(action1);
        actionsSentToClient[1].should.eql(action2);
        actionsSentToClient[2].should.eql('(action2-(action1-action3))');
        actionsSentToClient[3].should.eql(action5);
        actionsSentToClient[4].should.eql('(action5-((action2x(action1-action3))-((action1xaction3)-action4)))');
    })

});
