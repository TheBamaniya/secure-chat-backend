const users = {};

module.exports = (io) => {

    io.on("connection", (socket) => {

        console.log(
            "USER CONNECTED:",
            socket.id,
        );

        socket.on(

            "register",

            (number) => {

                users[number] =
                    socket.id;

                console.log(
                    "REGISTERED USER:",
                    number,
                );
            },
        );

        socket.on(

            "send_message",

            (data) => {

                console.log(
                    "MESSAGE RECEIVED:",
                    data,
                );

                const {

                    sender,
                    receiver,
                    text,

                } = data;

                const receiverSocket =
                    users[receiver];

                console.log(
                    "RECEIVER SOCKET:",
                    receiverSocket,
                );

                if (receiverSocket) {

                    io.to(
                        receiverSocket,
                    ).emit(

                        "receive_message",

                        {

                            sender,
                            receiver,
                            text,
                            time:
                                Date.now(),
                        },
                    );

                    console.log(
                        "MESSAGE DELIVERED",
                    );

                } else {

                    console.log(
                        "USER OFFLINE",
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
    });
};