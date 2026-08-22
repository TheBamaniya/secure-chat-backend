const jwt =
    require("jsonwebtoken");

const Message =
    require("../models/Message");

const User =
    require("../models/User");

const generateMessageId =
    require("../utils/generateMessageId");


/*
==================================================
CONNECTED USERS

phoneNumber -> socket information

Current architecture allows one active socket
per account.
==================================================
*/

const users = {};


/*
==================================================
NORMALIZE PHONE NUMBER
==================================================
*/

function normalizeNumber(number) {

    if (!number) {

        return "";
    }

    number =
        String(number)
            .replace(/\s/g, "")
            .replace(/-/g, "")
            .replace(/\(/g, "")
            .replace(/\)/g, "");

    if (
        number.startsWith("+91")
    ) {

        number =
            number.substring(3);

    } else if (

        number.startsWith("91") &&

        number.length > 10

    ) {

        number =
            number.substring(2);
    }

    if (
        number.startsWith("0") &&
        number.length === 11
    ) {

        number =
            number.substring(1);
    }

    if (
        number.length > 10
    ) {

        number =
            number.slice(-10);
    }

    return number;
}


/*
==================================================
GET CONNECTED USER
==================================================
*/

function getConnectedUser(number) {

    const normalized =
        normalizeNumber(number);

    return users[
        normalized
    ];
}


/*
==================================================
EMIT TO USER

Returns true if online.
==================================================
*/

function emitToUser(
    io,
    number,
    event,
    payload
) {

    const user =
        getConnectedUser(number);

    if (!user) {

        return false;
    }

    io.to(
        user.socketId
    ).emit(
        event,
        payload
    );

    return true;
}


/*
==================================================
VERIFY SOCKET JWT
==================================================
*/

function authenticateSocket(
    socket,
    next
) {

    try {

        const auth =
            socket.handshake.auth || {};

        const token =
            auth.token;

        if (!token) {

            return next(
                new Error(
                    "Authentication required"
                )
            );
        }

        const decoded =
            jwt.verify(

                token,

                process.env.JWT_SECRET
            );

        if (
            !decoded ||
            !decoded.phoneNumber
        ) {

            return next(
                new Error(
                    "Invalid authentication token"
                )
            );
        }

        const phoneNumber =
            normalizeNumber(
                decoded.phoneNumber
            );

        if (!phoneNumber) {

            return next(
                new Error(
                    "Invalid user"
                )
            );
        }

        /*
        Store authenticated identity
        directly on socket.

        We NEVER trust sender
        information from events.
        */

        socket.user = {

            phoneNumber,
        };

        next();

    } catch (error) {

        console.error(
            "SOCKET AUTH ERROR:",
            error.message
        );

        return next(
            new Error(
                "Authentication failed"
            )
        );
    }
}


/*
==================================================
SOCKET SERVER
==================================================
*/

module.exports =
(io) => {

    /*
    Authenticate BEFORE connection
    is accepted.
    */

    io.use(
        authenticateSocket
    );


    io.on(

        "connection",

        (socket) => {

            const user =
                socket.user
                    .phoneNumber;

            console.log(

                "AUTHENTICATED SOCKET:",

                user,

                socket.id
            );


            /*
            ==========================================
            REGISTER AUTHENTICATED USER
            ==========================================
            */

            const previousUser =
                users[user];

            if (
                previousUser &&
                previousUser.socketId !==
                    socket.id
            ) {

                /*
                Disconnect previous socket
                for this account.

                This gives us one active
                connection per account
                for the current version.
                */

                const previousSocket =
                    io.sockets.sockets.get(
                        previousUser.socketId
                    );

                if (
                    previousSocket
                ) {

                    previousSocket.disconnect(
                        true
                    );
                }
            }

            users[user] = {

                socketId:
                    socket.id,

                online:
                    true,
            };


            socket.data.phoneNumber =
                user;


            /*
            ==========================================
            UPDATE LAST SEEN
            ==========================================
            */

            User.findOneAndUpdate(

                {
                    phoneNumber:
                        user,
                },

                {
                    lastSeen:
                        new Date(),
                }

            ).catch(

                (error) => {

                    console.error(

                        "UPDATE LAST SEEN ERROR:",

                        error
                    );
                }
            );


            socket.emit(

                "socket_authenticated",

                {

                    phoneNumber:
                        user,

                    socketId:
                        socket.id,
                }
            );


            socket.broadcast.emit(

                "user_online",

                user
            );


            /*
            ==========================================
            PRESENCE CHECK
            ==========================================
            */

            socket.on(

                "check_user_presence",

                async (data) => {

                    try {

                        if (!data) {

                            return;
                        }

                        const requestedNumber =
                            normalizeNumber(
                                data.phoneNumber
                            );


                        if (
                            !requestedNumber
                        ) {

                            socket.emit(

                                "user_presence",

                                {

                                    phoneNumber:
                                        "",

                                    registered:
                                        false,

                                    online:
                                        false,

                                    lastSeenAt:
                                        null,
                                }
                            );

                            return;
                        }


                        const registeredUser =
                            await User.findOne({

                                phoneNumber:
                                    requestedNumber,

                            }).select(

                                "phoneNumber lastSeen"
                            );


                        const connectedUser =
                            getConnectedUser(
                                requestedNumber
                            );


                        socket.emit(

                            "user_presence",

                            {

                                phoneNumber:
                                    requestedNumber,

                                registered:
                                    Boolean(
                                        registeredUser
                                    ),

                                online:
                                    Boolean(
                                        connectedUser
                                    ),

                                lastSeenAt:
                                    registeredUser
                                        ? (
                                            registeredUser
                                                .lastSeen ||
                                            null
                                        )
                                        : null,
                            }
                        );

                    } catch (error) {

                        console.error(

                            "USER PRESENCE ERROR:",

                            error
                        );


                        socket.emit(

                            "user_presence",

                            {

                                phoneNumber:
                                    normalizeNumber(
                                        data &&
                                        data.phoneNumber
                                    ),

                                registered:
                                    false,

                                online:
                                    false,

                                lastSeenAt:
                                    null,
                            }
                        );
                    }
                }
            );


            /*
            ==========================================
            TYPING
            ==========================================
            */

            socket.on(

                "typing",

                (data) => {

                    if (!data) {

                        return;
                    }

                    const receiver =
                        normalizeNumber(
                            data.receiver
                        );

                    if (!receiver) {

                        return;
                    }

                    emitToUser(

                        io,

                        receiver,

                        "typing",

                        {

                            sender:
                                user,
                        }
                    );
                }
            );


            /*
            ==========================================
            STOP TYPING
            ==========================================
            */

            socket.on(

                "stop_typing",

                (data) => {

                    if (!data) {

                        return;
                    }

                    const receiver =
                        normalizeNumber(
                            data.receiver
                        );

                    if (!receiver) {

                        return;
                    }

                    emitToUser(

                        io,

                        receiver,

                        "stop_typing",

                        {

                            sender:
                                user,
                        }
                    );
                }
            );


            /*
            ==========================================
            MESSAGE SEEN
            ==========================================
            */

            socket.on(

                "message_seen",

                async (data) => {

                    try {

                        if (!data) {

                            return;
                        }

                        const messageId =
                            data.messageId;

                        if (!messageId) {

                            return;
                        }

                        const message =
                            await Message.findOne({

                                messageId,
                            });

                        if (!message) {

                            return;
                        }


                        /*
                        ONLY RECEIVER CAN
                        MARK MESSAGE AS SEEN
                        */

                        if (
                            message.receiver !==
                            user
                        ) {

                            return;
                        }

                        message.status =
                            "seen";

                        message.seenAt =
                            new Date();

                        message.syncVersion +=
                            1;

                        message.syncState =
                            "pending";

                        await message.save();


                        emitToUser(

                            io,

                            message.sender,

                            "message_seen",

                            {

                                messageId,

                                seenAt:
                                    message.seenAt,
                            }
                        );

                    } catch (error) {

                        console.error(

                            "MESSAGE SEEN ERROR:",

                            error
                        );
                    }
                }
            );


            /*
            ==========================================
            SEND MESSAGE
            ==========================================

            IMPORTANT:

            Plaintext message text is NOT accepted.

            The client must send:

            encryptedContent
            encryptionAlgorithm
            senderPublicKey

            The backend stores and forwards the
            encrypted envelope only.

            ==========================================
            */

            socket.on(

                "send_message",

                async (data) => {

                    try {

                        if (!data) {

                            socket.emit(

                                "message_send_failed",

                                {

                                    localMessageId:
                                        "",

                                    message:
                                        "Message data is missing",
                                }
                            );

                            return;
                        }


                        /*
                        ======================================
                        AUTHENTICATED SENDER
                        ======================================
                        */

                        const sender =
                            user;


                        /*
                        ======================================
                        RECEIVER
                        ======================================
                        */

                        const receiver =
                            normalizeNumber(
                                data.receiver
                            );


                        if (!receiver) {

                            socket.emit(

                                "message_send_failed",

                                {

                                    localMessageId:
                                        data.localMessageId ||
                                        "",

                                    message:
                                        "Invalid receiver",
                                }
                            );

                            return;
                        }


                        /*
                        ======================================
                        SELF MESSAGE
                        ======================================
                        */

                        if (
                            sender ===
                            receiver
                        ) {

                            socket.emit(

                                "message_send_failed",

                                {

                                    localMessageId:
                                        data.localMessageId ||
                                        "",

                                    message:
                                        "Invalid receiver",
                                }
                            );

                            return;
                        }


                        /*
                        ======================================
                        ENCRYPTED CONTENT VALIDATION
                        ======================================
                        */

                        const encryptedContent =
                            typeof data.encryptedContent ===
                            "string"
                                ? data.encryptedContent.trim()
                                : "";


                        if (!encryptedContent) {

                            socket.emit(

                                "message_send_failed",

                                {

                                    localMessageId:
                                        data.localMessageId ||
                                        "",

                                    message:
                                        "Encrypted message content is required",
                                }
                            );

                            return;
                        }


                        /*
                        ======================================
                        ENCRYPTION ALGORITHM
                        ======================================
                        */

                        const encryptionAlgorithm =
                            typeof data.encryptionAlgorithm ===
                            "string"
                                ? data.encryptionAlgorithm.trim()
                                : "";


                        if (
                            encryptionAlgorithm !==
                            "ECDH-P256-AES-GCM"
                        ) {

                            socket.emit(

                                "message_send_failed",

                                {

                                    localMessageId:
                                        data.localMessageId ||
                                        "",

                                    message:
                                        "Unsupported encryption algorithm",
                                }
                            );

                            return;
                        }


                        /*
                        ======================================
                        SENDER PUBLIC KEY
                        ======================================
                        */

                        const senderPublicKey =
                            typeof data.senderPublicKey ===
                            "string"
                                ? data.senderPublicKey.trim()
                                : "";


                        if (!senderPublicKey) {

                            socket.emit(

                                "message_send_failed",

                                {

                                    localMessageId:
                                        data.localMessageId ||
                                        "",

                                    message:
                                        "Sender public key is required",
                                }
                            );

                            return;
                        }


                        /*
                        ======================================
                        MESSAGE ID
                        ======================================
                        */

                        const messageId =
                            generateMessageId();


                        /*
                        ======================================
                        CREATE MESSAGE
                        ======================================

                        IMPORTANT:

                        No plaintext text field is
                        written to MongoDB.

                        ======================================
                        */

                        const metadata =
                            await Message.create({

                                messageId,

                                sender,

                                receiver,

                                messageType:
                                    data.messageType ||
                                    "text",

                                encryptedContent,

                                encryptionAlgorithm,

                                senderPublicKey,

                                localMessageId:
                                    data.localMessageId ||
                                    "",

                                replyTo:
                                    data.replyTo ||
                                    "",

                                replyPreview:
                                    data.replyPreview ||
                                    "",

                                thumbnail:
                                    data.thumbnail ||
                                    "",

                                fileName:
                                    data.fileName ||
                                    "",

                                fileSize:
                                    Number(
                                        data.fileSize
                                    ) || 0,

                                driveFileId:
                                    data.driveFileId ||
                                    "",

                                backupHash:
                                    data.backupHash ||
                                    "",

                                syncedToDrive:
                                    false,

                                syncState:
                                    "pending",

                                status:
                                    "sent",
                            });


                        /*
                        ======================================
                        ENCRYPTED DELIVERY PAYLOAD
                        ======================================

                        Only encrypted content and
                        metadata leave the backend.

                        ======================================
                        */

                        const payload = {

                            messageId,

                            sender,

                            receiver,

                            localMessageId:
                                data.localMessageId ||
                                "",

                            messageType:
                                data.messageType ||
                                "text",

                            encryptedContent,

                            encryptionAlgorithm,

                            senderPublicKey,

                            replyTo:
                                data.replyTo ||
                                "",

                            replyPreview:
                                data.replyPreview ||
                                "",

                            thumbnail:
                                data.thumbnail ||
                                "",

                            fileName:
                                data.fileName ||
                                "",

                            fileSize:
                                Number(
                                    data.fileSize
                                ) || 0,

                            timestamp:
                                metadata.timestamp,

                            sentAt:
                                metadata.sentAt,
                        };


                        /*
                        ======================================
                        TRY DELIVERY
                        ======================================
                        */

                        const delivered =
                            emitToUser(

                                io,

                                receiver,

                                "receive_message",

                                {

                                    ...payload,

                                    status:
                                        "delivered",
                                }
                            );


                        /*
                        ======================================
                        DELIVERED
                        ======================================
                        */

                        if (
                            delivered
                        ) {

                            metadata.status =
                                "delivered";

                            metadata.deliveredAt =
                                new Date();

                            metadata.syncVersion +=
                                1;

                            await metadata.save();


                            /*
                            Tell sender that the
                            receiver actually received
                            the socket event.
                            */

                            emitToUser(

                                io,

                                sender,

                                "message_delivered",

                                {

                                    messageId,

                                    localMessageId:
                                        data.localMessageId ||
                                        "",

                                    deliveredAt:
                                        metadata.deliveredAt,
                                }
                            );

                        }


                        /*
                        ======================================
                        RECEIVER OFFLINE
                        ======================================

                        Keep the message as SENT.

                        The sender is informed that
                        the backend accepted the message.

                        ======================================
                        */

                        else {

                            emitToUser(

                                io,

                                sender,

                                "message_sent",

                                {

                                    messageId,

                                    localMessageId:
                                        data.localMessageId ||
                                        "",

                                    timestamp:
                                        metadata.timestamp,
                                }
                            );

                        }

                    } catch (error) {

                        console.error(

                            "SEND MESSAGE ERROR:",

                            error
                        );


                        socket.emit(

                            "message_send_failed",

                            {

                                localMessageId:
                                    data &&
                                    data.localMessageId
                                        ? data.localMessageId
                                        : "",

                                message:
                                    "Message could not be sent",
                            }
                        );
                    }
                }
            );


            /*
            ==========================================
            REAL-TIME REACTION
            ==========================================
            */

            socket.on(

                "message_reaction",

                async (data) => {

                    try {

                        if (!data) {

                            return;
                        }

                        const messageId =
                            data.messageId;

                        const emoji =
                            data.emoji;

                        if (
                            !messageId ||
                            !emoji
                        ) {

                            return;
                        }

                        const message =
                            await Message.findOne({

                                messageId,
                            });

                        if (!message) {

                            return;
                        }


                        /*
                        ONLY PARTICIPANTS
                        CAN REACT
                        */

                        if (

                            message.sender !== user &&

                            message.receiver !== user

                        ) {

                            return;
                        }


                        const existingIndex =
                            message.reactions
                                .findIndex(

                                    (reaction) =>

                                        reaction.user ===
                                        user
                                );


                        let action;


                        /*
                        SAME EMOJI
                        REMOVE
                        */

                        if (

                            existingIndex !== -1 &&

                            message.reactions[
                                existingIndex
                            ].emoji === emoji

                        ) {

                            message.reactions.splice(

                                existingIndex,

                                1
                            );

                            action =
                                "removed";

                        }


                        /*
                        DIFFERENT EMOJI
                        REPLACE
                        */

                        else if (
                            existingIndex !== -1
                        ) {

                            message.reactions[
                                existingIndex
                            ].emoji =
                                emoji;

                            message.reactions[
                                existingIndex
                            ].reactedAt =
                                new Date();

                            action =
                                "replaced";
                        }


                        /*
                        ADD
                        */

                        else {

                            message.reactions.push({

                                user,

                                emoji,

                                reactedAt:
                                    new Date(),
                            });

                            action =
                                "added";
                        }


                        message.syncVersion +=
                            1;

                        message.syncState =
                            "pending";

                        await message.save();


                        const payload = {

                            messageId,

                            emoji,

                            reactedBy:
                                user,

                            action,

                            reactions:
                                message.reactions,
                        };


                        emitToUser(

                            io,

                            message.sender,

                            "message_reaction",

                            payload
                        );


                        if (
                            message.receiver !==
                            message.sender
                        ) {

                            emitToUser(

                                io,

                                message.receiver,

                                "message_reaction",

                                payload
                            );
                        }

                    } catch (error) {

                        console.error(

                            "REACTION SOCKET ERROR:",

                            error
                        );
                    }
                }
            );


            /*
            ==========================================
            MESSAGE EDITED
            ==========================================
            */

            socket.on(

                "message_edited",

                async (data) => {

                    try {

                        if (!data) {

                            return;
                        }

                        const messageId =
                            data.messageId;

                        if (!messageId) {

                            return;
                        }

                        const message =
                            await Message.findOne({

                                messageId,
                            });

                        if (!message) {

                            return;
                        }


                        /*
                        ONLY SENDER
                        CAN EDIT
                        */

                        if (
                            message.sender !==
                            user
                        ) {

                            return;
                        }


                        if (
                            message.deletedForEveryone
                        ) {

                            return;
                        }


                        message.edited =
                            true;

                        message.editedAt =
                            new Date();

                        message.syncVersion +=
                            1;

                        message.syncState =
                            "pending";

                        await message.save();


                        const payload = {

                            messageId,

                            editedAt:
                                message.editedAt,
                        };


                        emitToUser(

                            io,

                            message.receiver,

                            "message_edited",

                            payload
                        );


                        emitToUser(

                            io,

                            user,

                            "message_edited",

                            payload
                        );

                    } catch (error) {

                        console.error(

                            "MESSAGE EDIT ERROR:",

                            error
                        );
                    }
                }
            );


            /*
            ==========================================
            DELETE FOR EVERYONE
            ==========================================
            */

            socket.on(

                "message_deleted_for_everyone",

                async (data) => {

                    try {

                        if (!data) {

                            return;
                        }

                        const messageId =
                            data.messageId;

                        if (!messageId) {

                            return;
                        }

                        const message =
                            await Message.findOne({

                                messageId,
                            });

                        if (!message) {

                            return;
                        }


                        /*
                        ONLY SENDER
                        */

                        if (
                            message.sender !==
                            user
                        ) {

                            return;
                        }


                        message.deletedForEveryone =
                            true;

                        message.deletedAt =
                            new Date();

                        message.syncVersion +=
                            1;

                        message.syncState =
                            "pending";

                        await message.save();


                        const payload = {

                            messageId,

                            deletedAt:
                                message.deletedAt,
                        };


                        emitToUser(

                            io,

                            message.receiver,

                            "message_deleted_for_everyone",

                            payload
                        );


                        emitToUser(

                            io,

                            user,

                            "message_deleted_for_everyone",

                            payload
                        );

                    } catch (error) {

                        console.error(

                            "DELETE FOR EVERYONE ERROR:",

                            error
                        );
                    }
                }
            );


            /*
            ==========================================
            DELETE FOR ME
            ==========================================
            */

            socket.on(

                "message_deleted_for_me",

                async (data) => {

                    try {

                        if (!data) {

                            return;
                        }

                        const messageId =
                            data.messageId;

                        if (!messageId) {

                            return;
                        }


                        const message =
                            await Message.findOne({

                                messageId,
                            });

                        if (!message) {

                            return;
                        }


                        /*
                        ONLY PARTICIPANTS
                        */

                        if (

                            message.sender !== user &&

                            message.receiver !== user

                        ) {

                            return;
                        }


                        await Message.updateOne(

                            {
                                messageId,
                            },

                            {

                                $addToSet: {

                                    deletedFor:
                                        user,
                                },

                                $inc: {

                                    syncVersion:
                                        1,
                                },

                                $set: {

                                    syncState:
                                        "pending",
                                },
                            }
                        );


                        emitToUser(

                            io,

                            user,

                            "message_deleted_for_me",

                            {

                                messageId,
                            }
                        );

                    } catch (error) {

                        console.error(

                            "DELETE FOR ME ERROR:",

                            error
                        );
                    }
                }
            );


            /*
            ==========================================
            DISCONNECT
            ==========================================
            */

            socket.on(

                "disconnect",

                async () => {

                    /*
                    Only remove this user's entry
                    if it still belongs to this
                    exact socket.

                    This prevents an old socket
                    from accidentally marking a
                    newer connection offline.
                    */

                    if (

                        users[user] &&

                        users[user].socketId ===
                            socket.id

                    ) {

                        delete users[user];


                        /*
                        Record last seen.
                        */

                        try {

                            await User.findOneAndUpdate(

                                {
                                    phoneNumber:
                                        user,
                                },

                                {
                                    lastSeen:
                                        new Date(),
                                }
                            );

                        } catch (error) {

                            console.error(

                                "UPDATE LAST SEEN ON DISCONNECT ERROR:",

                                error
                            );
                        }


                        socket.broadcast.emit(

                            "user_offline",

                            user
                        );
                    }


                    console.log(

                        "DISCONNECTED:",

                        user,

                        socket.id
                    );
                }
            );
        }
    );
};