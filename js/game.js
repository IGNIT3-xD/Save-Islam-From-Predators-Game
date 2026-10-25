(function () {
  'use strict';

  var V = window.FruitSlashVisuals;
  var sound = window.FruitSlashSound;
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;

  if (!ctx || !V || !sound) {
    return;
  }

  var HIGH_SCORE_KEY = 'fruitSlash.highScore';
  var DIFFICULTY_KEY = 'fruitSlash.difficulty';
  var DIFFICULTIES = {
    easy: {
      ramp: 120,
      baseInterval: 1.2,
      intervalDrop: 0.55,
      intervalJitter: [0.9, 1.15],
      extraBase: 0,
      extraStep: 25,
      extraChance: 0.3,
      maxCount: 3,
      bombBase: 0.04,
      bombSlope: 0.0018,
      bombCap: 0.18
    },
    medium: {
      ramp: 90,
      baseInterval: 0.98,
      intervalDrop: 0.52,
      intervalJitter: [0.85, 1.12],
      extraBase: 1,
      extraStep: 22,
      extraChance: 0.38,
      maxCount: 3,
      bombBase: 0.07,
      bombSlope: 0.0028,
      bombCap: 0.24
    },
    hard: {
      ramp: 65,
      baseInterval: 0.78,
      intervalDrop: 0.48,
      intervalJitter: [0.8, 1.08],
      extraBase: 1,
      extraStep: 16,
      extraChance: 0.48,
      maxCount: 4,
      bombBase: 0.12,
      bombSlope: 0.0038,
      bombCap: 0.3
    }
  };
  var START_LIVES = 3;
  var COMBO_WINDOW = 0.6;
  var MAX_DPR = 1.5;
  var PUNCH_LIFE = 0.17;
  var PUNCH_SIZE = 92;
  var PUNCH_TOLERANCE = 15;

  var el = {
    canvas: canvas,
    hud: document.getElementById('hud'),
    score: document.getElementById('scoreValue'),
    hudBest: document.getElementById('hudBestValue'),
    menuBest: document.getElementById('menuBestValue'),
    lives: document.getElementById('lives'),
    combo: document.getElementById('comboBadge'),
    comboValue: document.querySelector('#comboBadge strong'),
    pauseScore: document.getElementById('pauseScore'),
    finalScore: document.getElementById('finalScore'),
    finalBest: document.getElementById('finalBest'),
    newBest: document.getElementById('newBestBadge'),
    gameOverTitle: document.getElementById('gameOverTitle'),
    announce: document.getElementById('srAnnounce'),
    playBtn: document.getElementById('playBtn'),
    exitBtn: document.getElementById('exitBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    restartBtn: document.getElementById('restartBtn'),
    pauseMenuBtn: document.getElementById('pauseMenuBtn'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    gameOverMenuBtn: document.getElementById('gameOverMenuBtn'),
    goodbyeMenuBtn: document.getElementById('goodbyeMenuBtn')
  };

  var screens = {
    menu: document.getElementById('menuScreen'),
    pause: document.getElementById('pauseScreen'),
    gameover: document.getElementById('gameOverScreen'),
    goodbye: document.getElementById('goodbyeScreen')
  };

  var soundToggles = Array.prototype.slice.call(document.querySelectorAll('.js-sound-toggle'));
  var difficultyButtons = Array.prototype.slice.call(document.querySelectorAll('.js-difficulty'));
  var highScore = loadHighScore();
  var selectedDifficulty = loadDifficulty();
  var resizeFrame = 0;
  var backgroundGradient = null;

  var state = {
    phase: 'menu',
    score: 0,
    lives: START_LIVES,
    combo: 0,
    comboTimer: 0,
    elapsed: 0,
    spawnTimer: 0.4,
    bombTimer: 0,
    width: 0,
    height: 0,
    dpr: 1,
    scale: 1,
    fruits: [],
    pending: [],
    punches: [],
    lastHitAt: -10,
    lastFrame: 0
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function loadHighScore() {
    try {
      var value = parseInt(localStorage.getItem(HIGH_SCORE_KEY), 10);
      return isFinite(value) && value > 0 ? value : 0;
    } catch (error) {
      return 0;
    }
  }

  function saveHighScore() {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
    } catch (error) {
      return;
    }
  }

  function loadDifficulty() {
    try {
      var value = localStorage.getItem(DIFFICULTY_KEY);

      if (value && DIFFICULTIES[value]) {
        return value;
      }
    } catch (error) {
      return 'medium';
    }

    return 'medium';
  }

  function saveDifficulty() {
    try {
      localStorage.setItem(DIFFICULTY_KEY, selectedDifficulty);
    } catch (error) {
      return;
    }
  }

  function updateDifficultyUI() {
    difficultyButtons.forEach(function (button) {
      var active = button.getAttribute('data-difficulty') === selectedDifficulty;

      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function selectDifficulty(name) {
    if (!DIFFICULTIES[name] || name === selectedDifficulty) {
      return;
    }

    selectedDifficulty = name;
    saveDifficulty();
    updateDifficultyUI();
    announce(name.charAt(0).toUpperCase() + name.slice(1) + ' difficulty.');
  }

  function announce(message) {
    if (el.announce) {
      el.announce.textContent = message;
    }
  }

  function showScreen(name, shouldFocus) {
    Object.keys(screens).forEach(function (key) {
      var screen = screens[key];
      var active = key === name;

      if (!screen) {
        return;
      }

      screen.classList.toggle('active', active);
      screen.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    if (name) {
      if (shouldFocus !== false) {
        window.setTimeout(function () {
          var screen = screens[name];

          if (!screen || !screen.classList.contains('active')) {
            return;
          }

          var target = screen.querySelector('.btn--primary') || screen.querySelector('button');

          if (target) {
            try {
              target.focus({ preventScroll: true });
            } catch (error) {
              target.focus();
            }
          }
        }, 50);
      }
    } else if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  }

  function setHudVisible(visible) {
    el.hud.classList.toggle('hidden', !visible);
  }

  function updateBestUI() {
    el.menuBest.textContent = String(highScore);
    el.hudBest.textContent = String(Math.max(highScore, state.score));
    el.finalBest.textContent = String(highScore);
  }

  function updateScoreUI() {
    el.score.textContent = String(state.score);
    el.hudBest.textContent = String(Math.max(highScore, state.score));
  }

  function renderLives() {
    var hearts = el.lives.children;
    var i;

    for (i = 0; i < hearts.length; i += 1) {
      hearts[i].classList.toggle('lost', i >= state.lives);
    }

    el.lives.setAttribute('aria-label', state.lives + (state.lives === 1 ? ' life' : ' lives'));
  }

  function updateSoundUI() {
    var enabled = sound.isEnabled();
    var action = enabled ? 'Mute sound' : 'Enable sound';

    soundToggles.forEach(function (button) {
      button.setAttribute('data-sound', enabled ? 'on' : 'off');
      button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      button.setAttribute('aria-label', action);
      button.title = action;

      var label = button.querySelector('[data-sound-label]');

      if (label) {
        label.textContent = enabled ? 'Sound On' : 'Sound Off';
      }
    });
  }

  function toggleSound() {
    sound.init();
    sound.setEnabled(!sound.isEnabled());
    updateSoundUI();
  }

  function resetRound() {
    state.score = 0;
    state.lives = START_LIVES;
    state.combo = 0;
    state.comboTimer = 0;
    state.elapsed = 0;
    state.spawnTimer = 0.4;
    state.bombTimer = 0;
    state.fruits.length = 0;
    state.pending.length = 0;
    state.punches.length = 0;
    state.lastHitAt = -10;
    hideCombo();
    el.newBest.classList.add('hidden');
    updateScoreUI();
    updateBestUI();
    renderLives();
  }

  function startGame() {
    sound.init();
    sound.stopGameOver();
    sound.setHomeActive(false);
    resetRound();
    state.phase = 'playing';
    state.lastFrame = performance.now();
    showScreen(null, false);
    setHudVisible(true);
    canvas.style.cursor = 'pointer';

    try {
      canvas.focus({ preventScroll: true });
    } catch (error) {
      canvas.focus();
    }

    announce('Game started. Three lives.');
  }

  function pauseGame(silent) {
    if (state.phase !== 'playing') {
      return;
    }

    state.phase = 'paused';
    state.punches.length = 0;
    el.pauseScore.textContent = String(state.score);
    canvas.style.cursor = 'default';
    showScreen('pause');
    announce(silent ? 'Game paused.' : 'Game paused.');
  }

  function resumeGame() {
    if (state.phase !== 'paused') {
      return;
    }

    state.phase = 'playing';
    state.lastFrame = performance.now();
    showScreen(null, false);
    setHudVisible(true);
    canvas.style.cursor = 'pointer';

    try {
      canvas.focus({ preventScroll: true });
    } catch (error) {
      canvas.focus();
    }

    announce('Game resumed.');
  }

  function goToMenu() {
    sound.stopGameOver();
    sound.setHomeActive(true);
    state.phase = 'menu';
    resetRound();
    setHudVisible(false);
    showScreen('menu');
    canvas.style.cursor = 'default';
    updateBestUI();
  }

  function showExitFallback() {
    if (window.closed) {
      return;
    }

    state.phase = 'goodbye';
    sound.setHomeActive(false);
    sound.stopGameOver();
    resetRound();
    setHudVisible(false);
    canvas.style.cursor = 'default';
    showScreen('goodbye');
    announce('Thanks for playing.');
  }

  function exitGame() {
    try {
      window.close();
    } catch (error) {
      window.setTimeout(showExitFallback, 120);
      return;
    }

    window.setTimeout(showExitFallback, 120);
  }

  function gameOverTitle(score) {
    if (score >= 500) {
      return 'Legendary!';
    }
    if (score >= 300) {
      return 'Heavy hitter!';
    }
    if (score >= 150) {
      return 'Nice punching!';
    }
    if (score >= 60) {
      return 'Good hits!';
    }
    return 'Keep punching!';
  }

  function endGame() {
    if (state.phase === 'gameover') {
      return;
    }

    var isBest = state.score > highScore;

    if (isBest) {
      highScore = state.score;
      saveHighScore();
    }

    state.phase = 'gameover';
    state.punches.length = 0;
    hideCombo();
    canvas.style.cursor = 'default';
    setHudVisible(false);
    sound.setHomeActive(false);
    sound.playGameOver();

    el.finalScore.textContent = String(state.score);
    el.finalBest.textContent = String(highScore);
    el.newBest.classList.toggle('hidden', !isBest);
    el.gameOverTitle.textContent = gameOverTitle(state.score);
    updateBestUI();
    showScreen('gameover');
    announce('Game over. Score ' + state.score + '. Best ' + highScore + '.');
  }

  function resize() {
    var width = Math.max(1, window.innerWidth);
    var height = Math.max(1, window.innerHeight);
    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

    state.width = width;
    state.height = height;
    state.dpr = dpr;
    state.scale = clamp(Math.min(width, height) / 760, 0.66, 1.18);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    backgroundGradient = ctx.createLinearGradient(0, 0, 0, height);
    backgroundGradient.addColorStop(0, '#11261f');
    backgroundGradient.addColorStop(0.55, '#0a1b16');
    backgroundGradient.addColorStop(1, '#06110e');
  }

  function scheduleResize() {
    if (resizeFrame) {
      cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = requestAnimationFrame(function () {
      resizeFrame = 0;
      resize();
    });
  }

  function updateSpawner(dt) {
    var i;

    state.spawnTimer -= dt;

    for (i = state.pending.length - 1; i >= 0; i -= 1) {
      var pending = state.pending[i];
      pending.delay -= dt;

      if (pending.delay <= 0) {
        spawnEntity(pending.isBomb);
        state.pending.splice(i, 1);
      }
    }

    if (state.spawnTimer <= 0) {
      spawnWave();
    }
  }

  function spawnWave() {
    var profile = DIFFICULTIES[selectedDifficulty];
    var progress = clamp(state.elapsed / profile.ramp, 0, 1);
    var maxExtra = Math.min(profile.maxCount - 1, profile.extraBase + Math.floor(state.elapsed / profile.extraStep));
    var count = 1 + Math.floor(Math.random() * (maxExtra + 1));
    var delay = 0;
    var i;

    state.spawnTimer = (profile.baseInterval - progress * profile.intervalDrop)
      * rand(profile.intervalJitter[0], profile.intervalJitter[1]);

    if (Math.random() < progress * profile.extraChance) {
      count += 1;
    }

    count = Math.min(count, profile.maxCount);

    for (i = 0; i < count; i += 1) {
      state.pending.push({ delay: delay, isBomb: false });
      delay += rand(0.1, 0.18);
    }

    var bombChance = Math.min(profile.bombCap, profile.bombBase + state.elapsed * profile.bombSlope);

    if (Math.random() < bombChance) {
      state.pending.push({ delay: rand(0.05, Math.max(0.08, delay)), isBomb: true });
    }
  }

  function spawnEntity(isBomb) {
    var baseRadius = 40 * state.scale;
    var face = V.randomFace();
    var radius = isBomb ? baseRadius * 0.8 : baseRadius * (face === 'face2' ? 1.04 : 1);
    var margin = radius * 1.35;
    var minX = Math.min(margin, state.width * 0.25);
    var maxX = Math.max(state.width - margin, state.width * 0.75);
    var x = rand(minX, maxX);
    var y = state.height + radius + rand(8, 44);
    var centerPull = (state.width * 0.5 - x) / Math.max(1, state.width * 0.5);
    var vx = centerPull * state.height * rand(0.035, 0.075) + rand(-0.08, 0.08) * state.height;

    state.fruits.push({
      x: x,
      y: y,
      vx: vx,
      vy: -state.height * rand(1.42, 1.7),
      gravity: state.height * 1.78,
      r: radius,
      type: face,
      isBomb: isBomb,
      alive: true
    });
  }

  function updateEntities(dt) {
    for (var i = state.fruits.length - 1; i >= 0; i -= 1) {
      var entity = state.fruits[i];

      if (!entity.alive) {
        state.fruits.splice(i, 1);
        continue;
      }

      entity.vy += entity.gravity * dt;
      entity.x += entity.vx * dt;
      entity.y += entity.vy * dt;

      if (entity.vy > 0 && entity.y - entity.r > state.height + 4) {
        if (state.phase === 'playing' && !entity.isBomb) {
          missFace(entity);
        }
        state.fruits.splice(i, 1);
      }
    }
  }

  function updatePunches(dt) {
    for (var i = state.punches.length - 1; i >= 0; i -= 1) {
      state.punches[i].life -= dt;

      if (state.punches[i].life <= 0) {
        state.punches.splice(i, 1);
      }
    }
  }

  function showCombo() {
    el.comboValue.textContent = 'x' + state.combo;
    el.combo.classList.add('show');
    el.combo.setAttribute('aria-hidden', 'false');
  }

  function hideCombo() {
    el.combo.classList.remove('show');
    el.combo.setAttribute('aria-hidden', 'true');
  }

  function addPunch(x, y) {
    state.punches.push({
      x: x,
      y: y,
      life: PUNCH_LIFE,
      maxLife: PUNCH_LIFE
    });

    if (state.punches.length > 5) {
      state.punches.shift();
    }
  }

  function findTarget(x, y) {
    var target = null;
    var best = Infinity;
    var padding = PUNCH_TOLERANCE * state.scale;

    for (var i = 0; i < state.fruits.length; i += 1) {
      var entity = state.fruits[i];

      if (!entity.alive) {
        continue;
      }

      var dx = x - entity.x;
      var dy = y - entity.y;
      var distanceSq = dx * dx + dy * dy;
      var reach = entity.r + padding;

      if (distanceSq <= reach * reach && distanceSq < best) {
        best = distanceSq;
        target = entity;
      }
    }

    return target;
  }

  function hitEntity(entity) {
    if (!entity.alive) {
      return;
    }

    entity.alive = false;

    if (entity.isBomb) {
      state.phase = 'bomb';
      state.bombTimer = 0.35;
      state.combo = 0;
      state.comboTimer = 0;
      hideCombo();
      announce('Bomb hit. Run over.');
      return;
    }

    if (state.elapsed - state.lastHitAt <= COMBO_WINDOW) {
      state.combo += 1;
    } else {
      state.combo = 1;
    }

    state.lastHitAt = state.elapsed;
    state.comboTimer = COMBO_WINDOW;

    var bonus = state.combo >= 3 ? (state.combo - 2) * 5 : 0;
    state.score += 10 + bonus;
    updateScoreUI();

    if (state.combo >= 3) {
      showCombo();

      if (state.combo === 3 || state.combo % 3 === 0) {
        announce('Combo x' + state.combo + '!');
      }
    } else {
      hideCombo();
    }
  }

  function missFace(entity) {
    state.lives -= 1;
    state.combo = 0;
    state.comboTimer = 0;
    hideCombo();
    renderLives();

    if (state.lives > 0) {
      announce(state.lives + (state.lives === 1 ? ' life' : ' lives') + ' left.');
    }

    if (state.lives <= 0) {
      endGame();
    }
  }

  function punchAt(x, y) {
    if (state.phase !== 'playing') {
      return;
    }

    addPunch(x, y);
    sound.playAction();

    var target = findTarget(x, y);

    if (target) {
      hitEntity(target);
    }
  }

  function update(dt) {
    if (state.phase === 'paused' || state.phase === 'menu' || state.phase === 'gameover' || state.phase === 'goodbye') {
      return;
    }

    if (state.phase === 'bomb') {
      state.bombTimer -= dt;
      updatePunches(dt);

      if (state.bombTimer <= 0) {
        endGame();
      }

      return;
    }

    state.elapsed += dt;

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;

      if (state.comboTimer <= 0) {
        state.combo = 0;
        hideCombo();
      }
    }

    updateSpawner(dt);
    updateEntities(dt);
    updatePunches(dt);
  }

  function render() {
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.fillStyle = backgroundGradient || '#0b1411';
    ctx.fillRect(0, 0, state.width, state.height);

    for (var i = 0; i < state.fruits.length; i += 1) {
      var entity = state.fruits[i];

      if (!entity.alive) {
        continue;
      }

      var height = entity.r * (entity.isBomb ? 2.5 : 2.25);
      V.draw(ctx, entity.isBomb ? 'bomb' : entity.type, entity.x, entity.y, height, 1);
    }

    for (var j = 0; j < state.punches.length; j += 1) {
      var punch = state.punches[j];
      var progress = 1 - punch.life / punch.maxLife;
      var size = PUNCH_SIZE * state.scale * (0.9 + progress * 0.25);
      var alpha = Math.max(0, punch.life / punch.maxLife);
      V.draw(ctx, 'punch', punch.x, punch.y, size, alpha);
    }
  }

  function loop(timestamp) {
    if (!state.lastFrame) {
      state.lastFrame = timestamp;
    }

    var dt = (timestamp - state.lastFrame) / 1000;
    state.lastFrame = timestamp;
    dt = Math.min(dt, 0.04);

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function eventPoint(event) {
    var rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function onPointerDown(event) {
    if (state.phase !== 'playing' || !event.isPrimary) {
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    sound.init();
    var point = eventPoint(event);
    punchAt(point.x, point.y);
    event.preventDefault();
  }

  function bindUI() {
    el.playBtn.addEventListener('click', startGame);
    el.playAgainBtn.addEventListener('click', startGame);

    el.pauseBtn.addEventListener('click', function () {
      pauseGame(false);
    });

    el.resumeBtn.addEventListener('click', resumeGame);

    el.restartBtn.addEventListener('click', function () {
      startGame();
    });

    el.pauseMenuBtn.addEventListener('click', goToMenu);
    el.gameOverMenuBtn.addEventListener('click', goToMenu);
    el.goodbyeMenuBtn.addEventListener('click', goToMenu);
    el.exitBtn.addEventListener('click', exitGame);

    soundToggles.forEach(function (button) {
      button.addEventListener('click', toggleSound);
    });

    difficultyButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        selectDifficulty(button.getAttribute('data-difficulty'));
      });
    });
  }

  function bindInput() {
    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });

    canvas.addEventListener('contextmenu', function (event) {
      event.preventDefault();
    });

    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
        if (state.phase === 'playing') {
          event.preventDefault();
          pauseGame(false);
        } else if (state.phase === 'paused') {
          event.preventDefault();
          resumeGame();
        }
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state.phase === 'playing') {
        pauseGame(true);
      }
    });

    window.addEventListener('resize', scheduleResize);
    window.addEventListener('orientationchange', function () {
      window.setTimeout(scheduleResize, 120);
    });
  }

  function init() {
    sound.init();
    resize();
    updateSoundUI();
    updateDifficultyUI();
    updateBestUI();
    updateScoreUI();
    renderLives();
    showScreen('menu', false);
    setHudVisible(false);
    sound.setHomeActive(true);
    bindUI();
    bindInput();

    el.playBtn.disabled = true;
    el.playBtn.setAttribute('aria-busy', 'true');

    V.load().then(function () {
      el.playBtn.disabled = !V.isReady();
      el.playBtn.removeAttribute('aria-busy');

      if (!V.isReady()) {
        announce('Some game images could not be loaded.');
      }
    });

    state.lastFrame = performance.now();
    requestAnimationFrame(loop);
  }

  init();
})();
