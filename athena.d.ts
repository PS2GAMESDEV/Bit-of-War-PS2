declare namespace console {

    function log(...args: any[]): void;

    function warn(...args: any[]): void;

    function error(...args: any[]): void;
}

declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): any;

declare function setInterval(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): any;

declare function clearTimeout(handle?: any): void;

declare function clearInterval(handle?: any): void;

declare function setImmediate(handler: (...args: any[]) => void, ...args: any[]): any;

declare function clearImmediate(handle?: any): void;

declare namespace std {
    interface ReloadOptions {

        returnTo?: string;
    }

    interface LastRun {

        script: string;

        status: "finished" | "error" | "exited" | "reloaded";

        error?: string;

        output: string;
    }

    function reload(script: string, options?: ReloadOptions): never;

    function lastRun(): LastRun | null;

    function gc(): void;

    function loadFile(path: string): string | null;

    function loadScript(path: string): any;
}

declare namespace Mutex {

    interface Handle {
        readonly __brand: 'Mutex';
    }

    function new(): Handle;

    function lock(mutex: Handle): number;

    function unlock(mutex: Handle): number;

    function destroy(mutex: Handle): void;
}

declare namespace Thread {

    interface Handle {
        readonly __brand: 'Thread';
    }

    interface TaskInfo {

        id: number;

        name: string;

        status: number;

        stack: number;
    }

    function new(
        callback: () => void,
        name?: string,
        stackSize?: number,
        priority?: number
    ): Handle;

    function start(thread: Handle): number;

    function stop(thread: Handle): number;

    function getId(thread: Handle): number;

    function getName(thread: Handle): string;

    function setName(thread: Handle, name: string): void;

    function getStatus(thread: Handle): number;

    function destroy(thread: Handle): void;

    function list(): TaskInfo[];

    function kill(id: number): number;

    interface ReadFileOptions {

        text?: boolean;

        maxBytes?: number;
    }

    interface ReadFileStatus<T> extends AthenaJobStatus<T> {
        bytesDone: number;
        bytesTotal: number;
    }

    function readFileAsync(path: string, options: ReadFileOptions & { text: true }):
        AthenaJob<string, ReadFileStatus<string>>;
    function readFileAsync(path: string, options?: ReadFileOptions):
        AthenaJob<ArrayBuffer, ReadFileStatus<ArrayBuffer>>;
}

interface AthenaJob<T, Status extends AthenaJobStatus<T> = AthenaJobStatus<T>> extends PromiseLike<T> {

    poll(): Status;

    wait(timeoutMs?: number): Status;

    cancel(): void;
}

interface AthenaJobStatus<T> {
    state: 'running' | 'done' | 'failed' | 'cancelled';

    result?: T;

    error?: Error;
}

declare namespace Archive {

    interface Handle {
        readonly __brand: 'Archive';
    }

    type Format = 'zip' | 'tar' | 'gz';

    type Bytes = ArrayBuffer | Uint8Array | Int8Array | Uint8ClampedArray | Uint16Array | Int16Array
        | Uint32Array | Int32Array | Float32Array | Float64Array;

    type ErrorCode =
        | 'INVALID_ARGUMENT'
        | 'IO'
        | 'BAD_FORMAT'
        | 'NO_MEMORY'
        | 'UNSUPPORTED'

        | 'UNSAFE_PATH'

        | 'TOO_LARGE'
        | 'NOT_FOUND'

        | 'EXISTS'
        | 'ENCRYPTED'

        | 'ABORTED'

        | 'CLOSED'

        | 'BUSY';

    interface Error extends globalThis.Error {
        code: ErrorCode;
    }

    interface Entry {

        name: string;

        size: number;

        compressedSize: number;

        mtime: number;
        dir: boolean;

        encrypted: boolean;
    }

    interface ReadOptions {

        maxSize?: number;
    }

    interface ExtractOptions {

        overwrite?: boolean;

        maxSize?: number;

        filter?: (entry: Entry) => boolean;

        onProgress?: (entry: Entry, index: number, count: number) => boolean | void;
    }

    function open(path: string): Handle;

    function close(archive: Handle): void;

    function type(archive: Handle): Format;

    function list(archive: Handle): Entry[];

    function read(archive: Handle, name?: string, options?: ReadOptions): ArrayBuffer;

    function extractAll(archive: Handle, destination?: string, options?: ExtractOptions): number;

    function extract(path: string, destination?: string, options?: ExtractOptions): number;

    function untar(path: string, destination?: string, options?: ExtractOptions): number;

    function gunzip(data: Bytes, options?: ReadOptions): ArrayBuffer;

    function gzip(data: Bytes, options?: { level?: number }): ArrayBuffer;

    interface Job<T> extends AthenaJob<T, JobStatus<T>> {
        readonly __brand: 'ArchiveJob';
    }

    type JobState = 'running' | 'done' | 'failed' | 'cancelled';

    interface JobStatus<T> {
        state: JobState;

        entry: string;
        entriesDone: number;

        entriesTotal: number;
        bytesDone: number;

        bytesTotal: number;

        result?: T;

        error?: Error;
    }

    interface AsyncExtractOptions {

        overwrite?: boolean;

        maxSize?: number;

        include?: string[];
    }

    function extractAsync(path: string, destination?: string, options?: AsyncExtractOptions): Job<number>;

    function readAsync(path: string, name?: string, options?: ReadOptions): Job<ArrayBuffer>;

    function poll<T>(job: Job<T>): JobStatus<T>;

    function wait<T>(job: Job<T>, timeoutMs?: number): JobStatus<T>;

    function cancel(job: Job<unknown>): void;
}

declare namespace Box2D {

    const version: string;

    const STATIC_BODY: 0;
    const KINEMATIC_BODY: 1;
    const DYNAMIC_BODY: 2;

    const MAX_POLYGON_VERTICES: number;

    const MAX_WORLDS: number;

    function setMemoryLimit(bytes: number): void;
    function getMemoryLimit(): number;

    function getMemoryUsage(): number;

    function solvePlanes(dx: number, dy: number, planes: CollisionPlane[]): { x: number; y: number; iterations: number };

    function clipVector(vx: number, vy: number, planes: CollisionPlane[]): Vec2;

    interface CollisionPlane {
        normal: Vec2;
        offset: number;

        pushLimit?: number;

        clipVelocity?: boolean;

        push?: number;
    }

    type BodyType = 0 | 1 | 2;
    type ShapeType = 'circle' | 'capsule' | 'segment' | 'polygon' | 'chainSegment';
    type JointType = 'distance' | 'filter' | 'motor' | 'prismatic' | 'revolute' | 'weld' | 'wheel';

    interface Vec2 {
        x: number;
        y: number;
    }

    interface AABB {
        lowerX: number;
        lowerY: number;
        upperX: number;
        upperY: number;
    }

    type Bits = number | bigint;

    interface Filter {

        categoryBits?: Bits;

        maskBits?: Bits;

        groupIndex?: number;
    }

    interface QueryFilter {

        categoryBits?: Bits;

        maskBits?: Bits;
    }

    interface WorldOptions {

        gravity?: Vec2;

        enableSleep?: boolean;

        enableContinuous?: boolean;

        restitutionThreshold?: number;

        hitEventThreshold?: number;

        maximumLinearSpeed?: number;

        workerCount?: number;

        contactHertz?: number;

        contactDampingRatio?: number;

        contactSpeed?: number;

        enableContactSoftening?: boolean;
        userData?: any;
    }

    interface BodyOptions {

        type?: BodyType;
        position?: Vec2;

        angle?: number;
        rotation?: number;
        linearVelocity?: Vec2;
        angularVelocity?: number;

        linearDamping?: number;

        angularDamping?: number;

        gravityScale?: number;

        sleepThreshold?: number;

        fixedRotation?: boolean;

        lockLinearX?: boolean;

        lockLinearY?: boolean;

        isBullet?: boolean;
        enableSleep?: boolean;
        isAwake?: boolean;
        isEnabled?: boolean;

        allowFastRotation?: boolean;

        enableContactRecycling?: boolean;

        name?: string;
        userData?: any;
    }

    interface SurfaceMaterial {

        friction?: number;

        restitution?: number;

        rollingResistance?: number;

        tangentSpeed?: number;

        userMaterialId?: Bits;

        customColor?: number;
    }

    interface MassData {
        mass: number;
        center: Vec2;
        rotationalInertia: number;
    }

    interface ShapeOptions extends SurfaceMaterial {

        density?: number;

        isSensor?: boolean;

        enableSensorEvents?: boolean;

        enableContactEvents?: boolean;

        enableHitEvents?: boolean;
        filter?: Filter;
        userData?: any;
    }

    interface CircleOptions extends ShapeOptions {

        radius: number;

        center?: Vec2;
    }

    interface BoxOptions extends ShapeOptions {

        halfWidth: number;

        halfHeight: number;

        center?: Vec2;

        angle?: number;
    }

    interface PolygonOptions extends ShapeOptions {

        vertices: Vec2[];

        radius?: number;
    }

    interface CapsuleOptions extends ShapeOptions {

        point1: Vec2;
        point2: Vec2;

        radius: number;
    }

    interface SegmentOptions extends ShapeOptions {

        point1: Vec2;
        point2: Vec2;
    }

    interface ChainOptions extends SurfaceMaterial {

        isLoop?: boolean;
        enableSensorEvents?: boolean;
        filter?: Filter;
        userData?: any;
    }

    interface JointOptions {

        collideConnected?: boolean;

        forceThreshold?: number;

        torqueThreshold?: number;

        constraintHertz?: number;

        constraintDampingRatio?: number;
        userData?: any;
    }

    interface AnchorOptions extends JointOptions {
        anchor?: Vec2;
    }

    interface SpringOptions {
        enableSpring?: boolean;

        hertz?: number;

        dampingRatio?: number;
    }

    interface DistanceJointOptions extends JointOptions, SpringOptions {

        anchor?: Vec2;

        anchorA?: Vec2;

        anchorB?: Vec2;

        length?: number;
        enableLimit?: boolean;
        minLength?: number;
        maxLength?: number;
        enableMotor?: boolean;
        maxMotorForce?: number;
        motorSpeed?: number;

        lowerSpringForce?: number;
        upperSpringForce?: number;
    }

    interface RevoluteJointOptions extends AnchorOptions, SpringOptions {
        enableLimit?: boolean;

        lowerAngle?: number;
        upperAngle?: number;
        enableMotor?: boolean;
        motorSpeed?: number;
        maxMotorTorque?: number;

        targetAngle?: number;
    }

    interface PrismaticJointOptions extends AnchorOptions, SpringOptions {

        axis?: Vec2;
        enableLimit?: boolean;
        lowerTranslation?: number;
        upperTranslation?: number;
        enableMotor?: boolean;
        motorSpeed?: number;
        maxMotorForce?: number;

        targetTranslation?: number;
    }

    interface WeldJointOptions extends AnchorOptions {

        linearHertz?: number;
        angularHertz?: number;
        linearDampingRatio?: number;
        angularDampingRatio?: number;
    }

    interface WheelJointOptions extends AnchorOptions, SpringOptions {

        axis?: Vec2;
        enableLimit?: boolean;
        lowerTranslation?: number;
        upperTranslation?: number;
        enableMotor?: boolean;
        motorSpeed?: number;
        maxMotorTorque?: number;
    }

    interface MotorJointOptions extends JointOptions {
        linearVelocity?: Vec2;
        angularVelocity?: number;
        maxVelocityForce?: number;
        maxVelocityTorque?: number;
        linearHertz?: number;
        linearDampingRatio?: number;
        maxSpringForce?: number;
        angularHertz?: number;
        angularDampingRatio?: number;
        maxSpringTorque?: number;
    }

    interface Contact {
        shapeA: Shape;
        shapeB: Shape;

        normal: Vec2;

        points: { point: Vec2; separation: number; normalImpulse: number }[];
    }

    interface CastHit {
        shape: Shape;
        point: Vec2;
        normal: Vec2;

        fraction: number;
    }

    interface MoverPlane {
        shape: Shape;

        normal: Vec2;

        offset: number;

        point: Vec2;
    }

    interface ContactEvents {
        begin: { shapeA: Shape; shapeB: Shape }[];
        end: { shapeA: Shape | null; shapeB: Shape | null }[];
        hit: { shapeA: Shape; shapeB: Shape; point: Vec2; normal: Vec2; approachSpeed: number }[];
    }

    interface SensorEvents {
        begin: { sensor: Shape; visitor: Shape }[];
        end: { sensor: Shape | null; visitor: Shape | null }[];
    }

    interface BodyMoveEvent {
        body: Body;
        x: number;
        y: number;
        angle: number;

        fellAsleep: boolean;
    }

    interface Counters {
        bodyCount: number;
        shapeCount: number;
        contactCount: number;
        jointCount: number;
        islandCount: number;
        stackUsed: number;
        staticTreeHeight: number;
        treeHeight: number;
        taskCount: number;
        awakeContactCount: number;
        recycledContactCount: number;

        byteCount: number;

        colorCounts: number[];
    }

    interface World {

        step(timeStep?: number, subStepCount?: number): void;
        createBody(options?: BodyOptions): Body;

        createDistanceJoint(bodyA: Body, bodyB: Body, options?: DistanceJointOptions): Joint;
        createRevoluteJoint(bodyA: Body, bodyB: Body, options?: RevoluteJointOptions): Joint;
        createPrismaticJoint(bodyA: Body, bodyB: Body, options?: PrismaticJointOptions): Joint;
        createWeldJoint(bodyA: Body, bodyB: Body, options?: WeldJointOptions): Joint;
        createWheelJoint(bodyA: Body, bodyB: Body, options?: WheelJointOptions): Joint;
        createMotorJoint(bodyA: Body, bodyB: Body, options?: MotorJointOptions): Joint;

        createFilterJoint(bodyA: Body, bodyB: Body, options?: JointOptions): Joint;

        getGravity(): Vec2;
        setGravity(x: number, y: number): void;
        enableContinuous(flag: boolean): void;
        isContinuousEnabled(): boolean;
        enableSleeping(flag: boolean): void;
        isSleepingEnabled(): boolean;
        setRestitutionThreshold(value: number): void;
        getRestitutionThreshold(): number;
        setHitEventThreshold(value: number): void;
        getHitEventThreshold(): number;

        setMaximumLinearSpeed(value: number): void;
        getMaximumLinearSpeed(): number;
        getAwakeBodyCount(): number;

        setContactTuning(hertz: number, dampingRatio: number, pushSpeed: number): void;

        setContactRecycleDistance(distance: number): void;
        getContactRecycleDistance(): number;

        enableWarmStarting(flag: boolean): void;
        isWarmStartingEnabled(): boolean;

        enableSpeculative(flag: boolean): void;
        getCounters(): Counters;

        rebuildStaticTree(): void;
        getUserData(): any;
        setUserData(value: any): void;

        castRay(originX: number, originY: number, translationX: number, translationY: number,
            filter?: QueryFilter): CastHit | null;

        raycastAll(originX: number, originY: number, translationX: number, translationY: number,
            filter?: QueryFilter): CastHit[];

        queryAABB(lowerX: number, lowerY: number, upperX: number, upperY: number, filter?: QueryFilter): Shape[];

        overlapShape(points: Vec2[], radius?: number, filter?: QueryFilter): Shape[];
        overlapShape(points: Vec2[], filter?: QueryFilter): Shape[];
        overlapPolygon(vertices: Vec2[], radius?: number, filter?: QueryFilter): Shape[];
        overlapPolygon(vertices: Vec2[], filter?: QueryFilter): Shape[];
        overlapCircle(x: number, y: number, radius: number, filter?: QueryFilter): Shape[];
        overlapCapsule(x1: number, y1: number, x2: number, y2: number, radius: number, filter?: QueryFilter): Shape[];

        castShape(points: Vec2[], radius: number, translationX: number, translationY: number,
            filter?: QueryFilter): CastHit[];
        castPolygon(vertices: Vec2[], radius: number, translationX: number, translationY: number,
            filter?: QueryFilter): CastHit[];
        castCircle(x: number, y: number, radius: number, translationX: number, translationY: number,
            filter?: QueryFilter): CastHit[];
        castCapsule(x1: number, y1: number, x2: number, y2: number, radius: number,
            translationX: number, translationY: number, filter?: QueryFilter): CastHit[];

        castMover(x: number, y: number, x1: number, y1: number, x2: number, y2: number, radius: number,
            translationX: number, translationY: number, filter?: QueryFilter): number;

        collideMover(x: number, y: number, x1: number, y1: number, x2: number, y2: number, radius: number,
            filter?: QueryFilter): MoverPlane[];

        getContactEvents(): ContactEvents;
        getSensorEvents(): SensorEvents;

        getBodyEvents(): BodyMoveEvent[];

        getJointEvents(): { joint: Joint }[];

        readTransforms(bodies: Body[], out: Float32Array): number;

        getProfile(): {
            step: number; pairs: number; collide: number; solve: number; solverSetup: number;
            constraints: number; prepareConstraints: number; integrateVelocities: number; warmStart: number;
            solveImpulses: number; integratePositions: number; relaxImpulses: number; applyRestitution: number;
            storeImpulses: number; splitIslands: number; transforms: number; sensorHits: number;
            jointEvents: number; hitEvents: number; refit: number; bullets: number; sleepIslands: number;
            sensors: number;
        };

        snapshot(): ArrayBuffer;

        restore(image: ArrayBuffer | ArrayBufferView): true;

        explode(x: number, y: number, radius: number, falloff: number, impulsePerLength: number, maskBits?: Bits): void;

        destroy(): boolean;
        isValid(): boolean;
    }

    interface Body {
        readonly world: World;

        getType(): BodyType;
        setType(type: BodyType): void;
        getPosition(): Vec2;

        setPosition(x: number, y: number): void;

        getAngle(): number;

        getTransform(): { x: number; y: number; angle: number };
        setTransform(x: number, y: number, angle: number): void;

        setTargetTransform(x: number, y: number, angle: number, duration: number): void;
        getLinearVelocity(): Vec2;
        setLinearVelocity(vx: number, vy: number): void;
        getAngularVelocity(): number;
        setAngularVelocity(w: number): void;

        applyForce(fx: number, fy: number, px: number, py: number, wake?: boolean): void;
        applyForceToCenter(fx: number, fy: number, wake?: boolean): void;
        applyTorque(torque: number, wake?: boolean): void;
        applyLinearImpulse(ix: number, iy: number, px: number, py: number, wake?: boolean): void;
        applyLinearImpulseToCenter(ix: number, iy: number, wake?: boolean): void;
        applyAngularImpulse(impulse: number, wake?: boolean): void;

        getMass(): number;
        getLinearDamping(): number;
        setLinearDamping(damping: number): void;
        getAngularDamping(): number;
        setAngularDamping(damping: number): void;
        getGravityScale(): number;
        setGravityScale(scale: number): void;
        isAwake(): boolean;
        setAwake(flag: boolean): void;
        isEnabled(): boolean;
        setEnabled(flag: boolean): void;
        isFixedRotation(): boolean;
        setFixedRotation(flag: boolean): void;
        isBullet(): boolean;
        setBullet(flag: boolean): void;

        getWorldPoint(x: number, y: number): Vec2;

        getLocalPoint(x: number, y: number): Vec2;

        getWorldVector(x: number, y: number): Vec2;

        getLocalVector(x: number, y: number): Vec2;

        getWorldPointVelocity(x: number, y: number): Vec2;

        getLocalPointVelocity(x: number, y: number): Vec2;

        getWorldCenter(): Vec2;

        getLocalCenter(): Vec2;

        getRotationalInertia(): number;
        getMassData(): MassData;

        setMassData(data: Partial<MassData>): void;

        applyMassFromShapes(): void;
        computeAABB(): AABB;

        clearForces(): void;

        wakeTouching(): void;

        enableSleep(flag: boolean): void;
        isSleepEnabled(): boolean;

        setSleepThreshold(threshold: number): void;
        getSleepThreshold(): number;

        enableContactRecycling(flag: boolean): void;
        isContactRecyclingEnabled(): boolean;

        enableContactEvents(flag: boolean): void;

        enableHitEvents(flag: boolean): void;

        setName(name: string): void;
        getName(): string;

        createCircleShape(options: CircleOptions): Shape;
        createBoxShape(options: BoxOptions): Shape;
        createPolygonShape(options: PolygonOptions): Shape;
        createCapsuleShape(options: CapsuleOptions): Shape;
        createSegmentShape(options: SegmentOptions): Shape;

        createChain(points: Vec2[], options?: ChainOptions): Chain;

        getShapes(): Shape[];
        getJoints(): Joint[];

        getContacts(): Contact[];
        getMotionLocks(): { linearX: boolean; linearY: boolean; angularZ: boolean };

        setMotionLocks(locks: { linearX?: boolean; linearY?: boolean; angularZ?: boolean }): void;

        getUserData(): any;
        setUserData(value: any): void;

        destroy(): boolean;
        isValid(): boolean;
    }

    interface Shape {
        readonly world: World;

        getType(): ShapeType;
        getBody(): Body;
        getFriction(): number;
        setFriction(friction: number): void;
        getRestitution(): number;
        setRestitution(restitution: number): void;
        getDensity(): number;

        setDensity(density: number, updateBodyMass?: boolean): void;
        isSensor(): boolean;
        enableSensorEvents(flag: boolean): void;
        areSensorEventsEnabled(): boolean;
        enableContactEvents(flag: boolean): void;
        areContactEventsEnabled(): boolean;
        enableHitEvents(flag: boolean): void;
        areHitEventsEnabled(): boolean;
        getFilter(): { categoryBits: Bits; maskBits: Bits; groupIndex: number };

        setFilter(filter: Filter): void;
        getUserData(): any;
        setUserData(value: any): void;

        testPoint(x: number, y: number): boolean;
        getClosestPoint(x: number, y: number): Vec2;

        getAABB(): AABB;

        getCircle(): { center: Vec2; radius: number };
        getCapsule(): { center1: Vec2; center2: Vec2; radius: number };
        getPolygon(): { vertices: Vec2[]; normals: Vec2[]; centroid: Vec2; radius: number; count: number };
        getSegment(): { point1: Vec2; point2: Vec2 };
        getChainSegment(): { ghost1: Vec2; segment: { point1: Vec2; point2: Vec2 }; ghost2: Vec2; chain: Chain };

        getContacts(): Contact[];

        getSensorOverlaps(): Shape[];

        setCircle(circle: { radius: number; center?: Vec2 }): void;
        setBox(box: { halfWidth: number; halfHeight: number; center?: Vec2; angle?: number }): void;
        setPolygon(polygon: { vertices: Vec2[]; radius?: number }): void;
        setCapsule(capsule: { point1: Vec2; point2: Vec2; radius: number }): void;
        setSegment(segment: { point1: Vec2; point2: Vec2 }): void;
        getSurfaceMaterial(): Required<SurfaceMaterial>;

        setSurfaceMaterial(material: SurfaceMaterial): void;

        computeMassData(): MassData;

        rayCast(originX: number, originY: number, translationX: number, translationY: number): CastHit | null;

        applyWind(windX: number, windY: number, drag: number, lift: number, wake?: boolean): void;

        destroy(updateBodyMass?: boolean): boolean;
        isValid(): boolean;
    }

    interface Chain {
        readonly world: World;

        getBody(): Body;

        getShapes(): Shape[];
        getUserData(): any;
        setUserData(value: any): void;
        destroy(): boolean;
        isValid(): boolean;
    }

    interface Joint {
        readonly world: World;

        getType(): JointType;
        getBodyA(): Body;
        getBodyB(): Body;
        getUserData(): any;
        setUserData(value: any): void;
        setCollideConnected(flag: boolean): void;
        getCollideConnected(): boolean;
        wakeBodies(): void;

        setForceThreshold(force: number): void;
        getForceThreshold(): number;
        setTorqueThreshold(torque: number): void;
        getTorqueThreshold(): number;
        getConstraintForce(): Vec2;
        getConstraintTorque(): number;

        getLinearSeparation(): number;

        getAngularSeparation(): number;

        setConstraintTuning(hertz: number, dampingRatio: number): void;
        getConstraintTuning(): { hertz: number; dampingRatio: number };

        getLocalFrameA(): { x: number; y: number; angle: number };
        getLocalFrameB(): { x: number; y: number; angle: number };
        setLocalFrameA(x: number, y: number, angle: number): void;
        setLocalFrameB(x: number, y: number, angle: number): void;

        enableSpring(flag: boolean): void;
        isSpringEnabled(): boolean;
        setSpringHertz(hertz: number): void;
        getSpringHertz(): number;
        setSpringDampingRatio(ratio: number): void;
        getSpringDampingRatio(): number;
        enableLimit(flag: boolean): void;
        isLimitEnabled(): boolean;

        setLimits(lower: number, upper: number): void;
        getLimits(): { lower: number; upper: number };
        enableMotor(flag: boolean): void;
        isMotorEnabled(): boolean;
        setMotorSpeed(speed: number): void;
        getMotorSpeed(): number;

        setMaxMotorForce(force: number): void;
        getMaxMotorForce(): number;
        getMotorForce(): number;

        setMaxMotorTorque(torque: number): void;
        getMaxMotorTorque(): number;
        getMotorTorque(): number;

        getAngle(): number;

        setTargetAngle(angle: number): void;
        getTargetAngle(): number;

        getTranslation(): number;
        getSpeed(): number;

        setTargetTranslation(translation: number): void;
        getTargetTranslation(): number;

        getLength(): number;
        setLength(length: number): void;
        getCurrentLength(): number;

        setSpringForceRange(lower: number, upper: number): void;
        getSpringForceRange(): { lower: number; upper: number };

        setLinearHertz(hertz: number): void;
        getLinearHertz(): number;
        setLinearDampingRatio(ratio: number): void;
        getLinearDampingRatio(): number;
        setAngularHertz(hertz: number): void;
        getAngularHertz(): number;
        setAngularDampingRatio(ratio: number): void;
        getAngularDampingRatio(): number;

        setLinearVelocity(x: number, y: number): void;
        getLinearVelocity(): Vec2;
        setAngularVelocity(velocity: number): void;
        getAngularVelocity(): number;
        setMaxVelocityForce(force: number): void;
        getMaxVelocityForce(): number;
        setMaxVelocityTorque(torque: number): void;
        getMaxVelocityTorque(): number;
        setMaxSpringForce(force: number): void;
        getMaxSpringForce(): number;
        setMaxSpringTorque(torque: number): void;
        getMaxSpringTorque(): number;

        destroy(wakeBodies?: boolean): boolean;
        isValid(): boolean;
    }

    function createWorld(options?: WorldOptions): World;
}

declare namespace Color {

    type Value = number;

    function new(r: number, g: number, b: number, a?: number): Value;

    function getR(color: Value): number;

    function getG(color: Value): number;

    function getB(color: Value): number;

    function getA(color: Value): number;

    function setR(color: Value, value: number): Value;

    function setG(color: Value, value: number): Value;

    function setB(color: Value, value: number): Value;

    function setA(color: Value, value: number): Value;
}

declare namespace Box2DDraw {
    interface Options {

        scale?: number;

        offsetX?: number;
        offsetY?: number;

        flipY?: boolean;

        fill?: boolean;

        shapes?: boolean;

        joints?: boolean;

        jointExtras?: boolean;

        bounds?: boolean;

        contacts?: boolean;

        mass?: boolean;
    }

    function draw(world: Box2D.World, options?: Options): void;
}

declare namespace Loop {

    interface Handlers {

        update?(dt: number): void;

        draw?(alpha: number): void;
    }

    interface Options {

        clear?: boolean;

        clearColor?: number;

        maxDelta?: number;

        fixedStep?: number;

        maxSteps?: number;

        vsyncInterval?: number;
    }

    interface Stats {

        fps: number;

        frameMs: number;

        cpuMs: number;

        steps: number;

        alpha: number;
    }

    function run(handlers: ((dt: number) => void) | Handlers, options?: Options): void;

    function stop(): void;

    function isRunning(): boolean;

    function setTimeScale(scale: number): void;

    function getTimeScale(): number;

    function getDeltaTime(): number;

    function getElapsedTime(): number;

    function getRealElapsedTime(): number;

    function getFrameCount(): number;

    function getStats(): Stats;

    interface System {

        name?: string;

        priority?: number;

        realTime?: boolean;
        preUpdate?(dt: number): void;

        update?(step: number): void;
        postUpdate?(dt: number): void;
        preDraw?(alpha: number): void;
        postDraw?(alpha: number): void;
    }

    interface SystemInfo {
        name: string | undefined;
        priority: number;
        realTime: boolean;

        phases: Array<"preUpdate" | "update" | "postUpdate" | "preDraw" | "postDraw">;

        native: boolean;
    }

    function addSystem<T extends System>(system: T): T;

    function removeSystem(system: System | string): boolean;

    function getSystems(): SystemInfo[];
}

declare namespace Camera2D {
    interface Point {
        x: number;
        y: number;
    }

    interface Rect {
        x: number;
        y: number;
        w: number;
        h: number;
    }

    type Pair = number | [number, number] | { x: number; y: number } | { w: number; h: number };

    interface Target {
        x: number;
        y: number;
    }

    interface CameraOptions {

        x?: number;
        y?: number;

        zoom?: number;
        zoomX?: number;
        zoomY?: number;

        rotation?: number;

        viewport?: Rect | null;

        anchor?: Pair;

        pixelSnap?: boolean;

        bounds?: Rect | null;

        boundsIgnoreRotation?: boolean;

        current?: boolean;

        realTime?: boolean;

        debug?: boolean;
    }

    interface FollowOptions {

        lerp?: Pair;

        deadzone?: Pair;

        lookahead?: Pair;

        lookaheadLerp?: number;

        offset?: Pair;

        autoZoom?: boolean | { min?: number; max?: number; margin?: number; lerp?: number };

        snap?: boolean;

        interpolate?: boolean;

        zoomBySpeed?: boolean | { min?: number; max?: number; speed?: number; lerp?: number };
    }

    interface Zone extends Rect {

        zoom?: number;

        lerp?: Pair;

        offset?: Pair;
    }

    interface ZoneOptions {

        transition?: number;

        onChange?: (this: Camera, zone: number, previous: number) => void;
    }

    interface TraumaOptions {

        intensity?: number;

        rotation?: number;

        decay?: number;

        frequency?: number;
    }

    interface RepeatOptions extends DrawOptions {

        x?: number;
        y?: number;

        repeatX?: boolean;
        repeatY?: boolean;
    }

    interface State {
        x: number;
        y: number;
        zoomX: number;
        zoomY: number;
        rotation: number;
        anchor: Point;

        viewport: Rect | null;
        bounds: Rect | null;
        boundsIgnoreRotation: boolean;
        pixelSnap: boolean;
        realTime: boolean;
    }

    interface TransitionOptions {

        ease?: (t: number) => number;

        realTime?: boolean;
    }

    interface StackOptions extends TransitionOptions {

        duration?: number;
    }

    interface ShakeOptions {

        frequency?: number;

        rotation?: number;
    }

    interface DrawOptions {

        parallax?: Pair;
    }

    interface Matrix {
        xx: number;
        xy: number;
        yx: number;
        yy: number;
        tx: number;
        ty: number;
    }

    class Camera {
        constructor(options?: CameraOptions);

        x: number;
        y: number;

        zoom: number;
        zoomX: number;
        zoomY: number;

        rotation: number;
        pixelSnap: boolean;

        anchor: Point;

        viewport: Rect | null;

        bounds: Rect | null;

        boundsIgnoreRotation: boolean;

        readonly zone: number;
        readonly following: boolean;
        readonly shaking: boolean;

        readonly letterboxAmount: number;

        readonly fadeAlpha: number;

        readonly isCurrent: boolean;

        realTime: boolean;

        debug: boolean;

        readonly trauma: number;

        setPosition(x: number, y: number): this;

        move(dx: number, dy: number): this;
        setZoom(zoomX: number, zoomY?: number): this;
        setViewport(x: number, y: number, w: number, h: number): this;
        setViewport(rect: Rect | null): this;

        setBounds(x: number, y: number, w: number, h: number): this;
        setBounds(rect: Rect | null): this;

        follow(target: Target | Target[], options?: FollowOptions): this;
        unfollow(): this;

        snap(): this;

        setZones(zones: Zone[] | null, options?: ZoneOptions): this;

        shake(intensity: number, duration: number, options?: ShakeOptions): this;

        addTrauma(amount: number, options?: TraumaOptions): this;

        kick(dx: number, dy: number, duration?: number): this;

        stopShake(): this;

        zoomTo(zoom: number, duration: number): Promise<boolean>;

        panTo(x: number, y: number, duration: number): Promise<boolean>;

        fade(color: number, duration: number): Promise<boolean>;

        flash(color: number, duration?: number): Promise<boolean>;

        letterbox(amount: number, duration?: number): Promise<boolean>;

        worldToScreen(x: number, y: number): Point;
        screenToWorld(x: number, y: number): Point;

        visibleRect(): Rect;
        isVisible(x: number, y: number, w?: number, h?: number): boolean;

        cull(rects: Float32Array, out?: Uint8Array): number;

        begin(options?: DrawOptions): void;

        end(): void;

        draw<T>(fn: () => T, options?: DrawOptions): T;

        viewportSpace<T>(fn: () => T): T;

        makeCurrent(): this;

        update(dt: number): this;
        getMatrix(options?: DrawOptions): Matrix;

        drawRepeat(image: Image, options?: RepeatOptions): number;

        state(): State;

        setState(state: Partial<State>): this;
    }

    const main: Camera;

    function getCurrent(): Camera | null;

    function setCurrent(camera: Camera | null): void;

    function transition(camera: Camera, duration: number,
        options?: TransitionOptions): Promise<boolean>;

    function push(camera: Camera, options?: StackOptions): Promise<boolean>;

    function pop(options?: StackOptions): Promise<boolean>;

    function getStats(): { culled: number; pushed: number };

    function screenSpace<T>(fn: () => T): T;

    function update(dt: number): void;

    function reset(): void;
}

declare namespace Collision {
    type BodyType = "static" | "kinematic" | "dynamic";

    type WallSide = -1 | 0 | 1;

    type Shape = Body | { x: number; y: number; w: number; h: number } |
        { x: number; y: number; r: number };

    type Slope = [number, number] | "45r" | "45l" | "22r1" | "22r2" | "22l1" | "22l2";

    interface WorldOptions {

        cellSize?: number;

        gravity?: { x: number; y: number } | [number, number];

        autoStep?: boolean;
    }

    interface BodyOptions {

        x?: number;
        y?: number;

        w?: number;
        h?: number;

        r?: number;

        type?: BodyType;
        vx?: number;
        vy?: number;

        layer?: number;

        mask?: number;

        sensor?: boolean;

        oneWay?: boolean;

        gravityScale?: number;

        damping?: number;

        bounce?: number;

        maxSpeedX?: number;
        maxSpeedY?: number;
    }

    interface GridOptions {

        columns: number;
        rows: number;
        tileWidth: number;
        tileHeight: number;

        x?: number;
        y?: number;

        tiles?: Uint16Array | number[];

        solid?: number[];

        oneWay?: number[];

        slopes?: { [id: number]: Slope };

        layer?: number;
    }

    interface Contact {
        body: Body | null;
        tile: number;
        column: number;
        row: number;
        normalX: number;
        normalY: number;
    }

    interface MoveResult {

        dx: number;
        dy: number;
        onGround: boolean;
        hitCeiling: boolean;
        hitWall: WallSide;

        contacts: Contact[];
    }

    interface RayHit {
        x: number;
        y: number;
        normalX: number;
        normalY: number;

        fraction: number;
        distance: number;

        body: Body | null;

        tile: number;
        column: number;
        row: number;
    }

    interface RaycastOptions {

        mask?: number;

        ignore?: Body | null;

        sensors?: boolean;
    }

    class World {
        constructor(options?: WorldOptions);
        gravityX: number;
        gravityY: number;
        readonly cellSize: number;
        readonly bodyCount: number;
        autoStep: boolean;

        onContact: ((this: World, body: Body, contact: Contact) => void) | null;

        onEnter: ((this: World, sensor: Body, other: Body) => void) | null;

        onExit: ((this: World, sensor: Body, other: Body) => void) | null;

        readonly grid: { columns: number; rows: number; tileWidth: number; tileHeight: number;
            x: number; y: number; layer: number } | undefined;

        add(options: BodyOptions): Body;

        remove(body: Body): boolean;

        clear(): void;
        bodies(): Body[];

        move<T extends object = MoveResult>(body: Body, dx: number, dy: number, out?: T): T & MoveResult;

        step(dt: number): void;

        setGrid(options: GridOptions): void;
        clearGrid(): void;

        getTile(column: number, row: number): number;

        setTile(column: number, row: number, id: number): boolean;

        cellAt(x: number, y: number): { column: number; row: number; tile: number } | null;

        solidAt(x: number, y: number, mask?: number): boolean;

        query(x: number, y: number, w: number, h: number, mask?: number): Body[];
        queryCircle(x: number, y: number, r: number, mask?: number): Body[];
        queryPoint(x: number, y: number, mask?: number): Body[];

        overlapping(body: Body): Body[];

        pairs(layerA: number, layerB: number): Array<[Body, Body]>;

        pairs(layerA: number, layerB: number, callback: (a: Body, b: Body) => void): number;

        raycast(x1: number, y1: number, x2: number, y2: number,
            options?: RaycastOptions): RayHit | null;

        drawDebug(options?: { bodies?: boolean; tiles?: boolean }): void;
    }

    class Body {
        private constructor();

        readonly world: World | null;
        readonly valid: boolean;
        readonly shape: "rect" | "circle";
        type: BodyType;

        x: number;
        y: number;

        w: number;
        h: number;

        r: number | undefined;

        readonly centerX: number;
        readonly centerY: number;

        readonly right: number;
        readonly bottom: number;
        vx: number;
        vy: number;
        layer: number;
        mask: number;
        sensor: boolean;
        oneWay: boolean;

        dropThrough: boolean;
        gravityScale: number;
        damping: number;
        bounce: number;
        maxSpeedX: number;
        maxSpeedY: number;

        readonly onGround: boolean;
        readonly onCeiling: boolean;
        readonly onWall: WallSide;

        readonly ground: Body | null;

        readonly crushed: boolean;

        move<T extends object = MoveResult>(dx: number, dy: number, out?: T): T & MoveResult;

        setPosition(x: number, y: number): void;

        getBounds(): { x: number; y: number; w: number; h: number };

        remove(): boolean;
    }

    function overlaps(a: Shape, b: Shape): boolean;

    function resolve(a: Shape, b: Shape): { x: number; y: number } | null;

    function segment(x1: number, y1: number, x2: number, y2: number, shape: Shape):
        { fraction: number; x: number; y: number; normalX: number; normalY: number } | null;
}

declare namespace Draw {

    function point(x: number, y: number, color: Color.Value): void;

    function line(x1: number, y1: number, x2: number, y2: number,
        color: Color.Value): void;

    function triangle(x1: number, y1: number, x2: number, y2: number,
        x3: number, y3: number, color: Color.Value): void;

    function triangleGouraud(
        x1: number, y1: number, color1: Color.Value,
        x2: number, y2: number, color2: Color.Value,
        x3: number, y3: number, color3: Color.Value
    ): void;

    function quad(x1: number, y1: number, x2: number, y2: number,
        x3: number, y3: number, x4: number, y4: number,
        color: Color.Value): void;

    function quadGouraud(
        x1: number, y1: number, color1: Color.Value,
        x2: number, y2: number, color2: Color.Value,
        x3: number, y3: number, color3: Color.Value,
        x4: number, y4: number, color4: Color.Value
    ): void;

    function rect(x: number, y: number, width: number, height: number,
        color: Color.Value): void;

    function circle(x: number, y: number, radius: number,
        color: Color.Value, filled?: boolean): void;
}

declare class Font {

    constructor(path?: string | null, options?: Font.Options);
    constructor(options: Font.Options);

    static loadAsync(path?: string | null, options?: Font.AsyncOptions): Font.Job;

    static poll(job: Font.Job): AthenaJobStatus<Font>;
    static wait(job: Font.Job, timeoutMs?: number): AthenaJobStatus<Font>;
    static cancel(job: Font.Job): void;

    static readonly ASCII: string;

    static readonly ALIGN_TOP: number;
    static readonly ALIGN_BOTTOM: number;
    static readonly ALIGN_VCENTER: number;
    static readonly ALIGN_LEFT: number;
    static readonly ALIGN_RIGHT: number;
    static readonly ALIGN_HCENTER: number;
    static readonly ALIGN_NONE: number;
    static readonly ALIGN_CENTER: number;

    scale: number;
    color: Color.Value;

    align: number;
    outline: number;
    outlineColor: Color.Value;
    dropshadow: number;
    dropshadowColor: Color.Value;

    outline_color: Color.Value;

    dropshadow_color: Color.Value;

    readonly size: number;

    readonly lineHeight: number;

    print(x: number, y: number, text: string): void;

    getTextSize(text: string): { width: number; height: number };

    render(text: string): FontRender;

    preload(chars?: string, options?: Font.PreloadOptions): Promise<Font>;

    free(): void;
}

declare namespace Font {

    interface Job extends AthenaJob<Font> {
        readonly __brand: 'FontJob';
    }

    interface Options {

        size?: number;
    }

    interface PreloadOptions {

        budgetMs?: number;
    }

    interface AsyncOptions extends Options, PreloadOptions {

        preload?: string | boolean;
    }
}

declare class FontRender {
    print(x: number, y: number): void;
}

declare namespace Gamepad {

    type Connection = "port" | "usb" | "bluetooth";

    interface DriverState {

        readonly enabled: boolean;

        readonly ready: boolean;
    }

    interface Player {

        readonly index: number;

        readonly connected: boolean;

        readonly justConnected: boolean;

        readonly justDisconnected: boolean;

        readonly connection: Connection | null;

        readonly port: number;

        readonly slot: number;

        readonly type: DeviceType;

        readonly analog: boolean;

        readonly buttons: number;

        readonly previousButtons: number;

        readonly hasPressure: boolean;

        readonly hasRumble: boolean;

        deadzone: number;

        readonly leftX: number;

        readonly leftY: number;

        readonly rightX: number;

        readonly rightY: number;

        pressed(buttons: number): boolean;

        justPressed(buttons: number): boolean;

        justReleased(buttons: number): boolean;

        anyPressed(buttons: number): boolean;

        anyJustPressed(buttons: number): boolean;

        repeatPressed(buttons: number, delayMs?: number, intervalMs?: number): boolean;

        dpad(): { x: -1 | 0 | 1; y: -1 | 0 | 1 };

        leftStick(): { x: number; y: number };

        rightStick(): { x: number; y: number };

        pressure(button: Button): number;

        rumble(strong: number, weak?: number, durationMs?: number): void;

        stopRumble(): void;

        setAnalog(enabled: boolean, lock?: boolean): void;

        pairBluetooth(options: { overwrite: true }): boolean;

        toJSON(): {
            index: number; connected: boolean; connection: Connection | null;
            port: number; slot: number; type: DeviceType; analog: boolean; buttons: number;
            leftStick: { x: number; y: number }; rightStick: { x: number; y: number };
            dpad: { x: number; y: number }; hasPressure: boolean; hasRumble: boolean;
            deadzone: number;
        };
    }

    function update(): void;

    function player(index: number): Player;

    const players: readonly Player[];

    function connectedPlayers(): Player[];

    function findJustPressed(buttons: number): Player | null;

    function configure(options: { multitap?: boolean; usb?: boolean; bluetooth?: boolean }): void;

    function drivers(): {
        multitap: DriverState;
        usb: DriverState;
        bluetooth: DriverState & { readonly adapter: boolean };
    };

    function hasMultitap(port: number): boolean;

    function swapPlayers(a: number, b: number): void;

    const MAX_PLAYERS: 8;

    const SELECT: 0x0001;
    const L3: 0x0002;
    const R3: 0x0004;
    const START: 0x0008;
    const UP: 0x0010;
    const RIGHT: 0x0020;
    const DOWN: 0x0040;
    const LEFT: 0x0080;
    const L2: 0x0100;
    const R2: 0x0200;
    const L1: 0x0400;
    const R1: 0x0800;
    const TRIANGLE: 0x1000;
    const CIRCLE: 0x2000;
    const CROSS: 0x4000;
    const SQUARE: 0x8000;

    type Button = typeof SELECT | typeof L3 | typeof R3 | typeof START |
        typeof UP | typeof RIGHT | typeof DOWN | typeof LEFT |
        typeof L2 | typeof R2 | typeof L1 | typeof R1 |
        typeof TRIANGLE | typeof CIRCLE | typeof CROSS | typeof SQUARE;

    const TYPE_NONE: 0;
    const TYPE_NEJICON: 0x2;
    const TYPE_KONAMIGUN: 0x3;
    const TYPE_DIGITAL: 0x4;
    const TYPE_ANALOG: 0x5;
    const TYPE_NAMCOGUN: 0x6;
    const TYPE_DUALSHOCK: 0x7;
    const TYPE_JOGCON: 0xE;
    const TYPE_DUALSHOCK3: 0x1003;
    const TYPE_DUALSHOCK4: 0x1004;

    type DeviceType = typeof TYPE_NONE | typeof TYPE_NEJICON | typeof TYPE_KONAMIGUN |
        typeof TYPE_DIGITAL | typeof TYPE_ANALOG | typeof TYPE_NAMCOGUN |
        typeof TYPE_DUALSHOCK | typeof TYPE_JOGCON | typeof TYPE_DUALSHOCK3 |
        typeof TYPE_DUALSHOCK4;
}

declare namespace Screen {

    interface VideoMode {

        mode: number;

        width: number;

        height: number;

        psm: number;

        interlace: number;

        field: number;

        psmz: number;

        zbuffering: boolean;

        double_buffering: boolean;

        pass_count?: number;
    }

    interface AlphaEquation {
        a: number;
        b: number;
        c: number;
        d: number;
        fix: number;
    }

    interface ScissorBounds {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    }

    function flip(): void;

    function clear(color?: number): void;

    function waitVblankStart(): void;

    function setVSync(enabled: boolean): void;

    function setFrameCounter(enabled: boolean): void;

    function getMemoryStats(mode?: number): number;

    function getFreeVRAM(): number;

    function getFPS(interval: number): number;

    function getMode(): VideoMode;

    function setMode(mode: VideoMode): void;

    function alphaEquation(a: number, b: number, c: number, d: number,
        fix: number): bigint;

    function getParam(param: number): number | bigint | AlphaEquation | ScissorBounds;

    function setParam(param: number, value: number | bigint | AlphaEquation | ScissorBounds): void;

    function switchContext(): number;

    function flush(): void;

    const VRAM_SIZE: number;
    const VRAM_USED_TOTAL: number;
    const VRAM_USED_STATIC: number;
    const VRAM_USED_DYNAMIC: number;
    const ALPHA_TEST_ENABLE: number;
    const ALPHA_TEST_METHOD: number;
    const ALPHA_TEST_REF: number;
    const ALPHA_TEST_FAIL: number;
    const DST_ALPHA_TEST_ENABLE: number;
    const DST_ALPHA_TEST_METHOD: number;
    const DEPTH_TEST_ENABLE: number;
    const DEPTH_TEST_METHOD: number;
    const ALPHA_BLEND_EQUATION: number;
    const SCISSOR_BOUNDS: number;
    const PIXEL_ALPHA_BLEND_ENABLE: number;
    const COLOR_CLAMP_MODE: number;
    const ALPHA_NEVER: number;
    const ALPHA_ALWAYS: number;
    const ALPHA_LESS: number;
    const ALPHA_LEQUAL: number;
    const ALPHA_EQUAL: number;
    const ALPHA_GEQUAL: number;
    const ALPHA_GREATER: number;
    const ALPHA_NEQUAL: number;
    const ALPHA_FAIL_NO_UPDATE: number;
    const ALPHA_FAIL_FB_ONLY: number;
    const ALPHA_FAIL_ZB_ONLY: number;
    const ALPHA_FAIL_RGB_ONLY: number;
    const DST_ALPHA_ZERO: number;
    const DST_ALPHA_ONE: number;
    const DEPTH_NEVER: number;
    const DEPTH_ALWAYS: number;
    const DEPTH_GEQUAL: number;
    const DEPTH_GREATER: number;
    const SRC_RGB: number;
    const DST_RGB: number;
    const ZERO_RGB: number;
    const SRC_ALPHA: number;
    const DST_ALPHA: number;
    const ALPHA_FIX: number;
    const BLEND_DEFAULT: bigint;
    const BLEND_ADD_NOALPHA: bigint;
    const BLEND_ADD: bigint;
    const NTSC: number;
    const PAL: number;
    const DTV_480p: number;
    const DTV_576p: number;
    const DTV_720p: number;
    const DTV_1080i: number;
    const INTERLACED: number;
    const PROGRESSIVE: number;
    const FIELD: number;
    const FRAME: number;
    const CT32: number;
    const CT24: number;
    const CT16: number;
    const CT16S: number;
    const Z32: number;
    const Z24: number;
    const Z16: number;
    const Z16S: number;
    const DRAW_BUFFER: number;
    const DISPLAY_BUFFER: number;
    const DEPTH_BUFFER: number;
}

declare namespace System {

    interface DirectoryEntry {

        name: string;

        size: number;

        dir: boolean;
    }

    interface MemoryStats {

        core: number;

        nativeStack: number;

        allocs: number;

        used: number;

        jsHeap: number;

        jsLimit: number;

        jsObjects: number;
    }

    interface CPUInfo {

        implementation: number;

        revision: number;

        RAMSize: number;

        BUSClock: number;

        CPUClock: number;

        MachineType: number;
    }

    interface MemoryCardInfo {

        type: number;

        freemem: number;

        format: number;
    }

    interface GPUInfo {
        revision: number;
        id: number;
    }

    interface DeviceInfo {
        name: string;
        desc: string;
    }

    const bootPath: string;

    const boot_path: string;

    function listDir(path?: string): DirectoryEntry[];

    function removeDirectory(path: string): number;

    function copyFile(source: string, destination: string): number;

    function moveFile(source: string, destination: string): number;

    function rename(source: string, destination: string): number;

    function getTicks(): number;

    function getMilliseconds(): number;

    function sleep(ms: number): void;

    function getUsedMemory(): number;

    function getFreeMemory(): number;

    function delay(): void;

    function getMemoryStats(): MemoryStats;

    function getCPUInfo(): CPUInfo;

    function getGPUInfo(): GPUInfo;

    function getTemperature(): number | undefined;

    function getMCInfo(port?: number): MemoryCardInfo;

    function getBDMInfo(device: string): { name: string; index: number } | undefined;

    function devices(): DeviceInfo[];

    function mount(mountpoint: string, blockdev: string, mode?: number): number;

    function umount(device: string): number;

    function loadELF(path: string, args?: string[]): number;

    function setDarkMode(enabled: boolean): void;

    function gc(): void;

    function exit(): void;

    function exitToBrowser(): void;
}

declare namespace Debug {
    interface ShapeOptions {

        seconds?: number;

        space?: "screen" | "world";

        filled?: boolean;
    }

    interface TextOptions extends ShapeOptions {

        color?: Color.Value;
    }

    interface ConsoleOptions {

        lines?: number;
    }

    interface View {

        x?: number;
        y?: number;

        scale?: number;
    }

    interface Config {

        budgetMs?: number;

        vsyncInterval?: number;

        margin?: number | { x: number; y: number } | null;

        font?: Font;
    }

    interface FrameStats {
        samples: number;
        frameAvg: number;
        frameMax: number;
        cpuAvg: number;
        cpuMax: number;
    }

    function overlay(on?: boolean, options?: OverlayOptions): boolean;

    interface OverlayOptions {

        graph?: boolean;

        compact?: boolean;

        heap?: boolean;
    }

    function console(on?: boolean, options?: ConsoleOptions): boolean;

    function watch(name: string, read: () => unknown): void;

    function unwatch(name: string): boolean;

    function rect(x: number, y: number, width: number, height: number,
        color?: Color.Value, options?: ShapeOptions): void;
    function line(x1: number, y1: number, x2: number, y2: number,
        color?: Color.Value, options?: ShapeOptions): void;
    function circle(x: number, y: number, radius: number,
        color?: Color.Value, options?: ShapeOptions): void;

    function rects(values: Float32Array, color?: Color.Value, options?: ShapeOptions): number;

    function lines(values: Float32Array, color?: Color.Value, options?: ShapeOptions): number;
    function text(x: number, y: number, text: unknown, options?: TextOptions): void;

    function clear(): void;

    function toggleWith(buttons: number | null, port?: 0 | 1): void;

    function show(on?: boolean): boolean;

    function setView(view: View): void;
    function configure(options: Config): void;

    function frame(dt: number, cpuMs?: number): void;

    function frameStats(frames?: number): FrameStats;
}

declare namespace Ease {

    type Curve = (t: number) => number;

    type Easing = Curve | string;

    interface Family {
        in: Curve;
        out: Curve;
        inOut: Curve;
    }

    const linear: Curve;
    const inQuad: Curve, outQuad: Curve, inOutQuad: Curve;
    const inCubic: Curve, outCubic: Curve, inOutCubic: Curve;
    const inQuart: Curve, outQuart: Curve, inOutQuart: Curve;
    const inQuint: Curve, outQuint: Curve, inOutQuint: Curve;
    const inSine: Curve, outSine: Curve, inOutSine: Curve;
    const inExpo: Curve, outExpo: Curve, inOutExpo: Curve;
    const inCirc: Curve, outCirc: Curve, inOutCirc: Curve;

    const inBack: Curve, outBack: Curve, inOutBack: Curve;

    const inElastic: Curve, outElastic: Curve, inOutElastic: Curve;
    const inBounce: Curve, outBounce: Curve, inOutBounce: Curve;

    const easeInQuad: Curve, easeOutQuad: Curve, easeInOutQuad: Curve;
    const easeInCubic: Curve, easeOutCubic: Curve, easeInOutCubic: Curve;
    const easeInQuart: Curve, easeOutQuart: Curve, easeInOutQuart: Curve;
    const easeInQuint: Curve, easeOutQuint: Curve, easeInOutQuint: Curve;
    const easeInSine: Curve, easeOutSine: Curve, easeInOutSine: Curve;
    const easeInExpo: Curve, easeOutExpo: Curve, easeInOutExpo: Curve;
    const easeInCirc: Curve, easeOutCirc: Curve, easeInOutCirc: Curve;
    const easeInBack: Curve, easeOutBack: Curve, easeInOutBack: Curve;
    const easeInElastic: Curve, easeOutElastic: Curve, easeInOutElastic: Curve;
    const easeInBounce: Curve, easeOutBounce: Curve, easeInOutBounce: Curve;

    const names: readonly string[];

    function get(ease: Easing): Curve;

    function back(overshoot?: number): Family;

    function elastic(options?: { amplitude?: number; period?: number }): Family;

    function steps(count: number): Curve;

    function cubicBezier(x1: number, y1: number, x2: number, y2: number): Curve;

    function reverse(ease: Easing): Curve;

    function mirror(ease: Easing): Curve;

    function lerp(a: number, b: number, t: number): number;

    function inverseLerp(a: number, b: number, value: number): number;

    function remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
    function clamp(value: number, min: number, max: number): number;

    function smoothstep(edge0: number, edge1: number, x: number): number;

    function damp(current: number, target: number, lambda: number, dt: number): number;
}

type ImageDrawOptions = {

    width?: number;

    height?: number;

    startx?: number;

    starty?: number;

    endx?: number;

    endy?: number;

    angle?: number;

    color?: number;
};

type ImageDrawListOptions = {

    x?: number;
    y?: number;

    first?: number;

    count?: number;
};

type ImageOptions = {

    delayed?: boolean;
};

declare class Image {

    constructor(options?: ImageOptions);
    constructor(path: string, options?: ImageOptions);

    readonly size: number;

    readonly delayed: boolean;

    pixels: ArrayBuffer;

    palette: ArrayBuffer;

    texWidth: number;

    texHeight: number;

    bpp: number;

    filter: number;

    renderable: boolean;

    width: number;

    height: number;

    startx: number;

    starty: number;

    endx: number;

    endy: number;

    angle: number;

    color: number;

    ready(): boolean;

    loading(): boolean;

    failed(): boolean;

    status(): "queued" | "loading" | "decoded" | "upload_pending" | "ready" | "failed" | "cancelled";

    error(): ImageLoadError | undefined;

    draw(x: number, y: number, options?: ImageDrawOptions): void;

    drawList(sprites: ArrayBuffer | ArrayBufferView, options?: ImageDrawListOptions): void;

    lock(): boolean;

    unlock(): boolean;

    locked(): boolean;

    optimize(): boolean;

    free(): void;

    static copyVRAMBlock(
        source: Image,
        sourceX: number,
        sourceY: number,
        destination: Image,
        destinationX: number,
        destinationY: number
    ): void;
}

interface ImageLoadError {

    path: string;
    code: "open_failed" | "unsupported_format" | "decode_failed" | "surface_failed" | "upload_failed";

    stage: "open" | "decode" | "surface" | "upload";

    message: string;
}

interface ImageListLoadOptions {

    delayed?: boolean;

    priority?: number;

    upload?: "draw" | "bind" | "lock";

    onLoad?: (image: Image) => void;

    onError?: (image: Image, error: ImageLoadError) => void;
}

interface ImageListOptions {

    workers?: 0 | 1;

    maxMemory?: number;

    cacheSize?: number;
}

interface ImageListProcessOptions {

    maxItems?: number;

    maxBytes?: number;

    maxTime?: number;
}

interface ImageListStats {

    queued: number;

    loading: number;
    completed: number;
    failed: number;
    cancelled: number;

    bufferedBytes: number;

    peakBufferedBytes: number;

    workers: number;

    cached: number;

    cacheHits: number;

    decodeTime: number;

    applyTime: number;

    uploadTime: number;
}

declare class ImageList {
    static readonly HIGH: number;
    static readonly NORMAL: number;
    static readonly LOW: number;

    constructor(options?: ImageListOptions);

    load(path: string, options?: ImageListLoadOptions): Image;

    process(budget?: number | ImageListProcessOptions): number;

    pending(): number;

    stats(): ImageListStats;

    cancel(image: Image): boolean;

    clear(): void;

    clearCache(): number;

    close(): void;
}

declare namespace IOP {

    interface Module {

        id: number;

        name: string;

        started: boolean;

        startAtBoot: boolean;
    }

    interface MemoryStats {

        free: number;

        used: number;
    }

    function getModules(): Module[];

    function getModule(nameOrId: string | number): Module;

    function loadModule(nameOrId: string | number): number;

    function reset(): void;

    function getMemoryStats(): MemoryStats;
}

declare class Vector2 {

    constructor(x: number, y: number);

    x: number;

    y: number;

    norm(): number;

    dot(value: Vector2): number;

    distance(value: Vector2): number;

    distance2(value: Vector2): number;

    add(value: Vector2): Vector2;

    sub(value: Vector2): Vector2;

    mul(value: Vector2): Vector2;

    div(value: Vector2): Vector2;

    toString(): string;
}

declare class Vector3 {

    constructor(x: number, y: number, z: number);

    x: number;

    y: number;

    z: number;

    norm(): number;

    dot(value: Vector3): number;

    cross(value: Vector3): Vector3;

    distance(value: Vector3): number;

    distance2(value: Vector3): number;

    add(value: Vector3): Vector3;

    sub(value: Vector3): Vector3;

    mul(value: Vector3): Vector3;

    div(value: Vector3): Vector3;

    toString(): string;
}

declare class Vector4 {

    constructor(x: number, y: number, z: number, w: number);

    x: number;

    y: number;

    z: number;

    w: number;

    norm(): number;

    dot(value: Vector4): number;

    cross(value: Vector4): Vector4;

    distance(value: Vector4): number;

    distance2(value: Vector4): number;

    add(value: Vector4): Vector4;

    sub(value: Vector4): Vector4;

    mul(value: Vector4): Vector4;

    div(value: Vector4): Vector4;

    toString(): string;
}

declare class Matrix4 {

    constructor();
    constructor(
        m00: number, m01: number, m02: number, m03: number,
        m10: number, m11: number, m12: number, m13: number,
        m20: number, m21: number, m22: number, m23: number,
        m30: number, m31: number, m32: number, m33: number
    );

    readonly length: 16;

    get(index: number): number;

    set(index: number, value: number): this;

    equals(value: Matrix4): boolean;

    equalsEpsilon(value: Matrix4, epsilon: number): boolean;

    toArray(): number[];

    fromArray(values: ArrayLike<number>): this;

    clone(): Matrix4;

    copy(value: Matrix4): this;

    multiply(value: Matrix4): Matrix4;

    identity(): this;

    transpose(): this;

    invert(): this;

    toString(): string;
}

declare namespace MemoryCard {
    type Port = 0 | 1;

    type Path = string;

    type CardType = 'none' | 'ps1' | 'ps2' | 'pocketstation';

    type ErrorCode =
        | 'INVALID_ARGUMENT'

        | 'NOT_READY'

        | 'NO_CARD'
        | 'UNFORMATTED'

        | 'CARD_CHANGED'
        | 'FULL'
        | 'NOT_FOUND'
        | 'EXISTS'

        | 'ACCESS_DENIED'
        | 'NOT_EMPTY'

        | 'TOO_MANY_OPEN'
        | 'IS_DIRECTORY'
        | 'NOT_DIRECTORY'

        | 'UNSUPPORTED'
        | 'NO_MEMORY'
        | 'IO'

        | 'CLOSED'
        | 'CANCELLED'

        | 'BUSY';

    interface Error extends globalThis.Error {
        code: ErrorCode;

        path?: Path;
    }

    interface Info {
        port: Port;
        type: CardType;

        connected: boolean;
        formatted: boolean;
        freeClusters: number;

        freeBytes: number;

        changed: boolean;
    }

    interface Entry {
        name: string;

        path?: Path;

        size: number;
        directory: boolean;

        attributes: number;

        created: number;
        modified: number;
    }

    type Data = string | ArrayBuffer | ArrayBufferView;

    interface WriteOptions {

        createDirs?: boolean;

        atomic?: boolean;
    }

    function getInfo(port?: Port): Info;

    function format(port: Port): void;

    function unformat(port: Port): void;

    function stat(path: Path): Entry;

    function exists(path: Path): boolean;

    function list(path: Path): Entry[];

    function mkdir(path: Path, options?: { recursive?: boolean }): boolean;

    function remove(path: Path, options?: { recursive?: boolean }): void;

    function rename(path: Path, newName: string): void;

    function setInfo(path: Path, info: {
        attributes?: number;
        created?: Date | number;
        modified?: Date | number;
    }): void;

    function getFreeEntries(path: Path): number;

    function readFile(path: Path): ArrayBuffer;

    function readText(path: Path): string;

    function readJSON<T = any>(path: Path): T;

    function writeFile(path: Path, data: Data, options?: WriteOptions): number;

    function writeJSON(path: Path, value: unknown, options?: WriteOptions & { indent?: number }): number;

    function open(path: Path, mode?: 'r' | 'r+' | 'w' | 'w+' | 'a' | 'a+'): File;

    interface File {
        readonly __brand: 'MemoryCardFile';
        readonly closed: boolean;

        readonly size: number;

        read(size?: number): ArrayBuffer;

        write(data: Data): number;

        seek(offset: number, whence?: 'set' | 'cur' | 'end'): number;
        tell(): number;
        flush(): void;

        close(): void;
    }

    interface IconSysOptions {

        title: string;

        icon: string;

        copyIcon?: string;

        deleteIcon?: string;

        backgroundAlpha?: number;

        background?: [number[], number[], number[], number[]];

        lightDirections?: [number[], number[], number[]];

        lightColors?: [number[], number[], number[]];

        ambient?: number[];
    }

    function createIconSys(options: IconSysOptions): ArrayBuffer;

    interface Job<T> extends AthenaJob<T, JobStatus<T>> {
        readonly __brand: 'MemoryCardJob';
    }

    type JobState = 'running' | 'done' | 'failed' | 'cancelled';

    interface JobStatus<T> {
        state: JobState;
        bytesDone: number;

        bytesTotal: number;

        result?: T;

        error?: Error;
    }

    function readFileAsync(path: Path): Job<ArrayBuffer>;

    function readTextAsync(path: Path): Job<string>;

    function readJSONAsync<T = any>(path: Path): Job<T>;

    function writeFileAsync(path: Path, data: Data, options?: WriteOptions): Job<number>;

    function writeJSONAsync(path: Path, value: unknown, options?: WriteOptions & { indent?: number }): Job<number>;
    function removeAsync(path: Path, options?: { recursive?: boolean }): Job<void>;

    function formatAsync(port: Port): Job<void>;

    function poll<T>(job: Job<T>): JobStatus<T>;

    function wait<T>(job: Job<T>, timeoutMs?: number): JobStatus<T>;

    function cancel(job: Job<unknown>): void;

    const ATTR_READABLE: number;
    const ATTR_WRITABLE: number;
    const ATTR_EXECUTABLE: number;

    const ATTR_PROTECTED: number;
    const ATTR_FILE: number;
    const ATTR_DIRECTORY: number;

    const ATTR_CLOSED: number;
    const ATTR_PDA_EXEC: number;
    const ATTR_PS1: number;

    const ATTR_HIDDEN: number;
    const ATTR_EXISTS: number;

    const NAME_MAX: number;

    const MAX_OPEN_FILES: number;

    const CLUSTER_SIZE: number;
}

declare namespace Random {

    type Seed = number | string;

    type State = [number, number, number, number];

    type NumberArray = Int8Array | Uint8Array | Uint8ClampedArray |
        Int16Array | Uint16Array | Int32Array | Uint32Array |
        Float32Array | Float64Array;

    type List<T> = T[] | NumberArray;

    interface Source {

        seed(seed?: Seed): void;

        int(min: number, max: number): number;

        float(): number;

        float(max: number): number;

        float(min: number, max: number): number;

        bool(p?: number): boolean;

        gaussian(mean?: number, stddev?: number): number;

        angle(): number;

        pick<T>(items: T[], weights?: number[] | Float32Array): T | undefined;
        pick(items: NumberArray, weights?: number[] | Float32Array): number | undefined;

        sample<T>(items: T[], count: number): T[];
        sample(items: NumberArray, count: number): number[];

        shuffle<A extends List<any>>(items: A): A;

        weighted(weights: number[] | Float32Array): number;

        fill<A extends NumberArray>(array: A, min?: number, max?: number): A;

        fillGaussian<A extends Float32Array | Float64Array>(array: A,
            mean?: number, stddev?: number): A;

        state(): State;

        setState(state: State): void;
    }

    class Generator implements Source {

        constructor(seed?: Seed);
        seed(seed?: Seed): void;
        int(min: number, max: number): number;
        float(): number;
        float(max: number): number;
        float(min: number, max: number): number;
        bool(p?: number): boolean;
        gaussian(mean?: number, stddev?: number): number;
        angle(): number;
        pick<T>(items: T[], weights?: number[] | Float32Array): T | undefined;
        pick(items: NumberArray, weights?: number[] | Float32Array): number | undefined;
        sample<T>(items: T[], count: number): T[];
        sample(items: NumberArray, count: number): number[];
        shuffle<A extends List<any>>(items: A): A;
        weighted(weights: number[] | Float32Array): number;
        fill<A extends NumberArray>(array: A, min?: number, max?: number): A;
        fillGaussian<A extends Float32Array | Float64Array>(array: A,
            mean?: number, stddev?: number): A;
        state(): State;
        setState(state: State): void;

        clone(): Generator;
    }

    function seed(seed?: Seed): void;
    function int(min: number, max: number): number;
    function float(): number;
    function float(max: number): number;
    function float(min: number, max: number): number;
    function bool(p?: number): boolean;
    function gaussian(mean?: number, stddev?: number): number;
    function angle(): number;
    function pick<T>(items: T[], weights?: number[] | Float32Array): T | undefined;
    function pick(items: NumberArray, weights?: number[] | Float32Array): number | undefined;
    function sample<T>(items: T[], count: number): T[];
    function sample(items: NumberArray, count: number): number[];
    function shuffle<A extends List<any>>(items: A): A;
    function weighted(weights: number[] | Float32Array): number;
    function fill<A extends NumberArray>(array: A, min?: number, max?: number): A;
    function fillGaussian<A extends Float32Array | Float64Array>(array: A,
        mean?: number, stddev?: number): A;
    function state(): State;
    function setState(state: State): void;
}

declare namespace Noise {

    type Seed = number | string;

    type Type = "perlin" | "simplex" | "worley";

    type Mode = "fbm" | "ridged" | "billow";

    interface FractalOptions {

        type?: Type;

        mode?: Mode;

        octaves?: number;

        lacunarity?: number;

        gain?: number;

        warp?: number;
    }

    interface FillOptions extends FractalOptions {

        scale?: number;

        x?: number;
        y?: number;

        z?: number;

        seed?: Seed;

        min?: number;
        max?: number;

        normalize?: boolean;
    }

    interface Source {

        seed(seed?: Seed): void;

        perlin2(x: number, y: number): number;
        perlin3(x: number, y: number, z: number): number;

        simplex2(x: number, y: number): number;
        simplex3(x: number, y: number, z: number): number;

        worley2(x: number, y: number): number;
        worley3(x: number, y: number, z: number): number;

        fbm2(x: number, y: number, options?: FractalOptions): number;
        fbm3(x: number, y: number, z: number, options?: FractalOptions): number;

        fill(out: Float32Array, width: number, height: number,
            options?: FillOptions): Float32Array;
    }

    class Generator implements Source {

        constructor(seed?: Seed);
        seed(seed?: Seed): void;
        perlin2(x: number, y: number): number;
        perlin3(x: number, y: number, z: number): number;
        simplex2(x: number, y: number): number;
        simplex3(x: number, y: number, z: number): number;
        worley2(x: number, y: number): number;
        worley3(x: number, y: number, z: number): number;
        fbm2(x: number, y: number, options?: FractalOptions): number;
        fbm3(x: number, y: number, z: number, options?: FractalOptions): number;
        fill(out: Float32Array, width: number, height: number,
            options?: FillOptions): Float32Array;
    }

    function seed(seed?: Seed): void;
    function perlin2(x: number, y: number): number;
    function perlin3(x: number, y: number, z: number): number;
    function simplex2(x: number, y: number): number;
    function simplex3(x: number, y: number, z: number): number;
    function worley2(x: number, y: number): number;
    function worley3(x: number, y: number, z: number): number;
    function fbm2(x: number, y: number, options?: FractalOptions): number;
    function fbm3(x: number, y: number, z: number, options?: FractalOptions): number;
    function fill(out: Float32Array, width: number, height: number,
        options?: FillOptions): Float32Array;

    function toTiles(out: Uint16Array, values: Float32Array,
        thresholds: number[] | Float32Array, tiles: number[] | Uint16Array): Uint16Array;
}

declare class Scene<A = any, P = any> {

    readonly params: P;

    assets: A;

    constructor(params?: P);

    enter(assets: A, params: P): void | Promise<void>;
    update(dt: number): void;
    draw(alpha: number): void;

    pause(): void;

    resume(result?: any): void;

    exit(): void;

    defer<F extends () => void>(fn: F): F;

    acquire(manifest: Scene.Manifest, options?: string | Scene.LoadOptions): Scene.AssetGroup;

    static assets?: Scene.Manifest | ((params: any) => Scene.Manifest);

    static root?: string;

    static go<T extends Scene>(SceneClass: new (params?: any) => T, options?: Scene.GoOptions): Promise<T>;

    static push<T extends Scene>(SceneClass: new (params?: any) => T, options?: Scene.PushOptions): Promise<T>;

    static pop(options?: Scene.PopOptions): Promise<Scene | null>;

    static replace<T extends Scene>(SceneClass: new (params?: any) => T, options?: Scene.PushOptions): Promise<T>;

    static preload(SceneClass: new (params?: any) => Scene, params?: any): Scene.AssetGroup;

    static run<T extends Scene>(SceneClass: new (params?: any) => T, options?: Scene.GoOptions,
        loopOptions?: Loop.Options): Promise<T>;

    static update(dt: number): void;

    static draw(alpha?: number): void;

    static reset(): void;

    static defineTransition(name: string, draw: Scene.TransitionDraw): void;

    static readonly current: Scene | null;

    static readonly stack: Scene[];

    static readonly busy: boolean;

    static readonly progress: number;

    static loadingScreen: ((progress: number, info: Scene.LoadingInfo) => void) | null;

    static loadingDelay: number;

    static minLoadingTime: number;

    static slowLoadWarning: number;

    static loadTimeout: number;

    static onError: ((error: Error, SceneClass: (new (params?: any) => Scene) | null) => void) | null;
}

declare namespace Scene {

    type Spec<T = {}> = string | ({ path: string } & T);

    interface ImageSpec {

        upload?: "draw" | "bind" | "lock";

        lock?: boolean;

        priority?: number;
    }

    interface Manifest {
        images?: Record<string, Spec<ImageSpec>>;
        sheets?: Record<string, Spec<Record<string, any>>>;
        sfx?: Record<string, Spec>;
        music?: Record<string, Spec<{ loop?: boolean }>>;
        fonts?: Record<string, Spec<{ size?: number; preload?: boolean | string }>>;
        data?: Record<string, Spec>;
        text?: Record<string, Spec>;
        binary?: Record<string, Spec>;
        [kind: string]: Record<string, Spec<any>> | undefined;
    }

    interface TransitionInfo {

        phase: "out" | "hold" | "in";
        color: number;
        width: number;
        height: number;
        direction: "left" | "right" | "up" | "down";
    }

    type TransitionDraw = (amount: number, info: TransitionInfo) => void;

    interface TransitionOptions {

        transition?: "none" | "fade" | "wipe" | string | { draw: TransitionDraw };

        duration?: number;

        color?: number;

        direction?: "left" | "right" | "up" | "down";
    }

    interface RequestOptions {

        timeout?: number;
    }

    interface GoOptions extends TransitionOptions, RequestOptions {

        params?: any;

        unloadFirst?: boolean;
    }

    interface PushOptions extends TransitionOptions, RequestOptions {
        params?: any;

        drawBelow?: boolean;

        updateBelow?: boolean;
    }

    interface PopOptions extends TransitionOptions {

        result?: any;
    }

    interface LoadingInfo {
        scene: (new (params?: any) => Scene) | null;
        loaded: number;
        total: number;
    }

    interface LoadOptions {

        root?: string;

        timeout?: number;
    }

    interface TimeoutError extends Error {
        code: "TIMEOUT";

        pending: { kind: string; name: string; path: string; state: string }[];
    }

    interface AssetGroup {

        pending(): { kind: string; name: string; path: string; state: string }[];

        readonly assets: any;
        readonly loaded: number;
        readonly total: number;

        readonly progress: number;
        readonly done: boolean;
        readonly failed: boolean;
        readonly error: Error | null;

        readonly ready: Promise<any>;

        release(): void;
    }

    interface Loader<T = any> {

        reuse?(asset: T, spec: any): void;

        load(path: string, spec: any): T | PromiseLike<T>;

        free(asset: T, spec: any): void;

        key?(path: string, spec: any): string;
    }

    namespace Assets {

        let budgetMs: number;

        let imageListIdleTime: number;

        function acquire(manifest: Manifest, options?: string | LoadOptions): AssetGroup;

        function load<T = any>(kind: string, spec: Spec<any>, options?: string | LoadOptions): Promise<T>;

        function release(asset: object): boolean;

        function release(kind: string, spec: Spec<any>, root?: string): boolean;

        function define(kind: string, loader: Loader): void;

        function stats(): { entries: number; loading: number; refs: number; byKind: Record<string, number>;
            pendingFrees: number; imageListOpen: boolean };

        function list(): { kind: string; path: string; refs: number; state: string }[];

        function update(dt?: number): void;
    }
}

declare namespace Sound {
    type ErrorCode =
        | 'INVALID_ARGUMENT'

        | 'NOT_FOUND'
        | 'IO'

        | 'BAD_FORMAT'

        | 'CORRUPT'
        | 'NO_MEMORY'

        | 'SPU_MEMORY'

        | 'IOP'

        | 'THREAD'

        | 'UNSUPPORTED'

        | 'FREED'

        | 'CANCELLED';

    interface Error {
        code: ErrorCode;
        message: string;
    }

    interface MemoryStats {

        total: number;

        used: number;

        free: number;

        wasted: number;

        samples: number;
    }

    interface FadeOptions {

        fade?: number;
    }

    const CHANNELS: number;

    function setVolume(volume: number): void;

    function getVolume(): number;

    function setSfxVolume(volume: number): void;
    function getSfxVolume(): number;

    function findChannel(): number;

    function getMemoryStats(): MemoryStats;

    function process(): number;

    interface Job<T> extends AthenaJob<T, JobStatus<T>> {
        readonly __brand: 'SoundJob';
    }

    type JobState = 'running' | 'done' | 'failed' | 'cancelled';

    interface JobStatus<T> {
        state: JobState;

        result?: T;

        error?: Error;
    }

    function loadSfxAsync(path: string): Job<Sfx>;

    function poll<T>(job: Job<T>): JobStatus<T>;

    function wait<T>(job: Job<T>, timeoutMs?: number): JobStatus<T>;

    function cancel(job: Job<unknown>): void;

    class Stream {

        constructor(path: string);

        play(options?: FadeOptions): void;

        pause(options?: FadeOptions): void;

        stop(options?: FadeOptions): void;

        playing(): boolean;

        rewind(): void;

        free(): void;

        loop: boolean;

        position: number;

        onEnd: ((this: Stream) => void) | null;

        onLoop: ((this: Stream) => void) | null;

        readonly ended: boolean;

        readonly length: number;

        readonly rate: number;

        readonly channels: number;
        readonly format: 'wav' | 'ogg';

        readonly converted: boolean;
    }

    class Sfx {

        constructor(path: string);

        play(channel?: number): number;

        playing(channel: number): boolean;

        stop(channel?: number): void;

        free(): void;

        volume: number;

        pan: number;

        readonly loop: boolean;

        readonly pitch: number;

        readonly length: number;

        readonly rate: number;
    }
}

declare namespace TileMap {

    interface Material {

        textureIndex?: number;

        blendMode?: number;

        endOffset: number;
    }

    interface Atlas {
        tileWidth: number;
        tileHeight: number;
        columns: number;

        rows?: number;
    }

    interface DescriptorOptions {

        atlas?: Atlas;

        textures?: Array<string | Image>;

        materials: Material[];
    }

    class Descriptor {
        constructor(options: DescriptorOptions);
        readonly materialCount: number;

        readonly textures: Image[];
        readonly atlas: Atlas | undefined;
    }

    const EMPTY: number;

    type TileIds = Uint16Array | Int16Array | number[];

    interface GridOptions {

        descriptor: Descriptor;
        columns: number;
        rows: number;

        tiles?: TileIds;

        tileWidth?: number;
        tileHeight?: number;
        zindex?: number;
    }

    interface RenderOptions {

        first?: number;
        count?: number;

        cull?: boolean;
    }

    type SpriteStorage = ArrayBuffer | ArrayBufferView;

    interface InstanceOptions {
        descriptor: Descriptor;

        spriteBuffer?: SpriteStorage;
    }

    class Instance {
        constructor(options: InstanceOptions);

        static fromGrid(options: GridOptions): Instance;
        readonly descriptor: Descriptor;

        readonly spriteCount: number;

        readonly lastDrawCount: number;

        readonly grid: { columns: number; rows: number;
            tileWidth: number; tileHeight: number } | undefined;

        render(x: number, y: number, options?: RenderOptions): void;

        translate(first: number, count: number, dx: number, dy: number): void;

        setColor(first: number, count: number, r: number, g: number,
            b: number, a?: number): void;

        setTiles(first: number, tiles: TileIds): void;

        replaceSpriteBuffer(buffer: SpriteStorage): void;

        getSpriteBuffer(): SpriteStorage | undefined;

        updateSprites(dstOffset: number, source: SpriteStorage,
            count?: number): void;
    }

    interface SpriteObject {
        x?: number;
        y?: number;
        w?: number;
        h?: number;

        u1?: number;
        v1?: number;
        u2?: number;
        v2?: number;

        zindex?: number;

        r?: number;
        g?: number;
        b?: number;
        a?: number;
    }

    namespace SpriteBuffer {

        function create(count: number): ArrayBuffer;

        function fromObjects(sprites: SpriteObject[]): ArrayBuffer;
    }

    const layout: {
        readonly stride: number;
        readonly offsets: {
            readonly x: number;
            readonly y: number;
            readonly w: number;
            readonly h: number;
            readonly u1: number;
            readonly v1: number;
            readonly u2: number;
            readonly v2: number;

            readonly r: number;
            readonly g: number;
            readonly b: number;
            readonly a: number;
            readonly zindex: number;
        };
    };

    interface Diagnostics {

        flushEachBatch: boolean;

        fullCacheFlush: boolean;

        batchSize: number;

        rotatedOnEE: boolean;
    }

    function setDiagnostics(options: Partial<Diagnostics>): void;
    function getDiagnostics(): Diagnostics;

    function setCamera(x: number, y: number): void;
    function getCamera(): { x: number; y: number };
}

declare namespace Sprite {

    interface FrameDef {
        x: number;
        y: number;
        w: number;
        h: number;

        offsetX?: number;
        offsetY?: number;

        sourceWidth?: number;
        sourceHeight?: number;

        duration?: number;

        name?: string;
    }

    interface Frame extends Required<Omit<FrameDef, "name">> {
        name: string | null;

        rotated: boolean;
    }

    type GridLine = { row: number; from?: number; to?: number } |
        { column: number; from?: number; to?: number };

    type FrameList = string | Array<number | string> | GridLine;

    interface ClipDef {

        frames?: FrameList;
        row?: number;
        column?: number;
        from?: number;
        to?: number;

        fps?: number;

        durations?: number[];

        mode?: "loop" | "once" | "pingpong";

        loops?: number;

        reverse?: boolean;

        next?: string | null;
    }

    type Clip = ClipDef | FrameList;

    interface ClipInfo {
        name: string;
        frames: number[];

        durations: number[];
        mode: "loop" | "once" | "pingpong";
        loops: number;

        length: number;
        next: string | null;
    }

    interface Rect {
        x: number;
        y: number;
        w: number;
        h: number;
    }

    interface ClipOptions {

        clips?: Record<string, Clip>;

        fps?: number;

        inset?: number;
    }

    interface SheetOptions extends ClipOptions {
        frames?: FrameDef[];
    }

    interface GridOptions extends ClipOptions {
        frameWidth: number;
        frameHeight: number;

        margin?: number;

        spacing?: number;

        columns?: number;
        rows?: number;

        first?: number;

        count?: number;

        textureWidth?: number;
        textureHeight?: number;
    }

    interface JSONOptions extends ClipOptions {

        image?: Image | null;
    }

    class Sheet {

        constructor(image: Image | null, options?: SheetOptions);

        static fromGrid(image: Image | null, options: GridOptions): Sheet;

        static fromJSON(source: string | object, options?: JSONOptions): Sheet;

        static fromJSONAsync(path: string, options?: JSONOptions): AthenaJob<Sheet>;

        static fromGridAsync(imagePath: string, options: GridOptions): AthenaJob<Sheet>;
        readonly image: Image | null;
        readonly frameCount: number;
        readonly clipNames: string[];
        readonly sliceNames: string[];

        inset: number;

        addFrame(frame: FrameDef): number;

        addClip(name: string, clip: Clip): this;
        hasClip(name: string): boolean;

        findFrame(name: string): number;
        getFrame(frame: number | string): Frame;
        getClip(name: string): ClipInfo | null;

        setSlice(name: string, rect: Rect | null, frames?: number | FrameList): this;

        getSlice(name: string, frame: number | string): Rect | null;
    }

    interface InstanceOptions {

        clip?: string;

        frame?: number | string;

        x?: number;
        y?: number;

        origin?: number | [number, number] | { x: number; y: number };
        scale?: number | [number, number] | { x: number; y: number };

        rotation?: number;
        flipX?: boolean;
        flipY?: boolean;

        color?: number;

        speed?: number;

        autoUpdate?: boolean;

        debug?: boolean;

        realTime?: boolean;
    }

    interface PlayOptions {

        restart?: boolean;

        position?: number;
        speed?: number;
    }

    type EventName = "frame" | "loop" | "end" | `frame:${number}` | `${string}:${number}` |
        `loop:${string}` | `end:${string}`;

    type Listener = (this: Instance, clip: string | null, position: number,
        frame: number) => void;

    interface Bounds {
        x: number;
        y: number;
        w: number;
        h: number;
    }

    class Instance {
        constructor(sheet: Sheet, options?: InstanceOptions);
        readonly sheet: Sheet;

        readonly clip: string | null;

        frame: number;

        position: number;
        readonly playing: boolean;

        readonly paused: boolean;

        readonly finished: boolean;

        readonly progress: number;

        readonly cycles: number;
        speed: number;

        x: number;
        y: number;
        flipX: boolean;
        flipY: boolean;
        originX: number;
        originY: number;
        scaleX: number;
        scaleY: number;
        rotation: number;
        color: number;
        autoUpdate: boolean;
        realTime: boolean;

        debug: boolean;

        readonly width: number;
        readonly height: number;

        play(clip: string, options?: PlayOptions): this;

        playAsync(clip: string, options?: PlayOptions): Promise<boolean>;
        pause(): this;
        resume(): this;

        stop(): this;

        update(dt: number): this;

        draw(x?: number, y?: number): void;

        getBounds(x?: number, y?: number): Bounds;

        getSlice(name: string, x?: number, y?: number): Rect | null;
        setOrigin(x: number, y?: number): this;
        setScale(x: number, y?: number): this;
        on(event: EventName, listener: Listener): this;

        once(event: EventName, listener: Listener): this;

        off(event?: EventName, listener?: Listener): this;
    }

    interface Range {

        first?: number;

        count?: number;
    }

    interface BindOptions {

        first?: number;

        count?: number;

        randomStart?: boolean;

        seed?: number;
        speed?: number;
        flipX?: boolean;
        flipY?: boolean;

        realTime?: boolean;
    }

    interface AnimatorPlayOptions extends Range {

        restart?: boolean;
        randomStart?: boolean;
    }

    class Animator {
        private constructor();

        static bind(instance: TileMap.Instance, sheet: Sheet, clip: string,
            options?: BindOptions): Animator;
        readonly instance: TileMap.Instance;
        readonly sheet: Sheet;
        readonly first: number;
        readonly count: number;
        readonly paused: boolean;

        readonly bound: boolean;
        readonly realTime: boolean;

        readonly finishedCount: number;

        speed: number;
        play(clip: string, options?: AnimatorPlayOptions): this;
        setFlip(flipX: boolean, flipY: boolean, range?: Range): this;
        pause(): this;
        resume(): this;

        unbind(): void;

        frameAt(index: number): number;

        isPlaying(index: number): boolean;

        isFinished(index: number): boolean;
    }

    function update(dt: number): void;

    function drawAll(instances: Instance[], positions?: Float32Array | number[]): void;

    function setDebug(on: boolean): boolean;

    function getStats(): {

        playing: number;
        animators: number;

        animatedSprites: number;

        drawn: number;
        culled: number;
    };
}

declare namespace Timer {

    interface Handle {
        readonly __brand: 'Timer';
    }

    function new(): Handle;

    function getTime(timer: Handle): number;

    function setTime(timer: Handle, value: number): void;

    function pause(timer: Handle): void;

    function resume(timer: Handle): void;

    function reset(timer: Handle): void;

    function isPlaying(timer: Handle): boolean;

    function destroy(timer: Handle): void;
}

declare namespace Tween {
    interface Options {

        ease?: Ease.Easing;

        delay?: number;

        repeat?: number;

        yoyo?: boolean;

        realTime?: boolean;

        overwrite?: boolean;

        colors?: string[];
        onStart?(target: any): void;

        onUpdate?(target: any, progress: number): void;

        onRepeat?(target: any, cycle: number): void;
        onComplete?(target: any): void;
    }

    interface Handle extends PromiseLike<boolean> {
        readonly target: any;
        readonly duration: number;
        readonly realTime: boolean;

        readonly finished: Promise<boolean>;

        readonly active: boolean;
        readonly paused: boolean;

        readonly progress: number;
        pause(): this;
        resume(): this;

        kill(complete?: boolean): void;
    }

    function to<T extends object>(target: T, props: { [K in keyof T]?: number },
        duration: number, options?: Options): Handle;

    function from<T extends object>(target: T, props: { [K in keyof T]?: number },
        duration: number, options?: Options): Handle;

    function delay(seconds: number, options?: Options): Handle;

    function sequence(steps: Array<() => unknown>): Promise<void>;

    function getTweensOf(target: object): Handle[];

    function killTweensOf(target: object, complete?: boolean): number;

    function killAll(complete?: boolean): number;

    function count(): number;

    function update(dt: number, realDt?: number): void;
}

type VideoErrorCode =

    | "open_failed"

    | "busy"

    | "invalid_format"

    | "unsupported_format"

    | "out_of_memory"

    | "thread_failed";

type VideoDrawOptions = {

    width?: number;

    height?: number;

    startx?: number;

    starty?: number;

    endx?: number;

    endy?: number;

    angle?: number;

    color?: number;
};

type VideoAudioSource = {

    readonly position: number;
    readonly ended: boolean;
    loop: boolean;
    play(): void;
    pause(): void;
    stop(): void;
    rewind(): void;
};

type VideoInfo = {

    width: number;
    height: number;

    codedWidth: number;
    codedHeight: number;

    fps: number;

    frames: number;

    duration: number;

    mpeg2: boolean;
    progressive: boolean;
    chroma: "4:2:0" | "4:2:2" | "4:4:4" | "unknown";

    supported: boolean;
};

declare class Video {

    constructor(path: string);

    static probe(path: string): VideoInfo;

    readonly width: number;

    readonly height: number;

    readonly fps: number;

    readonly ready: boolean;

    readonly ended: boolean;

    readonly playing: boolean;

    loop: boolean;

    readonly currentFrame: number;

    readonly loopCount: number;

    readonly frame: Image | null;

    audio: VideoAudioSource | null;

    onEnd?: (() => void) | null;

    onLoop?: ((loopCount: number) => void) | null;

    play(): void;

    pause(): void;

    stop(): void;

    update(): boolean;

    draw(x?: number, y?: number, width?: number, height?: number): void;

    draw(x: number, y: number, options: VideoDrawOptions): void;

    free(): void;
}
