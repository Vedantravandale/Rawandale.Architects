(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let stage = null;
  let refreshTimer = 0;

  const walker = (kind, label) => `
    <div class="anime-walker ${kind}" role="img" aria-label="${label}">
      <svg viewBox="0 0 88 112" aria-hidden="true">
        <ellipse cx="44" cy="106" rx="20" ry="4" fill="#171717" opacity=".14"/>
        <g class="walker-bob">
          <path class="walker-leg leg-back" d="M39 75 Q35 88 31 101" fill="none" stroke="#30312f" stroke-width="7" stroke-linecap="round"/>
          <path class="walker-leg leg-front" d="M50 75 Q55 87 58 101" fill="none" stroke="#30312f" stroke-width="7" stroke-linecap="round"/>
          <path d="M27 100 Q32 97 36 101 L36 105 L25 105 Q22 103 27 100 M53 100 Q58 97 62 101 L66 104 Q65 106 52 105Z" fill="#292a28"/>
          <path class="walker-arm arm-back" d="M34 61 Q25 68 29 78" fill="none" stroke="#e9e4d8" stroke-width="7" stroke-linecap="round"/>
          <path class="walker-arm arm-front" d="M54 62 Q64 68 60 78" fill="none" stroke="#e9e4d8" stroke-width="7" stroke-linecap="round"/>
          <path d="M33 58 Q43 53 54 59 L60 78 Q45 86 29 78Z" fill="${kind === "walker-b" ? "#d0d0cb" : "#b49668"}" stroke="#383936" stroke-width="1.4"/>
          <path d="M42 59 L46 59 L49 83 L42 82Z" fill="#f3eee2" opacity=".9"/>
          <circle cx="44" cy="37" r="25" fill="#f1d7c5" stroke="#383936" stroke-width="1.6"/>
          <path class="walker-hair" d="M20 40 Q16 13 40 10 Q65 6 69 33 L66 48 Q61 37 60 29 Q53 32 48 23 Q42 34 34 30 Q31 39 24 45Z" fill="#252624"/>
          <path d="M27 35 Q29 27 35 29" fill="none" stroke="#54544f" stroke-width="2" stroke-linecap="round"/>
          <ellipse cx="36" cy="39" rx="3.2" ry="5.3" fill="#292a28"/>
          <ellipse cx="52" cy="39" rx="3.2" ry="5.3" fill="#292a28"/>
          <circle cx="37" cy="37" r="1.2" fill="#fff"/><circle cx="53" cy="37" r="1.2" fill="#fff"/>
          <path d="M41 50 Q44 52 47 50" fill="none" stroke="#9c6455" stroke-width="1.5" stroke-linecap="round"/>
          <ellipse cx="30" cy="47" rx="3" ry="1.5" fill="#d99083" opacity=".55"/><ellipse cx="58" cy="47" rx="3" ry="1.5" fill="#d99083" opacity=".55"/>
          <path d="M65 62 Q75 64 72 76 L63 78" fill="none" stroke="#393a37" stroke-width="2"/>
          <path d="M70 69 L74 74 L69 79" fill="none" stroke="#b49668" stroke-width="2"/>
        </g>
      </svg>
    </div>`;

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
    stage.setAttribute("aria-hidden", "true");
    stage.innerHTML = walker("walker-a", "Anime-style character walking across the page") + walker("walker-b", "Anime-style character walking across the page");
    document.body.append(stage);
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

