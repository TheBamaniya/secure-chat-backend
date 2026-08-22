const express =
    require("express");

const auth =
    require("../middleware/authMiddleware");

const User =
    require("../models/User");


const router =
    express.Router();


/*
==================================================
HELPERS
==================================================
*/


function isValidDriveFolderId(
    folderId
) {

    if (
        typeof folderId !==
        "string"
    ) {

        return false;

    }


    const value =
        folderId.trim();


    /*
    Google Drive IDs are normally
    URL-safe strings.

    We deliberately keep this
    validation conservative.

    We do NOT need to validate
    the entire Google Drive API
    format here.
    */

    if (
        value.length < 10 ||
        value.length > 500
    ) {

        return false;

    }


    return /^[A-Za-z0-9_-]+$/.test(
        value
    );

}


/*
==================================================
PHONE NUMBER VALIDATION
==================================================

SecureChat currently uses Indian
10-digit mobile numbers without
the +91 country code.

==================================================
*/


function normalizePhoneNumber(
    phoneNumber
) {

    if (
        typeof phoneNumber !==
        "string"
    ) {

        return null;

    }


    const value =
        phoneNumber.trim();


    if (
        !/^[6-9][0-9]{9}$/.test(
            value
        )
    ) {

        return null;

    }


    return value;

}


/*
==================================================
PUBLIC KEY VALIDATION
==================================================

The browser exports the ECDH public
key as Base64.

We do not need to decode the key here.

We only make sure that:

- it is a string
- it is not empty
- it is not excessively large

==================================================
*/


function isValidPublicKey(
    publicKey
) {

    if (
        typeof publicKey !==
        "string"
    ) {

        return false;

    }


    const value =
        publicKey.trim();


    if (
        value.length < 20 ||
        value.length > 10000
    ) {

        return false;

    }


    /*
    Base64 characters only.

    Padding "=" is allowed.
    */

    return /^[A-Za-z0-9+/]+={0,2}$/.test(
        value
    );

}


/*
==================================================
CURRENT USER
==================================================
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


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found",

                });

            }


            return res.json({

                success: true,

                user,

            });

        }

        catch (error) {

            console.error(

                "GET CURRENT USER ERROR:",

                error

            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch user",

            });

        }

    }

);


/*
==================================================
REGISTER / UPDATE PUBLIC KEY
==================================================

The client generates its ECDH key pair
locally.

Only the PUBLIC key is sent here.

The private key NEVER leaves the
device.

==================================================
*/


router.put(

    "/public-key",

    auth,

    async (req, res) => {

        try {

            const publicKey =
                typeof req.body.publicKey ===
                "string"

                    ? req.body.publicKey.trim()

                    : "";


            if (
                !isValidPublicKey(
                    publicKey
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A valid public key is required.",

                });

            }


            const user =
                await User.findOne({

                    phoneNumber:
                        req.user
                            .phoneNumber,

                });


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found",

                });

            }


            /*
            ------------------------------------------
            STORE PUBLIC KEY ONLY
            ------------------------------------------
            */

            user.publicKey =
                publicKey;


            await user.save();


            return res.json({

                success: true,

                message:
                    "Public key registered successfully.",

            });

        }

        catch (error) {

            console.error(

                "REGISTER PUBLIC KEY ERROR:",

                error

            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to register public key",

            });

        }

    }

);


/*
==================================================
GET RECIPIENT PUBLIC KEY
==================================================

The authenticated client requests
the public key belonging to another
registered user.

IMPORTANT:

Only the public key is returned.

No private key or sensitive account
information is returned.

==================================================
*/


router.get(

    "/public-key/:phoneNumber",

    auth,

    async (req, res) => {

        try {

            const phoneNumber =
                normalizePhoneNumber(

                    req.params.phoneNumber

                );


            if (!phoneNumber) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid mobile number.",

                });

            }


            const user =
                await User.findOne({

                    phoneNumber,

                })
                .select(

                    "phoneNumber publicKey"

                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    registered: false,

                    message:
                        "User is not registered.",

                });

            }


            /*
            ------------------------------------------
            PUBLIC KEY NOT YET AVAILABLE
            ------------------------------------------
            */

            if (
                !user.publicKey
            ) {

                return res.status(404).json({

                    success: false,

                    registered: true,

                    publicKeyAvailable:
                        false,

                    message:
                        "User has not registered a public key yet.",

                });

            }


            /*
            ------------------------------------------
            RETURN PUBLIC KEY ONLY
            ------------------------------------------
            */

            return res.json({

                success: true,

                registered: true,

                publicKeyAvailable:
                    true,

                phoneNumber:
                    user.phoneNumber,

                publicKey:
                    user.publicKey,

            });

        }

        catch (error) {

            console.error(

                "GET RECIPIENT PUBLIC KEY ERROR:",

                error

            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch public key",

            });

        }

    }

);


/*
==================================================
GOOGLE DRIVE STATUS
==================================================

This endpoint returns only the
minimum metadata needed by the
client.

No Google access token is stored
or returned.

==================================================
*/


router.get(

    "/drive/status",

    auth,

    async (req, res) => {

        try {

            const user =
                await User.findOne({

                    phoneNumber:
                        req.user
                            .phoneNumber,

                })
                .select(

                    "googleDriveConnected googleDriveFolderId lastBackupAt"

                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found",

                });

            }


            return res.json({

                success: true,

                googleDriveConnected:
                    Boolean(
                        user.googleDriveConnected
                    ),

                googleDriveFolderId:
                    user.googleDriveFolderId ||
                    null,

                lastBackupAt:
                    user.lastBackupAt ||
                    null,

            });

        }

        catch (error) {

            console.error(

                "GET DRIVE STATUS ERROR:",

                error

            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch Google Drive status",

            });

        }

    }

);


/*
==================================================
CONNECT GOOGLE DRIVE
==================================================

IMPORTANT:

The client performs the actual
Google authorization.

The backend receives only:

- Drive folder ID

NO Google access token.
NO Google refresh token.
NO Google password.

==================================================
*/


router.post(

    "/drive/connect",

    auth,

    async (req, res) => {

        try {

            const {

                googleDriveFolderId,

            } = req.body;


            if (
                !isValidDriveFolderId(
                    googleDriveFolderId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A valid Google Drive folder ID is required.",

                });

            }


            const user =
                await User.findOne({

                    phoneNumber:
                        req.user
                            .phoneNumber,

                });


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found",

                });

            }


            /*
            ==========================================
            STORE ONLY DRIVE METADATA
            ==========================================
            */

            user.googleDriveConnected =
                true;

            user.googleDriveFolderId =
                googleDriveFolderId.trim();


            await user.save();


            return res.json({

                success: true,

                message:
                    "Google Drive connected.",

                googleDriveConnected:
                    true,

                googleDriveFolderId:
                    user.googleDriveFolderId,

                lastBackupAt:
                    user.lastBackupAt ||
                    null,

            });

        }

        catch (error) {

            console.error(

                "CONNECT GOOGLE DRIVE ERROR:",

                error

            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to connect Google Drive",

            });

        }

    }

);


/*
==================================================
UPDATE BACKUP STATUS
==================================================

Called by the client after an
encrypted backup has successfully
been uploaded.

The backend stores only the
timestamp.

Actual encrypted backup data
remains in Google Drive.

==================================================
*/


router.post(

    "/drive/backup-complete",

    auth,

    async (req, res) => {

        try {

            const user =
                await User.findOne({

                    phoneNumber:
                        req.user
                            .phoneNumber,

                });


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found",

                });

            }


            if (
                !user.googleDriveConnected
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Google Drive is not connected.",

                });

            }


            user.lastBackupAt =
                new Date();


            await user.save();


            return res.json({

                success: true,

                lastBackupAt:
                    user.lastBackupAt,

            });

        }

        catch (error) {

            console.error(

                "BACKUP COMPLETE ERROR:",

                error

            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to record backup status",

            });

        }

    }

);


/*
==================================================
DISCONNECT GOOGLE DRIVE
==================================================

This removes only the backend's
Drive metadata.

It does NOT delete the user's
Google Drive files.

The client will later decide
whether the encrypted backup
should remain in Drive.

==================================================
*/


router.post(

    "/drive/disconnect",

    auth,

    async (req, res) => {

        try {

            const user =
                await User.findOne({

                    phoneNumber:
                        req.user
                            .phoneNumber,

                });


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found",

                });

            }


            user.googleDriveConnected =
                false;

            user.googleDriveFolderId =
                "";

            user.lastBackupAt =
                undefined;


            await user.save();


            return res.json({

                success: true,

                message:
                    "Google Drive disconnected.",

            });

        }

        catch (error) {

            console.error(

                "DISCONNECT GOOGLE DRIVE ERROR:",

                error

            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to disconnect Google Drive",

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