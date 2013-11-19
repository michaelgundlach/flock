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

function Point(x,y) {
  this.x = x; this.y = y;
}
Point.average = function(list) {
  var summer = function(a,b) { return a+b; }
  var sumX = list.map(function(el) { return el.x; }).reduce(summer);
  var sumY = list.map(function(el) { return el.y; }).reduce(summer);
  return new Point(sumX/list.length, sumY/list.length);
}
Point.prototype = {
  // Return the vector from this point to another point.
  vectorTo: function(other) {
    return new Vector({dx: other.x-this.x, dy:other.y-this.y});
  },

  relativeTo: function(other) { 
    return new Point(other.x - this.x, other.y - this.y);
  },

  distance: function(other) {
    return this.vectorTo(other).length;
  },

  plus: function(other) {
    return new Point(this.x+other.x, this.y+other.y);
  }
};

// An angle and a length.
function Vector(config) {
  if ('dx' in config) {
    this.dx = config.dx; this.dy = config.dy;
  }
  else if ('angle' in config) {
    this.dx = 1; this.dy = 0; // so that setting .angle works
    this.angle = config.angle;
    this.length = config.length;
  }
}
Vector.average = function(list) {
  // TODO: looks an awful lot like Point.average
  var summer = function(a,b) { return a+b; }
  var sumX = list.map(function(el) { return el.dx; }).reduce(summer);
  var sumY = list.map(function(el) { return el.dy; }).reduce(summer);
  return new Vector({dx:sumX/list.length, dy:sumY/list.length});
}
Vector.prototype = {
  // Return the angle component, in radians, of this Vector.
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

  // Set the angle of this Vector without changing its length.
  // |value| is in radians.
  set angle(value) {
    // I've got a hypotenuse.
    // I want a new hypotenuse of the same length at a new angle.

    // sine and cosine of an angle give the length of the legs of the
    // right triangle with that angle, assuming the hypotenuse length is 1.
    var rise = Math.sin(value);
    var run = Math.cos(value);
    // OK, but we actually want a hypotenuse of length (this.length), so we
    // stretch rise and run out accordingly.  E.g. if length is 2, we must
    // double our rise and run to get a hypotenuse of length 2.
    var length = this.length;
    rise *= length;
    run *= length;
    this.dy = rise;
    this.dx = run;
  },

  // Return the length of this Vector.
  get length() {
    // dx and dy are two sides of a right triangle.
    // the length of the hypotenuse is what we want.
    // The Pythogorean theorem calculates this length: a*a+b*b=c*c.
    var dx=this.dx, dy=this.dy;
    return Math.sqrt(dx*dx + dy*dy);
  },

  set length(value) {
    // Our length is the hypotenuse of a right triangle.
    // To change our length, we just stretch the hypotenuse by stretching
    // the other 2 legs.
    var stretchRatio = value / this.length;
    this.dx *= stretchRatio;
    this.dy *= stretchRatio;
  },

  minus: function(other) {
    return new Vector({dx: this.dx - other.dx, dy: this.dy - other.dy});
  }
};

//  A point with position (represented by a Point) and velocity (a Vector).
function Element(pos, vel) {
  this.pos = pos;
  this.vel = vel;
}
Element.prototype = {
  // a new Element with P&V relative to another Element.
  relativeTo: function(otherElement) {
    return new Element(
      this.pos.relativeTo(otherElement.pos),
      this.vel.minus(otherElement.vel)
    );
  },

  // Return the angle component, in radians, of this Element's velocity.
  // East=0, North=PI/2, WEST=PI, South=3/2PI.
  get angle() {
    return this.vel.angle;
  },

  // Set the angle of the Element's velocity without changing its speed.
  // |value| is in radians.
  set angle(value) {
    this.vel.angle = value;
  },

  // Return the directionless speed component of this Element's velocity.
  get speed() {
    return this.vel.length;
  },

  set speed(value) {
    this.vel.length = value;
  },

  // Move a percentage of the Element's current velocity, from 0 (no movement)
  // to 1 (one full vector's worth.)
  move: function(percent) {
    this.pos.x += this.vel.dx*percent;
    this.pos.y += this.vel.dy*percent;
  },

  // Return the distance to another Element.
  distance: function(other) {
    return other.pos.distance(this.pos);
  }
};

BirdAi = {
  dead: function(bird, secs, world) {
    // dead bird: don't move.
    console.log("Bird " + bird.number + " is dead");
  },

  basic: function(bird, secs, world) {
    bird.vel.dx = 0.2; bird.vel.dy = 0.2;
    bird.move(secs);
    console.log("Bird " + bird.number + " is sliding.");
  },

  basicFlock: function(bird, secs, world) {
    // Get an omniscient view of the average flock motion
    var velAvg = Vector.average(world.birds.map(function(b) { return b.vel; }));
    // Adjust our direction to be closer to the average
    bird.turnTowards(velAvg.angle, .01);
    bird.move(secs);
  },

  loops: function(bird, secs, world) {
    // See why they always circle counterclockwise.
    var neighbors = world.neighbors(bird, {radius: 10000});
    if (neighbors.length > 0) {
      var avgPosition = Point.average(neighbors.map(function(n) { return n.pos; }));
      var angleToThere = bird.pos.vectorTo(avgPosition).angle;
      bird.turnTowards(angleToThere, .02);
    }
    bird.move(secs);
  },

  boids: function(bird, secs, world) {
    // Birds do 3 things
    // 1. they try not to hit each other
    // 2. they try to stay near each other
    // 3. they try to face the way their comrades face

    // Implementation:
    // find the birds around me.
    // If I'm too far from any birds, turn toward the closest bird.
    // If I'm too close to any bird, turn away from the closest bird.
    // Otherwise, turn to face the way the closest bird faces.
    const RADIUS=100;
    const TOOCLOSE=20;
    const TOOFAR=40; 
    const TURN_PERCENT_PER_SEC=.4;
    var guys = world.neighbors(bird, {radius: 100});
    if (guys.length !== 0) {
      var dist = function(guy) { return bird.pos.distance(guy.pos); };
      var closest = guys.sort(function(a,b) { return dist(a) - dist(b); })[0];
      var hisHeading = bird.pos.vectorTo(closest.pos).angle;
      var newHeading;
      if (closest.distance(bird) > TOOFAR) {
        newHeading = hisHeading;
      }
      else if (closest.distance(bird) < TOOCLOSE) {
        // Turn toward directly away from him
        newHeading = hisHeading + Math.PI;
      }
      else {
        newHeading = closest.vel.angle;
      }
      bird.turnTowards(newHeading, TURN_PERCENT_PER_SEC*secs);
    }
    bird.move(secs);
  },

  littleLoops: function(bird, secs, world) {
    var neighbors = world.neighbors(bird, {radius: 100});
    if (neighbors.length > 0) {
      var avgPosition = Point.average(neighbors.map(function(n) { return n.pos; }));
      var angleToThere = bird.pos.vectorTo(avgPosition).angle;
      bird.turnTowards(angleToThere, .04);
    }
    bird.move(secs);
  },

  neighborsAvgVelocity: function(bird, secs, world) {
    var neighbors = world.neighbors(bird, {radius: 100});
    if (neighbors.length !== 0) {
      var avgVel = Vector.average(neighbors.map(function(n) { return n.vel; }));
      bird.turnTowards(avgVel.angle, .04);
      bird.vel.length = (bird.vel.length * 99 + avgVel.length) / 100;
    }
    bird.move(secs);
  }
};

//  can examine other elements' P&Vs and
//  can adjust its own P&V, but doesn't know how to draw itself.
function Bird(pos, vel, world, /* optional */ ai) {
  Element.call(this, pos, vel, world);
  this.number = ++Bird.total;
  this.ai = ai || function() {};
}
Bird.total = 0;
Bird.prototype = {
  // Step forward secs seconds.
  step: function(secs, world) {
    this.ai(this, secs, world);
  },

  // Change angle to be closer to the |heading| angle by a factor of
  // |percent|.  |percent| is between 0 (no change) to 1 (perfect alignment.)
  // We turn in the direction closest to heading.
  turnTowards: function(heading, percent) {
    if (heading < this.angle)
      heading += Math.PI*2;
    var diff = heading - this.angle;
    // If we'd have to rotate more than halfway counterclockwise,
    // rotate the difference clockwise instead.
    if (diff >= Math.PI) {
      diff = (diff - Math.PI*2);
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
  step: function(secs) {
    var that = this;
    this.birds.forEach(function(b) { 
      b.step(secs, that); 
      that.wrap(b.pos); // don't fall off the map.
    });
  },

  // Modify Point to be on the world if it has fallen off.
  wrap: function(point) {
    point.x %= this.width;
    point.y %= this.height;
    if (point.x < 0) point.x += this.width;
    if (point.y < 0) point.y += this.height;
  },

  // Return all birds within options.radius of |bird|
  neighbors: function(bird, options) {
    return this.birds.filter(function(b) { 
      return b.distance(bird) < options.radius && b !== bird;
    });
  }
};

//  controller of world, drawing, and animation.
//  safe to replace its model or its drawing methods at any time.
function Engine(world, canvas, /* optional */ drawBird) {
  this.world = world;
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.drawBird = drawBird || function() {};
}
Engine.prototype = {
  loop: function(timestamp) {
    this.update(timestamp);
    this.draw(); 
    var that = this;
    requestAnimationFrame(function(timestamp) { that.loop(timestamp) });
  },

  update: function(timestamp) {
    timestamp = timestamp || 0;
    var incrementMs = timestamp - (this.lastUpdate || timestamp);
    var incrementSecs = incrementMs / 1000;
    this.lastUpdate = timestamp;
    this.world.step(incrementSecs);
  },

  draw: function() {
    var that = this, ctx = that.ctx;
    ctx.clearRect(0,0, that.canvas.width, that.canvas.height);
    this.world.birds.forEach(function(b) { that.drawBird(b, ctx, that.canvas); });
  }
};

BirdArtists = {
  square: function(bird, ctx) {
    ctx.save();
    ctx.fillStye = 'rgb(0,0,0)';
    ctx.fillRect(bird.pos.x, bird.pos.y, 10, 10);
    ctx.restore();
  }
}

//  simulates the birds on some element
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
      var pos = new Point(r(world.width), r(world.height));
      var vel = new Vector({angle: r(Math.PI*2), length: r(50)+20});
      var b = new Bird(pos, vel, world, BirdAi.boids);
      birds.push(b);
    }

    var drawBird = BirdArtists.square;
    Game.engine = new Engine(world, canvas, drawBird);
    Game.engine.loop();
  }
};

function flock(element) {
  Game.go(element);
}
