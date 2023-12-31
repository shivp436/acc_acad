const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const schedule = require('node-schedule');

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
								const otp = generateOTP();
								req.session.otp = otp;
								req.session.userID = user._id;
								const message = {
									name: user.name,
									email: user.email,
									otp: otp,
								};
								sendOTPEmail(message);
								errors.push({
									msg: 'Please enter the OTP sent to your email. Expires in 10 minutes',
								});
								res.render('verifyemail', {
									errors,
								});
							})
							.catch((err) => console.log(err));
					});
				});
			}
		});
	}
});

// open register page if someone tries coming back to verifyemail
router.get('/verifyemail', (req, res) => {
	res.redirect('register');
});

// VERIFY EMAIL METHOD
router.post('/verifyemail', async (req, res) => {
	const genOTP = req.session.otp;
	const id = req.session.userID;
	const { digit1, digit2, digit3, digit4 } = req.body;
	const reqOTP = parseInt(digit1 + digit2 + digit3 + digit4);
	let errors = [];

	if (genOTP == reqOTP) {
		try {
			const updatedUser = await User.findOneAndUpdate(
				{ _id: id },
				{
					$set: {
						verified: true,
					},
				},
				{ new: true } // Returns the updated document
			);

			if (!updatedUser) {
				console.log('User Not Found');
				await User.findOneAndDelete({ _id: id });
				req.flash('error_msg', 'User Not Found.');
				return res.redirect('register');
			}
			// if user get verified
			req.flash('success_msg', 'Account Created. You can now login');
			res.redirect('login');
		} catch (error) {
			try {
				// Attempt to delete the user and register again.
				await User.findOneAndDelete({ _id: id });
				req.flash('error_msg', 'Error Occurred. User deleted.');
				return res.redirect('register');
			} catch (deleteError) {
				console.error('Error deleting user:', deleteError);
				req.flash('error_msg', 'Error Occurred. User not deleted.');
				return res.redirect('register');
			}
		}
	} else {
		errors.push({ msg: 'Incorrect OTP. Please try again' });
		res.render('verifyemail', {
			errors,
		});
	}
});

// FORGOT PASSWORD METHOD
router.get('/forgotpassword', (req, res) => res.render('forgotpassword'));
router.post('/forgotpassword', async (req, res) => {
	const email = req.body.email;
	let errors = [];

	if (!isValidEmail(email)) {
		errors.push({ msg: 'Please enter a valid email' });
		return res.render('forgotpassword', {
			errors,
			email,
		});
	}

	try {
		const user = await User.findOne({ email: email });

		if (!user) {
			errors.push({ msg: 'Email is not registered' });
			return res.render('forgotpassword', {
				errors,
				email,
			});
		}

		const otp = generateOTP();
		console.log(otp);
		const message = {
			otp: otp,
			name: user.name,
			email: user.email,
		};
		sendOTPEmail(message);
		req.session.otp = otp;
		req.session.user = user;
		return res.render('recoverOTP');
	} catch (error) {
		console.log(console.log(error));
		errors.push({ msg: 'Error Occured. Please try again' });
		return res.render('forgotpassword', {
			errors,
			email,
		});
	}
});

// Recovery OTP Page
router.get('/recoverOTP', (req, res) => res.redirect('forgotpassword'));

router.post('/recoverOTP', (req, res) => {
	const genOTP = req.session.otp;
	const { digit1, digit2, digit3, digit4 } = req.body;
	const reqOTP = parseInt(digit1 + digit2 + digit3 + digit4);
	let errors = [];

	if (genOTP == reqOTP) {
		return res.render('resetpassword');
	}

	errors.push({ msg: 'Incorrect OTP. Please try again' });
	return res.render('recoverOTP', {
		errors,
	});
});

// RESET PASSWORD METHOD
router.post('/resetpassword', async (req, res) => {
	const id = req.session.user._id;
	const { password, password2 } = req.body;
	let errors = [];

	if (!password || !password2) {
		errors.push({ msg: 'Please enter all fields' });
	} else if (!isValidPassword(password)) {
		errors.push({ msg: 'Password is not strong enough.' });
	}

	if (password != password2) {
		errors.push({ msg: 'Passwords do not match' });
	}

	if (errors.length > 0) {
		console.log(id);
		return res.render('resetpassword', {
			errors,
			password,
			password2,
		});
	}

	try {
		const user = User.findOne({ _id: id });

		if (!user) {
			errors.push({ msg: 'User not found. Please try again' });
			req.session.user = '';
			return res.render('forgotpassword', {
				errors,
			});
		}

		bcrypt
			.genSalt(10)
			.then((salt) => {
				return bcrypt.hash(password, salt);
			})
			.then((hash) => {
				return User.findOneAndUpdate(
					{ _id: id },
					{ password: hash },
					{ new: true } // Return the updated document
				).exec();
			})
			.then((updatedUser) => {
				req.flash('success_msg', 'User Password Updated');
				req.session.user = ''; // clear the user after resetting password
				return res.redirect('/login');
			})
			.catch((err) => {
				console.error('Password Reset Failed', err);
				req.flash(
					'error_msg',
					'Password Reset Failed. Please try again'
				);
				return res.redirect('/forgotpassword');
			});
	} catch (error) {
		console.error('Password Reset Failed', error);
		req.flash('error_msg', 'Password Reset Failed. Please try again');
		req.session.user = '';
		return res.redirect('/forgotpassword');
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
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[~`!@#$%^&*()_\-+={[}\]|:;"'<,>.?\/])[A-Za-z\d~`!@#$%^&*()_\-+={[}\]|:;"'<,>.?\/]{8,}$/;
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
	const userId = req.user ? req.user._id : 'anonymous';

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
			userId,
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
				sendContactEmail(newMessage);
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
const messageTemplateID = process.env.MESSAGE_TEMPLATE_ID;
const otpTemplateID = process.env.OTP_TEMPLATE_ID;
const pubkey = process.env.PUB_KEY;
const prikey = process.env.PRI_KEY;

// Contact Form to Email
function sendContactEmail(newMessage) {
	const templateParams = {
		name: newMessage.name,
		email: newMessage.email,
		subject: newMessage.subject,
		message: newMessage.message,
		date: newMessage.date,
	};

	emailjs
		.send(serviceID, messageTemplateID, templateParams, {
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

// OTP Message EMail
function sendOTPEmail(newMessage) {
	const templateParams = {
		name: newMessage.name,
		email: newMessage.email,
		otp: newMessage.otp,
	};

	emailjs
		.send(serviceID, otpTemplateID, templateParams, {
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

// OTP Generator
function generateOTP() {
	const otpLength = 4;
	let otp = '';

	for (let i = 0; i < otpLength; i++) {
		const digit =
			i === 0
				? Math.floor(Math.random() * 9) + 1
				: Math.floor(Math.random() * 10);
		otp += digit.toString();
	}

	return otp;
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

// Cleanup unverified users every 20 minutes
const userCleanupJob = schedule.scheduleJob('*/20 * * * *', async () => {
	try {
		const deletedUsers = await User.deleteMany({ verified: false });
		console.log(`Deleted ${deletedUsers.deletedCount} unverified users.`);
	} catch (error) {
		console.error('User cleanup error:', error);
	}
});

module.exports = router;
