require("dotenv").config();

const dns =
    require("dns");

dns.setServers([
    "8.8.8.8",
    "8.8.4.4",
]);

const express =
    require("express");

const http =
    require("http");

const cors =
    require("cors");

const mongoose =
    require("mongoose");

const { Server } =
    require("socket.io");

const socketHandler =
    require("./socket/socketHandler");

const authRoutes =
    require("./routes/authRoutes");

const userRoutes =
    require("./routes/userRoutes");

const messageRoutes =
    require("./routes/messageRoutes");

const conversationRoutes =
    require("./routes/conversationRoutes");

const app =
    express();

const server =
    http.createServer(app);

const io =
    new Server(server, {

        cors: {

            origin:
                process.env
                    .SOCKET_CORS_ORIGIN || "*",

            methods: [
                "GET",
                "POST",
            ],
        },
    });

app.use(cors());

app.use(express.json());

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/user",
    userRoutes
);

app.use(
    "/api/messages",
    messageRoutes
);

app.use(
    "/api/conversations",
    conversationRoutes
);

app.get("/", (_, res) => {

    res.send(
        "SecureChat Backend Running"
    );
});

socketHandler(io);

mongoose.connect(
    process.env.MONGO_URI
)

.then(() => {

    console.log(
        "MongoDB Connected"
    );

})

.catch((err) => {

    console.error(
        "MongoDB Error:",
        err
    );
});

const PORT =
    process.env.PORT || 1000;

server.listen(

    PORT,

    () => {

        console.log(
            `Server running on ${PORT}`
        );
    }
);

process.on(

    "uncaughtException",

    (err) => {

        console.error(
            err
        );
    }
);

process.on(

    "unhandledRejection",

    (err) => {

        console.error(
            err
        );
    }
);