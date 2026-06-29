const stampScale = 1.5;
const stampWidth = Math.ceil(96 / stampScale);
const stampHeight = Math.ceil(64 / stampScale);
const stampDelay = 1000;

const stampsToReuse = [];
const jwstToReuse = [];
const leftBar = document.getElementById('left-sidebar');
const rightBar = document.getElementById('right-sidebar');
const leftRain = document.getElementById('left-rainbow');
const rightRain = document.getElementById('right-rainbow');
leftRain.addEventListener('mousedown', function() {
	leftRain.held = 2;
});
leftRain.addEventListener('mouseup', function() {
	leftRain.held = Math.min(leftRain.held, 1);
});
leftRain.addEventListener('mouseleave', function() {
	leftRain.held = Math.min(leftRain.held, 1);
});
rightRain.addEventListener('mousedown', function() {
	rightRain.held = 2;
});
rightRain.addEventListener('mouseup', function() {
	rightRain.held = Math.min(rightRain.held, 1);
});
rightRain.addEventListener('mouseleave', function() {
	rightRain.held = Math.min(rightRain.held, 1);
});
leftRain.held = 0;
rightRain.held = 0;

var synchronisedSource = null;
function playStampVideo(video, audio) {
	video += `?v=${new Date().getTime()}`;
	if (synchronisedSource != video) {
		synchronisedSource = video;
	} else {
		synchronisedSource = null;
	}
	let callback = null;
	if (synchronisedSource && isVisible(leftBar) && isVisible(rightBar)) {
		callback = (func) => {
			function callFunc() {
				if (typeof func !== 'function') return;
				const call = func;
				func = null;
				call();
			}
			for (const stamp of document.getElementsByClassName('stamp')) {
				stamp.onload = callFunc;
				stamp.src = synchronisedSource;
				stamp.alt = "";
				stamp.setAttribute('loading', 'eager');
				stamp.shape = 'star';
			}
			const temp = [];
			for (const stamp of stampsToReuse) {
				stamp.onload = callFunc;
				stamp.src = synchronisedSource;
				stamp.alt = "";
				stamp.setAttribute('loading', 'eager');
				stamp.shape = 'star';
				document.body.appendChild(stamp);
				stamp.parent = document.body;
				stamp.style.visibility = 'hidden';
				temp.push(stamp);
			}
			stampsToReuse.length = 0;
			for (let i = 0; i < Math.max(0, stampHard - temp.length); i++) {
				const stamp = spawnStamp(document.body, i & 1 ? 'left' : 'right', 0);
				stamp.style.visibility = 'hidden';
				temp.push(stamp);
			}
			stampsToReuse.push(...temp);
			setTimeout(hideToReuse, 500);
		};
	} else {
		stampsToReuse.length = 0;
	}
	playAudio(audio, 0, callback);
}
function hideToReuse() {
	for (const stamp of stampsToReuse) {
		if (stamp.parent) {
			stamp.parent.removeChild(stamp);
			stamp.parent = null;
		}
	}
}

function peepysTheme() {
	playStampVideo('https://cocobeanzies.mizabot.xyz/stamps/peepys_theme.avif', 'peepys-theme');
}
function rickRoll() {
	playStampVideo('https://cocobeanzies.mizabot.xyz/stamps/rickroll.avif', 'rickroll');
}
function badApple() {
	playStampVideo('https://cocobeanzies.mizabot.xyz/stamps/bad_apple.avif', 'bad-apple');
}

const stampSoft = 192;
const stampHard = 288;
const usedIter = {};
var jwstList = Array.from(JWST);
var stampList = Array.from(STAMPS);
function spawnStamp(parent, mode, rowIndex) {
	const reuseFactor = Math.random();
	let stamp;
	let reuse;
	let reuseChance;
	let shape;
	let generateURL;
	let lazy = true;
	if (synchronisedSource) {
		generateURL = () => {
			return [synchronisedSource, true];
		}
		reuse = stampsToReuse;
		reuseChance = 1;
		shape = 'star';
		lazy = false;
	} else if (mode == 'left') {
		generateURL = () => {
			let url = "https://cocobeanzies.mizabot.xyz/jwst/" + jwstList.pop();
			if (!jwstList.length) jwstList = shuffle(Array.from(JWST));
			return [url, false];
		}
		reuse = jwstToReuse;
		reuseChance = 0.5;
		shape = 'star';
	} else {
		generateURL = () => {
			let url = "https://cocobeanzies.mizabot.xyz/stamps/" + stampList.pop();
			if (!stampList.length) stampList = shuffle(Array.from(STAMPS));
			//
			isAnim = url.endsWith('.gif') || url.endsWith('.webp');
			if (isAnim) {
				const info = usedIter[url];
				let [uiv, ult] = info || [0, 0];
				if (parent.timestamp != ult) {
					usedIter[url] = [(uiv + 1) % 8, parent.timestamp];
				}
				if (uiv) url += "?timestamp=" + uiv;
			}
			return [url, isAnim];
		}
		reuse = stampsToReuse;
		// Reuse stamps 95% of the time, letting them be placed into a different spot in the sidebar
		reuseChance = 0.95;
		shape = 'circle';
	}
	const rereuseChance = reuse.length < stampSoft ? 1 - (1 - reuseChance) * 2 : 1;
	let isAnim = true;
	let url;
	if (reuse.length && reuseFactor < rereuseChance) {
		stamp = reuse.shift();
		stamp.reused = false;
		stamp.style.position = 'absolute';
		stamp.style.pointerEvents = 'auto';
		stamp.style.visibility = 'visible';
		if (reuseFactor >= reuseChance) {
			[url, isAnim] = generateURL();
			stamp.src = url;
			stamp.alt = "";
		}
	} else {
		stamp = document.createElement('img');
		if (lazy) {
			stamp.setAttribute('loading', 'lazy');
		} else {
			stamp.setAttribute('loading', 'eager');
		}
		stamp.crossOrigin = "anonymous";
		stamp.className = 'stamp';
		stamp.style.transformOrigin = 'top left';
		[url, isAnim] = generateURL();
		stamp.src = url;
		stamp.alt = "";
	}
	stamp.animated = isAnim;
	//stamp.style.display = 'block';
	stamp.mode = mode;
	stamp.shape = shape;
	parent.appendChild(stamp);
	stamp.parent = parent;
	stamp.width = stampWidth;
	stamp.height = stampHeight;
	stamp.rowIndex = rowIndex;
	const y = rowIndex * stampHeight;
	stamp.style.transform = `translateY(${y}px)`;
	stamp.yeeted = false;

	stamp.reuseOr = () => {
		if (stamp.reused) return;
		stamp.reused = true;
		if (stamp.anim) stamp.anim.cancel();
		stamp.anim = null;
		stamp.onload = null;
		while (reuse.length >= stampHard) {
			reuse.shift().remove();
		}
		if (synchronisedSource && stamp.src != synchronisedSource) {
			stamp.remove();
			return;
		}
		//stamp.style.display = 'none';
		stamp.parent.removeChild(stamp);
		stamp.parent = null;
		//document.body.appendChild(stamp);
		//stamp.parent = document.body;
		reuse.push(stamp);
	}

	stamp.yeet = (mx, my) => {
		const rect = stamp.getBoundingClientRect();
		// Stamp should only be yeetable once
		stamp.style.pointerEvents = 'none';
		stamp.yeeted = true;

		stamp.explode = (rect) => {
			if (!rect) rect = stamp.getBoundingClientRect();
			stamp.reuseOr();
			if (allParticles.length > 256) {
				removals = Math.floor(allParticles.length / 64);
				const i = randint(0, allParticles.length - removals);
				for (let j = i; j < i + removals; j++) {
					if (!allParticles[j]) continue;
					allParticles[j].reuseOr();
				}
			}
			spawns = Math.floor(64 / (1 + particleCooldown));
			if (spawns <= 0) return;

			// Make each stamp explode into its currently displayed colours
			let col;
			if (stamp.shape == 'star' && !synchronisedSource) {
				col = getMeanColour(stamp, 'scale');
			} else {
				col = getMeanColour(stamp);
			}
			let spawned = 0;
			const spawnEach = 12;
			function spawnNext() {
				const toSpawn = Math.min(spawns - spawned, spawnEach);
				for (let i = 0; i < toSpawn; i++) {
					const x = rect.x + Math.random() * rect.width;
					const y = rect.y + Math.random() * rect.height;
					if (x < 0 || y < -16 || x > window.innerWidth || y > window.innerHeight) continue;
					const cx = rect.x + rect.width / 2;
					const cy = rect.y + rect.height / 2;
					const dx = x - cx;
					const dy = y - cy;
					const z = Math.atan2(dy, dx);
					const vx = Math.cos(z) * 5 * 100 * (Math.random() * 1.5 + 0.25);
					const vy = Math.sin(z) * 5 * 100 * (Math.random() * 1.5 + 0.25);
					spawnParticle(stamp.shape, col, x, y, vx, vy, 100, 0.1, 250, 750);
				}
				particleCooldown += toSpawn / 64;
				spawned += toSpawn;
				if (spawned < spawns) {
					requestAnimationFrame(spawnNext);
				}
			}
			requestAnimationFrame(spawnNext);
		}
		document.body.appendChild(stamp);
		stamp.parent = document.body;
		stamp.style.position = 'fixed';
		stamp.sx = rect.x;
		stamp.sy = rect.y;

		// New code for stamp yeet physics, traces out entire trajectory in a single loop iteration (frame-skipped transform animation to avoid lag!)
		const fpsDelay = 1000 / 45;
		const frameSkip = 0.75;
		const gravity = 1;
		let x1 = stamp.sx;
		let y1 = stamp.sy;
		let time = 0;
		const transforms = [];
		let offscreen = false;
		while (true) {
			if (x1 < 0 || y1 < 0 || x1 + stampWidth > window.innerWidth || y1 + stampHeight > window.innerHeight) {
				if (offscreen && transforms.length > 1) break;
				offscreen = true;
			}
			const x2 = Math.round(x1);
			const y2 = Math.round(y1);
			transforms.push({ transform: `translate(${x2}px, ${y2}px) scale(${stampScale})` });
			time += frameSkip;
			x1 += mx * frameSkip;
			y1 += my * frameSkip + 0.5 * gravity * frameSkip * frameSkip;
			mx *= 0.97;
			my *= 0.97;
			my += gravity * frameSkip;
		}
		const animation = stamp.animate(transforms, { duration: time * fpsDelay, easing: 'linear' });
		stamp.anim = animation;
		animation.onfinish = () => {
			const explosion = { x: x1, y: y1, width: stampWidth * stampScale, height: stampHeight * stampScale };
			if (explosion.x < 0) explosion.x = -explosion.width / 2;
			if (explosion.y < 0) explosion.y = -explosion.height / 2;
			if (explosion.x + explosion.width > window.innerWidth) explosion.x = window.innerWidth - explosion.width / 2;
			if (explosion.y + explosion.height > window.innerHeight) explosion.y = window.innerHeight - explosion.height / 2;
			stamp.explode(explosion);
		}
	}
	if (!stamp.listener) {
		const listener = (event) => {
			if (stamp.yeeted) return;
			const rect = stamp.getBoundingClientRect();
			const px = rect.x + rect.width / 2;
			const py = rect.y + rect.height / 2;
			const dx = px - event.clientX;
			const dy = py - event.clientY;
			const z = Math.atan2(dy, dx);
			let mx = Math.cos(z) * 16 + mouseV[0];
			let my = Math.sin(z) * 16 + mouseV[1];
			stamp.yeet(mx, my);
		};
		stamp.listener = listener;
		stamp.addEventListener('mouseenter', listener);
	}
	return stamp;
}

var stampRowSpawned = 0;
var lastCarriage = 0;
const stampInterval = stampDelay / 4;
const carriagesToReuse = [];
function spawnStampCarriage() {
	const currentTime = document.timeline.currentTime;
	Array.from(document.getElementsByClassName('stamp-carriage')).forEach((carriage) => {
		if (currentTime > carriage.end + 100) carriage.reuseOr();
	});
	if (!lastCarriage) lastCarriage = currentTime - stampInterval;
	const lastDelay = Math.min(currentTime - lastCarriage, stampInterval * 8);
	const nDelay = stampInterval - lastDelay;
	lastCarriage = currentTime + nDelay;
	stampRowSpawned++;
	const currentRow = Math.floor(stampRowSpawned / 4);
	const currentOffset = stampRowSpawned % 4;
	for (const [b, bar] of [leftBar, rightBar].entries()) {
		if (!isVisible(bar)) continue;
		const rect = bar.getBoundingClientRect();
		const maxRowSpawned = Math.min(stampRowSpawned, rect.height / stampHeight / stampScale);
		const lrDirection = (currentOffset & 1) ^ b
		let carriage;
		if (carriagesToReuse.length) {
			carriage = carriagesToReuse.pop();
		} else {
			carriage = document.createElement('div');
			carriage.className = 'stamp-carriage';
		}
		carriage.timestamp = currentTime + nDelay;
		carriage.reuseOr = () => {
			if (carriage.anim) carriage.anim.cancel();
			carriage.anim = null;
			for (const stamp of Array.from(carriage.children)) {
				stamp.reuseOr();
			}
			bar.removeChild(carriage);
			carriagesToReuse.push(carriage);
		}
		bar.appendChild(carriage);
		const lrStart = lrDirection ? rect.width : -stampWidth * stampScale;
		const lrEnd = lrDirection ? -stampWidth * stampScale : rect.width;
		const lrDistance = lrStart - lrEnd;
		const lrDuration = Math.abs(lrDistance) / stampWidth * stampDelay / stampScale;
		carriage.end = currentTime + nDelay + lrDuration;
		carriage.style.transformOrigin = 'top left';
		carriage.style.transform = `translateX(${lrStart}px) scale(${stampScale})`;
		const animation = carriage.animate([
			{ transform: `translateX(${lrStart}px) scale(${stampScale})` },
			{ transform: `translateX(${lrEnd}px) scale(${stampScale})` }
		], {
			easing: 'linear',
			duration: lrDuration,
			delay: nDelay
		});
		carriage.anim = animation;
		animation.onfinish = () => {
			carriage.reuseOr();
		};
		for (let i = currentOffset; i < maxRowSpawned; i += 4) {
			spawnStamp(carriage, b ? 'right' : 'left', i);
		}
	}
	setTimeout(spawnStampCarriage, Math.max(0, stampInterval + nDelay));
}
spawnStampCarriage();

function isYeetable(stamp, currentTime) {
	if (stamp.yeeted) return false;
	if (!currentTime) return true;
	return currentTime - stamp.parent.timestamp > stampDelay;
}

var mouseX = 0;
var mouseY = 0;
var mouseV = [0, 0];
var lastX = 0;
var lastY = 0;
var mouseAlt = false;
var pawsToReuse = [];
var yeetEvent = null;
function mousemove(event, boundary) {
	mouseX = event.clientX;
	mouseY = event.clientY;
	const mouseP = prevPos;
	mouseV = getMouseVelocity(event);

	const distX = mouseX - lastX;
	const distY = mouseY - lastY;
	const dist = Math.sqrt(distX * distX + distY * distY);
	if (dist > 24) {
		const container = document.getElementById('paw-container');
		lastX = mouseX;
		lastY = mouseY;
		requestAnimationFrame(() => {
			let paw;
			if (pawsToReuse.length) {
				paw = pawsToReuse.pop();
				paw.reused = false;
				paw.style.display = 'block';
			} else {
				paw = document.createElement('div');
				paw.className = 'paw';
				container.appendChild(paw);
			}
			const px = mouseX - 10;
			const py = mouseY - 10;
			paw.style.left = `${px}px`;
			paw.style.top = `${py}px`;

			// Paw walky cycle :D
			const z = Math.atan2(mouseV[1], mouseV[0]);
			const angle = z * 180 / Math.PI + 90;
			const angle2 = angle + Math.random() * 30 - 15;
			const offset = mouseAlt ? 1 : -1
			mouseAlt = !mouseAlt;
			const X = -50 + offset * (75 * Math.cos(z + Math.PI / 2));
			const Y = -50 + offset * (75 * Math.sin(z + Math.PI / 2));
			// Trail particles end dispersed up to 60% of their diameter
			const tx = Math.random() * 120 - 60 + X;
			const ty = Math.random() * 120 - 60 + Y;

			paw.reuseOr = () => {
				if (paw.reused) return;
				paw.reused = true;
				if (paw.anim) paw.anim.cancel();
				paw.anim = null;
				paw.style.display = 'none';
				pawsToReuse.push(paw);
			}
			const animation = paw.animate([
				{ transform: `translate(${X}%, ${Y}%) rotate(${angle}deg)`, opacity: '1' },
				{ transform: `translate(${tx}%, ${ty}%) rotate(${angle2}deg)`, opacity: '0' }
			], {
				// Trail particles last between 250ms and 750ms
				duration: Math.random() * 500 + 250,
				easing: 'linear'
			});
			paw.anim = animation;
			animation.onfinish = () => {
				paw.reuseOr();
			};
		});
	}

	if (boundary) return;
	const elements = document.getElementsByClassName('bullet');
	for (const element of elements) {
		if (!isVisible(element)) continue;
		const rect = element.getBoundingClientRect();
		const elementCenterX = rect.left + rect.width / 2;
		const elementCenterY = rect.top + rect.height / 2;
		const diffX = mouseX - elementCenterX;
		const diffY = mouseY - elementCenterY;
		// Apply inverse square law
		const distance = Math.max(1, Math.sqrt(diffX * diffX + diffY * diffY));
		// Dot product of force and distance vectors
		let torque = (diffX * mouseV[1] - diffY * mouseV[0]);
		torque *= 300 / distance / distance;
		element.angVel = isNaN(element.angVel) ? torque : element.angVel + torque;
	}

	// Yeet all stamps "sliced" by the cursor (passed within a single animation frame, which would otherwise bypass the onmouseenter event)
	if (Math.abs(distX) > stampWidth / 2 || Math.abs(distY) > stampHeight / 2) {
		function yeetSliced() {
			for (const bar of [leftBar, rightBar]) {
				if (!inElement(mouseP, bar) && !inElement([mouseX, mouseY], bar)) continue;
				Array.from(bar.querySelectorAll('.stamp')).forEach((stamp) => {
					if (!stamp.listener || !isYeetable(stamp)) return;
					if (intersectsElement(mouseP, [mouseX, mouseY], stamp)) {
						const fakeEvent = {
							target: stamp,
							clientX: mouseP[0],
							clientY: mouseP[1]
						}
						stamp.listener(fakeEvent);
					}
				});
			}
		}
		requestAnimationFrame(yeetSliced);
	}
}
document.addEventListener('mousemove', mousemove);
document.addEventListener('mouseenter', (event) => {
	mousemove(event, true);
});
document.addEventListener('mouseleave', (event) => {
	mousemove(event, true);
});

function animateWorm() {
	Array.from(document.getElementsByClassName('worm')).forEach((worm, i) => {
		if (worm.anim2) worm.anim2.cancel();
		const animation = worm.animate([
			{ boxShadow: '0px 0px 16px #ffffff, 0px 0px 24px #7fffff, 0px 0px 32px #00ffff', outlineColor: 'white', outlineWidth: '2px' },
			{ boxShadow: 'none', outlineColor: 'transparent', outlineWidth: '0px' }
		], {
			duration: 500,
			easing: 'linear',
			delay: 100 * i
		});
		worm.anim2 = animation;
	});
}
function scrollTitles() {
	const titles = document.getElementById('titles');
	const rect = titles.getBoundingClientRect();
	const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
	window.scrollTo({
		top: rect.y + scrollTop,
		behavior: 'smooth'
	});
	if (document.body.quitTetris) quitTetris();
	if (snakeGame.isRendered) {
		closeSnakeGame();
	}
	setTimeout(animateWorm, 800);
}

var shootingStars = [];
// if (getCookie('snakeOpen') == '1') {
// 	Array.from(document.getElementsByClassName('dog-worm')).forEach((worm) => {
// 		if (worm.anim) worm.anim.cancel();
// 		worm.anim = null;
// 		worm.style.pointerEvents = 'none';
// 		const rect = worm.children[0].getBoundingClientRect();
// 		const w = content.getBoundingClientRect().width;
// 		worm.initX = rect.x + rect.width / 2 - w / 2;
// 		worm.style.display = 'none';
// 	});
// 	snakeGameBlock.style.display = 'flex';
// 	document.body.classList.add('mobile-styles');
// 	resizeCanvas();
// 	startSnakeGame();
// }
document.addEventListener('keydown', (event) => {
	const sg = snakeGame;
	if (sg.isRendered) {
		const i = [37, 38, 39, 40].indexOf(event.keyCode);
		if (i > -1) {
			event.preventDefault();
			let vx = 0;
			let vy = 0;
			if (i == 0) {
				vx = -1;
			} else if (i == 1) {
				vy = -1;
			} else if (i == 2) {
				vx = 1;
			} else {
				vy = 1;
			}
			if (!sg.buffer) {
				if ((sg.vx == 0 && sg.vy == 0) || (sg.vx != vx && sg.vy != vy)) {
					sg.vx = vx;
					sg.vy = vy;
					sg.buffer = [vx, vy];
					if (sg.isPlaying) {
						requestAnimationFrame(() => { renderSnakeGame(true) });
					}
				}
			} else if (sg.vx != vx && sg.vy != vy) {
				sg.buffer = [vx, vy];
			}
			if (!sg.isPlaying) {
				snakeGameLoop();
			}
		} else if (event.key == "q" || event.key == "Q") {
			event.preventDefault();
			if (sg.isPlaying) {
				if (sg.isDead) {
					endSnakeGame();
					startSnakeGame();
				} else if (sg.isPaused) {
					sg.isPaused = false;
					snakeGamePause.style.display = "none";
					snakeGameLoop();
				} else {
					snakeGamePause.innerHTML = '<span style="color: white; font-size: 16px"><a style="cursor: pointer" onclick="closeSnakeGame()">ESC: Quit</a> | <a style="cursor: pointer" onclick="snakeGame.isPaused = false; snakeGamePause.style.display = `none`; snakeGameLoop()">Q: Resume | R: Restart</a></span><br />' + `Paused`;
					snakeGamePause.style.display = "block";
					sg.isPaused = true;
				}
			}
		} else if (event.key == "r" || event.key == "R") {
			event.preventDefault();
			if (sg.isPlaying || sg.isPaused) {
				endSnakeGame();
				startSnakeGame();
			}
		} else if (event.key == "Escape") {
			event.preventDefault();
			if (sg.isPlaying) {
				if (sg.isPaused || sg.isDead) {
					closeSnakeGame();
				} else {
					snakeGamePause.innerHTML = '<span style="color: white; font-size: 16px"><a style="cursor: pointer" onclick="closeSnakeGame()">ESC: Quit</a> | <a style="cursor: pointer" onclick="snakeGame.isPaused = false; snakeGamePause.style.display = `none`; snakeGameLoop()">Q: Resume | R: Restart</a></span><br />' + `Paused`;
					snakeGamePause.style.display = "block";
					sg.isPaused = true;
				}
			} else if (sg.isRendered) {
				closeSnakeGame();
			}
		}
	}
});

const particlesToReuse = [];
var particleCooldown = 0;
var allParticles = [];
const fxToReuse = {};
const particleList = [];
function spawnParticle(shape, col, x, y, vx, vy, gravity, resistance, minDuration, maxDuration) {
	// Particle animation split into 5 keyframes, with gravity applied
	const dc = resistance;
	const gr = gravity;
	const op = Math.random() * 0.5 + 0.5;
	const x1 = vx - 50;
	const y1 = vy - 50;
	const x2 = vx * (2 - dc) - 50;
	const y2 = vy * (2 - dc) + gr - 50;
	const x3 = vx * (3 - dc * 3) - 50;
	const y3 = vy * (3 - dc * 3) + gr * 3 - 50;
	const x4 = vx * (4 - dc * 6) - 50;
	const y4 = vy * (4 - dc * 6) + gr * 6 + 30 - 50;
	const s1 = Math.random() * 3 + 2;
	const s2 = s1 * 3 / 4;
	const s3 = s1 * 2 / 4;
	const s4 = s1 * 1 / 4;
	let r1 = 0;
	let r2 = 0;
	let r3 = 0;
	let r4 = 0;
	let r5 = 0;

	let particle;
	let reuse;
	if (shape == 'star') {
		reuse = fxToReuse['star'];
		if (!reuse) {
			reuse = [];
			fxToReuse['star'] = reuse;
		}
		if (reuse.length) {
			particle = reuse.pop();
			particle.reused = false;
			particle.style.display = 'block';
		} else {
			particle = document.createElement('div');
			particle.className = 'star-particle';
			particle.style.position = 'fixed';
			document.body.appendChild(particle);
		}
		r1 = Math.random() * 360;
		r5 = (Math.random() - 0.5) * 360 * 3 + r1;
		r3 = (r1 + r5) / 2;
		r2 = (r1 + r3) / 2;
		r4 = (r3 + r5) / 2;
	} else {
		reuse = particlesToReuse;
		if (reuse.length) {
			particle = reuse.pop();
			particle.reused = false;
			particle.style.display = 'block';
		} else {
			particle = document.createElement('div');
			particle.className = 'trail';
			particle.style.position = 'fixed';
			document.body.appendChild(particle);
		}
	}
	particle.style.zIndex = 9;
	particle.style.left = `${x}px`;
	particle.style.top = `${y}px`;
	particle.style.opacity = `${op}`;
	particle.style.backgroundColor = col;

	particle.reuseOr = () => {
		if (particle.reused) return;
		particle.reused = true;
		if (particle.anim) particle.anim.cancel();
		particle.style.display = 'none';
		reuse.push(particle);
	}
	const animation = particle.animate([
		{ transform: `translate(-50%, -50%) rotate(${r1}deg) scale(${s1})` },
		{ transform: `translate(${x1}%, ${y1}%) rotate(${r2}deg) scale(${s2})` },
		{ transform: `translate(${x2}%, ${y2}%) rotate(${r3}deg) scale(${s3})` },
		{ transform: `translate(${x3}%, ${y3}%) rotate(${r4}deg) scale(${s4})` },
		{ transform: `translate(${x4}%, ${y4}%) rotate(${r5}deg) scale(0)`, opacity: '0' }
	], {
		duration: Math.random() * (maxDuration - minDuration) + minDuration,
		easing: 'linear'
	});
	particle.anim = animation;
	animation.onfinish = () => {
		particle.reuseOr();
	};
}

var lastUpdate = 0;
function animateUpdate() {
	if (document.hidden) {
		requestAnimationFrame(() => setTimeout(animateUpdate, 500));
		return;
	}
	const currentTime = document.timeline.currentTime;
	const delay = (currentTime - lastUpdate) / 1000;
	lastUpdate = currentTime;
	const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

	if (isVisible(rightBar)) {
		allParticles = document.getElementsByClassName('trail');
		let yeetAllStamps = leftRain.held || rightRain.held;
		let blackHoleYeet = false;
		if (!yeetAllStamps && blackHole.radius >= 16) {
			yeetAllStamps = true;
			blackHoleYeet = true;
		}
		if (yeetAllStamps && (leftRain.held < 2 && rightRain.held < 2)) {
			leftRain.held = 0;
			rightRain.held = 0;
		}
		const scrollStamps = document.getElementsByClassName('stamp');
		if (yeetAllStamps) {
			for (const stamp of scrollStamps) {
				if (blackHoleYeet && Math.random() * 128 > blackHole.radius) continue;
				if (isYeetable(stamp, currentTime)) {
					if (blackHoleYeet) {
						const rect = stamp.getBoundingClientRect();
						const x = rect.x + rect.width / 2;
						const y = rect.y + rect.height / 2;
						const dx = blackHole.posX - x;
						const dy = blackHole.posY - y;
						const g = blackHole.radius * blackHole.radius * blackHole.radius / 4096;
						const d = dx * dx + dy * dy;
						if (d > Math.random() * g * g / 4) continue;
						const z = Math.atan2(dy, dx);
						const dist = Math.sqrt(d) / 4;
						stamp.yeet(Math.cos(z) * g / dist, Math.sin(z) * g / dist - 4);
					}
					else {
						mx = stamp.mode == 'right' ? -1 : 1;
						stamp.yeet((Math.random() * 3 + 1) * mx * 16, (Math.random() - 1) * 4);
					}
				}
			}
		}
		particleCooldown *= 0.8;
	}

	if (resolution >= 1440) {
		// Pictures displayed up top have a blur trail effect
		const moving = document.getElementsByClassName('blurred');
		for (const element of moving) {
			if (element.cooldown > currentTime || !isVisible(element) || scrollTop > 400) continue;
			const rect = element.getBoundingClientRect();
			const x = rect.x
			const y = scrollTop + rect.y
			const blurred = document.createElement('img');
			blurred.className = 'flicker';
			blurred.width = rect.width;
			blurred.height = rect.height;
			blurred.style.left = '0px';
			blurred.style.top = '0px';
			blurred.style.transform = `translate(${x}px, ${y}px)`;
			blurred.src = element.src || element.children[0].src;
			blurred.alt = "";
			blurred.style.zIndex = '5';
			document.body.appendChild(blurred);
			element.cooldown = currentTime + 500;

			const animation = blurred.animate([
				{ opacity: '0.25' },
				{ opacity: '0' }
			], {
				duration: 2000,
				easing: 'linear'
			});
			animation.onfinish = () => {
				blurred.remove();
			};
		}
	}

	const elements = document.getElementsByClassName('bullet');
	for (const element of elements) {
		if (!element.origColor) {
			const style = window.getComputedStyle(element);
			const col = style.backgroundColor;
			const rgbMatch = col.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
			const r = parseInt(rgbMatch[1], 10);
			const g = parseInt(rgbMatch[2], 10);
			const b = parseInt(rgbMatch[3], 10);
			element.origColor = [r, g, b];
		}
		const white = Math.abs(element.angVel) / 4;
		const [r, g, b] = element.origColor;
		const r2 = r + white;
		const g2 = g + white;
		const b2 = b + white;
		const angVel = element.angVel * delay;
		element.rotDeg = isNaN(element.rotDeg) ? angVel : element.rotDeg + angVel;
		element.angVel *= Math.pow(0.5, delay);
		const absVel = Math.abs(angVel);
		const rotDeg = element.rotDeg;
		if (!isVisible(element) || !(Math.abs(rotDeg - (element.lastRot || 0)) > 0.5)) continue;
		element.lastRot = rotDeg;
		element.style.transform = `rotate(${rotDeg}deg)`;
		if (absVel < element.lastVel) {
			element.lastVel = absVel;
			continue;
		}
		element.lastVel = absVel;
		if (element.anim) element.anim.cancel();
		const animation = element.animate([
			{ backgroundColor: `rgb(${r2}, ${g2}, ${b2})` },
			{ backgroundColor: `rgb(${r}, ${g}, ${b})` }
		], {
			duration: 500,
			easing: 'linear'
		});
		element.anim = animation;
	}

	updateCanvas();
	requestAnimationFrame(animateUpdate);
}
const starExit = 400;
function updateCanvas() {
	if (!camera || !scene || !renderer || document.hidden) {
		shootingStars.length = 0;
		if (renderer) renderer.clear();
		return;
	}
	const timestamp = Date.now();
	const verts = [];
	const cols = [];
	const verts2 = [];
	const cols2 = [];
	const removed = [];
	const rect = starContainer.getBoundingClientRect();
	const radius = Math.max(blackHole.radius, 0);
	const gravity = 1000000 * (1 + radius * radius * radius / 4096 / 2);
	const x = blackHole.radius > 0 ? blackHole.posX : mouseX;
	const y = blackHole.radius > 0 ? blackHole.posY : mouseY
	shootingStars.forEach((star) => {
		const mx = (x - rect.x) / rect.width * window.innerWidth;
		const my = (y - rect.y) / rect.height * window.innerHeight;
		const elapsed = (timestamp - star.timestamp) / 1000;
		const delay = (timestamp - star.prev) / 1000;
		star.prev = timestamp;
		const trail = star.trail;
		const roche_limit = star.scale * radius * 8;
		function eat_star(star, r) {
			if (r > 0) {
				if (star.scale >= Math.max(shootingStars.length / 256, 1 / 4)) {
					let z = Math.random() * Math.PI * 2;
					for (let i = 0; i < 2; i++) {
						const max_offset = roche_limit / 8;
						const vmult = (Math.random() + 7) / 8;
						const star2 = {
							timestamp: timestamp + star.scale / 2,
							prev: timestamp,
							scale: star.scale / 2,
							x: star.x,
							y: star.y,
							vx: Math.cos(z) * 4 + star.vx * vmult,
							vy: Math.sin(z) * 4 + star.vy * vmult,
							flag: randomPrideFlag(),
							eaten: 0,
							trail: [],
							times: []
						}
						shootingStars.push(star2);
						z += Math.PI;
						star.scale -= star2.scale;
					}
				}
			} else {
				star.eaten++;
			}
		}
		if (delay > 1) eat_star(star);
		else if (!star.eaten) {
			let rem = delay;
			let steps = 0;
			while (rem > 0) {
				let dd = rem;
				// Verlet integration for smooth gravity simulation
				// Mouse cursor is arbitrarily given a gravity of 1 million units
				let ax;
				let ay;
				{
					const dx = mx - star.x;
					const dy = my - star.y;
					const z = Math.atan2(dy, dx);
					const r2 = (radius ? 0 : 1) + dx * dx + dy * dy - radius;
					if (r2 < roche_limit) {
						eat_star(star, r2);
					}

					const v2 = 1 + star.vx * star.vx + star.vy * star.vy;
					// Adaptive timestep
					dd = Math.min(dd, Math.max(shootingStars.length / 16777216, Math.sqrt(r2) / Math.sqrt(v2) * 16 / Math.sqrt(gravity)));

					ax = gravity * Math.cos(z) / r2;
					ay = gravity * Math.sin(z) / r2;
				}

				star.x += star.vx * dd + 0.5 * ax * dd * dd;
				star.y += star.vy * dd + 0.5 * ay * dd * dd;

				if (star.x < -starExit || star.y < -starExit || star.x > window.innerWidth + starExit || star.y > window.innerHeight + starExit) {
					removed.push(star.timestamp);
					return;
				}

				let ax2;
				let ay2;
				{
					const dx = mx - star.x;
					const dy = my - star.y;
					const z = Math.atan2(dy, dx);
					const r2 = (radius ? 0 : 1) + dx * dx + dy * dy - radius;
					if (r2 < roche_limit) {
						eat_star(star, r2);
					}
					ax2 = gravity * Math.cos(z) / r2;
					ay2 = gravity * Math.sin(z) / r2;
				}

				star.vx += 0.5 * (ax + ax2) * dd;
				star.vy += 0.5 * (ay + ay2) * dd;

				if (Number.isInteger(Math.sqrt(steps))) {
					const px = (star.x / window.innerWidth) * 2 - 1;
					const py = -(star.y / window.innerHeight) * 2 + 1;
					const vector = new THREE.Vector3(px, py, 0);
					vector.unproject(camera);
					star.trail.push([vector.x, vector.y, vector.z]);
					star.times.push(timestamp);
				}
				steps++;
				rem -= dd;
				if (star.eaten) break;
			}
			const speed = Math.sqrt(star.vx * star.vx + star.vy * star.vy);
			const maxLength = 256;
			while (trail.length > maxLength || timestamp - star.times[0] > 500) {
				trail.shift();
				star.times.shift();
			}
		} else {
			star.eaten++;
			const skip = Math.max(1, trail.length / 16);
			if (star.eaten * skip >= trail.length - 1) {
				removed.push(star.timestamp);
				return;
			}
		}
		const speed = Math.sqrt(star.vx * star.vx + star.vy * star.vy);

		// Terraria Rainbow Rod effect; create a pentagon at the head, trapezoids at each body, and triangle at the tail
		// Trail effect has a layered glow for 1/3 of the length
		const skip = Math.max(1, trail.length / 32);
		const width = star.scale / 1024 * sceneResMult;
		const glow = Math.min(24, Math.sqrt(speed + 4)) / star.scale / 8;
		const glowStart = 1 / 3;
		const brightness = Math.min(1, Math.sqrt(star.scale));
		for (let i = (trail.length - 1) % skip + star.eaten * skip; i < trail.length - 1; i += skip) {
			const ii = Math.floor(i - star.eaten);
			const tailIndex = ii;
			const headIndex = Math.min(Math.floor((i - star.eaten) + skip), trail.length - 1);
			const nextIndex = Math.floor((i - star.eaten) + skip * 2);
			const inFront = headIndex >= trail.length - 1;
			const [tx, ty, tz] = trail[tailIndex];
			const [hx, hy, hz] = trail[headIndex];
			const [nx, ny, nz] = nextIndex >= trail.length ? [] : trail[nextIndex];
			const z = Math.atan2(hy - ty, hx - tx);
			const z2 = nextIndex >= trail.length ? z : Math.atan2(ny - hy, nx - hx);
			let angle;
			if (inFront) {
				angle = Math.PI * 3 / 4;
			} else {
				angle = Math.PI / 2;
			}
			const headSize = headIndex / trail.length * width;
			const h_rx = hx + Math.cos(z2 + angle) * headSize;
			const h_ry = hy + Math.sin(z2 + angle) * headSize;
			const h_lx = hx + Math.cos(z2 - angle) * headSize;
			const h_ly = hy + Math.sin(z2 - angle) * headSize;
			const tailSize = tailIndex / trail.length * width;
			angle = Math.PI / 2;
			const t_rx = tx + Math.cos(z + angle) * tailSize;
			const t_ry = ty + Math.sin(z + angle) * tailSize;
			const t_lx = tx + Math.cos(z - angle) * tailSize;
			const t_ly = ty + Math.sin(z - angle) * tailSize;
			const headColour = interpolateFlag(
				star.flag,
				(elapsed + headIndex / trail.length) % 1,
				Math.pow(1 - (trail.length - headIndex - 1) / trail.length, 6) * 100,
				1,
			)
			const tailColour = interpolateFlag(
				star.flag,
				(elapsed + tailIndex / trail.length) % 1,
				Math.pow(1 - (trail.length - tailIndex - 1) / trail.length, 6) * 100,
				1,
			)

			if (inFront) {
				verts.push(hx, hy, hz);
				cols.push(...headColour);
				verts.push(h_lx, h_ly, hz);
				cols.push(...headColour);
				verts.push(t_lx, t_ly, tz);
				cols.push(...tailColour);

				verts.push(hx, hy, hz);
				cols.push(...headColour);
				verts.push(t_rx, t_ry, tz);
				cols.push(...tailColour);
				verts.push(h_rx, h_ry, tz);
				cols.push(...headColour);

				verts.push(hx, hy, hz);
				cols.push(...headColour);
				verts.push(t_lx, t_ly, tz);
				cols.push(...tailColour);
				verts.push(t_rx, t_ry, tz);
				cols.push(...tailColour);
			} else {
				verts.push(h_lx, h_ly, hz);
				cols.push(...headColour);
				verts.push(t_lx, t_ly, tz);
				cols.push(...tailColour);
				verts.push(t_rx, t_ry, tz);
				cols.push(...tailColour);

				verts.push(h_rx, h_ry, hz);
				cols.push(...headColour);
				verts.push(h_lx, h_ly, hz);
				cols.push(...headColour);
				verts.push(t_rx, t_ry, tz);
				cols.push(...tailColour);
			}

			if (i + star.eaten >= trail.length * (1 - glowStart)) {
				let angle;
				if (inFront) {
					angle = Math.PI * 3 / 4;
				} else {
					angle = Math.PI / 2;
				}
				const headSize2 = headSize * glow;
				const h_rx = hx + Math.cos(z2 + angle) * headSize2;
				const h_ry = hy + Math.sin(z2 + angle) * headSize2;
				const h_lx = hx + Math.cos(z2 - angle) * headSize2;
				const h_ly = hy + Math.sin(z2 - angle) * headSize2;
				const tailSize2 = tailSize * glow;
				angle = Math.PI / 2;
				const t_rx = tx + Math.cos(z + angle) * tailSize2;
				const t_ry = ty + Math.sin(z + angle) * tailSize2;
				const t_lx = tx + Math.cos(z - angle) * tailSize2;
				const t_ly = ty + Math.sin(z - angle) * tailSize2;
				const headAlpha = ((ii + skip) / trail.length - (1 - glowStart)) / glowStart * brightness;
				const tailAlpha = (ii - skip < trail.length * (1 - glowStart)) ? 0 : (i / trail.length - (1 - glowStart)) / glowStart * brightness;
				const headColour2 = [...headColour, headAlpha];
				const tailColour2 = [...tailColour, tailAlpha];
				const altAlpha = [...headColour, 0];

				verts2.push(hx, hy, hz);
				cols2.push(...headColour2);
				verts2.push(h_lx, h_ly, hz);
				cols2.push(...altAlpha);
				verts2.push(t_lx, t_ly, tz);
				cols2.push(...altAlpha);

				verts2.push(hx, hy, hz);
				cols2.push(...headColour2);
				verts2.push(t_rx, t_ry, tz);
				cols2.push(...altAlpha);
				verts2.push(h_rx, h_ry, tz);
				cols2.push(...altAlpha);

				verts2.push(hx, hy, hz);
				cols2.push(...headColour2);
				verts2.push(t_lx, t_ly, tz);
				cols2.push(...altAlpha);
				verts2.push(tx, ty, tz);
				cols2.push(...tailColour2);

				verts2.push(hx, hy, hz);
				cols2.push(...headColour2);
				verts2.push(tx, ty, tz);
				cols2.push(...tailColour2);
				verts2.push(t_rx, t_ry, tz);
				cols2.push(...altAlpha);
			}
		}
	});
	if (removed.length) {
		shootingStars = shootingStars.filter((star) => { return !removed.includes(star.timestamp) });
	}

	geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
	geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3));
	geometry.attributes.position.needsUpdate = true;
	geometry.attributes.color.needsUpdate = true;
	geometry2.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts2), 3));
	geometry2.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols2), 4));
	geometry2.attributes.position.needsUpdate = true;
	geometry2.attributes.color.needsUpdate = true;

	updateBubbles();
	renderer.render(scene, camera);
}

const starContainer = document.getElementById('star-container');
function generateStars() {
	if (!document.hidden) {
		const rect = starContainer.getBoundingClientRect();
		const timestamp = Date.now();
		const scale = Math.random() + 0.5;
		const star = {
			timestamp: timestamp,
			prev: timestamp,
			scale: scale,
			x: Math.random() * (rect.width + 128 / 340 * (rect.height + 60)),
			y: -60,
			vx: (Math.random() * 16 - 120) * scale,
			vy: (Math.random() * 40 + 320) * scale,
			flag: randomPrideFlag(),
			eaten: 0,
			trail: [],
			times: []
		}
		if (renderer) {
			shootingStars.push(star);
		} else {
			// If WebGL is unsupported, calculate would-be trajectory and instead render a text div
			const t = (window.innerHeight + starExit - star.y) / star.vy;
			const ex = star.x + (t * star.vx);
			const ey = star.y + (t * star.vy);

			const shootingStar = document.createElement('div');
			shootingStar.style.position = 'fixed';
			starContainer.appendChild(shootingStar);
			shootingStar.textContent = 'Pls enable WebGL ;-;';
			const animation = shootingStar.animate([
				{ transform: `translate(${star.x}px, ${star.y}px)` },
				{ transform: `translate(${ex}px, ${ey}px)`, opacity: '0' }
			], {
				duration: t * 1000,
				easing: 'linear'
			});
			shootingStar.anim = animation;
			shootingStar.onfinish = () => {
				shootingStar.remove();
			};
		}
	}
	let starDelay = Math.random() * 400 + 200;
	if (blackHole.radius > 0) {
		starDelay /= Math.max(1, Math.cbrt(blackHole.radius / 4));
	}
	setTimeout(generateStars, starDelay);
}

const tessVerts = [
	[0.0, 0.0, 0.0, 0.0],
	[1.0, 0.0, 0.0, 0.0],
	[0.0, 1.0, 0.0, 0.0],
	[1.0, 1.0, 0.0, 0.0],
	[0.0, 0.0, 1.0, 0.0],
	[1.0, 0.0, 1.0, 0.0],
	[0.0, 1.0, 1.0, 0.0],
	[1.0, 1.0, 1.0, 0.0],
	[0.0, 0.0, 0.0, 1.0],
	[1.0, 0.0, 0.0, 1.0],
	[0.0, 1.0, 0.0, 1.0],
	[1.0, 1.0, 0.0, 1.0],
	[0.0, 0.0, 1.0, 1.0],
	[1.0, 0.0, 1.0, 1.0],
	[0.0, 1.0, 1.0, 1.0],
	[1.0, 1.0, 1.0, 1.0],
];
for (const vert of tessVerts) {
	for (let i = 0; i < vert.length; i++) {
		vert[i] -= 0.5;
	}
}
// console.log(tessVerts);
const tessFaceMap = [
	0, 1, 2, 3,
	0, 1, 4, 5,
	0, 2, 4, 6,
	1, 3, 5, 7,
	2, 3, 6, 7,
	4, 5, 6, 7,
	0, 1, 8, 9,
	0, 2, 8, 10,
	1, 3, 9, 11,
	2, 3, 10, 11,
	8, 9, 10, 11,
	0, 4, 8, 12,
	1, 5, 9, 13,
	4, 5, 12, 13,
	8, 9, 12, 13,
	2, 6, 10, 14,
	4, 6, 12, 14,
	8, 10, 12, 14,
	3, 7, 11, 15,
	5, 7, 13, 15,
	9, 11, 13, 15,
	6, 7, 14, 15,
	10, 11, 14, 15,
	12, 13, 14, 15,
];
var bubbles = [];
function generateBubble() {
	const geometry = new THREE.BoxGeometry(1, 1, 1);
	const egeometry = new THREE.EdgesGeometry(geometry);
	const material = new THREE.MeshPhongMaterial({
		color: 0xbf7fff,   // Base color of the cube
		opacity: 0.75,
		transparent: true,
		shininess: 100,    // Higher shininess for more glossy surface
		side: THREE.DoubleSide,
		depthWrite: false
	});
	const ematerial = new THREE.LineBasicMaterial({
		color: 0xffffff,
		fog: false
	});
	const bubble = new THREE.Mesh(geometry, material);
	const ebubble = new THREE.LineSegments(egeometry, ematerial);
	const Bubble = {
		solids: [bubble],
		edges: [ebubble]
	}
	bubble.rotateX(1);
	bubble.rotateY(1);
	ebubble.rotateX(1);
	ebubble.rotateY(1);
	scene.add(bubble);
	scene.add(ebubble);
	bubbles.push(Bubble);
}
function updateBubbles() {
	for (const Bubble of bubbles) {
	}
}

const sceneResolution = 1920;
var sceneResMult = 1;
var scene;
var camera;
var renderer;
var geometry;
var geometry2;
function setupScene() {
	try {
		scene = new THREE.Scene();
		const parameters = {
			precision: 'lowp',
			alpha: true,
			premultipliedAlpha: true,
			antialias: true,
			depth: false,
		}
		renderer = new THREE.WebGLRenderer(parameters);
		renderer.setClearColor(new THREE.Color(0x000000), 0);
		renderer.setSize(1, 1, true);
		const canvas = renderer.domElement;
		canvas.style.position = 'fixed';
		canvas.style.pointerEvents = 'none';
		canvas.style.padding = '0';
		canvas.style.margin = '0';
		starContainer.appendChild(canvas);
	} catch (error) {
		console.error(error);
		return;
	}
	geometry = new THREE.BufferGeometry();
	const material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
	const triangle = new THREE.Mesh(geometry, material);
	scene.add(triangle);
	geometry2 = new THREE.BufferGeometry();
	const material2 = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide });
	const triangle2 = new THREE.Mesh(geometry2, material2);
	scene.add(triangle2);
	// const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
	// directionalLight.position.set(5, 5, 5);
	// scene.add(directionalLight);
	// const ambientLight = new THREE.AmbientLight(0x404040);
	// scene.add(ambientLight);
}
setupScene();
function resizeCanvas() {
	if (renderer) {
		let preWidth;
		if (window.innerWidth > 800 && snakeGame && !snakeGame.isRendered && !document.body.tetrisRendered) {
			const rect1 = rightBar.getBoundingClientRect();
			const rect2 = starContainer.getBoundingClientRect();
			preWidth = rect1.x - rect2.x - 8;
		} else {
			preWidth = window.innerWidth;
		}
		const width = Math.ceil(preWidth + 1);
		const height = Math.ceil(window.innerHeight + 1);
		camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
		camera.position.z = 2;
		sceneResMult = Math.min(sceneResolution / Math.sqrt(width * height), 1);
		const w = width * sceneResMult;
		const h = height * sceneResMult;
		renderer.setSize(w, h, sceneResMult == 1);
		const canvas = renderer.domElement;
		canvas.style.width = `${w}px`;
		canvas.style.height = `${h}px`;
		if (sceneResMult == 1) {
			starContainer.style.transform = 'none';
		} else {
			const s = 1 / sceneResMult;
			starContainer.style.transform = `scale(${s})`;
		}
		renderer.clear();
	}
	shootingStars.length = 0;
}
resizeCanvas();
const debouncedResizeCanvas = debounce(resizeCanvas, 100);
window.addEventListener('resize', debouncedResizeCanvas);

const interests = document.getElementById('interests');
function setupInterests() {
	const interestList = Object.entries(INTERESTS);
	let n = 0;
	for (const [name, entries] of interestList) {
		const e = n - interestList.length;
		const subtitle = document.createElement('h2');
		subtitle.className = 'subtitle2';
		subtitle.style.marginBottom = '16px';
		interests.appendChild(subtitle);
		Array.from(name).forEach((c, i) => {
			const ch = document.createElement('span');
			if (c != ' ') ch.className = 'subtext2';
			ch.textContent = c;
			const d = (i - name.length + 1) / (name.length - 1) + e;
			ch.style.animationDelay = `${d}s`;
			subtitle.appendChild(ch);
		});
		const paragraph = document.createElement('p');
		paragraph.className = 'paragraph ripples sub-anim';
		paragraph.style.display = 'grid';
		paragraph.style.justifySelf = 'center';
		paragraph.style.width = 'fit-content';
		paragraph.style.animationDelay = `${e}s`;
		interests.appendChild(paragraph);
		entries.forEach((entry, j) => {
			const subtitle = document.createElement('span');
			subtitle.className = 'subtitle3';
			subtitle.style.zIndex = '3';
			paragraph.appendChild(subtitle);
			const star = document.createElement('span');
			star.className = 'bullet';
			star.style.display = 'inline-block';
			star.style.backgroundColor = '#00ffff';
			subtitle.appendChild(star);
			let n = 0;
			entry.split(' ').forEach((c) => {
				const ch = document.createElement('span');
				ch.className = 'subtext3';
				ch.textContent = c;
				const d = n / 24 - j / 8;
				ch.style.animationDelay = `${d}s`;
				subtitle.appendChild(ch);
				const sp = document.createElement('span');
				sp.textContent = ' ';
				sp.display = 'inline-block';
				sp.animation = 'none';
				subtitle.appendChild(sp);
				n += c.length + 1;
			});
		});
		n++;
	}
}
setupInterests();

var imageScale = 256;
var imageSep = 192;
function adjustImageLimit() {
	imageScale = Math.min(256, window.innerWidth / 2);
	imageSep = Math.min(192, window.innerWidth / 3);
}
adjustImageLimit();
window.addEventListener('resize', adjustImageLimit);
function setupGallery() {
	Array.from(content2.children).forEach((element) => { element.remove() });
	if (content2.originalHeight == null) {
		const contentStyle = window.getComputedStyle(content2);
		content2.originalHeight = Number.parseFloat(contentStyle.height);
	}
	let newHeight = content2.originalHeight;
	STYLES.forEach((style, n) => {
		style.elements = [];
		const subtitle = document.createElement('h2');
		subtitle.className = 'subtitle sub-anim';
		subtitle.style.top = `${newHeight}px`;
		subtitle.style.left = '0px';
		subtitle.style.width = '100%';
		const d = n - STYLES.length;
		subtitle.style.animationDelay = `${d}s`;
		subtitle.style.zIndex = '3';
		content2.appendChild(subtitle);
		newHeight += imageSep;
		style.top = newHeight;
		[name1, name2] = style.name.split(',', 2);
		name1 += ' ­';
		Array.from(name1).forEach((c, i) => {
			const ch = document.createElement('span');
			if (c != ' ' && c != '­') ch.className = 'subtext';
			ch.textContent = c;
			const d = Math.abs((i - style.name.length + 1) / (style.name.length - 1) + 0.5) * 2 / 20 + n - STYLES.length;
			ch.style.animationDelay = `${d}s`;
			subtitle.appendChild(ch);
		});
		Array.from(name2).forEach((c, i) => {
			i += name1.length;
			const ch = document.createElement('span');
			if (c != ' ') ch.className = 'subtext';
			ch.textContent = c;
			const d = Math.abs((i - style.name.length + 1) / (style.name.length - 1) + 0.5) * 2 / 20 + n - STYLES.length;
			if (c != ' ') ch.style.display = 'inline-block';
			ch.style.animationDelay = `${d}s`;
			ch.style.fontSize = '24px';
			ch.style.transform = 'translateY(-6px)';
			if (c == 'a') ch.style.width = '12px';
			subtitle.appendChild(ch);
		});
		style.positions = [];
		if (style.shuffle) shuffle(style.images);
		style.images.forEach((fn, i) => {
			const fn2 = style.path + "/" + fn;
			const sources = ["https://cocobeanzies.mizabot.xyz/styles/" + fn2];
			const cloudCount = (Math.random() + 1) * window.innerWidth / imageSep / 8;
			for (let j = 0; j < cloudCount; j++) {
				const k = randint(0, CLOUDS.length - 1);
				sources.push("https://cocobeanzies.mizabot.xyz/clouds/" + CLOUDS[k]);
			}
			sources.forEach((url, j) => {
				const url2 = replaceIOS(url);
				let fn2;
				let image;
				let full_url;
				if (j) {
					image = document.createElement('img');
					image.src = url2;
					image.alt = "";
					full_url = url2;
					image.style.display = 'none';
				} else {
					fn2 = url2.split("/styles/", 2)[1];
					const iid = fn2.replaceAll('"', "$");
					image = document.getElementById(iid);
					if (!image) {
						console.log(fn2, iid);
						image = document.createElement('img');
						image.id = iid;
						image.src = url2;
						image.alt = url2.split("/styles/", 2)[1].split("/", 2)[1].split(".", 2)[0] + " by Cocobeanzies";
					}
					full_url = "https://cocobeanzies.mizabot.xyz/styles-full/" + fn2;
				}
				image.isCloud = j;
				image.setAttribute('loading', 'lazy');
				image.osrc = url2;
				image.full_url = full_url;
				image.style.position = 'fixed';
				image.style.left = `${window.innerWidth}px`;
				image.style.top = `${window.innerHeight}px`;
				image.style.transformOrigin = 'top left';
				function appear(anim) {
					let endOpacity = '1';
					if (image.isCloud) {
						let r = Math.random();
						if (image.inFront) {
							r = lerp(0.0625, 0.5, r);
						} else {
							r = lerp(0.25, 0.875, r);
						}
						endOpacity = `${r}`;
					}
					if (1) {
						const animation = image.animate([
							{ visibility: 'visible', opacity: '0.01' },
							{ opacity: endOpacity }
						], {
							duration: 250,
							easing: 'linear',
							fill: 'forwards'
						});
						image.anim = animation;
						animation.onfinish = () => {
							image.style.visibility = 'visible';
							image.style.opacity = endOpacity;
						};
					} else {
						image.style.visibility = 'visible';
						image.style.opacity = endOpacity;
					}
				}
				image.appear = (() => { image.style.display = 'block'; requestAnimationFrame(appear) });
				image.onload = (() => {
					const originalWidth = image.naturalWidth;
					const originalHeight = image.naturalHeight;
					const aspectRatio = originalWidth / originalHeight;
					let newHeight = Math.sqrt(image.desiredArea / aspectRatio) / image.scale;
					let newWidth = newHeight * aspectRatio;

					if (style.animated && !image.isCloud) {
						const tempCanvas = document.createElement('canvas');
						tempCanvas.width = newWidth;
						tempCanvas.height = newHeight;
						const tempCtx = tempCanvas.getContext('2d');
						tempCtx.drawImage(image, 0, 0, newWidth, newHeight);
						image.inanimate = tempCanvas.toDataURL('image/jpeg');
					}
					image.style.width = `${newWidth}px`;
					image.style.height = `${newHeight}px`;
					if (image.isCloud) {
						// Clouds don't block mouse cursor
						image.style.pointerEvents = 'none';
					} else {
						image.className = 'soft-edge';
					}
					// image.style.transform = `scale(${image.scale})`;
					image.style.willChange = 'transform';
					debouncedGalleryScroll();
				});
				if (!image.isCloud) {
					// Non-cloud pictures redirect to their full image
					image.style.cursor = 'pointer';
					image.onclick = (() => {
						window.open(image.full_url);
					});
				}
				image.index = i + j / (cloudCount + 1);
				image.isVisible = true;
				image.reset = (init) => {
					if (!image.isVisible) return;
					if (image.anim) image.anim.cancel();
					image.anim = null;
					if (image.anim2) image.anim2.cancel();
					image.anim2 = null;
					let scale = 1;
					if (image.isCloud) {
						image.inFront = Math.random() >= 2 / 3;
						image.style.zIndex = image.inFront ? '2' : '-1';
						scale = Math.random() * 3 + 0.5;
					} else {
						scale = Math.random() + 0.5;
					}
					image.scrollSpeed = scale;
					image.scale = image.isCloud ? 4 : 1.5;
					if (image.isCloud || 'ontouchstart' in window) {
						image.style.display = 'none';
						image.style.visibility = 'hidden';
					}
					image.style.opacity = '0';
					image.style.clipPath = 'none';
					image.isVisible = false;
					image.desiredArea = imageScale * imageScale;
					image.onload();
					const r = imageSep / window.innerWidth * 3;
					let x;
					let y;
					let allowed = false;
					let i;
					// Make sure pictures don't completely overlap
					for (i = 0; i < 32; i++) {
						allowed = true;
						y = image.index * window.innerWidth / imageSep / 2;
						if (!image.isCloud) {
							x = Math.random();
							for (const pos of style.positions) {
								if (!pos) continue;
								const dx = (x - pos[0]);
								const dy = (y - pos[1]);
								if (dx * dx + dy * dy < r * r) {
									allowed = false;
									break;
								}
							}
							if (allowed) break;
						} else {
							// Clouds are allowed to spawn anywhere, including 50% outside the boundaries
							x = Math.random() * 1.5 - 0.25;
						}
					}
					image.offsetX = x;
					image.offsetY = y;
					if (!image.isCloud) style.positions[image.index] = [x, y];
				};
				image.reset();
				style.elements.push(image);
				content2.appendChild(image);
			});
		});
		newHeight += imageSep * style.images.length;
		style.bottom = newHeight;
		newHeight += imageSep;
	});
	content2.style.minHeight = `${newHeight}px`;
}
function startImageFloating() {
	const rect = content2.getBoundingClientRect();
	const start = -rect.y - imageScale;
	const end = -rect.y + window.innerHeight + imageScale;
	STYLES.forEach((style) => {
		if (!style.elements || style.top > end || style.bottom < start) return;
		style.elements.forEach((image) => {
			if (!image.isVisible || !image.lastTransform) return;
			if (image.anim2) image.anim2.cancel();
			if (image.inanimate) image.src = image.osrc;
			// This animation must be initiated after the image loads, else it sometimes doesn't work
			const [x, y] = image.lastTransform;
			const m = Math.sqrt(image.desiredArea) * 0.2 * (Math.random() < 0.5 ? 1 : -1) * (Math.random() * 0.5 + 0.5);
			const d = (Math.random() + 1) * 5000;
			const hy = y - m;
			const ly = y + m;
			const animation = image.animate([
				{ transform: `translate(${x}px, ${hy}px) scale(${image.scale})`, easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)' },
				{ transform: `translate(${x}px, ${ly}px) scale(${image.scale})`, easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)' },
				{ transform: `translate(${x}px, ${hy}px) scale(${image.scale})`, easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)' }
			], {
				duration: d,
				iterations: Infinity,
				delay: -d / 4
			});
			image.anim2 = animation;
		});
	});
}
const debouncedImageFloating = debounce(startImageFloating, 100);
function cancelImageFloating() {
	const rect = content2.getBoundingClientRect();
	const start = -rect.y - imageScale;
	const end = -rect.y + window.innerHeight + imageScale;
	STYLES.forEach((style) => {
		if (style.top > end || style.bottom < start) return;
		style.elements.forEach((image) => {
			if (image.anim2) {
				image.anim2.cancel();
				image.anim2 = null;
				if (image.inanimate) image.src = image.inanimate;
			}
		});
	});
	debouncedImageFloating();
}
var lastScroll = 0;
function updateGalleryScroll(cancelAfter) {
	const currentTime = Date.now();
	const isFast = currentTime - lastScroll < 30;
	lastScroll = currentTime;
	const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
	const reqHeight = snakeGame && snakeGame.isRendered ? 2000 : 1600;
	// if (reqHeight - scrollTop > window.innerHeight) {
	// 	STYLES.forEach((style) => {
	// 		style.elements.forEach((image) => {
	// 			image.reset();
	// 		});
	// 	});
	// 	content2.style.display = 'none';
	// 	background.style.backgroundImage = 'none';
	// 	background.style.backgroundColor = '#1f003f';
	// 	return;
	// }
	function updateScrollDown() {
		// content2.style.display = 'block';
		const rect = content2.getBoundingClientRect();
		const start = -rect.y - imageScale;
		const end = -rect.y + window.innerHeight + imageScale;
		STYLES.forEach((style) => {
			if (style.top > end || style.bottom < start) {
				style.elements.forEach((image) => {
					image.reset();
				});
				return;
			}
			style.elements.forEach((image) => {
				const i = image.index;
				const top = style.top + i * imageSep;
				const bottom = style.top + i * imageSep;
				const width = (image.width * image.scale || image.getBoundingClientRect().width) || imageScale;
				if (!image.isVisible) {
					image.style.display = 'block';
					image.isVisible = true;
					if (image.anim) image.anim.cancel();
					image.anim = null;
					if (image.onrender) image.onrender();
					image.appear();
					image.style.left = '0px';
					image.style.top = '0px';
				}
				// scrollSpeed property defined previously controls parallax factor
				const x = image.offsetX * (rect.width - width) + rect.x;
				const y = (top - start) * image.scrollSpeed;
				image.lastTransform = [x, y];
				image.style.transform = `translate(${x}px, ${y}px) scale(${image.scale})`;
				if (top - (imageSep / image.scrollSpeed) > end || bottom + (imageScale + imageSep) / image.scrollSpeed < start) {
					image.reset();
					return;
				}
				if (x < rect.x) {
					const p = Math.floor(rect.x - x) / width * 100;
					image.style.clipPath = `inset(0% 0% 0% ${p}%)`;
				} else if (x + width > rect.x + rect.width) {
					const p = Math.ceil(x + width - rect.x - rect.width) / width * 100;
					image.style.clipPath = `inset(0% ${p}% 0% 0%)`;
				} else {
					image.style.clipPath = 'none';
				}
			});
		});
		if (cancelAfter) cancelImageFloating();
	}
	updateScrollDown();
	const bodyRect = document.body.getBoundingClientRect();
	background.style.height = `${bodyRect.height}px`;
	background.style.backgroundImage = 'linear-gradient(#180030, #7fafff)';
	background.style.backgroundColor = 'transparent';
}
debouncedGalleryScroll = debounce(updateGalleryScroll, 250);
function updateScroll() {
	requestAnimationFrame(() => {
		// const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
		// const scrollRatio = scrollTop / MINHEIGHT;
		// if (renderer) {
		// 	const r = Math.min(lerp(0.125, 1, scrollRatio), 0.5);
		// 	const g = Math.max(lerp(-0.5, 0.5, scrollRatio), 0);
		// 	const b = Math.min(lerp(0.25, 2, scrollRatio), 1);
		// 	renderer.setClearColor(new THREE.Color(r, g, b), 1);
		// }
		updateGalleryScroll(true);
	});
}
setupGallery();
const roselandSources = [
	"Roseland_Bottom.webp",
	"Roseland_1.avif",
	"Roseland_2.avif",
	"Roseland_3.avif",
	"Roseland_Sun.webp"
];
const roselandBanners = [];
const bottom = document.getElementById('bottom');
var bannerContainer;
var cloudContainer;
var cloudContainer2;
var leafContainer;
const bannerClouds = [];
const bannerLeaves = [];
const bannerLeafIndices = [
	[-2, -2],
	[-1, -2],
	[-2.5, -1],
	[-1.5, -1],
	[-0.5, -1],
	[-0.5, -1],
	[-1, 0],
	[0, 0],
];
const bannerLC = bannerLeafIndices.length;
function setupBanner2() {
	const banner2 = document.getElementById('banner2');
	if (banner2) banner2.remove();
	bannerContainer = document.createElement('div');
	bannerContainer.style.height = '1080px';
	bannerContainer.style.maskImage = 'linear-gradient(transparent, white, white, white)';
	bannerContainer.style.pointerEvents = 'none';
	content4.appendChild(bannerContainer);
	var i = 0;
	for (const src of roselandSources) {
		const banner = document.createElement('img');
		banner.className = 'non-selectable';
		banner.src = replaceIOS("https://cocobeanzies.mizabot.xyz/pictures/" + src);
		banner.alt = "Cocobeanzies Banner";
		banner.style.display = 'none';
		banner.style.position = 'fixed';
		const z = 100 - i;
		banner.style.zIndex = `${z}`;
		banner.style.left = '0px';
		banner.style.top = '0px';
		banner.index = i;
		banner.style.willChange = 'transform';
		bannerContainer.appendChild(banner);
		roselandBanners.push(banner);
		i++;
	}
	roselandBanners[0].className = '';
	roselandBanners[0].style.pointerEvents = 'auto';
	const n1 = roselandBanners.length - 1;
	const sun = roselandBanners[n1];
	sun.style.zIndex = '201';
	sun.style.mixBlendMode = 'luminosity';
	{
		const grad = document.createElement('img');
		grad.className = 'non-selectable';
		grad.src = replaceIOS("https://cocobeanzies.mizabot.xyz/pictures/Roseland_Gradient.avif");
		grad.style.display = 'none';
		grad.style.position = 'fixed';
		grad.style.left = '0px';
		grad.style.top = '0px';
		grad.style.zIndex = '202';
		grad.style.mixBlendMode = 'overlay';
		grad.index = sun.index;
		grad.style.willChange = 'transform';
		bannerContainer.appendChild(grad);
		roselandBanners.push(grad);
	}
	cloudContainer = document.createElement('div');
	cloudContainer.className = 'non-selectable';
	cloudContainer.style.width = '100%';
	cloudContainer.style.height = '100%';
	cloudContainer.style.left = '0px';
	cloudContainer.style.top = '0px';
	cloudContainer.style.zIndex = '90';
	cloudContainer.style.position = 'fixed';
	cloudContainer.style.overflow = 'clip';
	cloudContainer.style.willChange = 'transform';
	bannerContainer.appendChild(cloudContainer);
	cloudContainer2 = document.createElement('div');
	cloudContainer2.className = 'non-selectable';
	cloudContainer2.style.width = '100%';
	cloudContainer2.style.height = '100%';
	cloudContainer2.style.left = '0px';
	cloudContainer2.style.top = '0px';
	cloudContainer2.style.zIndex = '91';
	cloudContainer2.style.position = 'fixed';
	cloudContainer2.style.overflow = 'clip';
	cloudContainer2.style.willChange = 'transform';
	bannerContainer.appendChild(cloudContainer2);
	for (let i = 0; i < 8; i++) {
		const clouds = document.createElement('img');
		clouds.className = 'non-selectable';
		clouds.src = i >= 2 ? "https://cocobeanzies.mizabot.xyz/pictures/Roseland_Clouds2.webp" : "https://cocobeanzies.mizabot.xyz/pictures/Roseland_Clouds.webp";
		clouds.style.display = 'block';
		clouds.style.position = 'fixed';
		clouds.style.left = '0px';
		clouds.style.top = '0px';
		const z = 10 - i;
		clouds.style.zIndex = `${z}`;
		clouds.heightMult = 1 - Math.floor(4 - i / 2) / 12;
		(i >= 2 ? cloudContainer2 : cloudContainer).appendChild(clouds);
		bannerClouds.push(clouds);
		clouds.startAnimation = (clouds, x, y, x2, y2) => {
			if (clouds.anim) clouds.anim.cancel();
			if (clouds.anim2) clouds.anim2.cancel();
			const animation = clouds.animate([
				{ transform: `translate(${x}%, ${y}%)` },
				{ transform: `translate(${x2}%, ${y2}%)` }
			], {
				duration: i >= 6 ? 49157 : i >= 4 ? 67339 : i >= 2 ? 92237 : 126359,
				iterations: Infinity,
				delay: -64000
			});
			clouds.anim = animation;
		};
		let yi;
		if (i >= 6) yi = -0.25;
		else if (i >= 4) yi = 0.05;
		else if (i >= 2) yi = 0.35;
		else yi = 0.55;
		const [xo, yo] = i & 1 ? [-0.99, yi] : [0.01, yi];
		const x = xo * 100;
		const y = yo * 100;
		const x2 = x + 100;
		const y2 = y;
		if (clouds.anim) clouds.anim.cancel();
		if (clouds.anim2) clouds.anim2.cancel();
		clouds.startAnimation(clouds, x, y, x2, y2);
	}
	{
		const critterGlow = document.createElement('img');
		critterGlow.className = 'non-selectable';
		critterGlow.src = "https://cocobeanzies.mizabot.xyz/pictures/Roseland_Glow.png";
		critterGlow.style.display = 'none';
		critterGlow.style.position = 'fixed';
		critterGlow.style.left = '0px';
		critterGlow.style.top = '0px';
		critterGlow.style.zIndex = '101';
		critterGlow.style.mixBlendMode = 'plus-lighter';
		critterGlow.index = 0;
		critterGlow.noDisplay = true;
		critterGlow.style.willChange = 'transform';
		bannerContainer.appendChild(critterGlow);
		roselandBanners.push(critterGlow);

		const bannerGlow = document.createElement('div');
		bannerGlow.className = 'non-selectable';
		bannerGlow.style.zIndex = '102';
		bannerGlow.style.position = 'fixed';
		bannerGlow.style.left = '0px';
		bannerGlow.style.top = '0px';
		bannerGlow.style.width = '960px';
		bannerGlow.style.height = '540px';
		bannerGlow.style.transformOrigin = 'top left';
		bannerGlow.style.clipPath = 'url(#roselandGlowClipPath)';
		bannerGlow.index = 0;
		bannerGlow.style.pointerEvents = 'auto';
		bannerGlow.style.willChange = 'transform';
		bannerContainer.appendChild(bannerGlow);
		roselandBanners.push(bannerGlow);
		bannerGlow.addEventListener('mouseover', () => {
			bannerGlow.style.cursor = "url('https://cocobeanzies.mizabot.xyz/icons/sound.png') 12 12, auto";
			critterGlow.style.display = 'block';
		});
		bannerGlow.addEventListener('mouseout', () => {
			bannerGlow.style.cursor = 'default';
			critterGlow.style.display = 'none';
		});
		bannerGlow.addEventListener('click', () => {
			playAudio('rainbow-critter');
		});

		const noseGlow = document.createElement('img');
		noseGlow.src = "https://cocobeanzies.mizabot.xyz/pictures/Roseland_Glow2.png";
		noseGlow.style.display = 'none';
		noseGlow.style.position = 'fixed';
		noseGlow.style.left = '0px';
		noseGlow.style.top = '0px';
		noseGlow.style.zIndex = '101';
		noseGlow.style.mixBlendMode = 'plus-lighter';
		noseGlow.index = 0;
		noseGlow.noDisplay = true;
		noseGlow.style.willChange = 'transform';
		bannerContainer.appendChild(noseGlow);
		roselandBanners.push(noseGlow);

		const bannerGlow2 = document.createElement('div');
		bannerGlow2.style.zIndex = '102';
		bannerGlow2.style.position = 'fixed';
		bannerGlow2.style.left = '0px';
		bannerGlow2.style.top = '0px';
		bannerGlow2.style.width = '960px';
		bannerGlow2.style.height = '540px';
		bannerGlow2.style.transformOrigin = 'top left';
		bannerGlow2.style.clipPath = 'url(#roselandGlowClipPath2)';
		bannerGlow2.index = 0;
		bannerGlow2.style.pointerEvents = 'auto';
		bannerGlow2.style.willChange = 'transform';
		bannerContainer.appendChild(bannerGlow2);
		roselandBanners.push(bannerGlow2);
		bannerGlow2.addEventListener('mouseover', () => {
			noseGlow.style.display = 'block';
		});
		bannerGlow2.addEventListener('mouseout', () => {
			noseGlow.style.display = 'none';
		});
		bannerGlow2.addEventListener('click', () => {
			playAudio('fnaf-nose-honk', null, null, false);
		});
	}
	leafContainer = document.createElement('div');
	leafContainer.className = 'non-selectable';
	leafContainer.style.width = '100%';
	leafContainer.style.height = '100%';
	leafContainer.style.left = '0px';
	leafContainer.style.top = '0px';
	leafContainer.style.zIndex = '200';
	leafContainer.style.position = 'fixed';
	leafContainer.style.overflow = 'clip';
	leafContainer.style.maskImage = 'linear-gradient(transparent, white, white, white)';
	leafContainer.style.maskType = 'alpha';
	leafContainer.style.maskMode = 'alpha';
	leafContainer.style.willChange = 'transform';
	bannerContainer.appendChild(leafContainer);
	for (let i = 0; i < bannerLC; i++) {
		leaf = document.createElement('img');
		leaf.src = replaceIOS("https://cocobeanzies.mizabot.xyz/pictures/Roseland_Leaves.avif");
		leaf.style.display = 'block';
		leaf.style.position = 'absolute';
		leaf.style.left = '0px';
		leaf.style.top = '0px';
		leaf.style.opacity = '0';
		leafContainer.appendChild(leaf);
		bannerLeaves.push(leaf);
		leaf.startAnimation = (leaf, x, y, x2, y2) => {
			if (leaf.anim) leaf.anim.cancel();
			if (leaf.anim2) leaf.anim2.cancel();
			const animation = leaf.animate([
				{ transform: `translate(${x}%, ${y}%)` },
				{ transform: `translate(${x2}%, ${y2}%)` }
			], {
				duration: 12000,
				iterations: Infinity
			});
			leaf.anim = animation;
			const animation2 = leaf.animate([
				{ opacity: '0' },
				{ opacity: '1' }
			], {
				duration: 1000,
				fill: 'forwards',
				easing: 'ease-in'
			});
			leaf.anim2 = animation2;
		};
		const [xo, yo] = bannerLeafIndices[i];
		const x = xo * 100;
		const y = yo * 100;
		const x2 = x + 200;
		const y2 = y + 200;
		leaf.style.opacity = '0';
		if (leaf.anim) leaf.anim.cancel();
		if (leaf.anim2) leaf.anim2.cancel();
		leaf.startAnimation(leaf, x, y, x2, y2);
	}
}
setupBanner2();
function updateBanner2() {
	const top = bottom.getBoundingClientRect();
	const rect = content4.getBoundingClientRect();
	if (!isVisible(bottom) || top.y + top.height > window.innerHeight) {
		for (const banner of roselandBanners) {
			banner.style.display = 'none';
		}
		bannerContainer.style.visibility = 'hidden';
		leafContainer.style.display = 'none';
		return;
	}
	const standardWidth = Math.ceil(rect.width);
	const standardHeight = Math.ceil(rect.width * 9 / 16);
	const maxHeight = standardHeight;
	for (const banner of roselandBanners) {
		const r = 1 - banner.index * 0.2;
		const x = rect.x;
		const y = (top.y + top.height) * r + (window.innerHeight - maxHeight) * (1 - r) + maxHeight - standardHeight;
		if (!banner.noDisplay) banner.style.display = 'block';
		if (banner.tagName == 'IMG') {
			banner.width = standardWidth;
			banner.height = standardHeight;
			banner.style.transform = `translate(${x}px, ${y}px)`;
		} else {
			const scale = standardWidth / 960;
			banner.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
		}
	}
	{
		const displayHeight = standardHeight / 3.375;
		{
			const r = 0.2;
			const x = rect.x;
			const y = (top.y + top.height) * r + (window.innerHeight - maxHeight) * (1 - r) + maxHeight - standardHeight;
			cloudContainer.style.width = `${standardWidth}px`;
			cloudContainer.style.height = `${standardHeight}px`;
			cloudContainer.style.transform = `translate(${x}px, ${y}px)`;
			cloudContainer.style.display = 'block';
		}
		{
			const r = 0.3;
			const x = rect.x;
			const y = (top.y + top.height) * r + (window.innerHeight - maxHeight) * (1 - r) + maxHeight - standardHeight;
			cloudContainer2.style.width = `${standardWidth}px`;
			cloudContainer2.style.height = `${standardHeight}px`;
			cloudContainer2.style.transform = `translate(${x}px, ${y}px)`;
			cloudContainer2.style.display = 'block';
		}
		for (const cloud of bannerClouds) {
			cloud.width = standardWidth;
			cloud.height = displayHeight;
		}
	}
	{
		const r = 1.2;
		const x = rect.x;
		const y = (top.y + top.height) * r + (window.innerHeight - maxHeight) * (1 - r) + maxHeight - standardHeight;
		leafContainer.style.width = `${standardWidth}px`;
		leafContainer.style.height = `${standardHeight}px`;
		leafContainer.style.transform = `translate(${x}px, ${y}px)`;
		leafContainer.style.display = 'block';
		for (const leaf of bannerLeaves) {
			leaf.width = standardWidth;
			leaf.height = standardHeight;
		}
	}
	bannerContainer.style.height = `${maxHeight}px`;
	bannerContainer.style.visibility = 'visible';
}
window.addEventListener('resize', updateBanner2);
window.addEventListener('scroll', updateBanner2);

function setupRipples() {
	const elements = document.getElementsByClassName('ripples');
	for (const element of elements) {
		element.addEventListener('mouseenter', function(event) {
			const ripple = document.createElement('span');
			ripple.classList.add('ripple');

			const rect = element.getBoundingClientRect();
			const size = Math.min(window.innerHeight, Math.max(rect.width, rect.height));
			const x = event.clientX - rect.left - (size / 2);
			const y = event.clientY - rect.top - (size / 2);

			ripple.style.width = ripple.style.height = `${size}px`;
			ripple.style.left = `${x}px`;
			ripple.style.top = `${y}px`;
			element.appendChild(ripple);

			ripple.addEventListener('animationend', () => {
				ripple.remove();
			});
		});
	}
}
setupRipples();

const blackHole = document.createElement('img');
blackHole.style.position = 'fixed';
blackHole.style.zIndex = '99';
blackHole.src = "https://cocobeanzies.mizabot.xyz/pictures/black_hole.webp"
blackHole.alt = "";
blackHole.style.display = 'none';
blackHole.style.height = '128px';
blackHole.posX = 0;
blackHole.posY = 0;
blackHole.mass = 0;
blackHole.radius = 0;
blackHole.rotation = 0;
document.body.appendChild(blackHole)

function updateBlackHole() {
	blackHole.style.display = 'block';
	blackHole.style.left = `${blackHole.posX}px`;
	blackHole.style.top = `${blackHole.posY}px`;
	if (HOLDING) {
		blackHole.posX = (blackHole.posX * 7 + mouseX) / 8;
		blackHole.posY = (blackHole.posY * 7 + mouseY) / 8;
		const rotation = mouseV[0];
		blackHole.rotation = Math.max(-45, Math.min(45, blackHole.rotation * 0.99 + rotation / 10));
	}
	if (blackHole.mass > 512) blackHole.mass = 512;
	const size = Math.cbrt(blackHole.mass) / 6;
	blackHole.radius = size * 128;
	blackHole.style.opacity = Math.min(0.8, blackHole.mass / 128);
	blackHole.style.transform = `translate(-50.5%, -52%) scale(${size}) rotate(${blackHole.rotation}deg)`;
}

var HOLDING = false;
window.onmousedown = () => {
	blackHole.posX = mouseX;
	blackHole.posY = mouseY;
	HOLDING = true;
	function func() {
		if (HOLDING) {
			blackHole.mass = Math.max(blackHole.mass + 1, 1);
			updateBlackHole();
			requestAnimationFrame(func)
		} else {
			blackHole.mass -= 1;
			if (blackHole.mass <= 0) {
				blackHole.style.display = 'none';
				blackHole.radius = 0;
			} else {
				updateBlackHole();
				requestAnimationFrame(func)
			}
		}
	}
	if (!blackHole.radius) {
		func();
	}
}
window.onmouseup = () => {
	HOLDING = false;
}

const MINHEIGHT = Number.parseFloat(window.getComputedStyle(document.body).height);
// document.body.style.height = MINHEIGHT;

updateScroll();
const debouncedScroll = debounce(updateScroll, 250);
window.addEventListener('resize', () => { requestAnimationFrame(debouncedScroll) });
window.addEventListener('scroll', updateScroll);

{
	function callback(entries, observer) {
		entries.forEach((entry) => {
			entry.target.onscreen = entry.isIntersecting;
		});
	}
	const options = {
		root: null,
		rootMargin: '0px',
		threshold: 0.01,
	};
	const observer = new IntersectionObserver(callback, options);

	const selectors = Array.from(document.getElementsByClassName('bullet'));
	selectors.push(...document.getElementsByClassName('stamp'));
	selectors.push(...document.getElementsByClassName('blurred'));
	selectors.forEach((box) => { observer.observe(box) });
}
{
	function callback(entries, observer) {
		entries.forEach((entry) => {
			const aps = entry.isIntersecting ? 'running' : 'paused';
			function applyChildren(e) {
				for (const c of e.children) {
					applyChildren(c);
				}
				e.style.animationPlayState = aps;
			}
			applyChildren(entry.target);
		});
	}
	const options = {
		root: null,
		rootMargin: '0px',
		threshold: 0.01,
	};
	const observer = new IntersectionObserver(callback, options);

	const selectors = Array.from(document.getElementsByClassName('sub-anim'));
	selectors.push(...document.getElementsByClassName('title'));
	selectors.forEach((box) => { observer.observe(box) });
}

generateStars();
animateUpdate();

if (ISIOS) {
	Array.from(document.getElementsByTagName('img')).forEach((img) => {
		const avifSrc = img.getAttribute('src');
		if (avifSrc && avifSrc.endsWith('.avif')) {
			const fallbackSrc = avifSrc.replace('.avif', '.webp'); // or another format
			img.setAttribute('src', fallbackSrc);
		}
	});
}