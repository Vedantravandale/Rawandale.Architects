(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let canvas = null;
  let context = null;
  let particles = [];
  let frame = 0;
  let lastBurst = 0;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;

  const resize = () => {
    if (!canvas || !context) return;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const burst = () => {
    const x = width * (0.12 + Math.random() * 0.76);
    const y = height * (0.12 + Math.random() * 0.42);
    const colors = ["#d4ae73", "#eee3ca", "#b7b8ae"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const count = 22 + Math.floor(Math.random() * 11);
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.12;
      const speed = 0.7 + Math.random() * 1.7;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
        life: 46 + Math.random() * 35,
        size: 0.8 + Math.random() * 1.2,
        color
      });
    }
  };

  const animate = now => {
    if (!canvas || !context) return;
    context.clearRect(0, 0, width, height);
    if (now - lastBurst > 1900) {
      burst();
      lastBurst = now;
    }
    particles = particles.filter(p => p.age < p.life);
    context.save();
    context.globalCompositeOperation = "lighter";
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.014;
      p.vx *= 0.986;
      p.vy *= 0.986;
      p.age += 1;
      context.globalAlpha = Math.max(0, 0.68 * (1 - p.age / p.life));
      context.fillStyle = p.color;
      context.fillRect(p.x, p.y, p.size, p.size);
    }
    context.restore();
    frame = window.requestAnimationFrame(animate);
  };

  const stop = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    particles = [];
    canvas?.remove();
    canvas = null;
    context = null;
  };

  const start = () => {
    if (canvas || reduceMotion.matches) return;
    canvas = document.createElement("canvas");
    canvas.className = "diwali-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.append(canvas);
    context = canvas.getContext("2d");
    resize();
    lastBurst = 0;
    frame = window.requestAnimationFrame(animate);
  };

  const sync = async () => {
    try {
      const response = await fetch("/api/site-settings", { cache: "no-store" });
      if (!response.ok) return;
      const settings = await response.json();
      if (settings.diwaliFestive) start();
      else stop();
    } catch {
      stop();
    }
  };

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) sync();
  });
  reduceMotion.addEventListener?.("change", () => reduceMotion.matches ? stop() : sync());
  window.setInterval(sync, 45000);
  sync();
})();

