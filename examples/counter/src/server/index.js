import express from 'express'
import exphbs from 'express-handlebars'
import http from 'http'

import LocalDb from 'redux-live/lib/server/db/local-db'
import SocketIoClient from 'redux-live/lib/server/client/socketio'
import initializeServer from 'redux-live/lib/server/index'

import reduxLiveOptions from '../shared/redux-live-options'

require("babel-polyfill");

const app = express();
const server = http.Server(app);

/**
 * Static files
 */
app.use(express.static(__dirname + '/../../build/client'));

/**
 * Error handling
 */
app.use((err, req, res, next) => {
    console.trace(err);
    console.error(err);
    res.status(err.status || 500);
    res.send({
        message: err.message,
        error: err
    });
});

/**
 * Views
 */
app.set('views', __dirname + '/../../views');
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

/**
 * Routes
 */
app.get('/', (req, res) => {
    res.render('index');
});

/**
 * Redux Live initialisation
 */
const client = new SocketIoClient({server: server});
async function startServer() {
    const {db} = await initializeServer({...reduxLiveOptions, dbClass: LocalDb, client});
    db.createState('count');
}

startServer();

/**
 * Start app
 */
const port = process.env.PORT || '3000';
server.listen(port, () => {
    console.log(`counter app listening on port ${port}`);
});
