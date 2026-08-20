const express =
    require("express");

const jwt =
    require("jsonwebtoken");

const crypto =
    require("crypto");

const User =
    require("../models/User");

const router =
    express.Router();


/*
==================================================
PHONE NUMBER NORMALIZATION
==================================================
*/

function normalizePhoneNumber(number) {

    if (!number) {

        return null;
    }

    number =
        String(number)
            .trim()
            .replace(/\s/g, "")
            .replace(/-/g, "")
            .replace(/\(/g, "")
            .replace(/\)/g, "");

    /*
    Remove India country code.
    */

    if (
        number.startsWith("+91")
    ) {

        number =
            number.substring(3);

    } else if (

        number.startsWith("91") &&

        number.length === 12

    ) {

        number =
            number.substring(2);
    }

    /*
    Remove leading zero.
    */

    if (

        number.startsWith("0") &&

        number.length === 11

    ) {

        number =
            number.substring(1);
    }

    return number;
}


/*
==================================================
INDIAN MOBILE VALIDATION
==================================================

Must be exactly 10 digits
and begin with 6, 7, 8 or 9.
==================================================
*/

function isValidIndianMobile(
    number
) {

    return /^[6-9][0-9]{9}$/.test(
        number
    );
}


/*
==================================================
HASH DEVICE INFORMATION
==================================================

The server never needs to store
raw device fingerprint material.

This helper is available for
future verification logic.
==================================================
*/

function createDeviceHash(
    deviceId,
    deviceName
) {

    const value =

        `${deviceId || ""}|${deviceName || ""}`;

    return crypto
        .createHash("sha256")
        .update(value)
        .digest("hex");
}


/*
==================================================
CREATE JWT
==================================================
*/

function createToken(
    phoneNumber
) {

    return jwt.sign(

        {
            phoneNumber,
        },

        process.env.JWT_SECRET,

        {
            expiresIn: "30d",
        }
    );
}


/*
==================================================
REGISTER
==================================================
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


            /*
            PHONE
            */

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
                        "Invalid Indian mobile number. Enter exactly 10 digits without the country code.",
                });
            }


            /*
            DEVICE ID
            */

            if (
                !deviceId ||
                typeof deviceId !== "string"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Device ID is required.",
                });
            }


            /*
            DEVICE HASH
            */

            if (
                !deviceHash ||
                typeof deviceHash !== "string"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Device fingerprint is required.",
                });
            }


            /*
            FIND EXISTING USER
            */

            const existingUser =
                await User.findOne({

                    phoneNumber,
                });


            if (
                existingUser
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This mobile number is already registered.",
                });
            }


            /*
            CREATE USER
            */

            const user =
                await User.create({

                    phoneNumber,

                    name:
                        typeof name ===
                        "string"
                            ? name.trim()
                            : "",

                    deviceId,

                    deviceName:
                        deviceName || "",

                    simHash:
                        simHash || "",

                    deviceHash,

                    registeredAt:
                        new Date(),

                    lastDeviceChange:
                        new Date(),

                    accountStatus:
                        "active",

                    online:
                        false,

                    lastSeen:
                        new Date(),
                });


            /*
            CREATE JWT
            */

            const token =
                createToken(
                    user.phoneNumber
                );


            return res.status(201).json({

                success: true,

                message:
                    "Registration successful.",

                token,

                user: {

                    phoneNumber:
                        user.phoneNumber,

                    name:
                        user.name,

                    deviceId:
                        user.deviceId,

                    deviceName:
                        user.deviceName,

                    accountStatus:
                        user.accountStatus,
                },
            });

        } catch (error) {

            console.error(

                "REGISTRATION ERROR:",

                error
            );


            /*
            MONGODB DUPLICATE KEY
            */

            if (
                error.code === 11000
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This mobile number is already registered.",
                });
            }


            return res.status(500).json({

                success: false,

                message:
                    "Registration failed.",
            });
        }
    }
);


/*
==================================================
LOGIN
==================================================
*/

router.post(
    "/login",
    async (req, res) => {

        try {

            let {

                phoneNumber,

                deviceId,

                deviceName,

                simHash,

                deviceHash,

            } = req.body;


            /*
            PHONE
            */

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
                        "Invalid Indian mobile number. Enter exactly 10 digits without the country code.",
                });
            }


            /*
            DEVICE INFORMATION
            */

            if (
                !deviceId ||
                !deviceHash
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Device verification information is required.",
                });
            }


            /*
            FIND USER
            */

            const user =
                await User.findOne({

                    phoneNumber,
                });


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found. Please register first.",
                });
            }


            /*
            ACCOUNT STATUS
            */

            if (
                user.accountStatus ===
                "blocked"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "This account is blocked.",
                });
            }


            /*
            DEVICE VERIFICATION
            */

            const deviceMatches =

                user.deviceId ===
                deviceId;


            const deviceHashMatches =

                user.deviceHash ===
                deviceHash;


            /*
            UNKNOWN DEVICE
            */

            if (

                !deviceMatches ||

                !deviceHashMatches

            ) {

                /*
                Do NOT overwrite the
                registered device.

                We need a separate recovery /
                verification flow later.
                */

                return res.status(403).json({

                    success: false,

                    code:
                        "DEVICE_VERIFICATION_REQUIRED",

                    message:
                        "This account is registered to another device. Device verification is required before login.",
                });
            }


            /*
            SIM CHANGE

            A SIM change should NOT
            permanently lock the account.

            We mark the account for
            additional verification.
            */

            let verificationRequired =
                false;


            if (

                user.simHash &&

                simHash &&

                user.simHash !==
                simHash

            ) {

                verificationRequired =
                    true;

                user.accountStatus =
                    "verification_required";

                user.lastDeviceChange =
                    new Date();

                await user.save();
            }


            /*
            UPDATE LAST SEEN
            */

            user.lastSeen =
                new Date();


            /*
            If the SIM has not changed,
            make sure an old temporary
            verification state is not
            preserved.
            */

            if (
                !verificationRequired &&

                user.accountStatus ===
                    "verification_required"
            ) {

                user.accountStatus =
                    "active";
            }


            await user.save();


            /*
            CREATE JWT
            */

            const token =
                createToken(
                    user.phoneNumber
                );


            return res.json({

                success: true,

                token,

                verificationRequired,

                user: {

                    phoneNumber:
                        user.phoneNumber,

                    name:
                        user.name,

                    deviceId:
                        user.deviceId,

                    deviceName:
                        user.deviceName,

                    accountStatus:
                        user.accountStatus,
                },
            });

        } catch (error) {

            console.error(

                "LOGIN ERROR:",

                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Login failed.",
            });
        }
    }
);


module.exports =
    router;