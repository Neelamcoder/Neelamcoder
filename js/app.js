(function () {
  'use strict';

  const { DEFAULTS, OPTIONS, PALETTES, CHARACTER_CSS, render, sanitize, randomState } = window.AnimChar;

  const STORAGE_CURRENT = 'charstudio.current';
  const STORAGE_GALLERY = 'charstudio.gallery';

  // Which controls appear on each tab.
  const TABS = [
    { id: 'body', label: 'Body', items: [
      { key: 'skin', type: 'color', label: 'Skin tone' },
      { key: 'headShape', type: 'choice', label: 'Head shape' },
    ] },
    { id: 'face', label: 'Face', items: [
      { key: 'eyes', type: 'choice', label: 'Eyes' },
      { key: 'eyeColor', type: 'color', label: 'Eye color' },
      { key: 'mouth', type: 'choice', label: 'Mouth' },
      { key: 'blush', type: 'toggle', label: 'Rosy cheeks' },
    ] },
    { id: 'hair', label: 'Hair', items: [
      { key: 'hair', type: 'choice', label: 'Style' },
      { key: 'hairColor', type: 'color', label: 'Color' },
    ] },
    { id: 'outfit', label: 'Outfit', items: [
      { key: 'top', type: 'choice', label: 'Top' },
      { key: 'topColor', type: 'color', label: 'Top color' },
      { key: 'pants', type: 'color', label: 'Pants / overalls' },
      { key: 'shoes', type: 'color', label: 'Shoes' },
    ] },
    { id: 'extras', label: 'Extras', items: [
      { key: 'accessory', type: 'choice', label: 'Accessory' },
      { key: 'accColor', type: 'color', label: 'Accent color' },
      { key: 'bg', type: 'color', label: 'Background' },
    ] },
  ];

  // Options that only change the head get a close-up preview.
  const HEAD_KEYS = ['headShape', 'eyes', 'mouth', 'hair', 'accessory'];
  const HEAD_VIEW = '40 -20 120 140';

  function previewSvg(key, value) {
    return render(Object.assign({}, state, { [key]: value }), {
      anim: 'none',
      viewBox: HEAD_KEYS.includes(key) ? HEAD_VIEW : undefined,
    });
  }

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, props, children) => {
    const node = Object.assign(document.createElement(tag), props || {});
    (children || []).forEach((c) => node.append(c));
    return node;
  };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function store(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  let state = sanitize(load(STORAGE_CURRENT, DEFAULTS));
  let gallery = (load(STORAGE_GALLERY, []) || []).filter((g) => g && g.id).map((g) => ({ id: String(g.id), state: sanitize(g.state) }));
  let activeTab = 'body';

  // Inject the shared animation CSS once so on-page SVGs animate.
  document.head.append(el('style', { textContent: CHARACTER_CSS }));

  function setState(patch) {
    state = sanitize(Object.assign({}, state, patch));
    store(STORAGE_CURRENT, state);
    renderStage();
    syncControls();
  }

  function renderStage() {
    const stage = $('#stage');
    stage.style.background = state.bg;
    stage.innerHTML = render(state);
  }

  // ---------- Controls ----------

  function buildTabs() {
    const tabs = $('#tabs');
    tabs.innerHTML = '';
    TABS.forEach((t) => {
      tabs.append(el('button', {
        className: 'tab',
        textContent: t.label,
        role: 'tab',
        onclick: () => { activeTab = t.id; buildTabs(); buildPanel(); },
      }));
      tabs.lastChild.setAttribute('aria-selected', String(t.id === activeTab));
    });
  }

  function buildPanel() {
    const panel = $('#panel');
    panel.innerHTML = '';
    const tab = TABS.find((t) => t.id === activeTab);
    tab.items.forEach((item) => {
      const field = el('div', { className: 'field' }, [el('div', { className: 'field-label', textContent: item.label })]);
      if (item.type === 'choice') field.append(choiceControl(item.key));
      if (item.type === 'color') field.append(colorControl(item.key));
      if (item.type === 'toggle') field.append(toggleControl(item.key));
      panel.append(field);
    });
    syncControls();
  }

  function choiceControl(key) {
    const wrap = el('div', { className: 'choices', role: 'radiogroup' });
    OPTIONS[key].forEach(([value, label]) => {
      const btn = el('button', { className: 'choice', type: 'button', title: label, onclick: () => setState({ [key]: value }) });
      btn.dataset.key = key;
      btn.dataset.value = value;
      btn.setAttribute('role', 'radio');
      btn.innerHTML = `<span class="choice-art">${previewSvg(key, value)}</span><span class="choice-label"></span>`;
      btn.querySelector('.choice-label').textContent = label;
      wrap.append(btn);
    });
    return wrap;
  }

  function colorControl(key) {
    const wrap = el('div', { className: 'swatches' });
    PALETTES[key].forEach((color) => {
      const sw = el('button', { className: 'swatch', type: 'button', title: color, onclick: () => setState({ [key]: color }) });
      sw.style.background = color;
      sw.dataset.key = key;
      sw.dataset.value = color;
      sw.setAttribute('aria-label', color);
      wrap.append(sw);
    });
    const custom = el('input', { type: 'color', className: 'custom-color', title: 'Custom color' });
    custom.dataset.key = key;
    custom.setAttribute('aria-label', 'Custom color');
    custom.addEventListener('input', () => setState({ [key]: custom.value }));
    wrap.append(custom);
    return wrap;
  }

  function toggleControl(key) {
    const input = el('input', { type: 'checkbox', className: 'toggle' });
    input.dataset.key = key;
    input.addEventListener('change', () => setState({ [key]: input.checked }));
    return el('label', { className: 'toggle-wrap' }, [input, el('span', { textContent: 'On' })]);
  }

  // Reflect state in all controls without rebuilding them.
  function syncControls() {
    document.querySelectorAll('.choice').forEach((b) => {
      b.setAttribute('aria-checked', String(state[b.dataset.key] === b.dataset.value));
    });
    document.querySelectorAll('.swatch').forEach((b) => {
      b.setAttribute('aria-pressed', String(state[b.dataset.key] === b.dataset.value));
    });
    document.querySelectorAll('.custom-color').forEach((i) => { i.value = state[i.dataset.key]; });
    document.querySelectorAll('.toggle').forEach((i) => { i.checked = !!state[i.dataset.key]; });
    document.querySelectorAll('#anim-buttons .chip').forEach((b) => {
      b.setAttribute('aria-checked', String(state.anim === b.dataset.value));
    });
    // Choice previews show the character with each option applied.
    document.querySelectorAll('.choice').forEach((b) => {
      b.querySelector('.choice-art').innerHTML = previewSvg(b.dataset.key, b.dataset.value);
    });
    const name = $('#name');
    if (document.activeElement !== name) name.value = state.name;
    $('#speed').value = state.speed;
    $('#speed-out').textContent = state.speed + '×';
  }

  function buildAnimButtons() {
    const bar = $('#anim-buttons');
    OPTIONS.anim.forEach(([value, label]) => {
      const b = el('button', { className: 'chip', type: 'button', textContent: label, onclick: () => setState({ anim: value }) });
      b.dataset.value = value;
      b.setAttribute('role', 'radio');
      bar.append(b);
    });
  }

  // ---------- Gallery ----------

  function renderGallery() {
    const g = $('#gallery');
    g.innerHTML = '';
    $('#gallery-count').textContent = gallery.length ? `${gallery.length} saved` : '';
    if (!gallery.length) {
      g.append(el('p', { className: 'muted empty', textContent: 'Saved characters show up here. Hit “Save to gallery” to keep one.' }));
      return;
    }
    gallery.forEach((item) => {
      const card = el('div', { className: 'g-item' });
      const open = el('button', { className: 'g-open', type: 'button', title: 'Load ' + item.state.name, onclick: () => { setState(item.state); toast(`Loaded ${item.state.name}`); } });
      open.style.background = item.state.bg;
      open.innerHTML = render(item.state, { anim: 'idle' });
      const del = el('button', { className: 'g-del', type: 'button', textContent: '✕', title: 'Delete', onclick: () => {
        gallery = gallery.filter((x) => x.id !== item.id);
        store(STORAGE_GALLERY, gallery);
        renderGallery();
      } });
      del.setAttribute('aria-label', 'Delete ' + item.state.name);
      card.append(open, el('div', { className: 'g-name', textContent: item.state.name }), del);
      g.append(card);
    });
  }

  // ---------- Export ----------

  function fileBase() {
    return (state.name || 'character').trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'character';
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportSvg() {
    const svg = render(state, { embedCss: true, background: true });
    download(new Blob([svg], { type: 'image/svg+xml' }), fileBase() + '.svg');
    toast('Animated SVG downloaded — open it in any browser.');
  }

  function exportPng() {
    const svg = render(state, { background: true, anim: 'none' });
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const scale = 4;
      const canvas = el('canvas', { width: 200 * scale, height: 320 * scale });
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        download(blob, fileBase() + '.png');
        toast('PNG downloaded.');
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('Could not render PNG.'); };
    img.src = url;
  }

  function exportJson() {
    download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), fileBase() + '.json');
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setState(sanitize(JSON.parse(reader.result)));
        toast('Character imported.');
      } catch (e) {
        toast('That file is not a valid character.');
      }
    };
    reader.readAsText(file);
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- Wire up ----------

  buildAnimButtons();
  buildTabs();
  buildPanel();
  renderStage();
  renderGallery();

  $('#name').addEventListener('input', (e) => setState({ name: e.target.value }));
  $('#speed').addEventListener('input', (e) => setState({ speed: Number(e.target.value) }));
  $('#btn-random').addEventListener('click', () => setState(randomState({ name: state.name, anim: state.anim, speed: state.speed, bg: state.bg })));
  $('#btn-save').addEventListener('click', () => {
    gallery.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), state: Object.assign({}, state) });
    if (store(STORAGE_GALLERY, gallery)) toast(`Saved ${state.name} to your gallery.`);
    else toast('Could not save — browser storage is unavailable.');
    renderGallery();
  });
  $('#btn-svg').addEventListener('click', exportSvg);
  $('#btn-png').addEventListener('click', exportPng);
  $('#btn-json').addEventListener('click', exportJson);
  $('#import').addEventListener('change', (e) => {
    if (e.target.files[0]) importJson(e.target.files[0]);
    e.target.value = '';
  });
})();
