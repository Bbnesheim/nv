class AboutStickySlides {
  constructor(section) {
    this.section = section;
    this.sectionId = section.dataset.sectionId || section.id;
    this.items = Array.from(section.querySelectorAll('[data-sticky-item]'));
    this.visualContainer = section.querySelector('[data-sticky-visual]');
    this.mediaTarget = section.querySelector('[data-sticky-visual-target]');
    this.visualSurface = this.mediaTarget ? this.mediaTarget.parentElement : null;
    this.nav = section.querySelector('[data-sticky-nav]');
    this.navLinks = this.nav ? Array.from(this.nav.querySelectorAll('[data-sticky-nav-link]')) : [];
    this.activeItem = null;
    this.activeMedia = null;

    if (!this.items.length || !this.mediaTarget) {
      return;
    }

    this.motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    this.prefersReducedMotion = !!(this.motionQuery && this.motionQuery.matches);
    this.motionListener = () => {
      this.prefersReducedMotion = !!(this.motionQuery && this.motionQuery.matches);
      if (this.activeMedia instanceof HTMLVideoElement) {
        this.updateVideoPlayback(this.activeMedia);
      }
    };

    if (this.motionQuery) {
      if (this.motionQuery.addEventListener) {
        this.motionQuery.addEventListener('change', this.motionListener);
      } else if (this.motionQuery.addListener) {
        this.motionQuery.addListener(this.motionListener);
      }
    }

    if (typeof window.IntersectionObserver !== 'function') {
      this.activateItem(this.items[0]);
      return;
    }

    this.handleIntersections = this.handleIntersections.bind(this);
    this.observer = new IntersectionObserver(this.handleIntersections, {
      threshold: 0.5,
      rootMargin: '0px 0px -35% 0px',
    });

    this.items.forEach((item) => {
      this.observer.observe(item);
    });

    if (this.nav && this.navLinks.length) {
      this.handleNavClick = this.handleNavClick.bind(this);
      this.nav.addEventListener('click', this.handleNavClick);
    }

    // Activate the first item immediately so an initial visual is rendered.
    this.activateItem(this.items[0]);
  }

  handleIntersections(entries) {
    entries.forEach((entry) => {
      const { target } = entry;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        this.activateItem(target);
        return;
      }

      if (!entry.isIntersecting && this.activeItem === target) {
        this.pauseItemMedia(target);
        target.classList.remove('is-active');
        this.activeMedia = null;
        this.activeItem = null;
        this.updateNavState(null);
        return;
      }

      if (!entry.isIntersecting) {
        target.classList.remove('is-active');
      }
    });
  }

  activateItem(item) {
    if (!item || this.activeItem === item) {
      return;
    }

    if (this.activeItem && this.activeItem !== item) {
      this.pauseItemMedia(this.activeItem);
      this.activeItem.classList.remove('is-active');
    }

    this.activeItem = item;
    this.activeItem.classList.add('is-active');
    this.swapVisualForItem(item);
    this.updateNavState(item.dataset.blockId);
  }

  handleNavClick(event) {
    if (!this.navLinks.length) return;
    const link = event.target.closest('[data-sticky-nav-link]');
    if (!link || !this.nav.contains(link)) return;
    const { blockId } = link.dataset;
    if (!blockId) return;
    event.preventDefault();
    this.activateByBlockId(blockId, { scrollIntoView: true });
    link.focus();
  }

  updateNavState(blockId) {
    if (!this.navLinks.length) return;
    this.navLinks.forEach((link) => {
      const isActive = Boolean(blockId && link.dataset.blockId === blockId);
      if (isActive) {
        link.setAttribute('aria-current', 'true');
        link.classList.add('is-active');
      } else {
        link.removeAttribute('aria-current');
        link.classList.remove('is-active');
      }
    });
  }

  swapVisualForItem(item) {
    if (!this.mediaTarget) return;

    if (this.activeMedia) {
      if (this.activeMedia instanceof HTMLVideoElement) {
        this.activeMedia.pause();
      }
      if (this.activeMedia.parentElement === this.mediaTarget) {
        this.mediaTarget.removeChild(this.activeMedia);
      }
      this.activeMedia = null;
    }

    this.mediaTarget.innerHTML = '';

    const background = item.dataset.bg;
    const visualSurface = this.visualSurface || this.visualContainer;
    if (visualSurface) {
      if (background) {
        visualSurface.style.backgroundColor = background;
      } else {
        visualSurface.style.removeProperty('background-color');
      }
    }

    const videoSrc = item.dataset.video;
    if (videoSrc) {
      const video = this.getOrCreateVideo(item, videoSrc);
      if (video) {
        this.mediaTarget.appendChild(video);
        this.activeMedia = video;
        this.updateVideoPlayback(video);
      }
      return;
    }

    const image = item.querySelector('[data-slide-image]');
    if (image) {
      const clone = image.cloneNode(true);
      clone.hidden = false;
      clone.removeAttribute('hidden');
      clone.removeAttribute('data-slide-image');
      clone.classList.remove('about-sticky-slides__preload-image');
      clone.setAttribute('data-active-slide', '');
      this.mediaTarget.appendChild(clone);
      this.activeMedia = clone;
    }
  }

  pauseItemMedia(item) {
    if (!item) return;
    const video = item._aboutStickyVideo;
    if (video instanceof HTMLVideoElement) {
      video.pause();
      video.removeAttribute('autoplay');
    }
  }

  getOrCreateVideo(item, src) {
    if (!item._aboutStickyVideo) {
      const video = document.createElement('video');
      video.src = src;
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.setAttribute('loop', '');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.className = 'about-sticky-slides__video';
      video.tabIndex = -1;
      video.setAttribute('aria-hidden', 'true');
      item._aboutStickyVideo = video;
    } else if (item._aboutStickyVideo.src !== src) {
      item._aboutStickyVideo.src = src;
      item._aboutStickyVideo.load();
    }

    return item._aboutStickyVideo;
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
      playPromise.catch(() => {
        // Ignore autoplay errors triggered by browser policies.
      });
    }
  }

  activateByBlockId(blockId, { scrollIntoView = false } = {}) {
    if (!blockId) return;
    const item = this.items.find((entry) => entry.dataset.blockId === blockId);
    if (!item) return;

    if (scrollIntoView) {
      const prefersReducedMotion = this.prefersReducedMotion;
      item.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    }

    this.activateItem(item);
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.items.forEach((item) => {
      this.pauseItemMedia(item);
    });

    if (this.mediaTarget) {
      this.mediaTarget.innerHTML = '';
    }

    if (this.nav && this.handleNavClick) {
      this.nav.removeEventListener('click', this.handleNavClick);
    }

    if (this.motionQuery) {
      if (this.motionQuery.removeEventListener) {
        this.motionQuery.removeEventListener('change', this.motionListener);
      } else if (this.motionQuery.removeListener) {
        this.motionQuery.removeListener(this.motionListener);
      }
    }
  }
}

const aboutStickyInstances = new Map();

const initAboutStickySections = (root = document) => {
  const sections = root.querySelectorAll('[data-about-sticky]');
  sections.forEach((section) => {
    const id = section.dataset.sectionId || section.id;
    if (!id || aboutStickyInstances.has(id)) {
      return;
    }
    const instance = new AboutStickySlides(section);
    if (instance && instance.items && instance.items.length) {
      aboutStickyInstances.set(id, instance);
    }
  });
};

const unloadAboutStickySection = (sectionId) => {
  const instance = aboutStickyInstances.get(sectionId);
  if (!instance) return;
  instance.destroy();
  aboutStickyInstances.delete(sectionId);
};

const handleBlockSelect = (event) => {
  const { sectionId, blockId } = event.detail || {};
  if (!sectionId || !blockId) return;
  const instance = aboutStickyInstances.get(sectionId);
  if (!instance) return;
  instance.activateByBlockId(blockId, { scrollIntoView: true });
};

const handleBlockDeselect = (event) => {
  const { sectionId, blockId } = event.detail || {};
  if (!sectionId || !blockId) return;
  const instance = aboutStickyInstances.get(sectionId);
  if (!instance) return;
  instance.activateByBlockId(blockId);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initAboutStickySections());
} else {
  initAboutStickySections();
}

document.addEventListener('shopify:section:load', (event) => {
  const section = event.target.querySelector('[data-about-sticky]');
  const sectionId = event.detail && event.detail.sectionId;
  if (!section) return;
  initAboutStickySections(event.target);
  if (sectionId) {
    const instance = aboutStickyInstances.get(sectionId);
    if (instance) {
      instance.activateItem(instance.items[0]);
    }
  }
});

document.addEventListener('shopify:section:unload', (event) => {
  const sectionId = event.detail && event.detail.sectionId;
  if (!sectionId) return;
  unloadAboutStickySection(sectionId);
});

document.addEventListener('shopify:block:select', handleBlockSelect);

document.addEventListener('shopify:block:deselect', handleBlockDeselect);
