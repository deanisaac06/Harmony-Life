(function(){
  var toggle = document.querySelector('.nav-toggle');
  var mobileNav = document.querySelector('.mobile-nav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', function(){
      var open = mobileNav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  document.querySelectorAll('.mobile-nav .group-toggle').forEach(function(btn){
    btn.addEventListener('click', function(){
      var list = btn.parentElement.querySelector('.sub-list');
      var open = list.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function(){
      header.style.boxShadow = window.scrollY > 8 ? '0 8px 24px -18px rgba(33,17,10,0.5)' : 'none';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var yearEl = document.getElementById('year');
  if (yearEl) { yearEl.textContent = new Date().getFullYear(); }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // stagger steps mirror the CSS nth-child transition-delays in style.css,
  // plus a pause so counting starts only once each item has settled into view
  var STAGGER_STEPS = [50, 200, 350, 500, 650, 800];
  var SETTLE_PAUSE = 550;

  function animateCount(el, delay) {
    var target = parseFloat(el.getAttribute('data-target'));
    if (isNaN(target)) return;
    if (reduceMotion) { el.textContent = target.toLocaleString('en-US'); return; }
    var duration = 1100;
    function start() {
      var startTs = null;
      function tick(ts) {
        if (startTs === null) startTs = ts;
        var p = Math.min((ts - startTs) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var value = Math.round(target * eased);
        el.textContent = value.toLocaleString('en-US');
        if (p < 1) window.requestAnimationFrame(tick);
      }
      window.requestAnimationFrame(tick);
    }
    window.setTimeout(start, delay || 0);
  }

  function revealGroup(group) {
    group.classList.add('in-view');
    var children = Array.prototype.slice.call(group.children);
    children.forEach(function(child){
      var counts = child.matches('.count[data-target]') ? [child] : child.querySelectorAll('.count[data-target]');
      var idx = children.indexOf(child);
      var stagger = STAGGER_STEPS[Math.min(idx, STAGGER_STEPS.length - 1)];
      Array.prototype.forEach.call(counts, function(el){
        animateCount(el, reduceMotion ? 0 : stagger + SETTLE_PAUSE);
      });
    });
  }

  var revealGroups = document.querySelectorAll('.reveal-stagger');
  if (revealGroups.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) {
            revealGroup(entry.target);
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.35 });
      revealGroups.forEach(function(group){ io.observe(group); });
    } else {
      revealGroups.forEach(revealGroup);
    }
  }

  // Uganda map: scroll-scrubbed zoom from world -> Africa -> Uganda, reversible.
  // The SVG viewBox is fixed to the world frame at all times; zooming is done with a
  // CSS transform on the <g> of countries, which is compositor-only (no repaint of the
  // ~175 country paths every frame) and is what keeps this smooth.
  var MAP_DATA = {
    world: {cx:500.0, cy:195.83, w:1040.0, h:415.17},
    africa: {cx:546.51, cy:227.04, w:225.3, h:236.55},
    uganda: {cx:589.74, cy:226.66, w:150.05, h:156.56},
    markers: {
      fortportal: {x:584.1, y:228.69},
      kampala: {x:590.51, y:229.59},
      ugandaLabel: {x:589.74, y:215.5}
    }
  };

  var scrub = document.querySelector('.map-scrub');
  var svg = document.getElementById('worldMapSvg');
  if (scrub && svg && !reduceMotion) {
    var stage = scrub.querySelector('.map-stage');
    var countriesGroup = svg.querySelector('.countries');
    var ugandaPath = svg.querySelector('.country-uganda');
    var ugandaHighlight = null;
    if (ugandaPath) {
      ugandaHighlight = ugandaPath.cloneNode(true);
      ugandaHighlight.classList.add('country-uganda-highlight');
      countriesGroup.appendChild(ugandaHighlight);
    }
    var fpEl = scrub.querySelector('.marker-fortportal');
    var kpEl = scrub.querySelector('.marker-kampala');
    var ugLabelEl = scrub.querySelector('.map-uganda-label');
    var FRAME = MAP_DATA.world; // the SVG's fixed viewBox never changes from this

    // fades in as the zoom arrives at Uganda and then stays put, including once
    // fully zoomed in — it doesn't hand off to the city markers, it stays alongside them
    function ugandaLabelOpacity(p){
      if (p < 0.4) return 0;
      if (p < 0.58) return phase(p, 0.4, 0.58);
      return 1;
    }

    function ease(t){ return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
    function lerp(a, b, t){ return a + (b - a) * t; }
    function lerpCam(a, b, t){
      var e = ease(t);
      return { cx: lerp(a.cx,b.cx,e), cy: lerp(a.cy,b.cy,e), w: lerp(a.w,b.w,e), h: lerp(a.h,b.h,e) };
    }
    function phase(p, start, end){ return Math.max(0, Math.min(1, (p - start) / (end - start))); }

    // one continuous glide straight from the world center to the Uganda center — no
    // intermediate waypoint, so the camera path is a single smooth diagonal with no kink
    function cameraForProgress(p){
      return lerpCam(MAP_DATA.world, MAP_DATA.uganda, phase(p, 0, 0.85));
    }

    // fit info: how the fixed FRAME viewBox letterboxes into the stage box (recomputed on resize only)
    var fit = { scale: 1, offsetX: 0, offsetY: 0 };
    function recomputeFit(){
      var r = stage.getBoundingClientRect();
      var scale = Math.min(r.width / FRAME.w, r.height / FRAME.h);
      fit.scale = scale;
      fit.offsetX = (r.width - FRAME.w * scale) / 2;
      fit.offsetY = (r.height - FRAME.h * scale) / 2;
    }

    function projectToStage(pt, cam){
      // world-space point -> position after the camera's translate+scale -> screen px
      var s = fit.scale * (FRAME.w / cam.w);
      var px = (pt.x - cam.cx) * s + FRAME.w/2 * fit.scale + fit.offsetX;
      var py = (pt.y - cam.cy) * s + FRAME.h/2 * fit.scale + fit.offsetY;
      return { x: px, y: py };
    }

    function computeProgress(){
      var rect = scrub.getBoundingClientRect();
      var vh = window.innerHeight;
      var total = rect.height - vh;
      if (total <= 0) return 1;
      // lead: start the zoom ramping a little before the section is fully pinned, so
      // it's already underway rather than sitting on a static whole-world view first.
      // hold: reserve some of the pinned scroll distance so the fully zoomed-in end
      // state stays frozen on screen for a bit before the page is allowed to move on.
      var lead = vh * 0.85;
      var hold = vh * 0.35;
      var animTotal = Math.max(total - hold, 1);
      var scrolled = -rect.top + lead;
      return Math.max(0, Math.min(1, scrolled / (animTotal + lead)));
    }

    var lastP = -1;
    function updateMap(){
      var p = computeProgress();
      if (Math.abs(p - lastP) < 0.0008) return; // skip imperceptible no-op writes
      lastP = p;
      var cam = cameraForProgress(p);
      var s = FRAME.w / cam.w;
      // recenter cam's center exactly on FRAME's center (the fixed viewBox's own center),
      // not FRAME.w/2 — those differ whenever FRAME isn't centered at its own half-width
      var tx = FRAME.cx - cam.cx * s;
      var ty = FRAME.cy - cam.cy * s;
      countriesGroup.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';

      if (ugandaHighlight) ugandaHighlight.style.opacity = phase(p, 0.42, 0.78);

      if (ugLabelEl) {
        var ugPos = projectToStage(MAP_DATA.markers.ugandaLabel, cam);
        var ugOp = ugandaLabelOpacity(p);
        var ugScale = 0.85 + ugOp * 0.15;
        ugLabelEl.style.transform = 'translate(' + ugPos.x + 'px,' + ugPos.y + 'px) translate(-50%,-50%) scale(' + ugScale + ')';
        ugLabelEl.style.opacity = ugOp;
      }

      if (fpEl) {
        var fpPos = projectToStage(MAP_DATA.markers.fortportal, cam);
        fpEl.style.transform = 'translate(' + fpPos.x + 'px,' + fpPos.y + 'px)';
        fpEl.classList.toggle('is-visible', p >= 0.88);
      }
      if (kpEl) {
        var kpPos = projectToStage(MAP_DATA.markers.kampala, cam);
        kpEl.style.transform = 'translate(' + kpPos.x + 'px,' + kpPos.y + 'px)';
        kpEl.classList.toggle('is-visible', p >= 0.94);
      }
    }

    var mapTicking = false;
    function onMapScroll(){
      if (!mapTicking) {
        window.requestAnimationFrame(function(){ updateMap(); mapTicking = false; });
        mapTicking = true;
      }
    }
    function onMapResize(){ recomputeFit(); lastP = -1; updateMap(); }

    // only listen to scroll while the map is anywhere near the viewport, so the rest
    // of the page's scrolling never pays for this section's per-frame work
    var mapActive = false;
    function setActive(on){
      if (on === mapActive) return;
      mapActive = on;
      if (on) {
        recomputeFit();
        window.addEventListener('scroll', onMapScroll, { passive: true });
        window.addEventListener('resize', onMapResize);
        lastP = -1;
        updateMap();
      } else {
        window.removeEventListener('scroll', onMapScroll);
        window.removeEventListener('resize', onMapResize);
      }
    }
    if ('IntersectionObserver' in window) {
      var mapVisIo = new IntersectionObserver(function(entries){
        setActive(entries[0].isIntersecting);
      }, { rootMargin: '50% 0px 50% 0px' });
      mapVisIo.observe(scrub);
    } else {
      setActive(true);
    }
  } else if (svg) {
    // reduced motion: land directly on the Uganda view with everything visible
    var camU = { cx: 589.74, cy: 226.66, w: 150.05, h: 156.56 };
    svg.setAttribute('viewBox', (camU.cx-camU.w/2) + ' ' + (camU.cy-camU.h/2) + ' ' + camU.w + ' ' + camU.h);
    var ugPath = svg.querySelector('.country-uganda');
    if (ugPath) {
      var ugHl = ugPath.cloneNode(true);
      ugHl.classList.add('country-uganda-highlight');
      ugHl.style.opacity = 1;
      svg.querySelector('.countries').appendChild(ugHl);
    }
    document.querySelectorAll('.map-marker').forEach(function(el, i){
      el.classList.add('is-visible');
      el.style.left = '50%'; el.style.top = (35 + i*20) + '%';
    });
    var ugLabelStatic = svg.parentElement.querySelector('.map-uganda-label');
    if (ugLabelStatic) {
      ugLabelStatic.style.opacity = 1;
      ugLabelStatic.style.left = '50%'; ugLabelStatic.style.top = '22%';
      ugLabelStatic.style.transform = 'translate(-50%,-50%)';
    }
  }
})();
