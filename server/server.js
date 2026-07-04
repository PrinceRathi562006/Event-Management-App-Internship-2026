require("dotenv").config();

const http = require("http");
const app = require("./app");

const connectDB = require("./config/db");
const { initSocket } = require("./sockets/socket");

connectDB();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});
