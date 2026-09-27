# Character Studio

A small browser app for designing animated cartoon characters. It uses plain HTML, CSS and JavaScript, with no build step and no dependencies.

## Run it

Open `index.html` in a browser. You can also serve the folder:

```sh
npx serve .        # or: python3 -m http.server
```

## What you can do

- **Anime presets**: start from a ready-made anime character (School girl, Ninja hero, Magical girl, Cat girl, Cool senpai, Snow spirit) and customize it, or hit **✨ Random anime**.
- **Anime style parts**: an anime face shape, anime, sparkle and cool eyes (with brows), tiny, cat and shout mouths, hero spikes, twin tails, hime cut, ponytail and bob hair, sailor, blazer, ninja and magical-girl outfits, and cat ears, a ninja headband and a hair clip.

- **Customize**: skin tone, head shape, eyes and eye color, mouth, rosy cheeks, hair style and color, outfit (T-shirt, stripes, hoodie, star tee, overalls, dress), pants, shoes, accessories (glasses, top hat, party hat, bow, headphones, crown) and background. Every color takes a preset swatch or a custom color.
- **Animate**: idle, wave, jump, dance, walk, talk and spin, with a speed slider.
- **Randomize** a new character with one click.
- **Gallery**: save characters in your browser (localStorage) and click one to load it again.
- **Export**:
  - **Animated SVG**: a single file that animates by itself in any browser, and that you can drop into a web page.
  - **PNG**: a still image at 4× resolution.
  - **JSON**: the character's settings, which you can re-import later or share.

## How it works

| File | Role |
| --- | --- |
| `js/character.js` | The renderer. `AnimChar.render(state, opts)` turns a settings object into an SVG string. Each body part (head, arms, legs, eyes, mouth) is its own `<g>`, and `CHARACTER_CSS` animates them with keyframes. |
| `js/app.js` | The UI: tabs, option pickers with live previews, gallery, import and export. |
| `css/styles.css` | Layout and theme, with light and dark modes and a responsive layout. |

The same animation CSS is embedded in exported SVGs, which is why they keep animating outside the app.

### Adding options

- **Hair style, accessory, top, etc.**: add an entry to `OPTIONS` in `js/character.js`, then a matching `case` in the relevant `*Svg()` function. Hair and accessories are drawn against a round head centered at (100, 80) with radius 45, and are scaled automatically to fit the other head shapes.
- **Animation**: add it to `OPTIONS.anim`, then write keyframes and `.anim-<name> .ac-<part>` rules in `CHARACTER_CSS`. The animatable parts are `ac-all`, `ac-upper`, `ac-head`, `ac-armL`, `ac-armR`, `ac-legL`, `ac-legR`, `ac-eyes`, `ac-mouth` and `ac-shadow`.
