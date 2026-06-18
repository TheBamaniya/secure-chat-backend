const mongoose =
require("mongoose");

const MessageSchema =
new mongoose.Schema({

    messageId: {

        type: String,
        required: true,
        unique: true,
    },

    sender: {

        type: String,
        required: true,
    },

    receiver: {

        type: String,
        required: true,
    },

    type: {

        type: String,

        enum: [
            "text",
            "image",
            "video",
            "pdf",
            "file",
        ],

        default: "text",
    },

    encryptedContent: {

        type: String,
        default: "",
    },

    replyTo: {

        type: String,
        default: "",
    },

    forwarded: {

        type: Boolean,
        default: false,
    },

    edited: {

        type: Boolean,
        default: false,
    },

    deleted: {

        type: Boolean,
        default: false,
    },

    reactions: [

        {

            user: String,
            emoji: String,
        },
    ],

    status: {

        type: String,

        enum: [
            "sent",
            "delivered",
            "seen",
        ],

        default: "sent",
    },

    timestamp: {

        type: Date,
        default: Date.now,
    },
});

module.exports =
mongoose.model(
    "Message",
    MessageSchema,
);