const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');

// Load User model
const User = require('../models/Users');
const { forwardAuthenticated, ensureAuthenticated } = require('../config/auth');

// Landing Page
router.get('/', (req, res) => res.render('home'));

// Programs Page
router.get('/programs', (req, res) => res.render('programs'));
router.get('/contact', (req, res) => res.render('contact'));
router.get('/about', (req, res) => res.render('about'));
router.get('/testimonials', (req, res) => res.render('testimonials'));

// Login Page
router.get('/login', forwardAuthenticated, (req, res) => res.render('login'));

// Register Page
router.get('/register', forwardAuthenticated, (req, res) =>
	res.render('register')
);

// Update User Details
router.post('/updateUserDetails', ensureAuthenticated, async (req, res) => {
	const id = req.user._id;
	const { nameUp, emailUp, phoneUp } = req.body;

	try {
		const user = await User.findOne({ _id: id });

		if (!user) {
			req.flash('error_msg', 'Invalid Request');
			res.redirect('/dashboard');
		}

		const nameOld = user.name;
		const emailOld = user.email;
		const phoneOld = user.phone;

		// Updated name Verification
		const updatedName = nameUp ? nameUp : nameOld;

		// Updated Email & Phone Verification
		const updatedEmail = emailUp
			? isValidEmail(emailUp)
				? emailUp
				: (req.flash('error_msg', 'Please Enter a valid Email Address'),
				  emailOld)
			: emailOld;
		const updatedPhone = phoneUp
			? isValidPhone(phoneUp)
				? phoneUp
				: (req.flash('error_msg', 'Please Enter a valid Phone Number'),
				  phoneOld)
			: phoneOld;

		// Check if the updated email already exists for another user
		if (updatedEmail !== emailOld) {
			const existingUser = await User.findOne({ email: updatedEmail });
			if (existingUser) {
				updatedEmail = emailOld;
				req.flash(
					'error_msg',
					'Email is already in use by another user'
				);
				res.redirect('dashboard');
			}
		}

		const updatedUser = await User.findOneAndUpdate(
			{ _id: id },
			{
				$set: {
					name: updatedName,
					email: updatedEmail,
					phone: updatedPhone,
				},
				$addToSet: {
					// tracks changes in email & phone in an array
					emailHistory: updatedEmail,
					phoneHistory: updatedPhone,
				},
			},
			{ new: true } // Returns the updated document
		);

		req.flash('success_msg', 'User Details Updated');
		res.redirect('dashboard');
	} catch (error) {
		console.error('Error updating user:', error);
		// res.status(500).json({ msg: 'Server error' });
		req.flash('error_msg', 'Error Occured');
		res.redirect('dashboard');
	}
});

// CHANGE PASSWORD METHOD
router.post('/changePassword', ensureAuthenticated, async (req, res) => {
	const { passwordOld, passwordNew, passwordNew2 } = req.body;
	const id = req.user._id;

	// check if new passwords are same
	if (passwordNew != passwordNew2) {
		req.flash('error_msg', 'New Passwords do not match. Please try again');
		return res.redirect('/dashboard');
	}

	try {
		const user = await User.findOne({ _id: id });

		if (!user) {
			req.flash('error_msg', 'Invalid Request');
			return res.redirect('/dashboard');
		}

		// verify old password
		const isMatch = await matchPass(passwordOld, user.password);
		if (isMatch) {
			// old password matches
			// check if new password is different from old one
			if (passwordNew == passwordOld) {
				req.flash(
					'error_msg',
					'New Password must be different from old password'
				);
				return res.redirect('/dashboard');
			}

			// Check new password strength
			if (!isValidPassword(passwordNew)) {
				req.flash('error_msg', 'Password is not strong enough');
				return res.redirect('/dashboard');
			}

			// Encrypt new password
			bcrypt
				.genSalt(10)
				.then((salt) => {
					return bcrypt.hash(passwordNew, salt);
				})
				.then((hash) => {
					console.log(hash, passwordNew);
					return User.findOneAndUpdate(
						{ _id: id },
						{ password: hash },
						{ new: true } // Return the updated document
					).exec();
				})
				.then((updatedUser) => {
					req.flash('success_msg', 'User Password Updated');
					return res.redirect('/dashboard');
				})
				.catch((err) => {
					console.error('Password Reset Failed', err);
					req.flash(
						'error_msg',
						'Password Reset Failed. Please try again'
					);
					return res.redirect('/dashboard');
				});
		} else {
			// Passwords do not match
			req.flash(
				'error_msg',
				'Old Password is incorrect. Please try again'
			);
			return res.redirect('/dashboard');
		}
	} catch (err) {
		// Handle error
		console.log(err);
		req.flash('error_msg', 'Error Occured. Please try again');
		return res.redirect('/dashboard');
	}
});

router.get('/dashboard', ensureAuthenticated, (req, res) =>
	res.render('dashboard', {
		user: req.user,
		// image: `assets/img/users/${req.user._id}.jpg`,
	})
);

// Register Method
router.post('/register', (req, res) => {
	const { name, email, phone, password, password2 } = req.body;
	let errors = [];

	if (!name || !email || !phone || !password || !password2) {
		errors.push({ msg: 'Please enter all fields' });
	}

	if (password != password2) {
		errors.push({ msg: 'Passwords do not match' });
	}

	if (!isValidPassword(password)) {
		errors.push({ msg: 'Password is not strong enough.' });
	}

	if (!isValidEmail(email)) {
		errors.push({ msg: 'Please enter a valid Email Address' });
	}

	if (!isValidPhone(phone)) {
		errors.push({ msg: 'Please enter a valid Phone Number' });
	}

	if (errors.length > 0) {
		res.render('register', {
			errors,
			name,
			email,
			phone,
		});
	} else {
		User.findOne({ email: email }).then((user) => {
			if (user) {
				errors.push({ msg: 'Email already exists' });
				res.render('register', {
					errors,
					name,
					phone,
				});
			} else {
				const newUser = new User({
					name,
					email,
					phone,
					password,
					emailHistory: [email],
					phoneHistory: [phone],
				});

				bcrypt.genSalt(10, (err, salt) => {
					bcrypt.hash(newUser.password, salt, (err, hash) => {
						if (err) throw err;
						newUser.password = hash;
						newUser
							.save()
							.then((user) => {
								req.flash(
									'success_msg',
									'You are now registered and can log in'
								);
								res.redirect('/login');
							})
							.catch((err) => console.log(err));
					});
				});
			}
		});
	}
});

// Phone Number Validation
function isValidPhone(phone) {
	// console.log(/^(\d{3})[- ]?(\d{3})[- ]?(\d{4})$/.test(phone));
	return /^(\d{3})[- ]?(\d{3})[- ]?(\d{4})$/.test(phone);
}

function isValidEmail(email) {
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	return emailRegex.test(email);
}

function isValidPassword(password) {
	const regex =
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
	return regex.test(password);
}

// Login
router.post('/login', (req, res, next) => {
	passport.authenticate('local', {
		successRedirect: '/dashboard',
		failureRedirect: '/login',
		failureFlash: true,
	})(req, res, next);
});

// Logout route handler
router.get('/logout', (req, res) => {
	req.logout((err) => {
		if (err) {
			console.error('Logout error:', err);
			req.flash('error_msg', 'Logout failed. please try again');
			res.redirect('/dashboard', {
				user: req.user,
			});
		}

		req.flash('success_msg', 'You are logged out');
		res.redirect('/login');
	});
});

// Contact Form Submission

const Message = require('../models/Messages');

router.post('/contact', (req, res) => {
	const { name, email, subject, message } = req.body;
	const date = currentDate();
	let errors = [];

	if (!name || !email || !subject || !message) {
		errors.push({ msg: 'Please enter all fields' });
	}

	if (errors.length > 0) {
		res.render('contact', {
			errors,
			name,
			email,
			subject,
			message,
		});
	} else {
		const newMessage = new Message({
			name,
			email,
			subject,
			message,
			date,
		});

		newMessage
			.save()
			.then(() => {
				req.flash('success_msg', 'Message Sent Succesfully.');
				res.redirect('contact');
				console.log('Message saved successfully', newMessage);
				sendEmail(newMessage);
			})
			.catch((err) => {
				req.flash('error_msg', 'Error Encountered. Please try again');
				res.render('contact', {
					errors,
					name,
					email,
					subject,
					message,
				});
				console.error('Error saving message:', err, newMessage);
			});
	}
});

// CONTACT FORM TO EMAILJS
const emailjs = require('@emailjs/nodejs');

// importing required variables
require('dotenv').config();
const serviceID = process.env.SERVICE_ID;
const templateID = process.env.TEMPLATE_ID;
const pubkey = process.env.PUB_KEY;
const prikey = process.env.PRI_KEY;

// Contact Form to Email
function sendEmail(newMessage) {
	const templateParams = {
		name: newMessage.name,
		email: newMessage.email,
		subject: newMessage.subject,
		message: newMessage.message,
		date: newMessage.date,
	};

	emailjs
		.send(serviceID, templateID, templateParams, {
			publicKey: pubkey,
			privateKey: prikey,
		})
		.then(
			(response) => {
				console.log(
					'Success: Email Sent!',
					response.status,
					response.text
				);
			},
			(err) => {
				console.log('FAILED to send email', err);
			}
		);
}

// Get current Date

function currentDate() {
	const cdate = new Date();

	const year = cdate.getFullYear();
	const month = cdate.getMonth() + 1; // Months are 0-based, so add 1
	const day = cdate.getDate();
	const hours = cdate.getHours();
	const minutes = cdate.getMinutes();
	const seconds = cdate.getSeconds();
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function matchPass(unencPass, encPass) {
	try {
		const isMatch = await bcrypt.compare(unencPass, encPass);
		return isMatch;
	} catch (err) {
		console.log(err);
		res.redirect('/dashboard');
	}
}

module.exports = router;
