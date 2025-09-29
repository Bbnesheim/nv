(() => {
  const registry = new WeakMap();

  class StickySlides {
    constructor(section) {
      this.section = section;
      this.items = Array.from(section.querySelectorAll('[data-sticky-item]'));
      this.visualContainer = section.querySelector('.nv-sticky-slides__visual');
      this.mediaTarget = section.querySelector('.nv-sticky-slides__visual-media');
      this.activeIndex = -1;
      this.activeMedia = null;
      this.observer = null;
      this.motionQuery = null;
      this.prefersReducedMotion = false;

      if (!this.items.length || !this.mediaTarget) {
        this.initialized = false;
        return;
      }

      if ('matchMedia' in window) {
        this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.prefersReducedMotion = this.motionQuery.matches;
        this.handleMotionChange = (event) => {
          this.prefersReducedMotion = event.matches;
          if (this.activeMedia instanceof HTMLVideoElement) {
            this.updateVideoPlayback(this.activeMedia);
          }
        };
        if (typeof this.motionQuery.addEventListener === 'function') {
          this.motionQuery.addEventListener('change', this.handleMotionChange);
        } else if (typeof this.motionQuery.addListener === 'function') {
          this.motionQuery.addListener(this.handleMotionChange);
        }
      }

      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(this.handleIntersections.bind(this), {
          threshold: 0.5,
        });
        this.items.forEach((item) => this.observer.observe(item));
      }

      this.setActiveIndex(0);
      this.initialized = true;
    }

    handleIntersections(entries) {
      let candidate = null;
      let maxRatio = 0.5;

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= maxRatio) {
          candidate = entry.target;
          maxRatio = entry.intersectionRatio;
        }
      });

      if (candidate) {
        const index = this.items.indexOf(candidate);
        if (index !== -1) {
          this.setActiveIndex(index);
        }
      }
    }

    setActiveIndex(index) {
      if (index < 0 || index >= this.items.length || index === this.activeIndex) {
        return;
      }

      const previousItem = this.items[this.activeIndex];
      if (previousItem) {
        previousItem.classList.remove('is-active');
        this.pauseMedia(previousItem);
      }

      this.cleanupMedia();

      const nextItem = this.items[index];
      nextItem.classList.add('is-active');

      this.renderMedia(nextItem);

      this.activeIndex = index;
      this.preloadNext(index);
    }

    renderMedia(item) {
      if (!item) return;

      const bg = (item.dataset.bg || '').trim();
      if (this.visualContainer) {
        if (bg) {
          this.visualContainer.style.backgroundColor = bg;
        } else {
          this.visualContainer.style.removeProperty('background-color');
        }
      }

      const videoSrc = (item.dataset.video || '').trim();
      if (videoSrc) {
        const video = this.createVideo(item, videoSrc);
        if (video) {
          this.mediaTarget.innerHTML = '';
          this.mediaTarget.appendChild(video);
          this.activeMedia = video;
          this.updateVideoPlayback(video);
        }
        return;
      }

      const image = item.querySelector('[data-slide-image]');
      if (!image) {
        this.mediaTarget.innerHTML = '';
        this.activeMedia = null;
        return;
      }

      const clone = image.cloneNode(true);
      clone.removeAttribute('data-slide-image');
      clone.removeAttribute('hidden');
      clone.hidden = false;
      clone.loading = 'eager';
      this.mediaTarget.innerHTML = '';
      this.mediaTarget.appendChild(clone);
      this.activeMedia = clone;
    }

    createVideo(item, src) {
      let video = item._nvStickyVideo;
      if (!video) {
        video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.setAttribute('loop', '');
        video.playsInline = true;
        video.muted = true;
        video.loop = true;
        video.preload = 'metadata';
        video.setAttribute('aria-hidden', 'true');
        video.tabIndex = -1;
        item._nvStickyVideo = video;
      }

      if (video.src !== src) {
        video.src = src;
        video.load();
      }

      return video;
    }

    updateVideoPlayback(video) {
      if (!(video instanceof HTMLVideoElement)) return;

      if (this.prefersReducedMotion) {
        video.pause();
        video.removeAttribute('autoplay');
        video.currentTime = 0;
        return;
      }

      video.setAttribute('autoplay', '');
      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch(() => {});
      }
    }

    pauseMedia(item) {
      if (!item || !item._nvStickyVideo) return;
      const video = item._nvStickyVideo;
      if (video instanceof HTMLVideoElement) {
        video.pause();
        video.removeAttribute('autoplay');
      }
    }

    cleanupMedia() {
      if (this.mediaTarget) {
        this.mediaTarget.innerHTML = '';
      }
      this.activeMedia = null;
    }

    preloadNext(index) {
      const nextItem = this.items[index + 1];
      if (!nextItem) return;

      if (nextItem._nvStickyPreloaded) return;

      const nextVideo = (nextItem.dataset.video || '').trim();
      if (nextVideo) {
        const video = document.createElement('video');
        video.src = nextVideo;
        video.preload = 'auto';
        nextItem._nvStickyPreloadVideo = video;
        nextItem._nvStickyPreloaded = true;
        return;
      }

      const image = nextItem.querySelector('[data-slide-image]');
      if (image) {
        const src = image.currentSrc || image.src;
        if (src) {
          const preload = new Image();
          preload.src = src;
          nextItem._nvStickyPreloadImage = preload;
        }
      }

      nextItem._nvStickyPreloaded = true;
    }

    activateByBlockId(blockId, scrollIntoView = false) {
      if (!blockId) return;
      const index = this.items.findIndex((item) => item.id === blockId || item.dataset.blockId === blockId);
      if (index === -1) return;

      if (scrollIntoView) {
        this.items[index].scrollIntoView({
          behavior: this.prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }

      this.setActiveIndex(index);
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
      }

      if (this.motionQuery) {
        if (typeof this.motionQuery.removeEventListener === 'function' && this.handleMotionChange) {
          this.motionQuery.removeEventListener('change', this.handleMotionChange);
        } else if (typeof this.motionQuery.removeListener === 'function' && this.handleMotionChange) {
          this.motionQuery.removeListener(this.handleMotionChange);
        }
      }

      this.items.forEach((item) => this.pauseMedia(item));
      this.cleanupMedia();
      this.initialized = false;
    }
  }

  function initSections(root = document) {
    const sections = root.querySelectorAll('.nv-sticky-slides');
    sections.forEach((section) => {
      if (registry.has(section)) return;
      const instance = new StickySlides(section);
      if (instance.initialized) {
        registry.set(section, instance);
      }
    });
  }

  function destroySectionById(sectionId) {
    if (!sectionId) return;
    const section = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (!section) return;
    const instance = registry.get(section);
    if (!instance) return;
    instance.destroy();
    registry.delete(section);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initSections());
  } else {
    initSections();
  }

  document.addEventListener('shopify:section:load', (event) => {
    initSections(event.target || document);
  });

  document.addEventListener('shopify:section:unload', (event) => {
    const sectionId = event.detail && event.detail.sectionId;
    destroySectionById(sectionId);
  });

  document.addEventListener('shopify:block:select', (event) => {
    const detail = event.detail || {};
    const section = detail.sectionId ? document.querySelector(`[data-section-id="${detail.sectionId}"]`) : null;
    if (!section) return;
    const instance = registry.get(section);
    if (!instance) return;
    const blockId = detail.blockId;
    if (!blockId) return;
    instance.activateByBlockId(blockId, true);
  });

  document.addEventListener('shopify:block:deselect', (event) => {
    const detail = event.detail || {};
    const section = detail.sectionId ? document.querySelector(`[data-section-id="${detail.sectionId}"]`) : null;
    if (!section) return;
    const instance = registry.get(section);
    if (!instance) return;
    const blockId = detail.blockId;
    if (!blockId) return;
    instance.activateByBlockId(blockId);
  });

  document.addEventListener('DOMContentLoaded', function () {
    var section = document.querySelector('.nv-sticky-slides');
    if (!section) return;

    var items = Array.from(section.querySelectorAll('.nv-sticky-slides__item'));
    var visuals = Array.from(section.querySelectorAll('.nv-sticky-slides__visual'));

    if (!items.length || !visuals.length) return;

    function activateSlide(idx) {
      items.forEach((item, i) => {
        item.classList.toggle('is-active', i === idx);
      });
      visuals.forEach((visual, i) => {
        visual.classList.toggle('is-visible', i === idx);
      });
    }

    // IntersectionObserver for sticky text
    if ('IntersectionObserver' in window) {
      var observer = new window.IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            var idx = items.indexOf(entry.target);
            if (idx !== -1) activateSlide(idx);
          }
        });
      }, {
        root: null,
        rootMargin: '0px 0px -60% 0px',
        threshold: 0.5
      });

      items.forEach(item => observer.observe(item));
    } else {
      // Fallback: scroll handler
      window.addEventListener('scroll', function () {
        var scrollY = window.scrollY || window.pageYOffset;
        var foundIdx = 0;
        items.forEach((item, i) => {
          var rect = item.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.5) foundIdx = i;
        });
        activateSlide(foundIdx);
      });
    }
  });
})();
