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
PUBLIC KEY
==================================================

The client sends ONLY its public key.

The private key must remain on the
user's device and must NEVER be sent
to the backend.

==================================================
*/


router.put(

    "/public-key",

    auth,

    async (req, res) => {

        try {

            const {
                publicKey,
            } = req.body;


            if (
                typeof publicKey !==
                    "string" ||

                !publicKey.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Public key is required.",

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


            user.publicKey =
                publicKey.trim();


            await user.save();


            return res.json({

                success: true,

                publicKey:
                    user.publicKey,

            });

        }

        catch (error) {

            console.error(

                "UPDATE PUBLIC KEY ERROR:",

                error

            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to update public key",

            });

        }

    }

);


/*
==================================================
GET PUBLIC KEY
==================================================

Returns only the recipient's public key.

The private key is never stored or
returned by the backend.

==================================================
*/


router.get(

    "/public-key/:phoneNumber",

    auth,

    async (req, res) => {

        try {

            const user =
                await User.findOne({

                    phoneNumber:
                        req.params.phoneNumber,

                }).select(
                    "phoneNumber publicKey"
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

                phoneNumber:
                    user.phoneNumber,

                publicKey:
                    user.publicKey || "",

            });

        }

        catch (error) {

            console.error(

                "GET PUBLIC KEY ERROR:",

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

The mobile client performs the
actual Google authorization.

The backend receives only:

- Drive folder ID
- optional last backup timestamp

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