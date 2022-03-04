const express = require("express");
const app = express();
const mongoose = require("mongoose");
const http = require("http");
const port = process.env.PORT || 8080;

const database = require("./config/database");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");

const path = require("path");
const cors = require("cors");
const fileUpload = require("express-fileupload");

mongoose.Promise = require("bluebird");
mongoose.connect(database.localUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useFindAndModify", false);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(express.static("./public"));
app.use(morgan("dev"));
app.use(methodOverride("X-HTTP-Method-Override"));
app.use(cookieParser());
const corsOption = {
  origin: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  exposedHeaders: ["x-auth-token"],
};
app.use(cors(corsOption));
app.use(fileUpload());

const server = http.createServer(
  app
);
const sockets = require("socket.io")({
  transports: [
    "websocket",
    "flashsocket",
    "htmlfile",
    "xhr-polling",
    "jsonp-polling",
  ],
});

const io = sockets.listen(server, { serveClient: true });
io.on("connect", () => console.log("connected"));
io.on("connect_error", (e) => console.log("connect error: ", e));
io.on("connect_timeout", (e) => console.log("connect timeout: ", e));

require("./app/routes.js")(app, io);
server.listen(port);
