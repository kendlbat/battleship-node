var Greenlock = require('greenlock');
var fs = require('fs');
var greenlock = Greenlock.create({
    packageRoot: __dirname,
    configDir: "./greenlock.d/",
    packageAgent: "Battleship Node/1.0.0",
    maintainerEmail: "battleship-node@kendlbat.dev",
    staging: true,
    notify: function(event, details) {
        if ('error' === event) {
            // `details` is an error object in this case
            console.error(details);
        }
    }
});

greenlock.manager
    .defaults({
        agreeToTerms: true,
        subscriberEmail: 'ssl@kendlbat.dev'
    })
    .then(function(fullConfig) {
        fs.writeFileSync('./greenlock.d/config.json', JSON.stringify(fullConfig, null, 2));
    });

var cert = null;
var key = null;

// Generate certs
greenlock.manager
    .get({
        domains: ['docker.kendlbat.dev'],
        email: 'ssl@kendlbat.dev',
        agreeTos: true
    })
    .then(function(results) {
        cert = results.cert;
        key = results.privkey;
    });

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