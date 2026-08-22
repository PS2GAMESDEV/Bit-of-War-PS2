## Box2D Module

The `Box2D` module provides JavaScript bindings for **Box2D v3.0**, a high-performance 2D physics engine. It allows creating and manipulating physics worlds, rigid bodies, collision shapes, joints and chain shapes.

---

### Table of Contents

1. [Global Constants](#global-constants)
2. [Class `B2World`](#class-b2world)
3. [Class `B2Body`](#class-b2body)
4. [Class `B2Shape`](#class-b2shape)
5. [Class `B2Joint`](#class-b2joint)
6. [Class `B2Chain`](#class-b2chain)
7. [Queries, Raycasts and Overlaps](#queries-raycasts-and-overlaps)
8. [Contact, Sensor and Body Events](#contact-sensor-and-body-events)
9. [Filters](#filters)
10. [Usage Example](#usage-example)

---

### Global Constants

* `Box2D.version` — String constant (`"3.0.0"`).
* `Box2D.STATIC_BODY` — Static body type (`0`).
* `Box2D.KINEMATIC_BODY` — Kinematic body type (`1`).
* `Box2D.DYNAMIC_BODY` — Dynamic body type (`2`).

---

### Global Functions

* `Box2D.createWorld(options)` — Creates a new physics world. Returns a `B2World` instance.

**World options:**
```js
{
  gravity: { x: 0.0, y: -9.8 },   // Gravity vector
  enableSleep: true,               // Allow bodies to sleep
  enableContinuous: true,          // Continuous collision detection
  restitutionThreshold: 1.0,       // Restitution velocity threshold
  hitEventThreshold: 1.0,          // Hit event velocity threshold
  maximumLinearSpeed: 200.0,       // Maximum linear speed clamp
  workerCount: 1,                  // Worker thread count
  userData: any                    // Arbitrary user data
}
```

---

### Class `B2World`

Represents the physics simulation world. Created via `Box2D.createWorld(...)`.

**Methods:**

* `step(timeStep = 1/60, subStepCount = 4)` — Advances the simulation.
* `createBody(options)` — Creates a rigid body. Returns `B2Body`.

**Body options:**
```js
{
  type: Box2D.DYNAMIC_BODY,        // STATIC_BODY, KINEMATIC_BODY, DYNAMIC_BODY
  position: { x: 0.0, y: 0.0 },
  angle: 0.0,                      // or alias: rotation
  linearVelocity: { x: 0.0, y: 0.0 },
  angularVelocity: 0.0,
  linearDamping: 0.0,
  angularDamping: 0.0,
  gravityScale: 1.0,
  fixedRotation: false,
  isBullet: false,
  enableSleep: true,
  isAwake: true,
  isEnabled: true
}
```

* `createDistanceJoint(bodyA, bodyB, options)` — Returns `B2Joint`.
* `createRevoluteJoint(bodyA, bodyB, options)` — Returns `B2Joint`.
* `createPrismaticJoint(bodyA, bodyB, options)` — Returns `B2Joint`.
* `createWeldJoint(bodyA, bodyB, options)` — Returns `B2Joint`.
* `createWheelJoint(bodyA, bodyB, options)` — Returns `B2Joint`.
* `createMotorJoint(bodyA, bodyB, options)` — Returns `B2Joint`.
* `createFilterJoint(bodyA, bodyB, options)` — Returns `B2Joint`.

**Joint common options:**
```js
{
  collideConnected: false,
  userData: any
}
```

**DistanceJoint options:**
```js
{
  anchor: { x, y },        // World anchor (auto-computes local anchors)
  anchorA: { x, y },       // Local anchor A override
  anchorB: { x, y },       // Local anchor B override
  length: number,          // Rest length (defaults to current distance)
  enableSpring: false,
  hertz: 0.0,
  dampingRatio: 0.0,
  enableLimit: false,
  minLength: 0.0,
  maxLength: 0.0,
  enableMotor: false,
  maxMotorForce: 0.0,
  motorSpeed: 0.0
}
```

**RevoluteJoint options:**
```js
{
  anchor: { x, y },
  enableSpring: false,
  hertz: 0.0,
  dampingRatio: 0.0,
  enableLimit: false,
  lowerAngle: 0.0,
  upperAngle: 0.0,
  enableMotor: false,
  motorSpeed: 0.0,
  maxMotorTorque: 0.0
}
```

**PrismaticJoint options:**
```js
{
  anchor: { x, y },
  axis: { x: 1.0, y: 0.0 },  // Local axis
  enableSpring: false,
  hertz: 0.0,
  dampingRatio: 0.0,
  enableLimit: false,
  lowerTranslation: 0.0,
  upperTranslation: 0.0,
  enableMotor: false,
  motorSpeed: 0.0,
  maxMotorForce: 0.0
}
```

**WeldJoint options:**
```js
{
  anchor: { x, y },
  linearHertz: 0.0,
  angularHertz: 0.0,
  linearDampingRatio: 0.0,
  angularDampingRatio: 0.0
}
```

**WheelJoint options:**
```js
{
  anchor: { x, y },
  axis: { x: 0.0, y: 1.0 },
  enableSpring: false,
  hertz: 0.0,
  dampingRatio: 0.0,
  enableLimit: false,
  lowerTranslation: 0.0,
  upperTranslation: 0.0,
  enableMotor: false,
  motorSpeed: 0.0,
  maxMotorTorque: 0.0
}
```

**MotorJoint options:**
```js
{
  linearVelocity: { x: 0.0, y: 0.0 },
  angularVelocity: 0.0,
  maxVelocityForce: 0.0,
  maxVelocityTorque: 0.0,
  linearHertz: 0.0,
  linearDampingRatio: 0.0,
  maxSpringForce: 0.0,
  angularHertz: 0.0,
  angularDampingRatio: 0.0,
  maxSpringTorque: 0.0
}
```

* `getGravity()` — Returns `{ x, y }`.
* `setGravity(x, y)` — Sets gravity vector.
* `enableContinuous(flag)` — Enable/disable continuous collision detection.
* `isContinuousEnabled()` — Returns `boolean`.
* `setRestitutionThreshold(value)` — Sets restitution threshold (must be >= 0).
* `getRestitutionThreshold()` — Returns `number`.
* `setMaximumLinearSpeed(value)` — Sets max linear speed (must be >= 0).
* `getMaximumLinearSpeed()` — Returns `number`.
* `destroy()` — Destroys the world and all contained resources. Returns `boolean`.
* `isValid()` — Returns `boolean`.

---

### Queries, Raycasts and Overlaps

All query methods are called on a `B2World` instance and accept an optional `filter` object (see [Filters](#filters)).

#### Raycasts

* `castRay(originX, originY, translationX, translationY, filter?)` — Casts a ray and returns the closest hit or `null`.
  * Returns: `{ point: {x,y}, normal: {x,y}, fraction: number, shape: B2Shape }`
* `raycastAll(originX, originY, translationX, translationY, filter?)` — Casts a ray and returns **all** hits.
  * Returns: `Array<{ point, normal, fraction, shape }>`

#### Overlaps

* `queryAABB(lowerX, lowerY, upperX, upperY, filter?)` — Queries shapes overlapping an AABB. Returns `B2Shape[]`.
* `overlapShape(points, radius?, filter?)` — Overlap test using a point cloud proxy. Returns `B2Shape[]`.
* `overlapCircle(x, y, radius, filter?)` — Overlap test using a circle. Returns `B2Shape[]`.
* `overlapCapsule(x1, y1, x2, y2, radius, filter?)` — Overlap test using a capsule. Returns `B2Shape[]`.
* `overlapPolygon(vertices, radius?, filter?)` — Overlap test using a polygon. Returns `B2Shape[]`.

#### Shape Casts

* `castShape(points, radius, translationX, translationY, filter?)` — Casts a shape proxy. Returns `Array<{ shape, point, normal, fraction }>`.
* `castCircle(x, y, radius, translationX, translationY, filter?)` — Casts a circle. Returns `Array<{ shape, point, normal, fraction }>`.
* `castCapsule(x1, y1, x2, y2, radius, translationX, translationY, filter?)` — Casts a capsule. Returns `Array<...>`.
* `castPolygon(vertices, radius, translationX, translationY, filter?)` — Casts a polygon. Returns `Array<...>`.

#### Mover Casts

* `castMover(x, y, x1, y1, x2, y2, radius, tx, ty, filter?)` — Sweeps a capsule mover and returns the collision fraction (`number`).
* `collideMover(x, y, x1, y1, x2, y2, radius, filter?)` — Sweeps a capsule mover and returns colliding shapes. Returns `Array<{ shape, normal: {x,y}, offset: number }>`.

---

### Contact, Sensor and Body Events

* `getContactEvents()` — Returns `{ begin: Array<{shapeA, shapeB}>, end: Array<{shapeA, shapeB}>, hit: Array<{shapeA, shapeB, point, normal, approachSpeed}> }`.
* `getSensorEvents()` — Returns `{ begin: Array<{sensor, visitor}>, end: Array<{sensor, visitor}> }`.
* `getBodyEvents()` — Returns `Array<{ body, x, y, angle, fellAsleep }>`.

* `explode(x, y, radius, falloff, impulsePerLength, maskBits?)` — Applies an explosion impulse to all bodies in range.

---

### Class `B2Body`

Represents a rigid body in the simulation. Created via `world.createBody(...)`.

**Methods:**

* `getType()` — Returns `number` (`STATIC_BODY`, `KINEMATIC_BODY`, `DYNAMIC_BODY`).
* `setType(type)` — Changes body type.
* `getPosition()` — Returns `{ x, y }`.
* `setPosition(x, y)` — Teleports body (preserves rotation).
* `getAngle()` — Returns rotation angle in radians.
* `setTransform(x, y, angle)` — Sets position and rotation.
* `getLinearVelocity()` — Returns `{ x, y }`.
* `setLinearVelocity(vx, vy)` — Sets linear velocity.
* `getAngularVelocity()` — Returns `number`.
* `setAngularVelocity(w)` — Sets angular velocity.
* `applyForce(fx, fy, px, py)` — Applies force at world point.
* `applyForceToCenter(fx, fy)` — Applies force to center of mass.
* `applyTorque(torque)` — Applies torque.
* `applyLinearImpulse(ix, iy, px, py)` — Applies impulse at world point.
* `applyLinearImpulseToCenter(ix, iy)` — Applies impulse to center.
* `applyAngularImpulse(impulse)` — Applies angular impulse.
* `getMass()` — Returns `number`.
* `getLinearDamping()` / `setLinearDamping(d)` — Damping accessors.
* `getAngularDamping()` / `setAngularDamping(d)` — Angular damping accessors.
* `getGravityScale()` / `setGravityScale(scale)` — Gravity scale accessors.
* `isAwake()` / `setAwake(flag)` — Sleep state.
* `isEnabled()` / `setEnabled(flag)` — Enable/disable simulation.
* `isFixedRotation()` / `setFixedRotation(flag)` — Lock rotation.
* `setTargetTransform(x, y, angle, duration)` — Smoothly moves body to target transform over duration.
* `getWorldPoint(x, y)` — Transforms local point to world. Returns `{ x, y }`.
* `getLocalPoint(x, y)` — Transforms world point to local. Returns `{ x, y }`.
* `getWorldCenter()` — Returns center of mass in world coordinates `{ x, y }`.
* `applyMassFromShapes()` — Recalculates mass from attached shapes.
* `computeAABB()` — Computes axis-aligned bounding box. Returns `{ lowerX, lowerY, upperX, upperY }`.
* `getShapes()` — Returns `B2Shape[]`.
* `getJoints()` — Returns `B2Joint[]`.
* `getUserData()` / `setUserData(value)` — Arbitrary user data storage.
* `destroy()` — Destroys the body and all attached shapes/joints. Returns `boolean`.
* `isValid()` — Returns `boolean`.

#### Shape Creation Methods

All shape methods accept an options object with common fields:

**Common shape options:**
```js
{
  density: 1.0,
  friction: 0.6,
  restitution: 0.0,
  rollingResistance: 0.0,
  tangentSpeed: 0.0,
  isSensor: false,
  enableSensorEvents: false,
  enableContactEvents: false,
  enableHitEvents: false,
  filter: { categoryBits: 1, maskBits: -1, groupIndex: 0 }
}
```

* `createCircleShape({ radius, center?, ...opts })` — Returns `B2Shape`.
* `createBoxShape({ halfWidth, halfHeight, center?, angle?, ...opts })` — Returns `B2Shape`.
* `createPolygonShape({ vertices: [{x,y}, ...], density?, radius?, ...opts })` — Returns `B2Shape`. Requires 3 to `B2_MAX_POLYGON_VERTICES` points.
* `createCapsuleShape({ point1: {x,y}, point2: {x,y}, radius, density?, ...opts })` — Returns `B2Shape`.
* `createSegmentShape({ point1: {x,y}, point2: {x,y}, ...opts })` — Returns `B2Shape`.
* `createChain(points, options?)` — Creates a chain shape from an array of `{x,y}` points. Returns `B2Chain`.

**Chain options:**
```js
{
  isLoop: false,
  filter: { categoryBits, maskBits, groupIndex }
}
```

---

### Class `B2Shape`

Represents a collision geometry. Created via body shape methods.

**Methods:**

* `isValid()` — Returns `boolean`.
* `destroy(updateBodyMass = true)` — Destroys the shape. Returns `boolean`.
* `getType()` — Returns string: `"circle"`, `"capsule"`, `"segment"`, `"polygon"`, `"chainSegment"`.
* `getBody()` — Returns parent `B2Body`.
* `getFriction()` / `setFriction(f)` — Friction accessors.
* `getRestitution()` / `setRestitution(r)` — Restitution accessors.
* `getDensity()` / `setDensity(d, updateBodyMass = true)` — Density accessors.
* `isSensor()` — Returns `boolean`.
* `enableSensorEvents(flag)` / `areSensorEventsEnabled()` — Sensor event toggles.
* `enableContactEvents(flag)` / `areContactEventsEnabled()` — Contact event toggles.
* `enableHitEvents(flag)` / `areHitEventsEnabled()` — Hit event toggles.
* `getFilter()` — Returns `{ categoryBits, maskBits, groupIndex }`.
* `setFilter({ categoryBits?, maskBits?, groupIndex? })` — Sets collision filter.
* `getUserData()` / `setUserData(value)` — User data accessors.
* `testPoint(x, y)` — Tests if point is inside shape. Returns `boolean`.
* `getAABB()` — Returns `{ lowerX, lowerY, upperX, upperY }`.
* `getCircle()` — Returns `{ center: {x,y}, radius }`. (circle only)
* `getCapsule()` — Returns `{ center1, center2, radius }`. (capsule only)
* `getPolygon()` — Returns `{ vertices: [{x,y}...], normals: [{x,y}...], centroid, radius, count }`. (polygon only)
* `getSegment()` — Returns `{ point1, point2 }`. (segment only)
* `getChainSegment()` — Returns `{ ghost1, segment: {point1, point2}, ghost2, chain }`. (chain segment only)
* `getClosestPoint(x, y)` — Returns closest point on shape to given point `{ x, y }`.

---

### Class `B2Joint`

Represents a constraint between two bodies. Created via `world.create*Joint(...)`.

#### General Methods

* `isValid()` — Returns `boolean`.
* `destroy(wake = true)` — Destroys the joint. Returns `boolean`.
* `getType()` — Returns string: `"distance"`, `"revolute"`, `"prismatic"`, `"weld"`, `"wheel"`, `"motor"`, `"filter"`, `"unknown"`.
* `getBodyA()` / `getBodyB()` — Returns attached `B2Body`.
* `getUserData()` / `setUserData(value)` — User data accessors.
* `setCollideConnected(flag)` / `getCollideConnected()` — Collision between joined bodies.
* `wakeBodies()` — Wakes both attached bodies.
* `getConstraintForce()` — Returns `{ x, y }`.
* `getConstraintTorque()` — Returns `number`.

#### Spring (distance, revolute, prismatic, wheel)

* `enableSpring(flag)` / `isSpringEnabled()`
* `setSpringHertz(hz)` / `getSpringHertz()`
* `setSpringDampingRatio(r)` / `getSpringDampingRatio()`

#### Limits (distance, revolute, prismatic, wheel)

* `enableLimit(flag)` / `isLimitEnabled()`
* `setLimits(lower, upper)` — Sets lower/upper limits.
* `getLimits()` — Returns `{ lower, upper }`.

#### Motor (distance, revolute, prismatic, wheel)

* `enableMotor(flag)` / `isMotorEnabled()`
* `setMotorSpeed(v)` / `getMotorSpeed()`

#### Force/Torque Motor

* `setMaxMotorForce(f)` / `getMaxMotorForce()` / `getMotorForce()` — Distance & prismatic only.
* `setMaxMotorTorque(t)` / `getMaxMotorTorque()` / `getMotorTorque()` — Revolute & wheel only.

#### Joint-specific getters

* `getAngle()` — Revolute only. Returns current angle.
* `getTranslation()` — Prismatic only.
* `getSpeed()` — Prismatic only.
* `getLength()` / `setLength(len)` / `getCurrentLength()` — Distance only.

#### Weld / Motor soft constraints

* `setLinearHertz(hz)` / `getLinearHertz()`
* `setLinearDampingRatio(r)` / `getLinearDampingRatio()`
* `setAngularHertz(hz)` / `getAngularHertz()`
* `setAngularDampingRatio(r)` / `getAngularDampingRatio()`

#### Motor joint exclusive

* `setLinearVelocity(x, y)` / `getLinearVelocity()`
* `setAngularVelocity(v)` / `getAngularVelocity()`
* `setMaxVelocityForce(f)` / `getMaxVelocityForce()`
* `setMaxVelocityTorque(t)` / `getMaxVelocityTorque()`
* `setMaxSpringForce(f)` / `getMaxSpringForce()`
* `setMaxSpringTorque(t)` / `getMaxSpringTorque()`

---

### Class `B2Chain`

Represents a chain of edge shapes. Created via `body.createChain(points, options)`.

**Methods:**

* `isValid()` — Returns `boolean`.
* `destroy()` — Destroys the chain. Returns `boolean`.
* `getBody()` — Returns parent `B2Body`.
* `getShapes()` — Returns `B2Shape[]` (the chain segments).

---

### Filters

Collision filtering uses category/mask bits and group indices.

```js
{
  categoryBits: 1,   // Bits representing this shape's categories
  maskBits: -1,      // Bits of categories this shape can collide with
  groupIndex: 0      // 0 = use bit masks, positive = always collide with same group, negative = never collide with same group
}
```

Pass filter objects to shape creation, chain creation, or query methods.

---

### Usage Example

```js
const world = Box2D.createWorld({ gravity: { x: 0, y: -9.8 } });
const font = new Font("default");

const SCALE = 30;
const SCREEN_H = 448;

const ground = world.createBody({
    type: Box2D.STATIC_BODY,
    position: { x: 320 / SCALE, y: 1 }
});
const groundHalfW = 200 / SCALE;
const groundHalfH = 0.5;
ground.createBoxShape({ halfWidth: groundHalfW, halfHeight: groundHalfH, friction: 0.5 });

const ball = world.createBody({
    type: Box2D.DYNAMIC_BODY,
    position: { x: 320 / SCALE, y: 300 / SCALE }
});
ball.createCircleShape({ radius: 0.5, friction: 0.3, restitution: 0.2 });

Screen.setParam(Screen.DEPTH_TEST_ENABLE, false);
Screen.display(() => {
    world.step(1 / 60);

    const pos = ball.getPosition();
    const px = pos.x * SCALE;
    const py = SCREEN_H - pos.y * SCALE;

    const gPos = ground.getPosition();
    const gx = (gPos.x - groundHalfW) * SCALE;
    const gy = SCREEN_H - (gPos.y + groundHalfH) * SCALE;
    const gw = groundHalfW * 2 * SCALE;
    const gh = groundHalfH * 2 * SCALE;

    Draw.rect(gx, gy, gw, gh, Color.new(80, 200, 80, 255), true);
    Draw.circle(px, py, 15, Color.new(255, 100, 100, 255), true);

    font.print(10, 30, "Y = " + pos.y.toFixed(3));
});
```
