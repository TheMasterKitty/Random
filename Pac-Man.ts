import aStar from "a-star";

let map =
"###################\n" +
"#●·······#·······●#\n" +
"#·##·###·#·###·##·#\n" +
"#·················#\n" +
"#·##·#·#####·#·##·#\n" +
"#····#···#···#····#\n" +
"####·###·#·###·####\n" +
"####·#·······#·####\n" +
"####·#·##-##·#·####\n" +
"#······#···#······#\n" +
"####·#·#####·#·####\n" +
"####·#·······#·####\n" +
"####·#·#####·#·####\n" +
"#········#········#\n" +
"#·##·###·#·###·##·#\n" +
"#··#····· ·····#··#\n" +
"##·#·#·#####·#·#·##\n" +
"#····#···#···#····#\n" +
"#·#####··#··#####·#\n" +
"#●···············●#\n" +
"###################";

// Constants
enum Direction {
    Up = 1,
    Down = 2,
    Left = 3,
    Right = 4
}
const pacman = { 1: "ᗢ", 2: "ᗣ", 3: "ᗤ", 4: "ᗧ" };
const movements = { 1: [ 0, -1 ], 2: [ 0, 1 ], 3: [ -1, 0 ], 4: [ 1, 0 ] };
enum Mode {
    Chase = 0, // lasts 20 seconds, then switches to scatter
    Scatter = 1, // lasts 7 seconds, then switches to chase - also is the starting mode
    Freight = 2 // when pellet, lasts 7 seconds, ghosts move at 50% speed during this
}
enum Ghost {
    Blinky = 1,
    Pinky = 3,
    Inky = 2,
    Clyde = 4
}
const modeTimeouts = {
    0: () => {
        ghostTimer = setTimeout(() => {
            ghostMode = Mode.Scatter;
            modeTimeouts[1]();
        }, 20 * 1000);
    },
    1: () => {
        ghostTimer = setTimeout(() => {
            ghostMode = Mode.Chase;
            modeTimeouts[0]();
        }, 7 * 1000);
    },
    2: () => {
        ghostTimer = setTimeout(() => {
            ghostMode = Mode.Chase;
            modeTimeouts[0]();
            ghostsEaten = 0;
        }, 7 * 1000);
    }
}

// Variables
let ghostMode: Mode = Mode.Scatter;
let ghostTimer: NodeJS.Timeout;
modeTimeouts[1]();

let pacmanPosition = [ 9, 15 ];
const positions: { [ key: number ]: any[] } = {
    1: [ 9, 7 ],
    2: [ 9, 9 ],
    3: [ 8, 9 ],
    4: [ 10, 9 ]
};
const spawning: Set<number> = new Set();
let facing: Direction = Direction.Up;
let score = 0;

const intervals: NodeJS.Timeout[] = [ ];

// Drawing and movement
function refresh() {
    const board = map.split("\n").map(s => s.split(""));
    board[pacmanPosition[1]][pacmanPosition[0]] = pacman[facing] + " ";
    const ghost = ghostMode == Mode.Freight ? `😱` : `👻`;
    board[positions[Ghost.Blinky][1]][positions[Ghost.Blinky][0]] = spawning.has(1) ?  `😵` : ghost;
    board[positions[Ghost.Inky][1]][positions[Ghost.Inky][0]] = spawning.has(2) ?  `😵` : ghost;
    board[positions[Ghost.Pinky][1]][positions[Ghost.Pinky][0]] = spawning.has(3) ?  `😵` : ghost;
    board[positions[Ghost.Clyde][1]][positions[Ghost.Clyde][0]] = spawning.has(4) ?  `😵` : ghost;
    process.stdout.write("\x1Bc\u001B[?25l" + board.map(s => s.join("")).join("\n").replace(/#/g, "⬛").replace(/([·● ])/g, "$1 ").replace("-", "⬛") + `\nScore: ${score}`);
}
intervals.push(setInterval(refresh, 50));
intervals.push(setInterval(() => {
    const board = map.split("\n").map(s => s.split(""));
    if (isAirPlayer(board, pacmanPosition[1] + movements[facing][1], pacmanPosition[0] + movements[facing][0])) {
        pacmanPosition[0] += movements[facing][0];
        pacmanPosition[1] += movements[facing][1];
        
        if (ghostMode != Mode.Freight && Object.values(positions).find(v => v[0] == pacmanPosition[0] && v[1] == pacmanPosition[1])) {
            refresh();
            console.log("\nYou Lost! Good Game.");
            end();
        }
        if (board[pacmanPosition[1]][pacmanPosition[0]] == "·") {
            board[pacmanPosition[1]][pacmanPosition[0]] = " ";
            map = board.map(s => s.join("")).join("\n");
            score += 10;
        }
        else if (board[pacmanPosition[1]][pacmanPosition[0]] == "●") {
            board[pacmanPosition[1]][pacmanPosition[0]] = " ";
            map = board.map(s => s.join("")).join("\n");
            score += 50;
            clearTimeout(ghostTimer);
            ghostMode = Mode.Freight;
            ghostsEaten = 0;
            modeTimeouts[2]();
        }
        else return;

        if (!board.flat().find(v => v == "·" || v == "●")) {
            console.log("\nYou Won! Good Game.");
            end();
        }
    }
}, 200));

// Ghost Pathfinding
const aStarDistance = (p1: any, p2: any) => Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
const aStarNeighbor = (p: any) => [ [ p[0] + 1, p[1] ], [ p[0] - 1, p[1] ], [ p[0], p[1] + 1 ], [ p[0], p[1] - 1 ] ].filter(([ x, y ]) => x >= 0 && y >= 0 && x < 19 && y < 21);
const aStarHeuristic = (start: any, board: any) => (p: any) => !isAir(board, p[1], p[0]) || Object.values(positions).find(([ x, y ]) => p[0] == x && p[1] == y) ? Infinity : Math.abs(p[0] - start[0]) + Math.abs(p[1] - start[1]);
let freightSwitch = false;
let ghostsEaten = 0;

intervals.push(setInterval(() => {
    const board = map.split("\n").map(s => s.split(""));

    const oldPositions: { [ key: number ]: any } = { 1: positions[1], 2: positions[2], 3: positions[3], 4: positions[4] };

    if (ghostMode == Mode.Freight) {
        freightSwitch = !freightSwitch;
        if (freightSwitch) {
            for (const ghost of [ 1, 2, 3, 4 ].filter(v => !spawning.has(v))) {
                const pos = positions[ghost];
                const possible = [ [ 1, 0 ], [ 0, 1 ], [ 0, -1 ] ].filter(([ x, y ]) => isAir(board, pos[1] + y, pos[0] + x));
                if (possible.length == 0) continue;
                const [ x, y ] = possible[Math.floor(Math.random() * possible.length)];
                positions[ghost] = [ pos[0] + x, pos[1] + y ];
            }
        }

        Object.entries(positions).filter(([ k, v ]) => !spawning.has(k as any) && v[0] == pacmanPosition[0] && v[1] == pacmanPosition[1]).forEach(([ k, _v ]) => {
            spawning.add(Number(k));
            score += 200 * Math.pow(2, ghostsEaten++);
        });
    }
    else if (ghostMode == Mode.Chase) {
        const pinkyEnd = [ ... pacmanPosition ];
        if (isAir(board, pinkyEnd[1] + movements[facing][1], pinkyEnd[0] + movements[facing][0])) {
            pinkyEnd[0] += movements[facing][0];
            pinkyEnd[1] += movements[facing][1];
        }
        if (isAir(board, pinkyEnd[1] + movements[facing][1], pinkyEnd[0] + movements[facing][0])) {
            pinkyEnd[0] += movements[facing][0];
            pinkyEnd[1] += movements[facing][1];
        }
        { // inky
            const inkyEnd = [ pinkyEnd[0] * 2 - positions[Ghost.Blinky][0], pinkyEnd[1] * 2 - positions[Ghost.Blinky][1] ];
            const res = aStar({
                "start": positions[Ghost.Inky],
                "distance": aStarDistance,
                "isEnd": (p: any) => p[0] == inkyEnd[0] && p[1] == inkyEnd[1],
                "heuristic": aStarHeuristic(positions[Ghost.Inky], board),
                "neighbor": aStarNeighbor
            });
            tryMove(board, positions[Ghost.Inky], res.path[1]);
        }
        { // blinky
            const res = aStar({
                "start": positions[Ghost.Blinky],
                "distance": aStarDistance,
                "isEnd": (p: any) => p[0] == pacmanPosition[0] && p[1] == pacmanPosition[1],
                "heuristic": aStarHeuristic(positions[Ghost.Blinky], board),
                "neighbor": aStarNeighbor
            });
            tryMove(board, positions[Ghost.Blinky], res.path[1]);
        }
        { // pinky
            const res = aStar({
                "start": positions[Ghost.Pinky],
                "distance": aStarDistance,
                "isEnd": (p: any) => p[0] == pinkyEnd[0] && p[1] == pinkyEnd[1],
                "heuristic": aStarHeuristic(positions[Ghost.Pinky], board),
                "neighbor": aStarNeighbor
            });
            tryMove(board, positions[Ghost.Pinky], res.path[1]);
        }
        { // clyde
            let end = pacmanPosition;
            if (aStarDistance(positions[Ghost.Clyde], end) <= 4) end = [ 1, 19 ];
            const res = aStar({
                "start": positions[Ghost.Clyde],
                "distance": aStarDistance,
                "isEnd": (p: any) => p[0] == end[0] && p[1] == end[1],
                "heuristic": aStarHeuristic(positions[Ghost.Clyde], board),
                "neighbor": aStarNeighbor
            });
            tryMove(board, positions[Ghost.Clyde], res.path[1]);
        }
    }
    else if (ghostMode == Mode.Scatter) {
        { // blinky
            const res = aStar({
                "start": positions[Ghost.Blinky],
                "distance": aStarDistance,
                "isEnd": (p: any) => p[0] == 17 && p[1] == 1,
                "heuristic": aStarHeuristic(positions[Ghost.Blinky], board),
                "neighbor": aStarNeighbor
            });
            tryMove(board, positions[Ghost.Blinky], res.path[1]);
        }
        { // inky
            const res = aStar({
                "start": positions[Ghost.Inky],
                "distance": aStarDistance,
                "isEnd": (p: any) => p[0] == 17 && p[1] == 19,
                "heuristic": aStarHeuristic(positions[Ghost.Inky], board),
                "neighbor": aStarNeighbor
            });
            tryMove(board, positions[Ghost.Inky], res.path[1]);
        }
        { // pinky
            const res = aStar({
                "start": positions[Ghost.Pinky],
                "distance": aStarDistance,
                "isEnd": (p: any) => p[0] == 1 && p[1] == 1,
                "heuristic": aStarHeuristic(positions[Ghost.Pinky], board),
                "neighbor": aStarNeighbor
            });
            tryMove(board, positions[Ghost.Pinky], res.path[1]);
        }
        { // clyde
            const res = aStar({
                "start": positions[Ghost.Clyde],
                "distance": aStarDistance,
                "isEnd": (p: any) => p[0] == 1 && p[1] == 19,
                "heuristic": aStarHeuristic(positions[Ghost.Clyde], board),
                "neighbor": aStarNeighbor
            });
            tryMove(board, positions[Ghost.Clyde], res.path[1]);
        }
    }

    for (const ghost of Array.from(spawning)) {
        const aStarHeuristic = (start: any, board: any) => (p: any) => !isAir(board, p[1], p[0]) ? Infinity : Math.abs(p[0] - start[0]) + Math.abs(p[1] - start[1]);
        const res = aStar({
            "start": oldPositions[ghost],
            "distance": aStarDistance,
            "isEnd": (p: any) => Math.abs(p[0] - 9) <= 1 && p[1] == 9,
            "heuristic": aStarHeuristic(oldPositions[ghost], board),
            "neighbor": aStarNeighbor
        });
        tryMove(board, positions[ghost], res.path[1], oldPositions[ghost]);
        if (ghostMode != Mode.Freight && positions[ghost][0] == 9 && positions[ghost][1] == 9) spawning.delete(ghost);
    }

    if (ghostMode != Mode.Freight && Object.values(positions).find(([ x, y ]) => x == pacmanPosition[0] && y == pacmanPosition[1])) {
        refresh();
        console.log("\nYou Lost! Good Game.");
        end();
    }
}, 195));

// Input
process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");
process.stdin.on("data", async (keyStr: string) => {
    process.stdin.pause();

    const key = keyStr.charCodeAt(keyStr.length - 1);
    
    let attempted: Direction;
    if (key == 3) process.exit();
    else if (key == 65 || key == 119) attempted = Direction.Up;
    else if (key == 68 || key == 97) attempted = Direction.Left;
    else if (key == 66 || key == 115) attempted = Direction.Down;
    else if (key == 67 || key == 100) attempted = Direction.Right;
    else {
        process.stdin.resume();
        return;
    }

    const board = map.split("\n").map(s => s.split(""));
    if (isAirPlayer(board, pacmanPosition[1] + movements[attempted][1], pacmanPosition[0] + movements[attempted][0])) {
        facing = attempted;
    }
    
    process.stdin.resume();
});

// Utils
function isAir(board: string[][], y: number, x: number) {
    if (y < 0 || x < 0 || y >= board.length || x >= board[0].length) return false;
    const v = board[y][x];
    return v == " " || v == "·" || v == "●" || v == "-";
}
function isAirPlayer(board: string[][], y: number, x: number) {
    if (y < 0 || x < 0 || y >= board.length || x >= board[0].length) return false;
    const v = board[y][x];
    return v == " " || v == "·" || v == "●";
}
function end() {
    for (const interval of intervals) clearInterval(interval);

    console.log("Press any key to exit.");
    process.stdin.on("data", (d: string) => {
        if (d.length < 1) return;
        const key = d.charCodeAt(d.length - 1);
        if (key == 65 || key == 119 || key == 68 || key == 97 ||
            key == 66 || key == 115 || key == 67 || key == 100) return;
        process.exit(0)
    });
}
function tryMove(board: string[][], entity: any, to: any, elseMove: any = null) {
    if (to == null || !isAir(board, to[1], to[0])) {
        if (elseMove != null) {
            entity[0] = elseMove[0];
            entity[1] = elseMove[1];
        }
        return;
    }

    entity[0] = to[0];
    entity[1] = to[1];
}