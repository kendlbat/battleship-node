const { ServerManager, Requestable, NOTFOUNDFALLBACK } = require("./wrapper");

let server = new ServerManager();
let apiRouter = new ServerManager({ fallback: NOTFOUNDFALLBACK });

server.register(Requestable.fromStaticFolder("./public", "/static"));

server.registerRouter(apiRouter, "/api");

server.listen().then(console.log);