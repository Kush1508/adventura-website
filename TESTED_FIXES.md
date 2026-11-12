# ADVENTURA - Tested Fixes & Regression Protection Registry

This registry tracks verified bug fixes to ensure no future change re-introduces past bugs.

---

### Bug 1: Mobile Horizontal Viewport Overflow & Layout Clipping
* **Problem**: On mobile phones (< 768px), swiping sideways shifted the page horizontally, causing the header logo, tagline, and hero text to clip off-screen.
* **Root Causes**:
  1. Parallax background light orbs (`.orb-1`, `.orb-2`, `.orb-3`) had negative offsets (`right: -5%`, etc.) with `width: 550px - 600px`, floating unbounded across the viewport.
  2. Header items (`.nav-container`, `.nav-actions .btn`) had fixed heights and paddings that exceeded 360px viewport widths.
  3. `.hero-title` clamp lower bound was too large for small screens.
* **Fix Applied**:
  - The parallax orbs are wrapped inside an `overflow: hidden; inset: 0; position: absolute;` container so they can never expand the viewport.
  - `.container` has `box-sizing: border-box; width: 100%;`.
  - `@media (max-width: 992px)` and `@media (max-width: 600px)` hide the background blur orbs and scale the header logo and buttons to fit strictly within 100% of mobile viewports.
* **CRITICAL DO NOT BREAK RULE**: NEVER add `overflow-x: hidden` to `html` or `body`. In modern browsers, `overflow-x: hidden` on `body` or `html` disables `position: sticky` on child elements, which breaks the Scrollytelling Walkthrough section!

---

### Bug 2: Mobile Lag, Frame Drops & 3D Robot 2–3s Loading Delay
* **Problem**: 
  1. Heavy scroll stutter and jitter on mobile screens.
  2. The robot took 2–3 seconds to stream from the cloud with a blank screen.
  3. Touch scrolling was trapped by the 3D WebGL canvas.
* **Root Causes**:
  1. `app.js` was firing unthrottled DOM measurements (`offsetTop`, `offsetHeight`) on every raw scroll pixel.
  2. Mobile GPU was being forced to render 3 large blurred gradients (`filter: blur(80px)`) plus 3D WebGL simultaneously.
  3. Continuous `pointermove` event simulation was executing on touch devices.
* **Fix Applied**:
  - Scroll updates in `app.js` are now throttled via `requestAnimationFrame` with `{ passive: true }`.
  - Blurred orbs and mouse-spotlight are disabled on mobile viewports (< 992px), leaving 100% GPU bandwidth for smooth 60fps scrolling.
  - Added `.spline-loader` with an elegant branded spinner that fades out cleanly once the 3D scene finishes compiling.
  - Added `pointer-events: none; touch-action: pan-y;` to `.spline-container` on mobile so dragging gestures pass directly to native smooth scroll.
* **DO NOT BREAK RULE**: Do not attach unthrottled scroll/mousemove listeners or re-enable full-screen CSS blur filters on mobile viewports.

---

### Bug 3: Walkthrough Scrollytelling Section Sticky Pinned Behavior
* **Problem**: As seen on desktop, scrolling into the walkthrough showed an empty black screen because the background images and cards were not pinned to the viewport.
* **Root Cause**: `overflow-x: hidden` on `html`/`body` broke CSS `position: sticky;` on `.walkthrough-sticky-wrapper`.
* **Fix Applied**:
  - Removed `overflow-x: hidden` from `html` and `body`.
  - Throttled `initWalkthroughScroll` with `requestAnimationFrame`.
  - Ensured Card 1 and Scene 1 display immediately upon entering the section (`progress < 0.35`).
