require("dotenv").config();

const http = require("http");
const app = require("./app");

const dns = require('dns');
dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
])

const connectDB = require("./config/db");
const { initSocket } = require("./sockets/socket");
const { startEventLifecycleWorker } = require("./services/eventLifecycleService");

const dbReady = connectDB();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initSocket(server);

dbReady.then(() => {
    startEventLifecycleWorker();
});

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Stop the other server or set a different PORT in server/.env.`);
        process.exit(1);
    }

    console.error("Server failed to start:", error.message);
    process.exit(1);
});

server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});
