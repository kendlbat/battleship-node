var Greenlock = require('greenlock');
var fs = require('fs');

async function main() {
    var greenlock = Greenlock.create({
        packageRoot: __dirname,
        configDir: "./greenlock.d/",
        packageAgent: "Battleship Node/1.0.0",
        maintainerEmail: "battleship-node@kendlbat.dev",
        staging: false,
        notify: function (event, details) {
            if ('error' === event) {
                // `details` is an error object in this case
                console.error(details);
            }
        }
    });

    var cert, key, chain;

    var domain = "battleship.kendlbat.dev";

    var greenlockConf = await greenlock.manager.defaults({
        agreeToTerms: true,
        subscriberEmail: "ssl@kendlbat.dev"
    });
    console.log("Configured greenlock: " + greenlockConf);

    var sslconf = await greenlock.add({
        subject: domain,
        altnames: [domain]
    });

    console.log("SSL config: " + sslconf);

    var greenlockResp = greenlock.get({ servername: domain });

    console.log("Greenlock response: " + greenlockResp);

    cert = greenlockResp.cert;
    key = greenlockResp.privkey;
    chain = greenlockResp.chain;

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

    server.listenSSL(cert, key);
}

main();