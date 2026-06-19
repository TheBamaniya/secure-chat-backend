const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({

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

    /*
    DEVICE BINDING
    */

    deviceId: {
        type: String,
        default: "",
    },

    deviceName: {
        type: String,
        default: "",
    },

    simHash: {
        type: String,
        default: "",
    },

    deviceHash: {
        type: String,
        default: "",
    },

    registeredAt: {
        type: Date,
        default: Date.now,
    },

    lastDeviceChange: {
        type: Date,
    },

    /*
    ENCRYPTION
    */

    publicKey: {
        type: String,
        default: "",
    },

    /*
    GOOGLE DRIVE
    */

    googleDriveConnected: {
        type: Boolean,
        default: false,
    },

    googleDriveFolderId: {
        type: String,
        default: "",
    },

    lastBackupAt: {
        type: Date,
    },

    /*
    ONLINE STATUS
    */

    online: {
        type: Boolean,
        default: false,
    },

    lastSeen: {
        type: Date,
        default: Date.now,
    },

    /*
    ACCOUNT
    */

    accountStatus: {
        type: String,
        enum: [
            "active",
            "blocked",
            "verification_required"
        ],
        default: "active",
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model(
    "User",
    UserSchema
);