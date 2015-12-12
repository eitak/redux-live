import express from 'express'
import bodyParser from 'body-parser'

let wrap = fn => (...args) => fn(...args).catch(args[2]);

const createRouter = (db, saveAction) => {
    const router = express.Router();

    router.use(bodyParser.json());

    router.route('/')
        .post(wrap(async (req, res) => {
            const listId = await db.createNewStateId();
            res.send(listId);
        }));

    router.route('/state/:stateId')
        .get(wrap(async (req, res) => {
            const stateId = req.params.stateId;
            const snapshot = await db.getState(stateId);
            res.send(snapshot);
        }));

    router.route('/actions/:stateId')
        .get(wrap(async (req, res) => {
            const stateId = req.params.stateId;
            const actions = await db.getActions(stateId);
            res.send({actions: actions});
        }));

    router.route('/actions')
        .post(wrap(async (req, res) => {
            const action = req.body;
            await saveAction(action);
            res.sendStatus(200);
        }));

    return router;
};

export default createRouter;
