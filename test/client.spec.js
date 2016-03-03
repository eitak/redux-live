import {ClientActionManager} from '../client'

require('should');

describe('ClientActionManager', () => {

    var underTest, actionsSentToServer, actionsSentToClient;

    const action1 = 'action1';
    const action2 = 'action2';
    const action3 = 'action3';
    const action4 = 'action4';
    const action5 = 'action5';

    const clientId = 'test-client';

    beforeEach(() => {
        actionsSentToClient = [];
        actionsSentToServer =[];
        underTest = new ClientActionManager(
            (action) => actionsSentToServer.push(action),
            (action) => actionsSentToClient.push(action),
            (a1, a2) => [`(${a1}-${a2})`, `(${a1}x${a2})`],
            1, clientId);
    });

    it('should apply client actions and send request to server', () => {
        underTest.applyClientAction(action1);

        actionsSentToClient.should.have.length(1);
        actionsSentToClient[0].should.eql(action1);

        actionsSentToServer.should.have.length(1);
        actionsSentToServer[0].action.should.eql(action1);
        actionsSentToServer[0].sequenceNumber.should.eql(2);
    });

    it('should apply actions received from the server', () => {
        underTest.applyServerAction({ action: action1, sequenceNumber: 2 });

        actionsSentToClient.should.have.length(1);
        actionsSentToClient[0].should.eql(action1);

        actionsSentToServer.should.be.empty();
    });

    it('should set the sequence number as the last server sequence number + 1', () => {
        underTest.applyServerAction({ action: action1, sequenceNumber: 2 });

        underTest.applyClientAction(action2);

        actionsSentToClient.should.have.length(2);
        actionsSentToClient[0].should.eql(action1);
        actionsSentToClient[1].should.eql(action2);

        actionsSentToServer.should.have.length(1);
        actionsSentToServer[0].action.should.eql(action2);
        actionsSentToServer[0].sequenceNumber.should.eql(3);
    });

    it('should ignore server actions which were initiated by this client', () => {
        underTest.applyServerAction({ action: action1, sequenceNumber: 2, clientId: clientId });

        actionsSentToServer.should.have.length(0);
        actionsSentToClient.should.have.length(0);
    });

    it('should ignore server actions which have the same sequence number as the last one', () => {
        underTest.applyServerAction({ action: action1, sequenceNumber: 1, clientId: clientId });

        actionsSentToServer.should.have.length(0);
        actionsSentToClient.should.have.length(0);
    });

    it('should apply transformed action to client', () => {
        underTest.applyClientAction(action1);
        underTest.applyServerAction({ action: action2, sequenceNumber: 2 });

        actionsSentToServer.should.have.length(1);
        actionsSentToServer[0].action.should.eql(action1);
        actionsSentToServer[0].sequenceNumber.should.eql(2);

        actionsSentToClient.should.have.length(2);
        actionsSentToClient[0].should.eql(action1);
        actionsSentToClient[1].should.eql('(action1-action2)');
    });

    it('should handle a more complex transformation', () => {
        underTest.applyClientAction(action1);
        underTest.applyClientAction(action2);
        underTest.applyServerAction({ sequenceNumber: 2, action: action3 });
        underTest.applyClientAction(action5);
        underTest.applyServerAction({ sequenceNumber: 3, action: action4 });

        actionsSentToClient.should.have.length(5);
        actionsSentToClient[0].should.eql(action1);
        actionsSentToClient[1].should.eql(action2);
        actionsSentToClient[2].should.eql('(action2-(action1-action3))');
        actionsSentToClient[3].should.eql(action5);
        actionsSentToClient[4].should.eql('(action5-((action2x(action1-action3))-((action1xaction3)-action4)))');
    })

});
