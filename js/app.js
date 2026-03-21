/* ─────────────────────────────────────
   KREIO — App Controller
   ───────────────────────────────────── */

const App = (() => {

  let results         = [];
  let currentSlide    = 0;
  let currentBriefing = {};
  let sessionId       = null;

  const $        = id => document.getElementById(id);
  const el       = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
  const isMobile = () => window.innerWidth <= 768;
  /* global Canvas */ // definido em canvas.js

  // ── Init ───────────────────────────────────────────────
  function init() {
    sessionId = 'session_' + Date.now();
    renderHistory();
    autoResize($('ta'));
    Agent.start();
  }

  // ══════════════════════════════════════
  // HISTORY
  // ══════════════════════════════════════

  function newSession() {
    if (currentBriefing.business) saveCurrentSession();
    $('msgs').innerHTML = '';
    results = []; currentSlide = 0; currentBriefing = {};
    sessionId = 'session_' + Date.now();
    closePreview();
    closeHistory();
    Agent.start();
  }

  function saveCurrentSession() {
    if (!currentBriefing.business) return;
    const sessions = getSessions();
    const entry = {
      id:       sessionId,
      title:    currentBriefing.business,
      platform: (currentBriefing.platforms || [])[0] || '',
      date:     new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    };
    const updated = [entry, ...sessions.filter(s => s.id !== entry.id)].slice(0, 20);
    localStorage.setItem('kreio_sessions', JSON.stringify(updated));
    renderHistory();
  }

  function getSessions() {
    try { return JSON.parse(localStorage.getItem('kreio_sessions') || '[]'); }
    catch { return []; }
  }

  function renderHistory() {
    const list = $('conv-list');
    const sessions = getSessions();
    if (!sessions.length) {
      list.innerHTML = '<div class="conv-empty">Nenhuma conversa ainda</div>';
      return;
    }
    const EMOJI = { instagram_feed:'📸', instagram_stories:'📖', instagram_carrossel:'🔄', meta_ads:'📣', tiktok_ads:'🎵', pinterest_ads:'📌' };
    list.innerHTML = sessions.map(s => `
      <div class="conv-item ${s.id === sessionId ? 'active' : ''}" onclick="App.loadSession('${s.id}')">
        <div class="conv-icon">${EMOJI[s.platform] || '🎨'}</div>
        <div class="conv-info">
          <div class="conv-title">${escapeHtml(s.title)}</div>
          <div class="conv-date">${s.date}</div>
        </div>
      </div>`).join('');
  }

  function loadSession() { closeHistory(); newSession(); }

  function toggleHistory() {
    const panel   = $('history-panel');
    const overlay = $('history-overlay');
    const isOpen  = panel.classList.contains('open');
    panel.classList.toggle('open', !isOpen);
    overlay.classList.toggle('visible', !isOpen);
  }

  function closeHistory() {
    $('history-panel').classList.remove('open');
    $('history-overlay').classList.remove('visible');
  }

  // ══════════════════════════════════════
  // PREVIEW PANEL (desktop only)
  // ══════════════════════════════════════

  function openPreview() {
    $('workspace').classList.add('preview-open');
  }

  function closePreview() {
    $('workspace').classList.remove('preview-open');
  }

  // ══════════════════════════════════════
  // INPUT
  // ══════════════════════════════════════

  function send() {
    const ta = $('ta');
    const text = ta.value.trim();
    if (!text) return;
    ta.value = '';
    autoResize(ta);
    Agent.receive(text);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  function setInputEnabled(enabled) {
    const ta = $('ta'), btn = $('send-btn');
    ta.disabled = !enabled;
    btn.disabled = !enabled;
    if (enabled) ta.focus();
  }

  // ══════════════════════════════════════
  // MESSAGES
  // ══════════════════════════════════════

  function addAIMessage(text, chips = []) {
    const msgs = $('msgs');
    const wrap = el('div', 'msg-wrap ai');
    const av   = el('div', 'msg-av');
    av.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="url(#avG)"/><defs><linearGradient id="avG" x1="2" y1="7" x2="22" y2="7"><stop stop-color="#818CF8"/><stop offset="1" stop-color="#06B6D4"/></linearGradient></defs></svg>`;

    const body   = el('div', 'msg-body');
    const bubble = el('div', 'bubble');
    bubble.innerHTML = formatText(text);
    body.appendChild(bubble);

    if (chips.length) {
      const row = el('div', 'chips');
      chips.forEach(chip => {
        const btn = el('button', `chip ${chip.cls || ''}`.trim());
        btn.textContent = chip.label;
        if (chip.multiselect) btn.dataset.multiselect = '1';
        if (chip.key)         btn.dataset.key = chip.key;
        btn.addEventListener('click', () => {
          if (chip.multiselect) btn.classList.toggle('selected');
          chip.action();
        });
        row.appendChild(btn);
      });
      body.appendChild(row);
    }

    wrap.appendChild(av);
    wrap.appendChild(body);
    msgs.appendChild(wrap);
    scrollToBottom();
  }

  function addUserMessage(text) {
    const msgs = $('msgs');
    const wrap = el('div', 'msg-wrap usr');
    const body = el('div', 'msg-body');
    const bub  = el('div', 'bubble');
    bub.textContent = text;
    body.appendChild(bub);
    wrap.appendChild(body);
    msgs.appendChild(wrap);
    scrollToBottom();
    if (currentBriefing.business) saveCurrentSession();
  }

  function addSummaryCard(briefing, platformLabels, chips = []) {
    currentBriefing = briefing;
    const msgs = $('msgs');
    const wrap = el('div', 'msg-wrap ai');
    const av   = el('div', 'msg-av');
    const body = el('div', 'msg-body');

    const intro = el('div', 'bubble');
    intro.innerHTML = 'Perfeito! Aqui está o resumo do seu criativo 📋';
    body.appendChild(intro);

    const card = el('div', 'summary-card');
    card.innerHTML = `
      <div class="summary-card-header">Resumo do briefing</div>
      ${srow('📌 Negócio',    briefing.business  || '—')}
      ${srow('🛠️ Serviços',  briefing.services  || '—')}
      ${srow('👤 Público',   briefing.audience  || '—')}
      ${srow('📱 Plataforma', platformLabels     || '—')}
      ${srow('🎯 Objetivo',  briefing.objective || '—')}
      ${srow('🎨 Estilo',    briefing.style     || 'Automático')}
      ${srow('✍️ Texto',     briefing.text      || '—')}
    `;
    body.appendChild(card);

    if (chips.length) {
      const row = el('div', 'chips');
      chips.forEach(chip => {
        const btn = el('button', `chip ${chip.cls || ''}`.trim());
        btn.textContent = chip.label;
        btn.addEventListener('click', () => { disableChips(); chip.action(); });
        row.appendChild(btn);
      });
      body.appendChild(row);
    }

    wrap.appendChild(av);
    wrap.appendChild(body);
    msgs.appendChild(wrap);
    scrollToBottom();
  }

  function srow(k, v) {
    return `<div class="summary-row"><span class="summary-key">${k}</span><span class="summary-val">${escapeHtml(String(v))}</span></div>`;
  }

  function disableChips() {
    document.querySelectorAll('.chip:not([data-multiselect])').forEach(c => { c.disabled = true; });
  }

  // ── Typing ─────────────────────────────────────────────

  function showTyping() {
    if ($('typing-indicator')) return;
    const msgs = $('msgs');
    const wrap = el('div', 'typing-wrap');
    wrap.id = 'typing-indicator';
    const av  = el('div', 'msg-av');
    const bub = el('div', 'typing-bub');
    bub.innerHTML = '<span class="t-dot"></span><span class="t-dot"></span><span class="t-dot"></span>';
    wrap.appendChild(av); wrap.appendChild(bub);
    msgs.appendChild(wrap);
    scrollToBottom();
  }

  function hideTyping() {
    const e = $('typing-indicator');
    if (e) e.remove();
  }

  // ══════════════════════════════════════
  // PREVIEW / GENERATION
  // ══════════════════════════════════════

  function showPreviewLoading() {
    if (!isMobile()) {
      // Desktop: abre painel lateral
      openPreview();
      $('stage-loading').style.display = 'flex';
      $('main-canvas').style.display   = 'none';
      $('gen-bar').style.width         = '0%';
      resetCarouselNav();
    }
    // Mobile: não faz nada aqui, o progresso vai aparecer no chat via mensagem
  }

  function updateGenLabel(text) {
    if (!isMobile()) $('gen-label').textContent = text;
  }

  function updateGenProgress(pct) {
    if (!isMobile()) {
      $('gen-bar').style.width      = `${pct}%`;
      $('gen-bar').style.transition = 'width 0.4s ease';
    }
  }

  async function renderResults(imgs, briefing) {
    currentBriefing = briefing;
    results = []; currentSlide = 0;

    const LABELS = {
      instagram_feed:'📸 Instagram Feed', instagram_stories:'📖 Instagram Stories',
      instagram_carrossel:'🔄 Carrossel', meta_ads:'📣 Meta Ads',
      tiktok_ads:'🎵 TikTok Ads', pinterest_ads:'📌 Pinterest Ads',
    };
    const platformLabel = LABELS[(briefing.platforms || [])[0]] || 'Criativo';

    if (!isMobile()) {
      $('preview-platform-badge').textContent = platformLabel;
    }

    const canvas = $('main-canvas');

    for (let i = 0; i < imgs.length; i++) {
      updateGenLabel(`Aplicando textos — arte ${i + 1} de ${imgs.length}...`);
      updateGenProgress(88 + (i / imgs.length) * 12);
      try {
        const dataURL = await Canvas.render(
          imgs[i].url,
          { ...briefing, text: imgs[i].text },
          canvas,
          imgs[i].slideType === 'desenvolvimento' ? imgs[i].text : null
        );
        results.push({ ...imgs[i], dataURL });
      } catch (err) {
        console.error('Canvas render error:', err);
        results.push({ ...imgs[i], dataURL: null });
      }
    }

    if (isMobile()) {
      // Mobile: renderiza inline no chat
      renderInlineCard(results, briefing, platformLabel);
    } else {
      // Desktop: mostra no painel lateral
      $('stage-loading').style.display = 'none';
      showSlide(0);
      if (results.length > 1) {
        setupCarouselNav();
        $('btn-download-all').style.display = 'flex';
      }
    }

    saveCurrentSession();
  }

  /* ── Inline card para mobile ── */
  function renderInlineCard(imgs, briefing, platformLabel) {
    let idx = 0;
    const msgs = $('msgs');
    const wrap = el('div', 'msg-wrap ai');
    const av   = el('div', 'msg-av');
    const body = el('div', 'msg-body');

    const card = el('div', 'art-card');

    // Image element
    const imgEl = el('img', '');
    imgEl.style.display = 'block';
    if (imgs[0]?.dataURL) imgEl.src = imgs[0].dataURL;
    else imgEl.alt = 'Erro ao gerar';
    card.appendChild(imgEl);

    // Nav bar
    const nav = el('div', 'art-card-nav');

    const counter = el('span', 'art-card-counter');
    counter.textContent = imgs.length > 1 ? `1 / ${imgs.length}` : platformLabel;

    const actions = el('div', 'art-card-actions');

    if (imgs.length > 1) {
      const prevBtn = el('button', 'art-card-btn');
      prevBtn.innerHTML = '←';
      prevBtn.addEventListener('click', () => {
        idx = (idx - 1 + imgs.length) % imgs.length;
        if (imgs[idx]?.dataURL) imgEl.src = imgs[idx].dataURL;
        counter.textContent = `${idx + 1} / ${imgs.length}`;
      });

      const nextBtn = el('button', 'art-card-btn');
      nextBtn.innerHTML = '→';
      nextBtn.addEventListener('click', () => {
        idx = (idx + 1) % imgs.length;
        if (imgs[idx]?.dataURL) imgEl.src = imgs[idx].dataURL;
        counter.textContent = `${idx + 1} / ${imgs.length}`;
      });

      actions.appendChild(prevBtn);
      actions.appendChild(nextBtn);
    }

    const dlBtn = el('button', 'art-card-btn primary');
    dlBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Baixar`;
    dlBtn.addEventListener('click', () => {
      const r = imgs[idx];
      if (!r?.dataURL) return;
      const a = document.createElement('a');
      a.href = r.dataURL; a.download = `kreio-arte-${idx + 1}.png`; a.click();
    });
    actions.appendChild(dlBtn);

    nav.appendChild(counter);
    nav.appendChild(actions);
    card.appendChild(nav);

    body.appendChild(card);
    wrap.appendChild(av);
    wrap.appendChild(body);
    msgs.appendChild(wrap);
    scrollToBottom();
  }

  /* ── Desktop slides ── */
  function showSlide(index) {
    if (index < 0 || index >= results.length) return;
    currentSlide = index;
    const canvas = $('main-canvas');
    const result = results[index];

    if (result.dataURL) {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width; canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        canvas.style.display = 'block';
      };
      img.src = result.dataURL;
    } else {
      canvas.style.display = 'block';
      canvas.width = 1080; canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0D0D1F';
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = '#3D4A5C';
      ctx.font = '600 28px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Erro ao gerar imagem', 540, 540);
    }

    if (results.length > 1) {
      $('slide-counter').textContent = `${index + 1} / ${results.length}`;
      updateStripDots(index);
    }
  }

  function setupCarouselNav() {
    $('btn-prev').style.display      = 'flex';
    $('btn-next').style.display      = 'flex';
    $('slide-counter').style.display = 'inline';
    $('slide-counter').textContent   = `1 / ${results.length}`;

    const stage = $('preview-stage');
    let strip = document.getElementById('carousel-strip');
    if (!strip) { strip = el('div', 'carousel-strip'); strip.id = 'carousel-strip'; stage.appendChild(strip); }
    strip.innerHTML = results.map((_, i) =>
      `<div class="strip-dot ${i === 0 ? 'active' : ''}" onclick="App.goToSlide(${i})"></div>`
    ).join('');
  }

  function updateStripDots(i) {
    document.querySelectorAll('.strip-dot').forEach((d, j) => d.classList.toggle('active', i === j));
  }

  function resetCarouselNav() {
    $('btn-prev').style.display = $('btn-next').style.display = 'none';
    $('slide-counter').style.display = 'none';
    if ($('btn-download-all')) $('btn-download-all').style.display = 'none';
    const strip = document.getElementById('carousel-strip');
    if (strip) strip.remove();
  }

  function prevSlide() { goToSlide(currentSlide - 1); }
  function nextSlide() { goToSlide(currentSlide + 1); }
  function goToSlide(i) { showSlide((i + results.length) % results.length); }

  async function reRenderTextOnly(briefing) {
    const result = results[currentSlide];
    if (!result) return;
    const canvas = $('main-canvas');
    const dataURL = await Canvas.render(result.url, briefing, canvas);
    result.dataURL = dataURL;
    showSlide(currentSlide);
  }

  // ══════════════════════════════════════
  // DOWNLOAD (desktop)
  // ══════════════════════════════════════

  function download() {
    const r = results[currentSlide];
    if (!r?.dataURL) return;
    const a = document.createElement('a');
    a.href = r.dataURL; a.download = `kreio-arte-${currentSlide + 1}.png`; a.click();
  }

  function downloadAll() {
    results.forEach((r, i) => {
      if (!r.dataURL) return;
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = r.dataURL; a.download = `kreio-arte-${i + 1}.png`; a.click();
      }, i * 350);
    });
  }

  // ── Helpers ────────────────────────────────────────────

  function formatText(t) {
    return t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function scrollToBottom() {
    const msgs = $('msgs');
    requestAnimationFrame(() => msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' }));
  }

  // ── Boot ───────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  return {
    addAIMessage, addUserMessage, addSummaryCard, disableChips,
    showTyping, hideTyping,
    send, handleKey, autoResize, setInputEnabled,
    showPreviewLoading, updateGenLabel, updateGenProgress,
    renderResults, reRenderTextOnly,
    showSlide, prevSlide, nextSlide, goToSlide,
    download, downloadAll,
    newSession, loadSession, renderHistory,
    toggleHistory, closePreview,
    mobileTab: () => {},
  };

})();
