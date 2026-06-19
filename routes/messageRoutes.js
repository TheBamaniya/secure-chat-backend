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
MESSAGE HISTORY
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

            console.error(error);

            return res.status(500).json({

                success: false,
            });
        }
    }
);

/*
GET SINGLE MESSAGE
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
                });
            }

            return res.json({

                success: true,

                message,
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,
            });
        }
    }
);

/*
REACTION
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

            const message =
                await Message.findOne({
                    messageId,
                });

            if (!message) {

                return res.status(404).json({

                    success: false,
                });
            }

            const existingIndex =
                message.reactions.findIndex(

                    (r) =>
                        r.user === user
                );

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

            } else if (
                existingIndex !== -1
            ) {

                message.reactions[
                    existingIndex
                ].emoji = emoji;

            } else {

                message.reactions.push({

                    user,
                    emoji,
                });
            }

            await message.save();

            return res.json({

                success: true,

                reactions:
                    message.reactions,
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,
            });
        }
    }
);

/*
DELETE FOR ME
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

            await Message.updateOne(

                {
                    messageId,
                },

                {
                    $addToSet: {

                        deletedFor:
                            user,
                    },
                }
            );

            return res.json({

                success: true,
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,
            });
        }
    }
);

/*
DELETE FOR EVERYONE
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

            const message =
                await Message.findOne({

                    messageId,
                });

            if (!message) {

                return res.status(404).json({

                    success: false,
                });
            }

            if (
                message.sender !==
                user
            ) {

                return res.status(403)
                    .json({

                        success:
                            false,
                    });
            }

            message.deletedForEveryone =
                true;

            message.deletedAt =
                new Date();

            await message.save();

            return res.json({

                success: true,
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,
            });
        }
    }
);

/*
SYNC STATUS

Frontend calls after:

Local save completed
Google Drive upload completed
Restore completed
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

            message.syncState =
                syncState ||
                "pending";

            message.backupHash =
                backupHash ||
                message.backupHash;

            message.driveFileId =
                driveFileId ||
                message.driveFileId;

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
            });

        } catch (error) {

            console.error(error);

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