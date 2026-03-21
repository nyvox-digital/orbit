/* ─────────────────────────────────────
   KREIO — App Controller
   ───────────────────────────────────── */

const App = (() => {

  // ── State ──────────────────────────────────────────────
  let results = [];       // { url, dataURL, text, slideType }
  let currentSlide = 0;
  let currentBriefing = {};

  // ── DOM refs ───────────────────────────────────────────
  const $ = id => document.getElementById(id);

  // ── Init ───────────────────────────────────────────────
  function init() {
    autoResize($('ta'));
    Agent.start();
  }

  // ── Session reset ──────────────────────────────────────
  function newSession() {
    $('msgs').innerHTML = '';
    results = [];
    currentSlide = 0;
    currentBriefing = {};

    // Reset preview
    $('preview-empty').style.display = 'flex';
    $('preview-content').style.display = 'none';

    Agent.start();
  }

  // ── Input handling ─────────────────────────────────────
  function send() {
    const ta = $('ta');
    const text = ta.value.trim();
    if (!text) return;
    ta.value = '';
    autoResize(ta);
    Agent.receive(text);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  function setInputEnabled(enabled) {
    const ta = $('ta');
    const btn = $('send-btn');
    ta.disabled = !enabled;
    btn.disabled = !enabled;
  }

  // ── Message rendering ──────────────────────────────────

  function addAIMessage(text, chips = []) {
    const msgs = $('msgs');

    const wrap = document.createElement('div');
    wrap.className = 'msg-wrap ai';

    // Avatar
    const av = document.createElement('div');
    av.className = 'msg-av';
    av.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5z" fill="url(#av${Date.now()})"/>
      <defs><linearGradient id="av${Date.now()}" x1="2" y1="7" x2="22" y2="7"><stop stop-color="#818CF8"/><stop offset="1" stop-color="#06B6D4"/></linearGradient></defs>
    </svg>`;

    // Body
    const body = document.createElement('div');
    body.className = 'msg-body';

    // Bubble
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = formatText(text);
    body.appendChild(bubble);

    // Chips
    if (chips.length > 0) {
      const chipsRow = document.createElement('div');
      chipsRow.className = 'chips';
      chipsRow.dataset.group = 'chips-' + Date.now();

      for (const chip of chips) {
        const btn = document.createElement('button');
        btn.className = `chip ${chip.cls || ''}`.trim();
        btn.textContent = chip.label;
        if (chip.multiselect) btn.dataset.multiselect = '1';
        if (chip.key) btn.dataset.key = chip.key;

        btn.addEventListener('click', () => {
          if (chip.multiselect) {
            // toggle selection visually
            btn.classList.toggle('selected');
            chip.action();
          } else {
            chip.action();
          }
        });

        chipsRow.appendChild(btn);
      }

      body.appendChild(chipsRow);
    }

    wrap.appendChild(av);
    wrap.appendChild(body);
    msgs.appendChild(wrap);
    scrollToBottom();
  }

  function addUserMessage(text) {
    const msgs = $('msgs');

    const wrap = document.createElement('div');
    wrap.className = 'msg-wrap usr';

    const body = document.createElement('div');
    body.className = 'msg-body';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    body.appendChild(bubble);

    wrap.appendChild(body);
    msgs.appendChild(wrap);
    scrollToBottom();
  }

  function addSummaryCard(briefing, platformLabels, chips = []) {
    const msgs = $('msgs');

    const wrap = document.createElement('div');
    wrap.className = 'msg-wrap ai';

    const av = document.createElement('div');
    av.className = 'msg-av';

    const body = document.createElement('div');
    body.className = 'msg-body';

    // Intro bubble
    const intro = document.createElement('div');
    intro.className = 'bubble';
    intro.innerHTML = 'Perfeito! Aqui está o resumo do seu criativo 📋';
    body.appendChild(intro);

    // Summary card
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.innerHTML = `
      <div class="summary-card-header">Resumo do briefing</div>
      ${row('📌 Negócio',    briefing.business   || '—')}
      ${row('🛠️ Serviços',  briefing.services   || '—')}
      ${row('👤 Público',   briefing.audience   || '—')}
      ${row('📱 Plataforma', platformLabels      || '—')}
      ${row('🎯 Objetivo',  briefing.objective  || '—')}
      ${row('🎨 Estilo',    briefing.style      || 'Automático')}
      ${row('✍️ Texto',     briefing.text       || '—')}
    `;
    body.appendChild(card);

    // Chips
    if (chips.length > 0) {
      const chipsRow = document.createElement('div');
      chipsRow.className = 'chips';
      for (const chip of chips) {
        const btn = document.createElement('button');
        btn.className = `chip ${chip.cls || ''}`.trim();
        btn.textContent = chip.label;
        btn.addEventListener('click', () => {
          disableChips();
          chip.action();
        });
        chipsRow.appendChild(btn);
      }
      body.appendChild(chipsRow);
    }

    wrap.appendChild(av);
    wrap.appendChild(body);
    msgs.appendChild(wrap);
    scrollToBottom();
  }

  function row(key, val) {
    return `<div class="summary-row"><span class="summary-key">${key}</span><span class="summary-val">${val}</span></div>`;
  }

  function disableChips() {
    document.querySelectorAll('.chip:not([data-multiselect])').forEach(c => {
      c.disabled = true;
      c.style.pointerEvents = 'none';
      c.style.opacity = '0.4';
    });
  }

  // ── Typing indicator ───────────────────────────────────

  function showTyping() {
    const msgs = $('msgs');
    const wrap = document.createElement('div');
    wrap.className = 'typing-wrap';
    wrap.id = 'typing-indicator';

    const av = document.createElement('div');
    av.className = 'msg-av';

    const bub = document.createElement('div');
    bub.className = 'typing-bub';
    bub.innerHTML = '<span class="t-dot"></span><span class="t-dot"></span><span class="t-dot"></span>';

    wrap.appendChild(av);
    wrap.appendChild(bub);
    msgs.appendChild(wrap);
    scrollToBottom();
  }

  function hideTyping() {
    const el = $('typing-indicator');
    if (el) el.remove();
  }

  // ── Preview: Loading ───────────────────────────────────

  function showPreviewLoading() {
    $('preview-empty').style.display = 'none';
    $('preview-content').style.display = 'flex';
    $('stage-loading').style.display = 'flex';
    $('main-canvas').style.display = 'none';
    $('gen-bar').style.width = '0%';
    resetCarouselNav();
  }

  function updateGenLabel(text) {
    $('gen-label').textContent = text;
  }

  function updateGenProgress(pct) {
    $('gen-bar').style.width = `${pct}%`;
    $('gen-bar').style.transition = 'width 0.4s ease';
  }

  // ── Preview: Render results ────────────────────────────

  async function renderResults(imgs, briefing) {
    currentBriefing = briefing;
    results = [];
    currentSlide = 0;

    const canvas = $('main-canvas');

    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      updateGenLabel(`Aplicando textos — arte ${i + 1} de ${imgs.length}...`);
      updateGenProgress(88 + (i / imgs.length) * 12);

      try {
        const dataURL = await Canvas.render(
          img.url,
          { ...briefing, text: img.text },
          canvas,
          img.slideType === 'desenvolvimento' ? img.text : null
        );
        results.push({ ...img, dataURL });
      } catch (err) {
        console.error('Canvas render error:', err);
        results.push({ ...img, dataURL: null });
      }
    }

    // Show first result
    $('stage-loading').style.display = 'none';
    showSlide(0);

    // Update platform badge
    const platform = briefing.platforms?.[0] || 'instagram_feed';
    const labels = {
      instagram_feed:      '📸 Instagram Feed',
      instagram_stories:   '📖 Instagram Stories',
      instagram_carrossel: '🔄 Carrossel',
      meta_ads:            '📣 Meta Ads',
      tiktok_ads:          '🎵 TikTok Ads',
      pinterest_ads:       '📌 Pinterest Ads',
    };
    $('preview-platform-badge').textContent = labels[platform] || platform;

    // Setup carousel nav if multiple slides
    if (results.length > 1) {
      setupCarouselNav();
    }
  }

  function showSlide(index) {
    if (index < 0 || index >= results.length) return;
    currentSlide = index;

    const canvas = $('main-canvas');
    const result = results[index];

    if (result.dataURL) {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        canvas.style.display = 'block';
      };
      img.src = result.dataURL;
    } else {
      // Show placeholder if generation failed
      canvas.style.display = 'block';
      const ctx = canvas.getContext('2d');
      canvas.width = 1080; canvas.height = 1080;
      ctx.fillStyle = '#0D0D1F';
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = '#4B5563';
      ctx.font = '700 32px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Erro ao gerar imagem', 540, 540);
    }

    // Update counter
    if (results.length > 1) {
      $('slide-counter').textContent = `${index + 1} / ${results.length}`;
      updateStripDots(index);
    }
  }

  function setupCarouselNav() {
    $('btn-prev').style.display = 'flex';
    $('btn-next').style.display = 'flex';
    $('slide-counter').style.display = 'inline';
    $('slide-counter').textContent = `1 / ${results.length}`;

    // Build dot strip
    const stage = $('preview-stage');
    let strip = document.getElementById('carousel-strip');
    if (!strip) {
      strip = document.createElement('div');
      strip.className = 'carousel-strip';
      strip.id = 'carousel-strip';
      stage.appendChild(strip);
    }
    strip.innerHTML = results.map((_, i) =>
      `<div class="strip-dot ${i === 0 ? 'active' : ''}" onclick="App.goToSlide(${i})"></div>`
    ).join('');
  }

  function updateStripDots(index) {
    document.querySelectorAll('.strip-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  function resetCarouselNav() {
    $('btn-prev').style.display = 'none';
    $('btn-next').style.display = 'none';
    $('slide-counter').style.display = 'none';
    const strip = document.getElementById('carousel-strip');
    if (strip) strip.remove();
  }

  function prevSlide() { goToSlide(currentSlide - 1); }
  function nextSlide() { goToSlide(currentSlide + 1); }
  function goToSlide(i) {
    const n = results.length;
    showSlide((i + n) % n);
  }

  // ── Re-render text only ────────────────────────────────

  async function reRenderTextOnly(briefing) {
    const canvas = $('main-canvas');
    const result = results[currentSlide];
    if (!result) return;

    const dataURL = await Canvas.render(
      result.url,
      briefing,
      canvas
    );
    result.dataURL = dataURL;
    showSlide(currentSlide);
  }

  // ── Download ───────────────────────────────────────────

  function download() {
    const result = results[currentSlide];
    if (!result?.dataURL) return;
    const a = document.createElement('a');
    a.href = result.dataURL;
    a.download = `kreio-arte-${currentSlide + 1}.png`;
    a.click();
  }

  function downloadAll() {
    results.forEach((r, i) => {
      if (!r.dataURL) return;
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = r.dataURL;
        a.download = `kreio-arte-${i + 1}.png`;
        a.click();
      }, i * 300);
    });
  }

  // ── Helpers ───────────────────────────────────────────

  function formatText(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function scrollToBottom() {
    const msgs = $('msgs');
    requestAnimationFrame(() => {
      msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' });
    });
  }

  // ── Boot ───────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', init);

  return {
    // message
    addAIMessage,
    addUserMessage,
    addSummaryCard,
    disableChips,
    // typing
    showTyping,
    hideTyping,
    // input
    send,
    handleKey,
    autoResize,
    setInputEnabled,
    // preview
    showPreviewLoading,
    updateGenLabel,
    updateGenProgress,
    renderResults,
    reRenderTextOnly,
    showSlide,
    prevSlide,
    nextSlide,
    goToSlide,
    // download
    download,
    downloadAll,
    // session
    newSession,
  };

})();
