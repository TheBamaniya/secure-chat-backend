const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

/*
PHONE NORMALIZATION
*/

function normalizePhoneNumber(number) {

    if (!number) {
        return null;
    }

    number = String(number)
        .replace(/\s/g, "")
        .replace(/-/g, "")
        .replace(/\(/g, "")
        .replace(/\)/g, "");

    if (number.startsWith("+91")) {
        number = number.substring(3);
    }

    if (
        number.startsWith("91") &&
        number.length > 10
    ) {
        number = number.substring(2);
    }

    if (
        number.startsWith("0") &&
        number.length === 11
    ) {
        number = number.substring(1);
    }

    return number;
}

/*
VALIDATE INDIAN MOBILE
*/

function isValidIndianMobile(number) {

    return /^[6-9][0-9]{9}$/.test(number);
}

/*
REGISTER
*/

router.post(
    "/register",
    async (req, res) => {

        try {

            let {
                phoneNumber,
                name,
                deviceId,
                deviceName,
                simHash,
                deviceHash,
            } = req.body;

            phoneNumber =
                normalizePhoneNumber(
                    phoneNumber
                );

            if (
                !isValidIndianMobile(
                    phoneNumber
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid mobile number",
                });
            }

            let user =
                await User.findOne({
                    phoneNumber,
                });

            if (user) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Number already registered",
                });
            }

            user =
                await User.create({

                    phoneNumber,

                    name:
                        name || "",

                    deviceId:
                        deviceId || "",

                    deviceName:
                        deviceName || "",

                    simHash:
                        simHash || "",

                    deviceHash:
                        deviceHash || "",
                });

            const token =
                jwt.sign(

                    {
                        phoneNumber:
                            user.phoneNumber,
                    },

                    process.env.JWT_SECRET,

                    {
                        expiresIn:
                            "30d",
                    }
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
    }
);

/*
LOGIN
*/

router.post(
    "/login",
    async (req, res) => {

        try {

            let {
                phoneNumber,
            } = req.body;

            phoneNumber =
                normalizePhoneNumber(
                    phoneNumber
                );

            if (
                !isValidIndianMobile(
                    phoneNumber
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid mobile number",
                });
            }

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

                    process.env.JWT_SECRET,

                    {
                        expiresIn:
                            "30d",
                    }
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
    }
);

module.exports = router;