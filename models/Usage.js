const mongoose =
require("mongoose");

const UsageSchema =
new mongoose.Schema({

    phoneNumber: {

        type: String,
        required: true,
    },

    date: {

        type: String,
        required: true,
    },

    usedBytes: {

        type: Number,
        default: 0,
    },
});

module.exports =
mongoose.model(
    "Usage",
    UsageSchema,
);