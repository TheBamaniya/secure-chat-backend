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

// MIDDLEWARE
app.use(cors());

app.use(express.json());

// TEST ROUTE
app.get("/", (_, res) => {

    res.send(
        "SecureChat Backend Running",
    );
});

// SOCKET HANDLER
socketHandler(io);

// MONGODB
mongoose.connect(

    process.env.MONGO_URI,

).then(() => {

    console.log(
        "MongoDB Connected",
    );

}).catch((err) => {

    console.error(
        "MongoDB Error:",
        err,
    );
});

// START SERVER
const PORT =
    process.env.PORT || 1000;

server.listen(PORT, () => {

    console.log(
        `Server running on ${PORT}`,
    );
});

// ERROR HANDLING
process.on(

    "uncaughtException",

    (err) => {

        console.error(
            "Uncaught Exception:",
            err,
        );
    },
);

process.on(

    "unhandledRejection",

    (err) => {

        console.error(
            "Unhandled Rejection:",
            err,
        );
    },
);