const { ServerManager, Requestable, NOTFOUNDFALLBACK } = require("./wrapper");
const apiRouter = require("./api");

let server = new ServerManager();

server.register(Requestable.fromStaticFolder("./public", "/static"));
server.register(Requestable.fromStaticFolder("./docs", "/docs"));


server.registerRouter(apiRouter, "/api");

server.listen().then(console.log);