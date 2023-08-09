var Greenlock = require('greenlock-express');
var fs = require('fs');

async function main() {
    const { ServerManager, Requestable, NOTFOUNDFALLBACK } = require("./wrapper");
    const apiRouter = require("./api");

    const PORT = process.env.PORT || 443;
    const ADDRESS = process.env.ADDRESS || "0.0.0.0";

    let server = new ServerManager({ address: ADDRESS, port: PORT });

    server.register(Requestable.fromStaticFolder("./public", "/static"));
    server.register(Requestable.fromStaticFolder("./docs", "/docs"));

    // Home page redirect
    server.register(Requestable.redirect("/", "/static/index.html", "ANY", 302));

    server.registerRouter(apiRouter, "/api");

    server.listenSSL("ssl@kendlbat.dev");
}

main();