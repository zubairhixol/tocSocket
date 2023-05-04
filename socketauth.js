const jwt = require('jsonwebtoken');
const axios = require('axios');

module.exports = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) throw new Error('No token present in request');
    let user = await jwt.verify(token, `session-secret`);
    socket.request.user = user;
    let data;
    axios.get(`http://localhost:4000/assignedLocations/${user.user_id}`)
      .then((response) => {
        data = response.data
        console.log(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
    const [role, staff, staffLocations] = data;
    socket.request.role = role;
    socket.request.staff = staff;
    socket.request.locationIds = staffLocations;
    next();
  } catch (ex) {
    console.log("Socket Request Error", ex.toString())
    socket.request.res.statusCode = 501;
    socket.request.res.statusMessage = 'User not found.';
    return socket
  }
};

