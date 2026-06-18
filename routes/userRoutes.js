const express =
    require("express");

const auth =
    require(
        "../middleware/authMiddleware"
    );

const User =
    require("../models/User");

const router =
    express.Router();

/*
CURRENT USER
*/

router.get(

    "/me",

    auth,

    async (req, res) => {

        try {

            const user =
                await User.findOne({

                    phoneNumber:
                        req.user
                            .phoneNumber,
                });

            return res.json({

                success: true,

                user,
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch user",
            });
        }
    },
);

module.exports =
    router;