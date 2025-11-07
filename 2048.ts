import { randomInt } from "crypto";

const board: (null | number)[][] = [
    [ null, null, null, null ],
    [ null, null, null, null ],
    [ null, null, null, null ],
    [ null, null, null, null ]
];
let score: number = 0;

enum Direction {
    Up, Left, Down, Right
}

function copyBoard(board: (null | number)[][]): (null | number)[][] {
    const b: (null | number)[][] = [ ];
    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row].length; col++) {
            b[row][col] = board[row][col];
        }
    }
    return b;
}
function placeRandom2Or4(): boolean {
    const valid: [ number, number ][ ] = [ ];
    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row].length; col++) {
            if (board[row][col] == null) valid.push([ col, row ]);
        }
    }
    if (valid.length == 0) return false;
    
    const v = valid[randomInt(valid.length)];
    board[v[1]][v[0]] = randomInt(10) == 0 ? 4 : 2;

    return true;
}
function concatenate(from: number, to: number, row: boolean, merge: boolean) {
    if (row) {
        const f = board[from], t = board[to];
        for (let col = 0; col < f.length; col++) {
            const fromVal = f[col], toVal = t[col];
            if (fromVal == null) continue;

            if (toVal == fromVal && merge) {
                const doubled = fromVal * 2;
                t[col] = doubled;
                f[col] = null;
                score += doubled;
            }
            else if (toVal == null) {
                t[col] = fromVal;
                f[col] = null;
            }
        }
    }
    else {
        for (let row = 0; row < board.length; row++) {
            const fromVal = board[row][from], toVal = board[row][to];
            if (fromVal == null) continue;

            if (toVal == fromVal) {
                const doubled = fromVal * 2;
                board[row][to] = doubled;
                board[row][from] = null;
                score += doubled;
            }
            else if (toVal == null) {
                board[row][to] = fromVal;
                board[row][from] = null;
            }
        }
    }
}
function checkGGs(): boolean {
    if (move(copyBoard(board), Direction.Up, true)) return false;
    if (move(copyBoard(board), Direction.Left, true)) return false;
    if (move(copyBoard(board), Direction.Down, true)) return false;
    if (move(copyBoard(board), Direction.Right, true)) return false;

    return true;
}
function move(board: (null | number)[][], dir: Direction, check: boolean = false): void | boolean {
    const fromBoard = JSON.stringify(board);

    for (const merge of [ true, false ]) {
        if (dir == Direction.Up) for (let i = 3; i > 0; i--) concatenate(i, i - 1, true, merge);
        else if (dir == Direction.Left) for (let i = 3; i > 0; i--) concatenate(i, i - 1, false, merge);
        else if (dir == Direction.Down) for (let i = 0; i < 3; i++) concatenate(i, i + 1, true, merge);
        else if (dir == Direction.Right) for (let i = 0; i < 3; i++) concatenate(i, i + 1, false, merge);
    }
    
    if (check) return JSON.stringify(board) != fromBoard;
    if (JSON.stringify(board) == fromBoard) return;

    if (board.flat().includes(2048)) {
        draw();
        process.stdout.write("Game Over! You Won!");
        process.exit(0);
    }
    if (!placeRandom2Or4() || checkGGs()) {
        draw();
        process.stdout.write("Game Over! You lost...");
        process.exit(0);
    }

    draw();
}
function draw() {
    const chw = 4;
    process.stdout.write("\x1Bc\u001B[?25l" + board.map(s => s.map(v => String(v ?? " ")).map(v => `[ ${" ".repeat(Math.ceil(chw - v.length / 2))}${v}${" ".repeat(Math.floor(chw - v.length / 2))} ]`).join(" ")).join("\n") + `\nScore: ${score}\n`);
}

process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");
process.stdin.on("data", async (keyStr: string) => {
    process.stdin.pause();

    const key = keyStr.charCodeAt(keyStr.length - 1);
    
    if (key == 3) process.exit();
    else if (key == 65 || key == 119) move(board, Direction.Up);
    else if (key == 68 || key == 97) move(board, Direction.Left);
    else if (key == 66 || key == 115) move(board, Direction.Down);
    else if (key == 67 || key == 100) move(board, Direction.Right);
    process.stdin.resume();
});

placeRandom2Or4();
placeRandom2Or4();
draw();