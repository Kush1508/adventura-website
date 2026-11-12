# ADVENTURA - Tested Fixes & Regression Protection Registry

This registry tracks verified bug fixes to ensure no future change re-introduces past bugs.

---

### Bug 1: Mobile Horizontal Viewport Overflow & Layout Clipping
* **Problem**: On mobile phones (< 768px), swiping sideways shifted the page horizontally, causing the header logo, tagline, and hero text to clip off-screen.
* **Root Causes**:
  1. `body` was missing `overflow-x: hidden; width: 100%; max-width: 100%;`.
  2. Parallax background light orbs (`.orb-1`, `.orb-2`, `.orb-3`) had negative offsets (`right: -5%`, etc.) with `width: 550px - 600px`, causing mobile viewports to stretch.
  3. Header items (`.nav-container`, `.nav-actions .btn`) had fixed heights and paddings that exceeded 360px viewport widths.
  4. `.hero-title` clamp lower bound was too large for small screens.
* **Fix Applied**:
  - `body` now has `overflow-x: hidden; width: 100%; max-width: 100%;`.
  - `.container` has `box-sizing: border-box; width: 100%;`.
  - `@media (max-width: 992px)` and `@media (max-width: 600px)` hide the background blur orbs and scale the header logo and buttons to fit strictly within 100% of mobile viewports.
* **DO NOT BREAK RULE**: Do not remove `overflow-x: hidden` from `body` or add elements with fixed widths greater than 100% without responsive media query clamps.

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
