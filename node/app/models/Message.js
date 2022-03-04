const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var MessageSchema = new Schema(
  {
    message_id: {
      type: String,
      default: "",
    },
    from_number: {
      type: String,
      default: "",
    },
    to_number: {
      type: String,
      default: "",
    },
    text: {
      type: String,
      default: "",
    },
    media: {
      type: String,
      default: "",
    },
    direction: {
      type: String,
      default: "",
    },
    sender: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      default: "0",
    },
    email_alert: {
      type: Boolean,
      default: true,
    },
    trash_flag: {
      type: Boolean,
      default: false,
    },
    account_name: {
      type: String,
      default: "",
    },
    sentiment_score: {
      type: String,
      default: "",
    },
    automation: {
      type: Boolean,
      default: false,
    },
    is_failed: {
      type: Boolean,
      default: false,
    },
    err_description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", MessageSchema);
