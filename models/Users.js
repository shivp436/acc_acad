const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: Number,
    required: true
  },
  role: {
    type: String,
    default: "Athlete",
  },
  password: {
    type: String,
    required: true
  },
  emailHistory: [String],
  phoneHistory: [Number],
  verified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true
});

const User = mongoose.model('User', UserSchema);

module.exports = User;