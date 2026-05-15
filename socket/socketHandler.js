const users = {};

module.exports = (io) => {

    io.on("connection", (socket) => {

        console.log(
            "User Connected:",
            socket.id,
        );

        socket.on(

            "register",

            (number) => {

                users[number] =
                    socket.id;

                console.log(
                    "Registered:",
                    number,
                );
            },
        );

        socket.on(

            "send_message",

            (data) => {

                const {

                    sender,
                    receiver,
                    text,

                } = data;

                const receiverSocket =
                    users[receiver];

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
                }
            },
        );

        socket.on(
            "disconnect",
            () => {

                console.log(
                    "Disconnected:",
                    socket.id,
                );
            },
        );
    });
};