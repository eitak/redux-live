import ClientActionManager from '../../src/client/client-action-manager'

require("babel-polyfill");
require('should');

describe('ClientActionManager', () => {

    var underTest, actionsSentToServer, actionsSentToClient;

    const action1 = { type: 'action1' };
    const action2 = { type: 'action2' };
    const action3 = { type: 'action3' };
    const action4 = { type: 'action4' };
    const action5 = { type: 'action5' };

    const clientId = 'test-client';

    beforeEach(() => {
        actionsSentToClient = [];
        actionsSentToServer = [];
        underTest = new ClientActionManager(
            (action) => {
                actionsSentToServer.push(action);
                return Promise.resolve()
            },
            (action) => {
                actionsSentToClient.push(action);
                return Promise.resolve()
            },
            (a1, a2) => [{ type: `(${a1.type}-${a2.type})` }, { type: `(${a1.type}x${a2.type})` }],
            1, clientId);
    });

    it('should send request to server', async function () {
        await underTest.applyClientAction(action1);

        actionsSentToClient.should.have.length(0);

        actionsSentToServer.should.have.length(1);
        actionsSentToServer[0].action.should.eql(action1);
        actionsSentToServer[0].sequenceNumber.should.eql(2);
    });

    it('should apply actions received from the server', async function () {
        await underTest.applyServerAction({action: action1, sequenceNumber: 2});

        actionsSentToClient.should.have.length(1);
        actionsSentToClient[0].type.should.eql(action1.type);

        actionsSentToServer.should.be.empty();
    });

    it('should set the sequence number as the last server sequence number + 1', async function () {
        await underTest.applyServerAction({action: action1, sequenceNumber: 2});

        await underTest.applyClientAction(action2);

        actionsSentToClient.should.have.length(1);
        actionsSentToClient[0].type.should.eql(action1.type);

        actionsSentToServer.should.have.length(1);
        actionsSentToServer[0].action.should.eql(action2);
        actionsSentToServer[0].sequenceNumber.should.eql(3);
    });

    it('should ignore server actions which were initiated by this client', async function () {
        await underTest.applyServerAction({action: action1, sequenceNumber: 2, clientId: clientId});

        actionsSentToServer.should.have.length(0);
        actionsSentToClient.should.have.length(0);
    });

    it('should ignore server actions which have the same sequence number as the last one', async function () {
        await underTest.applyServerAction({action: action1, sequenceNumber: 1});

        actionsSentToServer.should.have.length(0);
        actionsSentToClient.should.have.length(0);
    });

    it('should apply transformed action to client', async function () {
        await underTest.applyClientAction(action1);
        await underTest.applyServerAction({action: action2, sequenceNumber: 2});

        actionsSentToServer.should.have.length(1);
        actionsSentToServer[0].action.should.eql(action1);
        actionsSentToServer[0].sequenceNumber.should.eql(2);

        actionsSentToClient.should.have.length(1);
        actionsSentToClient[0].type.should.eql('(action1-action2)');
    });

    it('should handle a more complex transformation', async function () {
        await underTest.applyClientAction(action1);
        await underTest.applyClientAction(action2);
        await underTest.applyServerAction({sequenceNumber: 2, action: action3});
        await underTest.applyClientAction(action5);
        await underTest.applyServerAction({sequenceNumber: 3, action: action4});

        actionsSentToClient.should.have.length(2);
        actionsSentToClient[0].type.should.eql('(action2-(action1-action3))');
        actionsSentToClient[1].type.should.eql('(action5-((action2x(action1-action3))-((action1xaction3)-action4)))');
    })

});
