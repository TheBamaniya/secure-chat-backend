const mongoose =
    require("mongoose");


const DeviceSchema =
    new mongoose.Schema({

        /*
        ==========================================
        DEVICE OWNER
        ==========================================
        */

        phoneNumber: {

            type: String,

            required: true,

            index: true,

        },


        /*
        ==========================================
        DEVICE ID
        ==========================================
        */

        deviceId: {

            type: String,

            required: true,

            unique: true,

            index: true,

        },


        /*
        ==========================================
        DEVICE FINGERPRINT
        ==========================================
        */

        deviceHash: {

            type: String,

            required: true,

        },


        /*
        ==========================================
        SIM HASH
        ==========================================
        */

        simHash: {

            type: String,

            default: "",

        },


        /*
        ==========================================
        DEVICE NAME
        ==========================================
        */

        deviceName: {

            type: String,

            default: "",

        },


        /*
        ==========================================
        DEVICE STATUS
        ==========================================
        */

        status: {

            type: String,

            enum: [

                "active",

                "verification_required",

                "blocked",

                "revoked",

            ],

            default: "active",

        },


        /*
        ==========================================
        PRIMARY DEVICE
        ==========================================
        */

        isPrimary: {

            type: Boolean,

            default: true,

        },


        /*
        ==========================================
        DEVICE REGISTRATION
        ==========================================
        */

        registeredAt: {

            type: Date,

            default: Date.now,

        },


        /*
        ==========================================
        LAST DEVICE CHANGE
        ==========================================
        */

        lastChangedAt: {

            type: Date,

            default: Date.now,

        },


        /*
        ==========================================
        LAST SEEN
        ==========================================
        */

        lastSeenAt: {

            type: Date,

            default: Date.now,

        },


        /*
        ==========================================
        LAST LOGIN
        ==========================================
        */

        lastLoginAt: {

            type: Date,

            default: Date.now,

        },


        /*
        ==========================================
        LAST IP

        Stored only as an operational
        security signal.
        ==========================================
        */

        lastIpAddress: {

            type: String,

            default: "",

        },

    }, {

        timestamps: true,

    });


/*
==================================================
COMPOUND INDEX

A user may eventually have multiple devices,
but the same deviceId must never belong to
two accounts.
==================================================
*/

DeviceSchema.index({

    phoneNumber: 1,

    status: 1,

});


module.exports =
    mongoose.model(
        "Device",
        DeviceSchema
    );