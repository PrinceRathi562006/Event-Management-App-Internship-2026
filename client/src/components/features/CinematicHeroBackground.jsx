import { useEffect, useRef } from "react";
import * as THREE from "three";

const PALETTE = {
  navy: "#0B1120",
  blue: "#2563EB",
  cyan: "#38BDF8",
  purple: "#7C3AED",
  white: "#FFFFFF",
  gold: "#FBBF24",
  green: "#22C55E",
};

const SCENE_VARIANTS = {
  events: {
    accent: PALETTE.cyan,
    secondary: PALETTE.purple,
    core: "globe",
    icons: ["calendar", "qr", "ticket", "mic", "stage", "speaker", "pin", "camera", "certificate", "payment", "bell", "user"],
    rootX: 1.72,
    compactX: 0.15,
  },
  login: {
    accent: PALETTE.cyan,
    secondary: PALETTE.blue,
    core: "shield",
    icons: ["shield", "lock", "user", "qr", "scan", "bell", "check", "profile"],
    rootX: 1.86,
    compactX: 0.1,
  },
  signup: {
    accent: PALETTE.cyan,
    secondary: PALETTE.purple,
    core: "profile",
    icons: ["user", "email", "phone", "check", "profile", "certificate", "form", "bell"],
    rootX: 1.74,
    compactX: 0.08,
  },
  dashboard: {
    accent: PALETTE.blue,
    secondary: PALETTE.cyan,
    core: "analytics",
    icons: ["chart", "calendar", "ticket", "qr", "certificate", "bell", "payment", "user"],
    rootX: 1.68,
    compactX: 0.04,
  },
  event: {
    accent: PALETTE.cyan,
    secondary: PALETTE.purple,
    core: "stage",
    icons: ["stage", "ticket", "mic", "speaker", "camera", "calendar", "pin", "bell"],
    rootX: 1.7,
    compactX: 0.08,
  },
  registration: {
    accent: PALETTE.cyan,
    secondary: PALETTE.purple,
    core: "ticket",
    icons: ["form", "ticket", "wallet", "qr", "calendar", "check", "user", "bell"],
    rootX: 1.72,
    compactX: 0.08,
  },
  scanner: {
    accent: PALETTE.green,
    secondary: PALETTE.cyan,
    core: "qr",
    icons: ["qr", "scan", "check", "bell", "chart", "shield", "user", "ticket"],
    rootX: 1.7,
    compactX: 0.08,
  },
  payment: {
    accent: PALETTE.cyan,
    secondary: PALETTE.blue,
    core: "payment",
    icons: ["payment", "wallet", "shield", "ticket", "check", "bell", "qr", "user"],
    rootX: 1.76,
    compactX: 0.08,
  },
  success: {
    accent: PALETTE.green,
    secondary: PALETTE.cyan,
    core: "check",
    icons: ["check", "ticket", "payment", "bell", "certificate", "user", "qr", "calendar"],
    rootX: 1.72,
    compactX: 0.08,
  },
  certificate: {
    accent: PALETTE.gold,
    secondary: PALETTE.cyan,
    core: "certificate",
    icons: ["certificate", "award", "check", "profile", "ticket", "calendar", "bell", "user"],
    rootX: 1.72,
    compactX: 0.08,
  },
  profile: {
    accent: PALETTE.cyan,
    secondary: PALETTE.purple,
    core: "profile",
    icons: ["profile", "award", "certificate", "chart", "user", "bell", "check", "calendar"],
    rootX: 1.7,
    compactX: 0.08,
  },
  notFound: {
    accent: PALETTE.cyan,
    secondary: PALETTE.purple,
    core: "lost",
    icons: ["calendar", "ticket", "pin", "map", "scan", "bell", "qr", "camera"],
    rootX: 1.68,
    compactX: 0.08,
  },
};

function createPanelTexture(seed = 0) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "rgba(56, 189, 248, 0.18)");
  gradient.addColorStop(1, "rgba(124, 58, 237, 0.16)");
  ctx.fillStyle = gradient;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 2;
  ctx.roundRect(14, 14, canvas.width - 28, canvas.height - 28, 28);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(56, 189, 248, 0.48)";
  ctx.lineWidth = 3;
  for (let index = 0; index < 4; index += 1) {
    const y = 58 + index * 36 + seed * 4;
    ctx.beginPath();
    ctx.moveTo(46, y);
    ctx.lineTo(190 + index * 26, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  for (let index = 0; index < 7; index += 1) {
    const height = 26 + ((index * 17 + seed * 9) % 74);
    ctx.roundRect(300 + index * 23, 168 - height, 11, height, 8);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(124, 58, 237, 0.62)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(390, 84, 42, 0.15 + seed * 0.2, Math.PI * 1.55);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

function drawIcon(ctx, type, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const strokeRect = (x, y, width, height, radius = 12) => {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.stroke();
  };

  if (type === "calendar") {
    strokeRect(37, 42, 54, 48);
    ctx.beginPath();
    ctx.moveTo(37, 58);
    ctx.lineTo(91, 58);
    ctx.moveTo(52, 34);
    ctx.lineTo(52, 48);
    ctx.moveTo(76, 34);
    ctx.lineTo(76, 48);
    ctx.stroke();
  } else if (type === "qr") {
    [36, 66].forEach((x) => [38, 68].forEach((y) => ctx.fillRect(x, y, 12, 12)));
    ctx.fillRect(80, 42, 14, 14);
    ctx.fillRect(52, 82, 9, 9);
    ctx.fillRect(78, 78, 17, 17);
  } else if (type === "ticket") {
    strokeRect(33, 47, 62, 38, 8);
    ctx.beginPath();
    ctx.moveTo(58, 50);
    ctx.lineTo(58, 82);
    ctx.stroke();
  } else if (type === "mic") {
    strokeRect(51, 32, 26, 46, 15);
    ctx.beginPath();
    ctx.moveTo(40, 62);
    ctx.quadraticCurveTo(64, 94, 88, 62);
    ctx.moveTo(64, 94);
    ctx.lineTo(64, 104);
    ctx.stroke();
  } else if (type === "stage") {
    ctx.beginPath();
    ctx.moveTo(33, 85);
    ctx.lineTo(95, 85);
    ctx.moveTo(43, 85);
    ctx.lineTo(53, 48);
    ctx.lineTo(75, 48);
    ctx.lineTo(85, 85);
    ctx.moveTo(46, 48);
    ctx.lineTo(82, 48);
    ctx.stroke();
  } else if (type === "speaker") {
    ctx.beginPath();
    ctx.moveTo(34, 58);
    ctx.lineTo(50, 58);
    ctx.lineTo(73, 42);
    ctx.lineTo(73, 88);
    ctx.lineTo(50, 72);
    ctx.lineTo(34, 72);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(76, 65, 16, -0.8, 0.8);
    ctx.stroke();
  } else if (type === "pin") {
    ctx.beginPath();
    ctx.arc(64, 55, 20, 0, Math.PI * 2);
    ctx.moveTo(64, 92);
    ctx.lineTo(49, 68);
    ctx.moveTo(64, 92);
    ctx.lineTo(79, 68);
    ctx.stroke();
  } else if (type === "camera") {
    strokeRect(35, 48, 58, 39, 10);
    ctx.beginPath();
    ctx.arc(64, 68, 13, 0, Math.PI * 2);
    ctx.moveTo(48, 48);
    ctx.lineTo(54, 39);
    ctx.lineTo(76, 39);
    ctx.lineTo(82, 48);
    ctx.stroke();
  } else if (type === "certificate") {
    strokeRect(38, 35, 52, 66, 5);
    ctx.beginPath();
    ctx.moveTo(50, 54);
    ctx.lineTo(78, 54);
    ctx.moveTo(50, 68);
    ctx.lineTo(74, 68);
    ctx.arc(65, 84, 8, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === "payment") {
    strokeRect(32, 46, 64, 44, 9);
    ctx.beginPath();
    ctx.moveTo(32, 60);
    ctx.lineTo(96, 60);
    ctx.moveTo(45, 76);
    ctx.lineTo(62, 76);
    ctx.stroke();
  } else if (type === "bell") {
    ctx.beginPath();
    ctx.moveTo(43, 82);
    ctx.quadraticCurveTo(51, 74, 51, 57);
    ctx.quadraticCurveTo(51, 40, 64, 40);
    ctx.quadraticCurveTo(77, 40, 77, 57);
    ctx.quadraticCurveTo(77, 74, 85, 82);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(64, 91, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "lock") {
    strokeRect(39, 56, 50, 38, 9);
    ctx.beginPath();
    ctx.arc(64, 56, 18, Math.PI, 0);
    ctx.stroke();
  } else if (type === "shield") {
    ctx.beginPath();
    ctx.moveTo(64, 31);
    ctx.lineTo(91, 42);
    ctx.lineTo(86, 78);
    ctx.quadraticCurveTo(64, 98, 42, 78);
    ctx.lineTo(37, 42);
    ctx.closePath();
    ctx.stroke();
  } else if (type === "check") {
    ctx.beginPath();
    ctx.moveTo(38, 66);
    ctx.lineTo(58, 86);
    ctx.lineTo(94, 42);
    ctx.stroke();
  } else if (type === "email") {
    strokeRect(34, 45, 60, 42, 9);
    ctx.beginPath();
    ctx.moveTo(38, 50);
    ctx.lineTo(64, 69);
    ctx.lineTo(90, 50);
    ctx.stroke();
  } else if (type === "phone") {
    strokeRect(47, 32, 34, 68, 10);
    ctx.beginPath();
    ctx.arc(64, 90, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "chart") {
    ctx.beginPath();
    ctx.moveTo(36, 90);
    ctx.lineTo(92, 90);
    ctx.moveTo(46, 78);
    ctx.lineTo(46, 58);
    ctx.moveTo(64, 78);
    ctx.lineTo(64, 44);
    ctx.moveTo(82, 78);
    ctx.lineTo(82, 64);
    ctx.stroke();
  } else if (type === "wallet") {
    strokeRect(34, 48, 62, 40, 9);
    ctx.beginPath();
    ctx.moveTo(78, 67);
    ctx.lineTo(94, 67);
    ctx.stroke();
  } else if (type === "award") {
    ctx.beginPath();
    ctx.arc(64, 52, 18, 0, Math.PI * 2);
    ctx.moveTo(53, 68);
    ctx.lineTo(47, 94);
    ctx.lineTo(64, 84);
    ctx.lineTo(81, 94);
    ctx.lineTo(75, 68);
    ctx.stroke();
  } else if (type === "form") {
    strokeRect(38, 34, 52, 68, 8);
    ctx.beginPath();
    ctx.moveTo(51, 55);
    ctx.lineTo(78, 55);
    ctx.moveTo(51, 70);
    ctx.lineTo(78, 70);
    ctx.moveTo(51, 85);
    ctx.lineTo(67, 85);
    ctx.stroke();
  } else if (type === "scan") {
    ctx.beginPath();
    ctx.moveTo(36, 51);
    ctx.lineTo(36, 38);
    ctx.lineTo(50, 38);
    ctx.moveTo(78, 38);
    ctx.lineTo(92, 38);
    ctx.lineTo(92, 51);
    ctx.moveTo(92, 77);
    ctx.lineTo(92, 90);
    ctx.lineTo(78, 90);
    ctx.moveTo(50, 90);
    ctx.lineTo(36, 90);
    ctx.lineTo(36, 77);
    ctx.moveTo(42, 64);
    ctx.lineTo(86, 64);
    ctx.stroke();
  } else if (type === "map") {
    ctx.beginPath();
    ctx.moveTo(36, 45);
    ctx.lineTo(54, 37);
    ctx.lineTo(74, 45);
    ctx.lineTo(92, 37);
    ctx.lineTo(92, 86);
    ctx.lineTo(74, 94);
    ctx.lineTo(54, 86);
    ctx.lineTo(36, 94);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(64, 52, 14, 0, Math.PI * 2);
    ctx.moveTo(38, 96);
    ctx.quadraticCurveTo(64, 69, 90, 96);
    ctx.stroke();
  }
}

function createIconTexture(type, color = PALETTE.cyan) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.24)");
  gradient.addColorStop(1, "rgba(56, 189, 248, 0.04)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(64, 64, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();

  drawIcon(ctx, type, color);
  return new THREE.CanvasTexture(canvas);
}

function createGlobePoints(count = 190, radius = 2.05) {
  const points = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < count; index += 1) {
    const y = 1 - (index / (count - 1)) * 2;
    const circleRadius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * index;
    points.push(new THREE.Vector3(Math.cos(theta) * circleRadius * radius, y * radius, Math.sin(theta) * circleRadius * radius));
  }

  return points;
}

function createConnectionGeometry(points) {
  const positions = [];

  points.forEach((point, index) => {
    for (let otherIndex = index + 1; otherIndex < points.length; otherIndex += 1) {
      const other = points[otherIndex];
      const distance = point.distanceTo(other);
      if (distance > 0.5 && distance < 0.72 && (index + otherIndex) % 3 === 0) {
        positions.push(point.x, point.y, point.z, other.x, other.y, other.z);
      }
    }
  });

  return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
}

function createParticleGeometry(count = 360) {
  const positions = [];

  for (let index = 0; index < count; index += 1) {
    const radius = 4 + Math.random() * 7;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions.push(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
  }

  return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
}

function CinematicHeroBackground({ className = "", variant = "events" }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }

    const sceneConfig = SCENE_VARIANTS[variant] || SCENE_VARIANTS.events;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 80);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    const clock = new THREE.Clock();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const root = new THREE.Group();
    const globe = new THREE.Group();
    const orbit = new THREE.Group();
    const iconGroup = new THREE.Group();
    const panelGroup = new THREE.Group();

    scene.add(root);
    root.add(globe, orbit, iconGroup, panelGroup);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.96, 64, 64),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(PALETTE.navy),
        emissive: new THREE.Color(sceneConfig.secondary),
        emissiveIntensity: 0.08,
        metalness: 0.52,
        roughness: 0.16,
        transparent: true,
        opacity: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      })
    );
    globe.add(core);

    if (sceneConfig.core !== "globe") {
      const coreBadge = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createIconTexture(sceneConfig.core, sceneConfig.accent),
          transparent: true,
          opacity: 0.74,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      coreBadge.position.set(0, 0, 2.08);
      coreBadge.scale.setScalar(1.08);
      globe.add(coreBadge);
    }

    const points = createGlobePoints();
    const pointGeometry = new THREE.BufferGeometry().setFromPoints(points);
    globe.add(
      new THREE.Points(
        pointGeometry,
        new THREE.PointsMaterial({
          color: PALETTE.cyan,
          size: 0.052,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
    );

    globe.add(
      new THREE.LineSegments(
        createConnectionGeometry(points),
        new THREE.LineBasicMaterial({
          color: sceneConfig.secondary,
          transparent: true,
          opacity: 0.34,
          blending: THREE.AdditiveBlending,
        })
      )
    );

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: PALETTE.cyan,
      transparent: true,
      opacity: 0.23,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    [2.3, 2.62, 3.02].forEach((radius, index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.009, 10, 180), ringMaterial.clone());
      ring.rotation.set(index * 0.8, index * 0.48, index * 0.26);
      orbit.add(ring);
    });

    const particleSystem = new THREE.Points(
      createParticleGeometry(),
      new THREE.PointsMaterial({
        color: PALETTE.white,
        size: 0.024,
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    root.add(particleSystem);

    const trailMaterial = new THREE.LineBasicMaterial({
      color: sceneConfig.secondary,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
    });
    for (let index = 0; index < 9; index += 1) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.8 + index * 0.18, -1.7 + index * 0.12, -1.4),
        new THREE.Vector3(-0.7 + index * 0.1, -0.4 + Math.sin(index) * 0.4, 0.2),
        new THREE.Vector3(2.5 + index * 0.16, 1.1 - index * 0.1, 1.1),
      ]);
      root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(42)), trailMaterial.clone()));
    }

    const iconTypes = sceneConfig.icons;
    const iconSprites = iconTypes.map((type, index) => {
      const material = new THREE.SpriteMaterial({
        map: createIconTexture(type, index % 2 ? sceneConfig.secondary : sceneConfig.accent),
        transparent: true,
        opacity: 0.84,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      const angle = (index / iconTypes.length) * Math.PI * 2;
      sprite.position.set(Math.cos(angle) * 3.25, Math.sin(angle * 1.7) * 1.45, Math.sin(angle) * 2.35);
      sprite.scale.setScalar(index % 3 === 0 ? 0.44 : 0.36);
      sprite.userData = { angle, radius: 3.25, speed: 0.08 + index * 0.004, vertical: Math.sin(angle * 1.7) * 1.45 };
      iconGroup.add(sprite);
      return sprite;
    });

    for (let index = 0; index < 3; index += 1) {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(2.05, 1.03),
        new THREE.MeshBasicMaterial({
          map: createPanelTexture(index),
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      panel.position.set(index === 0 ? 2.95 : 3.65, 1.55 - index * 1.1, -0.95 - index * 0.35);
      panel.rotation.set(-0.08 + index * 0.03, -0.36, 0.03);
      panelGroup.add(panel);
    }

    const geometryMaterial = new THREE.MeshBasicMaterial({
      color: PALETTE.purple,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
    });
    const geometricShapes = Array.from({ length: 6 }, (_, index) => {
      const shape = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26 + (index % 3) * 0.08, 1), geometryMaterial.clone());
      shape.position.set(-0.9 + index * 0.95, -2.2 + (index % 2) * 4.3, -1.8 - index * 0.15);
      root.add(shape);
      return shape;
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.48));
    const cyanLight = new THREE.PointLight(PALETTE.cyan, 34, 16);
    cyanLight.position.set(1.2, 2.3, 4.2);
    scene.add(cyanLight);
    const purpleLight = new THREE.PointLight(PALETTE.purple, 22, 14);
    purpleLight.position.set(4.2, -2.1, 2.2);
    scene.add(purpleLight);

    const setSize = () => {
      const width = mount.clientWidth || 1280;
      const height = mount.clientHeight || 720;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const isCompact = width < 760;
      root.position.set(isCompact ? sceneConfig.compactX : sceneConfig.rootX, isCompact ? -0.35 : 0.05, 0);
      root.scale.setScalar(isCompact ? 0.78 : 1);
      camera.position.set(isCompact ? 0.2 : 0.05, 0.05, isCompact ? 9.6 : 8.4);
      camera.lookAt(root.position.x, root.position.y, 0);
    };

    setSize();
    const observer = new ResizeObserver(setSize);
    observer.observe(mount);

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const loopTime = elapsed % 16;
      const speed = reducedMotion ? 0.2 : 1;

      globe.rotation.y = loopTime * 0.18 * speed;
      globe.rotation.x = Math.sin(loopTime * 0.18) * 0.08;
      orbit.rotation.y = loopTime * 0.1 * speed;
      orbit.rotation.z = Math.sin(loopTime * 0.16) * 0.07;
      particleSystem.rotation.y = loopTime * 0.035 * speed;
      panelGroup.position.y = Math.sin(loopTime * 0.55) * 0.08;

      iconSprites.forEach((sprite, index) => {
        const data = sprite.userData;
        const angle = data.angle + loopTime * data.speed * speed;
        sprite.position.x = Math.cos(angle) * data.radius;
        sprite.position.z = Math.sin(angle) * 2.35;
        sprite.position.y = data.vertical + Math.sin(loopTime * 0.75 + index) * 0.14;
        sprite.material.opacity = 0.58 + Math.sin(loopTime * 1.1 + index) * 0.16;
      });

      geometricShapes.forEach((shape, index) => {
        shape.rotation.x = loopTime * (0.16 + index * 0.02) * speed;
        shape.rotation.y = loopTime * (0.12 + index * 0.03) * speed;
      });

      camera.position.x += (Math.sin(loopTime * 0.22) * 0.16 - camera.position.x) * 0.015;
      camera.position.y += (Math.cos(loopTime * 0.2) * 0.08 - camera.position.y) * 0.015;
      camera.lookAt(root.position.x, root.position.y, 0);
      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material.map) {
              material.map.dispose();
            }
            material.dispose();
          });
        }
      });
      renderer.dispose();
    };
  }, [variant]);

  return <div aria-hidden="true" className={`cinematic-hero-background ${className}`.trim()} ref={mountRef} />;
}

export default CinematicHeroBackground;
