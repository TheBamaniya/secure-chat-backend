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
    number,
) {

    number =
        number
            .replace(/\s/g, "")
            .replace(/-/g, "");

    if (
        number.startsWith(
            "+91",
        )
    ) {

        number =
            number.substring(3);

    } else if (

        number.startsWith(
            "91",
        )

        &&

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

module.exports = (io) => {

    io.on(

        "connection",

        (socket) => {

            console.log(

                "USER CONNECTED:",

                socket.id,
            );

            socket.on(

                "register",

                (
                    number,
                ) => {

                    const normalized =
                        normalizeNumber(
                            number,
                        );

                    users[
                        normalized
                    ] =
                        socket.id;

                    console.log(

                        "REGISTERED:",

                        normalized,
                    );
                },
            );

            socket.on(

                "send_message",

                async (
                    data,
                ) => {

                    try {

                        const sender =
                            normalizeNumber(
                                data.sender,
                            );

                        const receiver =
                            normalizeNumber(
                                data.receiver,
                            );

                        const messageId =
                            generateMessageId();

                        const newMessage =
                            await Message.create({

                                messageId,

                                sender,

                                receiver,

                                encryptedContent:
                                    data.text,

                                type:
                                    "text",

                                status:
                                    "sent",
                            });

                        const receiverSocket =
                            users[
                                receiver
                            ];

                        if (
                            receiverSocket
                        ) {

                            io.to(

                                receiverSocket,

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
                                        newMessage
                                            .timestamp,
                                },
                            );

                            await Message
                                .updateOne(

                                    {

                                        messageId,
                                    },

                                    {

                                        status:
                                            "delivered",
                                    },
                                );
                        }

                    } catch (
                        error
                    ) {

                        console.error(
                            error,
                        );
                    }
                },
            );

            socket.on(

                "disconnect",

                () => {

                    console.log(

                        "USER DISCONNECTED:",

                        socket.id,
                    );
                },
            );
        },
    );
};