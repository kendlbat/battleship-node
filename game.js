DEFAULT_WIDTH = 10
DEFAULT_HEIGHT = 10

// X is left to right
// Y is top to bottom

class BattleshipGame {
    static VESSELS = [
        {
            id: 'carrier',
            size: 5
        },
        {
            id: 'battleship',
            size: 4
        },
        {
            id: 'cruiser',
            size: 3
        },
        {
            id: 'submarine',
            size: 3
        },
        {
            id: 'destroyer',
            size: 2
        }
    ];

    constructor() {
        this.player1 = new BattleshipPlayer();
        this.player2 = new BattleshipPlayer();
    }
}

class BattleshipPlayer {
    constructor(boardWidth = DEFAULT_WIDTH, boardHeight = DEFAULT_HEIGHT) {
        this.board = new BattleshipBoard(boardWidth, boardHeight);
    }


    /**
     * 
     * @param {BattleshipVessel[]} vessels 
     */
    placeVessels(vessels) {
        return this.board.placeVessels(vessels);
    }
}

class BattleshipGuess {
    static HIT = 'hit';
    static MISS = 'miss';

    constructor(x, y, result) {
        if (!BattleshipGuess.checkValidity(result))
            throw new Error('Invalid guess result');

        this.x = x;
        this.y = y;
        this.result = result;
    }

    static checkValidity(guess) {
        return guess === BattleshipGuess.HIT || guess === BattleshipGuess.MISS;
    }
}

class BattleshipBoard {
    constructor(width, height) {
        this.ships = [];
        this.width = width;
        this.height = height;
        this.guesses = [];
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @returns {BattleshipGuess || null} The Guess if it is valid, null if invalid
     */
    guess(x, y) {
        if (this.guesses.every((guess) => guess.x != x || guess.y != y))
            return null;
        let guess = new BattleshipGuess(x, y, this.checkSpace(x, y) ? BattleshipGuess.HIT : BattleshipGuess.MISS);

        this.guesses.push(guess);

        return guess;
    }

    /**
     * 
     * @param {BattleshipVessel} ship 
     * @returns {boolean} Whether the ship was successfully placed on the board
     */
    placeShip(ship) {
        

        if (String(ship.orientation).toLowerCase() == 'horizontal') {
            ship.orientation = BattleshipOrientation.HORIZONTAL;
        } else if (String(ship.orientation).toLowerCase() == 'vertical') {
            ship.orientation = BattleshipOrientation.VERTICAL;
        }

        if (!BattleshipOrientation.getValidity(ship.orientation))
            throw new Error('Invalid orientation');

        if (ship.x < 0 || ship.y < 0)
            return false;
        if (ship.x >= this.width || ship.y >= this.height)
            return false;
        if (ship.orientation === BattleshipOrientation.HORIZONTAL && ship.x + ship.size > this.width)
            return false;
        if (ship.orientation === BattleshipOrientation.VERTICAL && ship.y + ship.size > this.height)
            return false;

        let shipObj = new BattleshipVessel(ship.x, ship.y, ship.orientation, ship.size, ship.id);

        for (let otherShip of this.ships)
            if (otherShip.overlapsWith(shipObj))
                return false;

        this.ships.push(shipObj);
        return true;
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @throws An error if the coordinates are out of bounds
     * @returns {boolean} True if the given coordinates are occupied by a ship
     */
    checkSpace(x, y) {
        if (x < 0 || y < 0)
            throw new Error('Coordinates out of bounds');
        if (x >= this.width || y >= this.height)
            throw new Error('Coordinates out of bounds');

        for (let ship of this.ships)
            if (ship.containsPoint(x, y))
                return true;
        return false;
    }

    /**
     * 
     * @returns {BattleshipVessel[]} The ships not yet on the board
     */
    getAvailableShips() {
        return BattleshipGame.VESSELS.filter((vessel) => !this.ships.some((ship) => ship.id === vessel.id));
    }

    getSunkShips() {
        return this.ships.filter((ship) => ship.isSunk(this));
    }

    isEveryShipSunk() {
        return this.ships.every((ship) => ship.isSunk(this));
    }

    /**
     * 
     * @param {BattleshipVessel[]} vessels 
     */
    placeVessels(vessels) {
        for (let vessel of vessels)
            if (!this.placeShip(vessel)) {
                this.ships = [];
                return false;
            }
        return true;
    }

    /**
     * @returns {number[][]}
     */
    getCurrentState() {
        let state = [];
        for (let x = 0; x < this.width; x++) {
            state[x] = [];
            for (let y = 0; y < this.height; y++)
                state[x][y] = this.checkSpace(x, y);
        }
        return state;
    }
}

class BattleshipVessel {
    constructor(x, y, orientation, size, id) {
        if (!BattleshipOrientation.getValidity(orientation))
            throw new Error("Invalid orientation");
        if (size < 1)
            throw new Error("Size has to be >1");

        this.x = x;
        this.y = y;
        this.orientation = orientation || BattleshipOrientation.HORIZONTAL;
        this.size = size || 0;
        this.id = id || "n/a";
    }

    /**
     * This function checks whether this ship overlaps with another given ship
     * Please note that this function ignores whether the ships are on the same board
     * @todo Please verify that the checks work
     * @param {BattleshipVessel} other 
     * @returns {boolean}
     */
    overlapsWith(other) {
        if (!(other instanceof BattleshipVessel))
            throw new Error("Argument other has to be of type BattleshipVessel");

        let thisBottomX, thisBottomY, otherBottomX, otherBottomY;

        if (this.orientation === BattleshipOrientation.HORIZONTAL) {
            thisBottomX = this.x + this.size - 1;
            thisBottomY = this.y;
        } else {
            thisBottomX = this.x;
            thisBottomY = this.y + this.size - 1;
        }

        if (other.orientation === BattleshipOrientation.HORIZONTAL) {
            otherBottomX = other.x + other.size - 1;
            otherBottomY = other.y;
        } else {
            otherBottomX = other.x;
            otherBottomY = other.y + other.size - 1;
        }

        if (thisBottomX < other.x || otherBottomX < thisBottomX)
            return false;
        if (thisBottomY < other.y || otherBottomY < this.y)
            return false;
        return true;
    }

    containsPoint(x, y) {
        if (this.orientation === BattleshipOrientation.HORIZONTAL) {
            return this.x <= x && x < this.x + this.size && this.y === y;
        } else {
            return this.y <= y && y < this.y + this.size && this.x === x;
        }
    }

    isSunk(board) {
        let hitCount = 0;
        board.guesses.forEach((guess) => {
            if (this.containsPoint(guess.x, guess.y) && guess.result === BattleshipGuess.HIT)
                hitCount++;
        });
        return hitCount === this.size;
    }
}

class BattleshipOrientation {
    static HORIZONTAL = 1;
    static VERTICAL = 2;

    static getValidity(orientation) {
        return orientation === BattleshipOrientation.HORIZONTAL || orientation === BattleshipOrientation.VERTICAL;
    }
}

module.exports = {
    BattleshipGame,
    BattleshipPlayer,
    BattleshipGuess,
    BattleshipBoard,
    BattleshipVessel,
    BattleshipOrientation
}