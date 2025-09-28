(function () {
  const SECTION_SELECTOR = '[data-section-type="about-sticky-slides"]';

  class AboutStickySlides {
    constructor(section) {
      this.section = section;
      this.list = section.querySelector('[data-slide-list]');
      this.items = Array.from(section.querySelectorAll('[data-slide-item]'));
      this.mediaHost = section.querySelector('[data-slide-media]');
      this.currentItem = null;
      this.currentMedia = null;
      this.motionQuery = typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

      if (!this.list || !this.items.length || !this.mediaHost) {
        return;
      }

      this.onMotionChange = this.onMotionChange.bind(this);
      this.onIntersect = this.onIntersect.bind(this);

      this.initMotionListener();

      if (typeof window.IntersectionObserver !== 'function') {
        this.activateItem(this.items[0]);
        return;
      }

      this.initObserver();
      this.observeItems();
      this.activateItem(this.items[0]);
    }

    initObserver() {
      this.observer = new IntersectionObserver(this.onIntersect, {
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '0px 0px -35% 0px'
      });
    }

    observeItems() {
      this.items.forEach((item) => this.observer.observe(item));
    }

    onIntersect(entries) {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visible.length) {
        this.activateItem(visible[0].target);
        return;
      }

      entries.forEach((entry) => {
        if (entry.target === this.currentItem && entry.intersectionRatio === 0) {
          const fallback = this.findClosestItem();
          if (fallback) {
            this.activateItem(fallback);
          }
        }
      });
    }

    findClosestItem() {
      if (!this.items.length) return null;

      const bounds = this.items.map((item) => {
        const rect = item.getBoundingClientRect();
        return {
          item,
          distance: Math.abs(rect.top + rect.height / 2)
        };
      });

      bounds.sort((a, b) => a.distance - b.distance);
      return bounds[0]?.item ?? null;
    }

    activateItem(item) {
      if (!item || item === this.currentItem) {
        return;
      }

      if (this.currentItem) {
        this.currentItem.classList.remove('is-active');
      }

      if (this.currentMedia && this.currentMedia.tagName === 'VIDEO') {
        this.currentMedia.pause();
      }

      this.currentItem = item;
      this.currentItem.classList.add('is-active');

      const bg = item.dataset.bg || '';
      if (bg) {
        this.mediaHost.style.backgroundColor = bg;
      } else {
        this.mediaHost.style.removeProperty('background-color');
      }

      const media = this.createMediaForItem(item);
      this.currentMedia = media || null;

      this.swapMedia(media);
    }

    createMediaForItem(item) {
      const videoSrc = item.dataset.video;
      if (videoSrc) {
        const video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.setAttribute('loop', '');
        video.playsInline = true;
        video.muted = true;
        video.loop = true;
        video.preload = 'metadata';
        video.src = videoSrc;
        video.classList.add('about-sticky-slides__video');

        const posterImage = item.querySelector('[data-slide-image]');
        if (posterImage && posterImage.getAttribute('src')) {
          video.poster = posterImage.getAttribute('src');
        }

        if (this.motionQuery && this.motionQuery.matches) {
          video.autoplay = false;
          video.pause();
        } else {
          video.autoplay = true;
        }

        return video;
      }

      const sourceImage = item.querySelector('[data-slide-image]');
      if (sourceImage) {
        const image = sourceImage.cloneNode(true);
        image.hidden = false;
        image.removeAttribute('hidden');
        image.removeAttribute('data-slide-image');
        image.loading = 'lazy';
        image.decoding = 'async';
        image.classList.add('about-sticky-slides__image');
        return image;
      }

      return null;
    }

    swapMedia(media) {
      while (this.mediaHost.firstChild) {
        const child = this.mediaHost.firstChild;
        if (child.tagName === 'VIDEO') {
          child.pause();
        }
        this.mediaHost.removeChild(child);
      }

      if (!media) {
        return;
      }

      this.mediaHost.appendChild(media);

      requestAnimationFrame(() => {
        media.classList.add('is-visible');
        if (media.tagName === 'VIDEO') {
          media.currentTime = 0;
          if (!(this.motionQuery && this.motionQuery.matches)) {
            const playPromise = media.play();
            if (playPromise && typeof playPromise.then === 'function') {
              playPromise.catch(() => {});
            }
          }
        }
      });
    }

    scrollToItem(item) {
      if (!item) {
        return;
      }

      const behavior = this.motionQuery && this.motionQuery.matches ? 'auto' : 'smooth';
      try {
        item.scrollIntoView({ block: 'center', behavior });
      } catch (error) {
        item.scrollIntoView();
      }
    }

    initMotionListener() {
      if (!this.motionQuery) {
        return;
      }

      if (typeof this.motionQuery.addEventListener === 'function') {
        this.motionQuery.addEventListener('change', this.onMotionChange);
      } else if (typeof this.motionQuery.addListener === 'function') {
        this.motionQuery.addListener(this.onMotionChange);
      }
    }

    removeMotionListener() {
      if (!this.motionQuery) {
        return;
      }

      if (typeof this.motionQuery.removeEventListener === 'function') {
        this.motionQuery.removeEventListener('change', this.onMotionChange);
      } else if (typeof this.motionQuery.removeListener === 'function') {
        this.motionQuery.removeListener(this.onMotionChange);
      }
    }

    onMotionChange(event) {
      if (event.matches && this.currentMedia && this.currentMedia.tagName === 'VIDEO') {
        this.currentMedia.pause();
      } else if (!event.matches && this.currentMedia && this.currentMedia.tagName === 'VIDEO') {
        const playPromise = this.currentMedia.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch(() => {});
        }
      }
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
      }

      this.removeMotionListener();

      if (this.currentMedia && this.currentMedia.tagName === 'VIDEO') {
        this.currentMedia.pause();
      }
    }
  }

  const instances = new WeakMap();

  function initSection(section) {
    if (!section || instances.has(section)) {
      return;
    }

    const instance = new AboutStickySlides(section);
    if (instance.items && instance.items.length) {
      instances.set(section, instance);
    }
  }

  function destroySection(section) {
    const instance = instances.get(section);
    if (instance) {
      instance.destroy();
      instances.delete(section);
    }
  }

  function initAll(root = document) {
    root
      .querySelectorAll(SECTION_SELECTOR)
      .forEach((section) => initSection(section));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll());
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', (event) => {
    if (event.target.matches(SECTION_SELECTOR)) {
      initSection(event.target);
    }
  });

  document.addEventListener('shopify:section:unload', (event) => {
    if (event.target.matches(SECTION_SELECTOR)) {
      destroySection(event.target);
    }
  });

  document.addEventListener('shopify:block:select', (event) => {
    const section = event.target.closest(SECTION_SELECTOR);
    if (!section) {
      return;
    }

    const instance = instances.get(section);
    if (!instance) {
      return;
    }

    const item = event.target.closest('[data-slide-item]');
    if (item) {
      instance.scrollToItem(item);
      instance.activateItem(item);
    }
  });
})();
