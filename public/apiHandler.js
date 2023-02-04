/**
 * 
 * @param {string} url 
 * @param {{}} params 
 */
function generateGETUrl(url, params) {
    return `${url}?${new URLSearchParams(params)}`;
}

/**
 * 
 * @param {string} url 
 * @param {{}} body 
 * @returns {Promise<{}>}
 */
function postJSON(url, body) {
    return new Promise((resolve, reject) => {
        fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            cache: "no-store",
            body: JSON.stringify(body)
        }).then(resolve).catch(reject);
    });
}

/**
 * 
 * @returns {Promise<{ status: string | number, gameId?: string, token?: string }>}
 */
export function createGame() {
    return new Promise((resolve, reject) => {
        fetch("/api/game/create", { cache: "no-store" }).then((res) => {
            res.json()
                .then(resolve)
                .catch(reject);
        }).catch(reject);
    });
}

/**
 * 
 * @param {string} id 
 * @returns {Promise<void>}
 */
export function joinGame(id) {
    return new Promise((resolve, reject) => {
        fetch(generateGETUrl("/api/game/join", { gameId: id }), { cache: "no-store" }).then((res) => {
            if (res.status == 200)
                resolve();
            else
                reject();
        }).catch(reject);
    });
}

/**
 * @see /docs/swagger/index.html#/game/getGameStatus
 * @returns {Promise<{ status: string | number, state?: string, gameId?: string, error?: string }>}
 */
export function status() {
    return new Promise((resolve, reject) => {
        fetch("/api/game/status", { cache: "no-store" }).then((res) => {
            res.json()
                .then(resolve)
                .catch(reject);
        }).catch(reject);
    });
}

/**
 * @see /docs/swagger/index.html#/game/getAvailableShips
 * @returns {Promise<{ status: string, ships: [ { id: string, size: number } ] }>}
 */
export function getAvailableShips() {
    return new Promise((resolve, reject) => {
        fetch("/api/game/getAvailableShips", { cache: "no-store" }).then((res) => {
            res.json()
                .then(resolve)
                .catch(reject);
        }).catch(reject);
    });
}

/**
 * 
 * @param {[ { x: number, y: number, orientation: string, id: string, size: number } ]} ships
 * @returns {Promise<{ status: string | number, board?: [[ boolean ]], error?: string }>} 
 */
export function placeShips(ships) {
    return new Promise((resolve, reject) => {
        postJSON("/api/game/placeShips", { ships: ships })
            .then(resolve)
            .catch(reject);
    });
}

/**
 * 
 * @returns {Promise<{ status: string | number, board?: [[ boolean ]], error?: string }>}
 */
export function getBoard() {
    return new Promise((resolve, reject) => {
        fetch("/api/game/getBoard", { cache: "no-store" })
            .then((res) => {
                res.json()
                    .then(resolve)
                    .catch(reject);
            })
            .catch(reject);
    });
}

/**
 * 
 * @returns {Promise<{ status: string | number, width?: number, height?: number, error?: string }>}
 */
export function getBoardDimensions() {
    return new Promise((resolve, reject) => {
        fetch("/api/game/getBoardDimensions", { cache: "no-store" })
            .then((res) => {
                res.json()
                    .then(resolve)
                    .catch(reject);
            })
            .catch(reject);
    });
}

/**
 * 
 * @returns {Promise<{ status: string | number, guesses?: [{ x: number, y: number, hit: boolean }], error?: string }>}
 */
export function getMyGuesses() {
    return new Promise((resolve, reject) => {
        fetch("/api/game/getGuesses", { cache: "no-store" })
            .then((res) => {
                res.json()
                    .then(resolve)
                    .catch(reject);
            })
            .catch(reject);
    });
}

/**
 * 
 * @returns {Promise<{ status: string | number, guesses?: [{ x: number, y: number, hit: boolean }], error?: string }>}
 */
export function getOpponentsGuesses() {
    return new Promise((resolve, reject) => {
        fetch("/api/game/getOpponentsGuesses", { cache: "no-store" })
            .then((res) => {
                res.json()
                    .then(resolve)
                    .catch(reject);
            })
            .catch(reject);
    });
}

/**
 * 
 * @param {number} x 
 * @param {number} y 
 * @returns {Promise<{ status: string, result?: string, winner?: number | null, error?: string }>}
 */
export function guess(x, y) {
    return new Promise((resolve, reject) => {
        postJSON("/api/game/guess", {x: x, y: y})
            .then(resolve)
            .catch(reject);
    });
}

/**
 * 
 * @returns {Promise<{ status: number | string, error?: string }>}
 */
export function quit() {
    return new Promise((resolve, reject) => {
        fetch("/api/game/quit", { cache: "no-store", credentials: "include" })
            .then((res) => {
                // Remove cookies "token" and "gameId"
                document.cookie = "token=del; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie = "gameId=del; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                res.json()
                    .then(resolve)
                    .catch(reject);
            })
            .catch(reject);
    });
}

