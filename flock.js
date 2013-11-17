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
  },

  // Return the angle component, in radians, of this Element's velocity.
  // East=0, North=PI/2, WEST=PI, South=3/2PI.
  get angle() {
    // dx and dy are two sides of a right triangle.
    // arctangent gives you the angle of the hypotenuse.
    var angle = Math.atan2(this.dy, this.dx);

    // atan2 returns 0..PI for north quadrants and -0..-PI for
    // south quadrants.
    if (angle < 0)
      angle += Math.PI*2;
    return angle;
  },

  // Set the angle of the Element's velocity without changing its speed.
  // |value| is in radians.
  set angle(value) {
    // I've got a hypotenuse.
    // I want a new hypotenuse of the same length at a new angle.

    // sine and cosine of an angle give the length of the legs of the
    // right triangle with that angle, assuming the hypotenuse length is 1.
    var rise = Math.sin(value);
    var run = Math.cos(value);
    // OK, but we actually want a hypotenuse of length (this.speed), so we
    // stretch rise and run out accordingly.  E.g. if speed is 2, we must
    // double our rise and run to get a hypotenuse of length 2.
    var speed = this.speed;
    rise *= speed;
    run *= speed;
    this.dy = rise;
    this.dx = run;
  },

  // Return the directionless speed component of this Element's velocity.
  get speed() {
    // dx and dy are two sides of a right triangle.
    // the length of the hypotenuse is the speed.
    // The Pythogorean theorem calculates this length: a*a+b*b=c*c.
    var dx=this.dx, dy=this.dy;
    return Math.sqrt(dx*dx + dy*dy);
  },

  set speed(value) {
    // Our velocity is the hypotenuse of a right triangle.
    // To change our speed, we just stretch the hypotenuse by stretching
    // the other 2 legs.
    var stretchRatio = value / this.speed;
    this.dx *= stretchRatio;
    this.dy *= stretchRatio;
  },

  // Move a percentage of the Element's current velocity, from 0 (no movement)
  // to 1 (one full vector's worth.)
  move: function(percent) {
    this.x += this.dx*percent;
    this.y += this.dy*percent;

    // If you fell off the world, wrap.
    if (this.world) {
      this.x %= this.world.width;
      this.y %= this.world.height;
      if (this.x < 0) this.x += this.world.width;
      if (this.y < 0) this.y += this.world.height;
    }
  },

  // Return the distance to another Element.
  distance: function(other) {
    // The two points can be viewed as two ends of the hypotenuse of a
    // right triangle.  See .speed() above for how to get its length.
    var xLength = other.x - this.x, yLength = other.y - this.y;
    return Math.sqrt(xLength*xLength + yLength*yLength);
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
    var dxSum = 0.0, dySum = 0.0, numBirds = world.birds.length;
    world.birds.forEach(function(b) { dxSum += b.dx; dySum += b.dy; });
    var dxAvg = dxSum / numBirds, dyAvg = dySum / numBirds;
    // Adjust our direction to be closer to the average
    var angleAvg = new Element(0,0, dxAvg,dyAvg).angle;
    bird.turnTowards(angleAvg, .01);
    var angleDiff = angleAvg + bird.angle;
    bird.move(1);
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

  // Change angle to be closer to the |heading| angle by a factor of
  // |percent|.  |percent| is between 0 (no change) to 1 (perfect alignment.)
  // We turn in the direction closest to heading.
  turnTowards: function(heading, percent) {
    var diff = heading - this.angle;
    // If we'd have to rotate more than halfway counterclockwise,
    // rotate the difference clockwise instead.
    if (diff > Math.PI) {
      diff = (Math.PI*2 - diff) * -1;
    }
    this.angle += diff * percent;
    return this;
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
  this.drawBird = drawBird || function() {};
}
Engine.prototype = {
  loopForever: function(n) {
    if (n === undefined) n = -1;
    if (n === 0) return;
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
    this.world.birds.forEach(function(b) { that.drawBird(b, ctx, that.canvas); });
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
      var b = new Bird(r(world.width),r(world.height),1,1, world, BirdAi.basicFlock);
      b.angle = r(Math.PI*2);
      b.speed = r(1) + 2;
      birds.push(b);
    }

    var drawBird = BirdArtists.boring;
    Game.engine = new Engine(world, canvas, drawBird);
    Game.engine.loopForever();
  }
};

function flock(element) {
  Game.go(element);
}
