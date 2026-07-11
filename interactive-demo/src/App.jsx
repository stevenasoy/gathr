import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Image } from '@react-three/drei';
import * as THREE from 'three';

const W = 4.2;
const H = 2.625; // 1.6 aspect (1440x900)

const PANELS = [
  { url: '/desk-home.png', pos: [0, 0, 0], accent: '#6c2bd9', seed: 0.0 },
  { url: '/desk-browse.png', pos: [3.7, -0.5, -6.6], accent: '#e0218a', seed: 1.4 },
  { url: '/desk-venue.png', pos: [-3.9, 0.55, -13.2], accent: '#6c2bd9', seed: 2.6 },
  { url: '/desk-venue-mid.png', pos: [3.5, -0.4, -19.8], accent: '#e0218a', seed: 3.7 },
];

// camera waypoints per scroll beat (intro, home, browse, venue, booking, cta)
const WAY = [
  { pos: [0, 0.7, 9.6], look: [0, 0, 0] },
  { pos: [0, 0, 4.5], look: [0, 0, 0] },
  { pos: [3.7, -0.5, -2.1], look: [3.7, -0.5, -6.6] },
  { pos: [-3.9, 0.55, -8.7], look: [-3.9, 0.55, -13.2] },
  { pos: [3.5, -0.4, -15.3], look: [3.5, -0.4, -19.8] },
  { pos: [3.5, 0.9, -13.4], look: [3.5, -0.4, -19.8] },
];

function makeGlow() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  return t;
}

function Panel({ url, pos, accent, seed, glow }) {
  const ref = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      ref.current.position.y = pos[1] + Math.sin(t * 0.55 + seed) * 0.06;
      ref.current.rotation.y = Math.sin(t * 0.4 + seed) * 0.02;
      ref.current.rotation.x = Math.cos(t * 0.35 + seed) * 0.012;
    }
  });
  return (
    <group ref={ref} position={pos}>
      {/* glow halo */}
      <mesh position={[0, 0, -0.08]}>
        <planeGeometry args={[W * 1.55, H * 1.7]} />
        <meshBasicMaterial map={glow} color={accent} transparent opacity={0.85} depthWrite={false} />
      </mesh>
      {/* white card backing */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[W + 0.18, H + 0.18]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.96} depthWrite={false} />
      </mesh>
      <Image url={url} scale={[W, H]} toneMapped={false} transparent />
    </group>
  );
}

function Rig() {
  const scroll = useScroll();
  const look = useRef(new THREE.Vector3(0, 0, 0));
  useFrame((state) => {
    const o = THREE.MathUtils.clamp(scroll.offset, 0, 1);
    const seg = o * (WAY.length - 1);
    const i = Math.min(WAY.length - 2, Math.floor(seg));
    let t = seg - i;
    t = t * t * (3 - 2 * t); // smoothstep
    const a = WAY[i], b = WAY[i + 1];
    state.camera.position.set(
      THREE.MathUtils.lerp(a.pos[0], b.pos[0], t),
      THREE.MathUtils.lerp(a.pos[1], b.pos[1], t),
      THREE.MathUtils.lerp(a.pos[2], b.pos[2], t)
    );
    look.current.set(
      THREE.MathUtils.lerp(a.look[0], b.look[0], t),
      THREE.MathUtils.lerp(a.look[1], b.look[1], t),
      THREE.MathUtils.lerp(a.look[2], b.look[2], t)
    );
    state.camera.lookAt(look.current);
  });
  return null;
}

function Captions() {
  return (
    <Scroll html style={{ width: '100%' }}>
      <section className="cap center">
        <div className="kicker">FOR EVENT ORGANIZERS</div>
        <div className="wordmark">Gathr</div>
        <div className="sub">Book event venues across the Philippines.</div>
      </section>
      <section className="cap">
        <div className="kicker">DISCOVER</div>
        <div className="title">Every venue, in one place.</div>
      </section>
      <section className="cap">
        <div className="kicker">FOR YOUR EVENT</div>
        <div className="title">Venues for every kind of gathering.</div>
        <div className="chip-row">
          <span className="chip">Weddings</span>
          <span className="chip">Offsites</span>
          <span className="chip">Parties</span>
          <span className="chip">Shoots</span>
        </div>
      </section>
      <section className="cap">
        <div className="kicker">SEE IT ALL</div>
        <div className="title">Photos, pricing, capacity — up front.</div>
      </section>
      <section className="cap">
        <div className="kicker">BOOK DIRECT</div>
        <div className="title">Request in minutes. Nothing upfront.</div>
      </section>
      <section className="cap center">
        <div className="wordmark">Gathr</div>
        <div className="sub">Find your place to gather.</div>
        <a className="cta-btn" href="https://gathr.ph" target="_blank" rel="noreferrer">Start free at gathr.ph</a>
      </section>
    </Scroll>
  );
}

export default function App() {
  const glow = useMemo(() => makeGlow(), []);
  return (
    <>
      <div className="brandbug">Gathr</div>
      <div className="scrollhint">Scroll ↓</div>
      <Canvas dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0.7, 9.6], fov: 45 }}>
        <ScrollControls pages={6} damping={0.22}>
          <Rig />
          {PANELS.map((p) => (
            <Panel key={p.url} {...p} glow={glow} />
          ))}
          <Captions />
        </ScrollControls>
      </Canvas>
    </>
  );
}
