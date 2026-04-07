/* KOH HOUSE — Main JavaScript (to be built) */

'use strict';

// ─── CONFIG ───────────────────────────────────────────
const CONFIG = {
  functionsBase: '/.netlify/functions',
  fallbackBase: '/data'
};

// ─── DATA CACHE ───────────────────────────────────────
const cache = {};

async function loadData(file) {
  if (cache[file]) return cache[file];
  try {
    const res = await fetch(
      `${CONFIG.functionsBase}/get-data?file=${file}`
    );
    if (!res.ok) throw new Error('Function failed');
    const result = await res.json();
    cache[file] = result.data;
    return result.data;
  } catch (e) {
    // Fallback to direct JSON (local dev)
    try {
      const res = await fetch(
        `${CONFIG.fallbackBase}/${file}.json`
      );
      const data = await res.json();
      cache[file] = data;
      return data;
    } catch (e2) {
      console.error(`Failed to load ${file}:`, e2);
      return null;
    }
  }
}

// ─── SETTINGS ─────────────────────────────────────────
function applySettings(settings) {
  if (!settings) return;
  if (settings.accentColour) {
    document.documentElement.style.setProperty(
      '--gold', settings.accentColour
    );
  }
  if (settings.textColour) {
    document.documentElement.style.setProperty(
      '--text', settings.textColour
    );
  }
  document.querySelectorAll('[data-setting="siteName"]')
    .forEach(el => {
      el.textContent = settings.siteName || 'KOH HOUSE';
    });
  document.querySelectorAll('[data-footer="address"]')
    .forEach(el => {
      el.textContent = settings.address || '';
    });
  document.querySelectorAll('[data-footer="phone"]')
    .forEach(el => {
      el.textContent = settings.phone || '';
    });
  document.querySelectorAll('[data-footer="email"]')
    .forEach(el => {
      el.textContent = settings.contactEmail || '';
    });
  const year = document.getElementById('footer-year');
  if (year) year.textContent = new Date().getFullYear();

  const igLink = document.getElementById('footer-instagram');
  if (igLink && settings.instagramUrl) {
    igLink.href = settings.instagramUrl;
  }
  const fbLink = document.getElementById('footer-facebook');
  if (fbLink && settings.facebookUrl) {
    fbLink.href = settings.facebookUrl;
  }
}

// ─── NAVIGATION ───────────────────────────────────────
function initNav() {
  const nav = document.getElementById('main-nav');
  const hamburger = document.getElementById('hamburger');
  const overlay = document.getElementById('nav-overlay');

  // Scroll behaviour
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      nav?.classList.add('nav-scrolled');
    } else {
      nav?.classList.remove('nav-scrolled');
    }
  }, { passive: true });

  // Hamburger
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    overlay?.classList.toggle('open');
  });

  // Close overlay on link click
  overlay?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger?.classList.remove('open');
      overlay.classList.remove('open');
    });
  });

  // Active nav link
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a, .nav-overlay a')
    .forEach(link => {
      const href = link.getAttribute('href');
      if (href && path.includes(href.replace('.html', ''))) {
        link.classList.add('active');
      }
      if ((path === '/' || path.endsWith('index.html'))
        && href === 'index.html') {
        link.classList.add('active');
      }
    });
}

// ─── PAGE TRANSITION ──────────────────────────────────
function initPageTransition() {
  const overlay = document.getElementById('page-transition');
  if (!overlay) return;

  // Fade in on load
  overlay.style.opacity = '1';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('hidden');
    });
  });

  // Fade out on link click
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') ||
        href.startsWith('http') ||
        href.startsWith('mailto') ||
        link.target === '_blank') return;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      overlay.classList.remove('hidden');
      overlay.style.opacity = '1';
      setTimeout(() => {
        window.location.href = href;
      }, 350);
    });
  });
}

// ─── SCROLL REVEAL ────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.reveal').forEach(el => {
    observer.observe(el);
  });
}

// ─── CUSTOM CURSOR ────────────────────────────────────
function initCursor() {
  if (window.innerWidth < 768) return;
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top = mouseY + 'px';
  });

  function animateRing() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';
    requestAnimationFrame(animateRing);
  }
  animateRing();

  document.querySelectorAll('a, button, img, .artwork-card')
    .forEach(el => {
      el.addEventListener('mouseenter', () => {
        ring.classList.add('hovering');
      });
      el.addEventListener('mouseleave', () => {
        ring.classList.remove('hovering');
      });
    });
}

// ─── CARD BUILDER ─────────────────────────────────────
function buildArtworkCard(artwork) {
  const inBasket = isInBasket(artwork.id);
  const available = artwork.available;

  return `
    <div class="artwork-card reveal"
      data-id="${artwork.id}">
      <div class="card-image-wrapper">
        <img src="${artwork.imageUrl}"
          alt="${artwork.title}"
          loading="lazy"
          onerror="this.src='https://picsum.photos/400/533'">
        <div class="card-overlay">
          <span>View Artwork</span>
        </div>
      </div>
      <div class="card-info">
        <span class="card-artist">${artwork.artist}</span>
        <h3 class="card-title">${artwork.title}</h3>
        <div class="card-footer">
          <span class="card-price">
            ${formatPrice(artwork.price)}
          </span>
          <span class="card-badge
            ${available ? 'available' : 'sold'}">
            ${available ? 'Available' : 'Sold'}
          </span>
        </div>
        ${available ? `
          <button class="card-add-btn
            ${inBasket ? 'in-basket' : ''}"
            data-artwork-id="${artwork.id}">
            ${inBasket ? 'In Basket ✓' : 'Add to Basket'}
          </button>
        ` : `
          <button class="card-add-btn sold-btn"
            disabled>Sold</button>
        `}
      </div>
    </div>
  `;
}

function attachCardListeners(container) {
  container.querySelectorAll('.artwork-card').forEach(card => {
    const id = card.dataset.id;

    // View artwork on image click
    card.querySelector('.card-image-wrapper')
      ?.addEventListener('click', () => {
        window.location.href = `artwork.html?id=${id}`;
      });

    // Add to basket
    const btn = card.querySelector('.card-add-btn:not(.sold-btn)');
    if (btn && !btn.classList.contains('in-basket')) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Find artwork data from page context
        const artwork = (window._artworksData || [])
          .find(a => a.id === id);
        if (artwork) {
          addToBasket(artwork);
          btn.textContent = 'In Basket ✓';
          btn.classList.add('in-basket');
        }
      });
    }
  });
}
