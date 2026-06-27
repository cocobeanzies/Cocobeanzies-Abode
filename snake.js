const snakeBoardSize = 11;
const snakeGameCanvas = document.getElementById('snake-game');
const snakeGameScore = document.getElementById('snake-score-current');
const snakeGameHighScore = document.getElementById('snake-score-high');
const snakeGamePause = document.getElementById('snake-pause');
var snakeHighScore = getCookie('snakeHighScore') || 0;
snakeGameHighScore.textContent = `High Score: ${snakeHighScore}`;
var snakeGame = {
	isRendered: false,
	isPlaying: false,
	isDead: false,
	isPaused: false,
	boardSize: snakeBoardSize,
	snake: [],
	snakeHead: null,
	snakeTail: null,
	snakeBodies: [],
	apples: [],
	appleObjects: []
};
function snakeUpdateApple(apple) {
	const sg = snakeGame;
	if (!sg.isRendered) return;
	const rect = snakeGameCanvas.getBoundingClientRect();
	const cw = rect.width / sg.boardSize;
	const ch = rect.height / sg.boardSize;
	const [x, y] = apple.xy;
	const tx = (x + 0.25) * cw;
	const ty = (y + 0.25) * ch;
	apple.width = rect.width / sg.boardSize / 2;
	apple.style.left = '0px';
	apple.style.top = '0px';
	apple.style.position = 'absolute';
	apple.style.height = 'auto';
	apple.style.zIndex = '1';
	apple.style.transform = `translate(${tx}px, ${ty}px)`;
}
function snakeSpawnApple(exclude) {
	const sg = snakeGame;
	if (!sg.isRendered) return;
	const occupied = new Array(sg.boardSize * sg.boardSize).fill(false);
	for (let i = 0; i < sg.snake.length; i++) {
		const x = sg.snake[i][0];
		const y = sg.snake[i][1];
		occupied[y * sg.boardSize + x] = true;
	}
	if (exclude != null) {
		occupied[exclude[1] * sg.boardSize + exclude[0]] = true;
	}
	const available = [];
	for (let i = 0; i < occupied.length; i++) {
		if (!occupied[i]) {
			available.push(i);
		}
	}
	const i = randint(0, available.length - 1);
	const index = available[i];
	const x = index % sg.boardSize;
	const y = (index - x) / sg.boardSize;

	sg.apples.push([x, y]);
	const appleImages = [
		"blood-orange.webp",
		"dragonfruit.webp",
		"elderberry.webp",
		"miracle-fruit.webp"
	]
	const appleInd = randint(0, appleImages.length - 1);
	const appleName = appleImages[appleInd];
	apple = document.createElement('img');
	apple.crossOrigin = "anonymous";
	apple.className = 'apple';
	apple.src = "https://cocobeanzies.mizabot.xyz/icons/" + appleName;
	apple.alt = "";
	apple.animated = false;
	apple.xy = [x, y];
	snakeUpdateApple(apple);
	snakeGameCanvas.appendChild(apple);
	sg.appleObjects.push(apple);

	const animation = apple.animate([
		{ opacity: '0' },
		{ opacity: '1' }
	], {
		duration: 500,
		easing: 'linear',
		fill: 'forwards'
	});
	apple.anim = animation;
}
function getStartTransform(body, precompute) {
	if (!body.initialised) return [null, 0];
	if (precompute) {
		const style = window.getComputedStyle(body);
		return [
			style.transform || style.webkitTransform || style.mozTransform,
			-40
		];
	}
	return [
		body.lastTransform,
		0
	];
}
function renderSnakeGame(precompute) {
	if (0) {
		const sg = snakeGame;
		const rect = snakeGameCanvas.getBoundingClientRect();
		const cw = rect.width / sg.boardSize;
		const ch = rect.height / sg.boardSize;
		for (const debug of Array.from(document.getElementsByClassName('debug'))) {
			debug.remove();
		}
		sg.snake.forEach((pos, i) => {
			const [x, y] = pos;
			debug = document.createElement('div');
			debug.className = 'debug';
			const tx = x * cw;
			const ty = y * ch;
			debug.style.left = `${tx}px`;
			debug.style.top = `${ty}px`;
			debug.style.width = `${cw}px`;
			debug.style.height = `${ch}px`;
			debug.style.position = 'absolute';
			const c = (1 - i / sg.snake.length / 2) * 255;
			debug.style.backgroundColor = `rgb(${c}, ${c}, ${c})`;
			debug.style.zIndex = '1';
			snakeGameCanvas.appendChild(debug);
		});
	}

	const lookAhead = 1 / 3;
	const sg = snakeGame;
	const fpsDelay = 1000 / sg.FPS;
	const rect = snakeGameCanvas.getBoundingClientRect();
	const cw = rect.width / sg.boardSize;
	const ch = rect.height / sg.boardSize;
	const sgNext = structuredClone(sg.snake);
	const sgnx = sg.x + sg.vx * lookAhead;
	const sgny = sg.y + sg.vy * lookAhead;
	for (let i = sgNext.length - 1; i > 0; i--) {
		sgNext[i][0] = lerp(sg.snake[i][0], sg.snake[i - 1][0], lookAhead);
		sgNext[i][1] = lerp(sg.snake[i][1], sg.snake[i - 1][1], lookAhead);
	}
	sgNext[0][0] = sgnx;
	sgNext[0][1] = sgny;
	let sgpvx = sg.snake[0][0] - sg.snake[1][0];
	let sgpvy = sg.snake[0][1] - sg.snake[1][1];
	let sgvx = sg.vx;
	let sgvy = sg.vy;
	if (precompute) {
		sgvx += sgpvx;
		sgvy += sgpvy;
	}
	let tx;
	let ty;
	let z;
	{
		const body = sg.snakeHead;
		const [transform, delay] = getStartTransform(body, precompute);
		tx = sgnx * cw - body.width / 2 + cw / 2;
		ty = sgny * ch - body.height / 2 + ch / 2;
		z = Math.atan2(-sgvy, -sgvx) * 180 / Math.PI;
		body.Z = z;
		z -= body.currentRotation;
		z %= 360;
		if (z < -180) z += 360;
		if (z > 180) z -= 360;
		z += body.currentRotation;
		body.currentRotation = z;
		const finalState = `translate(${tx}px, ${ty}px) rotate(${z}deg)`;
		if (body.anim) body.anim.cancel();
		const opacity = '' + body.currentOpacity;
		const animation = body.animate([
			{ transform: (transform || finalState), opacity: opacity },
			{ transform: finalState, opacity: '1' }
		], {
			duration: fpsDelay,
			delay: delay,
			easing: 'linear',
			fill: 'forwards'
		});
		body.currentOpacity = 1;
		body.lastTransform = finalState;
		body.anim = animation;
		animation.onfinish = () => {
			body.style.transform = finalState;
		};
		if (!body.initialised) {
			body.style.visibility = 'visible';
			body.initialised = true;
		}
	}
	for (let i = 0; i < sg.snakeBodies.length; i++) {
		const body = sg.snakeBodies[i];
		const [transform, delay] = getStartTransform(body, precompute);
		const sgi = Math.floor(i / 2) + 1;
		const isAlt = i & 1;
		const px = sgNext[sgi - 1][0];
		const py = sgNext[sgi - 1][1];
		const cx = sgNext[sgi][0];
		const cy = sgNext[sgi][1];
		const nx = sgNext[sgi + 1][0];
		const ny = sgNext[sgi + 1][1];
		const dx1 = px - cx;
		const dy1 = py - cy;
		const dx2 = cx - nx;
		const dy2 = cy - ny;
		let z1;
		let z2;
		if (dx1 == 0 && dy1 == 0) {
			z1 = sg.snakeHead.Z;
		} else {
			z1 = Math.atan2(-dy1, -dx1);
		}
		if (dx2 == 0 && dy2 == 0) {
			z2 = sg.snakeHead.Z;
		} else {
			z2 = Math.atan2(-dy2, -dx2);
		}
		if (z2 - z1 > Math.PI) z2 -= Math.PI * 2;
		if (z1 - z2 > Math.PI) z1 -= Math.PI * 2;
		let z;
		if (Math.abs(z1 - z2) < 1) {
			if (isAlt) {
				const px = sg.snake[sgi - 1][0];
				const py = sg.snake[sgi - 1][1];
				const cx = sg.snake[sgi][0];
				const cy = sg.snake[sgi][1];
				const nx = sg.snake[sgi + 1][0];
				const ny = sg.snake[sgi + 1][1];
				const dx1 = px - cx;
				const dy1 = py - cy;
				const dx2 = cx - nx;
				const dy2 = cy - ny;
				let z1;
				let z2;
				if (dx1 == 0 && dy1 == 0) {
					z1 = sg.snakeHead.Z;
				} else {
					z1 = Math.atan2(-dy1, -dx1);
				}
				if (dx2 == 0 && dy2 == 0) {
					z2 = sg.snakeHead.Z;
				} else {
					z2 = Math.atan2(-dy2, -dx2);
				}
				if (z2 - z1 > Math.PI) z2 -= Math.PI * 2;
				if (z1 - z2 > Math.PI) z1 -= Math.PI * 2;
				z = lerp(z2, z1, 1 / 4);
			} else {
				z = z1;
			}
		} else if (isAlt) {
			z = lerp(z2, z1, 1 / 4);
		} else {
			z = lerp(z2, z1, 3 / 4);
		}
		z *= 180 / Math.PI;
		z -= body.currentRotation;
		z %= 360;
		if (z < -180) z += 360;
		if (z > 180) z -= 360;
		z += body.currentRotation;
		body.currentRotation = z;
		if (isAlt) {
			tx = lerp(cx, nx, 1 / 4);
			ty = lerp(cy, ny, 1 / 4);
		} else {
			tx = lerp(cx, px, 1 / 4);
			ty = lerp(cy, py, 1 / 4);
		}
		tx *= cw;
		ty *= ch;
		tx = tx - body.width / 2 + cw / 2;
		ty = ty - body.height / 2 + ch / 2;
		let initialState;
		if (!transform) {
			let ix;
			let iy;
			if (isAlt) {
				ix = lerp(cx, nx, 3 / 4) * cw - body.width / 2 + cw / 2;
				iy = lerp(cy, ny, 3 / 4) * ch - body.height / 2 + ch / 2;
			} else {
				ix = lerp(cx, nx, 1 / 4) * cw - body.width / 2 + cw / 2;
				iy = lerp(cy, ny, 1 / 4) * ch - body.height / 2 + ch / 2;
			}
			initialState = `translate(${ix}px, ${iy}px) rotate(${z2}deg)`;
		}
		const finalState = `translate(${tx}px, ${ty}px) rotate(${z}deg)`;
		if (body.anim) body.anim.cancel();
		const opacity = '' + body.currentOpacity;
		const animation = body.animate([
			{ transform: (transform || initialState), opacity: opacity },
			{ transform: finalState, opacity: '1' }
		], {
			duration: fpsDelay,
			delay: delay,
			easing: 'linear',
			fill: 'forwards'
		});
		body.currentOpacity = 1;
		body.lastTransform = finalState;
		body.anim = animation;
		animation.onfinish = () => {
			body.style.transform = finalState;
		};
		if (!body.initialised) {
			body.style.visibility = 'visible';
			body.initialised = true;
		}
	}
	{
		const body = sg.snakeTail;
		const [transform, delay] = getStartTransform(body, precompute);
		const px = sgNext[sgNext.length - 2][0];
		const py = sgNext[sgNext.length - 2][1];
		const cx = sgNext[sgNext.length - 1][0];
		const cy = sgNext[sgNext.length - 1][1];
		const vx = px - cx;
		const vy = py - cy;
		tx = cx * cw - body.width / 2 + cw / 2;
		ty = cy * ch - body.height / 2 + ch / 2;
		if (vx == 0 && vy == 0) {
			z = sg.snakeHead.Z;
		} else {
			z = Math.atan2(-vy, -vx) * 180 / Math.PI;
		}
		z -= body.currentRotation;
		z %= 360;
		if (z < -180) z += 360;
		if (z > 180) z -= 360;
		z += body.currentRotation;
		body.currentRotation = z;
		const finalState = `translate(${tx}px, ${ty}px) rotate(${z}deg)`;
		if (body.anim) body.anim.cancel();
		const opacity = '' + body.currentOpacity;
		const animation = body.animate([
			{ transform: (transform || finalState), opacity: opacity },
			{ transform: finalState, opacity: '1' }
		], {
			duration: fpsDelay,
			delay: delay,
			easing: 'linear',
			fill: 'forwards'
		});
		body.currentOpacity = 1;
		body.lastTransform = finalState;
		body.anim = animation;
		animation.onfinish = () => {
			body.style.transform = finalState;
		};
		if (!body.initialised) {
			body.style.visibility = 'visible';
			body.initialised = true;
		}
	}
}
function ensureSnakeSprites() {
	const sg = snakeGame;
	const rect = snakeGameCanvas.getBoundingClientRect();
	const cw = rect.width / sg.boardSize;
	const ch = rect.height / sg.boardSize;
	let rerender = false;
	if (!sg.snakeHead) {
		dog = document.createElement('img');
		dog.className = 'dog';
		dog.src = "https://cocobeanzies.mizabot.xyz/icons/dog-head.webp";
		dog.alt = "";
		dog.style.left = '0px';
		dog.style.top = '0px';
		dog.style.position = 'absolute';
		dog.style.zIndex = '10000';
		dog.style.opacity = '0';
		dog.style.visibility = 'hidden';
		dog.currentOpacity = 0;
		dog.currentRotation = 0;
		snakeGameCanvas.appendChild(dog);
		sg.snakeHead = dog;
	}
	if (sg.snakeHead.UW != rect.width / sg.boardSize) {
		sg.snakeHead.width = rect.width / sg.boardSize;
		sg.snakeHead.UW = rect.width / sg.boardSize;
		sg.snakeHead.style.height = 'auto';
		rerender = true;
	}
	const usedHeight = sg.snakeHead.height;
	if (!usedHeight) {
		return;
	}
	if (!sg.snakeTail) {
		dog = document.createElement('img');
		dog.className = 'dog';
		dog.src = "https://cocobeanzies.mizabot.xyz/icons/dog-tail.webp";
		dog.alt = "";
		dog.style.left = '0px';
		dog.style.top = '0px';
		dog.style.position = 'absolute';
		dog.style.zIndex = '9999';
		dog.style.opacity = '0';
		dog.style.visibility = 'hidden';
		dog.currentOpacity = 0;
		dog.currentRotation = 0;
		snakeGameCanvas.appendChild(dog);
		sg.snakeTail = dog;
	}
	if (sg.snakeTail.UH != usedHeight) {
		sg.snakeTail.height = usedHeight;
		sg.snakeTail.UH = usedHeight;
		sg.snakeTail.style.width = 'auto';
	}
	if (sg.snake.length - 2 < sg.snakeBodies.length / 2) {
		sg.snakeBodies.length = (sg.snake.length - 2) * 2;
	} else {
		while (sg.snake.length - 2 > sg.snakeBodies.length / 2) {
			dog = document.createElement('img');
			dog.className = 'dog';
			dog.src = "https://cocobeanzies.mizabot.xyz/icons/dog-body.png";
			dog.alt = "";
			dog.style.left = '0px';
			dog.style.top = '0px';
			dog.style.position = 'absolute';
			const z = 9998 - sg.snakeBodies.length;
			dog.style.zIndex = `${z}`;
			dog.style.opacity = '0';
			dog.style.visibility = 'hidden';
			dog.currentOpacity = sg.snakeBodies.length < 2 ? 0 : 1;
			dog.currentRotation = 0;
			snakeGameCanvas.appendChild(dog);
			sg.snakeBodies.push(dog);
		}
	}
	for (const body of sg.snakeBodies) {
		if (body.UH != usedHeight) {
			body.height = usedHeight;
			body.UH = usedHeight;
			body.style.width = 'auto';
		}
	}
	if (rerender) {
		for (const apple of sg.appleObjects) {
			snakeUpdateApple(apple);
		}
	}
	return true;
}
function updateSnakeGame(interval) {
	const sg = snakeGame;
	if (!sg.isRendered || sg.isPaused || sg.isDead || interval[0]) return;
	requestAnimationFrame(() => { updateSnakeGame(interval) });
	const fpsDelay = 1000 / sg.FPS;
	const time = Date.now();
	if (time - sg.timer < fpsDelay) return;
	sg.timer = Math.max(sg.timer + fpsDelay, time - fpsDelay);
	const rect = snakeGameCanvas.getBoundingClientRect();
	const cw = rect.width / sg.boardSize;
	const ch = rect.height / sg.boardSize;
	if (!ensureSnakeSprites()) return;
	const currentScore = sg.snake.length - 3;
	snakeGameScore.textContent = `Score: ${currentScore}`;
	if (currentScore > snakeHighScore) {
		snakeHighScore = currentScore;
		document.cookie = "snakeHighScore=" + snakeHighScore;
		snakeGameHighScore.textContent = `High Score: ${snakeHighScore}`;
	}
	if (sg.vx != 0 || sg.vy != 0) {
		sg.x += sg.vx;
		sg.y += sg.vy;
		if (sg.x < 0 || sg.y < 0 || sg.x >= sg.boardSize || sg.y >= sg.boardSize) {
			sg.isDead = true;
		}
		for (let i = 0; i < sg.snake.length - 1; i++) {
			if (sg.x == sg.snake[i][0] && sg.y == sg.snake[i][1]) {
				sg.isDead = true;
			}
		}
		if (sg.isDead) {
			snakeGamePause.innerHTML = '<span style="color: white; font-size: 16px"><a style="cursor: pointer" onclick="closeSnakeGame()">ESC: Quit</a>, <a style="cursor: pointer" onclick="endSnakeGame(); startSnakeGame()">R: Restart</a></span><br />' + `Game Over!<br />Score: ${currentScore}/${snakeHighScore}`;
			snakeGamePause.style.display = "block";
		}
		for (let i = 0; i < sg.apples.length; i++) {
			const x = sg.apples[i][0];
			const y = sg.apples[i][1];
			if (x == sg.x && y == sg.y) {
				const apple = sg.appleObjects[i];
				if (apple.anim) apple.anim.cancel();
				apple.anim = null;
				sg.apples.splice(i, 1);
				sg.appleObjects.splice(i, 1);
				let isReset = false;
				if (sg.snake.length + 1 >= sg.boardSize * sg.boardSize / 2) {
					sg.boardSize += 2;
					for (const snake of sg.snake) {
						snake[0] += 1;
						snake[1] += 1;
					}
					sg.x += 1;
					sg.y += 1;
					sg.FPS += 2;
					isReset = true;
				}
				snakeSpawnApple([x, y]);
				sg.snake.push([0, 0]);
				const animation = apple.animate([
					{ opacity: '1' },
					{ opacity: '0' }
				], {
					duration: fpsDelay / 5,
					easing: 'linear',
					fill: 'forwards'
				});
				const rect = apple.getBoundingClientRect();
				const col = getMeanColour(apple);
				for (let i = 0; i < 16; i++) {
					const x = rect.x + rect.width / 2;
					const y = rect.y + rect.height / 2;
					const z = Math.random() * 360;
					const vx = Math.cos(z) * 3 * 100 * (Math.random() * 1.5 + 0.25);
					const vy = Math.sin(z) * 3 * 100 * (Math.random() * 1.5 + 0.25);
					spawnParticle('circle', col, x, y, vx, vy, 100, 0.1, 250, 750);
				}
				animation.onfinish = () => {
					apple.remove();
				};
				ensureSnakeSprites();
			}
		}
		for (let i = sg.snake.length - 1; i > 0; i--) {
			sg.snake[i][0] = sg.snake[i - 1][0];
			sg.snake[i][1] = sg.snake[i - 1][1];
		}
		sg.snake[0][0] = sg.x;
		sg.snake[0][1] = sg.y;
		renderSnakeGame();
		if (sg.buffer) {
			if (sg.buffer[0] == sg.vx && sg.buffer[1] == sg.vy) {
				sg.buffer = null;
			} else {
				sg.vx = sg.buffer[0];
				sg.vy = sg.buffer[1];
				setTimeout(() => { requestAnimationFrame(() => { renderSnakeGame(true) }) }, fpsDelay / 2);
			}
		}
		if (!snakeGame.isPlaying) {
			snakeGame.isPlaying = true;
			const galaxy = document.getElementById('snake-galaxy');
			if (galaxy.anim) galaxy.anim.cancel();
			const animation = galaxy.animate([
				{},
				{ opacity: '0' }
			], {
				duration: 1000,
				easing: 'linear'
			});
			galaxy.anim = animation;
			animation.onfinish = () => {
				galaxy.style.display = 'none';
			};
			snakeGamePause.style.display = "none";
		}
	}
}
function snakeGameLoop() {
	const sg = snakeGame;
	if (snakeGame.interval) snakeGame.interval[0] = true;
	const fpsDelay = 1000 / sg.FPS;
	sg.interval = [false];
	updateSnakeGame(sg.interval);
}
function startSnakeGame() {
	// document.cookie = "snakeOpen=1";
	snakeGame.isRendered = true;
	const c = (snakeGame.boardSize - 1) / 2;
	snakeGame.FPS = snakeGame.boardSize * 2 / 3;
	snakeGame.x = c;
	snakeGame.y = c;
	snakeGame.vx = 0;
	snakeGame.vy = 0;
	snakeGame.buffer = null;
	snakeGame.timer = Date.now();
	snakeGame.snake = [
		[c, c],
		[c, c],
		[c, c],
	];
	const galaxy = document.getElementById('snake-galaxy');
	if (galaxy.anim) galaxy.anim.cancel();
	galaxy.anim = null;
	galaxy.style.display = 'block';
	galaxy.style.opacity = '0.75';
	snakeSpawnApple();
}
function endSnakeGame() {
	snakeGame.isRendered = false;
	const snakes = document.getElementsByClassName('dog');
	Array.from(snakes).forEach((e) => { e.remove() });
	const apples = document.getElementsByClassName('apple');
	Array.from(apples).forEach((e) => { e.remove() });
	snakeGame = {
		isRendered: false,
		isPlaying: false,
		isDead: false,
		isPaused: false,
		boardSize: snakeBoardSize,
		snake: [],
		snakeHead: null,
		snakeTail: null,
		snakeBodies: [],
		apples: [],
		appleObjects: []
	};
	snakeGamePause.innerHTML = '<span style="color: white; font-size: 16px"><a style="cursor: pointer" onclick="closeSnakeGame()">ESC: Quit</a></span><br />Press any arrow key to start!';
	snakeGamePause.style.display = "block";
}
function closeSnakeGame() {
	endSnakeGame();
	document.body.classList.remove('mobile-styles');
	resizeCanvas();
	if (snakeGame.interval) snakeGame.interval[0] = true;
	// document.cookie = "snakeOpen=0";
	const animation = snakeGameBlock.animate([
		{ opacity: '1' },
		{ opacity: '0' }
	], {
		duration: 1000,
		easing: 'linear',
		fill: 'forwards'
	});
	animation.onfinish = () => {
		snakeGameBlock.style.display = 'none';
		const portal = document.getElementById('worm-galaxy');
		portal.style.display = 'block';
		const w = content.getBoundingClientRect().width;
		const x = w - portal.width;
		portal.style.left = `${x}px`;
		if (portal.anim) portal.anim.cancel();
		const animation = portal.animate([
			{ opacity: '0' },
			{ opacity: '1' },
			{ opacity: '1' },
			{ opacity: '1' },
			{ opacity: '1' },
			{ opacity: '0' }
		], {
			duration: 3000,
			easing: 'linear'
		});
		portal.anim = animation;
		animation.onfinish = () => {
			portal.style.display = 'none';
		};
		setTimeout(() => {
			const port = portal.getBoundingClientRect();
			const sx = port.x + port.width / 2;
			Array.from(document.getElementsByClassName('dog-worm')).forEach((worm, index) => {
				if (worm.anim) worm.anim.cancel();
				const tx = worm.initX + w / 2;
				const keyframes = [];
				let x = sx - tx;
				let vx = -Math.sqrt(10) * Math.sqrt(x) * 0.95;
				let duration = 0;
				while (x > 0) {
					keyframes.push({
						transform: `translate(${x}px, 0px)`,
						opacity: duration == 0 ? '0' : '1'
					});
					x += vx;
					vx = Math.min(vx + 5, -5);
					duration += 100;
				}
				keyframes.push({
					transform: 'translate(0px, 0px)',
					opacity: '1'
				});
				const animation = worm.animate(keyframes, {
					duration: duration,
					delay: index * 80,
					easing: 'linear',
					fill: 'forwards'
				});
				worm.anim = animation;
				worm.style.opacity = '0';
				worm.style.display = 'inline';
				worm.style.pointerEvents = 'auto';
			});
		}, 500);
		snakeCanStart = true;
	};
}
snakeTriggers = document.getElementsByClassName('snake-game-trigger');
const snakeGameBlock = document.getElementById('snake-game-block');
var snakeCanStart = true;
Array.from(snakeTriggers).forEach((e) => {
	e.addEventListener('click', function(event) {
		if (snakeGame.isRendered) {
			closeSnakeGame();
		} else if (snakeCanStart) {
			snakeCanStart = false;
			const portal = document.getElementById('worm-galaxy');
			portal.style.left = '0px';
			portal.style.display = 'block';
			if (portal.anim) portal.anim.cancel();
			const animation = portal.animate([
				{ opacity: '0' },
				{ opacity: '1' },
				{ opacity: '1' },
				{ opacity: '1' },
				{ opacity: '1' },
				{ opacity: '0' }
			], {
				duration: 3000,
				easing: 'linear'
			});
			portal.anim = animation;
			animation.onfinish = () => {
				portal.style.display = 'none';
			};
			const port = portal.getBoundingClientRect();
			const tx = port.x + port.width / 2;
			Array.from(document.getElementsByClassName('dog-worm')).forEach((worm, index) => {
				if (worm.anim) worm.anim.cancel();
				worm.style.pointerEvents = 'none';
				const rect = worm.children[0].getBoundingClientRect();
				const w = content.getBoundingClientRect().width;
				worm.initX = rect.x + rect.width / 2 - w / 2;
				const keyframes = [];
				let x = 0;
				let vx = 0;
				let duration = 0;
				while (x + rect.x + rect.width / 2 > tx) {
					keyframes.push({
						transform: `translate(${x}px, 0px)`,
						opacity: '1'
					});
					vx -= 5;
					x += vx;
					duration += 100;
				}
				keyframes[keyframes.length - 1].opacity = '0.5';
				const tx2 = tx - (rect.x + rect.width / 2);
				keyframes.push({
					transform: `translate(${tx2}px, 0px)`,
					opacity: '0'
				});
				const animation = worm.animate(keyframes, {
					duration: duration,
					delay: index * 20,
					easing: 'linear'
				});
				animation.onfinish = () => {
					worm.style.transform = 'translate(0px, 0px)';
					worm.style.opacity = '0';
					worm.style.display = 'none';
				};
				worm.anim = animation;
			});
			setTimeout(() => {
				snakeGameBlock.style.display = 'flex';
				const animation = snakeGameBlock.animate([
					{ opacity: '0' },
					{ opacity: '1' }
				], {
					duration: 1000,
					easing: 'linear',
					fill: 'forwards'
				});
				document.body.classList.add('mobile-styles');
				resizeCanvas();
			}, 2000);
			startSnakeGame();
		}
	});
});