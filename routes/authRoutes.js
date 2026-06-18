const express =
    require("express");

const jwt =
    require("jsonwebtoken");

const User =
    require("../models/User");

const router =
    express.Router();

/*
REGISTER USER
*/

router.post(

    "/register",

    async (req, res) => {

        try {

            const {

                phoneNumber,

                name,

            } = req.body;

            let user =
                await User.findOne({

                    phoneNumber,
                });

            if (!user) {

                user =
                    await User.create({

                        phoneNumber,

                        name:
                            name || "",
                    });
            }

            const token =
                jwt.sign(

                    {

                        phoneNumber:
                            user.phoneNumber,
                    },

                    process.env
                        .JWT_SECRET,

                    {

                        expiresIn:
                            "30d",
                    },
                );

            return res.json({

                success: true,

                token,

                user,
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,

                message:
                    "Registration failed",
            });
        }
    },
);

/*
LOGIN USER
*/

router.post(

    "/login",

    async (req, res) => {

        try {

            const {

                phoneNumber,

            } = req.body;

            const user =
                await User.findOne({

                    phoneNumber,
                });

            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found",
                });
            }

            const token =
                jwt.sign(

                    {

                        phoneNumber:
                            user.phoneNumber,
                    },

                    process.env
                        .JWT_SECRET,

                    {

                        expiresIn:
                            "30d",
                    },
                );

            return res.json({

                success: true,

                token,

                user,
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,

                message:
                    "Login failed",
            });
        }
    },
);

module.exports =
    router;