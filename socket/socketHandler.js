const users = {};

function normalizeNumber(number) {

    number = number
        .replace(/\s/g, "")
        .replace(/-/g, "");

    if (number.startsWith("+91")) {

        number =
            number.substring(3);

    } else if (
        number.startsWith("91") &&
        number.length > 10
    ) {

        number =
            number.substring(2);
    }

    if (number.length > 10) {

        number =
            number.slice(-10);
    }

    return number;
}

module.exports = (io) => {

    io.on("connection", (socket) => {

        console.log(
            "USER CONNECTED:",
            socket.id,
        );

        socket.on(

            "register",

            (number) => {

                const normalized =
                    normalizeNumber(
                        number,
                    );

                users[normalized] =
                    socket.id;

                console.log(
                    "REGISTERED USER:",
                    normalized,
                );

                console.log(
                    "ALL USERS:",
                    users,
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

                const sender =
                    normalizeNumber(
                        data.sender,
                    );

                const receiver =
                    normalizeNumber(
                        data.receiver,
                    );

                const receiverSocket =
                    users[receiver];

                console.log(
                    "NORMALIZED RECEIVER:",
                    receiver,
                );

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
                            text:
                                data.text,

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