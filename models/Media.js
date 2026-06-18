const mongoose =
require("mongoose");

const MediaSchema =
new mongoose.Schema({

    fileId: {

        type: String,
        required: true,
    },

    owner: {

        type: String,
        required: true,
    },

    type: {

        type: String,
        required: true,
    },

    thumbnail: {

        type: String,
        default: "",
    },

    googleDriveId: {

        type: String,
        default: "",
    },

    encryptedHash: {

        type: String,
        default: "",
    },

    size: {

        type: Number,
        default: 0,
    },

    createdAt: {

        type: Date,
        default: Date.now,
    },
});

module.exports =
mongoose.model(
    "Media",
    MediaSchema,
);