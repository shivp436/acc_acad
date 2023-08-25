const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

// Load User model
const User = require('../models/Users');

module.exports = function (passport) {
	passport.use(
		new LocalStrategy(
			{ usernameField: 'email' },
			(email, password, done) => {
				// Match user
				User.findOne({
					email: email,
				}).then((user) => {
					if (!user) {
						return done(null, false, {
							message: 'That email is not registered',
						});
					}

					if(!user.verified) {
						return done(null, false, {
							message: 'Email not verified. Wait for 10 min and regiter again'
						})
					}

					// Match password
					bcrypt.compare(password, user.password, (err, isMatch) => {
						if (err) throw err;
						if (isMatch) {
							return done(null, user);
						} else {
							return done(null, false, {
								message: 'Password incorrect',
							});
						}
					});
				});
			}
		)
	);

	passport.serializeUser(function (user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(async function (id, done) {
		try {
			const user = await User.findById(id);
			done(null, user);
		} catch (err) {
			done(err, null);
		}
	});
};