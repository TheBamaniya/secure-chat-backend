const express =
    require("express");

const Message =
    require("../models/Message");

const auth =
    require(
        "../middleware/authMiddleware"
    );

const {

    decryptMessage,

} = require(
    "../utils/encryption"
);

const router =
    express.Router();

router.get(

    "/history/:receiver",

    auth,

    async (req, res) => {

        try {

            const me =
                req.user
                    .phoneNumber;

            const receiver =
                req.params
                    .receiver;

            const messages =

                await Message.find({

                    $or: [

                        {

                            sender:
                                me,

                            receiver:
                                receiver,
                        },

                        {

                            sender:
                                receiver,

                            receiver:
                                me,
                        },
                    ],
                })

                .sort({

                    timestamp:
                        1,
                })

                .limit(500);

            const decryptedMessages =

                messages.map(

                    (msg) => {

                        let text = "";

                        try {

                            text =

                                decryptMessage(

                                    msg
                                    .encryptedContent
                                );

                        } catch {

                            text = "";
                        }

                        return {

                            ...msg.toObject(),

                            encryptedContent:
                                text,
                        };
                    }
                );

            return res.json({

                success: true,

                messages:
                    decryptedMessages,
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
                        "Unable to load messages",
                });
        }
    }
);

module.exports =
    router;