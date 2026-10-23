const gameContainer = document.getElementById("game");

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x87c9ed);
scene.fog = new THREE.FogExp2(0x87c9ed, 0.0014);

const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
});

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.5)
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputEncoding = THREE.sRGBEncoding;

gameContainer.appendChild(renderer.domElement);

/* LIGHTING */

const sunlight = new THREE.DirectionalLight(
    0xffffff,
    1.6
);

sunlight.position.set(200, 300, 100);

sunlight.castShadow = true;

sunlight.shadow.mapSize.width = 1024;
sunlight.shadow.mapSize.height = 1024;

sunlight.shadow.camera.left = -180;
sunlight.shadow.camera.right = 180;
sunlight.shadow.camera.top = 180;
sunlight.shadow.camera.bottom = -180;

scene.add(sunlight);

const ambientLight = new THREE.HemisphereLight(
    0xcceeff,
    0x446677,
    1.1
);

scene.add(ambientLight);

/* GAME VARIABLES */

let gameStarted = false;

let money = 0;
let fuel = 100;
let health = 100;

let speed = 0;
let throttle = 0;
let steering = 0;

let maxSpeed = 24;
let engineLevel = 1;

let cameraMode = 0;

let shipHeading = 0;

let currentMission = 0;

let lastTime = performance.now();

let elapsed = 0;

const keys = {
    forward: false,
    reverse: false,
    left: false,
    right: false
};

const ports = [];

const obstacles = [];

const oceanSize = 3500;

/* MATERIAL HELPER */

function material(color, roughness = 0.75) {

    return new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness: 0.1
    });

}

/* BOX HELPER */

function createBox(
    width,
    height,
    depth,
    color,
    x = 0,
    y = 0,
    z = 0
) {

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        material(color)
    );

    mesh.position.set(x, y, z);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;

}

/* OCEAN */

const oceanGeometry = new THREE.PlaneGeometry(
    oceanSize,
    oceanSize,
    90,
    90
);

oceanGeometry.rotateX(-Math.PI / 2);

const oceanMaterial = new THREE.MeshStandardMaterial({

    color: 0x0879ac,
    roughness: 0.35,
    metalness: 0.25,
    transparent: true,
    opacity: 0.97,
    flatShading: true

});

const ocean = new THREE.Mesh(
    oceanGeometry,
    oceanMaterial
);

ocean.receiveShadow = true;

scene.add(ocean);

const oceanPositions =
    oceanGeometry.attributes.position;

const originalOcean = new Float32Array(
    oceanPositions.array
);

/* SKY SUN */

const sunMesh = new THREE.Mesh(

    new THREE.SphereGeometry(35, 24, 16),

    new THREE.MeshBasicMaterial({
        color: 0xffe6a3
    })

);

sunMesh.position.set(-600, 400, -900);

scene.add(sunMesh);

/* SHIP */

const ship = new THREE.Group();

scene.add(ship);

ship.position.set(0, 0, 0);

const hullMaterial = material(0x172d43);

const hull = new THREE.Mesh(

    new THREE.BoxGeometry(15, 8, 65),

    hullMaterial

);

hull.position.y = 3;

hull.castShadow = true;

ship.add(hull);

/* SHIP BOW */

const bowGeometry = new THREE.ConeGeometry(
    10.6,
    17,
    4
);

const bow = new THREE.Mesh(
    bowGeometry,
    hullMaterial
);

bow.rotation.x = Math.PI / 2;
bow.rotation.y = Math.PI / 4;

bow.position.set(0, 3, -39);

bow.scale.set(1, 0.9, 0.7);

ship.add(bow);

/* RED LOWER HULL */

const lowerHull = createBox(
    14.7,
    2.5,
    62,
    0x9e302c,
    0,
    -1,
    0
);

ship.add(lowerHull);

/* DECK */

const deck = createBox(
    14.8,
    1,
    61,
    0x52606b,
    0,
    7.5,
    0
);

ship.add(deck);

/* SHIP BRIDGE */

const bridgeBase = createBox(
    13,
    10,
    12,
    0xe8e8dc,
    0,
    13,
    24
);

ship.add(bridgeBase);

const bridgeTop = createBox(
    14,
    5,
    13,
    0xf4f4eb,
    0,
    20,
    24
);

ship.add(bridgeTop);

const bridgeRoof = createBox(
    15,
    1,
    14,
    0xeeeeee,
    0,
    23,
    24
);

ship.add(bridgeRoof);

/* BRIDGE WINDOWS */

for (let i = -5; i <= 5; i += 2.5) {

    const windowMesh = createBox(
        1.8,
        2,
        0.2,
        0x153d59,
        i,
        20,
        17.4
    );

    ship.add(windowMesh);

}

/* SMOKESTACK */

const smokestack = createBox(
    5,
    8,
    5,
    0x202a35,
    0,
    28,
    28
);

ship.add(smokestack);

/* CONTAINERS */

const containerColors = [
    0xd94835,
    0x2878b9,
    0xe4a62d,
    0x29865d,
    0xdddddd,
    0x914caa
];

function addContainer(x, y, z, color) {

    const container = createBox(
        5.8,
        4.5,
        9,
        color,
        x,
        y,
        z
    );

    ship.add(container);

    const stripeMaterial = material(0x333333);

    for (let i = -2; i <= 2; i++) {

        const stripe = new THREE.Mesh(

            new THREE.BoxGeometry(
                0.07,
                4.2,
                0.08
            ),

            stripeMaterial

        );

        stripe.position.set(
            x + i * 1.05,
            y,
            z - 4.55
        );

        ship.add(stripe);

    }

}

for (let row = 0; row < 2; row++) {

    for (let column = 0; column < 4; column++) {

        for (let level = 0; level < 3; level++) {

            addContainer(

                row === 0 ? -3.3 : 3.3,

                10.2 + level * 4.6,

                -25 + column * 10,

                containerColors[
                    (row + column + level) %
                    containerColors.length
                ]

            );

        }

    }

}

/* SHIP RAILINGS */

for (let side of [-1, 1]) {

    for (let z = -29; z < 30; z += 5) {

        const post = createBox(
            0.2,
            2,
            0.2,
            0xcccccc,
            side * 7.3,
            9,
            z
        );

        ship.add(post);

    }

}

/* SHIP NAVIGATION LIGHTS */

const redLight = new THREE.Mesh(

    new THREE.SphereGeometry(0.7, 8, 8),

    new THREE.MeshBasicMaterial({
        color: 0xff2222
    })

);

redLight.position.set(-7.5, 10, -28);

ship.add(redLight);

const greenLight = new THREE.Mesh(

    new THREE.SphereGeometry(0.7, 8, 8),

    new THREE.MeshBasicMaterial({
        color: 0x22ff66
    })

);

greenLight.position.set(7.5, 10, -28);

ship.add(greenLight);

/* ISLAND GENERATOR */

function createIsland(x, z, radius) {

    const island = new THREE.Group();

    island.position.set(x, 0, z);

    const sand = new THREE.Mesh(

        new THREE.CylinderGeometry(
            radius * 0.8,
            radius,
            10,
            12
        ),

        material(0xcbb77c)

    );

    sand.position.y = 1;

    sand.receiveShadow = true;

    island.add(sand);

    const grass = new THREE.Mesh(

        new THREE.CylinderGeometry(
            radius * 0.72,
            radius * 0.8,
            5,
            12
        ),

        material(0x4e9450)

    );

    grass.position.y = 7;

    grass.receiveShadow = true;

    island.add(grass);

    /* TREES */

    for (let i = 0; i < 12; i++) {

        const angle = Math.random() * Math.PI * 2;

        const distance = Math.random() * radius * 0.55;

        const tx = Math.cos(angle) * distance;
        const tz = Math.sin(angle) * distance;

        const trunk = new THREE.Mesh(

            new THREE.CylinderGeometry(
                0.7,
                1,
                9,
                6
            ),

            material(0x775337)

        );

        trunk.position.set(tx, 15, tz);

        island.add(trunk);

        const leaves = new THREE.Mesh(

            new THREE.ConeGeometry(
                5,
                15,
                7
            ),

            material(0x267743)

        );

        leaves.position.set(tx, 24, tz);

        island.add(leaves);

    }

    scene.add(island);

    obstacles.push({
        x,
        z,
        radius: radius * 0.85
    });

}

/* PORT GENERATOR */

function createPort(name, x, z, color) {

    const port = new THREE.Group();

    port.position.set(x, 0, z);

    /* LAND */

    const land = createBox(
        130,
        9,
        110,
        0x9c9d8e,
        0,
        3,
        0
    );

    port.add(land);

    /* CONCRETE DOCK */

    const dock = createBox(
        85,
        3,
        40,
        0x666e74,
        0,
        3,
        -65
    );

    port.add(dock);

    /* WAREHOUSES */

    for (let i = 0; i < 3; i++) {

        const warehouse = createBox(
            25,
            17,
            25,
            0xddddcf,
            -35 + i * 35,
            16,
            20
        );

        port.add(warehouse);

        const roof = createBox(
            27,
            2,
            27,
            0x31516b,
            -35 + i * 35,
            25,
            20
        );

        port.add(roof);

    }

    /* CRANES */

    for (let i = 0; i < 2; i++) {

        const crane = new THREE.Group();

        crane.position.set(
            -25 + i * 50,
            0,
            -45
        );

        const tower = createBox(
            3,
            55,
            3,
            color,
            0,
            31,
            0
        );

        crane.add(tower);

        const arm = createBox(
            60,
            3,
            3,
            color,
            0,
            58,
            -10
        );

        arm.rotation.y = Math.PI / 2;

        crane.add(arm);

        const cable = createBox(
            0.3,
            25,
            0.3,
            0x222222,
            0,
            44,
            -30
        );

        crane.add(cable);

        port.add(crane);

    }

    /* PORT CONTAINERS */

    for (let i = 0; i < 10; i++) {

        const container = createBox(
            8,
            6,
            13,
            containerColors[
                i % containerColors.length
            ],
            -50 + (i % 5) * 23,
            10,
            45 + Math.floor(i / 5) * 15
        );

        port.add(container);

    }

    /* LIGHTHOUSE */

    const lighthouse = new THREE.Mesh(

        new THREE.CylinderGeometry(
            3,
            4,
            35,
            12
        ),

        material(0xf1eeee)

    );

    lighthouse.position.set(53, 25, -35);

    port.add(lighthouse);

    const beacon = new THREE.Mesh(

        new THREE.SphereGeometry(4, 12, 8),

        new THREE.MeshBasicMaterial({
            color: 0xffff66
        })

    );

    beacon.position.set(53, 45, -35);

    port.add(beacon);

    /* DESTINATION MARKER */

    const marker = new THREE.Mesh(

        new THREE.TorusGeometry(
            17,
            1.2,
            8,
            32
        ),

        new THREE.MeshBasicMaterial({
            color: 0x00ffbb
        })

    );

    marker.rotation.x = Math.PI / 2;

    marker.position.set(0, 1.5, -115);

    port.add(marker);

    scene.add(port);

    ports.push({
        name,
        x,
        z,
        marker,
        arrivalX: x,
        arrivalZ: z - 115
    });

    obstacles.push({
        x,
        z,
        radius: 65
    });

}

/* CREATE WORLD */

createPort(
    "Harbor City",
    0,
    180,
    0xffbb33
);

createPort(
    "Bluewater Port",
    550,
    -450,
    0xffaa22
);

createPort(
    "Emerald Harbor",
    -650,
    -700,
    0xffcc33
);

createPort(
    "Sunset Terminal",
    900,
    500,
    0xffbb33
);

createIsland(
    300,
    150,
    80
);

createIsland(
    -350,
    -200,
    100
);

createIsland(
    150,
    -650,
    70
);

createIsland(
    -900,
    250,
    120
);

createIsland(
    700,
    -100,
    65
);

/* CLOUDS */

function createCloud(x, y, z) {

    const cloud = new THREE.Group();

    for (let i = 0; i < 5; i++) {

        const puff = new THREE.Mesh(

            new THREE.SphereGeometry(
                20 + Math.random() * 15,
                8,
                6
            ),

            new THREE.MeshBasicMaterial({
                color: 0xffffff
            })

        );

        puff.position.set(
            i * 18,
            Math.random() * 8,
            Math.random() * 10
        );

        puff.scale.y = 0.5;

        cloud.add(puff);

    }

    cloud.position.set(x, y, z);

    scene.add(cloud);

}

for (let i = 0; i < 18; i++) {

    createCloud(

        (Math.random() - 0.5) * 2500,

        160 + Math.random() * 100,

        (Math.random() - 0.5) * 2500

    );

}

/* DESTINATION */

let destination = ports[1];

function updateMission() {

    destination = ports[
        (currentMission + 1) % ports.length
    ];

    document.getElementById(
        "missionText"
    ).textContent =
        "Deliver containers to " +
        destination.name;

}

updateMission();

/* CAMERA */

const cameraTarget = new THREE.Vector3();

function updateCamera(delta) {

    const offsets = [

        new THREE.Vector3(0, 48, 115),

        new THREE.Vector3(0, 90, 160),

        new THREE.Vector3(0, 22, 40),

        new THREE.Vector3(90, 55, 40)

    ];

    const offset = offsets[cameraMode].clone();

    offset.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        ship.rotation.y
    );

    const desiredPosition = ship.position.clone()
        .add(offset);

    camera.position.lerp(
        desiredPosition,
        Math.min(1, delta * 3)
    );

    cameraTarget.copy(ship.position);

    cameraTarget.y += 8;

    camera.lookAt(cameraTarget);

}

/* SHIP PHYSICS */

function updateShip(delta) {

    if (keys.forward && fuel > 0) {

        throttle += delta * 0.35;

    } else if (keys.reverse) {

        throttle -= delta * 0.4;

    } else {

        throttle *= Math.pow(0.94, delta * 60);

    }

    throttle = THREE.MathUtils.clamp(
        throttle,
        -0.35,
        1
    );

    if (fuel <= 0 && throttle > 0) {
        throttle = 0;
    }

    const targetSpeed = throttle * maxSpeed;

    speed += (
        targetSpeed - speed
    ) * Math.min(1, delta * 0.55);

    steering = 0;

    if (keys.left) {
        steering = 1;
    }

    if (keys.right) {
        steering = -1;
    }

    if (Math.abs(speed) > 0.4) {

        shipHeading +=
            steering *
            delta *
            0.22 *
            (Math.abs(speed) / maxSpeed) *
            Math.sign(speed);

    }

    ship.rotation.y = shipHeading;

    const movement = speed * delta;

    ship.position.x +=
        Math.sin(shipHeading) * -movement;

    ship.position.z +=
        Math.cos(shipHeading) * -movement;

    /* SHIP FLOATING */

    ship.position.y =
        Math.sin(elapsed * 1.6) * 0.35;

    ship.rotation.z =
        Math.sin(elapsed * 1.1) * 0.012;

    ship.rotation.x =
        Math.sin(elapsed * 1.3) * 0.008;

    /* FUEL */

    if (Math.abs(speed) > 1) {

        fuel -=
            Math.abs(throttle) *
            delta *
            0.045;

    }

    fuel = Math.max(0, fuel);

    /* COLLISION */

    for (const obstacle of obstacles) {

        const dx = ship.position.x - obstacle.x;
        const dz = ship.position.z - obstacle.z;

        const distance = Math.sqrt(
            dx * dx + dz * dz
        );

        if (distance < obstacle.radius + 8) {

            if (Math.abs(speed) > 4) {

                health -= delta * 8;

            }

            speed *= 0.96;

            const push = obstacle.radius + 8;

            if (distance > 0.001) {

                ship.position.x =
                    obstacle.x + dx / distance * push;

                ship.position.z =
                    obstacle.z + dz / distance * push;

            }

        }

    }

    health = Math.max(0, health);

    if (health <= 0) {

        speed = 0;
        throttle = 0;

        showNotification(
            "Ship damaged! Repair at the upgrade shop."
        );

    }

}

/* OCEAN WAVES */

function updateOcean() {

    const positions =
        ocean.geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {

        const x = originalOcean[i * 3];

        const z = originalOcean[i * 3 + 2];

        const wave1 =
            Math.sin(x * 0.018 + elapsed * 1.1) * 1.1;

        const wave2 =
            Math.cos(z * 0.023 + elapsed * 0.9) * 0.7;

        positions.setY(
            i,
            wave1 + wave2
        );

    }

    positions.needsUpdate = true;

    ocean.geometry.computeVertexNormals();

}

/* MISSION SYSTEM */

function updateMissionSystem() {

    const dx =
        ship.position.x - destination.arrivalX;

    const dz =
        ship.position.z - destination.arrivalZ;

    const distance = Math.sqrt(
        dx * dx + dz * dz
    );

    document.getElementById(
        "distanceText"
    ).textContent =
        "Distance: " +
        Math.round(distance) +
        " m";

    if (distance < 55 && Math.abs(speed) < 7) {

        money += 1000;

        fuel = Math.min(100, fuel + 20);

        currentMission++;

        showNotification(
            "📦 CARGO DELIVERED! +$1000"
        );

        updateMission();

    }

    ports.forEach(port => {

        port.marker.material.color.setHex(
            port === destination
                ? 0x00ffbb
                : 0xffaa00
        );

        port.marker.rotation.z += 0.005;

    });

}

/* HUD */

function updateHUD() {

    document.getElementById(
        "money"
    ).textContent = money;

    document.getElementById(
        "fuel"
    ).textContent = Math.round(fuel);

    document.getElementById(
        "health"
    ).textContent = Math.round(health);

    document.getElementById(
        "speed"
    ).textContent = Math.abs(speed).toFixed(1);

    document.getElementById(
        "throttleValue"
    ).textContent =
        Math.round(throttle * 100) + "%";

    document.getElementById(
        "throttleFill"
    ).style.width =
        Math.max(0, throttle * 100) + "%";

    document.getElementById(
        "compass"
    ).style.transform =
        "rotate(" +
        (-shipHeading * 180 / Math.PI) +
        "deg)";

}

/* NOTIFICATIONS */

let notificationTimeout;

function showNotification(message) {

    const notification =
        document.getElementById("notification");

    notification.textContent = message;

    notification.classList.add("show");

    clearTimeout(notificationTimeout);

    notificationTimeout = setTimeout(() => {

        notification.classList.remove("show");

    }, 2500);

}

/* BUTTON CONTROLS */

function bindControl(id, key) {

    const button = document.getElementById(id);

    button.addEventListener(
        "pointerdown",
        event => {

            event.preventDefault();

            button.setPointerCapture(event.pointerId);

            keys[key] = true;

            button.classList.add("active");

        }
    );

    function release() {

        keys[key] = false;

        button.classList.remove("active");

    }

    button.addEventListener(
        "pointerup",
        release
    );

    button.addEventListener(
        "pointercancel",
        release
    );

    button.addEventListener(
        "lostpointercapture",
        release
    );

}

bindControl("forwardButton", "forward");
bindControl("reverseButton", "reverse");
bindControl("leftButton", "left");
bindControl("rightButton", "right");

/* KEYBOARD */

window.addEventListener("keydown", event => {

    if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "]
        .includes(event.key)
    ) {
        event.preventDefault();
    }

    switch (event.key.toLowerCase()) {

        case "w":
        case "arrowup":
            keys.forward = true;
            break;

        case "s":
        case "arrowdown":
            keys.reverse = true;
            break;

        case "a":
        case "arrowleft":
          keys.left = true;
            break;

        case "d":
        case "arrowright":
            keys.right = true;
            break;

        case "c":
            cameraMode = (cameraMode + 1) % 4;
            break;

    }

});

window.addEventListener("keyup", event => {

    switch (event.key.toLowerCase()) {

        case "w":
        case "arrowup":
            keys.forward = false;
            break;

        case "s":
        case "arrowdown":
            keys.reverse = false;
            break;

        case "a":
        case "arrowleft":
            keys.left = false;
            break;

        case "d":
        case "arrowright":
            keys.right = false;
            break;

    }

});

/* CAMERA BUTTON */

document.getElementById(
    "cameraButton"
).addEventListener("click", () => {

    cameraMode = (cameraMode + 1) % 4;

    showNotification(
        "Camera Mode " + (cameraMode + 1)
    );

});

/* HORN SOUND */

let audioContext;

function playHorn() {

    try {

        audioContext = audioContext ||
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        oscillator.type = "sawtooth";

        oscillator.frequency.setValueAtTime(
            110,
            audioContext.currentTime
        );

        gain.gain.setValueAtTime(
            0.15,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + 1.2
        );

        oscillator.connect(gain);

        gain.connect(
            audioContext.destination
        );

        oscillator.start();

        oscillator.stop(
            audioContext.currentTime + 1.2
        );

    } catch (error) {

        console.log(error);

    }

}

document.getElementById(
    "hornButton"
).addEventListener("click", playHorn);

/* SHOP */

const shop = document.getElementById("shop");

document.getElementById(
    "shopButton"
).addEventListener("click", () => {

    shop.classList.remove("hidden");

});

document.getElementById(
    "closeShop"
).addEventListener("click", () => {

    shop.classList.add("hidden");

});

document.getElementById(
    "engineUpgrade"
).addEventListener("click", () => {

    if (money >= 500) {

        money -= 500;

        engineLevel++;

        maxSpeed += 5;

        showNotification(
            "Engine upgraded to level " +
            engineLevel
        );

    } else {

        showNotification("Not enough money!");

    }

});

document.getElementById(
    "fuelUpgrade"
).addEventListener("click", () => {

    if (money >= 100) {

        money -= 100;

        fuel = 100;

        showNotification("Ship refueled!");

    } else {

        showNotification("Not enough money!");

    }

});

document.getElementById(
    "repairUpgrade"
).addEventListener("click", () => {

    if (money >= 150) {

        money -= 150;

        health = 100;

        showNotification("Ship repaired!");

    } else {

        showNotification("Not enough money!");

    }

});

/* TOUCH CAMERA ROTATION */

let touchStartX = 0;
let touchStartY = 0;

let draggingCamera = false;

renderer.domElement.addEventListener(
    "pointerdown",
    event => {

        draggingCamera = true;

        touchStartX = event.clientX;
        touchStartY = event.clientY;

    }
);

renderer.domElement.addEventListener(
    "pointermove",
    event => {

        if (!draggingCamera) return;

        const dx = event.clientX - touchStartX;

        if (Math.abs(dx) > 80) {

            cameraMode = (cameraMode + 1) % 4;

            touchStartX = event.clientX;

        }

    }
);

window.addEventListener(
    "pointerup",
    () => {
        draggingCamera = false;
    }
);

/* FULLSCREEN AND LANDSCAPE */

async function enterLandscape() {

    try {

        if (!document.fullscreenElement) {

            await document.documentElement.requestFullscreen();

        }

    } catch (error) {

        console.log(
            "Fullscreen not supported:",
            error
        );

    }

    try {

        if (screen.orientation && screen.orientation.lock) {

            await screen.orientation.lock("landscape");

        }

    } catch (error) {

        console.log(
            "Rotate phone manually if needed."
        );

    }

}

/* PLAY GAME */

document.getElementById(
    "playButton"
).addEventListener("click", async () => {

    await enterLandscape();

    document.getElementById(
        "loadingScreen"
    ).classList.add("hidden");

    document.getElementById(
        "hud"
    ).classList.remove("hidden");

    gameStarted = true;

    showNotification(
        "🚢 Welcome Captain! Deliver your cargo!"
    );

});

/* RESIZE */

function resizeGame() {

    camera.aspect =
        window.innerWidth /
        window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

}

window.addEventListener(
    "resize",
    resizeGame
);

/* GAME LOOP */

function animate(time) {

    requestAnimationFrame(animate);

    const delta = Math.min(
        (time - lastTime) / 1000,
        0.05
    );

    lastTime = time;

    elapsed += delta;

    if (gameStarted) {

        updateShip(delta);

        updateMissionSystem();

        updateHUD();

    }

    updateOcean();

    updateCamera(delta);

    renderer.render(scene, camera);

}

requestAnimationFrame(animate);