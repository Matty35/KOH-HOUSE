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

  // Fade out on page load — no inline style, let CSS class control opacity
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('hidden');
    });
  });

  // Fade to white on link click, then navigate
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') ||
        href.startsWith('http') ||
        href.startsWith('mailto') ||
        link.target === '_blank') return;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      overlay.classList.remove('hidden');
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

// ─── HERO SLIDESHOW ───────────────────────────────────
function initHeroSlideshow(slides) {
  const hero = document.getElementById('hero');
  const dotsContainer = document.getElementById('slide-dots');
  if (!hero || !slides || slides.length === 0) return;

  let current = 0;
  let autoplay;

  // Build slides
  slides.forEach((slide, i) => {
    const el = document.createElement('div');
    el.className = `slide${i === 0 ? ' active' : ''}`;
    el.innerHTML = `
      <div class="slide-bg" style="background-image:
        url('${slide.image}')"></div>
      <div class="slide-overlay"></div>
      <div class="slide-content">
        ${slide.label ?
          `<span class="slide-label">${slide.label}</span>`
          : ''}
        <h1 class="slide-headline">${slide.headline}</h1>
        <p class="slide-subheading">${slide.subheading}</p>
        <div class="slide-ctas">
          ${slide.cta1Text ? `
            <a href="${slide.cta1Link}"
              class="btn-primary">${slide.cta1Text}</a>
          ` : ''}
          ${slide.cta2Text ? `
            <a href="${slide.cta2Link}"
              class="btn-secondary">${slide.cta2Text}</a>
          ` : ''}
        </div>
      </div>
    `;
    hero.insertBefore(el, hero.querySelector('.slide-dots'));
  });

  // Build dots
  if (dotsContainer) {
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = `slide-dot${i === 0 ? ' active' : ''}`;
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });
  }

  function goToSlide(index) {
    const allSlides = hero.querySelectorAll('.slide');
    const allDots = dotsContainer?.querySelectorAll('.slide-dot');
    allSlides[current]?.classList.remove('active');
    allDots?.[current]?.classList.remove('active');
    current = (index + slides.length) % slides.length;
    allSlides[current]?.classList.add('active');
    allDots?.[current]?.classList.add('active');
  }

  function nextSlide() { goToSlide(current + 1); }
  function prevSlide() { goToSlide(current - 1); }

  document.getElementById('hero-next')
    ?.addEventListener('click', nextSlide);
  document.getElementById('hero-prev')
    ?.addEventListener('click', prevSlide);

  function startAutoplay() {
    autoplay = setInterval(nextSlide, 5000);
  }
  function stopAutoplay() {
    clearInterval(autoplay);
  }

  hero.addEventListener('mouseenter', stopAutoplay);
  hero.addEventListener('mouseleave', startAutoplay);

  // Touch/swipe
  let touchStartX = 0;
  hero.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  hero.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? nextSlide() : prevSlide();
    }
  }, { passive: true });

  startAutoplay();
}

// ─── ARTISTS SLIDER ───────────────────────────────────
function initArtistsSlider() {
  const track = document.getElementById('artists-track');
  if (!track) return;

  const cardWidth = 260 + 28; // card + gap
  let offset = 0;
  let autoplay;

  function slide(direction) {
    const maxOffset = Math.max(
      0,
      track.scrollWidth - track.parentElement.offsetWidth
    );
    offset += direction * cardWidth;
    offset = Math.max(0, Math.min(offset, maxOffset));
    track.style.transform = `translateX(-${offset}px)`;
  }

  document.getElementById('artists-next')
    ?.addEventListener('click', () => slide(1));
  document.getElementById('artists-prev')
    ?.addEventListener('click', () => slide(-1));

  const wrapper = track.closest('.artists-slider-wrapper');
  wrapper?.addEventListener('mouseenter',
    () => clearInterval(autoplay)
  );
  wrapper?.addEventListener('mouseleave', () => {
    autoplay = setInterval(() => slide(1), 4000);
  });

  autoplay = setInterval(() => slide(1), 4000);
}

// ─── GENRES ───────────────────────────────────────────
const GENRES = [
  { name: 'Abstract', img: 'https://picsum.photos/400/400?random=60' },
  { name: 'Landscape', img: 'https://picsum.photos/400/400?random=61' },
  { name: 'Portrait', img: 'https://picsum.photos/400/400?random=62' },
  { name: 'Street Art', img: 'https://picsum.photos/400/400?random=63' },
  { name: 'Floral', img: 'https://picsum.photos/400/400?random=64' },
  { name: 'Contemporary', img: 'https://picsum.photos/400/400?random=65' },
  { name: 'Sculpture', img: 'https://picsum.photos/400/400?random=66' },
  { name: 'Mixed Media', img: 'https://picsum.photos/400/400?random=67' }
];

function renderGenreTiles() {
  const grid = document.getElementById('genres-grid');
  if (!grid) return;
  grid.innerHTML = GENRES.map(genre => `
    <a href="shop.html?genre=${encodeURIComponent(genre.name)}"
      class="genre-tile">
      <div class="genre-tile-bg"
        style="background-image:url('${genre.img}')"></div>
      <div class="genre-tile-overlay"></div>
      <div class="genre-tile-content">
        <span class="genre-tile-name">${genre.name}</span>
        <span class="genre-tile-explore">Explore →</span>
      </div>
    </a>
  `).join('');
}

// ─── HOMEPAGE INIT ────────────────────────────────────
async function initHomepage() {
  const [homepage, artworks, artists, settings] =
    await Promise.all([
      loadData('homepage'),
      loadData('artworks'),
      loadData('artists'),
      loadData('settings')
    ]);

  window._artworksData = artworks || [];

  applySettings(settings);

  // Hero
  if (homepage?.heroSlides) {
    initHeroSlideshow(homepage.heroSlides);
  }

  // Featured artworks
  const featuredGrid = document.getElementById('featured-grid');
  if (featuredGrid && artworks) {
    const ids = homepage?.featuredArtworkIds || [];
    const featured = ids.length > 0
      ? ids.map(id => artworks.find(a => a.id === id))
          .filter(Boolean)
      : artworks.slice(0, 6);

    featuredGrid.innerHTML = featured
      .map(buildArtworkCard).join('');
    attachCardListeners(featuredGrid);
  }

  // Genre tiles
  renderGenreTiles();

  // Artists slider
  const track = document.getElementById('artists-track');
  if (track && artists) {
    const ids = homepage?.featuredArtistIds || [];
    const featured = ids.length > 0
      ? ids.map(id => artists.find(a => a.id === id))
          .filter(Boolean)
      : artists;

    track.innerHTML = featured.map(artist => `
      <div class="artist-card"
        onclick="window.location.href=
          'artist.html?id=${artist.id}'">
        <div class="artist-card-image">
          <img src="${artist.profileImageUrl}"
            alt="${artist.name}" loading="lazy"
            onerror="this.src=
              'https://picsum.photos/300/300'">
        </div>
        <div class="artist-card-name">${artist.name}</div>
        <div class="artist-card-speciality">
          ${artist.speciality || ''}
        </div>
        <div class="artist-card-bio">
          ${artist.shortBio || ''}
        </div>
      </div>
    `).join('');
    initArtistsSlider();
  }

  // Press quote
  const quoteEl = document.getElementById('press-quote-text');
  const sourceEl = document.getElementById('press-source-text');
  if (homepage?.pressQuote && quoteEl) {
    quoteEl.textContent = homepage.pressQuote;
  }
  if (homepage?.pressSource && sourceEl) {
    sourceEl.textContent = `— ${homepage.pressSource}`;
  }

  // About section
  const aboutImg = document.getElementById('about-img');
  const aboutHeadline = document.getElementById('about-headline');
  const aboutLead = document.getElementById('about-lead');
  if (aboutImg && homepage?.aboutImage) {
    aboutImg.src = homepage.aboutImage;
    aboutImg.alt = 'KOH HOUSE Gallery';
  }
  if (aboutHeadline && homepage?.aboutHeadline) {
    aboutHeadline.textContent = homepage.aboutHeadline;
  }
  if (aboutLead && homepage?.aboutText) {
    aboutLead.textContent = homepage.aboutText;
  }

  initScrollReveal();
}

// ─── SHOP PAGE INIT ───────────────────────────────────
async function initShop() {
  const [artworks, artists, settings] = await Promise.all([
    loadData('artworks'),
    loadData('artists'),
    loadData('settings')
  ]);

  window._artworksData = artworks || [];
  applySettings(settings);

  // Populate artist filter
  const artistFilter = document.getElementById('filter-artist');
  if (artistFilter && artists) {
    artists.forEach(artist => {
      const opt = document.createElement('option');
      opt.value = artist.name;
      opt.textContent = artist.name;
      artistFilter.appendChild(opt);
    });
  }

  // Check URL params
  const params = new URLSearchParams(window.location.search);
  const genreParam = params.get('genre');
  if (genreParam) {
    const genreFilter = document.getElementById('filter-genre');
    if (genreFilter) genreFilter.value = genreParam;
  }

  renderShopGrid(artworks || []);

  // Filter listeners
  ['filter-genre','filter-medium','filter-price',
   'filter-artist'].forEach(id => {
    document.getElementById(id)?.addEventListener(
      'change', () => applyFilters(artworks || [])
    );
  });
  document.getElementById('filter-available')
    ?.addEventListener('change',
      () => applyFilters(artworks || [])
    );
  document.getElementById('filter-reset')
    ?.addEventListener('click', () => {
      ['filter-genre','filter-medium','filter-price',
       'filter-artist'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const avail = document.getElementById('filter-available');
      if (avail) avail.checked = false;
      renderShopGrid(artworks || []);
    });

  initScrollReveal();
}

function applyFilters(artworks) {
  const genre = document.getElementById('filter-genre')
    ?.value || '';
  const medium = document.getElementById('filter-medium')
    ?.value || '';
  const price = document.getElementById('filter-price')
    ?.value || '';
  const artist = document.getElementById('filter-artist')
    ?.value || '';
  const availOnly = document.getElementById('filter-available')
    ?.checked || false;

  let filtered = [...artworks];

  if (genre) filtered = filtered.filter(
    a => a.genre === genre
  );
  if (artist) filtered = filtered.filter(
    a => a.artist === artist
  );
  if (availOnly) filtered = filtered.filter(
    a => a.available
  );
  if (medium) {
    filtered = filtered.filter(a => {
      const ed = (a.edition || '').toLowerCase();
      if (medium === 'Original')
        return ed === 'original' || !ed;
      if (medium === 'Limited Edition')
        return ed.includes('of');
      if (medium === 'Print')
        return ed.includes('print');
      if (medium === 'Sculpture')
        return a.genre === 'Sculpture';
      return true;
    });
  }
  if (price) {
    const [min, max] = price.split('-').map(Number);
    filtered = filtered.filter(
      a => a.price >= min && a.price <= max
    );
  }

  renderShopGrid(filtered);
}

function renderShopGrid(artworks) {
  const grid = document.getElementById('shop-grid');
  const empty = document.getElementById('shop-empty');
  const count = document.getElementById('results-count');
  if (!grid) return;

  if (artworks.length === 0) {
    grid.innerHTML = '';
    empty?.classList.remove('hidden');
    if (count) count.textContent = '0 works';
    return;
  }

  empty?.classList.add('hidden');
  if (count) {
    count.textContent =
      `${artworks.length} work${artworks.length !== 1
        ? 's' : ''}`;
  }

  grid.innerHTML = artworks.map(buildArtworkCard).join('');
  attachCardListeners(grid);
  initScrollReveal();
}

// ─── ARTWORK DETAIL ───────────────────────────────────
async function initArtworkDetail() {
  const id = new URLSearchParams(window.location.search)
    .get('id');

  const detailContainer = document.getElementById(
    'artwork-detail-container'
  );
  const notFound = document.getElementById(
    'artwork-not-found'
  );
  const relatedSection = document.getElementById(
    'related-section'
  );

  if (!id) {
    detailContainer?.classList.add('hidden');
    notFound?.classList.remove('hidden');
    relatedSection?.classList.add('hidden');
    return;
  }

  const [artworks, artists, settings] = await Promise.all([
    loadData('artworks'),
    loadData('artists'),
    loadData('settings')
  ]);

  window._artworksData = artworks || [];
  applySettings(settings);

  const artwork = (artworks || []).find(a => a.id === id);

  if (!artwork) {
    detailContainer?.classList.add('hidden');
    notFound?.classList.remove('hidden');
    relatedSection?.classList.add('hidden');
    return;
  }

  // Populate detail page
  document.title = `${artwork.title} | KOH HOUSE`;

  const img = document.getElementById('artwork-main-image');
  if (img) { img.src = artwork.imageUrl; img.alt = artwork.title; }

  document.getElementById('breadcrumb-title')
    .textContent = artwork.title;

  const artistLink = document.getElementById(
    'artwork-artist-link'
  );
  if (artistLink) {
    const artist = (artists || [])
      .find(a => a.name === artwork.artist);
    artistLink.textContent = artwork.artist;
    if (artist) {
      artistLink.href = `artist.html?id=${artist.id}`;
    }
  }

  document.getElementById('artwork-title')
    .textContent = artwork.title;

  document.getElementById('artwork-price')
    .textContent = formatPrice(artwork.price);

  const badge = document.getElementById('artwork-badge');
  if (badge) {
    badge.innerHTML = `
      <span class="card-badge
        ${artwork.available ? 'available' : 'sold'}"
        style="margin-bottom:24px;display:inline-flex">
        ${artwork.available ? 'Available' : 'Sold'}
      </span>`;
  }

  const specs = document.getElementById('artwork-specs');
  if (specs) {
    const rows = [
      ['Medium', artwork.medium],
      ['Dimensions', artwork.dimensions],
      ['Edition', artwork.edition]
    ].filter(([,val]) => val);

    specs.innerHTML = rows.map(([label, val]) => `
      <span class="spec-label">${label}</span>
      <span class="spec-value">${val}</span>
    `).join('');
  }

  const desc = document.getElementById('artwork-description');
  if (desc) desc.textContent = artwork.description || '';

  // Add to basket button
  const basketBtn = document.getElementById('add-to-basket-btn');
  if (basketBtn) {
    if (!artwork.available) {
      basketBtn.textContent = 'Sold';
      basketBtn.disabled = true;
    } else if (isInBasket(artwork.id)) {
      basketBtn.textContent = 'In Your Basket ✓';
      basketBtn.disabled = true;
    } else {
      basketBtn.addEventListener('click', () => {
        addToBasket(artwork);
        basketBtn.textContent = 'Added to Basket ✓';
        basketBtn.disabled = true;
      });
    }
  }

  // Enquiry link
  const enquireLink = document.getElementById('enquire-link');
  if (enquireLink) {
    enquireLink.href = `mailto:hello@kohhouse.com` +
      `?subject=Enquiry: ${artwork.title}` +
      `&body=I am interested in ${artwork.title} ` +
      `by ${artwork.artist}.`;
  }

  // Lightbox
  const mainImg = document.getElementById('artwork-main-image');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');

  mainImg?.addEventListener('click', () => {
    if (lightboxImg) lightboxImg.src = artwork.imageUrl;
    lightbox?.classList.add('open');
  });
  lightboxClose?.addEventListener('click', () => {
    lightbox?.classList.remove('open');
  });
  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      lightbox.classList.remove('open');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      lightbox?.classList.remove('open');
    }
  });

  // Related artworks
  const relatedGrid = document.getElementById('related-grid');
  if (relatedGrid && artworks) {
    const related = artworks
      .filter(a => a.genre === artwork.genre && a.id !== id)
      .slice(0, 4);

    if (related.length > 0) {
      relatedGrid.innerHTML = related
        .map(buildArtworkCard).join('');
      attachCardListeners(relatedGrid);
    } else {
      relatedSection?.classList.add('hidden');
    }
  }
}

// ─── ARTISTS PAGE ─────────────────────────────────────
async function initArtistsPage() {
  const [artists, settings] = await Promise.all([
    loadData('artists'),
    loadData('settings')
  ]);
  applySettings(settings);

  const grid = document.getElementById('artists-grid');
  if (!grid || !artists) return;

  grid.innerHTML = artists.map(artist => `
    <div class="artwork-card reveal"
      style="cursor:pointer"
      onclick="window.location.href=
        'artist.html?id=${artist.id}'">
      <div class="card-image-wrapper"
        style="aspect-ratio:3/4">
        <img src="${artist.profileImageUrl}"
          alt="${artist.name}" loading="lazy"
          style="filter:grayscale(20%);
          transition:filter 0.5s ease"
          onmouseover="this.style.filter='grayscale(0%)'"
          onmouseout="this.style.filter='grayscale(20%)'">
        <div class="card-overlay">
          <span>View Works</span>
        </div>
      </div>
      <div class="card-info">
        <span class="card-artist">
          ${artist.nationality || ''}
        </span>
        <h3 class="card-title">${artist.name}</h3>
        <p style="font-size:0.82rem;
          color:var(--text-muted);margin-top:4px">
          ${artist.shortBio || artist.speciality || ''}
        </p>
      </div>
    </div>
  `).join('');

  initScrollReveal();
}

// ─── ARTIST DETAIL ────────────────────────────────────
async function initArtistDetail() {
  const id = new URLSearchParams(window.location.search)
    .get('id');

  const [artists, artworks, settings] = await Promise.all([
    loadData('artists'),
    loadData('artworks'),
    loadData('settings')
  ]);

  window._artworksData = artworks || [];
  applySettings(settings);

  const artist = (artists || []).find(a => a.id === id);
  if (!artist) {
    document.body.innerHTML = `
      <div style="text-align:center;padding:120px 40px">
        <h2 style="font-family:'Playfair Display',serif">
          Artist not found
        </h2>
        <a href="artists.html" style="color:var(--gold);
          margin-top:24px;display:inline-block">
          View All Artists
        </a>
      </div>`;
    return;
  }

  document.title = `${artist.name} | KOH HOUSE`;

  // Hero
  const heroBg = document.getElementById('artist-hero-bg');
  if (heroBg) {
    heroBg.style.backgroundImage =
      `url('${artist.profileImageUrl}')`;
  }
  document.getElementById('artist-name')
    .textContent = artist.name;
  document.getElementById('artist-nationality')
    .textContent = artist.nationality || '';
  document.getElementById('artist-speciality')
    .textContent = artist.speciality || '';

  // Bio
  document.getElementById('artist-bio')
    .textContent = artist.bio || '';

  // Stats
  const statsEl = document.getElementById('artist-stats');
  const artistWorks = (artworks || [])
    .filter(a => a.name === artist.name ||
                 a.artist === artist.name);
  if (statsEl) {
    statsEl.innerHTML = `
      <div style="margin-bottom:24px">
        <div style="font-size:0.65rem;text-transform:uppercase;
          letter-spacing:0.15em;color:var(--text-muted);
          margin-bottom:6px">Speciality</div>
        <div style="font-family:'Playfair Display',serif;
          font-size:1.1rem">${artist.speciality || '—'}</div>
      </div>
      <div style="margin-bottom:24px">
        <div style="font-size:0.65rem;text-transform:uppercase;
          letter-spacing:0.15em;color:var(--text-muted);
          margin-bottom:6px">Nationality</div>
        <div style="font-family:'Playfair Display',serif;
          font-size:1.1rem">${artist.nationality || '—'}</div>
      </div>
      <div>
        <div style="font-size:0.65rem;text-transform:uppercase;
          letter-spacing:0.15em;color:var(--text-muted);
          margin-bottom:6px">Works Available</div>
        <div style="font-family:'Playfair Display',serif;
          font-size:2rem;color:var(--gold)">
          ${artistWorks.filter(w => w.available).length}
        </div>
      </div>
    `;
  }

  // Works title
  const worksTitle = document.getElementById('artist-works-title');
  if (worksTitle) {
    worksTitle.textContent = `Works by ${artist.name}`;
  }

  // Works grid
  const worksGrid = document.getElementById('artist-works-grid');
  const noWorks = document.getElementById('artist-no-works');

  if (artistWorks.length === 0) {
    noWorks?.classList.remove('hidden');
  } else {
    if (worksGrid) {
      worksGrid.innerHTML = artistWorks
        .map(buildArtworkCard).join('');
      attachCardListeners(worksGrid);
    }
  }

  initScrollReveal();
}

// ─── BASKET PAGE ──────────────────────────────────────
function initBasketPage() {
  const basket = getBasket();
  const emptyEl = document.getElementById('basket-empty');
  const contentEl = document.getElementById('basket-content');

  if (basket.length === 0) {
    emptyEl?.classList.remove('hidden');
    contentEl?.classList.add('hidden');
    return;
  }

  emptyEl?.classList.add('hidden');
  contentEl?.classList.remove('hidden');

  renderBasketItems(basket);
  renderOrderSummary(basket);

  loadData('settings').then(applySettings);
}

function renderBasketItems(basket) {
  const container = document.getElementById('basket-items');
  if (!container) return;

  container.innerHTML = basket.map(item => `
    <div class="basket-item" data-id="${item.id}">
      <img class="basket-item-image"
        src="${item.imageUrl}" alt="${item.title}"
        onerror="this.src=
          'https://picsum.photos/80/100'">
      <div class="basket-item-details">
        <div class="basket-item-artist">${item.artist}</div>
        <div class="basket-item-title">${item.title}</div>
        <div class="basket-item-edition">${item.edition}</div>
        <div class="basket-item-price">
          ${formatPrice(item.price)}
        </div>
      </div>
      <button class="basket-item-remove"
        onclick="handleRemoveFromBasket('${item.id}')"
        aria-label="Remove ${item.title}">
        ✕
      </button>
    </div>
  `).join('');
}

function handleRemoveFromBasket(id) {
  removeFromBasket(id);
  const basket = getBasket();
  if (basket.length === 0) {
    document.getElementById('basket-empty')
      ?.classList.remove('hidden');
    document.getElementById('basket-content')
      ?.classList.add('hidden');
  } else {
    renderBasketItems(basket);
    renderOrderSummary(basket);
  }
}

function renderOrderSummary(basket) {
  const linesEl = document.getElementById('summary-lines');
  const totalEl = document.getElementById('basket-total');

  if (linesEl) {
    linesEl.innerHTML = basket.map(item => `
      <div class="summary-line">
        <span class="label">${item.title}</span>
        <span class="value">${formatPrice(item.price)}</span>
      </div>
    `).join('') + `
      <div class="summary-line shipping">
        <span class="label">Delivery</span>
        <span class="value">Free</span>
      </div>
    `;
  }

  if (totalEl) {
    totalEl.textContent = formatPrice(getBasketTotal());
  }

  // Checkout button
  const checkoutBtn = document.getElementById('checkout-btn');
  checkoutBtn?.addEventListener('click', handleCheckout);
}

async function handleCheckout() {
  const btn = document.getElementById('checkout-btn');
  if (!btn) return;

  btn.textContent = 'Processing...';
  btn.disabled = true;

  const basket = getBasket();

  try {
    const res = await fetch(
      '/.netlify/functions/create-checkout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: basket })
      }
    );
    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'No checkout URL');
    }
  } catch (e) {
    console.error('Checkout error:', e);
    showBasketToast(
      'Payment setup failed. Please try again.',
      'error'
    );
    btn.textContent = 'Proceed to Checkout';
    btn.disabled = false;
  }
}

// ─── PAGE ROUTER ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  // Always init nav, transition and cursor
  initNav();
  initPageTransition();
  initCursor();

  const path = window.location.pathname;
  const page = document.body.id;

  // Route to correct page init
  if (page === 'page-home' ||
      path === '/' ||
      path.endsWith('index.html')) {
    await initHomepage();
  }
  else if (page === 'page-shop' ||
           path.includes('shop')) {
    await initShop();
  }
  else if (page === 'page-artwork' ||
           path.includes('artwork.html')) {
    await initArtworkDetail();
  }
  else if (page === 'page-artists' ||
           (path.includes('artists') &&
            !path.includes('artist.'))) {
    await initArtistsPage();
  }
  else if (page === 'page-artist' ||
           path.includes('artist.html')) {
    await initArtistDetail();
  }
  else if (page === 'page-basket' ||
           path.includes('basket')) {
    initBasketPage();
    loadData('settings').then(applySettings);
  }
  else if (path.includes('contact')) {
    const settings = await loadData('settings');
    applySettings(settings);
    initScrollReveal();
  }
  else {
    // Fallback — apply settings on any other page
    const settings = await loadData('settings');
    applySettings(settings);
  }
});
