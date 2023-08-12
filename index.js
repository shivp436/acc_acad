const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');

// Package documentation - https://www.npmjs.com/package/connect-mongo
const MongoStore = require('connect-mongo');

const app = express();

// Passport Config
require('./config/passport')(passport);

// CONNECTING TO MONGODB 
// importing the connection string
require('dotenv').config();
const db = process.env.DB_STRING;

// Connect to Database
const connection = mongoose
                    .connect(
                      db,
                      { useNewUrlParser: true ,useUnifiedTopology: true}
                    )
                    .then(() => console.log('MongoDB Connected'))
                    .catch(err => console.log(err));

// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/views'));

// Express body parser
app.use(express.urlencoded({ extended: false }));

// Express session Steup 

app.use(
session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
	  store: MongoStore.create({
		  mongoUrl: db,
    	  ttl: 60 * 60 * 24 * 14
	})
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use(function(req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
  });

// Routes
app.use('/', require('./routes/mainRoutes.js'));
// app.use('/users', require('./routes/usersRoutes.js'));

// PORT
const PORT = process.env.port || 5000;
app.listen(PORT, console.log(`Server running on  ${PORT}`));