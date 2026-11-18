/* Developmental Disorders: fill an empty table of 14 disorders, one dropdown per cell. */
(() => {
  'use strict';

  // ------------------------------------------------------------------
  // Data: disorders are the columns, criteria are the rows
  // ------------------------------------------------------------------
  const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
  const D = window.DISORDERS || { criteria: [], disorders: [] };
  const CRITS = D.criteria;
  const DIS = D.disorders.map((d, ci) => ({ idx: ci, name: d.name, short: d.short || d.name }));
  const byAZ = (a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base', numeric: true });
  const ROWS = CRITS.map((crit, ri) => {
    const labels = D.disorders.map(d => (d.cells && d.cells[crit]) || 'Not specified');
    const options = [];
    const seen = new Set();
    labels.forEach(label => { const k = norm(label); if (!seen.has(k)) { seen.add(k); options.push({ key: k, label }); } });
    options.sort(byAZ); // A to Z: easy to scan, and gives nothing away
    // A row with one answer for everybody isn't played: it's filled in from the start
    const row = { idx: ri, crit, options, given: options.length < 2, cells: [] };
    labels.forEach((label, ci) => row.cells.push({ id: `r${ri}c${ci}`, row: ri, col: ci, label, key: norm(label), given: row.given }));
    return row;
  });
  const CELLS = ROWS.flatMap(r => r.cells);
  const PLAYABLE = CELLS.filter(c => !c.given);
  const TOTAL = PLAYABLE.length;
  const cellById = new Map(CELLS.map(c => [c.id, c]));
  const colCells = ci => PLAYABLE.filter(c => c.col === ci);
  const SCOPE = 'all'; // the whole table; kept in the leaderboard rows for future variations
  const rowOf = c => ROWS[c.row];
  const disorderOf = c => DIS[c.col];
  const critText = s => String(s).replace(/\//g, '/​'); // lets "Inheritance/Transmission" wrap
  const labelOf = (c, key) => { const o = rowOf(c).options.find(x => x.key === key); return o ? o.label : key; };

  const $ = id => document.getElementById(id);
  const el = {
    mark: $('mark'), modeLine: $('modeLine'),
    time: $('statTime'), mistakes: $('statMistakes'), hints: $('statHints'), score: $('statScore'),
    btnHint: $('btnHint'), btnCheck: $('btnCheck'), btnReveal: $('btnReveal'), btnBoard: $('btnBoard'), btnNew: $('btnNew'), btnSound: $('btnSound'),
    progress: $('progressFill'),
    board: $('board'), jumpBar: $('jumpBar'), matchCount: $('matchCount'),
    streak: $('streak'), streakText: $('streakText'),
    toast: $('toast'),
    menu: $('menu'), menuScrim: $('menuScrim'), menuTitle: $('menuTitle'), menuMsg: $('menuMsg'), menuList: $('menuList'), menuX: $('menuX'),
    confetti: $('confetti'),
    intro: $('introDialog'), introForm: $('introForm'), nickInput: $('nickInput'), nickHint: $('nickHint'), btnStudy: $('btnStudy'),
    result: $('resultDialog'), resultTitle: $('resultTitle'), resultText: $('resultText'), resultStats: $('resultStats'), resultBest: $('resultBest'), resultActions: $('resultActions'), mascot: $('mascot'),
    boardDialog: $('boardDialog'), boardBody: $('boardBody'), boardNote: $('boardNote'), boardClose: $('boardClose'),
    tableDialog: $('tableDialog'), tableWrap: $('tableWrap'), tableClose: $('tableClose'), tableDone: $('tableDone'), tablePrint: $('tablePrint'),
    confirm: $('confirmDialog'), confirmTitle: $('confirmTitle'), confirmText: $('confirmText'), confirmYes: $('confirmYes'), confirmNo: $('confirmNo')
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const phone = window.matchMedia('(max-width: 760px)');

  // ------------------------------------------------------------------
  // Storage (best effort)
  // ------------------------------------------------------------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('disorders.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('disorders.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  // The artery games live on the same site; reuse their nickname the first time
  function savedNick() {
    const own = store.get('nickname', '');
    if (own) return own;
    for (const k of ['irrigation.nickname', 'arteries.nickname']) {
      try { const v = localStorage.getItem(k); if (v) return JSON.parse(v); } catch (e) { /* ignore */ }
    }
    return '';
  }

  // ------------------------------------------------------------------
  // Scoring and nicknames
  // ------------------------------------------------------------------
  // Keep these in step with the score_ms formula in supabase/leaderboard.sql
  const MISTAKE_PENALTY_MS = 10000;
  const HINT_PENALTY_MS = 20000;
  const MIN_TIME_MS = 20000; // the database rejects anything faster
  const scoreOf = (timeMs, mistakes, hints) => timeMs + mistakes * MISTAKE_PENALTY_MS + hints * HINT_PENALTY_MS;
  const cleanNick = v => String(v || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  const nickKey = v => cleanNick(v).toLowerCase();
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const boardLabel = mode => (mode === 'test' ? 'Test' : 'Practice');
  const listNames = names => {
    if (names.length > 3) return `${names.slice(0, 2).join(', ')} and ${names.length - 2} others`;
    return names.length <= 1 ? (names[0] || '') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  };

  // ------------------------------------------------------------------
  // Global leaderboard (Supabase REST). Off until config.js has both values.
  // ------------------------------------------------------------------
  const LBCFG = window.LEADERBOARD || {};
  const lb = {
    on: !!(LBCFG.supabaseUrl && LBCFG.supabaseKey),
    url(path) { return String(LBCFG.supabaseUrl).replace(/\/+$/, '') + '/rest/v1/' + path; },
    headers(extra) {
      const h = Object.assign({ apikey: LBCFG.supabaseKey }, extra || {});
      // Legacy anon keys are JWTs and also go in Authorization; publishable keys must not
      if (/^eyJ/.test(LBCFG.supabaseKey)) h.Authorization = 'Bearer ' + LBCFG.supabaseKey;
      return h;
    },
    async req(path, opts = {}) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 9000);
      try {
        const r = await fetch(this.url(path), Object.assign({}, opts, { headers: this.headers(opts.headers), signal: ctl.signal }));
        const text = await r.text();
        let body = null;
        try { body = text ? JSON.parse(text) : null; } catch (e) { body = null; }
        if (!r.ok) {
          const err = new Error((body && (body.message || body.msg)) || ('HTTP ' + r.status));
          err.status = r.status; err.code = body && body.code;
          throw err;
        }
        return body;
      } finally { clearTimeout(timer); }
    },
    submit(run) {
      return this.req('disorders_scores', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(run) });
    },
    board(mode) {
      return this.req(`disorders_leaderboard?select=nickname,nickname_key,score_ms,time_ms,mistakes,hints,runs,created_at&mode=eq.${mode}&scope=eq.${SCOPE}&order=score_ms.asc,created_at.asc&limit=500`);
    },
    runs(key) {
      const quoted = '"' + key.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
      return this.req(`disorders_scores?select=nickname,mode,score_ms,time_ms,mistakes,hints,created_at&scope=eq.${SCOPE}&nickname_key=eq.${encodeURIComponent(quoted)}&order=created_at.desc&limit=200`);
    }
  };
  // The table doesn't exist yet: supabase/leaderboard.sql hasn't been run in the project
  const notSetUp = e => e.status === 404 || e.code === 'PGRST205' || e.code === '42P01';
  // Network trouble, server errors, the 15 s cooldown and a missing table are worth retrying later
  const retryable = e => !e.status || e.status >= 500 || e.code === '42501' || notSetUp(e);

  function queueRun(run) {
    const list = store.get('pending', []);
    list.push(run);
    store.set('pending', list.slice(-50));
  }
  async function flushPending() {
    if (!lb.on) return;
    const list = store.get('pending', []);
    if (!list.length) return;
    const keep = [], seen = new Set();
    for (const run of list) {
      const k = nickKey(run.nickname);
      if (seen.has(k)) { keep.push(run); continue; } // one per nickname per visit (cooldown)
      seen.add(k);
      try { await lb.submit(run); } catch (e) { if (retryable(e)) keep.push(run); }
    }
    store.set('pending', keep);
  }

  // ------------------------------------------------------------------
  // Sound: a heartbeat for a right answer, a chime for a finished disorder, a buzz for a miss
  // ------------------------------------------------------------------
  const sound = {
    ctx: null,
    on: store.get('sound', true),
    ensure() {
      if (!this.on) return null;
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          this.ctx = new AC();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { return null; }
      return this.ctx;
    },
    tone(t, { type = 'sine', f0, f1, dur, vol, lp }) {
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let node = o;
      if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
      node.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.02);
    },
    beat(at = 0, vol = 0.5) {
      const c = this.ensure(); if (!c) return;
      const t = c.currentTime + at;
      // "lub" then "dub": a low body plus a triangle overtone so laptop speakers carry it
      this.tone(t, { f0: 140, f1: 55, dur: 0.17, vol });
      this.tone(t, { type: 'triangle', f0: 280, f1: 120, dur: 0.09, vol: vol * 0.35 });
      this.tone(t + 0.19, { f0: 120, f1: 50, dur: 0.15, vol: vol * 0.7 });
      this.tone(t + 0.19, { type: 'triangle', f0: 240, f1: 110, dur: 0.08, vol: vol * 0.25 });
    },
    correct() { this.beat(0, 0.42); },
    place() {
      const c = this.ensure(); if (!c) return;
      this.tone(c.currentTime, { type: 'triangle', f0: 520, f1: 380, dur: 0.07, vol: 0.06 });
    },
    wrong() {
      const c = this.ensure(); if (!c) return;
      this.tone(c.currentTime, { type: 'square', f0: 120, f1: 85, dur: 0.16, vol: 0.06, lp: 700 });
    },
    chime() {
      const c = this.ensure(); if (!c) return;
      const t = c.currentTime + 0.32;
      [659.25, 987.77].forEach((f, i) => this.tone(t + i * 0.11, { type: 'triangle', f0: f, dur: 0.55, vol: 0.07 }));
    },
    sparkle() {
      const c = this.ensure(); if (!c) return;
      const t = c.currentTime + 0.3;
      [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => this.tone(t + i * 0.06, { type: 'sine', f0: f, dur: 0.32, vol: 0.05 }));
    },
    finish() {
      const c = this.ensure(); if (!c) return;
      this.beat(0, 0.5); this.beat(0.85, 0.5);
      const t = c.currentTime + 1.7;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(t + i * 0.09, { type: 'triangle', f0: f, dur: 1.2, vol: 0.06 }));
    }
  };

  // ------------------------------------------------------------------
  // Confetti: hearts, little teeth and paper bits on a canvas above everything
  // ------------------------------------------------------------------
  const confetti = (() => {
    const cv = el.confetti;
    const ctx = cv.getContext('2d');
    const COLORS = ['#A8132C', '#C8203D', '#E0566C', '#F28C9B', '#FFC2CC', '#F2B33D', '#7A0C1F', '#FFFFFF'];
    const SHAPES = ['heart', 'heart', 'tooth', 'paper', 'paper', 'dot'];
    let parts = [], raf = 0, last = 0, dpr = 1;

    function show() {
      try {
        if (cv.showPopover) {
          // Re-opening puts the canvas on top of any dialog that opened after it
          if (cv.matches(':popover-open')) cv.hidePopover();
          cv.showPopover();
          return;
        }
      } catch (e) { /* fall through */ }
      cv.classList.add('live');
    }
    function hide() {
      try { if (cv.hidePopover && cv.matches(':popover-open')) cv.hidePopover(); } catch (e) { /* ignore */ }
      cv.classList.remove('live');
    }
    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(window.innerWidth * dpr);
      cv.height = Math.round(window.innerHeight * dpr);
    }
    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    function spawn(p) {
      parts.push(Object.assign({
        rot: rand(0, Math.PI * 2), vr: rand(-0.15, 0.15),
        size: rand(7, 13), color: pick(COLORS), shape: pick(SHAPES),
        age: 0, life: rand(1.2, 1.9), g: 0.22, drag: 0.985,
        flip: rand(0, Math.PI * 2), vflip: rand(0.08, 0.2), sway: rand(0, Math.PI * 2)
      }, p));
    }
    function run() {
      if (raf) return;
      show(); size();
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function drawShape(p) {
      const s = p.size / 10;
      ctx.save();
      ctx.translate(p.x * dpr, p.y * dpr);
      ctx.rotate(p.shape === 'tooth' ? p.rot * 0.25 : p.rot);
      ctx.scale(s * dpr, s * dpr * (p.shape === 'paper' ? Math.cos(p.flip) : 1));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.shape === 'heart') {
        ctx.moveTo(0, 4);
        ctx.bezierCurveTo(-1.2, 3, -5.5, 0.3, -5.5, -2.4);
        ctx.bezierCurveTo(-5.5, -5.4, -2, -6.2, 0, -3.6);
        ctx.bezierCurveTo(2, -6.2, 5.5, -5.4, 5.5, -2.4);
        ctx.bezierCurveTo(5.5, 0.3, 1.2, 3, 0, 4);
        ctx.fill();
      } else if (p.shape === 'tooth') {
        ctx.moveTo(-4.4, -2.6);
        ctx.bezierCurveTo(-4.4, -5.4, -1.8, -5.9, 0, -4.7);
        ctx.bezierCurveTo(1.8, -5.9, 4.4, -5.4, 4.4, -2.6);
        ctx.bezierCurveTo(4.4, 0, 3.4, 1.4, 3, 3.3);
        ctx.bezierCurveTo(2.7, 5, 2.1, 5.7, 1.5, 5.7);
        ctx.bezierCurveTo(0.8, 5.7, 0.7, 3, 0, 3);
        ctx.bezierCurveTo(-0.7, 3, -0.8, 5.7, -1.5, 5.7);
        ctx.bezierCurveTo(-2.1, 5.7, -2.7, 5, -3, 3.3);
        ctx.bezierCurveTo(-3.4, 1.4, -4.4, 0, -4.4, -2.6);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = p.color === '#FFFFFF' ? '#C8203D' : p.color;
        ctx.stroke();
      } else if (p.shape === 'dot') {
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.rect(-5, -2.6, 10, 5.2);
        ctx.fill();
      }
      ctx.restore();
    }

    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const f = dt * 60;
      ctx.clearRect(0, 0, cv.width, cv.height);
      const h = window.innerHeight + 40;
      parts = parts.filter(p => {
        p.age += dt;
        if (p.age > p.life || p.y > h) return false;
        p.vy += p.g * f;
        p.vx *= Math.pow(p.drag, f); p.vy *= Math.pow(p.drag, f);
        p.sway += 0.08 * f;
        p.x += (p.vx + (p.swayAmp || 0) * Math.sin(p.sway)) * f;
        p.y += p.vy * f;
        p.rot += p.vr * f;
        p.flip += p.vflip * f;
        const fade = Math.min(1, (p.life - p.age) / 0.35);
        ctx.globalAlpha = Math.max(0, fade);
        drawShape(p);
        return true;
      });
      ctx.globalAlpha = 1;
      if (parts.length) raf = requestAnimationFrame(tick);
      else { raf = 0; ctx.clearRect(0, 0, cv.width, cv.height); hide(); }
    }

    return {
      // A little splash where something lands
      burst(x, y, n = 24, power = 1, shapes) {
        if (reduceMotion.matches) return;
        for (let i = 0; i < n; i++) {
          const a = rand(-Math.PI, 0) + rand(-0.5, 0.5);
          const sp = rand(2.2, 6.5) * power;
          spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5 * power, size: rand(6, 11) * Math.max(0.7, power), life: rand(0.8, 1.4), shape: shapes ? pick(shapes) : pick(SHAPES), g: 0.2 });
        }
        run();
      },
      // The big finish: confetti falls from the top of the screen
      rain(n = 190) {
        if (reduceMotion.matches) return;
        const w = window.innerWidth;
        for (let i = 0; i < n; i++) {
          spawn({ x: rand(0, w), y: rand(-window.innerHeight * 0.6, -10), vx: rand(-1.5, 1.5), vy: rand(1, 4), g: 0.05, drag: 0.992, life: rand(3.2, 5.2), swayAmp: rand(0.3, 1.2), size: rand(8, 15) });
        }
        // and two cannons from the bottom corners
        [[0, 1], [w, -1]].forEach(([x0, dir]) => {
          for (let i = 0; i < 40; i++) {
            const th = rand(0.2, 0.62); // angle away from straight up, toward the middle
            const sp = rand(10, 17) * Math.min(1.25, Math.max(0.8, window.innerHeight / 800));
            spawn({ x: x0, y: window.innerHeight + 5, vx: dir * sp * Math.sin(th), vy: -sp * Math.cos(th), g: 0.22, life: rand(2.2, 3.4), size: rand(8, 14) });
          }
        });
        run();
      },
      raise() { if (raf) show(); },
      resize() { if (raf) size(); }
    };
  })();
  window.addEventListener('resize', () => confetti.resize());

  // ------------------------------------------------------------------
  // Text: answers with semicolons read better as short lines
  // ------------------------------------------------------------------
  const fragsOf = label => String(label).split(/;\s*/).map(s => s.trim()).filter(Boolean);
  function fillText(node, label) {
    node.textContent = '';
    const fr = fragsOf(label);
    node.classList.toggle('multi', fr.length > 1);
    fr.forEach(f => { const s = document.createElement('span'); s.className = 'frag'; s.textContent = f; node.appendChild(s); });
  }

  // ------------------------------------------------------------------
  // Building the board: one table, built once
  // ------------------------------------------------------------------
  const CHECK_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
  const CHEV_SVG = '<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6l4.5 4.5L12.5 6"/></svg>';
  const cellEls = new Map();
  const heads = [];  // heads[col] = { th, countText, fill }
  const jumps = [];  // jumps[col] = button in the jump bar
  let corner = null;

  function buildBoard() {
    el.board.innerHTML = '';
    const t = document.createElement('table');
    t.className = 'grid';
    t.style.setProperty('--n', DIS.length);
    t.setAttribute('aria-label', 'Developmental disorders');
    const cg = document.createElement('colgroup');
    const cc = document.createElement('col'); cc.className = 'c-crit'; cg.appendChild(cc);
    DIS.forEach(() => cg.appendChild(document.createElement('col')));
    t.appendChild(cg);

    const hr = t.createTHead().insertRow();
    corner = document.createElement('th');
    corner.className = 'corner';
    corner.scope = 'col';
    corner.textContent = 'Criteria';
    hr.appendChild(corner);
    DIS.forEach(d => {
      const th = document.createElement('th');
      th.className = 'dis';
      th.scope = 'col';
      th.dataset.col = d.idx;
      const name = document.createElement('span');
      name.className = 'dis-name';
      name.textContent = d.name;
      const meta = document.createElement('span');
      meta.className = 'dis-meta';
      const count = document.createElement('span');
      count.className = 'dis-count';
      count.innerHTML = CHECK_SVG;
      const countText = document.createElement('span');
      count.appendChild(countText);
      const vessel = document.createElement('span');
      vessel.className = 'vessel';
      vessel.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('span');
      vessel.appendChild(fill);
      meta.append(count, vessel);
      th.append(name, meta);
      hr.appendChild(th);
      heads.push({ th, countText, fill });
    });

    const tb = t.createTBody();
    ROWS.forEach(row => {
      const tr = tb.insertRow();
      if (row.given) tr.className = 'row-given';
      const th = document.createElement('th');
      th.className = 'crit';
      th.scope = 'row';
      th.textContent = critText(row.crit);
      if (row.given) {
        const note = document.createElement('span');
        note.className = 'crit-note';
        note.textContent = 'Same for all, filled in';
        th.appendChild(note);
      }
      tr.appendChild(th);
      row.cells.forEach(c => {
        const td = tr.insertCell();
        if (c.given) {
          const s = document.createElement('span');
          s.className = 'given';
          fillText(s, c.label);
          td.appendChild(s);
          return;
        }
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cell empty';
        b.dataset.cell = c.id;
        b.setAttribute('aria-haspopup', 'listbox');
        b.setAttribute('aria-expanded', 'false');
        const text = document.createElement('span');
        text.className = 'cell-text';
        b.appendChild(text);
        b.insertAdjacentHTML('beforeend', CHEV_SVG);
        b.textEl = text;
        b.shown = null;
        td.appendChild(b);
        cellEls.set(c.id, b);
      });
    });
    el.board.appendChild(t);
  }

  // One button per disorder: scrolls the table to its column
  function buildJumps() {
    el.jumpBar.innerHTML = '';
    DIS.forEach(d => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'jump';
      b.dataset.col = d.idx;
      b.title = d.name;
      const name = document.createElement('span');
      name.className = 'jump-name';
      name.textContent = d.short;
      const fill = document.createElement('span');
      fill.className = 'jump-fill';
      fill.setAttribute('aria-hidden', 'true');
      b.insertAdjacentHTML('afterbegin', CHECK_SVG);
      b.append(name, fill);
      b.fillEl = fill;
      el.jumpBar.appendChild(b);
      jumps.push(b);
    });
  }

  function scrollToCol(ci, smooth = true) {
    const th = heads[ci] && heads[ci].th;
    if (!th) return;
    const br = el.board.getBoundingClientRect();
    const dx = th.getBoundingClientRect().left - (br.left + corner.offsetWidth) - 1;
    el.board.scrollBy({ left: dx, behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto' });
  }

  // Which columns are on screen (lights up their jump buttons)
  let viewRaf = 0;
  function markInView() {
    viewRaf = 0;
    if (!corner) return; // the table isn't built yet
    const br = el.board.getBoundingClientRect();
    const left = br.left + corner.offsetWidth, right = br.right;
    let first = null;
    heads.forEach((h, ci) => {
      const r = h.th.getBoundingClientRect();
      const seen = Math.min(r.right, right) - Math.max(r.left, left);
      const on = seen > r.width * 0.5;
      jumps[ci].classList.toggle('inview', on);
      if (on && first == null) first = ci;
    });
    // Keep the lit buttons visible in the bar (it scrolls sideways on small screens)
    if (first != null && el.jumpBar.scrollWidth > el.jumpBar.clientWidth) {
      const jb = el.jumpBar.getBoundingClientRect(), r = jumps[first].getBoundingClientRect();
      if (r.left < jb.left || r.right > jb.right) el.jumpBar.scrollLeft += r.left - jb.left - 8;
    }
  }
  const queueInView = () => { if (!viewRaf) viewRaf = requestAnimationFrame(markInView); };

  // ------------------------------------------------------------------
  // The full table (study view); printed in slices of five disorders per page
  // ------------------------------------------------------------------
  function studyTable(cols, cls) {
    const t = document.createElement('table');
    t.className = 'study ' + (cls || '');
    t.style.setProperty('--n', cols.length);
    const cg = document.createElement('colgroup');
    const cc = document.createElement('col'); cc.className = 'c-crit'; cg.appendChild(cc);
    cols.forEach(() => cg.appendChild(document.createElement('col')));
    t.appendChild(cg);
    const hr = t.createTHead().insertRow();
    const c0 = document.createElement('th');
    c0.className = 'corner';
    c0.textContent = 'Criteria';
    hr.appendChild(c0);
    cols.forEach(d => { const th = document.createElement('th'); th.textContent = d.name; hr.appendChild(th); });
    const tb = t.createTBody();
    ROWS.forEach(row => {
      const tr = tb.insertRow();
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = critText(row.crit);
      tr.appendChild(th);
      cols.forEach(d => {
        const c = row.cells[d.idx];
        const td = tr.insertCell();
        if (c.key === 'not specified') td.className = 'ns';
        fillText(td, c.label);
      });
    });
    return t;
  }
  function buildStudy() {
    el.tableWrap.innerHTML = '';
    el.tableWrap.appendChild(studyTable(DIS, 'study-screen'));
    const print = document.createElement('div');
    print.className = 'study-print';
    for (let i = 0; i < DIS.length; i += 5) print.appendChild(studyTable(DIS.slice(i, i + 5), 'study-slice'));
    el.tableWrap.appendChild(print);
  }
  function openTable() {
    el.tableWrap.scrollTop = 0; el.tableWrap.scrollLeft = 0;
    if (!el.tableDialog.open) el.tableDialog.showModal();
  }
  el.tableClose.addEventListener('click', () => el.tableDialog.close());
  el.tableDone.addEventListener('click', () => el.tableDialog.close());
  el.tablePrint.addEventListener('click', () => window.print());
  el.btnStudy.addEventListener('click', openTable);

  // ------------------------------------------------------------------
  // Game state
  // ------------------------------------------------------------------
  let S = null;
  let seq = 0;

  function newState(mode) {
    const cells = new Map();
    PLAYABLE.forEach(c => cells.set(c.id, { value: null, locked: false, wrong: false, revealed: false, tried: new Set(), seq: 0 }));
    return {
      mode,
      nick: cleanNick(savedNick()),
      cells,
      openCell: null, lastCell: null, viaKey: false, hintKey: null,
      doneCols: new Set(),
      mistakes: 0, hints: 0, streak: 0, bestStreak: 0,
      startedAt: 0, elapsed: 0, running: false, finished: false,
      checks: 0, firstScore: null
    };
  }

  const st = c => S.cells.get(c.id);
  const lockedCount = list => list.filter(c => st(c).locked).length;
  const filledCount = list => list.filter(c => st(c).locked || st(c).value).length;
  const colDone = ci => colCells(ci).every(c => st(c).locked);
  const shownCount = list => (S.mode === 'test' && !S.finished ? filledCount(list) : lockedCount(list));
  // Cells a hint (or the next-cell jump) can go to
  const open = c => { const s = st(c); return !s.locked && !s.revealed && (S.mode === 'practice' || !s.value || s.wrong); };

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------
  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(r).padStart(2, '0');
  }
  const elapsed = () => S.running ? Date.now() - S.startedAt : S.elapsed;

  function renderCells() {
    PLAYABLE.forEach(c => {
      const s = st(c);
      const b = cellEls.get(c.id);
      let label = null, state;
      if (s.locked) { label = c.label; state = 'correct'; }
      else if (s.revealed) { label = c.label; state = 'revealed'; }
      else if (s.value) { label = labelOf(c, s.value); state = s.wrong ? 'wrong' : 'placed'; }
      else state = 'empty';
      const shown = label == null ? '' : label;
      if (b.shown !== shown) {
        if (label == null) {
          b.textEl.textContent = '';
          b.textEl.classList.remove('multi');
          const ph = document.createElement('span');
          ph.className = 'placeholder';
          ph.textContent = 'Choose…';
          b.textEl.appendChild(ph);
        } else fillText(b.textEl, label);
        b.shown = shown;
      }
      ['empty', 'placed', 'correct', 'wrong', 'revealed'].forEach(k => b.classList.toggle(k, k === state));
      const isOpen = S.openCell === c.id;
      b.classList.toggle('open', isOpen);
      b.setAttribute('aria-expanded', String(isOpen));
      b.setAttribute('aria-disabled', String(!S.running || s.locked || s.revealed));
      const where = `${rowOf(c).crit}, ${disorderOf(c).name}`;
      let aria;
      if (state === 'correct') aria = `${where}: ${c.label}. Correct.`;
      else if (state === 'revealed') aria = `${where}: ${c.label}. Answer shown.`;
      else if (state === 'wrong') aria = `${where}: ${label}. Wrong, choose again.`;
      else if (state === 'placed') aria = `${where}: ${label}. Choose to change.`;
      else aria = `${where}: empty. Choose an answer.`;
      b.setAttribute('aria-label', aria);
    });
    heads.forEach((h, ci) => {
      const list = colCells(ci);
      const locked = lockedCount(list);
      const complete = locked === list.length && list.length > 0;
      const pct = (list.length ? locked / list.length * 100 : 0) + '%';
      h.countText.textContent = complete ? 'Done' : `${shownCount(list)}/${list.length}`;
      h.fill.style.width = pct;
      h.th.classList.toggle('complete', complete);
      h.th.classList.toggle('revealed-col', list.some(c => st(c).revealed));
      const j = jumps[ci];
      j.fillEl.style.width = pct;
      j.classList.toggle('done', complete);
      j.setAttribute('aria-label', `${DIS[ci].name}: ${complete ? 'complete' : `${shownCount(list)} of ${list.length}`}`);
    });
  }

  function renderStats() {
    const done = lockedCount(PLAYABLE);
    el.time.textContent = fmtTime(elapsed());
    el.score.textContent = fmtTime(scoreOf(elapsed(), S.mistakes, S.hints));
    el.mistakes.textContent = S.mode === 'test' && S.checks === 0 ? '–' : S.mistakes;
    el.hints.textContent = S.hints;
    el.progress.style.width = (done / TOTAL * 100) + '%';
    el.matchCount.textContent = S.mode === 'test' && !S.finished
      ? `${filledCount(PLAYABLE)} of ${TOTAL} filled`
      : `${done} of ${TOTAL} right`;
    el.modeLine.textContent = (S.nick ? S.nick + ' playing ' : '') + boardLabel(S.mode) + ' · 14 disorders';
    el.btnCheck.hidden = S.mode !== 'test';
    el.btnCheck.disabled = !S.running || !PLAYABLE.some(c => { const s = st(c); return s.value && !s.locked && !s.wrong; });
    el.btnHint.disabled = !S.running;
    el.btnReveal.disabled = !S.running;
    const showStreak = S.mode === 'practice' && S.running && S.streak >= 2;
    el.streak.hidden = !showStreak;
    if (showStreak) {
      el.streakText.innerHTML = `${S.streak}<span class="lg"> in a row</span>`;
      el.streak.classList.toggle('hot', S.streak >= 5);
    }
  }

  function render() { renderCells(); renderStats(); }

  setInterval(() => {
    if (!S || !S.running) return;
    el.time.textContent = fmtTime(elapsed());
    el.score.textContent = fmtTime(scoreOf(elapsed(), S.mistakes, S.hints));
  }, 250);

  // ------------------------------------------------------------------
  // Feedback helpers
  // ------------------------------------------------------------------
  let toastTimer = 0;
  function toast(msg, ms = 2400, good = false) {
    el.toast.textContent = msg;
    el.toast.classList.toggle('good', !!good);
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), ms);
  }
  function flash(node, cls, safety = 4000) {
    if (!node) return;
    node.classList.remove(cls);
    void node.offsetWidth; // restart the animation
    node.classList.add(cls);
    const off = () => { node.classList.remove(cls); node.removeEventListener('animationend', onEnd); clearTimeout(t); };
    const onEnd = e => { if (e.target === node) off(); };
    node.addEventListener('animationend', onEnd);
    const t = setTimeout(off, safety);
  }
  let thumpTimer = 0;
  function thump() {
    el.mark.classList.remove('thump');
    void el.mark.getBoundingClientRect();
    el.mark.classList.add('thump');
    clearTimeout(thumpTimer);
    thumpTimer = setTimeout(() => el.mark.classList.remove('thump'), 700);
  }
  const centerOf = node => { const r = node.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const onScreen = node => {
    if (!corner) return false;
    const r = node.getBoundingClientRect(), br = el.board.getBoundingClientRect();
    return r.right > br.left + corner.offsetWidth && r.left < br.right && r.bottom > br.top && r.top < br.bottom;
  };

  const STREAK_LINES = {
    3: 'Three in a row!',
    5: 'Five in a row! Board-ready.',
    10: 'Ten in a row! Textbook pathology.',
    15: 'Fifteen in a row! You could teach this.',
    20: 'Twenty in a row! Unstoppable.',
    25: 'Twenty-five in a row! Is this even fair?',
    30: 'Thirty in a row! Legendary.',
    40: 'Forty in a row! The examiners are nervous.',
    50: 'Fifty in a row! Absolutely flawless.'
  };

  // ------------------------------------------------------------------
  // The dropdown list
  // ------------------------------------------------------------------
  function choiceButtons() { return [...el.menuList.querySelectorAll('.choice:not([disabled]), .menu-clear')]; }

  function buildMenu(c) {
    const s = st(c);
    el.menuTitle.innerHTML = '';
    el.menuTitle.append(rowOf(c).crit, Object.assign(document.createElement('b'), { textContent: disorderOf(c).name }));
    el.menuList.innerHTML = '';
    el.menuList.setAttribute('aria-label', `${rowOf(c).crit} for ${disorderOf(c).name}`);
    rowOf(c).options.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.setAttribute('role', 'option');
      b.dataset.key = o.key;
      const n = document.createElement('span');
      n.className = 'choice-n';
      n.textContent = i < 9 ? String(i + 1) : '';
      const t = document.createElement('span');
      t.className = 'choice-text';
      fillText(t, o.label);
      b.append(n, t);
      const tried = S.mode === 'practice' && s.tried.has(o.key);
      if (tried) { b.classList.add('tried'); b.disabled = true; n.textContent = '×'; b.setAttribute('aria-label', `${o.label} (not this one)`); }
      b.setAttribute('aria-selected', String(S.mode === 'test' && s.value === o.key));
      if (S.hintKey === c.id + '|' + o.key) b.classList.add('hinted');
      el.menuList.appendChild(b);
    });
    if (S.mode === 'test' && s.value) {
      const clr = document.createElement('button');
      clr.type = 'button';
      clr.className = 'link-btn menu-clear';
      clr.textContent = 'Clear this cell';
      const wrap = document.createElement('div');
      wrap.className = 'menu-foot';
      wrap.appendChild(clr);
      el.menuList.appendChild(wrap);
    }
  }

  function setMenuMsg(text, good) {
    el.menuMsg.textContent = text || '';
    el.menuMsg.hidden = !text;
    el.menuMsg.classList.toggle('good', !!good);
  }

  function positionMenu({ fromScroll = false } = {}) {
    if (!S || !S.openCell) return;
    const m = el.menu;
    if (phone.matches) { m.style.left = ''; m.style.top = ''; m.style.width = ''; m.style.maxHeight = ''; m.classList.remove('above'); return; }
    const b = cellEls.get(S.openCell);
    const r = b.getBoundingClientRect();
    const br = el.board.getBoundingClientRect();
    // The cell scrolled out of sight: let the list go
    if (fromScroll && (r.bottom < br.top + 20 || r.top > br.bottom - 10 || r.right < br.left + corner.offsetWidth + 20 || r.left > br.right - 20)) { closeMenu({ refocus: false }); return; }
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(480, Math.max(340, r.width + 80), vw - 24);
    m.style.width = w + 'px';
    m.style.maxHeight = Math.round(vh * 0.66) + 'px';
    const h = m.offsetHeight;
    const below = vh - r.bottom - 14, above = r.top - 14;
    const down = below >= Math.min(h, 320) || below >= above;
    const maxH = Math.max(180, Math.min(vh * 0.66, down ? below : above));
    m.style.maxHeight = Math.round(maxH) + 'px';
    const hh = Math.min(h, maxH);
    const left = Math.min(Math.max(12, r.left), vw - w - 12);
    m.style.left = Math.round(left) + 'px';
    m.style.top = Math.round(down ? r.bottom + 6 : r.top - 6 - hh) + 'px';
    m.classList.toggle('above', !down);
  }

  function openMenu(c, { viaKey = false, focusKey = null } = {}) {
    if (!S || !S.running) return;
    const s = st(c);
    if (s.locked || s.revealed) return;
    if (S.openCell && S.openCell !== c.id) closeMenu({ refocus: false, keepHint: true });
    S.openCell = c.id;
    S.lastCell = c.id;
    S.viaKey = viaKey;
    buildMenu(c);
    if (!S.hintKey || !S.hintKey.startsWith(c.id + '|')) setMenuMsg('');
    // Bring the cell into view first; on a phone, up top so the sheet doesn't cover it
    const cb = cellEls.get(c.id);
    cb.scrollIntoView(phone.matches ? { block: 'start', inline: 'nearest' } : { block: 'nearest', inline: 'nearest' });
    el.menu.hidden = false;
    el.menuScrim.hidden = false;
    document.body.classList.add('menu-open');
    renderCells();
    positionMenu();
    el.menuList.scrollTop = 0;
    // Keyboard and hints land on an answer (the hinted, current or first one);
    // a tap or click just opens the list, so nothing looks chosen already
    const btns = choiceButtons();
    const target = (focusKey && btns.find(b => b.dataset.key === focusKey))
      || (viaKey && (btns.find(b => b.getAttribute('aria-selected') === 'true') || btns[0]));
    if (target) {
      target.focus({ preventScroll: true });
      if (target.scrollIntoView) target.scrollIntoView({ block: 'nearest' });
    } else el.menuList.focus({ preventScroll: true });
  }

  function closeMenu({ refocus = true, keepHint = false } = {}) {
    if (!S || !S.openCell) return;
    const id = S.openCell;
    S.openCell = null;
    if (!keepHint) S.hintKey = null;
    el.menu.hidden = true;
    el.menuScrim.hidden = true;
    document.body.classList.remove('menu-open');
    setMenuMsg('');
    renderCells();
    if (refocus) { const b = cellEls.get(id); if (b) b.focus({ preventScroll: true }); }
  }

  // Next cell to fill after this one, in reading order
  function nextCell(c) {
    const i = PLAYABLE.indexOf(c);
    for (let k = 1; k <= PLAYABLE.length; k++) {
      const x = PLAYABLE[(i + k) % PLAYABLE.length];
      if (open(x) && (S.mode === 'practice' || !st(x).value)) return x;
    }
    return null;
  }
  function focusNext(c) {
    const n = nextCell(c);
    if (!n) return;
    const b = cellEls.get(n.id);
    b.focus({ preventScroll: true });
    b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  // ------------------------------------------------------------------
  // Choosing an answer
  // ------------------------------------------------------------------
  function choose(c, key) {
    if (!S.running) return;
    const s = st(c);
    if (s.locked || s.revealed) return;
    const b = cellEls.get(c.id);
    const viaKey = S.viaKey;

    if (S.mode === 'practice') {
      if (key !== c.key) {
        if (s.tried.has(key)) return;
        s.tried.add(key);
        S.mistakes++; S.streak = 0;
        sound.wrong();
        const owners = rowOf(c).cells.filter(x => x.key === key).map(x => DIS[x.col].name);
        buildMenu(c);
        setMenuMsg(owners.length ? `Not quite. That one belongs to ${listNames(owners)}.` : 'Not quite.');
        positionMenu();
        flash(el.menuList, 'shake');
        flash(b, 'shake');
        const btns = choiceButtons();
        if (viaKey && btns[0]) btns[0].focus({ preventScroll: true });
        else el.menuList.focus({ preventScroll: true });
        renderStats();
        return;
      }
      s.value = key; s.locked = true; s.seq = ++seq;
      S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak);
      closeMenu({ refocus: false });
      sound.correct();
      thump();
      render();
      flash(b, 'flow');
      const [x, y] = centerOf(b);
      confetti.burst(x, y, 8, 0.55, ['dot', 'heart', 'paper']);
      if (S.streak >= 2 && !el.streak.hidden) flash(el.streak, 'bump');
      const sline = STREAK_LINES[S.streak] || (S.streak > 50 && S.streak % 10 === 0 ? `${S.streak} in a row!` : '');
      const celebrated = afterLocks([c], { streakLine: sline });
      if (!celebrated && sline) {
        sound.sparkle();
        const [sx, sy] = centerOf(el.streak.hidden ? b : el.streak);
        confetti.burst(sx, sy, 16, 0.8, ['paper', 'dot', 'heart']);
        toast(sline, 2400, true);
      }
      if (viaKey && S.running) focusNext(c);
      return;
    }

    // Test mode: anything goes until you check
    s.value = key; s.wrong = false; s.seq = ++seq;
    closeMenu({ refocus: false });
    sound.place();
    render();
    flash(b, 'pop');
    if (viaKey) focusNext(c);
    else b.focus({ preventScroll: true });
  }

  // Newly finished disorders get their moment; returns true if anything was celebrated
  function afterLocks(cells, { streakLine = '', quiet = false } = {}) {
    const newCols = [...new Set(cells.map(c => c.col))].filter(ci => !S.doneCols.has(ci) && colDone(ci));
    newCols.forEach(ci => S.doneCols.add(ci));
    const allDone = PLAYABLE.every(c => st(c).locked);

    newCols.forEach((ci, i) => setTimeout(() => {
      const h = heads[ci];
      flash(h.th, 'beat');
      flash(jumps[ci], 'pop');
      if (!quiet && onScreen(h.th)) {
        const [x, y] = centerOf(h.th);
        confetti.burst(x, y, 26, 1, ['heart', 'heart', 'tooth', 'paper']);
      }
    }, 250 + i * 120));

    if (allDone) { setTimeout(finish, quiet ? 600 : 500); return true; }
    if (newCols.length && !quiet) {
      sound.chime();
      const names = newCols.map(ci => DIS[ci].name);
      toast(`${listNames(names)}: complete!${streakLine ? ' ' + streakLine : ''}`, 2600, true);
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------------
  // Input: cells, the list, the jump bar, keyboard
  // ------------------------------------------------------------------
  el.board.addEventListener('click', e => {
    const b = e.target.closest('.cell');
    if (!b || !S || !S.running) return;
    const c = cellById.get(b.dataset.cell);
    if (st(c).locked) return;
    if (S.openCell === c.id) { closeMenu(); return; }
    openMenu(c, { viaKey: e.detail === 0 });
  });

  el.menuList.addEventListener('click', e => {
    if (!S || !S.openCell) return;
    const c = cellById.get(S.openCell);
    if (e.target.closest('.menu-clear')) {
      const s = st(c);
      s.value = null; s.wrong = false;
      closeMenu();
      render();
      return;
    }
    const b = e.target.closest('.choice');
    if (!b || b.disabled) return;
    choose(c, b.dataset.key);
  });
  el.menuX.addEventListener('click', () => closeMenu());
  el.menuScrim.addEventListener('click', () => closeMenu({ refocus: false }));
  document.addEventListener('pointerdown', e => {
    if (!S || !S.openCell) return;
    if (el.menu.contains(e.target) || e.target === el.menuScrim) return;
    const cell = e.target.closest && e.target.closest('.cell');
    if (cell && cell.dataset.cell === S.openCell) return; // its own click toggles it
    closeMenu({ refocus: false });
  }, true);
  el.board.addEventListener('scroll', () => { if (S && S.openCell) positionMenu({ fromScroll: true }); queueInView(); }, { passive: true });
  window.addEventListener('resize', () => { if (S && S.openCell) positionMenu(); queueInView(); });

  el.jumpBar.addEventListener('click', e => {
    const b = e.target.closest('.jump');
    if (!b) return;
    closeMenu({ refocus: false });
    scrollToCol(+b.dataset.col);
  });

  el.menu.addEventListener('keydown', e => {
    if (!S || !S.openCell) return;
    const btns = choiceButtons();
    const i = btns.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!btns.length) return;
      const n = e.key === 'ArrowDown' ? (i + 1) % btns.length : (i <= 0 ? btns.length - 1 : i - 1);
      btns[n].focus();
      btns[n].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const t = e.key === 'Home' ? btns[0] : btns[btns.length - 1];
      if (t) t.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      closeMenu();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      closeMenu();
    } else if (/^[1-9]$/.test(e.key)) {
      const b = el.menuList.querySelectorAll('.choice')[+e.key - 1];
      if (b && !b.disabled) { e.preventDefault(); S.viaKey = true; choose(cellById.get(S.openCell), b.dataset.key); }
    }
  });

  // Arrow keys move between cells, like a spreadsheet
  el.board.addEventListener('keydown', e => {
    const b = e.target.closest && e.target.closest('.cell');
    if (!b || !S) return;
    const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const d = dirs[e.key];
    if (!d) return;
    e.preventDefault();
    const c = cellById.get(b.dataset.cell);
    let r = c.row, col = c.col;
    for (let k = 0; k < 30; k++) {
      r += d[0]; col += d[1];
      if (r < 0 || r >= ROWS.length || col < 0 || col >= DIS.length) return;
      const x = ROWS[r].cells[col];
      if (!x.given) { const nb = cellEls.get(x.id); nb.focus({ preventScroll: true }); nb.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && S && S.openCell && !document.querySelector('dialog[open]')) closeMenu();
  });

  // ------------------------------------------------------------------
  // Hints
  // ------------------------------------------------------------------
  el.btnHint.addEventListener('click', () => {
    if (!S.running) return;
    const cands = PLAYABLE.filter(open);
    if (!cands.length) {
      toast(S.mode === 'test' ? 'Every cell is filled. Check your answers.' : 'Nothing left to fill.');
      return;
    }
    // The cell she was just on, else one already on screen, else the first one left
    const pick = [S.openCell, S.lastCell].map(id => id && cellById.get(id)).find(c => c && open(c))
      || cands.find(c => onScreen(cellEls.get(c.id)))
      || cands[0];
    S.hints++;
    S.hintKey = pick.id + '|' + pick.key;
    openMenu(pick, { focusKey: pick.key });
    setMenuMsg('Hint: the right answer is pulsing.', true);
    flash(cellEls.get(pick.id), 'hinted');
    renderStats();
  });

  // ------------------------------------------------------------------
  // Check answers (test mode)
  // ------------------------------------------------------------------
  el.btnCheck.addEventListener('click', () => {
    if (!S.running) return;
    closeMenu({ refocus: false });
    // Cells already marked wrong and left unchanged aren't graded (or charged) twice
    const placed = PLAYABLE.filter(c => { const s = st(c); return s.value && !s.locked && !s.wrong; });
    const correct = placed.filter(c => st(c).value === c.key);
    const wrong = placed.filter(c => st(c).value !== c.key);
    correct.forEach(c => { const s = st(c); s.locked = true; s.wrong = false; });
    wrong.forEach(c => { st(c).wrong = true; });
    S.checks++;
    S.mistakes += wrong.length;
    if (S.firstScore == null) S.firstScore = correct.length;
    render();
    correct.filter(c => onScreen(cellEls.get(c.id))).forEach((c, i) => setTimeout(() => flash(cellEls.get(c.id), 'flow'), Math.min(i * 30, 1200)));
    afterLocks(correct, { quiet: true });
    if (PLAYABLE.every(c => st(c).locked)) return; // finish() takes it from here
    if (correct.length) sound.correct(); else sound.wrong();

    const done = lockedCount(PLAYABLE);
    const empty = PLAYABLE.filter(c => !st(c).value && !st(c).locked).length;
    const wrongNow = PLAYABLE.filter(c => st(c).wrong);
    const pct = Math.round(done / TOTAL * 100);
    const bits = [];
    if (wrongNow.length) bits.push(`${wrongNow.length} ${wrongNow.length === 1 ? 'cell is' : 'cells are'} wrong (marked in amber).`);
    if (empty) bits.push(`${empty} ${empty === 1 ? 'cell is' : 'cells are'} still empty.`);
    setTimeout(() => showResult({
      title: `${done} of ${TOTAL} correct`,
      text: `That’s ${pct}%. Correct cells now fill with red. ${bits.join(' ')}`,
      stats: [['Correct', done], ['Wrong', wrongNow.length], ['Empty', empty], ['Time', fmtTime(elapsed())]],
      best: '',
      actions: [
        { label: 'Show answers', cls: 'btn', fn: () => askReveal() },
        {
          label: wrongNow.length ? 'Try the wrong ones again' : 'Keep going', cls: 'btn btn-primary', fn: () => {
            PLAYABLE.forEach(c => { const s = st(c); if (s.wrong) { s.wrong = false; s.value = null; } });
            render();
            const first = wrongNow[0];
            if (first) cellEls.get(first.id).scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }
        }
      ]
    }), 450);
  });

  // ------------------------------------------------------------------
  // Reveal, finish, results
  // ------------------------------------------------------------------
  function askReveal() {
    confirmBox({
      title: 'Show the answers?',
      text: 'This ends the round without a score. Every cell you haven’t got right yet will be filled in for you.',
      yes: 'Show answers', no: 'Keep playing',
      onYes: reveal
    });
  }
  el.btnReveal.addEventListener('click', () => { if (S.running) askReveal(); });

  function reveal() {
    closeMenu({ refocus: false });
    PLAYABLE.forEach(c => { const s = st(c); if (!s.locked) { s.value = null; s.wrong = false; s.revealed = true; } });
    stopClock();
    S.finished = true;
    render();
    toast('Answers shown in gray italics. Start a new game to try again.', 3400);
  }

  function stopClock() {
    if (S.running) { S.elapsed = Date.now() - S.startedAt; S.running = false; }
  }

  function finish() {
    if (S.finished) return;
    closeMenu({ refocus: false });
    stopClock();
    S.finished = true;
    render();
    const time = Math.round(S.elapsed);
    const score = scoreOf(time, S.mistakes, S.hints);
    const run = { nickname: S.nick, mode: S.mode, scope: SCOPE, time_ms: time, mistakes: S.mistakes, hints: S.hints };

    // Every finished run is kept on this device too (and powers the offline leaderboard)
    const key = nickKey(S.nick);
    const local = store.get('runs', []);
    const prevBest = local
      .filter(r => nickKey(r.nickname) === key && r.mode === run.mode && r.scope === SCOPE)
      .reduce((m, r) => Math.min(m, r.score_ms), Infinity);
    local.push(Object.assign({}, run, { score_ms: score, at: new Date().toISOString() }));
    store.set('runs', local.slice(-300));

    const extras = [];
    if (S.mistakes) extras.push(`${S.mistakes * MISTAKE_PENALTY_MS / 1000} seconds for ${plural(S.mistakes, 'mistake')}`);
    if (S.hints) extras.push(`${S.hints * HINT_PENALTY_MS / 1000} seconds for ${plural(S.hints, 'hint')}`);
    const breakdown = extras.length
      ? `Your score is ${fmtTime(score)}: ${fmtTime(time)} on the clock, plus ${extras.join(' and ')}.`
      : `Your score is ${fmtTime(score)}, with no mistakes and no hints.`;
    const who = S.nick ? ', ' + S.nick : '';
    let lead;
    if (S.mode === 'practice') {
      lead = S.mistakes === 0
        ? `A perfect game${who}! All ${TOTAL} cells filled without a single mistake.`
        : `Brilliant work${who}. All ${TOTAL} cells are filled in, and your longest streak was ${S.bestStreak} in a row.`;
    } else {
      lead = S.firstScore === TOTAL
        ? `Every cell was right on the first check${who}!`
        : `All ${TOTAL} cells are right${who}; ${S.firstScore} were right on the first check.`;
    }

    const show = () => {
      showResult({
        mascot: true,
        title: 'The table is complete!',
        text: `${lead} ${breakdown}`,
        stats: [['Score', fmtTime(score)], ['Time', fmtTime(time)], ['Mistakes', S.mistakes], ['Hints', S.hints]],
        best: lb.on ? 'Saving your score to the leaderboard…' : localBestLine(prevBest, score),
        actions: [
          { label: 'See the full table', cls: 'btn', fn: openTable, keepOpen: true },
          { label: 'Leaderboard', cls: 'btn', fn: () => openBoard(run.mode) },
          { label: 'Play again', cls: 'btn btn-primary', fn: () => openIntro() }
        ]
      });
      confetti.raise();
      if (lb.on) submitRun(run, score, prevBest);
    };
    celebrate(show);
  }

  // A heartbeat runs across the table, then the confetti falls
  function celebrate(done) {
    sound.finish();
    if (reduceMotion.matches) { done(); return; }
    [0, 850].forEach(b0 => heads.forEach((h, i) => setTimeout(() => flash(h.th, 'beat'), b0 + i * 45)));
    PLAYABLE.filter(c => onScreen(cellEls.get(c.id))).forEach(c => setTimeout(() => flash(cellEls.get(c.id), 'glow'), c.col * 45 + c.row * 40));
    setTimeout(() => confetti.rain(), 500);
    setTimeout(done, 1900);
  }

  function localBestLine(prevBest, score) {
    if (!isFinite(prevBest)) return 'Your first finished table on this board. That’s the score to beat.';
    if (score < prevBest) return `Your best score yet on this board. Previous best: ${fmtTime(prevBest)}.`;
    return `Your best on this board is ${fmtTime(prevBest)}.`;
  }

  async function submitRun(run, score, prevLocalBest) {
    const line = el.resultBest;
    if (run.time_ms < MIN_TIME_MS) { line.textContent = localBestLine(prevLocalBest, score); return; }
    try {
      const board = await lb.board(run.mode) || [];
      await lb.submit(run);
      const key = nickKey(run.nickname);
      const mine = board.find(r => r.nickname_key === key);
      const others = board.filter(r => r.nickname_key !== key);
      const best = mine ? Math.min(mine.score_ms, score) : score;
      const rank = 1 + others.filter(r => r.score_ms < best).length;
      const where = `#${rank} of ${others.length + 1} on the ${boardLabel(run.mode)} leaderboard`;
      if (!mine) line.textContent = `Saved. You’re on the board at ${where}.`;
      else if (score < mine.score_ms) line.textContent = `New personal best. You’re ${where}.`;
      else line.textContent = `Saved. Your best is still ${fmtTime(mine.score_ms)}, ${where}.`;
    } catch (e) {
      if (retryable(e)) {
        queueRun(run);
        line.textContent = notSetUp(e)
          ? `${localBestLine(prevLocalBest, score)} The global leaderboard isn’t switched on yet; your score is saved and will be sent once it is.`
          : 'Couldn’t reach the leaderboard. Your score is saved on this device and will be sent the next time you open the game.';
      } else {
        line.textContent = `The leaderboard didn’t accept this score (${e.message}).`;
      }
    }
  }

  function showResult({ title, text, stats, best, actions, mascot }) {
    el.mascot.hidden = !mascot;
    el.resultTitle.textContent = title;
    el.resultText.textContent = text;
    el.resultStats.innerHTML = '';
    stats.forEach(([k, v]) => {
      const d = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      d.append(dt, dd);
      el.resultStats.appendChild(d);
    });
    el.resultBest.textContent = best || '';
    el.resultActions.innerHTML = '';
    actions.forEach(a => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = a.cls; b.textContent = a.label;
      b.addEventListener('click', () => {
        // "See the full table" opens on top, so the result stays underneath
        if (!a.keepOpen) el.result.close();
        a.fn();
      });
      el.resultActions.appendChild(b);
    });
    if (el.result.open) el.result.close();
    el.result.showModal();
    const primary = el.resultActions.querySelector('.btn-primary');
    if (primary) primary.focus();
  }

  let confirmHandler = null;
  function confirmBox({ title, text, yes, no, onYes }) {
    el.confirmTitle.textContent = title;
    el.confirmText.textContent = text;
    el.confirmYes.textContent = yes;
    el.confirmNo.textContent = no;
    confirmHandler = onYes;
    el.confirm.showModal();
    el.confirmNo.focus();
  }
  el.confirmYes.addEventListener('click', () => { el.confirm.close(); const f = confirmHandler; confirmHandler = null; if (f) f(); });
  el.confirmNo.addEventListener('click', () => { el.confirm.close(); confirmHandler = null; });

  // ------------------------------------------------------------------
  // New game / intro
  // ------------------------------------------------------------------
  const NICK_HINT = 'Use the same nickname every time to keep all your scores together.';
  function openIntro() {
    closeMenu({ refocus: false });
    const prefs = store.get('prefs', { mode: 'practice' });
    el.introForm.elements.mode.value = prefs.mode === 'test' ? 'test' : 'practice';
    el.nickInput.value = cleanNick(savedNick());
    el.nickHint.textContent = NICK_HINT;
    el.nickHint.classList.remove('error');
    if (!el.intro.open) el.intro.showModal();
    (el.nickInput.value ? document.getElementById('btnStart') : el.nickInput).focus();
  }
  el.nickInput.addEventListener('input', () => { el.nickHint.textContent = NICK_HINT; el.nickHint.classList.remove('error'); });
  el.intro.addEventListener('cancel', e => { if (!S || !S.running) e.preventDefault(); });
  el.introForm.addEventListener('submit', e => {
    e.preventDefault();
    const nick = cleanNick(el.nickInput.value);
    if (!nick) {
      el.nickHint.textContent = 'Enter a nickname to start. It’s how your scores show up on the leaderboard.';
      el.nickHint.classList.add('error');
      el.nickInput.focus();
      return;
    }
    const mode = el.introForm.elements.mode.value === 'test' ? 'test' : 'practice';
    store.set('prefs', { mode });
    store.set('nickname', nick);
    el.intro.close();
    startGame(mode);
  });

  el.btnNew.addEventListener('click', () => {
    const inProgress = S && S.running && (PLAYABLE.some(c => st(c).value || st(c).locked) || elapsed() > 15000);
    const go = () => { if (S.running) stopClock(); openIntro(); };
    if (inProgress) confirmBox({ title: 'Start a new game?', text: 'You’ll lose your progress on this table.', yes: 'New game', no: 'Keep playing', onYes: go });
    else go();
  });

  function startGame(mode) {
    closeMenu({ refocus: false });
    S = newState(mode);
    S.running = true;
    S.startedAt = Date.now();
    render();
    el.board.scrollTop = 0; el.board.scrollLeft = 0;
    queueInView();
    sound.ensure(); // unlock audio on this user gesture
    toast(mode === 'practice' ? 'Open a cell and choose its answer.' : 'Fill every cell, then press Check answers.', 3200);
  }

  // Sound toggle
  function renderSound() {
    el.btnSound.setAttribute('aria-pressed', sound.on ? 'true' : 'false');
    el.btnSound.setAttribute('aria-label', sound.on ? 'Sound on' : 'Sound off');
    el.btnSound.title = sound.on ? 'Sound on' : 'Sound off';
  }
  el.btnSound.addEventListener('click', () => { sound.on = !sound.on; store.set('sound', sound.on); renderSound(); if (sound.on) sound.correct(); });

  // ------------------------------------------------------------------
  // Leaderboard dialog
  // ------------------------------------------------------------------
  const boardView = { mode: 'practice', token: 0 };

  function fmtWhen(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' }) +
      ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  const localRuns = () => store.get('runs', []).filter(r => (r.scope || SCOPE) === SCOPE);
  function localBoard(mode) {
    const best = new Map();
    localRuns().filter(r => r.mode === mode).forEach(r => {
      const k = nickKey(r.nickname);
      const cur = best.get(k);
      if (!cur) best.set(k, Object.assign({}, r, { nickname_key: k, runs: 1, created_at: r.at }));
      else {
        cur.runs++;
        if (r.score_ms < cur.score_ms) Object.assign(cur, r, { nickname_key: k, runs: cur.runs, created_at: r.at });
      }
    });
    return [...best.values()].sort((a, b) => a.score_ms - b.score_ms || String(a.created_at).localeCompare(String(b.created_at)));
  }

  function openBoard(mode) {
    boardView.mode = mode || (S ? S.mode : 'practice');
    if (!el.boardDialog.open) el.boardDialog.showModal();
    loadBoard();
  }

  async function loadBoard() {
    const token = ++boardView.token;
    el.boardDialog.querySelectorAll('[data-bmode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bmode === boardView.mode)));
    el.boardBody.innerHTML = '<p class="board-msg">Loading scores…</p>';
    let rows = null, note = '';
    if (lb.on) {
      try { rows = await lb.board(boardView.mode) || []; }
      catch (e) {
        note = notSetUp(e)
          ? 'The global leaderboard for this game isn’t switched on yet, so this shows scores from this device only.'
          : 'Couldn’t reach the leaderboard right now, so this shows scores from this device only.';
      }
    } else {
      note = 'The global leaderboard isn’t connected yet, so this shows scores from this device only.';
    }
    if (token !== boardView.token) return; // a newer tab was chosen meanwhile
    const global = !!rows;
    if (!rows) rows = localBoard(boardView.mode);
    el.boardNote.textContent = note;
    el.boardNote.hidden = !note;
    renderBoard(rows, global);
  }

  function cell(tag, text, cls) {
    const c = document.createElement(tag);
    if (text != null) c.textContent = text;
    if (cls) c.className = cls;
    return c;
  }

  function renderBoard(rows, global) {
    el.boardBody.innerHTML = '';
    if (!rows.length) {
      el.boardBody.appendChild(cell('p', `No scores on the ${boardLabel(boardView.mode)} board yet. Finish a game to be the first.`, 'board-msg'));
      return;
    }
    const me = nickKey(savedNick());
    const table = cell('table', null, 'lb');
    const head = table.createTHead().insertRow();
    [['#', 'num'], ['Player', ''], ['Score', 'num'], ['Time', 'num opt'], ['Mistakes', 'num opt'], ['Hints', 'num opt'], ['Runs', 'num']]
      .forEach(([t, c]) => head.appendChild(cell('th', t, c)));
    const tbody = table.createTBody();
    let rank = 0, prev = null;
    rows.forEach((r, i) => {
      if (r.score_ms !== prev) { rank = i + 1; prev = r.score_ms; }
      const tr = tbody.insertRow();
      if (r.nickname_key === me) tr.className = 'me';
      tr.appendChild(cell('td', rank, 'num rank'));
      const who = cell('td', null, 'who');
      const btn = cell('button', r.nickname, 'player');
      btn.type = 'button';
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', () => togglePlayer(tr, r, global, btn));
      who.appendChild(btn);
      tr.appendChild(who);
      tr.appendChild(cell('td', fmtTime(r.score_ms), 'num score'));
      tr.appendChild(cell('td', fmtTime(r.time_ms), 'num opt'));
      tr.appendChild(cell('td', r.mistakes, 'num opt'));
      tr.appendChild(cell('td', r.hints, 'num opt'));
      tr.appendChild(cell('td', r.runs, 'num'));
    });
    el.boardBody.appendChild(table);
    const mine = el.boardBody.querySelector('tr.me');
    if (mine) mine.scrollIntoView({ block: 'nearest' });
  }

  async function togglePlayer(tr, r, global, btn) {
    const next = tr.nextElementSibling;
    if (next && next.classList.contains('runs-row')) {
      next.remove();
      btn.setAttribute('aria-expanded', 'false');
      return;
    }
    btn.setAttribute('aria-expanded', 'true');
    const row = document.createElement('tr');
    row.className = 'runs-row';
    const td = cell('td', 'Loading runs…');
    td.colSpan = 7;
    row.appendChild(td);
    tr.after(row);
    let runs;
    try {
      runs = global ? (await lb.runs(r.nickname_key) || [])
        : localRuns().filter(x => nickKey(x.nickname) === r.nickname_key).map(x => Object.assign({}, x, { created_at: x.at })).reverse();
    } catch (e) {
      td.textContent = 'Couldn’t load this player’s runs. Try again in a moment.';
      return;
    }
    td.textContent = '';
    td.appendChild(cell('p', `${plural(runs.length, 'run')} by ${r.nickname}${global ? '' : ' on this device'}`, 'runs-title'));
    const t = cell('table', null, 'runs');
    const h = t.createTHead().insertRow();
    [['When', ''], ['Mode', ''], ['Score', 'num'], ['Time', 'num'], ['Mistakes', 'num opt'], ['Hints', 'num opt']].forEach(([x, c]) => h.appendChild(cell('th', x, c)));
    const b = t.createTBody();
    runs.forEach(x => {
      const rr = b.insertRow();
      rr.appendChild(cell('td', fmtWhen(x.created_at)));
      rr.appendChild(cell('td', boardLabel(x.mode)));
      rr.appendChild(cell('td', fmtTime(x.score_ms), 'num score'));
      rr.appendChild(cell('td', fmtTime(x.time_ms), 'num'));
      rr.appendChild(cell('td', x.mistakes, 'num opt'));
      rr.appendChild(cell('td', x.hints, 'num opt'));
    });
    td.appendChild(t);
  }

  el.btnBoard.addEventListener('click', () => openBoard());
  el.boardClose.addEventListener('click', () => el.boardDialog.close());
  el.boardDialog.addEventListener('click', e => { if (e.target === el.boardDialog) el.boardDialog.close(); });
  el.boardDialog.querySelectorAll('[data-bmode]').forEach(b => b.addEventListener('click', () => { boardView.mode = b.dataset.bmode; loadBoard(); }));

  // ------------------------------------------------------------------
  // About
  // ------------------------------------------------------------------
  const aboutDialog = document.getElementById('aboutDialog');
  document.getElementById('btnAbout').addEventListener('click', () => { if (!aboutDialog.open) aboutDialog.showModal(); });
  ['aboutClose', 'aboutDone'].forEach(id => document.getElementById(id).addEventListener('click', () => aboutDialog.close()));
  aboutDialog.addEventListener('click', e => { if (e.target === aboutDialog) aboutDialog.close(); });

  // ------------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------------
  function boot() {
    buildBoard();
    buildJumps();
    buildStudy();
    S = newState('practice');
    S.running = false;
    render();
    renderSound();
    queueInView();
    openIntro();
    flushPending();
    // For a quick check from the console or a test: the numbers the game is built from
    window.DISORDERS_GAME = { disorders: DIS.length, criteria: CRITS.length, cells: TOTAL };
  }

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 1500))]).then(boot);
})();
