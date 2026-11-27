/* =================================================================
   Presentación interactiva — lógica
   HTML + CSS + JS puro. Sin dependencias.
   ================================================================= */
(function () {
  'use strict';

  /* =================================================================
     1) CONFIGURACIÓN DE AUDIO
     >>> AQUÍ CAMBIAS LAS RUTAS DE TUS ARCHIVOS <<<

     - La MÚSICA de cada diapositiva se define en index.html con
       data-music="./assets/audio/tu-cancion.mp3".
     - Los EFECTOS (SFX) se registran aquí abajo con un nombre corto,
       que luego usas en el HTML como data-sfx="nombre" (al entrar en
       la slide) o data-click-sfx="nombre" (al hacer clic).

     Coloca tus .mp3 dentro de ./assets/audio/ con estos nombres,
     o cambia las rutas por las tuyas.
     ================================================================= */
  const SFX = {
    whoosh:   './assets/audio/sfx-whoosh.mp3',    // transición / entrada
    pop:      './assets/audio/sfx-pop.mp3',       // aparición de elementos
    click:    './assets/audio/sfx-click.mp3',     // clic en tarjetas y botones
    chime:    './assets/audio/sfx-chime.mp3',     // acento suave
    applause: './assets/audio/sfx-applause.mp3',  // cierre
    next:     './assets/audio/sfx-next.mp3'       // avance de diapositiva (genérico)
  };

  const CONFIG = {
    musicVolume:  0.45,   // volumen de la música de fondo (0–1)
    sfxVolume:    0.7,    // volumen de los efectos (0–1)
    fadeDuration: 1500,   // ms del fundido entre canciones
    navSfx:       'next', // efecto al cambiar de diapositiva (null para desactivar)
    loopMusic:    true
  };

  /* =================================================================
     2) GESTOR DE AUDIO
     - Desbloquea el contexto de audio en el primer gesto del usuario.
     - Cambia la música con fade out / fade in.
     - Dispara SFX puntuales sin cortar los anteriores.
     ================================================================= */
  const AudioManager = {
    ctx: null,
    unlocked: false,
    muted: false,
    currentSrc: null,
    currentAudio: null,
    sfxCache: Object.create(null),
    _fadeTimers: new WeakMap(),

    /** Se llama en el primer clic real del usuario (botón "Comenzar"). */
    unlock() {
      if (this.unlocked) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        try {
          this.ctx = new AC();
          if (this.ctx.state === 'suspended') this.ctx.resume();
        } catch (e) { /* sin Web Audio: seguimos con <audio> normal */ }
      }
      // Pre-carga de los efectos para que suenen sin latencia.
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

    /** Reproduce un efecto puntual. Varios pueden solaparse. */
    playSfx(name) {
      if (!name || this.muted || !this.unlocked) return;
      const base = this._loadSfx(name);
      if (!base) return;
      const node = base.cloneNode(true);
      node.volume = CONFIG.sfxVolume;
      const p = node.play();
      if (p && p.catch) p.catch(() => {}); // archivo ausente → se ignora
    },

    /** Cambia la música de fondo con fundido. Si ya suena esa pista, no hace nada. */
    playMusic(src) {
      if (!src || !this.unlocked) return;
      if (this.currentSrc === src && this.currentAudio && !this.currentAudio.paused) return;

      const previous = this.currentAudio;
      this.currentSrc = src;

      const next = new Audio(src);
      next.loop = CONFIG.loopMusic;
      next.volume = 0;
      this.currentAudio = next;

      const target = this.muted ? 0 : CONFIG.musicVolume;
      const p = next.play();
      if (p && p.catch) p.catch(() => {}); // si falta el mp3, no rompe nada

      this._fade(next, target, CONFIG.fadeDuration);

      if (previous) {
        this._fade(previous, 0, CONFIG.fadeDuration, () => {
          previous.pause();
          previous.src = '';
        });
      }
    },

    /** Fundido lineal de volumen con requestAnimationFrame. */
    _fade(audio, to, duration, onDone) {
      const old = this._fadeTimers.get(audio);
      if (old) cancelAnimationFrame(old);

      const from = audio.volume;
      const start = performance.now();

      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const v = from + (to - from) * t;
        try { audio.volume = Math.max(0, Math.min(1, v)); } catch (e) {}
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
     3) PRESENTACIÓN: navegación y estado
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
  const prevBtn     = document.getElementById('prevBtn');
  const nextBtn     = document.getElementById('nextBtn');
  const restartBtn  = document.getElementById('restartBtn');

  let index = 0;
  let started = false;

  slideTotal.textContent = String(slides.length);

  /** Devuelve la música que corresponde a una slide (heredando la anterior). */
  function musicFor(i) {
    for (let k = i; k >= 0; k--) {
      const m = slides[k].dataset.music;
      if (m) return m;
    }
    return null;
  }

  function goTo(i, opts) {
    const options = opts || {};
    const target = Math.max(0, Math.min(slides.length - 1, i));
    if (target === index && started && !options.force) return;

    slides.forEach((s, k) => s.classList.toggle('is-active', k === target));
    index = target;

    // HUD + progreso
    slideNum.textContent = String(index + 1);
    progressBar.style.width = ((index + 1) / slides.length * 100) + '%';
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slides.length - 1;

    // Música de la diapositiva (solo cambia si es distinta)
    const music = musicFor(index);
    if (music) AudioManager.playMusic(music);

    // Efecto de entrada de la diapositiva
    const sfx = slides[index].dataset.sfx;
    if (sfx) AudioManager.playSfx(sfx);
    else if (!options.silent && CONFIG.navSfx) AudioManager.playSfx(CONFIG.navSfx);
  }

  function next() { if (index < slides.length - 1) goTo(index + 1); }
  function prev() { if (index > 0) goTo(index - 1); }

  /* ----------------------- Arranque ----------------------- */
  function start() {
    if (started) return;
    started = true;

    AudioManager.unlock();          // debe ocurrir dentro del gesto del usuario
    AudioManager.playSfx('click');

    intro.classList.add('is-hidden');
    deck.hidden = false;
    [muteBtn, hud, progress, prevBtn, nextBtn].forEach((el) => { el.hidden = false; });

    // Pequeño respiro para que el deck se pinte antes de animar la slide 1.
    requestAnimationFrame(() => goTo(0, { force: true, silent: true }));

    setTimeout(() => { intro.style.display = 'none'; }, 900);
  }

  startBtn.addEventListener('click', start);

  /* --------------------- Teclado --------------------- */
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

  /* ------------- Clic / toque en la pantalla -------------
     Un clic en zona libre avanza; en la mitad izquierda retrocede.
     Los clics sobre botones y enlaces no navegan.            */
  deck.addEventListener('click', (e) => {
    if (!started) return;
    const interactive = e.target.closest('button, a, input, [data-click-sfx]');
    if (interactive) return;
    if (e.clientX < window.innerWidth * 0.25) prev();
    else next();
  });

  // Efectos al clicar elementos marcados con data-click-sfx
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-click-sfx]');
    if (el) AudioManager.playSfx(el.dataset.clickSfx);
  });

  /* --------------------- Gestos táctiles --------------------- */
  let touchX = null, touchY = null;
  deck.addEventListener('touchstart', (e) => {
    touchX = e.changedTouches[0].clientX;
    touchY = e.changedTouches[0].clientY;
  }, { passive: true });

  deck.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      (dx < 0 ? next : prev)();
    }
    touchX = touchY = null;
  }, { passive: true });

  /* --------------------- Controles --------------------- */
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

  // Pausa la música si se oculta la pestaña; la reanuda al volver.
  document.addEventListener('visibilitychange', () => {
    const a = AudioManager.currentAudio;
    if (!a) return;
    if (document.hidden) a.pause();
    else if (!AudioManager.muted) { const p = a.play(); if (p && p.catch) p.catch(() => {}); }
  });

  // Expuesto para depurar desde la consola: Presentacion.goTo(2)
  window.Presentacion = { goTo, next, prev, AudioManager, CONFIG, SFX };
})();
