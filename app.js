/* ==========================================================================
   ADVENTURA REAL ESTATE - Core Web Application Engine & CMS Script
   Bulletproof Exception Handling & Dynamic Scroll Visual Effects
   ========================================================================== */

(function () {
  'use strict';

  // State & In-Memory Fallback Storage
  let projects = [];
  let leads = [];
  let currentAdminTab = 'projects-cms';
  const ADMIN_PIN = "adventura2026";
  const memoryStorage = {};

  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';

  /* ==========================================================================
     SAFE STORAGE HELPER
     ========================================================================== */
  function safeGetStorage(key, fallbackValue) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallbackValue;
      }
    } catch (e) {
      console.warn(`[Adventura Storage] LocalStorage read blocked for "${key}".`, e);
    }
    return memoryStorage[key] !== undefined ? memoryStorage[key] : fallbackValue;
  }

  function safeSetStorage(key, data) {
    memoryStorage[key] = data;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (e) {
      console.warn(`[Adventura Storage] LocalStorage write failed for "${key}".`, e);
    }
  }

  /* ==========================================================================
     INITIALIZATION & DOM READY
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    try {
      initProjectsData();
      initLeadsData();
      initTestimonialsData();
      renderProjects('all');
      renderTestimonials();
      initEMICalculator();
      initEventListeners();
      initScrollEffects();
      initWalkthroughScroll();
      initHeroVideo();
      initFastSplineMouseTracking();
      initThemeToggle();
      checkSecretAdminRoute();
    } catch (err) {
      console.error('[Adventura Engine Initialization Error]', err);
    }
  });

  /* ==========================================================================
     RADIAL THEME SWITCH CONTROLLER (Codemure Style Circular Ripple)
     ========================================================================== */
  function initThemeToggle() {
    const toggleBtn = document.getElementById('themeToggleBtn');
    
    // Apply saved theme immediately
    const savedTheme = localStorage.getItem('adventura_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    if (!toggleBtn) return;

    let isTransitioning = false;

    const performToggle = (event) => {
      if (isTransitioning) return;

      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

      const rect = toggleBtn.getBoundingClientRect();
      const clientX = event.clientX || (event.touches && event.touches[0] && event.touches[0].clientX);
      const clientY = event.clientY || (event.touches && event.touches[0] && event.touches[0].clientY);
      const x = (typeof clientX === 'number' && clientX > 0) ? clientX : (rect.left + rect.width / 2);
      const y = (typeof clientY === 'number' && clientY > 0) ? clientY : (rect.top + rect.height / 2);

      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      // Engine A: View Transitions API (Chrome / Edge / Supporting Browsers)
      if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        isTransitioning = true;
        const transition = document.startViewTransition(() => {
          document.documentElement.setAttribute('data-theme', nextTheme);
          localStorage.setItem('adventura_theme', nextTheme);
        });

        transition.ready.then(() => {
          try {
            document.documentElement.animate(
              {
                maskPosition: ['0% 0%', '100% 0%'],
                WebkitMaskPosition: ['0% 0%', '100% 0%']
              },
              {
                duration: 850,
                easing: 'steps(24)',
                pseudoElement: '::view-transition-new(root)',
                fill: 'forwards'
              }
            );
          } catch (e) {
            // CSS @keyframes fallback will run
          }
        });

        transition.finished.finally(() => {
          isTransitioning = false;
        });
      } else {
        // Engine B: Universal Animated Ink-Ripple Transition (iOS Safari, Mobile Touch & Fallback)
        isTransitioning = true;
        const overlay = document.createElement('div');
        overlay.className = 'theme-transition-overlay';
        const targetBg = nextTheme === 'light' ? '#F8F9FC' : '#08080B';
        overlay.style.backgroundColor = targetBg;
        document.body.appendChild(overlay);

        const anim = overlay.animate([
          { clipPath: `circle(0px at ${x}px ${y}px)`, WebkitClipPath: `circle(0px at ${x}px ${y}px)` },
          { clipPath: `circle(${endRadius * 1.05}px at ${x}px ${y}px)`, WebkitClipPath: `circle(${endRadius * 1.05}px at ${x}px ${y}px)` }
        ], {
          duration: 600,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards'
        });

        anim.onfinish = () => {
          document.documentElement.setAttribute('data-theme', nextTheme);
          localStorage.setItem('adventura_theme', nextTheme);
          overlay.remove();
          isTransitioning = false;
        };
      }
    };

    toggleBtn.addEventListener('click', performToggle);
  }

  function initFastSplineMouseTracking() {
    const modelViewer = document.getElementById('heroModelViewer') || document.querySelector('model-viewer');
    const splineViewer = document.querySelector('spline-viewer');
    const loader = document.getElementById('splineLoader');

    const hideLoader = () => {
      if (loader && loader.style.display !== 'none') {
        loader.style.opacity = '0';
        setTimeout(() => { if (loader) loader.style.display = 'none'; }, 400);
      }
    };

    if (modelViewer) {
      modelViewer.addEventListener('load', hideLoader);
      modelViewer.addEventListener('error', () => {
        // Fallback to alternate public path if primary fails
        if (!modelViewer.src.includes('public/interior.glb.glb')) {
          modelViewer.src = 'public/interior.glb.glb';
        }
      });
      // Safety timer to guarantee loader never hangs
      setTimeout(hideLoader, 2500);

      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (!isTouch) {
        let rafId = null;
        let lastEvent = null;

        const updateCameraParallax = () => {
          if (!lastEvent || !modelViewer) return;
          const xRatio = (lastEvent.clientX / window.innerWidth) - 0.5;
          const yRatio = (lastEvent.clientY / window.innerHeight) - 0.5;
          const baseTheta = 45;
          const theta = baseTheta + (xRatio * 16);
          const phi = 75 + (yRatio * 8);
          try {
            if (modelViewer.cameraOrbit) {
              modelViewer.cameraOrbit = `${theta.toFixed(1)}deg ${phi.toFixed(1)}deg 105%`;
            }
          } catch (e) {}
          rafId = null;
        };

        window.addEventListener('mousemove', (e) => {
          lastEvent = e;
          if (!rafId) {
            rafId = requestAnimationFrame(updateCameraParallax);
          }
        }, { passive: true });
      }
    } else if (splineViewer) {
      splineViewer.addEventListener('load', hideLoader);
      setTimeout(hideLoader, 3000);
    } else {
      setTimeout(hideLoader, 1000);
    }
  }

  function initHeroVideo() {
    const video = document.getElementById('heroBgVideo');
    if (!video) return;

    video.muted = true;
    video.playsInline = true;

    const attemptPlay = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          const unlock = () => {
            video.play().catch(() => {});
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('scroll', unlock);
          };
          document.addEventListener('click', unlock, { once: true, passive: true });
          document.addEventListener('touchstart', unlock, { once: true, passive: true });
          document.addEventListener('scroll', unlock, { once: true, passive: true });
        });
      }
    };

    if (document.readyState === 'complete') {
      attemptPlay();
    } else {
      window.addEventListener('load', attemptPlay, { once: true });
    }
  }

  window.addEventListener('hashchange', checkSecretAdminRoute);
  window.addEventListener('popstate', checkSecretAdminRoute);

  function checkSecretAdminRoute() {
    const hash = (window.location.hash || '').toLowerCase();
    const path = (window.location.pathname || '').toLowerCase();
    const search = (window.location.search || '').toLowerCase();

    if (hash.includes('adventura-secure-dashboard-xyz') || 
        path.includes('adventura-secure-dashboard-xyz') || 
        search.includes('adventura-secure-dashboard-xyz') ||
        hash === '#admin-dashboard') {
      const modal = document.getElementById('adminCMSModal');
      if (modal) {
        renderAdminCMS();
        modal.classList.add('active');
      }
    }
  }

  function getDeletedProjectIds() {
    return safeGetStorage('adventura_deleted_projects_v1', []);
  }

  function addDeletedProjectId(id) {
    const deleted = getDeletedProjectIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      safeSetStorage('adventura_deleted_projects_v1', deleted);
    }
  }

  function initProjectsData() {
    const saved = safeGetStorage('adventura_projects_v2', null);
    const deletedIds = getDeletedProjectIds();
    const initial = Array.isArray(window.INITIAL_PROJECTS) ? window.INITIAL_PROJECTS : [];

    if (saved && Array.isArray(saved)) {
      projects = saved.filter(p => !deletedIds.includes(p.id)).map(p => {
        const matchingInit = initial.find(i => i.id === p.id);
        if (matchingInit) {
          return {
            ...p,
            location: p.location || matchingInit.location,
            highlights: p.highlights && p.highlights.length > 0 ? p.highlights : matchingInit.highlights,
            description: p.description || matchingInit.description,
            priceRange: p.priceRange || matchingInit.priceRange,
            plotSizes: p.plotSizes || matchingInit.plotSizes,
            roadWidth: p.roadWidth || matchingInit.roadWidth,
            possession: p.possession || matchingInit.possession,
            images: (p.images && p.images.length > 0 && p.images[0]) ? p.images : matchingInit.images,
            videoUrl: p.videoUrl !== undefined ? p.videoUrl : matchingInit.videoUrl
          };
        }
        return p;
      });

      initial.forEach(initP => {
        if (!projects.some(p => p.id === initP.id) && !deletedIds.includes(initP.id)) {
          projects.push(initP);
        }
      });

      safeSetStorage('adventura_projects_v2', projects);
    } else {
      projects = initial.filter(p => !deletedIds.includes(p.id));
      safeSetStorage('adventura_projects_v2', projects);
    }
  }

  function initLeadsData() {
    const savedLeads = safeGetStorage('adventura_leads_v1', null);
    if (savedLeads && Array.isArray(savedLeads)) {
      leads = savedLeads;
    } else {
      leads = [
        {
          id: 'lead-101',
          name: 'Rajesh Kumar',
          phone: '+91 9835123456',
          email: 'rajesh.patna@gmail.com',
          interest: 'Residential Plots',
          message: 'Looking for 1500 sq.ft plot in Dream City Phase 4 Karmouni with clear registry.',
          date: '2026-09-15 14:30',
          status: 'New'
        },
        {
          id: 'lead-102',
          name: 'Priya Sharma',
          phone: '+91 9431098765',
          email: 'priya.sharma@yahoo.com',
          interest: 'Commercial Spaces',
          message: 'Interested in Bhawa Tower AP Colony commercial showroom booking details.',
          date: '2026-09-15 11:15',
          status: 'Contacted'
        }
      ];
      safeSetStorage('adventura_leads_v1', leads);
    }
  }

  let testimonials = [];
  const INITIAL_TESTIMONIALS = [
    {
      id: 't-1',
      name: 'Rameshwar Prasad Singh',
      role: 'Retd. Bank Branch Manager',
      location: 'Patna / Gaya',
      project: 'Dream City Phase 1',
      rating: 5,
      quote: 'I bought a 2,400 sq.ft plot in Dream City Phase 1. Ankit Kumar and the Adventura team handled the legal verification and registry seamlessly. 100% mutation completed without any hassle. Truly living up to Trust & Transparency!',
      verified: true,
      avatar: 'https://images.unsplash.com/photo-1566753323558-f4e0952af115?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 't-2',
      name: 'Dr. Sunita Sinha',
      role: 'Senior Medical Practitioner',
      location: 'AP Colony, Gaya',
      project: 'AP Colony Commercial Hub',
      rating: 5,
      quote: 'As a medical professional, I had no time to visit multiple layout sites. Adventura provided guided site visits and clear road width blueprints. We secured a commercial space in AP Colony at fair transparent pricing.',
      verified: true,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 't-3',
      name: 'Alok Verma',
      role: 'Software Engineer & NRI Investor',
      location: 'Bengaluru / Bodhgaya',
      project: 'Bodhgaya International Residency',
      rating: 5,
      quote: 'Investing in Bihar real estate from outside was always risky until I found Adventura. Complete video walkthroughs, transparent payment milestones, and dedicated staff support. Highly recommend to all investors!',
      verified: true,
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 't-4',
      name: 'Vikas Kumar & Family',
      role: 'Local Business Owner',
      location: 'Karmouni, Gaya',
      project: 'Dream City Phase 4',
      rating: 5,
      quote: 'Extremely satisfied with our purchase in Dream City Phase 4. Paved blacktop roads, electric poles, and clear boundary demarcation were already completed before registry. Adventura is transforming real estate in Gaya!',
      verified: true,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
    }
  ];

  function initTestimonialsData() {
    const saved = safeGetStorage('adventura_testimonials_v1', null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      testimonials = saved;
    } else {
      testimonials = INITIAL_TESTIMONIALS;
      safeSetStorage('adventura_testimonials_v1', testimonials);
    }
  }

  function renderTestimonials() {
    try {
      const container = document.getElementById('testimonialsContainer');
      if (!container) return;

      container.innerHTML = testimonials.map(t => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-line); border-radius: var(--radius-lg); padding: 30px; position: relative; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div style="color: #F59E0B; font-size: 1.1rem;">
                ${'<i class="ri-star-fill"></i>'.repeat(t.rating || 5)}
              </div>
              <span style="font-size: 0.75rem; font-family: var(--font-mono); background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 999px; color: var(--red-light);">${escapeHtml(t.project)}</span>
            </div>
            <p style="color: var(--text-main); font-size: 0.95rem; line-height: 1.7; font-style: italic; margin-bottom: 24px;">"${escapeHtml(t.quote)}"</p>
          </div>
          <div style="display: flex; align-items: center; gap: 14px; border-top: 1px solid var(--border-line); padding-top: 16px;">
            <img src="${t.avatar || 'https://images.unsplash.com/photo-1566753323558-f4e0952af115?auto=format&fit=crop&w=300&q=80'}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-line);" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1566753323558-f4e0952af115?auto=format&fit=crop&w=300&q=80';">
            <div>
              <h4 style="font-size: 1rem; color: #fff; margin: 0;">${escapeHtml(t.name)}</h4>
              <span style="font-size: 0.78rem; color: #10B981; font-family: var(--font-mono);"><i class="ri-checkbox-circle-fill"></i> ${escapeHtml(t.role)} • ${escapeHtml(t.location)}</span>
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error('[Adventura Render Testimonials Error]', e);
    }
  }

  function openClientReviewModal() {
    const modal = document.getElementById('clientReviewModal');
    if (modal) modal.classList.add('active');
  }

  function handleClientReviewSubmit(e) {
    if (e) e.preventDefault();
    try {
      const name = (document.getElementById('reviewName').value || '').trim();
      const role = (document.getElementById('reviewRole').value || '').trim() || 'Valued Land Buyer';
      const location = (document.getElementById('reviewLocation').value || '').trim() || 'Gaya / Bihar';
      const project = document.getElementById('reviewProject').value;
      const rating = parseInt(document.getElementById('reviewRating').value, 10) || 5;
      const avatar = document.getElementById('reviewAvatar').value;
      const quote = (document.getElementById('reviewQuote').value || '').trim();

      if (!name || !quote) {
        alert('Please fill out your name and review message.');
        return;
      }

      const newTestimonial = {
        id: 't-' + Date.now(),
        name,
        role,
        location,
        project,
        rating,
        quote,
        verified: true,
        avatar
      };

      testimonials.unshift(newTestimonial);
      safeSetStorage('adventura_testimonials_v1', testimonials);
      renderTestimonials();
      closeModal('clientReviewModal');
      alert(`Thank you ${name}! Your client review has been published live on the website.`);
      e.target.reset();
    } catch (err) {
      console.error('[Adventura Client Review Submit Error]', err);
    }
  }

  /* ==========================================================================
     SCROLLYTELLING WALKTHROUGH CONTROLLER (60FPS FRAME-BY-FRAME CANVAS ENGINE)
     ========================================================================== */
  function initWalkthroughScroll() {
    const section = document.getElementById('walkthrough');
    const canvas = document.getElementById('walkthroughCanvas');
    const card1 = document.getElementById('walkCard1');
    const card2 = document.getElementById('walkCard2');
    const card3 = document.getElementById('walkCard3');

    if (!section || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    const TOTAL_FRAMES = 599;
    const FRAME_BASE = 'frames/frames_real_estate_walkthrough.mp4_60fps_webp/frame_';

    const getFramePath = (idx) => {
      const padded = String(Math.max(0, Math.min(TOTAL_FRAMES - 1, idx))).padStart(6, '0');
      return `${FRAME_BASE}${padded}.webp`;
    };

    // Frame cache array
    const frameCache = new Array(TOTAL_FRAMES);
    let currentFrameIndex = 0;
    let lastRenderedImg = null;
    let walkthroughRaf = null;

    // Load or return existing frame Image object
    function getOrLoadFrame(idx) {
      if (!frameCache[idx]) {
        const img = new Image();
        img.src = getFramePath(idx);
        frameCache[idx] = img;
      }
      return frameCache[idx];
    }

    // High DPI aware canvas resize with object-fit: cover
    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      if (lastRenderedImg) {
        drawFrame(lastRenderedImg);
      }
    }

    // Render frame to canvas with object-fit: cover math
    function drawFrame(img) {
      if (!img || !img.complete || img.naturalWidth === 0) return;
      lastRenderedImg = img;
      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.drawImage(img, dx, dy, dw, dh);
    }

    // Display target frame index, falling back to nearest loaded frame to avoid flickering
    function showFrame(idx) {
      currentFrameIndex = idx;
      const targetImg = getOrLoadFrame(idx);

      if (targetImg.complete && targetImg.naturalWidth > 0) {
        drawFrame(targetImg);
      } else {
        // Find nearest loaded frame
        let nearest = null;
        for (let offset = 1; offset < 40; offset++) {
          const prev = idx - offset;
          if (prev >= 0 && frameCache[prev] && frameCache[prev].complete && frameCache[prev].naturalWidth > 0) {
            nearest = frameCache[prev];
            break;
          }
          const next = idx + offset;
          if (next < TOTAL_FRAMES && frameCache[next] && frameCache[next].complete && frameCache[next].naturalWidth > 0) {
            nearest = frameCache[next];
            break;
          }
        }
        if (nearest) {
          drawFrame(nearest);
        }

        targetImg.onload = () => {
          if (currentFrameIndex === idx) {
            drawFrame(targetImg);
          }
        };
      }

      // Prefetch window ahead and behind
      const prefetchStart = Math.max(0, idx - 15);
      const prefetchEnd = Math.min(TOTAL_FRAMES - 1, idx + 30);
      for (let i = prefetchStart; i <= prefetchEnd; i++) {
        getOrLoadFrame(i);
      }
    }

    // High-speed, zero-buffer progressive frame preloader
    function startIdlePreload() {
      // Priority 1: Immediately preload the first 35 frames + key milestone checkpoints
      for (let i = 0; i < 35; i++) {
        getOrLoadFrame(i);
      }
      for (let m = 35; m < TOTAL_FRAMES; m += 20) {
        getOrLoadFrame(m);
      }

      // Priority 2: Fill in all remaining frames rapidly in non-blocking batches
      let cursor = 0;
      const BATCH_SIZE = 6;
      function streamRemainingFrames() {
        if (cursor < TOTAL_FRAMES) {
          const end = Math.min(cursor + BATCH_SIZE, TOTAL_FRAMES);
          for (let i = cursor; i < end; i++) {
            getOrLoadFrame(i);
          }
          cursor = end;
          // Use setTimeout with 12ms to yield to the main thread while caching quickly
          setTimeout(streamRemainingFrames, 12);
        }
      }
      setTimeout(streamRemainingFrames, 60);
    }

    // Scroll scrub handler
    const updateWalkthrough = () => {
      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight - window.innerHeight;
      if (sectionHeight <= 0) return;

      const progress = Math.max(0, Math.min(1, (-rect.top) / sectionHeight));

      // Calculate exact frame index from scroll progress
      const targetFrame = Math.min(TOTAL_FRAMES - 1, Math.floor(progress * (TOTAL_FRAMES - 1)));
      showFrame(targetFrame);

      // Card 1: 0% - 35%
      if (progress < 0.35) {
        if (card1) card1.classList.add('active');
      } else {
        if (card1) card1.classList.remove('active');
      }

      // Card 2: 35% - 70%
      if (progress >= 0.35 && progress < 0.70) {
        if (card2) card2.classList.add('active');
      } else {
        if (card2) card2.classList.remove('active');
      }

      // Card 3: 70% - 100%
      if (progress >= 0.70) {
        if (card3) card3.classList.add('active');
      } else {
        if (card3) card3.classList.remove('active');
      }

      walkthroughRaf = null;
    };

    // Initialize initial frame 0 and set up listeners
    resizeCanvas();
    const frame0 = getOrLoadFrame(0);
    if (frame0.complete && frame0.naturalWidth > 0) {
      drawFrame(frame0);
    } else {
      frame0.onload = () => {
        resizeCanvas();
        drawFrame(frame0);
      };
    }

    updateWalkthrough();
    startIdlePreload();

    window.addEventListener('scroll', () => {
      if (!walkthroughRaf) {
        walkthroughRaf = requestAnimationFrame(updateWalkthrough);
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      resizeCanvas();
    }, { passive: true });
  }

  /* ==========================================================================
     DYNAMIC SCROLL VISUAL EFFECTS & SPOTLIGHT TRACKING
     ========================================================================== */
  function initScrollEffects() {
    const progressBar = document.getElementById('scrollProgressBar');
    const spotlight = document.getElementById('mouseSpotlight');
    const orb1 = document.getElementById('orb1');
    const orb2 = document.getElementById('orb2');
    const orb3 = document.getElementById('orb3');
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    const radarDots = document.querySelectorAll('.radar-dot');

    let scrollRaf = null;
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    if (!isTouch) {
      window.addEventListener('mousemove', (e) => {
        if (spotlight) {
          spotlight.style.setProperty('--mouse-x', `${e.clientX}px`);
          spotlight.style.setProperty('--mouse-y', `${e.clientY}px`);
        }
      }, { passive: true });
    }

    const onScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      if (progressBar) {
        progressBar.style.width = `${scrollPercent}%`;
      }

      if (!isTouch) {
        if (orb1) orb1.style.transform = `translateY(${scrollTop * 0.15}px)`;
        if (orb2) orb2.style.transform = `translateY(${scrollTop * -0.1}px)`;
        if (orb3) orb3.style.transform = `translateY(${scrollTop * 0.08}px)`;
      }

      let currentSection = 'home';
      sections.forEach(sec => {
        const secTop = sec.offsetTop - 140;
        const secHeight = sec.offsetHeight;
        if (scrollTop >= secTop && scrollTop < secTop + secHeight) {
          currentSection = sec.getAttribute('id');
        }
      });

      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
          link.classList.add('active');
        }
      });

      radarDots.forEach(dot => {
        dot.classList.remove('active');
        if (dot.getAttribute('data-section') === currentSection) {
          dot.classList.add('active');
        }
      });
      scrollRaf = null;
    };

    window.addEventListener('scroll', () => {
      if (!scrollRaf) {
        scrollRaf = requestAnimationFrame(onScroll);
      }
    }, { passive: true });
  }

  /* ==========================================================================
     PROJECTS RENDERING & FILTERING
     ========================================================================== */
  function renderProjects(filterType = 'all', searchQuery = '') {
    try {
      const container = document.getElementById('projectsContainer');
      if (!container) return;

      const cleanQuery = (searchQuery || '').trim().toLowerCase();

      let filtered = projects.filter(p => {
        let matchFilter = false;
        if (filterType === 'all') {
          matchFilter = true;
        } else if (filterType === 'ongoing') {
          matchFilter = p.categoryStatus === 'ongoing' || (!p.categoryStatus && !p.status?.toLowerCase().includes('upcoming launch') && !p.status?.toLowerCase().includes('delivered') && !p.status?.toLowerCase().includes('completed'));
        } else if (filterType === 'upcoming') {
          matchFilter = p.categoryStatus === 'upcoming' || (!p.categoryStatus && p.status?.toLowerCase().includes('upcoming launch'));
        } else if (filterType === 'completed') {
          matchFilter = p.categoryStatus === 'completed' || (!p.categoryStatus && (p.status?.toLowerCase().includes('delivered') || p.status?.toLowerCase().includes('completed')));
        } else {
          matchFilter = p.type === filterType;
        }

        const matchSearch = !cleanQuery || 
          (p.title && p.title.toLowerCase().includes(cleanQuery)) ||
          (p.location && p.location.toLowerCase().includes(cleanQuery)) ||
          (p.description && p.description.toLowerCase().includes(cleanQuery));

        return matchFilter && matchSearch;
      });

      if (container.dataset.limit) {
        const limitNum = parseInt(container.dataset.limit, 10);
        if (!isNaN(limitNum) && limitNum > 0) {
          filtered = filtered.slice(0, limitNum);
        }
      }

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
            <i class="ri-building-line" style="font-size: 3rem; color: var(--red-primary); margin-bottom: 12px; display: block;"></i>
            <h3>No matching projects found</h3>
            <p style="margin-top: 8px;">Try adjusting your filters or location search query.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(p => {
        const coverImg = (p.images && p.images[0]) ? p.images[0] : FALLBACK_IMAGE;
        const resLabel = p.residentialStatus === 'sold_out' ? 'Sold Out' : (p.residentialStatus === 'fast_selling' ? 'Fast Selling' : 'Open / Available');
        const commLabel = p.commercialStatus === 'sold_out' ? 'Sold Out' : (p.commercialStatus === 'fast_selling' ? 'Fast Selling' : 'Open / Available');
        const showComm = p.commercialStatus !== 'na';

        return `
          <div class="project-card" data-id="${p.id}" onclick="window.AdventuraApp.openProjectModal('${p.id}')" style="cursor: pointer;">
            <div class="card-image-wrap">
              <img src="${coverImg}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.onerror=null; this.src='${FALLBACK_IMAGE}';">
              <span class="card-badge">${escapeHtml(p.badge || 'Upcoming')}</span>
              <span class="card-status-pill"><i class="ri-map-pin-2-fill"></i> ${escapeHtml(p.status || 'Active')}</span>
            </div>
            <div class="card-body">
              <span class="card-location"><i class="ri-map-pin-line"></i> ${escapeHtml(p.location)}</span>
              <h3 class="card-title">${escapeHtml(p.title)}</h3>
              
              <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
                <span style="font-size: 0.72rem; font-family: var(--font-mono); font-weight: 600; padding: 3px 8px; border-radius: 6px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-line); color: ${p.residentialStatus === 'sold_out' ? '#F87171' : (p.residentialStatus === 'fast_selling' ? '#FBBF24' : '#34D399')};">
                  🏡 Res: ${resLabel}
                </span>
                ${showComm ? `
                  <span style="font-size: 0.72rem; font-family: var(--font-mono); font-weight: 600; padding: 3px 8px; border-radius: 6px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-line); color: ${p.commercialStatus === 'sold_out' ? '#F87171' : (p.commercialStatus === 'fast_selling' ? '#FBBF24' : '#34D399')};">
                    🏢 Comm: ${commLabel}
                  </span>
                ` : ''}
              </div>

              <div class="card-specs-grid">
                <div class="spec-item">
                  <span>Plot Area</span>
                  <strong>${escapeHtml(p.plotSizes || '1,200 - 3,000 sq.ft')}</strong>
                </div>
                <div class="spec-item">
                  <span>Road Width</span>
                  <strong>${escapeHtml(p.roadWidth || '30 - 40 ft')}</strong>
                </div>
              </div>

              <div class="card-price-row">
                <div class="price-box">
                  <span>Starting From</span>
                  <strong>${escapeHtml(p.priceRange)}</strong>
                </div>
                <button class="btn btn-secondary view-project-btn" onclick="event.stopPropagation(); window.AdventuraApp.openProjectModal('${p.id}')">
                  View Specs <i class="ri-arrow-right-line"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error('[Adventura Render Error]', e);
    }
  }

  /* ==========================================================================
     PROJECT DETAIL MODAL
     ========================================================================== */
  function openProjectModal(projectId) {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const modal = document.getElementById('projectDetailModal');
      const modalBody = document.getElementById('projectModalBody');
      if (!modal || !modalBody) return;

      const coverImg = (project.images && project.images[0]) ? project.images[0] : FALLBACK_IMAGE;

      const resText = project.residentialStatus === 'sold_out' ? '🔴 Sold Out' : (project.residentialStatus === 'fast_selling' ? '⚡ Fast Selling' : '🟢 Open / Available');
      const commText = project.commercialStatus === 'sold_out' ? '🔴 Sold Out' : (project.commercialStatus === 'fast_selling' ? '⚡ Fast Selling' : '🟢 Open / Available');
      const showCommStatus = project.commercialStatus !== 'na';

      modalBody.innerHTML = `
        <div class="modal-header-banner">
          <img src="${coverImg}" alt="${escapeHtml(project.title)}" onerror="this.onerror=null; this.src='${FALLBACK_IMAGE}';">
          <div style="position: absolute; bottom: 20px; left: 24px; right: 24px; color: #fff; text-shadow: 0 2px 10px rgba(0,0,0,0.8);">
            <span class="card-badge" style="position: static; margin-bottom: 8px; display: inline-block;">${escapeHtml(project.badge)}</span>
            <h2 style="font-size: 2.2rem; margin-top: 4px;">${escapeHtml(project.title)}</h2>
            <p style="color: var(--text-muted); font-size: 1rem;"><i class="ri-map-pin-fill" style="color: var(--red-light);"></i> ${escapeHtml(project.location)}</p>
          </div>
        </div>

        <div class="modal-body-content">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-line); border-radius: var(--radius-md); padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
            <span style="font-size: 0.82rem; color: var(--text-dim); text-transform: uppercase; font-family: var(--font-mono); font-weight: 600;">Plot Inventory Status:</span>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <span style="font-size: 0.85rem; font-family: var(--font-mono); font-weight: 600; padding: 4px 12px; border-radius: 6px; background: #08080b; border: 1px solid var(--border-line); color: ${project.residentialStatus === 'sold_out' ? '#F87171' : (project.residentialStatus === 'fast_selling' ? '#FBBF24' : '#34D399')};">
                🏡 Residential: ${resText}
              </span>
              ${showCommStatus ? `
                <span style="font-size: 0.85rem; font-family: var(--font-mono); font-weight: 600; padding: 4px 12px; border-radius: 6px; background: #08080b; border: 1px solid var(--border-line); color: ${project.commercialStatus === 'sold_out' ? '#F87171' : (project.commercialStatus === 'fast_selling' ? '#FBBF24' : '#34D399')};">
                  🏢 Commercial: ${commText}
                </span>
              ` : ''}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px; margin-bottom: 30px;">
            <div>
              <h3 style="margin-bottom: 12px; font-size: 1.4rem;">Project Overview</h3>
              <p style="color: var(--text-muted); line-height: 1.7;">${escapeHtml(project.description)}</p>
              
              <h4 style="margin-top: 24px; margin-bottom: 12px; font-size: 1.1rem;">Key Highlights & Amenities</h4>
              <ul style="list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                ${(project.highlights || []).map(h => `
                  <li style="display: flex; align-items: center; gap: 8px; font-size: 0.92rem; color: var(--text-main);">
                    <i class="ri-checkbox-circle-fill" style="color: var(--red-primary);"></i> ${escapeHtml(h)}
                  </li>
                `).join('')}
              </ul>
            </div>

            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-line); border-radius: var(--radius-md); padding: 20px;">
              <h4 style="font-size: 1.1rem; margin-bottom: 16px;">Quick Specifications</h4>
              <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.9rem;">
                <div>
                  <span style="color: var(--text-dim); display: block;">Investment Range</span>
                  <strong style="color: var(--red-light); font-size: 1.2rem;">${escapeHtml(project.priceRange)}</strong>
                </div>
                <div>
                  <span style="color: var(--text-dim); display: block;">Available Sizes</span>
                  <strong>${escapeHtml(project.plotSizes)}</strong>
                </div>
                <div>
                  <span style="color: var(--text-dim); display: block;">Possession</span>
                  <strong>${escapeHtml(project.possession)}</strong>
                </div>
                <div>
                  <span style="color: var(--text-dim); display: block;">Road Access</span>
                  <strong>${escapeHtml(project.roadWidth)}</strong>
                </div>
              </div>

              <button class="btn btn-primary" style="width: 100%; margin-top: 20px;" onclick="window.AdventuraApp.triggerInquiryFor('${escapeHtml(project.title)}')">
                <i class="ri-phone-find-line"></i> Inquire Now
              </button>
            </div>
          </div>

          ${(() => {
            const videoList = (project.videos && project.videos.length > 0) ? project.videos : (project.videoUrl ? [project.videoUrl] : []);
            if (videoList.length === 0) return '';
            return `
              <div style="margin-bottom: 24px;">
                <h4 style="margin-bottom: 12px; font-size: 1.1rem; color: #fff;"><i class="ri-video-line" style="color: var(--red-light);"></i> Site Walkthrough Videos (${videoList.length})</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                  ${videoList.map((vUrl, vIdx) => `
                    <div style="position: relative; width: 100%; aspect-ratio: 16/9; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-line); background: #000;">
                      ${(vUrl.startsWith('data:video') || vUrl.match(/\.(mp4|webm|mov|ogg)($|\?)/i)) ? `
                        <video src="${escapeHtml(vUrl)}" controls playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
                      ` : `
                        <iframe src="${escapeHtml(vUrl)}" title="${escapeHtml(project.title)} Walkthrough Video ${vIdx+1}" style="width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                      `}
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          })()}

          ${(project.images && project.images.length > 0) ? `
            <h4 style="margin-bottom: 14px; font-size: 1.1rem; color: #fff;"><i class="ri-image-line" style="color: var(--red-light);"></i> Uploaded Site Photos & Layout Blueprints (${project.images.length})</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 30px;">
              ${project.images.map(img => `
                <div style="position: relative; height: 130px; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border-line); cursor: pointer;" onclick="window.open('${img}', '_blank')">
                  <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='${FALLBACK_IMAGE}';">
                  <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.4); opacity: 0; transition: opacity 0.3s; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.8rem; font-weight: 600;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                    <i class="ri-zoom-in-line"></i> View Full Photo
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;

      modal.classList.add('active');
    } catch (e) {
      console.error('[Adventura Modal Error]', e);
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  function triggerInquiryFor(projectTitle) {
    closeModal('projectDetailModal');
    const interestSelect = document.getElementById('inquiryInterest');
    const messageInput = document.getElementById('inquiryMessage');
    
    if (interestSelect) {
      for (let opt of interestSelect.options) {
        if (opt.value.toLowerCase().includes('plot') || opt.value.toLowerCase().includes('residential')) {
          opt.selected = true;
          break;
        }
      }
    }
    
    if (messageInput) {
      messageInput.value = `Hi Adventura team, I am interested in getting full details and booking a site visit for: ${projectTitle}`;
    }

    const contactSection = document.getElementById('contactSection') || document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /* ==========================================================================
     PROPERTY EMI CALCULATOR
     ========================================================================== */
  function initEMICalculator() {
    try {
      const amountInput = document.getElementById('calcAmount');
      const tenureInput = document.getElementById('calcTenure');
      const rateInput = document.getElementById('calcRate');

      if (!amountInput || !tenureInput || !rateInput) return;

      function calculate() {
        const P = (parseFloat(amountInput.value) || 15) * 100000;
        const N = (parseFloat(tenureInput.value) || 10) * 12;
        const R = ((parseFloat(rateInput.value) || 8.5) / 12) / 100;

        let emi = 0;
        if (R > 0 && N > 0) {
          emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
        }
        
        const totalPayable = emi * N;
        const totalInterest = totalPayable - P;

        const setTxt = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.innerText = val;
        };

        setTxt('displayAmountVal', `₹${amountInput.value} Lakhs`);
        setTxt('displayTenureVal', `${tenureInput.value} Years`);
        setTxt('displayRateVal', `${rateInput.value}%`);

        setTxt('calculatedEMI', isNaN(emi) || !isFinite(emi) ? '₹0' : `₹${Math.round(emi).toLocaleString('en-IN')}`);
        setTxt('totalPrincipal', `₹${P.toLocaleString('en-IN')}`);
        setTxt('totalInterest', isNaN(totalInterest) || !isFinite(totalInterest) ? '₹0' : `₹${Math.round(totalInterest).toLocaleString('en-IN')}`);
        setTxt('totalPayable', isNaN(totalPayable) || !isFinite(totalPayable) ? '₹0' : `₹${Math.round(totalPayable).toLocaleString('en-IN')}`);
      }

      amountInput.addEventListener('input', calculate);
      tenureInput.addEventListener('input', calculate);
      rateInput.addEventListener('input', calculate);

      calculate();
    } catch (e) {
      console.error('[Adventura EMI Calc Error]', e);
    }
  }

  /* ==========================================================================
     LEAD SUBMISSION & ROBUST CSV EXPORT
     ========================================================================== */
  function handleLeadSubmission(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
      const name = (document.getElementById('inquiryName').value || '').trim();
      const phone = (document.getElementById('inquiryPhone').value || '').trim();
      const email = (document.getElementById('inquiryEmail').value || '').trim();
      const interest = document.getElementById('inquiryInterest').value;
      const message = (document.getElementById('inquiryMessage').value || '').trim();

      if (!name || !phone) {
        alert('Please provide your Full Name and Phone Number.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Submitting Inquiry...';
      }

      const newLead = {
        id: 'lead-' + Date.now(),
        name,
        phone,
        email: email || 'N/A',
        interest,
        message: message || 'N/A',
        date: new Date().toLocaleString('en-IN'),
        status: 'New'
      };

      leads.unshift(newLead);
      safeSetStorage('adventura_leads_v1', leads);

      const waText = encodeURIComponent(`*New Inquiry - ADVENTURA Real Estate*\n\n👤 Name: ${name}\n📞 Phone: ${phone}\n✉️ Email: ${email}\n🏡 Interested In: ${interest}\n💬 Message: ${message}`);
      const waUrl = `https://wa.me/916299130640?text=${waText}`;

      setTimeout(() => {
        alert(`Thank you ${name}! Your inquiry for ${interest} has been submitted successfully.\n\nOur team will reach out to you at ${phone} shortly.`);
        
        try { window.open(waUrl, '_blank'); } catch(err){}

        e.target.reset();

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="ri-send-plane-fill"></i> Submit Inquiry & Get Callback';
        }
      }, 400);

    } catch (err) {
      console.error('[Adventura Lead Submit Error]', err);
      alert('Inquiry received. If you do not hear from us shortly, please call directly at +91 6299130640.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="ri-send-plane-fill"></i> Submit Inquiry & Get Callback';
      }
    }
  }

  function downloadLeadsCSV() {
    try {
      if (!leads || leads.length === 0) {
        alert('No lead inquiries found to export.');
        return;
      }

      const headers = ["Lead ID", "Full Name", "Phone Number", "Email Address", "Interested In", "Message / Requirement", "Date Submitted", "Status"];
      const rows = leads.map(l => [
        l.id,
        `"${(l.name || '').replace(/"/g, '""')}"`,
        `"${(l.phone || '').replace(/"/g, '""')}"`,
        `"${(l.email || '').replace(/"/g, '""')}"`,
        `"${(l.interest || '').replace(/"/g, '""')}"`,
        `"${(l.message || '').replace(/"/g, '""')}"`,
        `"${(l.date || '')}"`,
        `"${(l.status || 'New')}"`
      ]);

      const csvString = [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Adventura_Leads_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[Adventura CSV Export Error]', e);
    }
  }

  /* ==========================================================================
     ADMIN & CMS DASHBOARD (PASSWORD PROTECTED & LIVE PHOTO EDITOR)
     ========================================================================== */
  let isAdminAuthenticated = safeGetStorage('adventura_admin_auth', false);
  let showAdminPinText = false;

  const PRESET_IMAGES = [
    { label: 'Plotted Township', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Commercial Hub', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Luxury Villa', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Highway Corridor', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Green Residency', url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80' }
  ];

  function openAdminDashboard() {
    const hash = (window.location.hash || '').toLowerCase();
    const path = (window.location.pathname || '').toLowerCase();
    const search = (window.location.search || '').toLowerCase();

    const isSecretRoute = hash.includes('adventura-secure-dashboard-xyz') || 
                          path.includes('adventura-secure-dashboard-xyz') || 
                          search.includes('adventura-secure-dashboard-xyz') ||
                          hash === '#admin-dashboard';

    if (!isSecretRoute) {
      alert("Access Denied: The CMS Admin Portal has been removed from public navigation and can only be accessed by visiting the secret admin URL path.");
      return;
    }

    try {
      const modal = document.getElementById('adminCMSModal');
      if (modal) {
        renderAdminCMS();
        modal.classList.add('active');
      }
    } catch (e) {
      console.error('[Adventura Admin Error]', e);
    }
  }

  function togglePinVisibility() {
    showAdminPinText = !showAdminPinText;
    const input = document.getElementById('adminPinInput');
    const icon = document.getElementById('pinToggleIcon');
    if (input) {
      input.type = showAdminPinText ? 'text' : 'password';
    }
    if (icon) {
      icon.className = showAdminPinText ? 'ri-eye-off-line' : 'ri-eye-line';
    }
  }

  function authenticateAdminPin(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('adminPinInput');
    const errBox = document.getElementById('adminPinError');
    const pin = input ? input.value.trim() : '';

    if (pin === ADMIN_PIN) {
      isAdminAuthenticated = true;
      safeSetStorage('adventura_admin_auth', true);
      renderAdminCMS();
    } else {
      if (errBox) {
        errBox.innerText = 'Invalid Security Password PIN. Access Denied.';
        errBox.style.display = 'block';
      }
    }
  }

  function lockAdminPortal() {
    isAdminAuthenticated = false;
    safeSetStorage('adventura_admin_auth', false);
    renderAdminCMS();
  }

  function renderAdminCMS() {
    try {
      const container = document.getElementById('adminCMSBody');
      if (!container) return;

      // PASSWORD SECURITY GATE
      if (!isAdminAuthenticated) {
        container.innerHTML = `
          <div style="max-width: 440px; margin: 40px auto; text-align: center; background: rgba(8,8,11,0.96); padding: 36px 28px; border-radius: var(--radius-lg); border: 1px solid var(--border-line); box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
            <div style="width: 60px; height: 60px; background: rgba(240,40,31,0.12); border: 1px solid rgba(240,40,31,0.3); border-radius: 16px; color: var(--red-light); font-size: 1.8rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
              <i class="ri-lock-2-line"></i>
            </div>
            <h3 style="font-size: 1.5rem; color: #fff; margin-bottom: 8px;">Password Protected CMS Portal</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 24px; line-height: 1.6;">
              Sensitive lead inquiries CRM and project editor are password protected. Enter Admin Security PIN to proceed.
            </p>

            <form onsubmit="window.AdventuraApp.authenticateAdminPin(event)" style="display: flex; flex-direction: column; gap: 16px;">
              <div style="position: relative;">
                <input type="${showAdminPinText ? 'text' : 'password'}" id="adminPinInput" placeholder="Enter Password PIN" required style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 12px 42px 12px 16px; border-radius: 10px; font-family: var(--font-mono); text-align: center; font-size: 0.95rem; outline: none;">
                <button type="button" onclick="window.AdventuraApp.togglePinVisibility()" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem;">
                  <i id="pinToggleIcon" class="${showAdminPinText ? 'ri-eye-off-line' : 'ri-eye-line'}"></i>
                </button>
              </div>

              <div id="adminPinError" style="display: none; color: var(--red-light); font-size: 0.8rem; font-family: var(--font-mono);"></div>

              <button type="submit" class="btn btn-primary" style="height: 48px; width: 100%; font-size: 0.9rem;">
                <i class="ri-key-2-line"></i> Unlock CMS Portal
              </button>
            </form>
          </div>
        `;
        return;
      }

      // AUTHENTICATED ADMIN DASHBOARD
      if (currentAdminTab === 'projects-cms') {
        container.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <h3>Manage Upcoming Projects (${projects.length})</h3>
              <span style="font-size: 0.75rem; color: #10B981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); padding: 2px 10px; border-radius: 999px; font-weight: 600;"><i class="ri-shield-check-line"></i> Authenticated</span>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-primary" onclick="window.AdventuraApp.openEditForm(null)">
                <i class="ri-add-line"></i> Add New Project
              </button>
              <button class="btn btn-secondary" onclick="window.AdventuraApp.lockAdminPortal()" title="Lock CMS Access">
                <i class="ri-lock-line" style="color: var(--red-light);"></i> Lock Portal
              </button>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${projects.map(p => `
              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-line); border-radius: var(--radius-md); padding: 18px; display: flex; align-items: center; justify-content: space-between; gap: 20px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                  <img src="${(p.images && p.images[0]) ? p.images[0] : FALLBACK_IMAGE}" style="width: 65px; height: 65px; border-radius: var(--radius-sm); object-fit: cover; border: 1px solid var(--border-line);" onerror="this.onerror=null; this.src='${FALLBACK_IMAGE}';">
                  <div>
                    <h4 style="font-size: 1.1rem; color: #fff;">${escapeHtml(p.title)}</h4>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(p.location)} • <span style="color: var(--red-light);">${escapeHtml(p.priceRange)}</span> • ${escapeHtml(p.plotSizes || '')}</p>
                  </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 4px; background: #08080b; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-line);">
                    <span style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Phase:</span>
                    <select onchange="window.AdventuraApp.changeProjectPhase('${p.id}', this.value)" style="background: transparent; border: none; color: #fff; font-size: 0.78rem; font-weight: 600; cursor: pointer; outline: none;">
                      <option value="ongoing" ${(p.categoryStatus || 'ongoing') === 'ongoing' ? 'selected' : ''}>🚧 Ongoing</option>
                      <option value="upcoming" ${p.categoryStatus === 'upcoming' ? 'selected' : ''}>🚀 Upcoming</option>
                      <option value="completed" ${p.categoryStatus === 'completed' ? 'selected' : ''}>✅ Completed</option>
                    </select>
                  </div>

                  <div style="display: flex; align-items: center; gap: 4px; background: #08080b; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-line);">
                    <span style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Res:</span>
                    <select onchange="window.AdventuraApp.changeSubtypeStatus('${p.id}', 'residential', this.value)" style="background: transparent; border: none; color: ${(p.residentialStatus || 'available') === 'sold_out' ? '#F87171' : (p.residentialStatus === 'fast_selling' ? '#FBBF24' : '#34D399')}; font-size: 0.78rem; font-weight: 600; cursor: pointer; outline: none;">
                      <option value="available" ${(p.residentialStatus || 'available') === 'available' ? 'selected' : ''}>🟢 Open</option>
                      <option value="fast_selling" ${p.residentialStatus === 'fast_selling' ? 'selected' : ''}>⚡ Fast Selling</option>
                      <option value="sold_out" ${p.residentialStatus === 'sold_out' ? 'selected' : ''}>🔴 Sold Out</option>
                    </select>
                  </div>

                  <div style="display: flex; align-items: center; gap: 4px; background: #08080b; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-line);">
                    <span style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Comm:</span>
                    <select onchange="window.AdventuraApp.changeSubtypeStatus('${p.id}', 'commercial', this.value)" style="background: transparent; border: none; color: ${(p.commercialStatus || 'available') === 'sold_out' ? '#F87171' : (p.commercialStatus === 'fast_selling' ? '#FBBF24' : (p.commercialStatus === 'na' ? '#9CA3AF' : '#34D399'))}; font-size: 0.78rem; font-weight: 600; cursor: pointer; outline: none;">
                      <option value="available" ${(p.commercialStatus || 'available') === 'available' ? 'selected' : ''}>🟢 Open</option>
                      <option value="fast_selling" ${p.commercialStatus === 'fast_selling' ? 'selected' : ''}>⚡ Fast Selling</option>
                      <option value="sold_out" ${p.commercialStatus === 'sold_out' ? 'selected' : ''}>🔴 Sold Out</option>
                      <option value="na" ${p.commercialStatus === 'na' ? 'selected' : ''}>N/A</option>
                    </select>
                  </div>

                  <button class="btn btn-secondary" onclick="window.AdventuraApp.openEditForm('${p.id}')" style="padding: 6px 12px; font-size: 0.8rem; color: #ffffff; border-color: var(--red-primary);">
                    <i class="ri-image-edit-line" style="color: var(--red-light);"></i> Edit
                  </button>
                  <button class="btn btn-secondary" onclick="window.AdventuraApp.deleteProject('${p.id}')" style="padding: 6px 12px; font-size: 0.8rem; color: #ff6b6b;">
                    <i class="ri-delete-bin-line"></i> Delete
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      } else if (currentAdminTab === 'leads-crm') {
        container.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <h3>Captured Leads & Inquiries (${leads.length})</h3>
              <span style="font-size: 0.75rem; color: #10B981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); padding: 2px 10px; border-radius: 999px; font-weight: 600;"><i class="ri-lock-unlock-line"></i> Protected CRM Data</span>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-primary" onclick="window.AdventuraApp.downloadLeadsCSV()">
                <i class="ri-download-cloud-line"></i> Export CSV
              </button>
              <button class="btn btn-secondary" onclick="window.AdventuraApp.lockAdminPortal()" title="Lock CMS Access">
                <i class="ri-lock-line" style="color: var(--red-light);"></i> Lock Portal
              </button>
            </div>
          </div>

          <div class="leads-table-container">
            <table class="leads-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Interested In</th>
                  <th>Message</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${leads.map(l => `
                  <tr>
                    <td style="white-space: nowrap; color: var(--text-dim);">${escapeHtml(l.date)}</td>
                    <td><strong>${escapeHtml(l.name)}</strong></td>
                    <td><a href="tel:${escapeHtml(l.phone)}" style="color: var(--red-light);">${escapeHtml(l.phone)}</a></td>
                    <td><span class="location-pill" style="padding: 2px 8px; font-size: 0.75rem;">${escapeHtml(l.interest)}</span></td>
                    <td style="max-width: 250px; font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(l.message)}</td>
                    <td><span style="color: #25D366; font-weight: 600;">${escapeHtml(l.status)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    } catch (e) {
      console.error('[Adventura Render Admin Error]', e);
    }
  }

  function selectPresetImage(url) {
    if (!currentEditingImages.includes(url)) {
      currentEditingImages.push(url);
    }
    renderEditingMediaLists();
  }

  /* Open in-page form editor inside the CMS modal (No prompt popups!) */
  function openEditForm(projectId) {
    try {
      const container = document.getElementById('adminCMSBody');
      if (!container) return;

      const project = projectId ? projects.find(p => p.id === projectId) : null;
      const isNew = !project;

      currentEditingImages = project ? (project.images && project.images.length > 0 ? [...project.images] : (project.image ? [project.image] : [PRESET_IMAGES[0].url])) : [PRESET_IMAGES[0].url];
      currentEditingVideos = project ? (project.videos && project.videos.length > 0 ? [...project.videos] : (project.videoUrl ? [project.videoUrl] : [])) : [];

      const residentialStatus = project ? (project.residentialStatus || 'available') : 'available';
      const commercialStatus = project ? (project.commercialStatus || 'available') : 'available';
      const title = project ? project.title : '';
      const location = project ? project.location : 'Gaya, Bihar';
      const type = project ? project.type : 'residential';
      const badge = project ? project.badge : 'Hot Investment';
      const status = project ? project.status : 'Upcoming / Booking Open';
      const priceRange = project ? project.priceRange : '₹8.5 Lakh - ₹25 Lakh';
      const plotSizes = project ? project.plotSizes : '1,200 sq.ft - 3,000 sq.ft';
      const roadWidth = project ? project.roadWidth : '30 ft & 40 ft Wide Blacktop';
      const possession = project ? project.possession : 'Immediate Registry';
      const highlights = project && project.highlights ? project.highlights.join('\n') : '100% Clear Title\nWide Blacktop Access Roads\nNear High-Growth Corridor';
      const description = project ? project.description : 'Master planned plotting township designed for modern living and high capital appreciation in Bihar.';

      container.innerHTML = `
        <div style="background: rgba(8,8,11,0.96); border: 1px solid var(--border-line); border-radius: var(--radius-lg); padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-line); padding-bottom: 14px;">
            <h3 style="font-size: 1.3rem; color: #fff;">
              <i class="ri-image-edit-line" style="color: var(--red-light);"></i> ${isNew ? 'Add New Project Layout & Media' : 'Edit Project & Photo: ' + escapeHtml(title)}
            </h3>
            <button class="btn btn-secondary" onclick="window.AdventuraApp.renderAdminCMS()" style="padding: 6px 14px; font-size: 0.8rem;">
              <i class="ri-close-line"></i> Cancel & Back
            </button>
          </div>

          <form id="projectEditForm" onsubmit="window.AdventuraApp.saveProjectForm(event, '${project ? project.id : ''}')" style="display: flex; flex-direction: column; gap: 16px;">
            
            <!-- Site Photos Multi-Upload & Gallery Editor -->
            <div style="background: #040406; border: 1px solid var(--border-line); border-radius: var(--radius-md); padding: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <label style="color: #fff; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">
                  <i class="ri-image-line" style="color: var(--red-light);"></i> Site Photos Gallery (Upload Multiple Photos)
                </label>
                <span style="font-size: 0.72rem; color: var(--text-dim); font-family: var(--font-mono);">Multi-Photo Gallery</span>
              </div>

              <div id="editingImagesGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-bottom: 14px; min-height: 80px; background: #08080b; padding: 10px; border-radius: 8px; border: 1px dashed var(--border-line);"></div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase; display: block; margin-bottom: 6px;">Upload Photo(s) from Device</label>
                  <input type="file" accept="image/*" multiple onchange="window.AdventuraApp.handleMultipleImagesUpload(this)" style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 0.8rem;">
                </div>
                <div>
                  <label style="color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase; display: block; margin-bottom: 6px;">Or Add Image URL</label>
                  <div style="display: flex; gap: 6px;">
                    <input type="url" id="customPhotoUrlInput" class="form-control" placeholder="https://..." style="flex: 1; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 0.8rem;">
                    <button type="button" class="btn btn-secondary" onclick="window.AdventuraApp.addPhotoUrlFromInput()" style="padding: 6px 12px; font-size: 0.8rem;">Add</button>
                  </div>
                </div>
              </div>

              <div>
                <label style="color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase; display: block; margin-bottom: 8px;">Or Add Preset Real Estate Photo:</label>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px;">
                  ${PRESET_IMAGES.map(preset => `
                    <button type="button" onclick="window.AdventuraApp.selectPresetImage('${preset.url}')" style="background: #08080b; border: 1px solid var(--border-line); border-radius: 8px; overflow: hidden; padding: 0; cursor: pointer; text-align: center;">
                      <img src="${preset.url}" style="width: 100%; height: 45px; object-fit: cover;">
                      <span style="display: block; font-size: 0.65rem; color: #fff; padding: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${preset.label}</span>
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>

            <div class="form-group">
              <label style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Project Title *</label>
              <input type="text" id="formTitle" class="form-control" value="${escapeHtml(title)}" required style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 10px 14px; border-radius: 8px;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <label style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Location Corridor *</label>
                <input type="text" id="formLocation" class="form-control" value="${escapeHtml(location)}" required style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 10px 14px; border-radius: 8px;">
              </div>
              <div class="form-group">
                <label style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Property Type *</label>
                <select id="formType" class="form-control" style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 10px 14px; border-radius: 8px;">
                  <option value="residential" ${type === 'residential' ? 'selected' : ''}>Residential Plots</option>
                  <option value="commercial" ${type === 'commercial' ? 'selected' : ''}>Commercial Hub</option>
                  <option value="villa" ${type === 'villa' ? 'selected' : ''}>Luxury Villa Estates</option>
                </select>
              </div>
              <div class="form-group">
                <label style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Project Phase *</label>
                <select id="formCategoryStatus" class="form-control" style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 10px 14px; border-radius: 8px;">
                  <option value="ongoing" ${(project ? project.categoryStatus : 'ongoing') === 'ongoing' ? 'selected' : ''}>🚧 Ongoing Projects</option>
                  <option value="upcoming" ${(project ? project.categoryStatus : 'ongoing') === 'upcoming' ? 'selected' : ''}>🚀 Upcoming Projects</option>
                  <option value="completed" ${(project ? project.categoryStatus : 'ongoing') === 'completed' ? 'selected' : ''}>✅ Completed Projects</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #040406; padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-line);">
              <div class="form-group">
                <label style="color: #fff; font-size: 0.8rem; text-transform: uppercase; font-weight: 600;">🏡 Residential Inventory Status *</label>
                <select id="formResidentialStatus" class="form-control" style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 10px 14px; border-radius: 8px;">
                  <option value="available" ${residentialStatus === 'available' ? 'selected' : ''}>🟢 Open / Available</option>
                  <option value="fast_selling" ${residentialStatus === 'fast_selling' ? 'selected' : ''}>⚡ Fast Selling / Few Left</option>
                  <option value="sold_out" ${residentialStatus === 'sold_out' ? 'selected' : ''}>🔴 Sold Out</option>
                </select>
              </div>
              <div class="form-group">
                <label style="color: #fff; font-size: 0.8rem; text-transform: uppercase; font-weight: 600;">🏢 Commercial Inventory Status *</label>
                <select id="formCommercialStatus" class="form-control" style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 10px 14px; border-radius: 8px;">
                  <option value="available" ${commercialStatus === 'available' ? 'selected' : ''}>🟢 Open / Available</option>
                  <option value="fast_selling" ${commercialStatus === 'fast_selling' ? 'selected' : ''}>⚡ Fast Selling / Few Left</option>
                  <option value="sold_out" ${commercialStatus === 'sold_out' ? 'selected' : ''}>🔴 Sold Out</option>
                  <option value="na" ${commercialStatus === 'na' ? 'selected' : ''}>N/A (Not Applicable)</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <label style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Investment Price Range *</label>
                <input type="text" id="formPriceRange" class="form-control" value="${escapeHtml(priceRange)}" required style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 10px 14px; border-radius: 8px;">
              </div>
              <div class="form-group">
                <label style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Plot Size Area *</label>
                <input type="text" id="formPlotSizes" class="form-control" value="${escapeHtml(plotSizes)}" required style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 10px 14px; border-radius: 8px;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <label style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Road Access Width</label>
                <input type="text" id="formRoadWidth" class="form-control" value="${escapeHtml(roadWidth)}" style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 10px 14px; border-radius: 8px;">
              </div>
              <div class="form-group">
                <label style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Possession Status</label>
                <input type="text" id="formPossession" class="form-control" value="${escapeHtml(possession)}" style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 10px 14px; border-radius: 8px;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <label style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Badge Tag</label>
                <input type="text" id="formBadge" class="form-control" value="${escapeHtml(badge)}" style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 10px 14px; border-radius: 8px;">
              </div>
              <div class="form-group">
                <label style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Status Pill</label>
                <input type="text" id="formStatus" class="form-control" value="${escapeHtml(status)}" style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 10px 14px; border-radius: 8px;">
              </div>
            </div>

            <!-- Site Walkthrough Videos Multi-Upload Editor -->
            <div style="background: #040406; border: 1px solid var(--border-line); border-radius: var(--radius-md); padding: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <label style="color: #fff; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">
                  <i class="ri-video-line" style="color: var(--red-light);"></i> Site Walkthrough Videos (Upload Multiple Videos)
                </label>
                <span style="font-size: 0.72rem; color: var(--text-dim); font-family: var(--font-mono);">Multi-Video Walkthroughs</span>
              </div>

              <div id="editingVideosGrid" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; min-height: 50px; background: #08080b; padding: 10px; border-radius: 8px; border: 1px dashed var(--border-line);"></div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label style="color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase; display: block; margin-bottom: 6px;">Upload Video File(s) (.mp4, .webm, .mov)</label>
                  <input type="file" accept="video/*" multiple onchange="window.AdventuraApp.handleMultipleVideosUpload(this)" style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 0.8rem;">
                </div>
                <div>
                  <label style="color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase; display: block; margin-bottom: 6px;">Or Add YouTube / Video Link</label>
                  <div style="display: flex; gap: 6px;">
                    <input type="text" id="customVideoUrlInput" class="form-control" placeholder="https://..." style="flex: 1; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 0.8rem;">
                    <button type="button" class="btn btn-secondary" onclick="window.AdventuraApp.addVideoUrlFromInput()" style="padding: 6px 12px; font-size: 0.8rem;">Add</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Key Highlights (1 per line)</label>
              <textarea id="formHighlights" class="form-control" rows="3" style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 10px 14px; border-radius: 8px; resize: none;">${escapeHtml(highlights)}</textarea>
            </div>

            <div class="form-group">
              <label style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Detailed Project Overview</label>
              <textarea id="formDescription" class="form-control" rows="3" style="width: 100%; background: #08080b; border: 1px solid var(--border-line); color: #fff; padding: 10px 14px; border-radius: 8px; resize: none;">${escapeHtml(description)}</textarea>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 10px;">
              <button type="submit" class="btn btn-primary" style="flex: 1; height: 48px;">
                <i class="ri-save-line"></i> Save Project Changes & Media Live
              </button>
              <button type="button" class="btn btn-secondary" onclick="window.AdventuraApp.renderAdminCMS()" style="height: 48px;">
                Cancel
              </button>
            </div>
          </form>
        </div>
      `;

      setTimeout(() => renderEditingMediaLists(), 50);
    } catch (e) {
      console.error('[Adventura Open Edit Form Error]', e);
    }
  }

  /* Handle in-page form submission without browser prompts */
  function saveProjectForm(e, projectId) {
    e.preventDefault();
    try {
      const title = (document.getElementById('formTitle').value || '').trim();
      const location = (document.getElementById('formLocation').value || '').trim();
      const type = document.getElementById('formType').value;
      const categoryStatus = document.getElementById('formCategoryStatus').value;
      const residentialStatus = document.getElementById('formResidentialStatus') ? document.getElementById('formResidentialStatus').value : 'available';
      const commercialStatus = document.getElementById('formCommercialStatus') ? document.getElementById('formCommercialStatus').value : 'available';
      const priceRange = (document.getElementById('formPriceRange').value || '').trim();
      const plotSizes = (document.getElementById('formPlotSizes').value || '').trim();
      const roadWidth = (document.getElementById('formRoadWidth').value || '').trim();
      const possession = (document.getElementById('formPossession').value || '').trim();
      const badge = (document.getElementById('formBadge').value || '').trim();
      const status = (document.getElementById('formStatus').value || '').trim();
      const highlightsText = document.getElementById('formHighlights').value || '';
      const description = (document.getElementById('formDescription').value || '').trim();

      const highlights = highlightsText.split('\n').map(h => h.trim()).filter(h => h.length > 0);

      if (!title || !location) {
        alert("Title and Location are required.");
        return;
      }

      const imagesToSave = currentEditingImages.length > 0 ? [...currentEditingImages] : [FALLBACK_IMAGE];
      const videosToSave = [...currentEditingVideos];
      const mainVideo = videosToSave[0] || '';

      if (projectId) {
        // Edit existing project
        const p = projects.find(item => item.id === projectId);
        if (p) {
          p.title = title;
          p.location = location;
          p.type = type;
          p.categoryStatus = categoryStatus;
          p.residentialStatus = residentialStatus;
          p.commercialStatus = commercialStatus;
          p.priceRange = priceRange;
          p.plotSizes = plotSizes;
          p.roadWidth = roadWidth;
          p.possession = possession;
          p.badge = badge;
          p.status = status;
          p.images = imagesToSave;
          p.videos = videosToSave;
          p.videoUrl = mainVideo;
          p.highlights = highlights;
          p.description = description;
        }
      } else {
        // Create new project
        const newProj = {
          id: 'proj-' + Date.now(),
          title,
          location,
          type,
          categoryStatus,
          residentialStatus,
          commercialStatus,
          status: status || 'Upcoming / Booking Open',
          badge: badge || 'New Launch',
          priceRange,
          plotSizes,
          roadWidth,
          possession,
          highlights,
          description,
          images: imagesToSave,
          videos: videosToSave,
          videoUrl: mainVideo,
          brochureUrl: '#',
          featured: true
        };
        projects.unshift(newProj);
      }

      safeSetStorage('adventura_projects_v2', projects);
      renderProjects('all');
      renderAdminCMS();
    } catch (err) {
      console.error('[Adventura Save Project Error]', err);
    }
  }

  let currentEditingImages = [];
  let currentEditingVideos = [];

  function handleMultipleImagesUpload(input) {
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      let loaded = 0;
      files.forEach(f => {
        const reader = new FileReader();
        reader.onload = function(e) {
          currentEditingImages.push(e.target.result);
          loaded++;
          if (loaded === files.length) {
            renderEditingMediaLists();
          }
        };
        reader.readAsDataURL(f);
      });
    }
  }

  function handleMultipleVideosUpload(input) {
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      let loaded = 0;
      files.forEach(f => {
        const reader = new FileReader();
        reader.onload = function(e) {
          currentEditingVideos.push(e.target.result);
          loaded++;
          if (loaded === files.length) {
            renderEditingMediaLists();
          }
        };
        reader.readAsDataURL(f);
      });
    }
  }

  function addPhotoUrlFromInput() {
    const el = document.getElementById('customPhotoUrlInput');
    if (el && el.value.trim()) {
      currentEditingImages.push(el.value.trim());
      el.value = '';
      renderEditingMediaLists();
    }
  }

  function addVideoUrlFromInput() {
    const el = document.getElementById('customVideoUrlInput');
    if (el && el.value.trim()) {
      currentEditingVideos.push(el.value.trim());
      el.value = '';
      renderEditingMediaLists();
    }
  }

  function removeEditingImage(index) {
    currentEditingImages.splice(index, 1);
    renderEditingMediaLists();
  }

  function removeEditingVideo(index) {
    currentEditingVideos.splice(index, 1);
    renderEditingMediaLists();
  }

  function renderEditingMediaLists() {
    const imgList = document.getElementById('editingImagesGrid');
    if (imgList) {
      imgList.innerHTML = currentEditingImages.map((img, i) => `
        <div style="position: relative; height: 75px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-line); background: #000;">
          <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='${FALLBACK_IMAGE}';">
          <button type="button" onclick="window.AdventuraApp.removeEditingImage(${i})" style="position: absolute; top: 2px; right: 2px; background: rgba(240,40,31,0.9); color: #fff; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 11px; cursor: pointer;">✕</button>
          <span style="position: absolute; bottom: 2px; left: 2px; background: rgba(0,0,0,0.8); color: #fff; font-size: 8px; font-family: var(--font-mono); padding: 1px 4px; border-radius: 3px;">#${i+1}</span>
        </div>
      `).join('');
      if (currentEditingImages.length === 0) {
        imgList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-dim); font-size: 0.8rem; padding: 12px;">No photos added yet. Select multiple files or paste link below.</div>`;
      }
    }

    const vidList = document.getElementById('editingVideosGrid');
    if (vidList) {
      vidList.innerHTML = currentEditingVideos.map((vid, i) => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #08080b; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-line); font-size: 0.8rem;">
          <span style="color: #fff; font-family: var(--font-mono); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 300px;"><i class="ri-video-line" style="color: var(--red-light);"></i> Video #${i+1}: ${escapeHtml(vid)}</span>
          <button type="button" onclick="window.AdventuraApp.removeEditingVideo(${i})" style="background: rgba(240,40,31,0.2); color: #F87171; border: 1px solid rgba(240,40,31,0.4); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Remove</button>
        </div>
      `).join('');
      if (currentEditingVideos.length === 0) {
        vidList.innerHTML = `<div style="text-align: center; color: var(--text-dim); font-size: 0.8rem; padding: 10px;">No videos added yet. Select multiple video files or paste link below.</div>`;
      }
    }
  }

  function deleteProject(id) {
    try {
      if (confirm("Are you sure you want to delete this project?")) {
        addDeletedProjectId(id);
        projects = projects.filter(p => p.id !== id);
        safeSetStorage('adventura_projects_v2', projects);
        renderProjects('all');
        renderAdminCMS();
        try { window.dispatchEvent(new Event('storage')); } catch(e){}
      }
    } catch (e) {
      console.error('[Adventura Delete Project Error]', e);
    }
  }

  function changeProjectPhase(projectId, newPhase) {
    try {
      projects = projects.map(p => {
        if (p.id === projectId) {
          let statusLabel = p.status;
          if (newPhase === 'ongoing') statusLabel = 'Ongoing / Booking Open';
          if (newPhase === 'upcoming') statusLabel = 'Upcoming Launch';
          if (newPhase === 'completed') statusLabel = '100% Sold & Delivered';
          return { ...p, categoryStatus: newPhase, status: statusLabel };
        }
        return p;
      });
      safeSetStorage('adventura_projects_v2', projects);
      renderProjects('all');
      renderAdminCMS();
    } catch (e) {
      console.error('[Adventura Phase Change Error]', e);
    }
  }

  function changeSubtypeStatus(projectId, subType, newStatus) {
    try {
      projects = projects.map(p => {
        if (p.id === projectId) {
          if (subType === 'residential') return { ...p, residentialStatus: newStatus };
          if (subType === 'commercial') return { ...p, commercialStatus: newStatus };
        }
        return p;
      });
      safeSetStorage('adventura_projects_v2', projects);
      renderProjects('all');
      renderAdminCMS();
    } catch (e) {
      console.error('[Adventura Subtype Status Change Error]', e);
    }
  }

  /* ==========================================================================
     EVENT BINDINGS
     ========================================================================== */
  function initEventListeners() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const filter = e.target.getAttribute('data-filter');
        renderProjects(filter);
      });
    });

    const locationSelect = document.getElementById('searchLocation');
    const typeSelect = document.getElementById('searchType');
    
    if (locationSelect && typeSelect) {
      const runSearch = () => {
        renderProjects(typeSelect.value, locationSelect.value);
      };
      locationSelect.addEventListener('change', runSearch);
      typeSelect.addEventListener('change', runSearch);
    }

    const leadForm = document.getElementById('inquiryForm');
    if (leadForm) {
      leadForm.addEventListener('submit', handleLeadSubmission);
    }

    const mobileBtn = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');
    if (mobileBtn && navLinks) {
      mobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navLinks.classList.toggle('is-open');
      });

      document.addEventListener('click', (e) => {
        if (!navLinks.contains(e.target) && !mobileBtn.contains(e.target)) {
          navLinks.classList.remove('is-open');
        }
      });

      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('is-open');
        });
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal('projectDetailModal');
        closeModal('adminCMSModal');
      }
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });

    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentAdminTab = e.target.getAttribute('data-tab');
        renderAdminCMS();
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function handleLocalImageUpload(input) {
    if (input && input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) {
        if (!currentEditingImages.includes(e.target.result)) {
          currentEditingImages.push(e.target.result);
        }
        renderEditingMediaLists();
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  function handleLocalVideoUpload(input) {
    if (input && input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) {
        if (!currentEditingVideos.includes(e.target.result)) {
          currentEditingVideos.push(e.target.result);
        }
        renderEditingMediaLists();
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  function openClientReviewModal() {
    const modal = document.getElementById('clientReviewModal');
    if (modal) modal.classList.add('active');
  }

  function handleClientReviewSubmit(e) {
    if (e) e.preventDefault();
    try {
      const name = (document.getElementById('reviewName')?.value || '').trim();
      const role = (document.getElementById('reviewRole')?.value || '').trim() || 'Valued Client';
      const location = (document.getElementById('reviewLocation')?.value || '').trim() || 'Patna / Gaya';
      const project = document.getElementById('reviewProject')?.value || 'Dream City Phase 4';
      const rating = parseInt(document.getElementById('reviewRating')?.value || '5', 10);
      const avatar = document.getElementById('reviewAvatar')?.value || 'https://images.unsplash.com/photo-1566753323558-f4e0952af115?auto=format&fit=crop&w=300&q=80';
      const quote = (document.getElementById('reviewQuote')?.value || '').trim();

      if (!name || !quote) {
        alert("Please provide your full name and review details.");
        return;
      }

      const newTestimonial = {
        id: 't-' + Date.now(),
        name,
        role,
        location,
        project,
        rating,
        quote,
        verified: true,
        avatar
      };

      testimonials.unshift(newTestimonial);
      safeSetStorage('adventura_testimonials_v1', testimonials);
      renderTestimonials();
      closeModal('clientReviewModal');
      
      if (e.target && typeof e.target.reset === 'function') {
        e.target.reset();
      }
      alert(`Thank you ${name}! Your client review has been published live on the website.`);
    } catch (err) {
      console.error('[Adventura Review Error]', err);
    }
  }

  window.AdventuraApp = {
    openProjectModal,
    closeModal,
    triggerInquiryFor,
    openAdminDashboard,
    downloadLeadsCSV,
    openEditForm,
    saveProjectForm,
    renderAdminCMS,
    deleteProject,
    changeProjectPhase,
    changeSubtypeStatus,
    authenticateAdminPin,
    lockAdminPortal,
    selectPresetImage,
    togglePinVisibility,
    handleLocalImageUpload,
    handleLocalVideoUpload,
    openClientReviewModal,
    handleClientReviewSubmit,
    handleMultipleImagesUpload,
    handleMultipleVideosUpload,
    addPhotoUrlFromInput,
    addVideoUrlFromInput,
    removeEditingImage,
    removeEditingVideo
  };

})();
