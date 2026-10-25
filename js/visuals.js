(function () {
  'use strict';

  var SPRITE_DATA = {
    face1: {
      src: 'assets/sprite/sprite_avater.png',
      crop: [227, 66, 839, 1110],
      maxSize: 360
    },
    face2: {
      src: 'assets/sprite/sprite_avater_2.png',
      crop: [103, 57, 1070, 1200],
      maxSize: 360
    },
    face3: {
      src: 'assets/sprite/sprite_avater_3.png',
      crop: [285, 90, 726, 1116],
      maxSize: 360
    },
    face4: {
      src: 'assets/sprite/sprite_avater_4.png',
      crop: [187, 49, 837, 1192],
      maxSize: 360
    },
    face5: {
      src: 'assets/sprite/sprite_avater_5.png',
      crop: [245, 60, 731, 1277],
      maxSize: 360
    },
    bomb: {
      src: 'assets/sprite/bomb.png',
      crop: [541, 14, 730, 890],
      maxSize: 360
    },
    punch: {
      src: 'assets/sprite/punch.png',
      crop: [11, 0, 1044, 1008],
      maxSize: 280
    }
  };

  var sprites = {};
  var loadPromise = null;

  function prepare(name, image) {
    var data = SPRITE_DATA[name];
    var crop = data.crop;
    var width = crop[2];
    var height = crop[3];
    var ratio = Math.min(1, data.maxSize / Math.max(width, height));
    var targetWidth = Math.max(1, Math.round(width * ratio));
    var targetHeight = Math.max(1, Math.round(height * ratio));
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      crop[0],
      crop[1],
      width,
      height,
      0,
      0,
      targetWidth,
      targetHeight
    );

    sprites[name] = {
      canvas: canvas,
      aspect: width / height
    };
  }

  function loadSprite(name) {
    return new Promise(function (resolve) {
      var image = new Image();
      var data = SPRITE_DATA[name];

      image.decoding = 'async';
      image.onload = function () {
        prepare(name, image);
        resolve(true);
      };
      image.onerror = function () {
        resolve(false);
      };
      image.src = data.src;
    });
  }

  function load() {
    if (loadPromise) {
      return loadPromise;
    }

    loadPromise = Promise.all(
      Object.keys(SPRITE_DATA).map(function (name) {
        return loadSprite(name);
      })
    );

    return loadPromise;
  }

  function isReady() {
    return Object.keys(sprites).length === Object.keys(SPRITE_DATA).length;
  }

  function has(name) {
    return !!sprites[name];
  }

  function randomFace() {
    var faces = ['face1', 'face2', 'face3', 'face4', 'face5'];
    return faces[Math.floor(Math.random() * faces.length)];
  }

  function draw(ctx, name, x, y, height, alpha) {
    var sprite = sprites[name];

    if (!sprite) {
      return;
    }

    var width = height * sprite.aspect;

    if (alpha !== undefined && alpha < 1) {
      ctx.globalAlpha = Math.max(0, alpha);
    }

    ctx.drawImage(
      sprite.canvas,
      x - width * 0.5,
      y - height * 0.5,
      width,
      height
    );

    if (alpha !== undefined && alpha < 1) {
      ctx.globalAlpha = 1;
    }
  }

  window.FruitSlashVisuals = {
    load: load,
    isReady: isReady,
    has: has,
    randomFace: randomFace,
    draw: draw
  };
})();
