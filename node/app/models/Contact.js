const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var ContactSchema = new Schema(
  {
    userID: {
      type: String,
      default: ""
    },
    phoneNumber: {
      type: String,
      default: ""
    },
    labelName: {
      type: String,
      default: ""
    },
    email: {
      type: String,
      default: ""
    },
    company: {
      type: String,
      default: ""
    },
    street: {
      type: String,
      default: ""
    },
    street2: {
      type: String,
      default: ""
    },
    city: {
      type: String,
      default: ""
    },
    zip: {
      type: String,
      default: ""
    },
    state: {
      type: String,
      default: ""
    },
    phoneNumbers: {
      type: Object,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Contact", ContactSchema);
