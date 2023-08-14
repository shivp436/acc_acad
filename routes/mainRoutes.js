const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");

// Load User model
const User = require("../models/Users");
const { forwardAuthenticated, ensureAuthenticated } = require("../config/auth");

// Landing Page
router.get("/", (req, res) => res.render("home"));

// Programs Page
router.get("/programs", (req, res) => res.render("programs"));
router.get("/contact", (req, res) => res.render("contact"));
router.get("/about", (req, res) => res.render("about"));
router.get("/testimonials", (req, res) => res.render("testimonials"));


// Login Page
router.get("/login", forwardAuthenticated, (req, res) => res.render("login"));

// Register Page
router.get("/register", forwardAuthenticated, (req, res) =>
    res.render("register")
);

// Update User Details
router.get("/updateuser", ensureAuthenticated, (req, res) =>
    res.render("updateuser")
);

router.get("/dashboard", ensureAuthenticated, (req, res) =>
    res.render("dashboard", {
        user: req.user,
    })
);

// Register Method
router.post("/register", (req, res) => {
    const { name, email, phone, password, password2 } = req.body;
    let errors = [];

    if (!name || !email || !phone || !password || !password2) {
        errors.push({ msg: "Please enter all fields" });
    }

    if (password != password2) {
        errors.push({ msg: "Passwords do not match" });
    }

    if (password.length < 6) {
        errors.push({ msg: "Password must be at least 6 characters" });
    }

    if (!phoneval(phone)) {
        errors.push({ msg: "Please enter a valid Phone Number" });
    }

    if (errors.length > 0) {
        res.render("register", {
            errors,
            name,
            email,
            phone,
        });
    } else {
        User.findOne({ email: email }).then((user) => {
            if (user) {
                errors.push({ msg: "Email already exists" });
                res.render("register", {
                    errors,
                    name,
                    phone,
                });
            } else {
                const newUser = new User({
                    name,
                    email,
                    phone,
                    role: "Athlete",
                    password,
                });

                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if (err) throw err;
                        newUser.password = hash;
                        newUser
                            .save()
                            .then((user) => {
                                req.flash(
                                    "success_msg",
                                    "You are now registered and can log in"
                                );
                                res.redirect("/login");
                            })
                            .catch((err) => console.log(err));
                    });
                });
            }
        });
    }
});

// Phone Number Validation
function phoneval(phone) {
    // console.log(/^(\d{3})[- ]?(\d{3})[- ]?(\d{4})$/.test(phone));
    return /^(\d{3})[- ]?(\d{3})[- ]?(\d{4})$/.test(phone);
}

// Login
router.post("/login", (req, res, next) => {
    passport.authenticate("local", {
        successRedirect: "/dashboard",
        failureRedirect: "/login",
        failureFlash: true,
    })(req, res, next);
});

// Logout route handler
router.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error("Logout error:", err);
            req.flash("error_msg", "Logout failed. please try again");
            res.redirect("/dashboard", {
                user: req.user,
            });
        }

        req.flash("success_msg", "You are logged out");
        res.redirect("/login");
    });
});

// Contact Form Submission

const Message = require("../models/Messages");

router.post("/contact", (req, res) => {
    const { name, email, subject, message } = req.body;
    const date = currentDate();
    let errors = [];

    if (!name || !email || !subject || !message) {
        errors.push({ msg: "Please enter all fields" });
    }

    if (errors.length > 0) {
        res.render("contact", {
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
                req.flash("success_msg", "Message Sent Succesfully.");
                res.redirect("contact");
                console.log("Message saved successfully", newMessage);
                sendEmail(newMessage);
            })
            .catch((err) => {
                req.flash("error_msg", "Error Encountered. Please try again");
                res.render("contact", {
                    errors,
                    name,
                    email,
                    subject,
                    message,
                });
                console.error("Error saving message:", err, newMessage);
            });
    }
});

// CONTACT FORM TO EMAILJS
const emailjs = require("@emailjs/nodejs");

// importing required variables
require("dotenv").config();
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
                    "Success: Email Sent!",
                    response.status,
                    response.text
                );
            },
            (err) => {
                console.log("FAILED to send email", err);
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

module.exports = router;
