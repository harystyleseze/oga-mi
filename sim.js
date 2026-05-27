// sim.js - Three.js-based 3D simulation of Reachy Mini.
//
// Renders the robot using its real URDF + STL meshes from the upstream SDK,
// fetched browser-side from raw.githubusercontent.com (CORS allowed).
// Exposes the same surface as the live ReachyMini SDK so block-generated code
// can target either without changes.
//
// IMPORTANT - visual fidelity caveat:
//   The Stewart platform's 6 legs are not solved via inverse kinematics in v1.
//   Instead, we rotate the head's link transform directly to match the
//   commanded RPY. The legs visually stay static while the head tilts. Body
//   yaw and antennas are driven via their actual URDF joints, so those parts
//   look correct. v2 can layer on real Stewart IK if/when needed.

import * as THREE from 'https://esm.sh/three@0.184.0';
import { OrbitControls } from 'https://esm.sh/three@0.184.0/examples/jsm/controls/OrbitControls.js';
import URDFLoader from 'https://esm.sh/urdf-loader@0.12.7';

// Split hosting strategy:
//   * URDF itself (plain XML, not in LFS) → raw.githubusercontent.com
//   * STL meshes (Git LFS) → media.githubusercontent.com (resolves LFS)
//
// raw.* serves LFS pointer files (131 bytes of "version https://git-lfs..."),
// which STLLoader parses as binary and reads garbage triangle counts (60GB
// Float32Array allocation failures). media.* returns actual binary blobs and
// has access-control-allow-origin: *.
const URDF_RAW_BASE   = 'https://raw.githubusercontent.com/pollen-robotics/reachy_mini/v1.7.1/src/reachy_mini/descriptions/reachy_mini/urdf/';
const URDF_MEDIA_BASE = 'https://media.githubusercontent.com/media/pollen-robotics/reachy_mini/v1.7.1/src/reachy_mini/descriptions/reachy_mini/urdf/';
const URDF_FILE = URDF_RAW_BASE + 'robot_no_collision.urdf';

const deg = d => d * Math.PI / 180;
const rad = r => r * 180 / Math.PI;
const lerp = (a, b, k) => a + (b - a) * k;

export class ReachySim extends EventTarget {
    constructor(container) {
        super();
        this.container = container;
        this.ready = false;
        this.error = null;

        // ---------- Scene ----------
        // Light backdrop so dark details (antennas, eye rims, cable) read
        // clearly against it. We keep the dark app chrome around the tile;
        // only the 3D viewport itself is bright.
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xF3F4F6);
        this.scene.fog = new THREE.Fog(0xF3F4F6, 0.6, 1.4);

        // ---------- Camera ----------
        this.camera = new THREE.PerspectiveCamera(28, 1, 0.01, 10);
        this.camera.position.set(0.42, 0.32, 0.42);

        // ---------- Renderer ----------
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        container.appendChild(this.renderer.domElement);
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.display = 'block';

        // ---------- Lights ----------
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));

        const key = new THREE.DirectionalLight(0xffffff, 1.6);
        key.position.set(0.45, 0.7, 0.5);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left   = -0.4;
        key.shadow.camera.right  =  0.4;
        key.shadow.camera.top    =  0.4;
        key.shadow.camera.bottom = -0.4;
        key.shadow.camera.near = 0.1;
        key.shadow.camera.far  = 2.0;
        key.shadow.bias = -0.0005;
        this.scene.add(key);

        const fill = new THREE.DirectionalLight(0xff8855, 0.45);
        fill.position.set(-0.5, 0.3, -0.4);
        this.scene.add(fill);

        const rim = new THREE.DirectionalLight(0x6688ff, 0.25);
        rim.position.set(0, 0.5, -0.6);
        this.scene.add(rim);

        // ---------- Ground ----------
        const ground = new THREE.Mesh(
            new THREE.CircleGeometry(0.45, 80),
            new THREE.MeshStandardMaterial({
                color: 0xE5E7EB,    // soft gray - gives a hint of a stage
                roughness: 0.9,
                metalness: 0.0,
            })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // ---------- Controls ----------
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0.18, 0);
        this.controls.minDistance = 0.22;
        this.controls.maxDistance = 1.0;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.enablePan = false;
        this.controls.minPolarAngle = Math.PI * 0.10;
        this.controls.maxPolarAngle = Math.PI * 0.55;
        this.controls.update();

        // ---------- Robot state ----------
        this.robot = null;          // URDF root Object3D (set after load)
        this.headLink = null;       // Head Object3D - rotated directly for RPY
        this.headLinkBaseQuat = null;  // Original head orientation (preserved)

        // Two parallel state objects: TARGET (where commanded) and ACTUAL
        // (current rendered). Each frame we lerp ACTUAL → TARGET to mimic
        // the daemon's smooth interpolation.
        this._tgt = {
            head: { roll: 0, pitch: 0, yaw: 0 },   // degrees
            antennas: { right: 0, left: 0 },        // degrees
            body_yaw: 0,                            // degrees
        };
        this._cur = {
            head: { roll: 0, pitch: 0, yaw: 0 },
            antennas: { right: 0, left: 0 },
            body_yaw: 0,
        };
        this._isMoving = false;
        this._asleep = false;       // tracks wake/sleep "mode" (visual only)

        // ---------- Resize ----------
        this._handleResize();
        new ResizeObserver(() => this._handleResize()).observe(container);

        // ---------- Render loop ----------
        this._tick = this._tick.bind(this);
        requestAnimationFrame(this._tick);

        // ---------- Load URDF ----------
        this._loadURDF();
    }

    // ============================================================
    //  URDF + mesh loading
    // ============================================================
    _loadURDF() {
        const loader = new URDFLoader();
        // URDF references meshes as "package://assets/foo.stl". With packages
        // set to a string base, urdf-loader strips "package://" and prepends
        // the base - so meshes resolve to URDF_MEDIA_BASE + "assets/foo.stl".
        // workingPath is for any non-package-prefixed relative mesh paths
        // (none in this URDF, but set defensively).
        loader.packages = URDF_MEDIA_BASE;
        loader.workingPath = URDF_MEDIA_BASE;

        loader.load(
            URDF_FILE,
            (robot) => {
                // URDF uses Z-up; Three.js scene is Y-up. Rotate so robot
                // stands upright. Also gentle scale tweak (URDF is meters).
                robot.rotation.x = -Math.PI / 2;
                robot.position.y = 0;
                robot.traverse((n) => {
                    if (n.isMesh) {
                        n.castShadow = true;
                        n.receiveShadow = true;
                    }
                });

                this.scene.add(robot);
                this.robot = robot;

                this._findHeadLink();

                // ---- DIAG ----
                // Log robot bounding box + renderer size so we can see if the
                // model is being rendered offscreen or at wrong scale.
                const box = new THREE.Box3().setFromObject(robot);
                const size = new THREE.Vector3();  box.getSize(size);
                const center = new THREE.Vector3(); box.getCenter(center);
                console.log('[sim] URDF loaded.');
                console.log('[sim] bbox size:',   size.x.toFixed(3), size.y.toFixed(3), size.z.toFixed(3), 'm');
                console.log('[sim] bbox center:', center.x.toFixed(3), center.y.toFixed(3), center.z.toFixed(3));
                console.log('[sim] joints found:', Object.keys(robot.joints || {}).length,
                            'links:', Object.keys(robot.links || {}).length);
                console.log('[sim] head link:', this.headLink?.name || '(none)');
                console.log('[sim] renderer size:', this.renderer.domElement.width, 'x', this.renderer.domElement.height,
                            '   container:', this.container.clientWidth, 'x', this.container.clientHeight);

                // Auto-frame: re-target camera to robot's actual center & size
                // so wrong assumptions about coordinate frame don't leave the
                // model offscreen. Only adjust if the bounds look sane.
                if (size.length() > 0.05 && size.length() < 100) {
                    const dist = Math.max(size.x, size.y, size.z) * 1.8;
                    this.camera.position.set(
                        center.x + dist * 0.7,
                        center.y + dist * 0.5,
                        center.z + dist * 0.7
                    );
                    this.controls.target.copy(center);
                    this.controls.update();
                    console.log('[sim] auto-framed; camera at', this.camera.position.toArray().map(n => n.toFixed(3)));
                }
                // Force a renderer resize in case container was 0×0 at init.
                this._handleResize();

                this.ready = true;
                this.dispatchEvent(new CustomEvent('ready'));
            },
            undefined,
            (err) => {
                console.error('[sim] URDF load failed:', err);
                this.error = err;
                this.dispatchEvent(new CustomEvent('error', { detail: err }));
            }
        );
    }

    // Find the link that actually carries the visible head geometry. The
    // URDF's "head" link is a logical frame with zero meshes; the head shell,
    // antennas, camera, etc. all hang off "xl_330" (the Stewart platform's
    // top plate, which is the parent of "head" via the fixed head_frame joint).
    // So we rotate xl_330 - physically incorrect (the Stewart legs stay put)
    // but visually correct for the head pose. Falls back to any link with the
    // most meshes if the URDF gets renamed in a future version.
    _findHeadLink() {
        if (!this.robot || !this.robot.links) return;
        // Preferred: xl_330 (visible Stewart platform top + head children).
        // Then: anything matching 'head*' that has meshes.
        // Finally: link with the most descendant meshes.
        if (this.robot.links['xl_330']) {
            this.headLink = this.robot.links['xl_330'];
        }
        if (!this.headLink) {
            let bestName = null, bestCount = 0;
            for (const [name, link] of Object.entries(this.robot.links)) {
                let count = 0;
                link.traverse(n => { if (n.isMesh) count++; });
                if (name.toLowerCase().includes('head') && count > bestCount) {
                    bestName = name; bestCount = count;
                }
            }
            if (bestName) this.headLink = this.robot.links[bestName];
        }
        if (this.headLink) {
            this.headLinkBaseQuat = this.headLink.quaternion.clone();
            let meshCount = 0;
            this.headLink.traverse(n => { if (n.isMesh) meshCount++; });
            console.log('[sim] head pivot link:', this.headLink.name || '(unnamed)',
                        '- subtree mesh count:', meshCount,
                        '- initial quat:', this.headLinkBaseQuat.toArray().map(n => n.toFixed(3)));
        } else {
            console.warn('[sim] could not find head pivot link; head RPY will be ignored');
        }
    }

    // ============================================================
    //  Render loop
    // ============================================================
    _tick() {
        requestAnimationFrame(this._tick);

        // Smooth-lerp current state toward targets. ~12% per frame at 60fps
        // ≈ 200ms time-to-arrive, matching the daemon's interpolation feel.
        const k = 0.12;
        this._cur.head.roll  = lerp(this._cur.head.roll,  this._tgt.head.roll,  k);
        this._cur.head.pitch = lerp(this._cur.head.pitch, this._tgt.head.pitch, k);
        this._cur.head.yaw   = lerp(this._cur.head.yaw,   this._tgt.head.yaw,   k);
        this._cur.body_yaw   = lerp(this._cur.body_yaw,   this._tgt.body_yaw,   k);
        this._cur.antennas.right = lerp(this._cur.antennas.right, this._tgt.antennas.right, k);
        this._cur.antennas.left  = lerp(this._cur.antennas.left,  this._tgt.antennas.left,  k);

        const eps = 0.4;
        this._isMoving =
            Math.abs(this._cur.head.roll  - this._tgt.head.roll)  > eps ||
            Math.abs(this._cur.head.pitch - this._tgt.head.pitch) > eps ||
            Math.abs(this._cur.head.yaw   - this._tgt.head.yaw)   > eps ||
            Math.abs(this._cur.body_yaw   - this._tgt.body_yaw)   > eps ||
            Math.abs(this._cur.antennas.right - this._tgt.antennas.right) > eps ||
            Math.abs(this._cur.antennas.left  - this._tgt.antennas.left)  > eps;

        if (this.robot) this._applyToURDF();

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    _applyToURDF() {
        const c = this._cur;
        // Body yaw - actual joint
        if (this.robot.joints?.['yaw_body']) {
            this.robot.setJointValue('yaw_body', deg(c.body_yaw));
        }
        // Antennas - actual joints
        if (this.robot.joints?.['right_antenna']) {
            this.robot.setJointValue('right_antenna', deg(c.antennas.right));
        }
        if (this.robot.joints?.['left_antenna']) {
            this.robot.setJointValue('left_antenna', deg(c.antennas.left));
        }
        // Head - rotate the head link's quaternion directly.
        // We set the quaternion as (baseQuat * RPY-rotation) so the head's
        // intrinsic orientation (from URDF) is preserved while RPY is applied
        // on top in the head's local frame. Then force the local matrix to
        // recompute so urdf-loader's downstream traversals see our change.
        if (this.headLink && this.headLinkBaseQuat) {
            const e = new THREE.Euler(
                deg(c.head.roll),
                deg(c.head.pitch),
                deg(c.head.yaw),
                'XYZ'
            );
            const q = new THREE.Quaternion().setFromEuler(e);
            this.headLink.quaternion.multiplyQuaternions(this.headLinkBaseQuat, q);
            this.headLink.updateMatrix();
            this.headLink.updateMatrixWorld(true);
        }
    }

    _handleResize() {
        if (!this.container) return;
        const w = this.container.clientWidth || 1;
        const h = this.container.clientHeight || 1;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
    }

    // ============================================================
    //  Public API - mirrors live ReachyMini SDK so block-generated
    //  code can target either without conditional logic.
    // ============================================================

    setHeadRpyDeg(roll, pitch, yaw) {
        this._tgt.head = {
            roll: clamp(Number(roll) || 0, -40, 40),
            pitch: clamp(Number(pitch) || 0, -40, 40),
            yaw: clamp(Number(yaw) || 0, -180, 180),
        };
    }

    setAntennasDeg(rightDeg, leftDeg) {
        this._tgt.antennas = {
            right: clamp(Number(rightDeg) || 0, -175, 175),
            left:  clamp(Number(leftDeg)  || 0, -175, 175),
        };
    }

    setBodyYawDeg(yawDeg) {
        this._tgt.body_yaw = clamp(Number(yawDeg) || 0, -160, 160);
    }

    // SDK-compat: setTarget accepts {head: number[16], antennas: [r,l] in rad,
    // body_yaw: rad}. We only support antennas + body_yaw for v1; head matrix
    // would need full 4×4 → RPY conversion, which we'd add later.
    setTarget({ head, antennas, body_yaw } = {}) {
        if (Array.isArray(antennas) && antennas.length === 2) {
            this.setAntennasDeg(rad(antennas[0]), rad(antennas[1]));
        }
        if (typeof body_yaw === 'number') {
            this.setBodyYawDeg(rad(body_yaw));
        }
        // head matrix → RPY: TODO
    }

    async wakeUp() {
        this._asleep = false;
        this.setHeadRpyDeg(0, -8, 0);
        this.setAntennasDeg(20, -20);
        await this._wait(300);
        this.setAntennasDeg(0, 0);
        this.setHeadRpyDeg(0, 0, 0);
        await this._wait(400);
    }

    async gotoSleep() {
        this._asleep = true;
        this.setHeadRpyDeg(0, 25, 0);   // head dips forward
        this.setAntennasDeg(-30, 30);
        await this._wait(800);
    }

    isAwake() { return !this._asleep; }
    ensureAwake() { return Promise.resolve(); }

    playSound(file) {
        // No speakers in sim - surface as an event so the UI can show a toast.
        this.dispatchEvent(new CustomEvent('playSound', { detail: { file } }));
    }
    setMotorMode(mode) {
        this.dispatchEvent(new CustomEvent('motorMode', { detail: { mode } }));
    }
    setVolume(v) { return Promise.resolve(v); }
    getVersion() { return Promise.resolve('sim'); }

    // Sensing accessors (read from CURRENT, smooth-lerped state)
    getHeadRpy()  { return { ...this._cur.head }; }
    getBodyYaw()  { return this._cur.body_yaw; }
    getAntennas() { return { ...this._cur.antennas }; }
    isMoving()    { return this._isMoving; }

    // ---- Convenience ----
    resetView() {
        this.camera.position.set(0.42, 0.32, 0.42);
        this.controls.target.set(0, 0.18, 0);
        this.controls.update();
    }

    _wait(ms) { return new Promise(r => setTimeout(r, ms)); }
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
