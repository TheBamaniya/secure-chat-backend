const express =
    require("express");

const Message =
    require("../models/Message");

const auth =
    require(
        "../middleware/authMiddleware"
    );

const router =
    express.Router();

/*
==================================================
MESSAGE HISTORY
==================================================
*/

router.get(
    "/history/:receiver",
    auth,
    async (req, res) => {

        try {

            const me =
                req.user.phoneNumber;

            const receiver =
                req.params.receiver;

            const messages =
                await Message.find({

                    $or: [

                        {
                            sender: me,
                            receiver,
                        },

                        {
                            sender: receiver,
                            receiver: me,
                        },
                    ],
                })

                .sort({
                    timestamp: 1,
                })

                .limit(500);

            return res.json({

                success: true,

                messages,
            });

        } catch (error) {

            console.error(
                "MESSAGE HISTORY ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to load messages",
            });
        }
    }
);


/*
==================================================
GET SINGLE MESSAGE
==================================================
*/

router.get(
    "/message/:messageId",
    auth,
    async (req, res) => {

        try {

            const message =
                await Message.findOne({

                    messageId:
                        req.params.messageId,
                });

            if (!message) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Message not found",
                });
            }

            /*
            Make sure the requesting user
            is actually part of the conversation.
            */

            const user =
                req.user.phoneNumber;

            if (

                message.sender !== user &&

                message.receiver !== user

            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Access denied",
                });
            }

            return res.json({

                success: true,

                message,
            });

        } catch (error) {

            console.error(
                "GET MESSAGE ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to load message",
            });
        }
    }
);


/*
==================================================
REACTION

Same emoji:
REMOVE

Different emoji:
REPLACE

No reaction:
ADD
==================================================
*/

router.post(
    "/react",
    auth,
    async (req, res) => {

        try {

            const {

                messageId,

                emoji,

            } = req.body;

            const user =
                req.user.phoneNumber;

            if (
                !messageId ||
                !emoji
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "messageId and emoji are required",
                });
            }

            const message =
                await Message.findOne({

                    messageId,
                });

            if (!message) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Message not found",
                });
            }

            /*
            USER MUST BE PART
            OF CONVERSATION
            */

            if (

                message.sender !== user &&

                message.receiver !== user

            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Access denied",
                });
            }

            /*
            FIND EXISTING REACTION
            */

            const existingIndex =
                message.reactions.findIndex(

                    (reaction) =>

                        reaction.user === user
                );


            /*
            SAME EMOJI
            REMOVE REACTION
            */

            if (

                existingIndex !== -1 &&

                message.reactions[
                    existingIndex
                ].emoji === emoji

            ) {

                message.reactions.splice(

                    existingIndex,

                    1
                );

                await message.save();

                return res.json({

                    success: true,

                    action:
                        "removed",

                    reactions:
                        message.reactions,
                });
            }


            /*
            DIFFERENT EMOJI
            REPLACE REACTION
            */

            if (
                existingIndex !== -1
            ) {

                message.reactions[
                    existingIndex
                ].emoji =
                    emoji;

                message.reactions[
                    existingIndex
                ].reactedAt =
                    new Date();

            }

            /*
            NO EXISTING REACTION
            ADD REACTION
            */

            else {

                message.reactions.push({

                    user,

                    emoji,

                    reactedAt:
                        new Date(),
                });
            }

            await message.save();

            return res.json({

                success: true,

                action:
                    existingIndex === -1
                        ? "added"
                        : "replaced",

                reactions:
                    message.reactions,
            });

        } catch (error) {

            console.error(
                "REACTION ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to update reaction",
            });
        }
    }
);


/*
==================================================
STAR MESSAGE
==================================================
*/

router.post(
    "/star",
    auth,
    async (req, res) => {

        try {

            const {
                messageId,
            } = req.body;

            const user =
                req.user.phoneNumber;

            if (!messageId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "messageId is required",
                });
            }

            const message =
                await Message.findOne({

                    messageId,
                });

            if (!message) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Message not found",
                });
            }

            if (

                message.sender !== user &&

                message.receiver !== user

            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Access denied",
                });
            }

            const exists =
                message.starredBy.includes(
                    user
                );

            if (exists) {

                message.starredBy =

                    message.starredBy.filter(

                        (starredUser) =>

                            starredUser !== user
                    );

            } else {

                message.starredBy.push(
                    user
                );
            }

            await message.save();

            return res.json({

                success: true,

                starred:
                    !exists,
            });

        } catch (error) {

            console.error(
                "STAR ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to update star",
            });
        }
    }
);


/*
==================================================
EDIT MESSAGE

IMPORTANT:

The server does NOT receive
the actual message text.

The encrypted/local message
is updated on the device.

The server only records that
the message was edited.
==================================================
*/

router.post(
    "/edit",
    auth,
    async (req, res) => {

        try {

            const {
                messageId,
            } = req.body;

            const user =
                req.user.phoneNumber;

            if (!messageId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "messageId is required",
                });
            }

            const message =
                await Message.findOne({

                    messageId,
                });

            if (!message) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Message not found",
                });
            }

            /*
            ONLY THE ORIGINAL
            SENDER CAN EDIT
            */

            if (
                message.sender !== user
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only the sender can edit the message",
                });
            }

            /*
            DO NOT ALLOW EDITING
            DELETED MESSAGE
            */

            if (
                message.deletedForEveryone
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Deleted message cannot be edited",
                });
            }

            message.edited =
                true;

            message.editedAt =
                new Date();

            message.syncVersion += 1;

            message.syncState =
                "pending";

            message.lastSyncedAt =
                undefined;

            await message.save();

            return res.json({

                success: true,

                messageId:
                    message.messageId,

                edited:
                    message.edited,

                editedAt:
                    message.editedAt,

                syncVersion:
                    message.syncVersion,
            });

        } catch (error) {

            console.error(
                "EDIT MESSAGE ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to edit message",
            });
        }
    }
);


/*
==================================================
DELETE FOR ME
==================================================
*/

router.post(
    "/delete-for-me",
    auth,
    async (req, res) => {

        try {

            const {
                messageId,
            } = req.body;

            const user =
                req.user.phoneNumber;

            if (!messageId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "messageId is required",
                });
            }

            const message =
                await Message.findOne({

                    messageId,
                });

            if (!message) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Message not found",
                });
            }

            if (

                message.sender !== user &&

                message.receiver !== user

            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Access denied",
                });
            }

            message.deletedFor =

                message.deletedFor.filter(

                    (deletedUser) =>

                        deletedUser !== user
                );

            message.deletedFor.push(
                user
            );

            message.syncVersion += 1;

            message.syncState =
                "pending";

            await message.save();

            return res.json({

                success: true,

                message:
                    "Message deleted for you",
            });

        } catch (error) {

            console.error(
                "DELETE FOR ME ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to delete message",
            });
        }
    }
);


/*
==================================================
DELETE FOR EVERYONE
==================================================
*/

router.post(
    "/delete-for-everyone",
    auth,
    async (req, res) => {

        try {

            const {
                messageId,
            } = req.body;

            const user =
                req.user.phoneNumber;

            if (!messageId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "messageId is required",
                });
            }

            const message =
                await Message.findOne({

                    messageId,
                });

            if (!message) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Message not found",
                });
            }

            /*
            ONLY SENDER CAN
            DELETE FOR EVERYONE
            */

            if (
                message.sender !== user
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only the sender can delete this message for everyone",
                });
            }

            /*
            ALREADY DELETED
            */

            if (
                message.deletedForEveryone
            ) {

                return res.json({

                    success: true,

                    message:
                        "Message already deleted",
                });
            }

            message.deletedForEveryone =
                true;

            message.deletedAt =
                new Date();

            message.syncVersion += 1;

            message.syncState =
                "pending";

            await message.save();

            return res.json({

                success: true,

                message:
                    "Message deleted for everyone",
            });

        } catch (error) {

            console.error(
                "DELETE FOR EVERYONE ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to delete message",
            });
        }
    }
);


/*
==================================================
SYNC

Used when local encrypted
storage or Google Drive
backup changes metadata.
==================================================
*/

router.post(
    "/sync",
    auth,
    async (req, res) => {

        try {

            const {

                messageId,

                syncState,

                backupHash,

                driveFileId,

            } = req.body;

            const user =
                req.user.phoneNumber;

            if (!messageId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "messageId is required",
                });
            }

            const message =
                await Message.findOne({

                    messageId,
                });

            if (!message) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Message not found",
                });
            }

            /*
            ONLY PARTICIPANTS
            CAN SYNC MESSAGE
            */

            if (

                message.sender !== user &&

                message.receiver !== user

            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Access denied",
                });
            }

            /*
            VALIDATE SYNC STATE
            */

            const allowedStates = [

                "pending",

                "synced",

                "failed",
            ];

            if (

                syncState &&

                !allowedStates.includes(
                    syncState
                )

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid sync state",
                });
            }

            if (
                syncState
            ) {

                message.syncState =
                    syncState;
            }

            if (
                backupHash
            ) {

                message.backupHash =
                    backupHash;
            }

            if (
                driveFileId
            ) {

                message.driveFileId =
                    driveFileId;
            }

            message.lastSyncedAt =
                new Date();

            message.syncedToDrive =

                syncState ===
                "synced";

            message.syncVersion += 1;

            await message.save();

            return res.json({

                success: true,

                syncState:
                    message.syncState,

                syncVersion:
                    message.syncVersion,

                lastSyncedAt:
                    message.lastSyncedAt,
            });

        } catch (error) {

            console.error(
                "SYNC ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Sync failed",
            });
        }
    }
);

module.exports =
    router;