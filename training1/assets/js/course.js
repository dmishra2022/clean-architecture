/* Course shell: modules, navigation, progress, quizzes, code highlighting, shared widgets.
   Plain scripts (no modules, no fetch) so index.html works when opened straight from disk. */
(function () {
  const STORAGE_KEY = 'wc-ddd-clean-micronaut-progress-v1';
  const PASS_MARK = 0.8;

  const Course = {
    modules: [],
    sims: {},
    quizzes: {},
    module(def) { this.modules.push(def); },
    sim(name, init) { this.sims[name] = init; },
    quiz(id, questions) { this.quizzes[id] = questions; },
  };
  window.Course = Course;

  // ---------- tiny DOM helper ----------
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      node.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return node;
  }
  Course.el = el;
  Course.escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const attr = (s) => Course.escape(s).replace(/"/g, '&quot;');
  Course.code = (lang, src, file) => `<pre${file ? ` data-file="${attr(file)}"` : ''}><code class="lang-${lang}">${Course.escape(src.replace(/^\n/, '').replace(/\s+$/, ''))}</code></pre>`;
  Course.fig = (name, caption) => `<figure class="diagram"><img src="assets/diagrams/${name}.svg" alt="${attr(caption)}" loading="lazy"><figcaption>${caption} <a href="assets/diagrams/${name}.svg" target="_blank">open full size</a></figcaption></figure>`;

  // ---------- progress ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { done: {}, scores: {} }; } catch { return { done: {}, scores: {} }; }
  }
  function save(state) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* private mode */ } }
  let state = load();
  Course.markDone = (id) => { state.done[id] = true; save(state); renderNav(); };

  // ---------- syntax highlighting (Java, YAML, SQL, shell, JSON) ----------
  const JAVA_KW = /\b(public|private|protected|final|static|class|interface|record|enum|sealed|permits|implements|extends|return|new|if|else|for|while|switch|case|default|throw|throws|try|catch|finally|void|int|long|boolean|double|var|this|null|true|false|import|package|instanceof|yield|break|continue|synchronized)\b/;
  function highlight(code, lang) {
    const src = code.textContent;
    if (lang === 'text') return;
    const comments = {
      sql: /--[^\n]*/y,
      yaml: /#[^\n]*/y,
      shell: /#[^\n]*/y,
    };
    const rules = [
      ['tk-com', comments[lang] || /\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
      ['tk-str', /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/y],
      ['tk-ann', /@[A-Za-z_][\w.]*/y],
      ['tk-num', /\b\d+(?:\.\d+)?[LlDdFf]?\b/y],
      ['tk-kw', new RegExp(JAVA_KW.source + '|\\b(SELECT|FROM|WHERE|UPDATE|INSERT|INTO|SET|VALUES|CREATE|TABLE|PRIMARY|KEY|NOT|NULL|AND|ORDER|BY|LIMIT|FOR|SKIP|LOCKED|REFERENCES|UNIQUE|INDEX|ON|BEGIN|COMMIT|ROLLBACK)\\b', 'y')],
      ['tk-type', /\b[A-Z][A-Za-z0-9_]*\b/y],
    ];
    let out = '';
    let i = 0;
    let plain = '';
    const flush = () => { if (plain) { out += Course.escape(plain); plain = ''; } };
    while (i < src.length) {
      let matched = false;
      for (const [cls, re] of rules) {
        re.lastIndex = i;
        const m = re.exec(src);
        if (m && m.index === i && m[0].length > 0) {
          flush();
          out += `<span class="${cls}">${Course.escape(m[0])}</span>`;
          i += m[0].length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const ch = src[i];
        if (/[A-Za-z0-9_]/.test(ch)) {
          let j = i;
          while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
          plain += src.slice(i, j);
          i = j;
        } else {
          plain += ch;
          i++;
        }
      }
    }
    flush();
    code.innerHTML = out;
  }

  function decorateCode(root) {
    root.querySelectorAll('pre > code').forEach((code) => {
      const pre = code.parentElement;
      const lang = (code.className.match(/lang-(\w+)/) || [])[1] || 'java';
      highlight(code, lang);
      if (pre.dataset.file) pre.prepend(el('span', { class: 'file' }, pre.dataset.file));
      const btn = el('button', { class: 'copy', onclick: () => {
        const flash = (text) => { btn.textContent = text; setTimeout(() => (btn.textContent = 'copy'), 1200); };
        (navigator.clipboard?.writeText(code.textContent) ?? Promise.reject(new Error('no clipboard')))
          .then(() => flash('copied'), () => flash('select & copy'));
      } }, 'copy');
      pre.append(btn);
    });
  }

  // ---------- lightbox for diagrams ----------
  function lightbox(root) {
    let box = document.querySelector('.lightbox');
    if (!box) {
      box = el('div', { class: 'lightbox', onclick: () => box.classList.remove('open') }, el('img', { alt: '' }));
      document.body.append(box);
    }
    root.querySelectorAll('figure.diagram img').forEach((img) => {
      img.addEventListener('click', () => { box.querySelector('img').src = img.src; box.classList.add('open'); });
    });
  }

  // ---------- quiz engine ----------
  function renderQuiz(container, moduleId) {
    const questions = Course.quizzes[container.dataset.quiz];
    if (!questions) { container.textContent = 'Quiz not found: ' + container.dataset.quiz; return; }
    const isFinal = container.dataset.quiz === 'final';
    container.classList.add('quiz');
    container.append(
      el('h4', {}, isFinal ? `Final assessment – ${questions.length} questions` : 'Check your understanding'),
      el('div', { style: 'color: var(--slate); font-size: 14px' }, `Pass mark ${Math.round(PASS_MARK * 100)}%. Passing marks this module complete.`),
    );
    questions.forEach((q, qi) => {
      const block = el('div', { class: 'q' }, el('div', { class: 'q-text', html: `${qi + 1}. ${q.q}` }));
      q.options.forEach((opt, oi) => {
        block.append(el('label', {}, el('input', { type: 'radio', name: `${container.dataset.quiz}-${qi}`, value: oi }), el('span', { html: opt })));
      });
      block.append(el('div', { class: 'explain', html: q.why }));
      container.append(block);
    });
    const result = el('div', { class: 'result' });
    const prior = state.scores[container.dataset.quiz];
    if (prior != null) result.textContent = `Previous best: ${Math.round(prior * 100)}%`;
    const submit = el('button', { class: 'btn amber', onclick: () => {
      let correct = 0;
      container.querySelectorAll('.q').forEach((block, qi) => {
        const q = questions[qi];
        block.querySelectorAll('label').forEach((label, oi) => {
          label.classList.remove('correct', 'wrong');
          if (oi === q.answer) label.classList.add('correct');
          else if (label.querySelector('input').checked) label.classList.add('wrong');
        });
        if (block.querySelector(`input[value="${q.answer}"]`).checked) correct++;
      });
      container.classList.add('graded');
      const score = correct / questions.length;
      state.scores[container.dataset.quiz] = Math.max(score, state.scores[container.dataset.quiz] || 0);
      const passed = score >= PASS_MARK;
      if (passed) state.done[moduleId] = true;
      save(state);
      renderNav();
      result.innerHTML = `${correct} / ${questions.length} correct (${Math.round(score * 100)}%) – `
        + (passed ? '<span style="color:var(--green)">passed, module complete ✓</span>' : '<span style="color:var(--red)">read the explanations, revisit the section and try again</span>');
      if (isFinal && passed) result.innerHTML += '<div class="done-banner">Course complete. You can now run the facilitator guide with your team.</div>';
    } }, 'Submit answers');
    const reset = el('button', { class: 'btn secondary', style: 'margin-left:8px', onclick: () => {
      container.classList.remove('graded');
      container.querySelectorAll('input').forEach((i) => (i.checked = false));
      container.querySelectorAll('label').forEach((l) => l.classList.remove('correct', 'wrong'));
      result.textContent = '';
    } }, 'Reset');
    container.append(el('div', { style: 'margin-top:14px' }, submit, reset), result);
  }

  // ---------- classifier widget (used by several modules) ----------
  // items: [{text, bin, why}], bins: [{id, name, color}]
  Course.classifier = function (container, { items, bins, intro }) {
    container.classList.add('classifier');
    let selected = null;
    const pool = el('div', { class: 'items' });
    const score = el('div', { class: 'verdict info' }, 'Click an item, then click the box it belongs to.');
    const shuffled = items.map((it, idx) => ({ ...it, idx })).sort(() => Math.random() - 0.5);
    const placed = new Map();
    const binEls = {};
    if (intro) container.append(el('p', { class: 'sim-intro' }, intro));
    container.append(pool);
    const binsWrap = el('div', { class: 'bins' });
    for (const b of bins) {
      const body = el('div');
      const binEl = el('div', { class: 'bin', onclick: () => {
        if (!selected) return;
        placed.set(selected.idx, b.id);
        selected.node.remove();
        const ok = selected.bin === b.id;
        const placedItem = el('div', { class: `item ${ok ? 'right' : 'wrong'}` }, selected.text,
          el('div', { class: 'why' }, (ok ? '✓ ' : `✗ belongs in "${bins.find((x) => x.id === selected.bin).name}". `) + (selected.why || '')));
        body.append(placedItem);
        selected = null;
        update();
      } }, el('h6', {}, el('span', { class: 'swatch', style: `background:${b.color || '#C9D3DE'}` }), b.name), body);
      binEls[b.id] = binEl;
      binsWrap.append(binEl);
    }
    container.append(binsWrap, score,
      el('button', { class: 'btn secondary small', onclick: () => { container.innerHTML = ''; Course.classifier(container, { items, bins, intro }); } }, 'Shuffle & restart'));
    for (const it of shuffled) {
      const node = el('div', { class: 'item', onclick: () => {
        pool.querySelectorAll('.item').forEach((n) => n.classList.remove('selected'));
        node.classList.add('selected');
        selected = { ...it, node };
      } }, it.text);
      pool.append(node);
    }
    function update() {
      let right = 0;
      placed.forEach((binId, idx) => { if (items[idx].bin === binId) right++; });
      if (placed.size === items.length) {
        score.className = `verdict ${right === items.length ? 'good' : 'bad'}`;
        score.textContent = `${right} / ${items.length} correct. ${right === items.length ? 'Excellent – you can teach this one.' : 'Read the explanations under the red items, then restart.'}`;
      } else {
        score.textContent = `${placed.size} / ${items.length} placed, ${right} correct so far.`;
      }
    }
  };

  // ---------- navigation ----------
  const LEVELS = ['Start', 'Foundation', 'Practitioner', 'Expert', 'Leader'];
  let current = null;

  function renderNav() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    nav.innerHTML = '';
    for (const level of LEVELS) {
      const mods = Course.modules.filter((m) => m.level === level);
      if (!mods.length) continue;
      nav.append(el('div', { class: 'nav-level' }, level));
      for (const m of mods) {
        nav.append(el('a', { href: `#${m.id}`, class: [m.id === current ? 'active' : '', state.done[m.id] ? 'done' : ''].join(' ') },
          el('span', { class: 'num' }, state.done[m.id] ? '✓' : String(m.num)), el('span', {}, m.title)));
      }
    }
    const total = Course.modules.length;
    const done = Course.modules.filter((m) => state.done[m.id]).length;
    document.querySelector('.progress-bar > div').style.width = `${(done / total) * 100}%`;
    document.querySelector('.progress-label').innerHTML = `<span>${done} / ${total} modules</span><span>${Math.round((done / total) * 100)}%</span>`;
  }

  function show(id) {
    const idx = Math.max(0, Course.modules.findIndex((m) => m.id === id));
    const m = Course.modules[idx];
    current = m.id;
    const main = document.querySelector('main');
    main.innerHTML = '';
    main.append(
      el('header', { class: 'module-header' },
        el('div', { class: 'meta' },
          el('span', { class: `chip level-${m.level}` }, m.level),
          el('span', { class: 'chip' }, `Module ${m.num}`),
          el('span', { class: 'chip' }, `≈ ${m.minutes} min`)),
        el('h2', {}, m.title),
        el('p', { class: 'lead' }, m.lead)),
      el('div', { class: 'content', html: m.html }),
    );
    const content = main.querySelector('.content');
    if (!content.querySelector('[data-quiz]')) {
      content.append(el('div', { style: 'margin-top:30px' }, state.done[m.id]
        ? el('div', { class: 'done-banner' }, 'Module complete ✓')
        : el('button', { class: 'btn teal', onclick: () => { Course.markDone(m.id); show(m.id); } }, 'Mark this module complete')));
    }
    const prev = Course.modules[idx - 1];
    const next = Course.modules[idx + 1];
    main.append(el('div', { class: 'module-nav' },
      prev ? el('a', { class: 'btn secondary', href: `#${prev.id}` }, `← ${prev.num}. ${prev.title}`) : el('span'),
      next ? el('a', { class: 'btn', href: `#${next.id}` }, `${next.num}. ${next.title} →`) : el('span')));

    content.querySelectorAll('[data-sim]').forEach((node) => {
      const init = Course.sims[node.dataset.sim];
      node.classList.add('sim');
      if (init) {
        try { init(node); } catch (e) { node.append(el('div', { class: 'verdict bad' }, 'Simulator failed: ' + e.message)); console.error(e); }
      } else node.append(el('div', { class: 'verdict bad' }, 'Unknown simulator ' + node.dataset.sim));
    });
    decorateCode(content);
    lightbox(content);
    content.querySelectorAll('[data-quiz]').forEach((q) => renderQuiz(q, m.id));
    renderNav();
    window.scrollTo(0, 0);
    document.title = `${m.num}. ${m.title} – DDD · Clean Architecture · Micronaut`;
  }

  function route() {
    const id = location.hash.slice(1);
    show(Course.modules.some((m) => m.id === id) ? id : Course.modules[0].id);
  }

  document.addEventListener('DOMContentLoaded', () => {
    Course.modules.sort((a, b) => a.num - b.num);
    document.querySelector('#reset-progress')?.addEventListener('click', () => {
      if (confirm('Clear all progress and quiz scores?')) { state = { done: {}, scores: {} }; save(state); route(); }
    });
    window.addEventListener('hashchange', route);
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      const idx = Course.modules.findIndex((m) => m.id === current);
      if (e.key === 'ArrowRight' && e.altKey && Course.modules[idx + 1]) location.hash = Course.modules[idx + 1].id;
      if (e.key === 'ArrowLeft' && e.altKey && Course.modules[idx - 1]) location.hash = Course.modules[idx - 1].id;
    });
    route();
  });
})();
