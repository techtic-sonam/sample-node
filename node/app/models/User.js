const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var UserSchema = new Schema(
  {
    email: {
      type: String,
      default: "",
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    style_mode: {
      type: String,
      default: "light",
    },
    emailAlert: {
      type: Boolean,
      default: true,
    },
    soundAlert: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    port_pin: {
      type: String,
      default: "",
    },
    port_pin_date: {
      type: String,
      default: "",
    },
    fcmToken: {
      type: String,
      default: "",
    },
    account_id: {
      type: String,
      default: "",
    },
    userId: {
      type: String,
      default: "",
    },
    last_signDate: {
      type: Date,
      default: Date.now(),
    },
    user_name: {
      type: String,
      default: "",
    },
    clio_state: {
      type: Boolean,
      default: false,
    },
    clio_auth: {
      type: Object,
      default: undefined,
    },
    sip_username: {
      type: String,
      default: "",
    },
    sip_password: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
