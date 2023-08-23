var express = require('express');
var router = express.Router();
var multer = require('multer');
const mongoose = require('mongoose');
const User = require("../models/Users");

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, './views/assets/img/users/');
	},
	filename: function (req, file, cb) {
		const id = req.user._id; // Replace with how you access the id
		const extension = file.originalname.split('.').pop();
		const newFileName = `${id}.${extension}`;
		cb(null, newFileName);
	},
});

const fileFilter = (req, file, cb) => {
	if (
		file.mimetype === 'image/jpeg' ||
		file.mimetype === 'image/jpg' ||
		file.mimetype === 'image/png'
	) {
		cb(null, true);
	} else {
		cb(null, false);
	}
};

var upload = multer({
	storage: storage,
	limits: {
		fileSize: 1024 * 1024 * 5,
	},
	fileFilter: fileFilter,
});

// router.post('/fileupload', upload.single('image'), function (req, res, next) {
// 	const filename = req.file.filename;

// 	res.render("dashboard", {
//         user: req.user,
// 		image: `assets/img/users/${req.user._id}.jpg`
//     })

// 	opendash(req, res);
// });

module.exports = router;
