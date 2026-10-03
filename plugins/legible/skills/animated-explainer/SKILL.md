---
name: animated-explainer
description: Build a step-by-step animated explainer as one offline HTML file - the top rung of Karpathy's format ladder, after text, diagrams and HTML pages. Use only when the user asks for an animation, a video-like or step-by-step explanation, "покажи по шагам", "анимацию", runs /legible:animate, or presses the Анимация button on the session board. Do not build one unasked.
license: MIT
metadata:
  version: 0.2.0
---

# Animated explainer: a step player

Karpathy calls bespoke explainer videos the format he is most bullish on. We build the version that needs nothing
installed: one HTML file that plays a diagram step by step, with a caption for each step. No audio, no network.

## 1. Plan the steps first

- **Question**: the one question the reader has.
- **Answer**: one sentence. It goes under the title.
- **Steps**: 3 to 8. Each step adds one thing to the picture and has one caption sentence (plain-80 or plain-ru-80).
  The steps build the full picture in the order the reader must understand it, usually the order things happen.
- **Check every claim** the steps make, as in the `visual-explainer` skill. Remove what you cannot support.

## 2. Fill the template

Copy [assets/player.html](assets/player.html) to `explainers/<slug>-steps.html` in the project. Change only these parts:

1. `<html lang>`, both `TITLE` places and `ANSWER IN ONE SENTENCE`.
2. The `<svg>` content: draw the full diagram (15 nodes or fewer, labels of 4 words or fewer). Give each part the step
   at which it appears: `data-s="2"`. A part stays visible after its step. For something that shows only during
   one step, such as a moving dot, use `data-only="3"` (SMIL `<animateMotion>` works). Draw an edge as
   `<path pathLength="1" ...>` and it draws itself in. Use `currentColor` for strokes and text so both color schemes
   work. Put the same `data-ref="x"` on parts that belong together: hover lights them all up.
3. The captions: one `<li data-n="N">` per step in `#captions`.
4. For a language other than English, translate `data-hint` on `#caption`, `data-overview` on `.counter` and the
   button labels.

Do not change the script or the Content-Security-Policy line. Add nothing from the network: no fonts, no CDN, no images
by URL.

## 3. What the player does

It opens on the full picture with a hint, and it never starts by itself. ‹ and › step back and forward, Play goes one
step every 3.5 seconds, the slider jumps to any step, and the arrow keys and Space work too. The address gets
`#step=N`, so a link opens on that step. With reduced motion on, nothing moves and Play is hidden. A printout shows
the full picture and every caption.

## 4. Hand it over

Tell the user the path in one line and the number of steps. Offer three questions to check the understanding
(`teach-back`). Do not paste the HTML into the chat.
