const { ServerManager, Requestable } = require("./wrapper");
const apiRouter = new ServerManager();
const game = require("./game");

let runningGameId = 0;

function generateGameId() {
    // Game id is a 6 digit random number-a running game id as string
    return `${Math.floor(Math.random() * 1000000).toString(10).padStart(6, '0')}-${runningGameId++}`;
}

/**
 * Generates a 16 digit random hex number
 * @returns {string}
 */
function generatePlayerToken() {
    return Math.floor(Math.random() * 0xFFFFFFFF).toString(16) + Math.floor(Math.random() * 0xFFFFFFFF).toString(16);
}

/**
 * 
 * @param {IncomingMessage} req 
 * @returns {Promise<{}>}
 */
function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        if (req.headers["content-type"] !== "application/json")
            reject("Invalid content type");

        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            try {
                console.log(body);
                resolve(JSON.parse(body));
            } catch (err) {
                reject(err);
            }
        });
    });
}

async function sendError(code, msg, res) {
    res.writeHead(code, { "Content-Type": "text/plain" });
    res.end(msg);
}

async function sendJSONError(code, msg, res) {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: msg, status: code }));
}

/**
 * 
 * @param {IncomingMessage} req 
 * @returns {{} | undefined}
 */
function getCookies(req) {
    let cookies;

    if (req.headers.cookie) {
        cookies = {};
        req.headers.cookie.split(";").forEach(cookie => {
            let parts = cookie.split("=");
            cookies[parts[0].trim()] = (parts[1] || "").trim();
        });
    }

    return cookies;
}

/**
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 * @returns {{} | undefined} Undefined if any errors occured / game not found - Request will be rejected
 */
function getGameFromRequest(req, res) {
    let cookies = getCookies(req);
    if (!cookies || !cookies["gameId"]) {
        sendJSONError(400, "Game id not specified", res);
        return undefined;
    }

    if (!games[cookies["gameId"]]) {
        sendJSONError(404, "Game not found", res);
        return undefined;
    }

    let game = games[cookies["gameId"]];

    if (!game.p1 === cookies["token"] || !game.p2 === cookies["token"]) {
        sendJSONError(403, "Not authorized", res);
        return undefined;
    }

    return game;
}

/**
 * Gets the player number from the request
 * @param {IncomingMessage} req 
 * @param {ServerResponse} res 
 * @param {{}} game 
 * @returns {number | undefined}
 */
function whichPlayer(req, res, game) {
    if (game.p1 === getCookies(req)["token"])
        return 1;
    if (game.p2 === getCookies(req)["token"])
        return 2;
    sendJSONError(403, "Not authorized", res);
    return undefined;
}

// TODO: Write API
const gameRouter = new ServerManager();

apiRouter.registerRouter(gameRouter, "/game");

/* apiRouter.precall = (req, res) => {
    console.log(req.url);
}; */

// When root is requested, redirect to docs
apiRouter.register(Requestable.redirect("/", "/docs/swagger/index.html"));

apiRouter.register(new Requestable((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: Date.now() }));
}, "GET", "/test"));

// Game logic
let games = {};

/**
 * GET /api/game/create
 * Creates a new game
 */
gameRouter.register(new Requestable(async (req, res) => {
    // Get cookies
    let cookies = getCookies(req);

    if (cookies && cookies["gameId"]) {
        if (games[cookies["gameId"]]) {
            sendJSONError(400, "Player already in a game", res);
            return;
        }
    }


    let gameId = generateGameId();
    let token = generatePlayerToken();

    games[gameId] = {
        game: new game.BattleshipGame(10, 10),
        p1: token,
        p2: null,
        status: "waiting"
    };

    res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": [`gameId=${gameId}`, `token=${token}`]
    });
    res.end(JSON.stringify({ status: "ok", gameId, token }));
}, "GET", "/create"));

/**
 * GET /api/game/join
 * Joins a game
 */
gameRouter.register(new Requestable(async (req, res) => {
    // Get cookies
    let cookies = getCookies(req);
    console.log(cookies);

    if (cookies && cookies["gameId"]) {
        if (games[cookies["gameId"]]) {
            sendJSONError(400, "Player already in a game", res);
            return;
        }
    }

    let url = new URL(req.url, `http://${req.headers.host}`);
    let gameId = url.searchParams.get("gameId")

    if (!gameId) {
        sendJSONError(400, "Missing gameId", res);
        return;
    }

    if (!games[gameId]) {
        sendJSONError(404, "Game not found", res);
        return;
    }

    if (games[gameId].p2) {
        sendJSONError(400, "Game is full", res);
        return;
    }

    let token = generatePlayerToken();

    games[gameId].p2 = token;
    games[gameId].status = "starting";

    res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": [`gameId=${gameId}`, `token=${token}`]
    });
    res.end(JSON.stringify({ status: "ok", gameId, token }));
}, "GET", "/join"));

/**
 * GET /api/game/getGameState
 * 
 * NOTE: This is the ONE endpoint that should be polled continuously
 * @todo Add rate limiting to THE OTHER ENDPOINTS (not this one)
 */
 gameRouter.register(new Requestable(async (req, res) => {
    let game = getGameFromRequest(req, res);
    if (!game) return;

    let player = whichPlayer(req, res, game);
    if (!player) return;

    console.log(game);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        status: "ok",
        state: game.status,
        gameId: getCookies(req)["gameId"]
    }));
}, "GET", "/status"));

/**
 * GET /api/game/getAvailableShips
 * Gets the available ships for a player
 */
gameRouter.register(new Requestable(async (req, res) => {
    let game = getGameFromRequest(req, res);
    if (!game) return;

    let player = whichPlayer(req, res, game);
    if (!player) return;

    if (game.status !== "starting") {
        sendJSONError(400, "Game not ready", res);
        return;
    }

    let availableShips;

    if (player === 1)
        availableShips = game.game.player1.board.getAvailableShips();
    else if (player === 2)
        availableShips = game.game.player2.board.getAvailableShips();


    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        status: "ok",
        ships: availableShips
    }));
}, "GET", "/getAvailableShips"));

/**
 * POST /api/game/placeShips
 * Places ships for a player
 */
gameRouter.register(new Requestable(async (req, res) => {
    let game = getGameFromRequest(req, res);
    if (!game) return;

    let player = whichPlayer(req, res, game);
    if (!player) return;

    if (game.status !== "starting") {
        sendJSONError(400, "Game not in correct state", res);
        return;
    }

    let body;

    try {
        body = await getRequestBody(req);
    } catch (e) {
        console.error(e);
        sendJSONError(400, "Body invalid or missing", res);
        return;
    }

    if (!body || !body.ships) {
        sendJSONError(400, "Malformed request", res);
        return;
    }

    let ships = body.ships;

    for (let ship of ships) {
        console.log(ship);
        if (!ship || Number.isNaN(ship.x) || Number.isNaN(ship.y) || !ship.orientation || !ship.id || Number.isNaN(ship.size)) {
            sendJSONError(400, "Malformed request", res);
            return;
        }
    };

    let success;
    // ships has to include every ship from getAvailableShips()

    let vesselCheck = [ ...game.game.player1.board.getAvailableShips() ];

    if (!vesselCheck.length === ships.length) {
        sendJSONError(400, "Invalid number of ships", res);
        return;
    }

    ships.forEach(ship => {
        if (!vesselCheck.some(vessel => vessel.id === ship.id && vessel.size === ship.size)) {
            sendJSONError(400, "Malformed request", res);
            return;
        } else {
            vesselCheck = vesselCheck.filter(vessel => vessel.id !== ship.id);
        }
    });

    if (vesselCheck.length !== 0) {
        sendJSONError(400, "Malformed request", res);
        return;
    }

    if (player === 1) {
        success = game.game.player1.placeVessels(ships);
    } else if (player === 2) {
        success = game.game.player2.placeVessels(ships);
    }

    if (!success) {
        sendJSONError(400, "Invalid ships", res);
        return;
    }

    if (game.game.player1.board.getAvailableShips().length === 0 && game.game.player2.board.getAvailableShips().length === 0) {
        game.status = "playing";
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        status: "ok",
        board: game.game.player1.board.getCurrentState()
    }));
}, "POST", "/placeShips"));

/**
 * GET /api/game/getBoard
 */
gameRouter.register(new Requestable(async (req, res) => {
    let game = getGameFromRequest(req, res);
    if (!game) return;

    let player = whichPlayer(req, res, game);
    if (!player) return;

    if (game.status !== "playing") {
        sendJSONError(400, "Game not in correct state", res);
        return;
    }

    let board;

    if (player === 1)
        board = game.game.player1.board.getCurrentState();
    else if (player === 2)
        board = game.game.player2.board.getCurrentState();
}, "GET", "/getBoard"));

/**
 * GET /api/game/getBoardDimensions
 */
gameRouter.register(new Requestable(async (req, res) => {
    let game = getGameFromRequest(req, res);
    if (!game) return;

    let player = whichPlayer(req, res, game);
    if (!player) return;

    if (game.status !== "playing" && game.status !== "starting" && game.status !== "finished") {
        sendJSONError(400, "Game not in correct state", res);
        return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        status: "ok",
        width: game.game.player1.board.width,
        height: game.game.player1.board.height
    }));
}, "GET", "/getBoardDimensions"));

/**
 * GET /api/game/getGuesses
 * Gets the guesses for the opponents board
 */
gameRouter.register(new Requestable(async (req, res) => {
    let game = getGameFromRequest(req, res);
    if (!game) return;

    let player = whichPlayer(req, res, game);
    if (!player) return;


    if (game.status !== "playing") {
        sendJSONError(400, "Game not in correct state", res);
        return;
    }

    let guesses;

    if (player === 1)
        guesses = game.game.player2.board.guesses;
    else if (player === 2)
        guesses = game.game.player1.board.guesses;


    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        status: "ok",
        guesses: guesses
    }));
}, "GET", "/getGuesses"));

/**
 * GET /api/game/getOpponentsGuesses
 * Gets the guesses the opponent has made
 */
gameRouter.register(new Requestable(async (req, res) => {
    let game = getGameFromRequest(req, res);
    if (!game) return;

    let player = whichPlayer(req, res, game);
    if (!player) return;

    if (game.status !== "playing") {
        sendJSONError(400, "Game not in correct state", res);
        return;
    }

    let guesses;

    if (player === 1)
        guesses = game.game.player2.board.getGuesses();
    else if (player === 2)
        guesses = game.game.player1.board.getGuesses();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        status: "ok",
        guesses: guesses
    }));
}, "GET", "/getOpponentsGuesses"));

/**
 * POST /api/game/guess
 * Guesses a position on the opponents board
 */
gameRouter.register(new Requestable(async (req, res) => {
    let game = getGameFromRequest(req, res);
    if (!game) return;

    let playerNumber = whichPlayer(req, res, game);
    if (!player) return;

    if (game.status !== "playing") {
        sendJSONError(400, "Game not in correct state", res);
        return;
    }

    let body;

    try {
        body = await getRequestBody(req);
    } catch (e) {
        sendJSONError(400, "Body invalid or missing", res);
        return;
    }

    if (!body || !body.x || !body.y) {
        sendJSONError(400, "Malformed request", res);
        return;
    }

    let x = parseInt(body.x);
    let y = parseInt(body.y);

    if (isNaN(x) || isNaN(y)) {
        sendJSONError(400, "Malformed request", res);
        return;
    }

    let player;

    if (playerNumber === 1) 
        player = game.game.player1;
    else if (playerNumber === 2)
        player = game.game.player2;

    let guess = playerNumber.guess(x, y);

    if (!guess) {
        sendJSONError(400, "Invalid guess", res);
        return;
    }

    if (guess.result === game.BattleshipGuess.HIT) {
        if (player.board.isEveryShipSunk()) {
            game.status = "finished";
            game.winner = playerNumber;
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                status: "ok",
                result: "win",
                winner: playerNumber
            }));
        } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                status: "ok",
                result: "hit"
            }));
        }
    } else if (guess.result === game.BattleshipGuess.MISS) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: "ok",
            result: "miss"
        }));
    }
}, "POST", "/guess"));

/**
 * GET /api/game/quit
 * Quits the game
 */
gameRouter.register(new Requestable(async (req, res) => {
    let game = getGameFromRequest(req, res);
    if (!game) return;

    let player = whichPlayer(req, res, game);
    if (!player) return;

    if (game.status !== "finished") {
        // Forfeit game
        game.status = "finished";
        game.winner = player === 1 ? 2 : 1;
    }

    // Clear cookies
    res.setHeader();
    res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": [
            "token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/",
            "gameId=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
        ]
    });
    res.end(JSON.stringify({
        status: "ok"
    }));
}, "GET", "/quit"));



module.exports = apiRouter;