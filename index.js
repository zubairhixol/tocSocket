const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const app = express();
const logger = require("morgan");
app.use(logger("dev"));
const axios = require("axios");
var FormData = require("form-data");
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*", // Allow any origin for testing purposes. This should be changed on production.
    methods: ["GET", "POST"],
  },
  secure: false,
  reconnect: true,
});

var usersArr = [];
var roomListArray = [];
io.on("connection", async function (socket) {
  var roomname =
    socket.handshake.auth.sale_id +
    "-" +
    socket.handshake.auth.sender_id +
    "-" +
    socket.handshake.auth.receiver_id;

  socket.join(roomname);
  console.log("sale_id:", socket.handshake.auth.sale_id);
  console.log("sender_id:", socket.handshake.auth.sender_id);
  console.log("receiver_id:", socket.handshake.auth.receiver_id);
  usersArr["user-" + socket.handshake.auth.sender_id] = socket.id;

  if (!roomListArray.includes(roomname)) {
    roomListArray.push(roomname);
  }

  console.log("user connected with room: ", roomname);
  console.log("user connected socketId: ", usersArr);
  console.log("user connected rooms list: ", roomListArray);

  socket.on("driver_chat", async (obj) => {
    usersArr["user-" + socket.handshake.auth.sender_id] = socket.id;
    console.log(obj.user_type, ":", obj.msg);
    var msgObject = new FormData();
    msgObject.append("sender_id", socket.handshake.auth.sender_id);
    msgObject.append("receiver_id", socket.handshake.auth.receiver_id);
    msgObject.append("sale_id", socket.handshake.auth.sale_id);
    msgObject.append("message_type", "text");
    msgObject.append("status", 1);
    msgObject.append("message", `${obj.msg}`);
    msgObject.append("user_type", `${obj.user_type}`);

    // console.log("messageObj: ", msgObject);
    console.log("messageObj: ", objectifyFormdata(msgObject));

    await axios
      .post(
        `https://delivercart.co.uk/admin/index.php/api2/send_message`,
        msgObject
      )
      .then((response) => {
        var message = response.data.data;
        console.log("API:", message);
        if (message != null) {
          for (const key in message) {
            if (message.hasOwnProperty(key)) {
              // Convert the value to a number using parseInt if it's a string representation of an integer
              if (!isNaN(message[key]) && message[key] !== "") {
                message[key] = parseInt(message[key]);
              }
            }
          }
          console.log("API response:", message);

          io.sockets.to(roomname).emit("driver_message", message);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  });
  socket.on("receiver_chat", async (obj) => {
    usersArr["user-" + socket.handshake.auth.receiver_id] = socket.id;
    console.log(obj.user_type, ":", obj.msg);
    var msgObject = new FormData();
    msgObject.append("sender_id", socket.handshake.auth.sender_id);
    msgObject.append("receiver_id", socket.handshake.auth.receiver_id);
    msgObject.append("sale_id", socket.handshake.auth.sale_id);
    msgObject.append("message_type", "text");
    msgObject.append("status", 1);
    msgObject.append("message", `${obj.msg}`);
    msgObject.append("user_type", `${obj.user_type}`);

    console.log("messageObj: ", objectifyFormdata(msgObject));
    await axios
      .post(
        `https://delivercart.co.uk/admin/index.php/api2/send_message`,
        msgObject
      )
      .then((response) => {
        const message = response.data.data;
        if (message != null) {
          for (const key in message) {
            if (message.hasOwnProperty(key)) {
              // Convert the value to a number using parseInt if it's a string representation of an integer
              if (!isNaN(message[key]) && message[key] !== "") {
                message[key] = parseInt(message[key]);
              }
            }
          }
          console.log("API response:", message, "roomname", roomname);
          io.sockets.to(roomname).emit("receiver_message", message);
          console.log("event run");
        }
      })
      .catch((error) => {
        console.log(error);
      });
  });
  socket.on("disconnect", function () {
    delete usersArr["user-" + socket.handshake.auth.sender_id];
    delete usersArr["user-" + socket.handshake.auth.receiver_id];
    let index = roomListArray.indexOf(roomname);

    // Check if the 'roomname' exists in the array
    if (index !== -1) {
      // Use splice to remove the 'roomname' from the array
      roomListArray.splice(index, 1);
    }

    // Now 'roomname' is removed from roomListArray
    console.log(roomListArray);
    console.log(
      "Disconnect",
      socket.handshake.auth.sender_id,
      "&&",
      socket.handshake.auth.receiver_id
    );
  });
});
const objectifyFormdata = (Object) => {
  return Object.getBuffer()
    .toString()
    .split(Object.getBoundary())
    .filter((e) => e.includes("form-data"))
    .map((e) =>
      e
        .replace(/[\-]+$/g, "")
        .replace(/^[\-]+/g, "")
        .match(/\; name\=\"([^\"]+)\"(.*)/s)
        .filter((v, i) => i == 1 || i == 2)
        .map((e) => e.trim())
    )
    .reduce((acc, cur) => {
      acc[cur[0]] = cur[1];
      return acc;
    }, {});
};
server.listen(PORT, console.log("Server is Listening for port: " + PORT));
