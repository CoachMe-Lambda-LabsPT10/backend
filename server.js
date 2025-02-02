const express = require('express');
const session = require('express-session');
const Ddos = require('ddos');

const ddos = new Ddos({burst: 10, limit: 15})
const logger = require('log4js').configure({
    appenders: {errors: {type: 'file', filename: 'errors.log' }},
    categories: {default: {appenders: ['errors'], level: 'error'}}
}).getLogger('errors');

const passport = require('passport');

// Passport config
require('./config/passport-local')(passport);
require('./config/passport-google')(passport);
require('./config/passport-facebook')(passport);

const app = express();

// Basic middleware
app.use(require('cors')({
    methods: ['GET', 'POST'],
    credentials: true
}))
app.use(express.json());
app.use(require("cookie-parser")(process.env.SESSION_SECRET))

// Security
app.use(require('cors')());
app.use(require('helmet')());
app.use(ddos.express);

// Passport middleware
app.use(passport.initialize());

// Sessions
const Knex = require("knex");
const knexfile = require('./knexfile')
const knex = require('./data/db_config');
const KnexSessionStore = require("connect-session-knex")(session);
const store = new KnexSessionStore({
    knex: knex,
    tablename: 'auth_sessions'
});

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
        // 30 minutes
        expires: 1800000, 
        maxAge: 1000000000
    },
    store: store
}));

app.use(passport.session());


// Routes
app.use('/api', require('./routes/router-index'));


// Error handling
app.use((error, req, res, next) =>{
    logger.error(error);
    return res.status(500).json('There was an internal server error');
});

// Google verification
app.use(express.static('public'));

module.exports = app;