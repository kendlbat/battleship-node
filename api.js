const { ServerManager, Requestable } = require("./wrapper");
const apiRouter = new ServerManager();

// TODO: Write API
const gameRouter = new ServerManager();

apiRouter.registerRouter(gameRouter, "/game");

apiRouter.precall = (req, res) => {
    console.log(req.url);
};

apiRouter.register(new Requestable((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: Date.now() }));
}, "GET", "/test"));

gameRouter.precall = (req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: Date.now() }));
};


module.exports = apiRouter;