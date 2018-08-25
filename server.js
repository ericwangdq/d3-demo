// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = "node-ws-d3";

const api = "https://api.coindesk.com/v1/bpi/historical/close.json";

// Port where we'll run the websocket server and app server
const webSocketsServerPort = 1500;
const appServerPort = 1501;

// websocket and http servers
const webSocketServer = require("websocket").server;
const http = require("http");
const axios = require("axios");
const express = require("express");
const app = express();
const path = require("path");
const args = process.argv;

// list of currently connected clients (users)
let clients = [];
// latest 100 messages
let history = [];

/**
 * HTTP Server
 */

const server = http.createServer((request, response) => {
  // Not important for us. We're writing WebSocket server, not HTTP server
});
server.listen(webSocketsServerPort, () => {
  console.log(
    `${new Date()} Server is listening on port ${webSocketsServerPort}`
  );
});

/**
 * WebSocket server
 */
const wsServer = new webSocketServer({
  // WebSocket server is tied to a HTTP server. WebSocket request is just
  // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
  httpServer: server,
  // You should not use autoAcceptConnections for production
  // applications, as it defeats all standard cross-origin protection
  // facilities built into the protocol and the browser.  You should
  // *always* verify the connection's origin and decide whether or not
  // to accept it.
  autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on("request", request => {
  console.log(`${new Date()}  Connection from origin ${request.origin}.`);

  if (!originIsAllowed(request.origin)) {
    // Make sure we only accept requests from an allowed origin
    request.reject();
    console.log(
      `${new Date()}  Connection from origin ${request.origin} rejected.`
    );
    return;
  }

  // accept connection - you should check 'request.origin' to make sure that
  // client is connecting from your website
  // (http://en.wikipedia.org/wiki/Same_origin_policy)
  const connection = request.accept(null, request.origin);
  // we need to know client index to remove them on 'close' event
  const index = clients.push(connection) - 1;

  console.log(`${new Date()} Connection accepted.`);
  ``;
  // client sent some message
  connection.on("message", message => {
    if (message.type === "utf8") {
      // log and broadcast the message
      console.log(
        `${new Date()} Received Message from 
          ${request.origin}: ${message.utf8Data}`
      );

      // we want to keep history of all sent messages
      const msgData = {
        time: new Date().getTime(),
        text: message.utf8Data,
        connection: request.origin
      };
      history.push(msgData);
      history = history.slice(-100);

      // broadcast message to all connected clients
      const msg = JSON.stringify({ type: "message", data: msgData });
      clients.forEach(client => {
        client.sendUTF(msg);
      });
    } else if (message.type === "binary") {
      console.log(
        `Received Binary Message of ${message.binaryData.length} bytes`
      );
      connection.sendBytes(message.binaryData);
    }
  });

  // client disconnected
  connection.on("close", connection => {
    console.log(`${new Date()} Peer ${connection.remoteAddress} disconnected.`);
    // remove user from the list of connected clients
    clients.splice(index, 1);
  });
});

/**
 *  Static server - Express
 */
app.all(/\/api\/.*?/i, (req, res, next) => {
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With, Content-type, Accept, Content-Length, Authorization, X-Access-Token, X-Key, id-token, host"
  );
  res.header("Access-Control-Allow-Origin", "*"); //*
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Content-Type", "application/json;charset=utf-8");
  console.log("API path:", req.method, req.path);
  // console.log("Cookie:", req.headers["cookie"]);
  if (req.method === "OPTIONS") {
    res.status(200).end();
  } else {
    axios
      .get(
        "https://api.coindesk.com/v1/bpi/historical/close.json?start=2017-12-31&end=2018-04-01"
      )
      .then(response => {
        // console.log(response.data);
        res.json(response.data).end();
      })
      .catch(err => {
        res
          .status(500)
          .json({ err: "Call api error" + err.toString(), code: 500 })
          .end();
      });
  }
});

app.use("/", express.static(path.join(__dirname, "/")));

const appPort = args[3] || appServerPort;
const appHost = args[2] || "0.0.0.0";
app.listen(appPort, appHost, () => {
  console.log(`Starting up http-server, serving ${appHost}:${appPort}`);
});

// end month
let endMonth = 4;
// fetch new data with plus one day based on end data in every 1 min
const timer = setInterval(() => {
  // we want to keep history of all sent messages
  const msgData = {
    time: new Date().getTime(),
    response: "",
    connection: "refresh"
  };
  if (endMonth > new Date().getMonth() + 1) {
    clearInterval(timer);
    return;
  }
  endMonth++;
  const api = `https://api.coindesk.com/v1/bpi/historical/close.json?start=2017-12-31&end=2018-0${endMonth}-01`;
  console.log(`${new Date()} call api`, api);
  axios
    .get(api)
    .then(response => {
      console.log(
        `${new Date()} fetch new data and broadcast message to clients.`
      );
      msgData.response = response.data;

      // broadcast message to all connected clients
      clients.forEach(client => {
        msgData.connection = client.remoteAddress;
        const msg = JSON.stringify({ type: "message", data: msgData });
        client.sendUTF(msg);
      });
    })
    .catch(err => {
      console.log(`${new Date()} Call api error: ${err.toString()}.`);
    });
}, 30 * 1000);
