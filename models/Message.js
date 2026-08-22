const mongoose =
    require("mongoose");


const MessageSchema =
    new mongoose.Schema({

        /*
        ==================================================
        GLOBAL MESSAGE ID
        ==================================================
        */

        messageId: {

            type: String,

            required: true,

            unique: true,
        },


        /*
        ==================================================
        PARTICIPANTS
        ==================================================
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
        ==================================================
        MESSAGE TYPE
        ==================================================
        */

        messageType: {

            type: String,

            enum: [

                "text",

                "image",

                "video",

                "audio",

                "file",

                "pdf",

                "system",
            ],

            default: "text",
        },


        /*
        ==================================================
        ENCRYPTED MESSAGE CONTENT
        ==================================================

        IMPORTANT:

        This field contains ONLY encrypted content.

        Plaintext message content must NEVER be
        stored in MongoDB.

        For text messages this will contain the
        encrypted AES-GCM envelope.

        ==================================================
        */

        encryptedContent: {

            type: String,

            default: "",
        },


        /*
        ==================================================
        ENCRYPTION ALGORITHM
        ==================================================

        This allows us to version the encryption
        architecture later without breaking old
        messages.

        ==================================================
        */

        encryptionAlgorithm: {

            type: String,

            enum: [

                "",

                "ECDH-P256-AES-GCM",
            ],

            default: "",
        },


        /*
        ==================================================
        SENDER PUBLIC KEY
        ==================================================

        The sender's public key is safe to store
        alongside the encrypted message.

        It is NOT a private key.

        The recipient uses this public key together
        with their own private key to derive the
        shared encryption key.

        ==================================================
        */

        senderPublicKey: {

            type: String,

            default: "",
        },


        /*
        ==================================================
        LOCAL STORAGE REFERENCE
        ==================================================

        Actual decrypted message content should
        primarily live on the user's device.

        ==================================================
        */

        localMessageId: {

            type: String,

            default: "",
        },


        /*
        ==================================================
        THUMBNAIL
        ==================================================

        Used for:

        - replies
        - media previews
        - chat list previews

        For future encrypted-content handling,
        sensitive plaintext previews should remain
        local rather than being sent to MongoDB.

        ==================================================
        */

        thumbnail: {

            type: String,

            default: "",
        },


        /*
        ==================================================
        FILE INFO
        ==================================================
        */

        fileName: {

            type: String,

            default: "",
        },

        fileSize: {

            type: Number,

            default: 0,
        },


        /*
        ==================================================
        GOOGLE DRIVE
        ==================================================
        */

        driveFileId: {

            type: String,

            default: "",
        },

        backupHash: {

            type: String,

            default: "",
        },

        syncedToDrive: {

            type: Boolean,

            default: false,
        },


        /*
        ==================================================
        REPLY
        ==================================================
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
        ==================================================
        FORWARD
        ==================================================
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
        ==================================================
        REACTIONS

        ONE REACTION PER USER
        ==================================================
        */

        reactions: [

            {

                user: {

                    type: String,
                },

                emoji: {

                    type: String,
                },

                reactedAt: {

                    type: Date,

                    default:
                        Date.now,
                },
            },
        ],


        /*
        ==================================================
        STARRED
        ==================================================
        */

        starredBy: [

            {

                type: String,
            },
        ],


        /*
        ==================================================
        DELETE FOR ME
        ==================================================
        */

        deletedFor: [

            {

                type: String,
            },
        ],


        /*
        ==================================================
        DELETE FOR EVERYONE
        ==================================================
        */

        deletedForEveryone: {

            type: Boolean,

            default: false,
        },

        deletedAt: {

            type: Date,
        },


        /*
        ==================================================
        DELIVERY STATUS
        ==================================================
        */

        status: {

            type: String,

            enum: [

                "sending",

                "sent",

                "delivered",

                "seen",

                "failed",
            ],

            default: "sending",
        },

        deliveredAt: {

            type: Date,
        },

        seenAt: {

            type: Date,
        },


        /*
        ==================================================
        OFFLINE SYNC
        ==================================================
        */

        syncVersion: {

            type: Number,

            default: 1,
        },

        syncState: {

            type: String,

            enum: [

                "pending",

                "synced",

                "failed",
            ],

            default: "pending",
        },

        lastSyncedAt: {

            type: Date,
        },


        /*
        ==================================================
        RETRY QUEUE
        ==================================================

        Helps recover from temporary network
        failures without creating duplicate
        messages.

        ==================================================
        */

        retryCount: {

            type: Number,

            default: 0,
        },

        lastRetryAt: {

            type: Date,
        },


        /*
        ==================================================
        EDIT
        ==================================================
        */

        edited: {

            type: Boolean,

            default: false,
        },

        editedAt: {

            type: Date,
        },


        /*
        ==================================================
        TIMESTAMPS
        ==================================================
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
        MessageSchema
    );