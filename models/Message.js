const mongoose =
    require("mongoose");

const MessageSchema =
    new mongoose.Schema({

        /*
        UNIQUE MESSAGE ID
        */

        messageId: {

            type: String,

            required: true,

            unique: true,
        },

        /*
        BASIC INFO
        */

        sender: {

            type: String,

            required: true,
        },

        receiver: {

            type: String,

            required: true,
        },

        /*
        MESSAGE TYPE

        text
        image
        video
        pdf
        file
        audio
        */

        messageType: {

            type: String,

            enum: [

                "text",

                "image",

                "video",

                "pdf",

                "file",

                "audio",
            ],

            default: "text",
        },

        /*
        ENCRYPTED CONTENT
        */

        encryptedContent: {

            type: String,

            default: "",
        },

        /*
        MEDIA INFO
        */

        mediaId: {

            type: String,

            default: "",
        },

        thumbnail: {

            type: String,

            default: "",
        },

        fileName: {

            type: String,

            default: "",
        },

        fileSize: {

            type: Number,

            default: 0,
        },

        /*
        GOOGLE DRIVE FILE ID

        Actual file lives in
        user's Google Drive.
        */

        driveFileId: {

            type: String,

            default: "",
        },

        /*
        ENCRYPTION VERSION

        Allows future upgrades
        without breaking old backups.
        */

        encryptionVersion: {

            type: Number,

            default: 1,
        },

        /*
        REPLY FEATURE
        */

        replyTo: {

            type: String,

            default: "",
        },

        replyPreview: {

            type: String,

            default: "",
        },

        /*
        FORWARD FEATURE
        */

        forwarded: {

            type: Boolean,

            default: false,
        },

        forwardedFrom: {

            type: String,

            default: "",
        },

        /*
        EDIT FEATURE
        */

        edited: {

            type: Boolean,

            default: false,
        },

        editedAt: {

            type: Date,
        },

        /*
        DELETE FOR EVERYONE
        */

        deletedForEveryone: {

            type: Boolean,

            default: false,
        },

        /*
        DELETE FOR ME
        */

        deletedFor: [

            {

                type: String,
            },
        ],

        /*
        STARRED MESSAGES
        */

        starredBy: [

            {

                type: String,
            },
        ],

        /*
        REACTIONS
        */

        reactions: [

            {

                user: {

                    type: String,
                },

                emoji: {

                    type: String,
                },
            },
        ],

        /*
        DELIVERY STATUS
        */

        status: {

            type: String,

            enum: [

                "sent",

                "delivered",

                "seen",
            ],

            default: "sent",
        },

        deliveredTo: [

            {

                type: String,
            },
        ],

        seenBy: [

            {

                type: String,
            },
        ],

        deliveredAt: {

            type: Date,
        },

        seenAt: {

            type: Date,
        },

        /*
        MESSAGE TIMESTAMPS
        */

        sentAt: {

            type: Date,

            default:
                Date.now,
        },

        timestamp: {

            type: Date,

            default:
                Date.now,
        },
    });

module.exports =
    mongoose.model(
        "Message",
        MessageSchema,
    );