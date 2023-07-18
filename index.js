const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const CONSTANTS = require("./constants");
const app = express();
const logger = require("morgan");
app.use(logger("dev"));
const axios = require("axios");

// const authSocketMiddleware = require("./socketauth");
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*", // Allow any origin for testing purposes. This should be changed on production.
  },
  secure: false,
  reconnect: true,
});

// var roomArr = [];
var usersArr = [];
// var roomListArray = [];
io.on("connection", function (socket) {
  let chatRoom = {
    sender_id: socket.handshake.auth.sender_id,
    store_id: socket.handshake.auth.store_id,
    receiver_id: socket.handshake.auth.receiver_id,
    sale_id: socket.handshake.auth.sale_id,
    type: "text",
    status: 1,
    message: "",
  };
  console.log("Connection: ", chatRoom.sender_id);
  socket.join(chatRoom.sender_id);
  // socket.join(chatRoom.receiver_id);
  console.log("user connected: ", chatRoom.sender_id);
  socket.on("driver's chat", async (msg) => {
    usersArr["user" + chatRoom.sender_id] = socket.id;
    console.log("message: " + msg);
    chatRoom.message = `${msg}`;
    await axios
      .post(`https://delivercart.co.uk/admin/index.php/api2/send_message`, {
        chatRoom,
      })
      .then((response) => {
        let message = response.data;
        console.log("message: ");
        if (message != null) {
          io.sockets
            .to(chatRoom.receiver_id)
            .emit("driver's message", { chatRoom });
        }
      })
      .catch((error) => {
        console.log(error);
      });
  });
  socket.on("reciever's chat", async (msg) => {
    usersArr["user" + chatRoom.receiver_id] = socket.id;
    console.log("message: " + msg);
    chatRoom.message = `${msg}`;
    await axios
      .post(`https://delivercart.co.uk/admin/index.php/api2/send_message`, msg)
      .then((response) => {
        let message = response.data;
        console.log("message: ");
        if (message != null) {
          io.sockets.to(chatRoom.sender_id).emit("reciever's message", { msg });
        }
      })
      .catch((error) => {
        console.log(error);
      });
  });
  socket.on("disconnect", function () {
    const index = usersArr["user" + chatRoom.sender_id].indexOf(
      "user" + chatRoom.sender_id
    );
    if (index > -1) {
      usersArr["user" + chatRoom.sender_id].splice(index, 1); // 2nd parameter means remove one item only
      socket.leave(socket.id);
    }
    delete usersArr["user" + chatRoom.sender_id];
    console.log("Disconnect", chatRoom.sender_id);
  });
});
server.listen(PORT, console.log("Server is Listening for port: " + PORT));
