const express =
    require("express");

const Message =
    require("../models/Message");

const auth =
    require("../middleware/authMiddleware");

const router =
    express.Router();


/*
==================================================
HELPERS
==================================================
*/

function isParticipant(
    message,
    user
) {

    return (
        message.sender === user ||
        message.receiver === user
    );
}


function isValidSyncState(
    state
) {

    return [
        "pending",
        "synced",
        "failed",
    ].includes(state);
}


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


            const user =
                req.user.phoneNumber;


            if (
                !isParticipant(
                    message,
                    user
                )
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
==================================================

Same emoji:
REMOVE

Different emoji:
REPLACE

No reaction:
ADD

Every reaction changes
syncVersion.
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


            if (
                !isParticipant(
                    message,
                    user
                )
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Access denied",

                });
            }


            const existingIndex =
                message.reactions.findIndex(

                    (reaction) =>

                        reaction.user ===
                        user

                );


            let action;


            /*
            SAME EMOJI
            REMOVE
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

                action =
                    "removed";

            }


            /*
            DIFFERENT EMOJI
            REPLACE
            */

            else if (
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

                action =
                    "replaced";

            }


            /*
            ADD
            */

            else {

                message.reactions.push({

                    user,

                    emoji,

                    reactedAt:
                        new Date(),

                });

                action =
                    "added";
            }


            /*
            A reaction is a message
            state change.

            Therefore create a
            new synchronization version.
            */

            message.syncVersion +=
                1;

            message.syncState =
                "pending";

            message.lastSyncedAt =
                undefined;


            await message.save();


            return res.json({

                success: true,

                action,

                reactions:
                    message.reactions,

                syncVersion:
                    message.syncVersion,

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

Star/unstar is also a synchronized
message state change.
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
                !isParticipant(
                    message,
                    user
                )
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


            message.syncVersion +=
                1;

            message.syncState =
                "pending";

            message.lastSyncedAt =
                undefined;


            await message.save();


            return res.json({

                success: true,

                starred:
                    !exists,

                syncVersion:
                    message.syncVersion,

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
==================================================

The server does NOT receive the
actual plaintext message.

The actual encrypted/local content
is changed on the device.

The server only records that the
message was edited.
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


            if (
                message.sender !== user
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only the sender can edit the message",

                });
            }


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

            message.syncVersion +=
                1;

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
                !isParticipant(
                    message,
                    user
                )
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Access denied",

                });
            }


            /*
            Avoid duplicate entries.
            */

            if (
                !message.deletedFor.includes(
                    user
                )
            ) {

                message.deletedFor.push(
                    user
                );

                message.syncVersion +=
                    1;

                message.syncState =
                    "pending";

                message.lastSyncedAt =
                    undefined;

                await message.save();

            }


            return res.json({

                success: true,

                message:
                    "Message deleted for you",

                syncVersion:
                    message.syncVersion,

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


            if (
                message.sender !== user
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only the sender can delete this message for everyone",

                });
            }


            if (
                message.deletedForEveryone
            ) {

                return res.json({

                    success: true,

                    message:
                        "Message already deleted",

                    syncVersion:
                        message.syncVersion,

                });
            }


            message.deletedForEveryone =
                true;

            message.deletedAt =
                new Date();

            message.syncVersion +=
                1;

            message.syncState =
                "pending";

            message.lastSyncedAt =
                undefined;


            await message.save();


            return res.json({

                success: true,

                message:
                    "Message deleted for everyone",

                syncVersion:
                    message.syncVersion,

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
SYNC MESSAGE BACKUP
==================================================

IMPORTANT:

syncVersion belongs to the MESSAGE STATE.

Uploading a backup must NOT increment
syncVersion.

The client must tell the server which
message version it backed up.

Example:

Server message:
syncVersion = 7

Device backs up version 7.

Device sends:

clientSyncVersion = 7
syncState = synced

Server verifies:

message.syncVersion === 7

Then marks version 7 as backed up.

If the server is already at version 8,
the old device cannot overwrite the
backup state.

This prevents stale devices from
claiming that an older state is current.
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

                clientSyncVersion,

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


            /*
            A sync operation must specify
            the exact version being synced.
            */

            if (
                clientSyncVersion ===
                undefined ||
                clientSyncVersion ===
                null
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "clientSyncVersion is required",

                });
            }


            const requestedVersion =
                Number(
                    clientSyncVersion
                );


            if (
                !Number.isInteger(
                    requestedVersion
                ) ||
                requestedVersion < 1
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid clientSyncVersion",

                });
            }


            /*
            Validate state.
            */

            if (
                syncState &&
                !isValidSyncState(
                    syncState
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid sync state",

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
            Only participants can
            synchronize this message.
            */

            if (
                !isParticipant(
                    message,
                    user
                )
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Access denied",

                });
            }


            /*
            ==========================================
            STALE VERSION PROTECTION
            ==========================================
            */

            if (
                requestedVersion !==
                message.syncVersion
            ) {

                return res.status(409).json({

                    success: false,

                    code:
                        "SYNC_VERSION_CONFLICT",

                    message:
                        "Message has changed since this version was prepared for backup.",

                    currentSyncVersion:
                        message.syncVersion,

                    clientSyncVersion:
                        requestedVersion,

                    syncState:
                        message.syncState,

                });
            }


            /*
            ==========================================
            RECORD BACKUP METADATA
            ==========================================
            */

            if (
                syncState
            ) {

                message.syncState =
                    syncState;

            }


            if (
                backupHash !==
                undefined
            ) {

                message.backupHash =
                    backupHash || "";

            }


            if (
                driveFileId !==
                undefined
            ) {

                message.driveFileId =
                    driveFileId || "";

            }


            /*
            The backup is considered
            synced only when the requested
            state is explicitly "synced".
            */

            message.syncedToDrive =

                syncState ===
                "synced";


            message.lastSyncedAt =
                new Date();


            /*
            IMPORTANT:

            DO NOT increment syncVersion here.

            The version being backed up
            remains the same.
            */


            await message.save();


            return res.json({

                success: true,

                syncState:
                    message.syncState,

                syncVersion:
                    message.syncVersion,

                lastSyncedAt:
                    message.lastSyncedAt,

                syncedToDrive:
                    message.syncedToDrive,

                backupHash:
                    message.backupHash,

                driveFileId:
                    message.driveFileId,

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


/*
==================================================
GET UNSYNCED MESSAGES
==================================================

Used later by the device backup
system.

This returns metadata only.

It does NOT return plaintext
message content.
==================================================
*/

router.get(
    "/sync/pending",
    auth,
    async (req, res) => {

        try {

            const user =
                req.user.phoneNumber;


            const messages =
                await Message.find({

                    $and: [

                        {
                            $or: [

                                {
                                    sender:
                                        user,
                                },

                                {
                                    receiver:
                                        user,
                                },

                            ],
                        },

                        {
                            syncState:
                                {
                                    $ne:
                                        "synced",
                                },
                        },

                    ],

                })
                .sort({
                    timestamp: 1,
                })
                .limit(500);


            /*
            Return only metadata needed
            by the future backup worker.

            Actual encrypted message
            contents remain on device.
            */

            const metadata =
                messages.map(

                    (message) => ({

                        messageId:
                            message.messageId,

                        sender:
                            message.sender,

                        receiver:
                            message.receiver,

                        messageType:
                            message.messageType,

                        localMessageId:
                            message.localMessageId,

                        thumbnail:
                            message.thumbnail,

                        fileName:
                            message.fileName,

                        fileSize:
                            message.fileSize,

                        replyTo:
                            message.replyTo,

                        replyPreview:
                            message.replyPreview,

                        syncVersion:
                            message.syncVersion,

                        syncState:
                            message.syncState,

                        backupHash:
                            message.backupHash,

                        driveFileId:
                            message.driveFileId,

                        syncedToDrive:
                            message.syncedToDrive,

                        timestamp:
                            message.timestamp,

                    })

                );


            return res.json({

                success: true,

                messages:
                    metadata,

            });

        } catch (error) {

            console.error(
                "PENDING SYNC ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to load pending synchronization messages",

            });
        }
    }
);


/*
==================================================
EXPORT
==================================================
*/

module.exports =
    router;