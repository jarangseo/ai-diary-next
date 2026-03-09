# CSS Reset Guide

CSS reset rules based on adot-web `common.scss`

## Core Philosophy

1. **`:where([class])`** — Only resets elements with classes, preserving default browser styles for plain HTML
2. **`:where()`** — Zero specificity, making it easy to override from anywhere
3. **Cross-browser normalization** — Consistent starting point across all browsers

---

## Font Declaration

```scss
@font-face {
  font-family: 'Pretendard Variable';
  font-weight: 45 920;
  font-style: normal;
  font-display: swap;
  src: url('...') format('woff2-variations');
}
```

| Property | Description |
|----------|-------------|
| `font-weight: 45 920` | Variable Font: supports all weights from 45 (Thin) to 920 (Black) |
| `font-display: swap` | Shows system font first while loading (prevents flash of invisible text) |
| `format('woff2-variations')` | Variable Font format |

---

## HTML / Body Base Settings

```scss
:where(html, body) {
  min-height: 100dvh;
}
```

- `dvh` = Dynamic Viewport Height
- Calculates correct height even when mobile address bar hides/shows
- `100vh` has a known bug on mobile where address bar height causes overflow

```scss
:where(html) {
  text-size-adjust: none;
}
```

- Prevents iOS Safari from automatically enlarging text on screen rotation

```scss
:where(body) {
  box-sizing: border-box;
  margin: 0;
  padding-bottom: env(safe-area-inset-bottom);
  overflow-wrap: break-word;
  font-family: 'Pretendard Variable', Pretendard, system-ui, sans-serif;
}
```

| Property | Description |
|----------|-------------|
| `box-sizing: border-box` | Includes padding and border in width calculation (intuitive sizing) |
| `margin: 0` | Removes default browser margin |
| `padding-bottom: env(safe-area-inset-bottom)` | Adds spacing for iPhone home indicator area |
| `overflow-wrap: break-word` | Wraps long words to prevent overflow |

---

## Language-Specific Handling

```scss
:where(:lang(ko)) {
  word-break: keep-all;
}
```

- Breaks Korean text at word boundaries instead of character boundaries
- Without this, words get split mid-syllable, hurting readability
- Example: prevents "안녕하세요" from breaking into "안녕하" / "세요"

---

## Images

```scss
:where(img) {
  max-width: 100%;
  height: auto;
}
```

- Prevents images from overflowing their parent container
- Maintains aspect ratio

---

## Class-Based Element Reset

```scss
:where([class]) {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: inherit;
}
```

| Property | Description |
|----------|-------------|
| `margin: 0` | Removes default browser margin (h1, p, etc.) |
| `padding: 0` | Removes default browser padding |
| `box-sizing: border-box` | Includes padding and border in width calculation |
| `font-family: inherit` | Inherits parent font (input, button, etc. don't inherit by default) |

> Why `:where([class])`: **Only resets elements with classes.** Plain HTML without classes keeps default browser styles. `:where()` has zero specificity, so it's easy to override later.

---

## Pseudo Elements

```scss
:where([class])::before,
:where([class])::after {
  box-sizing: border-box;
  pointer-events: none;
}
```

- `::before`, `::after` are decorative, so click events are ignored
- Unified sizing with `box-sizing: border-box`

---

## Lists

```scss
:where(ol[class], ul[class]) {
  list-style: none;
}
```

- Removes default bullets/numbers for lists with classes (they'll have custom designs)

---

## Form Element Reset

```scss
:where(button[class], dialog[class], fieldset[class], hr[class],
       iframe[class], input[class], select[class], textarea[class]) {
  border: 0;
}
```

- Removes default browser borders

```scss
:where(input[class], textarea[class]) {
  border-radius: 0;
}
```

- Removes default rounded corners that iOS Safari adds to inputs

```scss
:where(button[class], input[class], mark[class], meter[class], progress[class]) {
  background-color: transparent;
}
```

- Removes default background colors (button has gray, mark has yellow, etc.)

---

## Tables

```scss
:where(table[class]) {
  border: 0;
  border-collapse: collapse;
  border-spacing: 0;
}
```

- `border-collapse: collapse` — Removes gaps between cells
- `border-spacing: 0` — Removes spacing between cells

---

## Appearance Reset

```scss
:where(button[class], input[class], meter[class], progress[class],
       select[class], textarea[class]) {
  appearance: none;
}
```

- Completely removes OS default UI styling
- Creates a blank canvas for custom designs

---

## Cursor

```scss
:where(button[class], label[class], [type='checkbox'][class], [type='radio'][class]) {
  cursor: pointer;
}
```

- Shows pointer cursor on clickable elements
