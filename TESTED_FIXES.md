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

---

### Bug 4: Pinch-Zoom Out Viewport Shift (Left-Alignment & Black Gutter)
* **Problem**: When a user pinched out on mobile, the entire page shriveled to the left while the fixed header stayed full width, creating an awkward black gap on the right.
* **Root Cause**: Viewport was unconstrained allowing unlimited scaling, and `.hero-content` had `max-width: 860px` with no auto-centering.
* **Fix Applied**:
  - Locked viewport scale in all HTML files: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">`.
  - Added `justify-content: center;` to `.hero-section` and `margin: 0 auto; width: 100%;` to `.hero-content`.

---

### Bug 5: Excessive Dead Space Below Walkthrough
* **Problem**: Walking through the 3 cards left a giant void of empty black scrolling before the Vision section appeared.
* **Fix Applied**:
  - Reduced `.walkthrough-section` height to `190vh` on desktop, `170vh` on tablet, and `160vh` on mobile.

---

### Bug 6: Walkthrough Bottom Half Black / Empty Void Rendering Issue
* **Problem**: On mobile and desktop, the scroll-through window showed a card at the top, but the entire bottom half of the screen appeared as a black void and seemed like it wasn't rendering.
* **Root Causes**:
  1. The glassmorphic cards were pinned to `top: 85px` on mobile, occupying only the upper 220px of the viewport and leaving the lower 60% (~550px) completely empty.
  2. The `.walkthrough-vignette` gradient had `rgba(8, 8, 11, 0.7)` at the bottom, which combined with the dark ground in the external Unsplash photo (`photo-1500382017468-9049fed747ef`), masking the entire bottom half into pitch black.
  3. External Unsplash images could fail, throttle, or lag on mobile networks.
  4. Adding `overflow-x: hidden` in earlier attempts broke `position: sticky;`, while removing it completely allowed horizontal shifting.
* **Fix Applied**:
  - Replaced external Unsplash URLs with local, ultra-fast, authentic project photography (`chandauti_aerial1.jpg`, `chandauti_aerial2.jpg`, `phase4_pdf2_img_2.jpg`).
  - Added Scene 3 background element so all 3 guide steps have individual visual representations.
  - Used `overflow-x: clip;` on `html, body`: prevents horizontal overflow and zoom-out page shifts without breaking `position: sticky;`.
  - On desktop: Centered `.glass-walkthrough-card` vertically (`top: 50%; transform: translateY(-50%)`) for balanced framing.
  - On mobile: Docked `.glass-walkthrough-card` elegantly at the bottom (`bottom: 24px; left: 14px; right: 14px;`), letting the aerial photography shine in the upper 65% of the screen while the frosted step details sit clearly at the bottom.
  - Softened `.walkthrough-vignette` to `rgba(8, 8, 11, 0.5)` so full landscape details remain visible without pitch-black voids.
