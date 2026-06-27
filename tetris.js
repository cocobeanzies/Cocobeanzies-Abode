// ─── Constants ───────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
	null,
	'#00f5ff', // I - cyan
	'#ffe600', // O - yellow
	'#a855f7', // T - purple
	'#22c55e', // S - green
	'#ef4444', // Z - red
	'#3b82f6', // J - blue
	'#f97316', // L - orange
];
const PRIDECOLORS = [
	null,
	'gay',
	'enby',
	'trans',
	'agender',
	'asexual',
	'bi',
	'pan',
]

// Each piece: array of rotation states
const PIECES = [
	// I
	[
		[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
		[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
		[[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
		[[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
	],
	// O
	[
		[[1,1],[1,1]],
	],
	// T
	[
		[[0,1,0],[1,1,1],[0,0,0]],
		[[0,1,0],[0,1,1],[0,1,0]],
		[[0,0,0],[1,1,1],[0,1,0]],
		[[0,1,0],[1,1,0],[0,1,0]],
	],
	// S
	[
		[[0,1,1],[1,1,0],[0,0,0]],
		[[0,1,0],[0,1,1],[0,0,1]],
		[[0,0,0],[0,1,1],[1,1,0]],
		[[1,0,0],[1,1,0],[0,1,0]],
	],
	// Z
	[
		[[1,1,0],[0,1,1],[0,0,0]],
		[[0,0,1],[0,1,1],[0,1,0]],
		[[0,0,0],[1,1,0],[0,1,1]],
		[[0,1,0],[1,1,0],[1,0,0]],
	],
	// J
	[
		[[1,0,0],[1,1,1],[0,0,0]],
		[[0,1,1],[0,1,0],[0,1,0]],
		[[0,0,0],[1,1,1],[0,0,1]],
		[[0,1,0],[0,1,0],[1,1,0]],
	],
	// L
	[
		[[0,0,1],[1,1,1],[0,0,0]],
		[[0,1,0],[0,1,0],[0,1,1]],
		[[0,0,0],[1,1,1],[1,0,0]],
		[[1,1,0],[0,1,0],[0,1,0]],
	],
];

var LOADER_ANIM;
function loadTetris() {
	LOADER_ANIM = document.getElementById("tetris-loader").animate([
		{}, {transform: 'scale(10)', opacity: 0}
	], {
		duration: 1000,
		easing: 'linear',
		fill: 'forwards',
	});
	LOADER_ANIM.onfinish = runTetris;
}

function runTetris() {
	document.body.tetrisRendered = true;
	document.body.classList.add('mobile-styles');
	document.getElementsByClassName('tetris-body')[0].style.display = 'flex';
	document.getElementById('socials').style.display = 'none';

	// ─── Game State ──────────────────────────────────────────────
	let board = [];
	let boardLight = [];
	let boardWave = [];
	let pieceIndex = 0;        // 1-7, the type of the active piece
	let currentPiece = null;   // the active piece's current rotation matrix
	let currentX = 0;
	let currentY = 0;
	let currentRotation = 0;
	let nextQueue = [];        // upcoming pieces (filled by the 7-bag)
	let bag = [];              // current shuffle bag
	let holdIndex = 0;         // 1-7, the held piece (0 = empty)
	let canHold = true;        // only one hold per drop
	let score = 0;
	let level = 1;
	let lines = 0;
	let gameRunning = false;
	let gameQuit = false;
	let paused = false;
	let dropInterval = 1000;
	let lastDrop = 0;
	let animationId = null;
	let timestampOffset = 0;
	const RAINBOW = 12;

	// Lock delay: brief pause after a piece lands before it locks,
	// allowing last-moment slides/rotations (modern Tetris behaviour).
	const LOCK_DELAY = 500;    // ms
	const MAX_LOCK_RESETS = 15;
	let lockTimer = 0;         // accumulated time piece has been grounded
	let lockResets = 0;        // number of moves that reset the lock timer
	let isGrounded = false;

	// ─── Canvas Setup ────────────────────────────────────────────
	const boardWrapper = document.getElementById('tetris-board-wrapper');
	const boardCanvas = document.getElementById('tetris-board');
	const nextCanvas = document.getElementById('tetris-next-piece');
	const holdCanvas = document.getElementById('tetris-hold-piece');
	let ctx, nctx, hctx;

	// ─── UI Elements ─────────────────────────────────────────────
	const scoreEl = document.getElementById('tetris-score');
	const levelEl = document.getElementById('tetris-level');
	const linesEl = document.getElementById('tetris-lines');
	const finalScoreEl = document.getElementById('tetris-final-score');
	const startScreen = document.getElementById('tetris-start-screen');
	const gameOverScreen = document.getElementById('tetris-game-over-screen');
	const pauseScreen = document.getElementById('tetris-pause-screen');

	// ─── Board Functions ─────────────────────────────────────────
	function createBoard() {
		ctx = boardCanvas.getContext('2d');
		nctx = nextCanvas.getContext('2d');
		hctx = holdCanvas.getContext('2d');
		board = [];
		for (let r = 0; r < ROWS; r++) {
			board.push(new Array(COLS).fill(0));
			boardLight.push(new Array(COLS).fill(0));
			boardWave.push(new Array(COLS).fill(0));
		}
	}

	function drawBlock(context, x, y, colorIndex, size, lightAmount) {
		const colorName = PRIDECOLORS[colorIndex];
		const light = (lightAmount || 0) * 2;
		let color;
		if (!colorName) color = [light * 2.55 * .5, light * 2.55 * .75, light * 2.55];
		else color = interpolateFlag(colorName, (timestampOffset + x + y * 2) / RAINBOW % 1, light, 255);
		context.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
		context.fillRect(x * size, y * size, size, size);

		if (colorName) {
			// Highlight (top-left)
			context.fillStyle = 'rgba(255, 255, 255, 0.3)';
			context.fillRect(x * size, y * size, size, 2);
			context.fillRect(x * size, y * size, 2, size);

			// Shadow (bottom-right)
			context.fillStyle = 'rgba(0, 0, 0, 0.3)';
			context.fillRect(x * size, (y + 1) * size - 2, size, 2);
			context.fillRect((x + 1) * size - 2, y * size, 2, size);

			// Border
			context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
			context.strokeRect(x * size, y * size, size, size);
		}
	}

	function drawBoard() {
		// Clear
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

		// Grid lines
		ctx.strokeStyle = 'rgba(255, 127, 191, 0.03)';
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
			}
		}

		// Placed blocks
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				if (board[r][c]) {
					drawBlock(ctx, c, r, board[r][c], BLOCK_SIZE, boardLight[r][c]);
				} else if (boardLight[r][c]) {
					drawBlock(ctx, c, r, 0, BLOCK_SIZE, boardLight[r][c]);
				}
			}
		}
	}

	function drawGhost() {
		if (!currentPiece) return;
		let ghostY = currentY;
		while (!collision(currentX, ghostY + 1, currentRotation)) {
			ghostY++;
		}
		if (ghostY === currentY) return;

		const shape = PIECES[pieceIndex - 1][currentRotation];
		for (let r = 0; r < shape.length; r++) {
			for (let c = 0; c < shape[r].length; c++) {
				if (shape[r][c]) {
					const x = (currentX + c) * BLOCK_SIZE;
					const y = (ghostY + r) * BLOCK_SIZE;
					const colorName = PRIDECOLORS[pieceIndex];
					let color;
					if (!colorName) color = [0, 0, 0];
					else color = interpolateFlag(colorName, (timestampOffset + c + r * 2) / RAINBOW % 1, 0, 255);
					ctx.lineWidth = 3;
					ctx.strokeStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
					ctx.globalAlpha = 0.25;
					ctx.strokeRect(x+3, y+3, BLOCK_SIZE-6, BLOCK_SIZE-6);
					ctx.globalAlpha = 0.5;
					ctx.strokeRect(x+1, y+1, BLOCK_SIZE-2, BLOCK_SIZE-2);
					ctx.lineWidth = 1;
					ctx.strokeStyle = 'white';
					ctx.globalAlpha = 0.25;
					ctx.strokeRect(x+1, y+1, BLOCK_SIZE-2, BLOCK_SIZE-2);
				}
			}
		}
		ctx.globalAlpha = 1.0;
	}

	function drawCurrentPiece() {
		if (!currentPiece) return;
		for (let r = 0; r < currentPiece.length; r++) {
			for (let c = 0; c < currentPiece[r].length; c++) {
				if (currentPiece[r][c]) {
					drawBlock(ctx, currentX + c, currentY + r, pieceIndex, BLOCK_SIZE);
				}
			}
		}
	}

	// Render a single piece centred inside a small preview canvas.
	function drawPreview(context, canvas, idx) {
		context.fillStyle = '#0c0810';
		context.fillRect(0, 0, canvas.width, canvas.height);
		if (!idx) return;

		// Use the spawn rotation and trim empty rows/cols so it centres nicely.
		const raw = PIECES[idx - 1][0];
		let minR = raw.length, maxR = -1, minC = raw[0].length, maxC = -1;
		for (let r = 0; r < raw.length; r++) {
			for (let c = 0; c < raw[r].length; c++) {
				if (raw[r][c]) {
					if (r < minR) minR = r;
					if (r > maxR) maxR = r;
					if (c < minC) minC = c;
					if (c > maxC) maxC = c;
				}
			}
		}
		const pieceRows = maxR - minR + 1;
		const pieceCols = maxC - minC + 1;
		const size = BLOCK_SIZE * 4 / 5;
		const offsetX = (canvas.width - pieceCols * size) / 2;
		const offsetY = (canvas.height - pieceRows * size) / 2;

		for (let r = minR; r <= maxR; r++) {
			for (let c = minC; c <= maxC; c++) {
				if (raw[r][c]) {
					const px = offsetX + (c - minC) * size;
					const py = offsetY + (r - minR) * size;
					const colorName = PRIDECOLORS[idx];
					let color;
					if (!colorName) color = [0, 0, 0];
					else color = interpolateFlag(colorName, (timestampOffset + c + r * 2) / RAINBOW % 1, 10, 255);
					context.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
					context.fillRect(px, py, size, size);
					context.fillStyle = 'rgba(255,255,255,0.3)';
					context.fillRect(px, py, size, 2);
					context.fillRect(px, py, 2, size);
					context.fillStyle = 'rgba(0,0,0,0.3)';
					context.fillRect(px, py + size - 2, size, 2);
					context.fillRect(px + size - 2, py, 2, size);
					context.strokeStyle = 'rgba(0,0,0,0.5)';
					context.strokeRect(px, py, size, size);
				}
			}
		}
	}

	function drawNextPiece() {
		drawPreview(nctx, nextCanvas, nextQueue[0]);
	}

	function drawHoldPiece() {
		drawPreview(hctx, holdCanvas, holdIndex);
	}

	// ─── Piece Logic ─────────────────────────────────────────────

	// 7-bag randomizer: shuffle all 7 pieces, deal them out, refill when
	// empty. Guarantees every piece appears once before any repeats.
	function refillBag() {
		bag = [1, 2, 3, 4, 5, 6, 7];
		for (let i = bag.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[bag[i], bag[j]] = [bag[j], bag[i]];
		}
	}

	function nextFromBag() {
		if (bag.length === 0) refillBag();
		return bag.pop();
	}

	// Keep the upcoming queue topped up so the preview always has a piece.
	function fillQueue() {
		while (nextQueue.length < 3) {
			nextQueue.push(nextFromBag());
		}
	}

	function spawnPiece(idx) {
		// If no index supplied, pull the next one from the queue.
		if (idx === undefined) {
			idx = nextQueue.shift();
			fillQueue();
		}
		pieceIndex = idx;
		currentRotation = 0;
		currentPiece = PIECES[pieceIndex - 1][0];
		currentX = Math.floor((COLS - currentPiece[0].length) / 2);
		currentY = 0;

		// Reset lock-delay tracking for the new piece.
		isGrounded = false;
		lockTimer = 0;
		lockResets = 0;

		// Check game over: if the new piece collides immediately.
		if (collision(currentX, currentY, currentRotation)) {
			gameOver();
		}
	}

	function holdPiece() {
		if (!canHold) return;
		const swap = holdIndex;
		holdIndex = pieceIndex;
		canHold = false;
		if (swap === 0) {
			// Nothing held yet — pull the next piece from the queue.
			spawnPiece();
		} else {
			spawnPiece(swap);
		}
	}

	function getShape(rotation) {
		const rotations = PIECES[pieceIndex - 1];
		return rotations[rotation % rotations.length];
	}

	function collision(x, y, rotation) {
		const shape = getShape(rotation);
		for (let r = 0; r < shape.length; r++) {
			for (let c = 0; c < shape[r].length; c++) {
				if (shape[r][c]) {
					const newX = x + c;
					const newY = y + r;
					if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
					if (newY >= 0 && board[newY][newX]) return true;
				}
			}
		}
		return false;
	}

	function lockPiece() {
		for (let r = 0; r < currentPiece.length; r++) {
			for (let c = 0; c < currentPiece[r].length; c++) {
				if (currentPiece[r][c]) {
					const boardY = currentY + r;
					const boardX = currentX + c;
					if (boardY >= 0) {
						board[boardY][boardX] = pieceIndex;
						boardWave[boardY][boardX] = 20;
					}
				}
			}
		}
		clearLines(pieceIndex);
		canHold = true;   // hold becomes available again for the next piece
		spawnPiece();
	}

	let back_to_back = false;
	function clearLines(idx) {
		let lowest = -1;
		let cleared = 0;
		for (let r = ROWS - 1; r >= 0; r--) {
			if (board[r].every(cell => cell !== 0)) {
				cleared++;
				if (lowest == -1) lowest = r;
			}
		}
		for (let r = ROWS - 1; r >= 0; r--) {
			if (board[r].every(cell => cell !== 0)) {
				// Remove row
				board.splice(r, 1);
				board.unshift(new Array(COLS).fill(0));
				boardWave[r].fill(cleared * 15 + 30);
				r++; // recheck this row
			}
		}
		let perfect = false;
		if (board[ROWS - 1].every(cell => cell === 0)) {
			perfect = true;
		}

		if (cleared > 0) {
			let text = '';
			let subtext = '';
			lines += cleared;
			level = Math.floor(lines / 10) + 1;
			let gained = 0;
			if (cleared == 1) {
				gained = perfect ? 800 : 100;
				if (perfect) {
					text = 'Single';
					subtext = 'Perfect'
					back_to_back = true;
				} else {
					subtext = 'Single';
					back_to_back = false;
				}
			} else if (cleared == 2) {
				gained = perfect ? 1200 : 300;
				if (perfect) {
					text = 'Double';
					subtext = 'Perfect'
					back_to_back = true;
				} else {
					subtext = 'Double';
					back_to_back = false;
				}
			} else if (cleared == 3) {
				gained = perfect ? 1800 : 500;
				if (perfect) {
					text = 'Triple';
					subtext = 'Perfect'
					back_to_back = true;
				} else {
					subtext = 'Triple';
					back_to_back = false;
				}
			} else if (cleared == 4) {
				text = 'Tetris';
				if (back_to_back) {
					gained = perfect ? 3200 : 1200;
					subtext = perfect ? 'Perfect back-to-back' : 'Back-to-back'
				} else {
					gained = perfect ? 2000 : 800;
					subtext = perfect ? 'Perfect' : '';
				}
				back_to_back = true;
			}
			score += gained * level;
			dropInterval = Math.max(100, 1000 - (level - 1) * 80);
			{
				const el = document.createElement('div');
				const elb = document.createElement('div');
				el.classList.add('t-score');
				elb.classList.add('t-score');
				elb.classList.add('bg');
				const ypx = lowest * BLOCK_SIZE;
				el.style.top = `${ypx}px`;
				elb.style.top = `${ypx}px`;
				if (text) {
					const el1 = document.createElement('div');
					el.appendChild(el1)
					el1.style.fontSize = '32px';
					for (const [i, c] of Array.from(text).entries()) {
						const s = document.createElement('span');
						el1.appendChild(s)
						s.classList.add('trans-flash');
						s.textContent = c;
						if (i) s.style.animationDelay = '-1s';
					}
				}
				if (subtext) {
					const el2 = document.createElement('div');
					el.appendChild(el2);
					el2.style.fontSize = '26px';
					el2.textContent = subtext;
					el2.classList.add('trans-flash');
				}
				boardWrapper.appendChild(elb);
				boardWrapper.appendChild(el);
				elb.style.height = window.getComputedStyle(el).height;
				const anim = elb.animate(
					[
						{opacity: 1, transform: 'scaleX(1) scaleY(1)'},
						{opacity: 0, transform: 'scaleX(4) scaleY(2)'}
					], {
						easing: 'linear',
						duration: 1000 * cleared,
					},
				)
				anim.onfinish = () => {el.remove(); elb.remove()};
				el.animate(
					[
						{opacity: 1},
						{opacity: 0}
					], {
						easing: 'linear',
						duration: 1000 * cleared,
					},
				)
			}
			updateUI();
		} else {
			back_to_back = false;
		}
	}

	function updateEffects() {
		const dirs = [
			[-1, 0],
			[1, 0],
			[0, -1],
			[0, 1],
		];
		const boardWaveB = [];
		for (let r = 0; r < ROWS; r++) {
			boardWaveB.push(new Array(COLS).fill(0));
		}
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				if (boardLight[r][c]) boardLight[r][c]--;
				if (boardWave[r][c] <= 5) continue;
				boardWaveB[r][c] = boardWave[r][c] - 5;
			}
		}
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				let value = boardWave[r][c];
				boardWave[r][c] = 0;
				boardLight[r][c] = Math.max(boardLight[r][c], value);
				value -= 5;
				if (value <= 0) continue;
				for (const dir of dirs) {
					let r1 = r + dir[0];
					let c1 = c + dir[1];
					if (r1 < 0 || c1 < 0 || r1 >= ROWS || c1 >= COLS) continue;
					if (boardWaveB[r1][c1] >= value + 5) continue;
					if (dir[0]) {
						boardWave[r1][c1] = Math.max(boardWave[r1][c1], value - 3, 0);
					} else {
						boardWave[r1][c1] = Math.max(boardWave[r1][c1], value);
					}
				}
			}
		}
	}

	function updateUI() {
		scoreEl.textContent = score;
		levelEl.textContent = level;
		linesEl.textContent = lines;
	}

	// ─── Movement ────────────────────────────────────────────────

	// When the piece is grounded, a successful move/rotate resets the lock
	// timer (up to a cap) so the piece doesn't lock instantly.
	function onSuccessfulMove() {
		if (isGrounded && lockResets < MAX_LOCK_RESETS) {
			lockTimer = 0;
			lockResets++;
		}
	}

	function moveLeft() {
		if (!collision(currentX - 1, currentY, currentRotation)) {
			currentX--;
			onSuccessfulMove();
		}
	}

	function moveRight() {
		if (!collision(currentX + 1, currentY, currentRotation)) {
			currentX++;
			onSuccessfulMove();
		}
	}

	function moveDown() {
		if (!collision(currentX, currentY + 1, currentRotation)) {
			currentY++;
			score += 1;
			return true;
		}
		return false;
	}

	function hardDrop() {
		let dropped = 0;
		while (!collision(currentX, currentY + 1, currentRotation)) {
			currentY++;
			dropped++;
		}
		score += dropped * 2;   // 2 points per cell for a hard drop
		updateUI();
		lockPiece();
	}

	// Rotate with Super Rotation System wall kicks. dir = 1 (CW) or -1 (CCW).
	function rotate(dir = 1) {
		const rotations = PIECES[pieceIndex - 1];
		const numRot = rotations.length;
		if (numRot === 1) return; // O piece doesn't rotate
		const newRotation = (currentRotation + dir + numRot) % numRot;

		// SRS-style kick offsets. The I piece uses a wider kick table.
		const isI = pieceIndex === 1;
		const kickTable = isI
			? [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]]
			: [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [0, 2], [-1, 2], [1, 2]];

		for (const [dx, dy] of kickTable) {
			// dy is in board terms (positive = down); test the kick.
			if (!collision(currentX + dx, currentY + dy, newRotation)) {
				currentX += dx;
				currentY += dy;
				currentRotation = newRotation;
				currentPiece = getShape(currentRotation);
				onSuccessfulMove();
				return;
			}
		}
	}

	// ─── Game Loop ───────────────────────────────────────────────
	let lastTime = 0;
	let lastEffect = 0;
	function gameLoop(timestamp) {
		if (!gameRunning) {
			if (gameQuit) return;
			lastTime = timestamp;
			animationId = requestAnimationFrame(gameLoop);
			return;
		}
		timestampOffset = timestamp / 1000;

		const delta = timestamp - lastTime;
		lastTime = timestamp;

		if (!paused) {
			// Is the piece currently resting on something?
			const grounded = collision(currentX, currentY + 1, currentRotation);

			if (grounded) {
				if (!isGrounded) {
					isGrounded = true;
					lockTimer = 0;
				}
				lockTimer += delta;
				// Lock once the delay elapses (or after too many move resets).
				if (lockTimer >= LOCK_DELAY || lockResets >= MAX_LOCK_RESETS) {
					lockPiece();
					lastDrop = timestamp;
				}
			} else {
				isGrounded = false;
				lockTimer = 0;
				// Gravity: drop one cell when the interval elapses.
				if (timestamp - lastDrop > dropInterval) {
					moveDown();
					lastDrop = timestamp;
				}
			}

			if (timestamp - lastEffect > 1000 / 60) {
				updateEffects();
				lastEffect = Math.max(timestamp - lastEffect * 2, lastEffect + 1000 / 60);
			}
		}

		// Draw
		drawBoard();
		drawGhost();
		drawCurrentPiece();
		drawNextPiece();
		drawHoldPiece();
		animationId = requestAnimationFrame(gameLoop);
	}

	// ─── Game Control ────────────────────────────────────────────
	function startGame() {
		createBoard();
		score = 0;
		level = 1;
		lines = 0;
		dropInterval = 1000;
		// Reset the randomizer, queue and hold.
		bag = [];
		nextQueue = [];
		holdIndex = 0;
		canHold = true;
		fillQueue();
		drawHoldPiece();
		updateUI();
		gameRunning = true;
		paused = false;
		startScreen.classList.add('hidden');
		gameOverScreen.classList.add('hidden');
		pauseScreen.classList.add('hidden');
		spawnPiece();
		lastDrop = performance.now();
		lastTime = performance.now();
		if (animationId) cancelAnimationFrame(animationId);
		animationId = requestAnimationFrame(gameLoop);
	}

	function gameOver() {
		drawBoard();
		gameRunning = false;
		finalScoreEl.textContent = score;
		gameOverScreen.classList.remove('hidden');
	}

	function togglePause() {
		if (!gameRunning) return;
		paused = !paused;
		if (paused) {
			pauseScreen.classList.remove('hidden');
		} else {
			pauseScreen.classList.add('hidden');
			lastDrop = performance.now();
		}
	}

	function quit() {
		gameRunning = false;
		gameQuit = true;
		pauseScreen.classList.add('hidden');
		gameOverScreen.classList.add('hidden');
		startScreen.classList.remove('hidden');
		document.getElementById('socials').style.display = 'block';
		document.getElementsByClassName('tetris-body')[0].style.display = 'none';
		document.body.classList.remove('mobile-styles');
		document.body.tetrisRendered = false;
		LOADER_ANIM.cancel();
		document.body.quitTetris = null;
	}
	document.body.quitTetris = quit;

	// ─── Input Handling ──────────────────────────────────────────
	document.addEventListener('keydown', (e) => {
		if (!gameRunning || paused) {
			if (e.key === 'q' || e.key === 'Q') togglePause();
			if (e.key === 'r' || e.key === 'R') {
				quit();
				runTetris();
			}
			if (e.key === 'Escape') quit();
			return;
		}

		switch (e.key) {
			case 'ArrowLeft':
				e.preventDefault();
				moveLeft();
				break;
			case 'ArrowRight':
				e.preventDefault();
				moveRight();
				break;
			case 'ArrowDown':
				e.preventDefault();
				if (moveDown()) {
					score += 1;
					updateUI();
				}
				break;
			case 'ArrowUp':
			case 'x':
			case 'X':
				e.preventDefault();
				rotate(1);   // clockwise
				break;
			case 'z':
			case 'Z':
				e.preventDefault();
				rotate(-1);  // counter-clockwise
				break;
			case ' ':
				e.preventDefault();
				hardDrop();
				break;
			case 'c':
			case 'C':
				e.preventDefault();
				holdPiece();
				break;
			case 'Escape':
			case 'q':
			case 'Q':
				togglePause();
				break;
		}
	});

	// ─── Button Listeners ────────────────────────────────────────
	document.getElementById('tetris-start-btn').addEventListener('click', startGame);
	document.getElementById('tetris-restart-btn').addEventListener('click', startGame);

	// ─── Initial Draw ────────────────────────────────────────────
	createBoard();
	drawBoard();
	drawHoldPiece();
}