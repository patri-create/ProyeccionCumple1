/* =================================================================
   EXPEDIENTE CLASIFICADO — lógica
   HTML + CSS + JS puro. Sin dependencias.
   ================================================================= */
(function () {
  'use strict';

  /* =================================================================
     1) CONFIGURACIÓN DE AUDIO
     >>> AQUÍ CAMBIAS LAS RUTAS DE TUS ARCHIVOS <<<

     MÚSICA: se define en index.html con data-music en cada slide.
             Si una slide no lo lleva, sigue sonando la anterior.
             Si cambia, hay fade out + fade in.

     EFECTOS: se registran abajo con un nombre corto, que usas en el
              HTML como data-sfx (al entrar) o data-click-sfx (al pulsar).
     ================================================================= */
  const SFX = {
    access:  './assets/audio/sfx-acceso.mp3',     // "acceso concedido"
    scan:    './assets/audio/sfx-escaner.mp3',    // escáner de la ficha
    beep:    './assets/audio/sfx-beep.mp3',       // pitido de consola
    stamp:   './assets/audio/sfx-sello.mp3',      // golpe de sello
    reveal:  './assets/audio/sfx-revelar.mp3',    // desclasificar un bloque
    alert:   './assets/audio/sfx-alerta.mp3',     // alerta de misión
    fanfare: './assets/audio/sfx-fanfarria.mp3',  // cierre / cumpleaños
    click:   './assets/audio/sfx-click.mp3',      // clic genérico
    type:    './assets/audio/sfx-tecla.mp3',      // tecleo del terminal
    next:    './assets/audio/sfx-siguiente.mp3'   // avance de diapositiva
  };

  const CONFIG = {
    musicVolume:  0.4,    // volumen de la música de fondo (0–1)
    sfxVolume:    0.65,   // volumen de los efectos (0–1)
    fadeDuration: 1600,   // ms del fundido entre canciones
    navSfx:       'next', // efecto al cambiar de slide (null para desactivar)
    typeSpeed:    26,     // ms por carácter en el terminal
    typeSfxEvery: 3,      // suena 'type' cada N caracteres (0 = desactivado)
    loopMusic:    true
  };

  /* =================================================================
     2) GESTOR DE AUDIO
     ================================================================= */
  const AudioManager = {
    ctx: null,
    unlocked: false,
    muted: false,
    currentSrc: null,
    currentAudio: null,
    sfxCache: Object.create(null),
    _fadeTimers: new WeakMap(),

    /** Se llama dentro del primer gesto real del usuario. */
    unlock() {
      if (this.unlocked) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        try {
          this.ctx = new AC();
          if (this.ctx.state === 'suspended') this.ctx.resume();
        } catch (e) { /* sin Web Audio: seguimos con <audio> normal */ }
      }
      Object.keys(SFX).forEach((name) => this._loadSfx(name));
      this.unlocked = true;
    },

    _loadSfx(name) {
      if (this.sfxCache[name]) return this.sfxCache[name];
      const src = SFX[name];
      if (!src) return null;
      const a = new Audio(src);
      a.preload = 'auto';
      a.volume = CONFIG.sfxVolume;
      this.sfxCache[name] = a;
      return a;
    },

    /** Efecto puntual. Varios pueden solaparse sin cortarse. */
    playSfx(name, volumeScale) {
      if (!name || this.muted || !this.unlocked) return;
      const base = this._loadSfx(name);
      if (!base) return;
      const node = base.cloneNode(true);
      node.volume = Math.max(0, Math.min(1, CONFIG.sfxVolume * (volumeScale || 1)));
      const p = node.play();
      if (p && p.catch) p.catch(() => {}); // si falta el mp3, se ignora
    },

    /** Música de fondo con fundido. Si ya suena esa pista, no hace nada. */
    playMusic(src) {
      if (!src || !this.unlocked) return;
      if (this.currentSrc === src && this.currentAudio && !this.currentAudio.paused) return;

      const previous = this.currentAudio;
      this.currentSrc = src;

      const next = new Audio(src);
      next.loop = CONFIG.loopMusic;
      next.volume = 0;
      this.currentAudio = next;

      const p = next.play();
      if (p && p.catch) p.catch(() => {});

      this._fade(next, this.muted ? 0 : CONFIG.musicVolume, CONFIG.fadeDuration);

      if (previous) {
        this._fade(previous, 0, CONFIG.fadeDuration, () => {
          previous.pause();
          previous.src = '';
        });
      }
    },

    _fade(audio, to, duration, onDone) {
      const old = this._fadeTimers.get(audio);
      if (old) cancelAnimationFrame(old);

      const from = audio.volume;
      const start = performance.now();

      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        try { audio.volume = Math.max(0, Math.min(1, from + (to - from) * t)); } catch (e) {}
        if (t < 1) {
          this._fadeTimers.set(audio, requestAnimationFrame(step));
        } else {
          this._fadeTimers.delete(audio);
          if (onDone) onDone();
        }
      };
      this._fadeTimers.set(audio, requestAnimationFrame(step));
    },

    toggleMute() {
      this.muted = !this.muted;
      if (this.currentAudio) {
        this._fade(this.currentAudio, this.muted ? 0 : CONFIG.musicVolume, 350);
      }
      return this.muted;
    }
  };

  /* =================================================================
     3) EFECTOS DE DIAPOSITIVA
     ================================================================= */

  /** Escribe el texto de data-type carácter a carácter. */
  function typewriter(el) {
    const text = el.dataset.type || '';
    const delay = parseInt(el.dataset.typeDelay || '0', 10);
    el.textContent = '';
    el.classList.remove('is-typing');

    const run = () => {
      el.classList.add('is-typing');
      let i = 0;
      const tick = () => {
        if (!el.isConnected) return;
        el.textContent = text.slice(0, ++i);
        if (CONFIG.typeSfxEvery && i % CONFIG.typeSfxEvery === 0) {
          AudioManager.playSfx('type', 0.35);
        }
        if (i < text.length) {
          el._typeTimer = setTimeout(tick, CONFIG.typeSpeed);
        } else {
          el.classList.remove('is-typing');
        }
      };
      tick();
    };

    clearTimeout(el._typeDelay);
    clearTimeout(el._typeTimer);
    el._typeDelay = setTimeout(run, delay);
  }

  /** Cuenta de 0 hasta data-count. */
  function countUp(el) {
    const target = parseInt(el.dataset.count || '0', 10);
    const duration = 1200;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Cuenta atrás "se autodestruirá en N…" (solo decorativa). */
  function countdown(el) {
    let n = parseInt(el.dataset.from || '10', 10);
    clearInterval(el._cdTimer);
    el.textContent = String(n);
    el._cdTimer = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        el.textContent = '0';
        clearInterval(el._cdTimer);
        return;
      }
      el.textContent = String(n);
      AudioManager.playSfx('beep', 0.3);
    }, 1000);
  }

  /** Lanza los efectos propios de la diapositiva que acaba de entrar. */
  function runSlideEffects(slide) {
    slide.querySelectorAll('[data-type]').forEach(typewriter);
    slide.querySelectorAll('[data-count]').forEach(countUp);
    slide.querySelectorAll('.countdown').forEach(countdown);
  }

  /** Detiene temporizadores al salir de una diapositiva. */
  function stopSlideEffects(slide) {
    slide.querySelectorAll('.countdown').forEach((el) => clearInterval(el._cdTimer));
    slide.querySelectorAll('[data-type]').forEach((el) => {
      clearTimeout(el._typeDelay);
      clearTimeout(el._typeTimer);
    });
  }

  /* =================================================================
     4) NAVEGACIÓN
     ================================================================= */
  const intro       = document.getElementById('intro');
  const deck        = document.getElementById('deck');
  const slides      = Array.from(document.querySelectorAll('.slide'));
  const startBtn    = document.getElementById('startBtn');
  const muteBtn     = document.getElementById('muteBtn');
  const hud         = document.getElementById('hud');
  const slideNum    = document.getElementById('slideNum');
  const slideTotal  = document.getElementById('slideTotal');
  const progress    = document.getElementById('progress');
  const progressBar = document.getElementById('progressBar');
  const frame       = document.getElementById('frame');
  const prevBtn     = document.getElementById('prevBtn');
  const nextBtn     = document.getElementById('nextBtn');
  const restartBtn  = document.getElementById('restartBtn');

  let index = 0;
  let started = false;

  const pad = (n) => String(n).padStart(2, '0');
  slideTotal.textContent = pad(slides.length);

  /** Música que corresponde a una slide (heredando la de las anteriores). */
  function musicFor(i) {
    for (let k = i; k >= 0; k--) {
      if (slides[k].dataset.music) return slides[k].dataset.music;
    }
    return null;
  }

  function goTo(i, opts) {
    const options = opts || {};
    const target = Math.max(0, Math.min(slides.length - 1, i));
    if (target === index && started && !options.force) return;

    stopSlideEffects(slides[index]);

    slides.forEach((s, k) => s.classList.toggle('is-active', k === target));
    index = target;

    slideNum.textContent = pad(index + 1);
    progressBar.style.width = ((index + 1) / slides.length * 100) + '%';
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slides.length - 1;

    const music = musicFor(index);
    if (music) AudioManager.playMusic(music);

    const sfx = slides[index].dataset.sfx;
    if (sfx) AudioManager.playSfx(sfx);
    else if (!options.silent && CONFIG.navSfx) AudioManager.playSfx(CONFIG.navSfx);

    runSlideEffects(slides[index]);
  }

  function next() { if (index < slides.length - 1) goTo(index + 1); }
  function prev() { if (index > 0) goTo(index - 1); }

  /* -------------------- Arranque -------------------- */
  function start() {
    if (started) return;
    started = true;

    AudioManager.unlock();            // debe ocurrir dentro del gesto del usuario
    AudioManager.playSfx('click');

    intro.classList.add('is-hidden');
    deck.hidden = false;
    [muteBtn, hud, progress, frame, prevBtn, nextBtn].forEach((el) => { el.hidden = false; });

    requestAnimationFrame(() => goTo(0, { force: true, silent: true }));
    setTimeout(() => { intro.style.display = 'none'; }, 900);
  }

  startBtn.addEventListener('click', start);

  /* -------------------- Teclado -------------------- */
  document.addEventListener('keydown', (e) => {
    if (!started) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); }
      return;
    }
    switch (e.key) {
      case 'ArrowRight':
      case ' ':
      case 'PageDown':
        e.preventDefault(); next(); break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home': e.preventDefault(); goTo(0); break;
      case 'End':  e.preventDefault(); goTo(slides.length - 1); break;
      case 'm':
      case 'M':    setMuteUI(AudioManager.toggleMute()); break;
      case 'f':
      case 'F':    toggleFullscreen(); break;
    }
  });

  /* ------------- Clic / toque para navegar -------------
     Zona izquierda (25%) retrocede, el resto avanza.
     Los elementos interactivos no navegan.               */
  deck.addEventListener('click', (e) => {
    if (!started) return;
    if (e.target.closest('button, a, input, .redacted, [data-click-sfx]')) return;
    if (e.clientX < window.innerWidth * 0.25) prev();
    else next();
  });

  /* ------------- Bloques censurados ------------- */
  document.addEventListener('click', (e) => {
    const block = e.target.closest('.redacted');
    if (block && !block.classList.contains('is-open')) {
      block.classList.add('is-open');
    }
    const sfxEl = e.target.closest('[data-click-sfx]');
    if (sfxEl) AudioManager.playSfx(sfxEl.dataset.clickSfx);
  });

  /* -------------------- Gestos táctiles -------------------- */
  let touchX = null, touchY = null;
  deck.addEventListener('touchstart', (e) => {
    touchX = e.changedTouches[0].clientX;
    touchY = e.changedTouches[0].clientY;
  }, { passive: true });

  deck.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
    touchX = touchY = null;
  }, { passive: true });

  /* -------------------- Controles -------------------- */
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  if (restartBtn) restartBtn.addEventListener('click', () => goTo(0));

  function setMuteUI(muted) {
    muteBtn.classList.toggle('is-muted', muted);
    muteBtn.setAttribute('aria-label', muted ? 'Activar audio' : 'Silenciar audio');
  }
  muteBtn.addEventListener('click', () => setMuteUI(AudioManager.toggleMute()));

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  document.addEventListener('visibilitychange', () => {
    const a = AudioManager.currentAudio;
    if (!a) return;
    if (document.hidden) a.pause();
    else if (!AudioManager.muted) { const p = a.play(); if (p && p.catch) p.catch(() => {}); }
  });

  // Para depurar desde la consola: Presentacion.goTo(4)
  window.Presentacion = { goTo, next, prev, AudioManager, CONFIG, SFX };
})();
