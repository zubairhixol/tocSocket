const express = require('express')
const http = require('http');
const socketIO = require('socket.io');
const CONSTANTS = require('./constants');
const app = express();
const logger = require("morgan");
app.use(logger("dev"));
const axios = require('axios');

const authSocketMiddleware = require("./socketauth");
const PORT = process.env.PORT || 4005

const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*", // Allow any origin for testing purposes. This should be changed on production.
    },
    secure: false,
    reconnect: true,
});



var roomArr = [];
var usersArr = [];
var roomListArray = [];
io.on("connection", function (socket) {
    const locationId = socket.handshake.auth.location_id;
    const user = socket.handshake.auth.user_id;
    let roletype = socket.handshake.auth.role;
    var roomname = locationId + "-" + roletype;
    if (!roomListArray.includes(roomname)) {
        roomListArray.push(roomname);
    }
    console.log("Connection: ", roomname);
    // socket.on("joinSession", function (msg) {

    //     usersArr["user" + user] = socket.id;
    // });
    // socket.on("room", function (msg) {

    usersArr["user" + user] = socket.id;
    if (roomArr.hasOwnProperty(roomname)) {
        if (!roomArr[roomname].includes(user)) {
            socket.join(roomname);
            roomArr[roomname].push(user);
        }
    } else {
        socket.join(roomname);
        roomArr[roomname] = [];
        roomArr[roomname].push(user);
    }

    console.log("Room Joined: ", roomArr);

    // });
    // order placed
    socket.on("order_placed", async function (req) {
        console.log("Order Placed")
        usersArr["user" + user] = socket.id;
        io.sockets.to(locationId + "-" + CONSTANTS.ROLES.KITCHEN_MANAGER).to(locationId + "-" + CONSTANTS.ROLES.BAR_MANAGER).to(locationId + "-" + CONSTANTS.ROLES.DESSERT_MANAGER).emit("current_order", {
            order_id: req.order_id,
        });
    });
    // socket.on("session_ended", async function (req) {
    //     usersArr["user" + user] = socket.id;
    //     io.sockets
    //         .to(locationId + "-" + CONSTANTS.ROLES.KITCHEN_MANAGER)
    //         .emit("refresh_app", {
    //             message: `App Refreshed`,
    //         });
    // });
    socket.on('called_test', function (data) {
        console.log("Called test: ", roomArr, data);
        io.sockets.to(roomname).emit("calling", { user: "Zubair" });
    });

    socket.on("Payment_request", async function (req) {
        console.log("Pay now");
        let notification;
        usersArr["user" + user] = socket.id;
        await axios.get(`http://localhost:4000/notification/${req}`)
            .then((response) => {
                notification = response.data
                let broadCastRoom = locationId + "-" + CONSTANTS.ROLES.MANAGER;
                console.log("Paymnet Request: ", broadCastRoom);
                io.sockets
                    .to(locationId + "-" + CONSTANTS.ROLES.KITCHEN_MANAGER)
                    .emit("Session_orders_detail", {
                        message: `A customer from \n"${notification.table_name}"\nwants to pay the Bill`,
                    });
                io.sockets.to(broadCastRoom).emit("Collect_Payment", {
                    not_id: req,
                    Notification: notification,
                });


            })
            .catch((error) => {
                console.log(error);
            });
    });
    socket.on("Call_Waiter_request", async function (req) {
        usersArr["user" + user] = socket.id;
        let notification;
        await axios.get(`http://localhost:4000/notification/${req}`)
            .then((response) => {
                io.sockets
                    .to(locationId + "-" + CONSTANTS.ROLES.KITCHEN_MANAGER)
                    .emit("Call_Waiter", {
                        message: `A customer from \n"${response.data.table_name}"\nis calling to Waiter`,
                    });
            })
            .catch((error) => {
                console.log(error);
            });
    });
    socket.on("get_order_detail", async function (req) {
        usersArr["user" + user] = socket.id;
        let order;
        await axios.post(`http://localhost:4000/socketOrderDetail`, {
            order_id: req.order_id,
            locationId: locationId,
            roletype: roletype

        })
            .then((response) => {
                order = response.data;
                console.log("Order: ");
                if (order != null) {
                    io.sockets.to(roomname).emit("order", {
                        order: JSON.stringify(order),
                        newOrder: req.order_id,
                    });
                }
            })
            .catch((error) => {
                console.log(error);
            });

    });

    socket.on("check_room_status", function () {
        if (roomArr[roomname]) {
            const index = roomArr[roomname].indexOf(user);
            if (index > -1) {
                // console.log("Found: ", roomname)
            } else {
                // console.log("Not Found: ", roomname)
            }
        }
        // console.log("After Found: " , roomArr)
    });

    socket.on("disconnect", function () {
        console.log("Disconnect before", roomArr, roomname)
        if (roomArr[roomname]) {
            const index = roomArr[roomname].indexOf(user);
            if (index > -1) {
                roomArr[roomname].splice(index, 1); // 2nd parameter means remove one item only
                socket.leave(socket.id);
            }
        }
        delete usersArr["user" + user];
        console.log("Disconnect", roomArr, roomname)
    });
});
server.listen(PORT, console.log("Server is Listening for port: " + PORT));