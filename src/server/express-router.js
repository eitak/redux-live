import express from 'express'
import bodyParser from 'body-parser'

const createRouter = saveAction => {
    const router = express.Router();

    router.use(bodyParser.json());

    router.route('/')
        .post((req, res) => {
            const listId = db.createNewStateId();
            res.send(listId);
        });

    router.route('/state/:stateId')
        .get((req, res) => {
            const stateId = req.params.stateId;
            const snapshot = db.getState(stateId);
            res.send(snapshot);
        });

    router.route('/actions/:stateId')
        .get((req, res) => {
            const stateId = req.params.stateId;
            const actions = db.getActions(stateId);
            res.send({actions: actions});
        });

    router.route('/actions')
        .post((req, res) => {
            const action = req.body;
            saveAction(action);
            res.sendStatus(200);
        });

    return router;
};

export default createRouter;
