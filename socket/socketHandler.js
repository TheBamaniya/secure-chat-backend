const Message =
    require(
        "../models/Message"
    );

const generateMessageId =
    require(
        "../utils/generateMessageId"
    );

const users = {};

function normalizeNumber(
    number
) {

    if (!number) {
        return "";
    }

    number =
        String(number)
            .replace(/\s/g, "")
            .replace(/-/g, "");

    if (
        number.startsWith(
            "+91"
        )
    ) {

        number =
            number.substring(3);

    } else if (

        number.startsWith(
            "91"
        ) &&

        number.length > 10
    ) {

        number =
            number.substring(2);
    }

    if (
        number.length > 10
    ) {

        number =
            number.slice(-10);
    }

    return number;
}

module.exports =
(io) => {

    io.on(

        "connection",

        (socket) => {

            console.log(
                "CONNECTED:",
                socket.id
            );

            /*
            REGISTER
            */

            socket.on(

                "register",

                (number) => {

                    const normalized =
                        normalizeNumber(
                            number
                        );

                    users[
                        normalized
                    ] = {

                        socketId:
                            socket.id,

                        online:
                            true,
                    };

                    socket.broadcast.emit(

                        "user_online",

                        normalized
                    );

                    console.log(

                        "REGISTERED:",

                        normalized
                    );
                }
            );

            /*
            TYPING
            */

            socket.on(

                "typing",

                (data) => {

                    const receiver =
                        users[
                            normalizeNumber(
                                data.receiver
                            )
                        ];

                    if (
                        receiver
                    ) {

                        io.to(

                            receiver.socketId

                        ).emit(

                            "typing",

                            {

                                sender:
                                    data.sender,
                            }
                        );
                    }
                }
            );

            socket.on(

                "stop_typing",

                (data) => {

                    const receiver =
                        users[
                            normalizeNumber(
                                data.receiver
                            )
                        ];

                    if (
                        receiver
                    ) {

                        io.to(

                            receiver.socketId

                        ).emit(

                            "stop_typing",

                            {

                                sender:
                                    data.sender,
                            }
                        );
                    }
                }
            );

            /*
            MESSAGE SEEN
            */

            socket.on(

                "message_seen",

                async (data) => {

                    try {

                        await Message.updateOne(

                            {
                                messageId:
                                    data.messageId,
                            },

                            {
                                status:
                                    "seen",

                                seenAt:
                                    new Date(),
                            }
                        );

                        const sender =
                            users[
                                normalizeNumber(
                                    data.sender
                                )
                            ];

                        if (
                            sender
                        ) {

                            io.to(

                                sender.socketId

                            ).emit(

                                "message_seen",

                                {

                                    messageId:
                                        data.messageId,
                                }
                            );
                        }

                    } catch (
                        error
                    ) {

                        console.error(
                            error
                        );
                    }
                }
            );

            /*
            LIVE REACTION
            */

            socket.on(

                "message_reaction",

                (data) => {

                    const sender =
                        users[
                            normalizeNumber(
                                data.sender
                            )
                        ];

                    const receiver =
                        users[
                            normalizeNumber(
                                data.receiver
                            )
                        ];

                    const payload = {

                        messageId:
                            data.messageId,

                        emoji:
                            data.emoji,

                        reactedBy:
                            data.reactedBy,

                        action:
                            data.action,
                    };

                    if (
                        sender
                    ) {

                        io.to(

                            sender.socketId

                        ).emit(

                            "message_reaction",

                            payload
                        );
                    }

                    if (
                        receiver
                    ) {

                        io.to(

                            receiver.socketId

                        ).emit(

                            "message_reaction",

                            payload
                        );
                    }
                }
            );

            /*
            SEND MESSAGE
            */

            socket.on(

                "send_message",

                async (data) => {

                    try {

                        const sender =
                            normalizeNumber(
                                data.sender
                            );

                        const receiver =
                            normalizeNumber(
                                data.receiver
                            );

                        const messageId =
                            generateMessageId();

                        const metadata =
                            await Message.create({

                                messageId,

                                sender,

                                receiver,

                                messageType:
                                    data.messageType ||
                                    "text",

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
                                    data.fileSize ||
                                    0,

                                driveFileId:
                                    data.driveFileId ||
                                    "",

                                backupHash:
                                    data.backupHash ||
                                    "",

                                syncedToDrive:
                                    false,

                                status:
                                    "sent",
                            });

                        const receiverUser =
                            users[
                                receiver
                            ];

                        if (
                            receiverUser
                        ) {

                            io.to(

                                receiverUser
                                    .socketId

                            ).emit(

                                "receive_message",

                                {

                                    messageId,

                                    sender,

                                    receiver,

                                    localMessageId:
                                        data.localMessageId,

                                    messageType:
                                        data.messageType ||
                                        "text",

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
                                        data.fileSize ||
                                        0,

                                    timestamp:
                                        metadata.timestamp,

                                    status:
                                        "delivered",
                                }
                            );

                            await Message.updateOne(

                                {
                                    messageId,
                                },

                                {
                                    status:
                                        "delivered",

                                    deliveredAt:
                                        new Date(),
                                }
                            );
                        }

                    } catch (
                        error
                    ) {

                        console.error(
                            error
                        );
                    }
                }
            );

            /*
            DISCONNECT
            */

            socket.on(

                "disconnect",

                () => {

                    for (

                        const number
                        in users

                    ) {

                        if (

                            users[number]
                                .socketId

                            ===

                            socket.id

                        ) {

                            delete users[
                                number
                            ];

                            socket.broadcast.emit(

                                "user_offline",

                                number
                            );

                            break;
                        }
                    }

                    console.log(
                        "DISCONNECTED:",
                        socket.id
                    );
                }
            );
        }
    );
};