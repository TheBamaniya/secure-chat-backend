const Message =
    require(
        "../models/Message"
    );

const generateMessageId =
    require(
        "../utils/generateMessageId"
    );

const {

    encryptMessage,

} = require(
    "../utils/encryption"
);

const users = {};

function normalizeNumber(
    number
) {

    number =
        number
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

            socket.on(

                "typing",

                (data) => {

                    const receiver =
                        users[
                            data.receiver
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
                            data.receiver
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

            socket.on(

                "message_seen",

                async (data) => {

                    try {

                        await Message
                            .updateOne(

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
                                data.sender
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

                        const encrypted =
                            encryptMessage(
                                data.text
                            );

                        const newMessage =
                            await Message.create({

                                messageId,

                                sender,

                                receiver,

                                encryptedContent:
                                    encrypted,

                                messageType:
                                    "text",

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

                                    text:
                                        data.text,

                                    status:
                                        "delivered",

                                    timestamp:
                                        newMessage.timestamp,
                                }
                            );

                            await Message
                                .updateOne(

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