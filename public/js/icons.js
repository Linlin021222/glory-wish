/* 内置 SVG 图标库 —— 全部手绘，离线可用 */
(function (global) {
  const P = (d, o) => `<path d="${d}" ${o || ''}/>`;

  const lib = {
    crystal: `
      <path d="M32 3 L58 20 L52 53 L32 61 L12 53 L6 20 Z" fill="currentColor" opacity="0.16" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M32 3 L58 20 L32 34 Z" fill="currentColor" opacity="0.62"/>
      <path d="M32 3 L6 20 L32 34 Z" fill="currentColor" opacity="0.3"/>
      <path d="M6 20 L12 53 L32 34 Z" fill="currentColor" opacity="0.2"/>
      <path d="M58 20 L52 53 L32 34 Z" fill="currentColor" opacity="0.44"/>
      <path d="M12 53 L32 61 L52 53 L32 34 Z" fill="currentColor" opacity="0.13"/>
      <path d="M32 3 L32 61" stroke="#fff" stroke-opacity="0.45" stroke-width="1.2"/>`,

    legend: `
      <path d="M32 4 L38 17 L38 40 L32 47 L26 40 L26 17 Z" fill="currentColor" opacity="0.45" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M32 6 L36 18 L32 40 Z" fill="#fff" opacity="0.42"/>
      <path d="M16 40 H48 V47 H16 Z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
      <rect x="29.5" y="47" width="5" height="11" rx="2" fill="currentColor" opacity="0.8"/>
      <circle cx="32" cy="60" r="3.4" fill="#fff" opacity="0.85"/>
      <path d="M20 43 H44" stroke="#fff" stroke-opacity="0.5" stroke-width="1.4"/>`,

    coupon: `
      <rect x="10" y="25" width="44" height="31" rx="3" fill="currentColor" opacity="0.42" stroke="currentColor" stroke-width="2"/>
      <rect x="7" y="16" width="50" height="11" rx="2.5" fill="currentColor"/>
      <path d="M32 16 V56" stroke="#fff" stroke-opacity="0.6" stroke-width="2"/>
      <path d="M32 16 C25 5 18 8 19 13 C20 17 28 16 32 16 Z" fill="#fff" opacity="0.55"/>
      <path d="M32 16 C39 5 46 8 45 13 C44 17 36 16 32 16 Z" fill="#fff" opacity="0.55"/>
      <rect x="10" y="33" width="44" height="1.6" fill="#fff" opacity="0.25"/>`,

    chest: `
      <path d="M12 28 C12 15 52 15 52 28 Z" fill="currentColor" opacity="0.65"/>
      <path d="M12 28 H52 V50 A4 4 0 0 1 48 54 H16 A4 4 0 0 1 12 50 Z" fill="currentColor" opacity="0.35" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M12 28 H52" stroke="currentColor" stroke-width="2.4"/>
      <rect x="27" y="30" width="10" height="13" rx="2.4" fill="currentColor"/>
      <circle cx="32" cy="36.5" r="2.2" fill="#fff" opacity="0.85"/>
      <path d="M16 44 H48" stroke="#fff" stroke-opacity="0.28" stroke-width="1.4"/>`,

    'fragment-skin': `
      <path d="M31 5 L47 21 L41 45 L21 48 L13 23 Z" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M31 5 L47 21 L35 29 Z" fill="currentColor" opacity="0.55"/>
      <path d="M13 23 L35 29 L21 48 Z" fill="currentColor" opacity="0.35"/>
      <path d="M47 21 L41 45 L35 29 Z" fill="currentColor" opacity="0.2"/>
      <path d="M45 47 L53 55 L48 56 L43 51 Z" fill="currentColor" opacity="0.5"/>
      <path d="M11 49 L18 58 L14 58 L9 53 Z" fill="currentColor" opacity="0.4"/>`,

    'fragment-hero': `
      <path d="M32 5 L54 13 V32 C54 45 44 54 32 60 C20 54 10 45 10 32 V13 Z" fill="currentColor" opacity="0.35" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M32 5 L54 13 V32 C54 45 44 54 32 60 Z" fill="currentColor" opacity="0.22"/>
      <path d="M24 30 H40" stroke="#fff" stroke-opacity="0.8" stroke-width="4" stroke-linecap="round"/>
      <path d="M32 22 V38" stroke="#fff" stroke-opacity="0.8" stroke-width="4" stroke-linecap="round"/>`,

    diamond: `
      <path d="M20 8 H44 L58 26 L32 60 L6 26 Z" fill="currentColor" opacity="0.32" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M20 8 L26 26 L6 26 Z" fill="currentColor" opacity="0.5"/>
      <path d="M44 8 L38 26 L58 26 Z" fill="currentColor" opacity="0.38"/>
      <path d="M26 26 L32 60 L38 26 Z" fill="currentColor" opacity="0.28"/>
      <path d="M6 26 H58" stroke="#fff" stroke-opacity="0.35" stroke-width="1.2"/>`,

    warcowry: `
      <circle cx="32" cy="32" r="25" fill="currentColor" opacity="0.35" stroke="currentColor" stroke-width="2"/>
      <circle cx="32" cy="32" r="19" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.7"/>
      <rect x="24" y="24" width="16" height="16" rx="2.5" fill="#fff" opacity="0.55"/>
      <path d="M32 7 V13 M32 51 V57 M7 32 H13 M51 32 H57" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,

    'coupon-small': `
      <rect x="8" y="18" width="48" height="28" rx="4" fill="currentColor" opacity="0.38" stroke="currentColor" stroke-width="2"/>
      <path d="M34 18 V46" stroke="#fff" stroke-opacity="0.6" stroke-width="1.6" stroke-dasharray="3 3"/>
      <text x="21" y="39" font-size="20" text-anchor="middle" fill="#fff" opacity="0.9" font-weight="700" font-family="serif">¥</text>
      <circle cx="45" cy="26" r="3" fill="#fff" opacity="0.5"/>`,

    rose: `
      <path d="M32 24 C23 15 14 22 19 31 C23 39 32 37 32 37 C32 37 41 39 45 31 C50 22 41 15 32 24 Z" fill="currentColor" opacity="0.5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="32" cy="29" r="6.5" fill="#fff" opacity="0.35"/>
      <path d="M32 37 V59" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M32 47 C25 45 21 48 23 53 C27 55 31 51 32 49 Z" fill="currentColor" opacity="0.55"/>
      <path d="M32 55 C39 53 43 56 41 61" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5" fill="none"/>`,

    exp: `
      <path d="M14 14 H46 A3 3 0 0 1 49 17 V47 A3 3 0 0 1 46 50 H14 A3 3 0 0 1 11 47 V17 A3 3 0 0 1 14 14 Z" fill="currentColor" opacity="0.32" stroke="currentColor" stroke-width="2"/>
      <path d="M18 20 H38 M18 27 H34 M18 34 H38" stroke="#fff" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round"/>
      <path d="M20 44 L28 38 L34 44 L44 36" stroke="#fff" stroke-opacity="0.85" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

    gold: `
      <ellipse cx="32" cy="46" rx="23" ry="8.5" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="2"/>
      <ellipse cx="32" cy="37" rx="23" ry="8.5" fill="currentColor" opacity="0.45" stroke="currentColor" stroke-width="2"/>
      <ellipse cx="32" cy="28" rx="23" ry="8.5" fill="currentColor" opacity="0.55" stroke="currentColor" stroke-width="2"/>
      <ellipse cx="32" cy="28" rx="12" ry="4.5" fill="#fff" opacity="0.3"/>`,

    gift: `
      <path d="M12 26 C12 14 52 14 52 26 Z" fill="currentColor" opacity="0.55"/>
      <rect x="10" y="26" width="44" height="30" rx="3" fill="currentColor" opacity="0.35" stroke="currentColor" stroke-width="2"/>
      <path d="M32 14 V56" stroke="#fff" stroke-opacity="0.5" stroke-width="2"/>`
  };

  const ui = {
    coin: `<path d="M32 6 L55 17 V39 C55 50 44 56 32 60 C20 56 9 50 9 39 V17 Z" fill="currentColor" opacity="0.9"/>
           <path d="M32 6 L32 60 M9 17 L55 17" stroke="#5a3d0c" stroke-opacity="0.45" stroke-width="2"/>
           <path d="M24 26 H40 M32 22 V40 M26 40 H38" stroke="#5a3d0c" stroke-opacity="0.65" stroke-width="3" stroke-linecap="round" fill="none"/>`,
    dice: `<rect x="10" y="10" width="44" height="44" rx="9" fill="currentColor" opacity="0.85"/>
           <circle cx="23" cy="24" r="3.6" fill="#1a1206"/><circle cx="41" cy="24" r="3.6" fill="#1a1206"/>
           <circle cx="32" cy="32" r="3.6" fill="#1a1206"/>
           <circle cx="23" cy="40" r="3.6" fill="#1a1206"/><circle cx="41" cy="40" r="3.6" fill="#1a1206"/>`,
    scroll: `<path d="M18 10 H44 A4 4 0 0 1 48 14 V50 A4 4 0 0 1 44 54 H18 A4 4 0 0 1 14 50 V14 A4 4 0 0 1 18 10 Z" fill="currentColor" opacity="0.85"/>
             <path d="M21 22 H41 M21 30 H41 M21 38 H35" stroke="#181203" stroke-opacity="0.35" stroke-width="2.4" stroke-linecap="round"/>`,
    wallet: `<path d="M12 20 H48 A4 4 0 0 1 52 24 V44 A4 4 0 0 1 48 48 H12 A4 4 0 0 1 8 44 V24 A4 4 0 0 1 12 20 Z" fill="currentColor" opacity="0.85"/>
             <path d="M8 30 H52" stroke="#181203" stroke-opacity="0.3" stroke-width="2"/>
             <circle cx="42" cy="38" r="3.4" fill="#181203" opacity="0.5"/>`,
    bag: `<path d="M16 20 H48 L52 54 H12 Z" fill="currentColor" opacity="0.85"/>
          <path d="M25 20 A7 7 0 0 1 39 20" fill="none" stroke="currentColor" stroke-width="3"/>`,
    back: `<path d="M40 12 L22 32 L40 52" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    close: `<path d="M18 18 L46 46 M46 18 L18 46" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>`,
    copy: `<rect x="16" y="16" width="30" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="3"/>
           <path d="M24 12 H46 A4 4 0 0 1 50 16 V42" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`,
    fire: `<path d="M32 6 C40 18 50 24 46 38 C43 50 36 56 32 56 C28 56 21 50 18 38 C14 24 24 18 32 6 Z" fill="currentColor" opacity="0.9"/>
           <path d="M32 26 C36 32 40 34 38 42 C37 48 34 51 32 51 C30 51 27 48 26 42 C24 34 28 32 32 26 Z" fill="#fff" opacity="0.45"/>`,
    lock: `<rect x="15" y="28" width="34" height="26" rx="5" fill="currentColor" opacity="0.9"/>
           <path d="M22 28 V20 A10 10 0 0 1 42 20 V28" fill="none" stroke="currentColor" stroke-width="4"/>
           <circle cx="32" cy="40" r="4" fill="#181203" opacity="0.6"/>`
  };

  function svg(key, size, color, cls) {
    const body = lib[key] || ui[key] || lib.gift;
    return `<svg viewBox="0 0 64 64" width="${size || 32}" height="${size || 32}" ${cls ? `class="${cls}"` : ''} ${color ? `style="color:${color}"` : ''} fill="none">${body}</svg>`;
  }

  /** 舞台中央的大水晶 */
  function crystalBig() {
    return `
      <svg viewBox="0 0 200 240" width="100%" height="100%" fill="none">
        <defs>
          <linearGradient id="cgA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fff6dd"/><stop offset="45%" stop-color="#ffd77a"/><stop offset="100%" stop-color="#e08a2e"/>
          </linearGradient>
          <linearGradient id="cgB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#7fd7ff"/><stop offset="100%" stop-color="#3f6fff"/>
          </linearGradient>
          <radialGradient id="cgGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fff3cf" stop-opacity="0.85"/><stop offset="100%" stop-color="#ffb64d" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="100" cy="130" rx="96" ry="104" fill="url(#cgGlow)"/>
        <path d="M100 14 L176 68 L160 186 L100 226 L40 186 L24 68 Z" fill="url(#cgA)" opacity="0.35" stroke="#ffe6ae" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M100 14 L176 68 L100 106 Z" fill="url(#cgA)" opacity="0.85"/>
        <path d="M100 14 L24 68 L100 106 Z" fill="url(#cgA)" opacity="0.45"/>
        <path d="M24 68 L40 186 L100 106 Z" fill="url(#cgB)" opacity="0.5"/>
        <path d="M176 68 L160 186 L100 106 Z" fill="url(#cgB)" opacity="0.32"/>
        <path d="M40 186 L100 226 L160 186 L100 106 Z" fill="url(#cgB)" opacity="0.22"/>
        <path d="M100 14 L100 226" stroke="#fffdf2" stroke-opacity="0.5" stroke-width="1.6"/>
        <path d="M24 68 L176 68" stroke="#fffdf2" stroke-opacity="0.35" stroke-width="1.6"/>
        <circle cx="100" cy="86" r="9" fill="#fffdf2" opacity="0.75"/>
        <path d="M62 140 L74 158 L62 176" stroke="#fff" stroke-opacity="0.35" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>`;
  }

  global.Icons = { svg: svg, lib: lib, ui: ui, crystalBig: crystalBig, keys: Object.keys(lib) };
})(window);
