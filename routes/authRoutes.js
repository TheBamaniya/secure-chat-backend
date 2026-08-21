const express =
    require("express");

const jwt =
    require("jsonwebtoken");

const User =
    require("../models/User");

const Device =
    require("../models/Device");

const router =
    express.Router();


/*
==================================================
PHONE NUMBER NORMALIZATION
==================================================
*/

function normalizePhoneNumber(
    number
) {

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

    }

    else if (

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

Exactly 10 digits.

First digit:
6, 7, 8 or 9.
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
CREATE JWT
==================================================
*/

function createToken(
    phoneNumber,
    deviceId
) {

    return jwt.sign(

        {

            phoneNumber,

            deviceId,

        },

        process.env.JWT_SECRET,

        {

            expiresIn:
                "30d",

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
            ==========================================
            PHONE
            ==========================================
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
            ==========================================
            DEVICE ID
            ==========================================
            */

            if (

                !deviceId ||

                typeof deviceId !==
                    "string"

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Device ID is required.",

                });

            }


            /*
            ==========================================
            DEVICE HASH
            ==========================================
            */

            if (

                !deviceHash ||

                typeof deviceHash !==
                    "string"

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Device fingerprint is required.",

                });

            }


            /*
            ==========================================
            FIND USER
            ==========================================
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
            ==========================================
            CHECK DEVICE ID
            ==========================================
            */

            const existingDevice =
                await Device.findOne({

                    deviceId,

                });


            if (
                existingDevice
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This device is already registered.",

                });

            }


            /*
            ==========================================
            CREATE USER
            ==========================================
            */

            const user =
                await User.create({

                    phoneNumber,

                    name:
                        typeof name ===
                        "string"
                            ? name.trim()
                            : "",

                    /*
                    These fields are retained in
                    User for backward compatibility.

                    Device.js is now the authoritative
                    device registry.
                    */

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
            ==========================================
            CREATE PRIMARY DEVICE
            ==========================================
            */

            await Device.create({

                phoneNumber,

                deviceId,

                deviceHash,

                simHash:
                    simHash || "",

                deviceName:
                    deviceName || "",

                status:
                    "active",

                isPrimary:
                    true,

                registeredAt:
                    new Date(),

                lastChangedAt:
                    new Date(),

                lastSeenAt:
                    new Date(),

                lastLoginAt:
                    new Date(),

                lastIpAddress:
                    req.ip || "",

            });


            /*
            ==========================================
            CREATE TOKEN
            ==========================================
            */

            const token =
                createToken(

                    user.phoneNumber,

                    deviceId

                );


            /*
            ==========================================
            RESPONSE
            ==========================================
            */

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

                    deviceId,

                    deviceName:
                        deviceName || "",

                    accountStatus:
                        user.accountStatus,

                },

            });

        }

        catch (error) {

            console.error(

                "REGISTRATION ERROR:",

                error

            );


            /*
            MongoDB duplicate key.
            */

            if (
                error.code === 11000
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This account or device is already registered.",

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
            ==========================================
            PHONE
            ==========================================
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
            ==========================================
            DEVICE INFORMATION
            ==========================================
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
            ==========================================
            FIND USER
            ==========================================
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
            ==========================================
            ACCOUNT STATUS
            ==========================================
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
            ==========================================
            FIND DEVICE
            ==========================================
            */

            const device =
                await Device.findOne({

                    phoneNumber,

                    deviceId,

                });


            /*
            ==========================================
            UNKNOWN DEVICE
            ==========================================
            */

            if (!device) {

                return res.status(403).json({

                    success: false,

                    code:
                        "DEVICE_VERIFICATION_REQUIRED",

                    message:
                        "This account is registered to another device. Device verification is required before login.",

                });

            }


            /*
            ==========================================
            DEVICE STATUS
            ==========================================
            */

            if (

                device.status ===
                "blocked" ||

                device.status ===
                "revoked"

            ) {

                return res.status(403).json({

                    success: false,

                    code:
                        "DEVICE_BLOCKED",

                    message:
                        "This device is not authorized to access this account.",

                });

            }


            /*
            ==========================================
            DEVICE HASH VERIFICATION
            ==========================================
            */

            if (

                device.deviceHash !==
                deviceHash

            ) {

                return res.status(403).json({

                    success: false,

                    code:
                        "DEVICE_VERIFICATION_REQUIRED",

                    message:
                        "Device verification is required.",

                });

            }


            /*
            ==========================================
            SIM CHANGE
            ==========================================

            A changed SIM does not permanently
            destroy the account.

            It triggers additional verification.
            ==========================================
            */

            let verificationRequired =
                false;


            if (

                device.simHash &&

                simHash &&

                device.simHash !==
                simHash

            ) {

                verificationRequired =
                    true;

                device.status =
                    "verification_required";

                user.accountStatus =
                    "verification_required";

                user.lastDeviceChange =
                    new Date();

            }


            /*
            ==========================================
            If SIM matches, restore active state
            when the previous state was temporary
            verification_required.
            ==========================================
            */

            else if (

                device.status ===
                "verification_required"

            ) {

                /*
                Do not automatically clear
                verification_required.

                The recovery/verification
                endpoint will handle that later.
                */

                verificationRequired =
                    true;

            }


            /*
            ==========================================
            UPDATE DEVICE
            ==========================================
            */

            device.deviceName =
                deviceName ||
                device.deviceName;

            device.lastSeenAt =
                new Date();

            device.lastLoginAt =
                new Date();

            device.lastIpAddress =
                req.ip || "";


            /*
            ==========================================
            UPDATE USER
            ==========================================
            */

            user.lastSeen =
                new Date();


            await device.save();

            await user.save();


            /*
            ==========================================
            CREATE TOKEN
            ==========================================
            */

            const token =
                createToken(

                    user.phoneNumber,

                    device.deviceId

                );


            /*
            ==========================================
            RESPONSE
            ==========================================
            */

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
                        device.deviceId,

                    deviceName:
                        device.deviceName,

                    accountStatus:
                        user.accountStatus,

                },

            });

        }

        catch (error) {

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