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
  loopForever: function() {
    var that = this;
    that.update(); 
    that.draw(); 
    requestAnimationFrame(function() { that.loopForever(); });
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

    // TODO more birds
    birds.push(new Bird(0,0,0,0, world, BirdAi.basic));

    var drawBird = BirdArtists.boring;
    new Engine(world, canvas, drawBird).loopForever();
  }
};

function flock(element) {
  Game.go(element);
}
