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
GET CONVERSATIONS

SERVER STORES
METADATA ONLY
*/

router.get(

    "/",

    auth,

    async (req, res) => {

        try {

            const me =
                req.user
                    .phoneNumber;

            const messages =

                await Message.find({

                    $or: [

                        {
                            sender:
                                me
                        },

                        {
                            receiver:
                                me
                        }
                    ]
                })

                .sort({

                    timestamp:
                        -1
                });

            const map =
                new Map();

            messages.forEach(

                (msg) => {

                    const otherUser =

                        msg.sender === me

                        ? msg.receiver

                        : msg.sender;

                    if (
                        !map.has(
                            otherUser
                        )
                    ) {

                        map.set(

                            otherUser,

                            {

                                phoneNumber:
                                    otherUser,

                                messageType:
                                    msg.messageType,

                                timestamp:
                                    msg.timestamp,

                                status:
                                    msg.status,

                                thumbnail:
                                    msg.thumbnail ||

                                    "",

                                replyTo:
                                    msg.replyTo ||

                                    "",

                                deletedForEveryone:

                                    msg.deletedForEveryone ||
                                    false,
                            }
                        );
                    }
                }
            );

            return res.json({

                success: true,

                conversations:

                    Array.from(
                        map.values()
                    ),
            });

        } catch (
            error
        ) {

            console.error(
                error
            );

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Unable to load conversations",
                });
        }
    }
);

module.exports =
    router;