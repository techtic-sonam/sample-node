const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var ConversationSchema = new Schema(
  {
    number1: {
      type: String,
      default: "",
    },
    number2: {
      type: String,
      default: "",
    },
    distribution: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Conversation", ConversationSchema);
