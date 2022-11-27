const { ServerManager, Requestable, NOTFOUNDFALLBACK } = require("./wrapper");
const apiRouter = require("./api");

let server = new ServerManager();

server.register(Requestable.fromStaticFolder("./public", "/static"));
server.register(Requestable.fromStaticFolder("./docs", "/docs"));

// Home page redirect
server.register(new Requestable((req, res) => {
    res.writeHead(302, { "Location": "/static/index.html" });
    res.end();
}, "GET", "/"));

server.registerRouter(apiRouter, "/api");

server.listen().then(console.log);