const mongoose =
require("mongoose");

const UserSchema =
new mongoose.Schema({

    phoneNumber: {

        type: String,
        required: true,
        unique: true,
    },

    name: {

        type: String,
        default: "",
    },

    profilePhoto: {

        type: String,
        default: "",
    },

    publicKey: {

        type: String,
        default: "",
    },

    googleDriveConnected: {

        type: Boolean,
        default: false,
    },

    lastSeen: {

        type: Date,
        default: Date.now,
    },

    createdAt: {

        type: Date,
        default: Date.now,
    },
});

module.exports =
mongoose.model(
    "User",
    UserSchema,
);