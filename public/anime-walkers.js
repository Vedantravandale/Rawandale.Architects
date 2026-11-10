(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let stage = null;
  let refreshTimer = 0;

  const naruto = `
    <button class="anime-walker walker-naruto" type="button" data-duration="30000" aria-label="Naruto. Click to dash forward, or drag to move him.">
      <svg viewBox="0 0 96 124" aria-hidden="true">
        <ellipse cx="48" cy="118" rx="21" ry="4" fill="#171717" opacity=".16"/>
        <g class="walker-bob">
          <path class="walker-leg leg-back" d="M40 84 Q36 99 31 111" fill="none" stroke="#25292d" stroke-width="8" stroke-linecap="round"/>
          <path class="walker-leg leg-front" d="M55 84 Q60 98 63 111" fill="none" stroke="#25292d" stroke-width="8" stroke-linecap="round"/>
          <path d="M26 109 Q33 105 38 111 L38 115 L24 115 Q21 113 26 109 M58 109 Q63 105 68 111 L72 114 Q70 116 57 115Z" fill="#343536"/>
          <path class="walker-arm arm-back" d="M37 68 Q26 76 31 88" fill="none" stroke="#f2b58f" stroke-width="8" stroke-linecap="round"/>
          <path class="walker-arm arm-front" d="M59 68 Q70 77 65 88" fill="none" stroke="#f2b58f" stroke-width="8" stroke-linecap="round"/>
          <path d="M35 65 Q47 59 60 65 L68 88 Q49 98 29 88Z" fill="#ed792b" stroke="#283037" stroke-width="1.8"/>
          <path d="M48 63 L54 64 L57 94 L49 94Z" fill="#30383d"/>
          <path d="M34 73 L62 73 M32 83 L66 83" stroke="#f2a04f" stroke-width="2" opacity=".8"/>
          <circle cx="48" cy="42" r="27" fill="#f2c5a7" stroke="#30343a" stroke-width="1.8"/>
          <path d="M21 43 L14 32 L25 34 L19 23 L31 28 L31 16 L40 25 L47 12 L53 25 L64 16 L64 29 L77 24 L70 37 L80 40 L68 48 L66 39 Q58 34 52 29 Q43 36 35 30 Q31 39 23 47Z" fill="#f0b82e" stroke="#4b3d25" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M25 35 Q48 27 71 35 L70 44 Q48 38 26 45Z" fill="#343b42" stroke="#25292d" stroke-width="1.2"/>
          <path d="M38 34 Q48 31 58 34 L57 41 Q48 39 39 42Z" fill="#d9d7cb" stroke="#6b6c69" stroke-width="1"/>
          <path d="M43 37 Q48 33 53 38 Q49 41 44 39Z" fill="none" stroke="#535650" stroke-width="1.5"/>
          <circle cx="45" cy="51" r="3.4" fill="#326e9b"/><circle cx="61" cy="51" r="3.4" fill="#326e9b"/>
          <circle cx="46" cy="50" r="1.1" fill="#fff"/><circle cx="62" cy="50" r="1.1" fill="#fff"/>
          <path d="M48 63 Q52 66 57 63" fill="none" stroke="#a85e50" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M29 54 L39 52 M28 59 L39 57 M29 64 L39 62 M66 52 L77 54 M66 57 L77 59 M66 62 L76 64" stroke="#956c5c" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M68 68 Q81 69 78 83 L68 87" fill="none" stroke="#30343a" stroke-width="2"/>
        </g>
      </svg>
    </button>`;

  const companion = `
    <button class="anime-walker walker-companion" type="button" data-duration="38000" aria-label="Anime companion. Click to dash forward, or drag to move them.">
      <svg viewBox="0 0 88 112" aria-hidden="true">
        <ellipse cx="44" cy="106" rx="20" ry="4" fill="#171717" opacity=".14"/>
        <g class="walker-bob">
          <path class="walker-leg leg-back" d="M39 75 Q35 88 31 101" fill="none" stroke="#30312f" stroke-width="7" stroke-linecap="round"/>
          <path class="walker-leg leg-front" d="M50 75 Q55 87 58 101" fill="none" stroke="#30312f" stroke-width="7" stroke-linecap="round"/>
          <path d="M27 100 Q32 97 36 101 L36 105 L25 105 Q22 103 27 100 M53 100 Q58 97 62 101 L66 104 Q65 106 52 105Z" fill="#292a28"/>
          <path class="walker-arm arm-back" d="M34 61 Q25 68 29 78" fill="none" stroke="#e9e4d8" stroke-width="7" stroke-linecap="round"/>
          <path class="walker-arm arm-front" d="M54 62 Q64 68 60 78" fill="none" stroke="#e9e4d8" stroke-width="7" stroke-linecap="round"/>
          <path d="M33 58 Q43 53 54 59 L60 78 Q45 86 29 78Z" fill="#d0d0cb" stroke="#383936" stroke-width="1.4"/>
          <path d="M42 59 L46 59 L49 83 L42 82Z" fill="#f3eee2" opacity=".9"/>
          <circle cx="44" cy="37" r="25" fill="#f1d7c5" stroke="#383936" stroke-width="1.6"/>
          <path class="companion-hair" d="M20 40 Q16 13 40 10 Q65 6 69 33 L66 48 Q61 37 60 29 Q53 32 48 23 Q42 34 34 30 Q31 39 24 45Z" fill="#5a5a55"/>
          <ellipse cx="36" cy="39" rx="3.2" ry="5.3" fill="#292a28"/><ellipse cx="52" cy="39" rx="3.2" ry="5.3" fill="#292a28"/>
          <circle cx="37" cy="37" r="1.2" fill="#fff"/><circle cx="53" cy="37" r="1.2" fill="#fff"/>
          <g class="companion-glasses" fill="none" stroke="#3d4241" stroke-width="1.5"><circle cx="36" cy="39" r="6"/><circle cx="52" cy="39" r="6"/><path d="M42 39 L46 39"/></g>
          <path d="M41 50 Q44 52 47 50" fill="none" stroke="#9c6455" stroke-width="1.5" stroke-linecap="round"/>
          <ellipse cx="30" cy="47" rx="3" ry="1.5" fill="#d99083" opacity=".55"/><ellipse cx="58" cy="47" rx="3" ry="1.5" fill="#d99083" opacity=".55"/>
          <path d="M65 62 Q75 64 72 76 L63 78" fill="none" stroke="#393a37" stroke-width="2"/>
        </g>
      </svg>
    </button>`;

  const walkers = () => stage?.querySelectorAll(".anime-walker") || [];

  const continueWalkingAt = (walker, left) => {
    const maxLeft = Math.max(0, window.innerWidth - walker.offsetWidth);
    const visibleLeft = Math.max(0, Math.min(maxLeft, left));
    const progress = Math.max(0, Math.min(0.98, (visibleLeft + 110) / (window.innerWidth + 220)));
    walker.style.animationDelay = `${-progress * Number(walker.dataset.duration || 30000)}ms`;
    walker.style.left = "";
    walker.classList.remove("is-moving", "is-dragging");
  };

  const dash = walker => {
    if (walker.classList.contains("is-moving")) return;
    const current = walker.getBoundingClientRect().left;
    const end = Math.max(0, Math.min(window.innerWidth - walker.offsetWidth, current + 150));
    walker.classList.add("is-moving");
    walker.style.left = `${Math.max(0, current)}px`;
    const dashAnimation = walker.animate(
      [{ left: `${Math.max(0, current)}px` }, { left: `${end}px` }],
      { duration: 420, easing: "cubic-bezier(.2,.75,.3,1)" }
    );
    dashAnimation.onfinish = () => continueWalkingAt(walker, end);
  };

  const enablePointerMovement = walker => {
    let pointer = null;
    walker.addEventListener("pointerdown", event => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      const rect = walker.getBoundingClientRect();
      pointer = { id: event.pointerId, startX: event.clientX, left: rect.left, moved: false };
      walker.classList.add("is-moving", "is-dragging");
      walker.style.left = `${rect.left}px`;
      walker.setPointerCapture(event.pointerId);
    });
    walker.addEventListener("pointermove", event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const delta = event.clientX - pointer.startX;
      if (Math.abs(delta) > 5) pointer.moved = true;
      const maxLeft = Math.max(0, window.innerWidth - walker.offsetWidth);
      walker.style.left = `${Math.max(0, Math.min(maxLeft, pointer.left + delta))}px`;
    });
    const finish = event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const dragged = pointer.moved;
      const left = walker.getBoundingClientRect().left;
      pointer = null;
      if (dragged) {
        event.preventDefault();
        walker.dataset.suppressClick = "true";
        window.setTimeout(() => { delete walker.dataset.suppressClick; }, 0);
        continueWalkingAt(walker, left);
      } else {
        walker.classList.remove("is-moving", "is-dragging");
        walker.style.left = "";
      }
    };
    walker.addEventListener("pointerup", finish);
    walker.addEventListener("pointercancel", finish);
    walker.addEventListener("click", () => {
      if (walker.dataset.suppressClick) return;
      dash(walker);
    });
    walker.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const rect = walker.getBoundingClientRect();
      continueWalkingAt(walker, rect.left + (event.key === "ArrowRight" ? 60 : -60));
    });
  };

  const stop = () => {
    if (refreshTimer) window.clearInterval(refreshTimer);
    refreshTimer = 0;
    stage?.remove();
    stage = null;
  };

  const start = () => {
    if (stage || reduceMotion.matches) return;
    stage = document.createElement("div");
    stage.className = "anime-stage";
    stage.setAttribute("role", "group");
    stage.setAttribute("aria-label", "Interactive anime characters");
    stage.innerHTML = `${naruto}${companion}<span class="anime-hint" aria-hidden="true">Click to dash · drag to move</span>`;
    document.body.append(stage);
    walkers().forEach(enablePointerMovement);
  };

  const sync = async () => {
    try {
      const response = await fetch("/api/site-settings", { cache: "no-store" });
      if (!response.ok) return;
      const settings = await response.json();
      if (settings.animeDisplay) start();
      else stop();
    } catch {
      stop();
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) sync();
  });
  reduceMotion.addEventListener?.("change", () => reduceMotion.matches ? stop() : sync());
  refreshTimer = window.setInterval(sync, 30000);
  sync();
})();

