/*

What I want to build:

A big 2D flock of flying birds all over the page.
 - including flock.js and calling flock(someElement) will draw the flock all
   over the whole element.
   - fun for extensions.

All the birds look the same.

Each bird thinks independently (emergent behavior)
Birds are 0d points in the model.

v2

2d obstacles (e.g. edge of element, "trees") separate from other birds.  birds
try to avoid them, but stop instantaneously when they hit obstacles.
  - they're always orthogonal rectangles? spheres? arbitrary shapes w/ border
    path defined relative to center?

v3
predators?

Architecture:

A game architecture.  Engine with update() and draw() methods.
Bird objects with AI strategies.

*/

//  A point in a world with position and velocity (position delta per unit time).
function Element(x, y, dx, dy, /* optional */ world) {
  this.x = x;
  this.y = y;
  this.dx = dx;
  this.dy = dy;
  this.world = world;
}

Element.prototype = {
  placeIn: function(world) {
    this.world = world;
  },

  // a new Element with P&V relative to another Element.
  relativeTo: function(otherElement) {
    return new Element(
      this.x - otherElement.x,
      this.y - otherElement.y,
      this.dx - otherElement.dx,
      this.dy - otherElement.dy,
      this.world
    );
  }
};

BirdAi = {
  dead: function(bird, ms, world) {
    // dead bird: don't move.
    console.log("Bird " + bird.number + " is dead");
  },

  basic: function(bird, ms, world) {
    // TODO figure out how far to move per ms
    bird.dx = 0.2; bird.dy = 0.2;
    bird.x += bird.dx;
    bird.y += bird.dy;
    console.log("Bird " + bird.number + " is sliding.");
  },

  basicFlock: function(bird, ms, world) {
    // Birds do 3 things
    // 1. they try not to hit each other
    // 2. they try to stay near each other
    
    // max i am allowed to change my speed
    var dMax = 2.0;
    // Get an omniscient view of the average flock motion
    var dxSum = 0, dySum = 0, numBirds = world.birds.length;
    world.birds.forEach(function(b) { dxSum += b.dx; dySum += b.dy; });
    var dxAvg = dxSum * 1.0 / numBirds, dyAvg = dySum * 1.0 / numBirds;
    // Adjust our motion to be closer to the average
    // TODO: scale for ms
    var oldDx = bird.dx, oldDy = bird.dy;
    bird.dx += dMax* (bird.dx < dxAvg ? 1 : -1);
    bird.dy += dMax* (bird.dy < dyAvg ? 1 : -1);
    console.log("Bird " + bird.number + "(" + oldDx + "," + oldDy + ") -> (" +
      bird.dx + "," + bird.dy + ")");

    if (bird.x < 0 || bird.x > world.width)
      bird.dx *= -1;
    if (bird.y < 0 || bird.y > world.height)
      bird.dy *= -1;

    bird.x += bird.dx*5;
    bird.y += bird.dy*5;

  }
};

//  can examine other elements' P&Vs and
//  can adjust its own P&V, but doesn't know how to draw itself.
function Bird(x, y, dx, dy, /* optional */ world, /* optional */ ai) {
  Element.call(this, x, y, dx, dy, world);
  this.number = ++Bird.total;
  this.ai = ai || function() {};
}
Bird.total = 0;
Bird.prototype = {
  // Step forward ms milliseconds.
  step: function(ms, world) {
    this.ai(this, ms, world);
  },
  __proto__: Element.prototype
};


//  a model of the state of all elements.
//  safe to add/remove birds or change dimensions at any time.
function World(width, height, birds) {
  this.width = width;
  this.height = height;
  this.birds = birds;
}
World.prototype = {
  step: function(ms) {
    var that = this;
    this.birds.forEach(function(b) { b.step(ms, that); });
  }
};

//  controller of world and drawing.
//  safe to replace its model or its drawing methods at any time.
function Engine(world, canvas, /* optional */ drawBird) {
  this.world = world;
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.drawBird = drawBird || function(bird, ctx) {};
}
Engine.prototype = {
  loopForever: function(n) {
    if (n === undefined) n = -1;
    if (n === 0) return;
    console.log("LOOP " + n);
    var that = this;
    that.update(); 
    that.draw(); 
    requestAnimationFrame(function() { that.loopForever(n-1); });
  },

  update: function() {
    this.world.step();
  },

  draw: function() {
    var that = this, ctx = that.ctx;
    ctx.clearRect(0,0, that.canvas.width, that.canvas.height);
    this.world.birds.forEach(function(b) { that.drawBird(b, ctx); });
  }
};

//  simulates the birds on some element
function Game() {
};

BirdArtists = {
  boring: function(bird, ctx) {
    ctx.save();
    ctx.fillStye = 'rgb(0,0,0)';
    ctx.fillRect(bird.x, bird.y, 10, 10);
    ctx.restore();
  }
}

Game = {
  // TODO: messy_methods_to_get_parameters,_add/remove_birds,_etc
  go: function(element) {
    // In v2, go accepts an element that we shadow with a canvas, defaults to <body>
    // In v1, go accepts a canvas.
    var canvas = element;
    var birds = [];
    var world = new World(canvas.width, canvas.height, birds);

    var r = function(n) {
      return parseInt(Math.random() * n);
    };
    // TODO stop hardcoding
    for (var i = 0; i < 100; i++) {
      birds.push(
        new Bird(r(world.width),r(world.height),r(10)-5,r(10)-5,
                 world, BirdAi.basicFlock));
    }

    var drawBird = BirdArtists.boring;
    new Engine(world, canvas, drawBird).loopForever();
  }
};

function flock(element) {
  Game.go(element);
}
