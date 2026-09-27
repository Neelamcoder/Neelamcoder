/*
 * Character renderer.
 * Builds a layered SVG character from a plain state object. Each body part
 * lives in its own <g> so CSS keyframes (CHARACTER_CSS) can animate it.
 * The same CSS is embedded in exported SVGs, so exports animate on their own.
 */
(function (global) {
  'use strict';

  const DEFAULTS = {
    name: 'Buddy',
    skin: '#f1c27d',
    headShape: 'round',
    eyes: 'big',
    eyeColor: '#3b2a1a',
    mouth: 'smile',
    blush: true,
    hair: 'short',
    hairColor: '#4a2c17',
    top: 'tshirt',
    topColor: '#4f7cff',
    pants: '#2d3a5a',
    shoes: '#222222',
    accessory: 'none',
    accColor: '#e8434f',
    bg: '#dff3ff',
    anim: 'idle',
    speed: 1,
  };

  const OPTIONS = {
    headShape: [['round', 'Round'], ['oval', 'Oval'], ['square', 'Square']],
    eyes: [['big', 'Big'], ['dots', 'Dots'], ['happy', 'Happy'], ['sleepy', 'Sleepy'], ['wink', 'Wink']],
    mouth: [['smile', 'Smile'], ['grin', 'Grin'], ['o', 'Surprised'], ['flat', 'Neutral'], ['smirk', 'Smirk']],
    hair: [['none', 'Bald'], ['short', 'Short'], ['spiky', 'Spiky'], ['long', 'Long'], ['bun', 'Bun'], ['curly', 'Curly'], ['mohawk', 'Mohawk']],
    top: [['tshirt', 'T-shirt'], ['stripes', 'Stripes'], ['hoodie', 'Hoodie'], ['star', 'Star tee'], ['overalls', 'Overalls'], ['dress', 'Dress']],
    accessory: [['none', 'None'], ['glasses', 'Glasses'], ['tophat', 'Top hat'], ['party', 'Party hat'], ['bow', 'Bow'], ['headphones', 'Headphones'], ['crown', 'Crown']],
    anim: [['idle', 'Idle'], ['wave', 'Wave'], ['jump', 'Jump'], ['dance', 'Dance'], ['walk', 'Walk'], ['talk', 'Talk'], ['spin', 'Spin'], ['none', 'Still']],
  };

  const PALETTES = {
    skin: ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21', '#a8e6a1', '#b8c8ff'],
    eyeColor: ['#3b2a1a', '#1f4e8c', '#2f7d32', '#6b3fa0', '#111111'],
    hairColor: ['#111111', '#4a2c17', '#a0522d', '#e6be8a', '#d94f30', '#f7f7f7', '#ff6fb5', '#5b8cff'],
    topColor: ['#4f7cff', '#e8434f', '#2ec27e', '#f5c542', '#9b59f6', '#ff8c42', '#ffffff', '#333333'],
    pants: ['#2d3a5a', '#4a4a4a', '#6b4f2c', '#1f6f5c', '#8a2f4f', '#c9c2b0'],
    shoes: ['#222222', '#ffffff', '#e8434f', '#6b4f2c', '#4f7cff'],
    accColor: ['#e8434f', '#4f7cff', '#2ec27e', '#f5c542', '#9b59f6', '#111111'],
    bg: ['#dff3ff', '#fff4d6', '#e8ffe0', '#ffe3ef', '#ece6ff', '#ffffff', '#1e2233'],
  };

  // Head geometry per shape: half-width, top y, bottom y.
  const HEADS = {
    round: { hw: 45, top: 35, bottom: 125 },
    oval: { hw: 40, top: 30, bottom: 130 },
    square: { hw: 45, top: 38, bottom: 126 },
  };

  const CHARACTER_CSS = `
.ac-char .ac-all,.ac-char .ac-head,.ac-char .ac-armL,.ac-char .ac-armR,.ac-char .ac-legL,.ac-char .ac-legR,.ac-char .ac-eyes,.ac-char .ac-mouth,.ac-char .ac-shadow{transform-box:view-box}
.ac-char .ac-all{transform-origin:100px 270px}
.ac-char .ac-head{transform-origin:100px 125px}
.ac-char .ac-armL{transform-origin:72px 134px}
.ac-char .ac-armR{transform-origin:128px 134px}
.ac-char .ac-legL{transform-origin:88px 205px}
.ac-char .ac-legR{transform-origin:112px 205px}
.ac-char .ac-eyes{transform-origin:100px 82px;animation:ac-blink 4s infinite}
.ac-char .ac-mouth{transform-origin:100px 106px}
.ac-char .ac-shadow{transform-origin:100px 272px}
.ac-char.anim-none .ac-eyes{animation:none}
@keyframes ac-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes ac-tilt{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes ac-swayL{0%,100%{transform:rotate(2deg)}50%{transform:rotate(-4deg)}}
@keyframes ac-swayR{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(4deg)}}
@keyframes ac-breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@keyframes ac-wave{0%,100%{transform:rotate(-115deg)}50%{transform:rotate(-155deg)}}
@keyframes ac-jump{0%,100%{transform:translateY(0) scale(1.08,.9)}15%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-40px) scale(.96,1.05)}85%{transform:translateY(0) scale(1,1)}}
@keyframes ac-jumpShadow{0%,15%,85%,100%{transform:scale(1);opacity:.15}50%{transform:scale(.6);opacity:.06}}
@keyframes ac-jumpArmL{0%,15%,85%,100%{transform:rotate(0)}50%{transform:rotate(150deg)}}
@keyframes ac-jumpArmR{0%,15%,85%,100%{transform:rotate(0)}50%{transform:rotate(-150deg)}}
@keyframes ac-dance{0%,100%{transform:translateX(-6px) rotate(-6deg)}50%{transform:translateX(6px) rotate(6deg)}}
@keyframes ac-danceArmL{0%,100%{transform:rotate(140deg)}50%{transform:rotate(20deg)}}
@keyframes ac-danceArmR{0%,100%{transform:rotate(-20deg)}50%{transform:rotate(-140deg)}}
@keyframes ac-kickL{0%,100%{transform:rotate(0)}50%{transform:rotate(20deg)}}
@keyframes ac-kickR{0%,100%{transform:rotate(-20deg)}50%{transform:rotate(0)}}
@keyframes ac-swing1{0%,100%{transform:rotate(22deg)}50%{transform:rotate(-22deg)}}
@keyframes ac-swing2{0%,100%{transform:rotate(-22deg)}50%{transform:rotate(22deg)}}
@keyframes ac-bob{0%,50%,100%{transform:translateY(0)}25%,75%{transform:translateY(-5px)}}
@keyframes ac-talk{0%,100%{transform:scaleY(1)}25%{transform:scaleY(.3)}50%{transform:scaleY(1.4)}75%{transform:scaleY(.6)}}
@keyframes ac-nod{0%,100%{transform:rotate(0)}50%{transform:rotate(2deg) translateY(1px)}}
@keyframes ac-spin{0%{transform:scaleX(1)}50%{transform:scaleX(-1)}100%{transform:scaleX(1)}}
.anim-idle .ac-head{animation:ac-tilt calc(3s / var(--spd,1)) ease-in-out infinite}
.anim-idle .ac-armL{animation:ac-swayL calc(3s / var(--spd,1)) ease-in-out infinite}
.anim-idle .ac-armR{animation:ac-swayR calc(3s / var(--spd,1)) ease-in-out infinite}
.anim-idle .ac-upper{animation:ac-breathe calc(3s / var(--spd,1)) ease-in-out infinite}
.anim-wave .ac-armR{animation:ac-wave calc(.7s / var(--spd,1)) ease-in-out infinite}
.anim-wave .ac-head{animation:ac-tilt calc(1.4s / var(--spd,1)) ease-in-out infinite}
.anim-wave .ac-armL{animation:ac-swayL calc(3s / var(--spd,1)) ease-in-out infinite}
.anim-jump .ac-all{animation:ac-jump calc(1s / var(--spd,1)) ease-in-out infinite}
.anim-jump .ac-shadow{animation:ac-jumpShadow calc(1s / var(--spd,1)) ease-in-out infinite}
.anim-jump .ac-armL{animation:ac-jumpArmL calc(1s / var(--spd,1)) ease-in-out infinite}
.anim-jump .ac-armR{animation:ac-jumpArmR calc(1s / var(--spd,1)) ease-in-out infinite}
.anim-dance .ac-all{animation:ac-dance calc(.8s / var(--spd,1)) ease-in-out infinite}
.anim-dance .ac-armL{animation:ac-danceArmL calc(.8s / var(--spd,1)) ease-in-out infinite}
.anim-dance .ac-armR{animation:ac-danceArmR calc(.8s / var(--spd,1)) ease-in-out infinite}
.anim-dance .ac-legL{animation:ac-kickL calc(.8s / var(--spd,1)) ease-in-out infinite}
.anim-dance .ac-legR{animation:ac-kickR calc(.8s / var(--spd,1)) ease-in-out infinite}
.anim-dance .ac-head{animation:ac-tilt calc(.4s / var(--spd,1)) ease-in-out infinite}
.anim-walk .ac-all{animation:ac-bob calc(1s / var(--spd,1)) ease-in-out infinite}
.anim-walk .ac-legL,.anim-walk .ac-armR{animation:ac-swing1 calc(1s / var(--spd,1)) ease-in-out infinite}
.anim-walk .ac-legR,.anim-walk .ac-armL{animation:ac-swing2 calc(1s / var(--spd,1)) ease-in-out infinite}
.anim-talk .ac-mouth{animation:ac-talk calc(.5s / var(--spd,1)) ease-in-out infinite}
.anim-talk .ac-head{animation:ac-nod calc(1s / var(--spd,1)) ease-in-out infinite}
.anim-talk .ac-armR{animation:ac-swayR calc(1.5s / var(--spd,1)) ease-in-out infinite}
.anim-spin .ac-all{animation:ac-spin calc(1.2s / var(--spd,1)) linear infinite}
.anim-spin .ac-shadow{animation:ac-jumpShadow calc(.6s / var(--spd,1)) linear infinite}
@media (prefers-reduced-motion:reduce){.ac-char *{animation-duration:0s!important;animation-iteration-count:1!important}}
`;

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  // Lighten (amt > 0) or darken (amt < 0) a #rrggbb color.
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r);
    g = Math.round((t - g) * p + g);
    b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function isHex(v) { return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v); }

  // Coerce untrusted input (localStorage, imported JSON) into a safe state.
  function sanitize(input) {
    const s = Object.assign({}, DEFAULTS);
    if (!input || typeof input !== 'object') return s;
    for (const key of Object.keys(DEFAULTS)) {
      const v = input[key];
      if (v === undefined) continue;
      if (OPTIONS[key]) {
        if (OPTIONS[key].some(([k]) => k === v)) s[key] = v;
      } else if (isHex(DEFAULTS[key])) {
        if (isHex(v)) s[key] = v.toLowerCase();
      } else if (key === 'blush') {
        s.blush = !!v;
      } else if (key === 'speed') {
        const n = Number(v);
        if (Number.isFinite(n)) s.speed = clamp(n, 0.25, 3);
      } else if (key === 'name') {
        s.name = String(v).slice(0, 40);
      }
    }
    return s;
  }

  function escapeXml(str) {
    return String(str).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
  }

  function headShapeSvg(shape, fill, stroke) {
    const common = `fill="${fill}" stroke="${stroke}" stroke-width="2"`;
    if (shape === 'oval') return `<ellipse cx="100" cy="80" rx="40" ry="50" ${common}/>`;
    if (shape === 'square') return `<rect x="55" y="38" width="90" height="88" rx="24" ${common}/>`;
    return `<circle cx="100" cy="80" r="45" ${common}/>`;
  }

  function eyesSvg(style, color) {
    const ink = '#1d1d1f';
    switch (style) {
      case 'dots':
        return `<circle cx="83" cy="82" r="5" fill="${ink}"/><circle cx="117" cy="82" r="5" fill="${ink}"/>`;
      case 'happy':
        return `<path d="M75 86 Q83 75 91 86 M109 86 Q117 75 125 86" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`;
      case 'sleepy':
        return `<path d="M75 82 L91 82 M109 82 L125 82" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>` +
          `<path d="M77 82 Q83 89 89 82 M111 82 Q117 89 123 82" fill="${color}" stroke="${ink}" stroke-width="2"/>`;
      case 'wink':
        return bigEye(83, color) + `<path d="M109 84 Q117 76 125 84" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`;
      default:
        return bigEye(83, color) + bigEye(117, color);
    }
  }

  function bigEye(cx, color) {
    return `<ellipse cx="${cx}" cy="82" rx="9" ry="11" fill="#fff" stroke="#1d1d1f" stroke-width="1.5"/>` +
      `<circle cx="${cx + 1}" cy="84" r="6" fill="${color}"/>` +
      `<circle cx="${cx + 1}" cy="84" r="3" fill="#111"/>` +
      `<circle cx="${cx + 3}" cy="81" r="2" fill="#fff"/>`;
  }

  function mouthSvg(style) {
    const ink = '#1d1d1f';
    switch (style) {
      case 'grin':
        return `<path d="M86 101 Q100 124 114 101 Z" fill="${ink}"/><path d="M92 112 Q100 106 108 112 Q100 118 92 112Z" fill="#ff7a8a"/>`;
      case 'o':
        return `<ellipse cx="100" cy="107" rx="5.5" ry="7" fill="${ink}"/>`;
      case 'flat':
        return `<path d="M91 106 L109 106" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`;
      case 'smirk':
        return `<path d="M89 107 Q103 111 112 101" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`;
      default:
        return `<path d="M88 102 Q100 115 112 102" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`;
    }
  }

  function curlyCircles(fill) {
    let out = '';
    for (let a = -190; a <= 10; a += 20) {
      const rad = (a * Math.PI) / 180;
      const cx = (100 + 44 * Math.cos(rad)).toFixed(1);
      const cy = (78 + 44 * Math.sin(rad)).toFixed(1);
      out += `<circle cx="${cx}" cy="${cy}" r="14" fill="${fill}"/>`;
    }
    return out;
  }

  // Returns [behindHead, inFrontOfHead] markup. Designed for a round head
  // (center 100,80 r45); callers scale it to fit other shapes.
  function hairSvg(style, color) {
    const dark = shade(color, -0.25);
    const attrs = `fill="${color}" stroke="${dark}" stroke-width="2" stroke-linejoin="round"`;
    const shortCap = `<path d="M53 84 Q50 30 100 30 Q150 30 147 84 Q140 58 118 52 Q100 62 80 52 Q60 58 53 84Z" ${attrs}/>`;
    switch (style) {
      case 'short':
        return ['', shortCap];
      case 'spiky':
        return ['', `<path d="M54 82 L52 48 L66 54 L68 28 L84 44 L100 18 L116 44 L132 28 L134 54 L148 48 L146 82 Q138 56 100 52 Q62 56 54 82Z" ${attrs}/>`];
      case 'long':
        return [
          `<path d="M50 85 Q46 28 100 28 Q154 28 150 85 L156 160 Q144 170 132 158 L128 100 L72 100 L68 158 Q56 170 44 160Z" ${attrs}/>`,
          `<path d="M53 84 Q50 30 100 30 Q150 30 147 84 Q146 62 132 52 Q118 66 100 56 Q82 66 68 52 Q54 62 53 84Z" ${attrs}/>`,
        ];
      case 'bun':
        return [`<circle cx="100" cy="26" r="18" ${attrs}/>`, shortCap];
      case 'curly':
        return [curlyCircles(dark), curlyCircles(color)];
      case 'mohawk':
        return ['', `<path d="M86 60 L84 30 L94 36 L96 8 L104 30 L110 12 L114 36 L118 32 L114 60 Q100 54 86 60Z" ${attrs}/>`];
      default:
        return ['', ''];
    }
  }

  function accessorySvg(style, color) {
    const dark = shade(color, -0.3);
    switch (style) {
      case 'glasses':
        return `<g fill="rgba(255,255,255,.25)" stroke="${color}" stroke-width="3"><circle cx="83" cy="82" r="13"/><circle cx="117" cy="82" r="13"/></g>` +
          `<path d="M96 81 Q100 77 104 81 M70 80 L56 77 M130 80 L144 77" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
      case 'tophat':
        return `<rect x="66" y="-8" width="68" height="44" rx="4" fill="#222" stroke="#000" stroke-width="2"/>` +
          `<rect x="66" y="24" width="68" height="9" fill="${color}"/>` +
          `<ellipse cx="100" cy="38" rx="54" ry="8" fill="#222" stroke="#000" stroke-width="2"/>`;
      case 'party':
        return `<polygon points="100,-12 74,42 126,42" fill="${color}" stroke="${dark}" stroke-width="2" stroke-linejoin="round"/>` +
          `<path d="M88 14 L112 14 M81 29 L119 29" stroke="#fff" stroke-width="4" opacity=".7"/>` +
          `<circle cx="100" cy="-12" r="7" fill="#fff" stroke="${dark}" stroke-width="2"/>`;
      case 'bow':
        return `<path d="M132 40 L114 28 L114 52Z M132 40 L150 28 L150 52Z" fill="${color}" stroke="${dark}" stroke-width="2" stroke-linejoin="round"/>` +
          `<circle cx="132" cy="40" r="6" fill="${dark}"/>`;
      case 'headphones':
        return `<path d="M50 84 Q48 20 100 20 Q152 20 150 84" fill="none" stroke="${dark}" stroke-width="8" stroke-linecap="round"/>` +
          `<rect x="40" y="68" width="16" height="30" rx="7" fill="${color}" stroke="${dark}" stroke-width="2"/>` +
          `<rect x="144" y="68" width="16" height="30" rx="7" fill="${color}" stroke="${dark}" stroke-width="2"/>`;
      case 'crown':
        return `<path d="M70 40 L68 12 L85 27 L100 6 L115 27 L132 12 L130 40Z" fill="#f5c542" stroke="#b8860b" stroke-width="2" stroke-linejoin="round"/>` +
          `<circle cx="100" cy="30" r="4.5" fill="${color}"/><circle cx="82" cy="33" r="3" fill="${color}"/><circle cx="118" cy="33" r="3" fill="${color}"/>`;
      default:
        return '';
    }
  }

  const TORSO_PATH = 'M70 145 Q70 125 90 125 L110 125 Q130 125 130 145 L130 200 L70 200Z';

  function topSvg(s, uid) {
    const c = s.topColor, dark = shade(c, -0.25);
    const base = `<path d="${TORSO_PATH}" fill="${c}" stroke="${dark}" stroke-width="2"/>`;
    switch (s.top) {
      case 'stripes': {
        const stripe = shade(c, c.toLowerCase() === '#ffffff' ? -0.3 : 0.45);
        let lines = '';
        for (let y = 138; y < 200; y += 14) lines += `<rect x="68" y="${y}" width="64" height="6" fill="${stripe}"/>`;
        return `<clipPath id="${uid}-torso"><path d="${TORSO_PATH}"/></clipPath>` + base +
          `<g clip-path="url(#${uid}-torso)">${lines}</g>` +
          `<path d="${TORSO_PATH}" fill="none" stroke="${dark}" stroke-width="2"/>`;
      }
      case 'hoodie':
        return base +
          `<path d="M80 126 Q100 146 120 126" fill="${dark}"/>` +
          `<path d="M94 135 L92 155 M106 135 L108 155" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>` +
          `<path d="M80 172 L120 172 L114 192 L86 192Z" fill="${shade(c, -0.12)}" stroke="${dark}" stroke-width="2" stroke-linejoin="round"/>`;
      case 'star':
        return base +
          `<polygon points="100,148 105,160 118,160 108,168 112,181 100,173 88,181 92,168 82,160 95,160" fill="${s.accColor}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`;
      case 'overalls': {
        const p = s.pants, pd = shade(p, -0.25);
        return base +
          `<path d="M82 150 L118 150 L118 200 L82 200Z" fill="${p}" stroke="${pd}" stroke-width="2"/>` +
          `<path d="M84 150 L78 128 M116 150 L122 128" stroke="${p}" stroke-width="6" stroke-linecap="round"/>` +
          `<circle cx="86" cy="156" r="3" fill="#f5c542"/><circle cx="114" cy="156" r="3" fill="#f5c542"/>` +
          `<rect x="92" y="164" width="16" height="12" rx="2" fill="none" stroke="${pd}" stroke-width="2"/>`;
      }
      case 'dress':
        return base +
          `<path d="M70 188 L130 188 L146 232 Q100 242 54 232Z" fill="${c}" stroke="${dark}" stroke-width="2" stroke-linejoin="round"/>` +
          `<path d="M70 190 L130 190" stroke="${s.accColor}" stroke-width="5"/>`;
      default:
        return base + `<path d="M88 126 Q100 138 112 126" fill="none" stroke="${dark}" stroke-width="2"/>`;
    }
  }

  function armSvg(side, s) {
    const m = side === 'L' ? -1 : 1;
    const sx = 100 + 28 * m, ex = 100 + 38 * m, hx = 100 + 42 * m;
    const sleeve = s.topColor, skin = s.skin;
    return `<line x1="${sx}" y1="136" x2="${ex}" y2="168" stroke="${shade(sleeve, -0.25)}" stroke-width="17" stroke-linecap="round"/>` +
      `<line x1="${sx}" y1="136" x2="${ex}" y2="168" stroke="${sleeve}" stroke-width="13" stroke-linecap="round"/>` +
      `<line x1="${ex}" y1="168" x2="${hx}" y2="190" stroke="${skin}" stroke-width="11" stroke-linecap="round"/>` +
      `<circle cx="${hx}" cy="195" r="9" fill="${skin}" stroke="${shade(skin, -0.25)}" stroke-width="2"/>`;
  }

  function legSvg(side, s) {
    const m = side === 'L' ? -1 : 1;
    const x = 100 + 12 * m, fx = 100 + 16 * m;
    const legColor = s.top === 'dress' ? s.skin : s.pants;
    const w = s.top === 'dress' ? 12 : 18;
    return `<line x1="${x}" y1="200" x2="${x}" y2="256" stroke="${shade(legColor, -0.25)}" stroke-width="${w + 4}" stroke-linecap="round"/>` +
      `<line x1="${x}" y1="200" x2="${x}" y2="256" stroke="${legColor}" stroke-width="${w}" stroke-linecap="round"/>` +
      `<ellipse cx="${fx}" cy="263" rx="15" ry="8" fill="${s.shoes}" stroke="${shade(s.shoes, s.shoes === '#222222' ? 0.3 : -0.3)}" stroke-width="2"/>`;
  }

  let uidCounter = 0;

  /**
   * Render a character to an SVG string.
   * opts.embedCss  - include CHARACTER_CSS so the file animates standalone
   * opts.background - paint the background color
   * opts.anim      - override the animation (e.g. 'none' for thumbnails)
   * opts.viewBox   - crop, e.g. to the head for option previews
   */
  function render(state, opts) {
    opts = opts || {};
    const s = sanitize(state);
    const anim = opts.anim || s.anim;
    const uid = 'ac' + (++uidCounter).toString(36) + Math.random().toString(36).slice(2, 6);
    const head = HEADS[s.headShape];
    const skinDark = shade(s.skin, -0.2);

    // Fit hair/accessories designed for the round head onto other shapes.
    const fx = head.hw / 45, dy = head.top - 35;
    const fit = `transform="translate(100 ${dy}) scale(${fx} 1) translate(-100 0)"`;
    const [hairBack, hairFront] = hairSvg(s.hair, s.hairColor);

    const pantsTop = s.top === 'dress' ? '' :
      `<rect x="70" y="190" width="60" height="24" rx="6" fill="${s.pants}" stroke="${shade(s.pants, -0.25)}" stroke-width="2"/>`;

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${opts.viewBox || '0 -40 200 320'}" class="ac-char anim-${anim}" style="--spd:${s.speed}" role="img" aria-label="${escapeXml(s.name)}">` +
      `<title>${escapeXml(s.name)}</title>` +
      (opts.embedCss ? `<style>${CHARACTER_CSS}</style>` : '') +
      (opts.background ? `<rect x="0" y="-40" width="200" height="320" fill="${s.bg}"/>` : '') +
      `<ellipse class="ac-shadow" cx="100" cy="272" rx="44" ry="7" fill="#000" opacity=".15"/>` +
      `<g class="ac-all">` +
        `<g class="ac-legL">${legSvg('L', s)}</g>` +
        `<g class="ac-legR">${legSvg('R', s)}</g>` +
        `<g class="ac-upper">` +
          pantsTop +
          `<rect x="91" y="112" width="18" height="20" fill="${s.skin}" stroke="${skinDark}" stroke-width="2"/>` +
          topSvg(s, uid) +
          `<g class="ac-head">` +
            `<g ${fit}>${hairBack}</g>` +
            `<circle cx="${100 - head.hw}" cy="86" r="9" fill="${s.skin}" stroke="${skinDark}" stroke-width="2"/>` +
            `<circle cx="${100 + head.hw}" cy="86" r="9" fill="${s.skin}" stroke="${skinDark}" stroke-width="2"/>` +
            headShapeSvg(s.headShape, s.skin, skinDark) +
            (s.blush ? `<ellipse cx="74" cy="99" rx="8" ry="5" fill="#ff7a8a" opacity=".45"/><ellipse cx="126" cy="99" rx="8" ry="5" fill="#ff7a8a" opacity=".45"/>` : '') +
            `<g class="ac-eyes">${eyesSvg(s.eyes, s.eyeColor)}</g>` +
            `<g class="ac-mouth">${mouthSvg(s.mouth)}</g>` +
            `<g ${fit}>${hairFront}${accessorySvg(s.accessory, s.accColor)}</g>` +
          `</g>` +
          `<g class="ac-armL">${armSvg('L', s)}</g>` +
          `<g class="ac-armR">${armSvg('R', s)}</g>` +
        `</g>` +
      `</g>` +
      `</svg>`;
    return svg;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function randomState(base) {
    const s = Object.assign({}, DEFAULTS, base || {});
    for (const key of ['headShape', 'eyes', 'mouth', 'hair', 'top', 'accessory']) {
      s[key] = pick(OPTIONS[key])[0];
    }
    for (const key of ['skin', 'eyeColor', 'hairColor', 'topColor', 'pants', 'shoes', 'accColor']) {
      s[key] = pick(PALETTES[key]);
    }
    s.blush = Math.random() < 0.6;
    return s;
  }

  global.AnimChar = { DEFAULTS, OPTIONS, PALETTES, CHARACTER_CSS, render, sanitize, randomState, shade };
})(typeof window !== 'undefined' ? window : globalThis);
