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
GET CHAT HISTORY
*/

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
                            sender: me,
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
                    timestamp: 1,
                })

                .limit(500);

            return res.json({

                success: true,

                messages,
            });

        } catch (
            error
        ) {

            console.error(
                error,
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
    },
);

module.exports =
    router;