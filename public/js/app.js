/**
 * First Step Senior Secondary School — Production Frontend Application
 * Integrated Components:
  * 2. PillNav: GSAP-Powered Floating Navigation with Rising Circle Effect & Logo Spin
 * 3. Interactive 3D Tilt Physics on Cards
 * 4. Animated Milestone Counters (ScrollTrigger / IntersectionObserver)
 * 5. NEP 2020 Interactive Stage Explorer
 * 6. Lightbox & Full REST API Client for Dynamic SQLite Data Hydration
 */

(function () {
  'use strict';

  /* ==========================================================================
     Global State & Constants
     ========================================================================== */
  var VALID_PAGES = [
    'home', 'about', 'academics', 'admissions', 'facilities',
    'achievements', 'gallery', 'contact', 'privacy', 'terms', 'admin'
  ];

  var state = {
    banners: [],
    gallery: [],
    achievements: [],
    notices: []
  };

  var heroIndex = 0;
  var heroTimer = null;
  var galFilter = 'All';

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function api(path, opts) {
    opts = opts || {};
    opts.credentials = 'include';
    return fetch('/api' + path, opts).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  function apiForm(path, method, formData) {
    return fetch('/api' + path, {
      method: method,
      credentials: 'include',
      body: formData
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  /* ==========================================================================
     1. Header & Navigation Controller (Zero-Glitch Smooth Routing)
     ========================================================================== */
  function initPillNav() {
    var mobileBtn = document.getElementById('mobileMenuBtn');
    var mobileDropdown = document.getElementById('mobileDropdown');
    var logoLink = document.getElementById('pillLogoLink');
    var logoImg = document.getElementById('pillLogoImg');

    // Smooth Navigation Interceptor: Prevents browser anchor jump stutter
    document.querySelectorAll('a[data-nav]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var targetPage = this.getAttribute('data-nav');
        if (targetPage) {
          e.preventDefault();
          if (mobileDropdown && mobileDropdown.classList.contains('open')) {
            mobileDropdown.classList.remove('open');
            if (mobileBtn) {
              mobileBtn.setAttribute('aria-expanded', 'false');
              var iconOpen = mobileBtn.querySelector('.icon-open');
              var iconClose = mobileBtn.querySelector('.icon-close');
              if (iconOpen && iconClose) {
                iconOpen.style.display = 'block';
                iconClose.style.display = 'none';
              }
            }
          }
          if (location.hash !== '#' + targetPage) {
            location.hash = '#' + targetPage;
          } else {
            navigateTo(targetPage);
          }
        }
      });
    });

    // Close Mobile Drawer
    var mobileDropdown = document.getElementById('mobileDropdown');
    var mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileDropdown) mobileDropdown.classList.remove('open');
    if (mobileBtn) {
      mobileBtn.setAttribute('aria-expanded', 'false');
      var iconOpen = mobileBtn.querySelector('.icon-open');
      var iconClose = mobileBtn.querySelector('.icon-close');
      if (iconOpen && iconClose) {
        iconOpen.style.display = 'block';
        iconClose.style.display = 'none';
      }
    }

    if (pageId === 'admin') {
      checkAdminSession();
    }
  }

  function routeFromHash() {
    var raw = (location.hash || '#home').replace('#', '').trim();
    navigateTo(raw);
  }
  window.addEventListener('hashchange', routeFromHash);

  var yrEl = document.getElementById('currentYear');
  if (yrEl) yrEl.textContent = new Date().getFullYear();

  /* ==========================================================================
     7. Hero Slider
     ========================================================================== */
  function renderHeroSlider() {
    var slidesWrap = document.getElementById('heroSlides');
    var dotsWrap = document.getElementById('heroDots');
    if (!slidesWrap || !dotsWrap) return;

    var list = state.banners;
    if (!list || !list.length) {
      list = [{ img: 'img/building.jpg', caption: 'First Step Senior Secondary School, Chhindwara' }];
    }

    slidesWrap.innerHTML = list.map(function (b, i) {
      return '<div class="hero-bg-slide' + (i === 0 ? ' active' : '') + '" style="background-image:url(\'' + esc(b.img) + '\')" data-i="' + i + '"></div>';
    }).join('');

    dotsWrap.innerHTML = list.map(function (b, i) {
      return '<button data-i="' + i + '" class="' + (i === 0 ? 'active' : '') + '" aria-label="Slide ' + (i + 1) + '" style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.4);border:none;cursor:pointer;"></button>';
    }).join('');

    heroIndex = 0;
    var slideEls = slidesWrap.querySelectorAll('.hero-bg-slide');
    var dotEls = dotsWrap.querySelectorAll('button');

    function showSlide(idx) {
      heroIndex = idx;
      slideEls.forEach(function (s, i) { s.classList.toggle('active', i === idx); });
      dotEls.forEach(function (d, i) {
        d.classList.toggle('active', i === idx);
        d.style.background = i === idx ? 'var(--gold-accent)' : 'rgba(255,255,255,0.4)';
        d.style.width = i === idx ? '26px' : '10px';
        d.style.borderRadius = i === idx ? '9999px' : '50%';
      });
    }

    dotEls.forEach(function (btn) {
      btn.addEventListener('click', function () {
        showSlide(parseInt(this.dataset.i, 10));
        resetHeroTimer();
      });
    });

    function resetHeroTimer() {
      if (heroTimer) clearInterval(heroTimer);
      if (list.length > 1 && !prefersReducedMotion()) {
        heroTimer = setInterval(function () {
          showSlide((heroIndex + 1) % list.length);
        }, 6000);
      }
    }
    resetHeroTimer();
  }

  /* ==========================================================================
     8. Notice Board & Ticker
     ========================================================================== */
  function renderNotices() {
    var list = state.notices;
    var tickerEl = document.getElementById('topTickerNotice');
    var listWrap = document.getElementById('noticeList');

    if (tickerEl && list && list.length > 0) {
      var topNotice = list[0];
      tickerEl.textContent = '📢 ' + topNotice.title + ' • ' + (topNotice.text || 'Admissions open for Nursery to Class 12') + ' • Office: 07162-244732';
    }

    if (!listWrap) return;
    if (!list || !list.length) {
      listWrap.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">No active circulars at this moment.</div>';
      return;
    }

    listWrap.innerHTML = list.map(function (n) {
      var dateRaw = n.date || 'Notice';
      var parts = dateRaw.split('/');
      var day = parts[0] || 'NEW';
      var month = parts[1] ? 'M' + parts[1] : 'INFO';

      return '<div class="live-notice-row">' +
        '<div class="notice-calendar-chip">' +
          '<span class="chip-day">' + esc(day) + '</span>' +
          '<span class="chip-month">' + esc(month) + '</span>' +
        '</div>' +
        '<div class="notice-text-col">' +
          '<h4>' + esc(n.title) + '</h4>' +
          '<p>' + esc(n.text || '') + '</p>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ==========================================================================
     9. Achievements & Hall of Fame
     ========================================================================== */
  function renderAchievements() {
    // 1. Homepage Teaser
    var homeWrap = document.getElementById('homeAchievements');
    if (homeWrap) {
      var preview = state.achievements.slice(0, 3);
      if (!preview.length) {
        homeWrap.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">Recent honors will be posted here.</div>';
      } else {
        homeWrap.innerHTML = preview.map(function (a) {
          var media = a.img
            ? '<img src="' + esc(a.img) + '" alt="' + esc(a.title) + '">'
            : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 9l6-1 3-6z"/></svg>';

          return '<div class="live-ach-row">' +
            '<div class="ach-media-thumb">' + media + '</div>' +
            '<div>' +
              '<span class="ach-meta-tag">' + esc(a.meta || 'Recognition') + '</span>' +
              '<h4 style="font-size:1.05rem;margin:2px 0 4px;">' + esc(a.title) + '</h4>' +
              '<p style="font-size:0.88rem;color:var(--text-muted);margin:0;">' + esc(a.desc || '') + '</p>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }

    // 2. Full Page Grid
    var fullWrap = document.getElementById('achGrid');
    if (fullWrap) {
      if (!state.achievements.length) {
        fullWrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);grid-column:span 3;">No achievements recorded yet.</div>';
      } else {
        fullWrap.innerHTML = state.achievements.map(function (a) {
          var imgSection = a.img
            ? '<div class="honor-photo-box"><img src="' + esc(a.img) + '" alt="' + esc(a.title) + '"></div>'
            : '<div class="honor-photo-box"><div class="honor-icon-placeholder"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 9l6-1 3-6z"/></svg></div></div>';

          return '<div class="honor-card">' +
            imgSection +
            '<div class="honor-body">' +
              '<span class="honor-student-chip">' + esc(a.meta || 'Honor') + '</span>' +
              '<h3>' + esc(a.title) + '</h3>' +
              '<p>' + esc(a.desc || '') + '</p>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }
  }

  /* ==========================================================================
     10. Gallery & Lightbox Modal
     ========================================================================== */
  function renderGallery() {
    var filtersWrap = document.getElementById('galFilters');
    var gridWrap = document.getElementById('galGrid');
    var emptyWrap = document.getElementById('galEmpty');
    if (!gridWrap || !filtersWrap) return;

    var cats = ['All'];
    state.gallery.forEach(function (g) {
      if (g.category && cats.indexOf(g.category) === -1) cats.push(g.category);
    });

    filtersWrap.innerHTML = cats.map(function (c) {
      return '<button data-cat="' + esc(c) + '" class="' + (c === galFilter ? 'active' : '') + '">' + esc(c) + '</button>';
    }).join('');

    filtersWrap.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        galFilter = this.dataset.cat;
        renderGallery();
      });
    });

    var items = galFilter === 'All'
      ? state.gallery
      : state.gallery.filter(function (g) { return g.category === galFilter; });

    if (!items.length) {
      gridWrap.innerHTML = '';
      if (emptyWrap) emptyWrap.style.display = 'block';
      return;
    }
    if (emptyWrap) emptyWrap.style.display = 'none';

    gridWrap.innerHTML = items.map(function (g) {
      var isVideo = g.type === 'video';
      var media = isVideo
        ? '<video src="' + esc(g.src) + '" muted playsinline></video><span class="media-play-pill">▶</span>'
        : '<img src="' + esc(g.src) + '" alt="' + esc(g.caption || '') + '" loading="lazy">';

      return '<div class="gallery-media-item" data-id="' + g.id + '">' +
        media +
        '<div class="media-hover-overlay"><span>' + esc(g.caption || g.category) + '</span></div>' +
      '</div>';
    }).join('');

    gridWrap.querySelectorAll('.gallery-media-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var clicked = items.find(function (g) { return String(g.id) === el.dataset.id; });
        if (clicked) openLightbox(clicked);
      });
    });
  }

  function openLightbox(item) {
    var modal = document.getElementById('lightbox');
    var inner = document.getElementById('lightboxInner');
    if (!modal || !inner) return;

    var media = item.type === 'video'
      ? '<video src="' + esc(item.src) + '" controls autoplay playsinline></video>'
      : '<img src="' + esc(item.src) + '" alt="' + esc(item.caption || '') + '">';

    inner.innerHTML = media + '<div class="lightbox-caption-tag">' + esc(item.caption || item.category || '') + '</div>';
    modal.classList.add('open');
  }

  function closeLightbox() {
    var modal = document.getElementById('lightbox');
    var inner = document.getElementById('lightboxInner');
    if (modal) modal.classList.remove('open');
    if (inner) inner.innerHTML = '';
  }

  var closeBtn = document.getElementById('lightboxClose');
  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  var lbModal = document.getElementById('lightbox');
  if (lbModal) {
    lbModal.addEventListener('click', function (e) {
      if (e.target === this) closeLightbox();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
  });

  /* ==========================================================================
     11. Public Forms (Admissions & Contact)
     ========================================================================== */
  var adForm = document.getElementById('admissionForm');
  if (adForm) {
    adForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('adSubmitBtn');
      if (btn) btn.disabled = true;

      var payload = {
        student: document.getElementById('ad_student').value.trim(),
        cls: document.getElementById('ad_class').value,
        parent: document.getElementById('ad_parent').value.trim(),
        phone: document.getElementById('ad_phone').value.trim(),
        email: document.getElementById('ad_email').value.trim(),
        msg: document.getElementById('ad_msg').value.trim(),
        hp: document.getElementById('ad_hp') ? document.getElementById('ad_hp').value : ''
      };

      api('/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function () {
        adForm.reset();
        var banner = document.getElementById('admissionSuccess');
        if (banner) {
          banner.classList.add('show');
          setTimeout(function () { banner.classList.remove('show'); }, 6000);
        }
      }).catch(function (err) {
        alert('Submission failed: ' + err.message);
      }).finally(function () {
        if (btn) btn.disabled = false;
      });
    });
  }

  var cForm = document.getElementById('contactForm');
  if (cForm) {
    cForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = this.querySelector('button[type=submit]');
      if (btn) btn.disabled = true;

      var payload = {
        name: document.getElementById('c_name').value.trim(),
        phone: document.getElementById('c_phone').value.trim(),
        email: document.getElementById('c_email').value.trim(),
        msg: document.getElementById('c_msg').value.trim(),
        hp: document.getElementById('c_hp') ? document.getElementById('c_hp').value : ''
      };

      api('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function () {
        cForm.reset();
        var banner = document.getElementById('contactSuccess');
        if (banner) {
          banner.classList.add('show');
          setTimeout(function () { banner.classList.remove('show'); }, 6000);
        }
      }).catch(function (err) {
        alert('Message failed: ' + err.message);
      }).finally(function () {
        if (btn) btn.disabled = false;
      });
    });
  }

  /* ==========================================================================
     12. Admin Console & Dashboard
     ========================================================================== */
  function checkAdminSession() {
    api('/me').then(function (data) {
      if (data.loggedIn) showAdminApp(); else showAdminLogin();
    }).catch(function () { showAdminLogin(); });
  }

  function showAdminLogin() {
    var l = document.getElementById('adminLoginView');
    var a = document.getElementById('adminAppView');
    if (l) l.style.display = 'block';
    if (a) a.style.display = 'none';
  }

  function showAdminApp() {
    var l = document.getElementById('adminLoginView');
    var a = document.getElementById('adminAppView');
    if (l) l.style.display = 'none';
    if (a) a.style.display = 'block';
    loadAllData(true);
  }

  var lgForm = document.getElementById('loginForm');
  if (lgForm) {
    lgForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var errBox = document.getElementById('loginError');
      if (errBox) errBox.classList.remove('show');

      api('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: document.getElementById('lg_user').value.trim(),
          password: document.getElementById('lg_pass').value
        })
      }).then(function () {
        lgForm.reset();
        showAdminApp();
      }).catch(function (err) {
        if (errBox) {
          errBox.textContent = err.message;
          errBox.classList.add('show');
        }
      });
    });
  }

  var lgOut = document.getElementById('logoutBtn');
  if (lgOut) {
    lgOut.addEventListener('click', function () {
      api('/logout', { method: 'POST' }).finally(function () { showAdminLogin(); });
    });
  }

  var adTabs = document.getElementById('adminTabs');
  if (adTabs) {
    adTabs.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-tab]');
      if (!btn) return;
      adTabs.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var tab = btn.dataset.tab;
      document.querySelectorAll('.dash-pane').forEach(function (pane) {
        pane.classList.toggle('active', pane.dataset.panel === tab);
      });
    });
  }

  function flashAdmin(id, msg, isOk) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-msg show ' + (isOk ? 'ok' : 'err');
    setTimeout(function () { el.classList.remove('show'); }, 4000);
  }

  // Admin CRUD Functions
  function renderAdminNotices() {
    var wrap = document.getElementById('noticeAdminList');
    if (!wrap) return;
    if (!state.notices.length) {
      wrap.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">No published circulars.</div>';
      return;
    }
    wrap.innerHTML = state.notices.map(function (n) {
      return '<div class="admin-entry-item">' +
        '<div class="entry-meta"><strong>' + esc(n.title) + '</strong><span>' + esc(n.text || '') + ' (' + esc(n.date || '') + ')</span></div>' +
        '<button class="btn-delete-chip" data-del-notice="' + n.id + '">Delete</button>' +
      '</div>';
    }).join('');

    wrap.querySelectorAll('[data-del-notice]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('Delete this circular?')) return;
        api('/notices/' + this.dataset.delNotice, { method: 'DELETE' }).then(function () { loadAllData(true); });
      });
    });
  }

  var nAddBtn = document.getElementById('noticeAddBtn');
  if (nAddBtn) {
    nAddBtn.addEventListener('click', function () {
      var t = document.getElementById('noticeTitle');
      var b = document.getElementById('noticeText');
      if (!t.value.trim()) { flashAdmin('noticeStatus', 'Title is required.', false); return; }
      api('/notices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t.value.trim(), text: b.value.trim() })
      }).then(function () {
        flashAdmin('noticeStatus', 'Notice published successfully.', true);
        t.value = ''; b.value = ''; loadAllData(true);
      }).catch(function (err) { flashAdmin('noticeStatus', err.message, false); });
    });
  }

  function renderAdminBanners() {
    var wrap = document.getElementById('bannerList');
    if (!wrap) return;
    if (!state.banners.length) {
      wrap.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">No banner slides.</div>';
      return;
    }
    wrap.innerHTML = state.banners.map(function (b) {
      return '<div class="admin-entry-item">' +
        '<img class="thumb" src="' + esc(b.img) + '">' +
        '<div class="entry-meta"><strong>' + esc(b.caption || 'Hero Slide') + '</strong><span>' + esc(b.img) + '</span></div>' +
        '<button class="btn-delete-chip" data-del-ban="' + b.id + '">Delete</button>' +
      '</div>';
    }).join('');

    wrap.querySelectorAll('[data-del-ban]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Delete this banner slide?')) return;
        api('/banners/' + this.dataset.delBan, { method: 'DELETE' }).then(function () { loadAllData(true); });
      });
    });
  }

  var bUploadBtn = document.getElementById('bannerUploadBtn');
  if (bUploadBtn) {
    bUploadBtn.addEventListener('click', function () {
      var fileEl = document.getElementById('bannerFile');
      var capEl = document.getElementById('bannerCaption');
      if (!fileEl.files[0]) { flashAdmin('bannerStatus', 'Select an image first.', false); return; }
      var fd = new FormData();
      fd.append('file', fileEl.files[0]);
      fd.append('caption', capEl.value.trim());
      apiForm('/banners', 'POST', fd).then(function () {
        flashAdmin('bannerStatus', 'Banner uploaded.', true);
        fileEl.value = ''; capEl.value = ''; loadAllData(true);
      }).catch(function (err) { flashAdmin('bannerStatus', err.message, false); });
    });
  }

  function renderAdminGallery() {
    var wrap = document.getElementById('galAdminList');
    if (!wrap) return;
    if (!state.gallery.length) {
      wrap.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">No gallery items.</div>';
      return;
    }
    wrap.innerHTML = state.gallery.map(function (g) {
      var thumb = g.type === 'video'
        ? '<div class="thumb" style="display:flex;align-items:center;justify-content:center;color:var(--gold-accent);background:#0C2340;">▶</div>'
        : '<img class="thumb" src="' + esc(g.src) + '">';

      return '<div class="admin-entry-item">' +
        thumb +
        '<div class="entry-meta"><strong>' + esc(g.caption || g.category) + '</strong><span>' + esc(g.category) + ' (' + esc(g.type) + ')</span></div>' +
        '<button class="btn-delete-chip" data-del-g="' + g.id + '">Delete</button>' +
      '</div>';
    }).join('');

    wrap.querySelectorAll('[data-del-g]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Remove this media item?')) return;
        api('/gallery/' + this.dataset.delG, { method: 'DELETE' }).then(function () { loadAllData(true); });
      });
    });
  }

  var gUploadBtn = document.getElementById('galUploadBtn');
  if (gUploadBtn) {
    gUploadBtn.addEventListener('click', function () {
      var fileEl = document.getElementById('galFile');
      var catEl = document.getElementById('galCategorySelect');
      var capEl = document.getElementById('galCaption');
      if (!fileEl.files[0]) { flashAdmin('galStatus', 'Select an image or video file.', false); return; }
      var fd = new FormData();
      fd.append('file', fileEl.files[0]);
      fd.append('category', catEl.value);
      fd.append('caption', capEl.value.trim());
      apiForm('/gallery', 'POST', fd).then(function () {
        flashAdmin('galStatus', 'Added to gallery.', true);
        fileEl.value = ''; capEl.value = ''; loadAllData(true);
      }).catch(function (err) { flashAdmin('galStatus', err.message, false); });
    });
  }

  function renderAdminAchievements() {
    var wrap = document.getElementById('achAdminList');
    if (!wrap) return;
    if (!state.achievements.length) {
      wrap.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">No achievements recorded.</div>';
      return;
    }
    wrap.innerHTML = state.achievements.map(function (a) {
      var thumb = a.img
        ? '<img class="thumb" src="' + esc(a.img) + '">'
        : '<div class="thumb" style="display:flex;align-items:center;justify-content:center;color:var(--gold-deep);background:var(--gold-soft);">🏆</div>';

      return '<div class="admin-entry-item">' +
        thumb +
        '<div class="entry-meta"><strong>' + esc(a.title) + '</strong><span>' + esc(a.meta || '') + '</span></div>' +
        '<button class="btn-delete-chip" data-del-a="' + a.id + '">Delete</button>' +
      '</div>';
    }).join('');

    wrap.querySelectorAll('[data-del-a]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Delete this achievement?')) return;
        api('/achievements/' + this.dataset.delA, { method: 'DELETE' }).then(function () { loadAllData(true); });
      });
    });
  }

  var aUploadBtn = document.getElementById('achUploadBtn');
  if (aUploadBtn) {
    aUploadBtn.addEventListener('click', function () {
      var t = document.getElementById('achTitle').value.trim();
      if (!t) { flashAdmin('achStatus', 'Title is required.', false); return; }
      var fd = new FormData();
      fd.append('title', t);
      fd.append('meta', document.getElementById('achMeta').value.trim());
      fd.append('description', document.getElementById('achDesc').value.trim());
      var f = document.getElementById('achFile');
      if (f && f.files[0]) fd.append('file', f.files[0]);

      apiForm('/achievements', 'POST', fd).then(function () {
        flashAdmin('achStatus', 'Achievement saved.', true);
        document.getElementById('achTitle').value = '';
        document.getElementById('achMeta').value = '';
        document.getElementById('achDesc').value = '';
        if (f) f.value = '';
        loadAllData(true);
      }).catch(function (err) { flashAdmin('achStatus', err.message, false); });
    });
  }

  function renderAdminInquiries(admissions, messages) {
    var adWrap = document.getElementById('admissionAdminList');
    if (adWrap) {
      if (!admissions || !admissions.length) {
        adWrap.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">No admission enquiries.</div>';
      } else {
        adWrap.innerHTML = admissions.map(function (item) {
          return '<div class="admin-entry-item">' +
            '<div class="entry-meta"><strong>' + esc(item.student) + ' (Class: ' + esc(item.class_applied || 'N/A') + ')</strong>' +
            '<span>Parent: ' + esc(item.parent) + ' • Phone: ' + esc(item.phone) + (item.email ? ' • ' + esc(item.email) : '') + '</span>' +
            '<p style="font-size:0.85rem;color:var(--text-body);margin-top:4px;">' + esc(item.message || 'No note') + '</p>' +
            '<span style="font-size:0.75rem;color:var(--text-muted);">' + esc(item.created_at) + '</span></div>' +
          '</div>';
        }).join('');
      }
    }

    var msgWrap = document.getElementById('messageAdminList');
    if (msgWrap) {
      if (!messages || !messages.length) {
        msgWrap.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">No contact messages.</div>';
      } else {
        msgWrap.innerHTML = messages.map(function (m) {
          return '<div class="admin-entry-item">' +
            '<div class="entry-meta"><strong>' + esc(m.name) + ' (' + esc(m.phone) + ')</strong>' +
            '<span>' + (m.email ? 'Email: ' + esc(m.email) + ' • ' : '') + esc(m.message) + '</span>' +
            '<span style="font-size:0.75rem;color:var(--text-muted);display:block;margin-top:4px;">' + esc(m.created_at) + '</span></div>' +
          '</div>';
        }).join('');
      }
    }
  }

  /* ==========================================================================
     13. Data Hydration & Boot
     ========================================================================== */
  function loadAllData(includeAdmin) {
    return api('/public/all').then(function (data) {
      state.banners = data.banners || [];
      state.gallery = data.gallery || [];
      state.achievements = data.achievements || [];
      state.notices = data.notices || [];

      renderHeroSlider();
      renderNotices();
      renderAchievements();
      renderGallery();

      if (includeAdmin) {
        renderAdminNotices();
        renderAdminBanners();
        renderAdminGallery();
        renderAdminAchievements();

        return Promise.all([api('/admissions'), api('/messages')]).then(function (res) {
          renderAdminInquiries(res[0], res[1]);
        }).catch(function (e) { console.warn('Admin inquiries:', e); });
      }
    }).catch(function (err) {
      console.warn('Public API hydration fallback:', err);
    });
  }

  
  /* ==========================================================================
     Category 2 & 3: Interactive Hotspot Map, Topper Filters & Leaderboard
     ========================================================================== */

  // 1. Campus Hotspot Map Data & Controller
  var hotspotData = {
    robotics: {
      photo: 'img/facility-robotics.jpg',
      tag: 'Upper Technology Wing',
      title: 'Robotics, STEM & AI Innovation Lab',
      desc: 'Our flagship innovation workspace featuring 30+ dedicated Python and microcomputer workstations, Arduino boards, and sensors. Students develop problem-solving skills through hands-on prototype engineering.',
      specs: ['30+ Workstations', 'Python & C++', 'Sensors & IoT', 'Microcontrollers']
    },
    classrooms: {
      photo: 'img/facility-smartclass.jpg',
      tag: 'Central Academic Block',
      title: 'Smart Interactive Classrooms',
      desc: 'Digital touch-screen smart boards in every section equipped with comprehensive CBSE curriculum modules. Enables interactive quizzes, 3D anatomical/mathematical visualizations, and multimedia lectures.',
      specs: ['75-inch 4K Displays', 'E-Learning Suite', 'Ergonomic Desks', 'Acoustic Balancing']
    },
    science: {
      photo: 'img/facility-science.jpg',
      tag: 'West Science Wing',
      title: 'Composite Science Laboratories',
      desc: 'Dedicated practical experimental bays for Physics, Chemistry, and Biology. Built with state-of-the-art optical microscopes, fume exhausts, safety eye-wash stations, and precision instruments.',
      specs: ['Physics Station', 'Chemistry Lab', 'Biology Optics', 'CBSE Standardized']
    },
    sports: {
      photo: 'img/facility-sports.jpg',
      tag: 'Campus Front Grounds',
      title: 'Athletics & Sports Complex',
      desc: 'Expansive open ground and turf designed for inter-house football, cricket coaching nets, volleyball, track sprint lanes, and daily physical education under certified athletic trainers.',
      specs: ['Full-size Turf', 'Cricket Nets', 'Volleyball Court', 'Yoga Conditioning']
    },
    library: {
      photo: 'img/facility-library.jpg',
      tag: 'East Tranquil Wing',
      title: 'Literary Library & Resource Center',
      desc: 'A quiet reading hall containing over 5,000 volumes, CBSE reference guides, historical encyclopedias, national daily newspapers, and student-published literary anthologies.',
      specs: ['5,000+ Titles', 'Reading Hall', 'Competitive Exam Shelf', 'Periodical Corner']
    }
  };

  function renderHotspot(key) {
    var data = hotspotData[key] || hotspotData.robotics;
    var container = document.getElementById('hotspotDetailCard');
    if (!container) return;

    container.style.opacity = '0';
    setTimeout(function () {
      container.innerHTML = [
        '<img src="' + esc(data.photo) + '" alt="' + esc(data.title) + '" class="spot-detail-photo">',
        '<span class="spot-detail-tag">' + esc(data.tag) + '</span>',
        '<h3>' + esc(data.title) + '</h3>',
        '<p>' + esc(data.desc) + '</p>',
        '<div class="spot-spec-list">',
        data.specs.map(function (s) { return '<span>' + esc(s) + '</span>'; }).join(''),
        '</div>'
      ].join('');
      container.style.opacity = '1';
    }, 120);
  }

  function initCampusHotspots() {
    var pins = document.querySelectorAll('.map-hotspot-pin');
    if (!pins.length) return;

    renderHotspot('robotics');

    pins.forEach(function (pin) {
      pin.addEventListener('click', function () {
        pins.forEach(function (p) { p.classList.remove('active'); });
        this.classList.add('active');
        renderHotspot(this.dataset.spot);
      });
    });
  }

  // 2. Toppers Wall of Fame Interactive Filter
  function initTopperFilters() {
    var filterWrap = document.getElementById('topperFilterTabs');
    var cards = document.querySelectorAll('.topper-honor-card');
    if (!filterWrap || !cards.length) return;

    filterWrap.querySelectorAll('.topper-tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterWrap.querySelectorAll('.topper-tab-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');

        var filter = this.dataset.filter;
        cards.forEach(function (card) {
          if (filter === 'all' || card.dataset.category === filter) {
            card.style.display = 'flex';
            setTimeout(function () { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }, 50);
          } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(10px)';
            setTimeout(function () { card.style.display = 'none'; }, 200);
          }
        });
      });
    });
  }


  // Boot sequence
  document.addEventListener('DOMContentLoaded', function () {
    if (window._appInitialized) return;
    window._appInitialized = true;
    initIntroSplash();
    initPillNav();
    initCardTilts();
    initScrollReveals();
    initCampusHotspots();
    initTopperFilters();
    initCounters();
    initStageExplorer();

    loadAllData(false).then(function () {
      routeFromHash();
    }).catch(function () {
      routeFromHash();
    });
  });

  // If DOM is already ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (!window._appInitialized) {
      window._appInitialized = true;
        initIntroSplash();
    initPillNav();
    initCardTilts();
    initScrollReveals();
    initCampusHotspots();
    initTopperFilters();
    initCounters();
    initStageExplorer();
    loadAllData(false).then(routeFromHash).catch(routeFromHash);
  } } })();

  /* ==========================================================================
     New Scroll-Triggered Parallax Animation (GSAP)
     ========================================================================== */
  function initParallaxBackground() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    
    gsap.to('.shape-1', {
      y: 300,
      x: 100,
      rotation: 45,
      ease: 'none',
      scrollTrigger: {
        trigger: '.cinematic-hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: 1
      }
    });

    gsap.to('.shape-2', {
      y: -250,
      x: -150,
      scale: 1.2,
      ease: 'none',
      scrollTrigger: {
        trigger: '.cinematic-hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5
      }
    });

    gsap.to('.shape-3', {
      y: 200,
      x: -200,
      rotation: -30,
      ease: 'none',
      scrollTrigger: {
        trigger: '.cinematic-hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: 2
      }
    });
  }
  
  // Call it on load
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initParallaxBackground, 500);
  });






  /* ==========================================================================
     Advanced Animations (Magnetic Buttons, Text Reveals, Counters)
     ========================================================================== */
  function initMagneticButtons() {
    var magnets = document.querySelectorAll('.btn-gold, .btn-primary, .btn-outline, .pill-action-btn, .btn');
    magnets.forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        if(typeof gsap !== 'undefined') {
          gsap.to(btn, {
            duration: 0.3,
            x: x * 0.4,
            y: y * 0.4,
            ease: 'power2.out'
          });
        }
      });
      btn.addEventListener('mouseleave', function () {
        if(typeof gsap !== 'undefined') {
          gsap.to(btn, {
            duration: 0.5,
            x: 0,
            y: 0,
            ease: 'elastic.out(1, 0.3)'
          });
        }
      });
    });
  }

  function initStaggeredTextReveals() {
    if(typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    var headings = document.querySelectorAll('.hero-glamour-title, .section-header h2, .board-main-title');
    headings.forEach(function (heading) {
      if(heading.querySelector('.glow-gold-text')) return; // skip if complex html inside
      var text = heading.innerText;
      var words = text.split(' ');
      heading.innerHTML = '';
      words.forEach(function (w) {
        var span = document.createElement('span');
        span.innerText = w + ' ';
        span.style.display = 'inline-block';
        heading.appendChild(span);
      });
      gsap.from(heading.querySelectorAll('span'), {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: heading,
          start: 'top 85%'
        }
      });
    });
  }

  // Attach new animations
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      initMagneticButtons();
      initStaggeredTextReveals();
    }, 800);
  });
