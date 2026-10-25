(function () {
  'use strict';

  var SOUND_KEY = 'fruitSlash.sound';
  var enabled = loadEnabled();
  var initialized = false;
  var homeActive = false;
  var unlockBound = false;
  var home = null;
  var action = null;
  var gameOver = null;

  function loadEnabled() {
    try {
      return localStorage.getItem(SOUND_KEY) !== 'off';
    } catch (error) {
      return true;
    }
  }

  function saveEnabled() {
    try {
      localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off');
    } catch (error) {
      return;
    }
  }

  function makeAudio(src, loop, volume) {
    var audio = new Audio();
    audio.src = src;
    audio.preload = 'auto';
    audio.loop = loop;
    audio.volume = volume;
    return audio;
  }

  function attemptPlay(audio) {
    if (!audio) {
      return;
    }

    try {
      var result = audio.play();
      if (result && typeof result.catch === 'function') {
        result.catch(function () {});
      }
    } catch (error) {
      return;
    }
  }

  function playHome() {
    if (!initialized || !enabled || !homeActive || !home) {
      return;
    }
    attemptPlay(home);
  }

  function pauseHome() {
    if (home) {
      home.pause();
    }
  }

  function bindUnlock() {
    if (unlockBound) {
      return;
    }

    unlockBound = true;

    var unlock = function () {
      if (enabled && homeActive) {
        playHome();
      }
    };

    document.addEventListener('pointerdown', unlock, { capture: true, once: true });
    document.addEventListener('keydown', unlock, { capture: true, once: true });
  }

  function init() {
    if (initialized) {
      return;
    }

    initialized = true;
    home = makeAudio('assets/sound/Home_Screen.MP3', true, 0.34);
    action = makeAudio('assets/sound/Action_Sound.MP3', false, 0.68);
    gameOver = makeAudio('assets/sound/Game_Over.MP3', false, 0.72);
    bindUnlock();
  }

  function setEnabled(value) {
    init();
    enabled = !!value;
    saveEnabled();

    if (enabled) {
      if (homeActive) {
        playHome();
      }
      return;
    }

    pauseHome();
    if (action) {
      action.pause();
    }
    if (gameOver) {
      gameOver.pause();
    }
  }

  function setHomeActive(active) {
    init();
    homeActive = !!active;

    if (homeActive) {
      playHome();
    } else {
      pauseHome();
    }
  }

  function playAction() {
    init();

    if (!enabled || !action) {
      return;
    }

    try {
      action.currentTime = 0;
    } catch (error) {
      return;
    }

    attemptPlay(action);
  }

  function playGameOver() {
    init();

    if (!enabled || !gameOver) {
      return;
    }

    try {
      gameOver.currentTime = 0;
    } catch (error) {
      return;
    }

    attemptPlay(gameOver);
  }

  function stopGameOver() {
    if (!gameOver) {
      return;
    }

    gameOver.pause();

    try {
      gameOver.currentTime = 0;
    } catch (error) {
      return;
    }
  }

  function isEnabled() {
    return enabled;
  }

  function isHomePlaying() {
    return !!home && !home.paused && !home.ended;
  }

  function isActionPlaying() {
    return !!action && !action.paused && !action.ended;
  }

  function isGameOverPlaying() {
    return !!gameOver && !gameOver.paused && !gameOver.ended;
  }

  window.FruitSlashSound = {
    init: init,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    setHomeActive: setHomeActive,
    playAction: playAction,
    playGameOver: playGameOver,
    stopGameOver: stopGameOver,
    isHomePlaying: isHomePlaying,
    isActionPlaying: isActionPlaying,
    isGameOverPlaying: isGameOverPlaying
  };
})();
