/* ─────────────────────────────────────
   KREIO — Conversation Agent
   State machine for 10-step designer chat
   ───────────────────────────────────── */

const Agent = (() => {

  // ── State ──────────────────────────────────────────────

  let state = 'IDLE';
  let briefing = {};
  let pendingPlatforms = new Set();
  let textSuggestions = [];

  const STATES = {
    IDLE:            'IDLE',
    BUSINESS:        'BUSINESS',
    CONFIRM_BIZ:     'CONFIRM_BIZ',
    SERVICES:        'SERVICES',
    AUDIENCE:        'AUDIENCE',
    PLATFORM:        'PLATFORM',
    CAROUSEL_SLIDES: 'CAROUSEL_SLIDES',
    OBJECTIVE:       'OBJECTIVE',
    STYLE:           'STYLE',
    TEXT:            'TEXT',
    CUSTOM_TEXT:     'CUSTOM_TEXT',
    CONFIRM_BRIEF:   'CONFIRM_BRIEF',
    ADJUST_FIELD:    'ADJUST_FIELD',
    GENERATING:      'GENERATING',
    DONE:            'DONE',
    ADJUSTING:       'ADJUSTING',
  };

  // ── Platform labels ────────────────────────────────────

  const PLATFORM_KEYS = {
    '📸 Instagram Feed':      'instagram_feed',
    '📖 Instagram Stories':   'instagram_stories',
    '🔄 Instagram Carrossel': 'instagram_carrossel',
    '📣 Meta Ads':            'meta_ads',
    '🎵 TikTok Ads':          'tiktok_ads',
    '📌 Pinterest Ads':       'pinterest_ads',
  };

  const PLATFORM_LABELS = Object.fromEntries(
    Object.entries(PLATFORM_KEYS).map(([k, v]) => [v, k])
  );

  // ── Public: start ──────────────────────────────────────

  function start() {
    state = STATES.BUSINESS;
    briefing = { platforms: [] };
    pendingPlatforms = new Set();
    textSuggestions = [];

    App.addAIMessage(
      `Oi! 👋 Eu sou o Kreio, seu designer com IA.\n\nVou criar artes incríveis para suas redes sociais e anúncios.\n\nPrimeiro: qual é o seu negócio ou profissão?`
    );
  }

  // ── Public: receive user text ──────────────────────────

  async function receive(text) {
    if (!text.trim()) return;
    App.addUserMessage(text);
    App.setInputEnabled(false);

    try {
      await route(text.trim());
    } catch (err) {
      console.error(err);
      App.addAIMessage('Ops, algo deu errado. Pode tentar de novo? 😅');
    } finally {
      if (state !== STATES.GENERATING) {
        App.setInputEnabled(true);
      }
    }
  }

  // ── Route by state ────────────────────────────────────

  async function route(text) {
    switch (state) {

      case STATES.BUSINESS: {
        briefing.business = text;
        state = STATES.CONFIRM_BIZ;
        App.showTyping();
        await delay(700);
        App.hideTyping();
        App.addAIMessage(
          `Legal! Então você trabalha com **${text}**. Tá certo isso? 😊`,
          [
            { label: '✅ Sim, exato!',       cls: 'confirm',       action: () => chipConfirmBiz(true) },
            { label: '✏️ Deixa eu corrigir', cls: 'outline-red',   action: () => chipConfirmBiz(false) },
          ]
        );
        break;
      }

      case STATES.CONFIRM_BIZ: {
        // free text = correction
        briefing.business = text;
        state = STATES.CONFIRM_BIZ;
        App.showTyping();
        await delay(600);
        App.hideTyping();
        App.addAIMessage(
          `Entendido! Então é **${text}**. Certo agora? 😊`,
          [
            { label: '✅ Sim, exato!',       cls: 'confirm',     action: () => chipConfirmBiz(true) },
            { label: '✏️ Deixa eu corrigir', cls: 'outline-red', action: () => chipConfirmBiz(false) },
          ]
        );
        break;
      }

      case STATES.SERVICES: {
        briefing.services = text;
        await goToAudience();
        break;
      }

      case STATES.AUDIENCE: {
        briefing.audience = text;
        await goToPlatform();
        break;
      }

      case STATES.CAROUSEL_SLIDES: {
        const n = parseInt(text.replace(/\D/g, ''));
        briefing.carouselSlides = isNaN(n) || n < 2 ? 3 : Math.min(n, 10);
        await goToObjective();
        break;
      }

      case STATES.CUSTOM_TEXT: {
        briefing.text = text;
        await goToConfirm();
        break;
      }

      case STATES.ADJUST_FIELD: {
        await handleAdjustField(text);
        break;
      }

      case STATES.DONE:
      case STATES.ADJUSTING: {
        await handlePostGenFeedback(text);
        break;
      }

      default: {
        App.addAIMessage('Hmm, pode repetir? Não entendi direito 😊');
        break;
      }
    }
  }

  // ── Chip actions ──────────────────────────────────────

  async function chipConfirmBiz(correct) {
    App.disableChips();
    if (correct) {
      App.addUserMessage('✅ Sim, exato!');
      await goToServices();
    } else {
      App.addUserMessage('✏️ Deixa eu corrigir');
      state = STATES.CONFIRM_BIZ;
      App.showTyping();
      await delay(500);
      App.hideTyping();
      App.addAIMessage('Sem problema! Me conta de novo — qual é o seu negócio ou profissão? 😊');
      state = STATES.CONFIRM_BIZ;
    }
  }

  async function chipPlatform(key, label) {
    if (pendingPlatforms.has(key)) {
      pendingPlatforms.delete(key);
    } else {
      pendingPlatforms.add(key);
    }
    // visual toggle handled by App
  }

  async function chipPlatformConfirm() {
    if (pendingPlatforms.size === 0) {
      App.addAIMessage('Escolhe pelo menos uma plataforma! 👇');
      return;
    }
    App.disableChips();
    briefing.platforms = [...pendingPlatforms];

    const labels = briefing.platforms.map(p => PLATFORM_LABELS[p] || p).join(', ');
    App.addUserMessage(labels);

    // If carousel chosen, ask slides count
    if (briefing.platforms.includes('instagram_carrossel')) {
      state = STATES.CAROUSEL_SLIDES;
      App.showTyping();
      await delay(700);
      App.hideTyping();
      App.addAIMessage(
        'Ótimo! Para o carrossel — quantos slides você quer? 🔄',
        [
          { label: '3 slides', cls: '', action: () => chipSlides(3) },
          { label: '5 slides', cls: '', action: () => chipSlides(5) },
          { label: '7 slides', cls: '', action: () => chipSlides(7) },
          { label: '✏️ Outro número', cls: '', action: () => chipSlidesCustom() },
        ]
      );
    } else {
      briefing.carouselSlides = 1;
      await goToObjective();
    }
  }

  async function chipSlides(n) {
    App.disableChips();
    briefing.carouselSlides = n;
    App.addUserMessage(`${n} slides`);
    await goToObjective();
  }

  async function chipSlidesCustom() {
    App.disableChips();
    App.addUserMessage('Outro número');
    state = STATES.CAROUSEL_SLIDES;
    App.addAIMessage('Quantos slides você quer? (pode digitar o número 😊)');
  }

  async function chipObjective(key, label) {
    App.disableChips();
    briefing.objective = key;
    App.addUserMessage(label);
    await goToStyle();
  }

  async function chipStyle(key, label) {
    App.disableChips();
    briefing.style = key === 'auto' ? null : key;
    App.addUserMessage(label);
    await goToTextSuggestions();
  }

  async function chipTextSuggestion(text) {
    App.disableChips();
    briefing.text = text;
    App.addUserMessage(`💡 "${text}"`);

    App.showTyping();
    await delay(600);
    App.hideTyping();
    App.addAIMessage(`Ótimo! Vou usar: **"${text}"** 👌`);
    await delay(400);
    await goToConfirm();
  }

  async function chipCustomText() {
    App.disableChips();
    App.addUserMessage('✏️ Quero escrever o meu próprio');
    state = STATES.CUSTOM_TEXT;
    App.showTyping();
    await delay(500);
    App.hideTyping();
    App.addAIMessage('Claro! Qual texto você quer colocar na arte? ✍️');
  }

  async function chipGenerate() {
    App.disableChips();
    App.addUserMessage('🚀 Pode gerar!');
    await generate();
  }

  async function chipAdjust() {
    App.disableChips();
    App.addUserMessage('✏️ Quero ajustar algo');
    state = STATES.ADJUST_FIELD;
    App.showTyping();
    await delay(500);
    App.hideTyping();
    App.addAIMessage(
      'O que você quer ajustar? 😊',
      [
        { label: '📌 Negócio',    cls: '', action: () => adjustField('business')  },
        { label: '🛠️ Serviços',   cls: '', action: () => adjustField('services')  },
        { label: '👤 Público',    cls: '', action: () => adjustField('audience')  },
        { label: '📱 Plataforma', cls: '', action: () => adjustField('platform')  },
        { label: '🎯 Objetivo',   cls: '', action: () => adjustField('objective') },
        { label: '🎨 Estilo',     cls: '', action: () => adjustField('style')     },
        { label: '✍️ Texto',      cls: '', action: () => adjustField('text')      },
      ]
    );
  }

  async function adjustField(field) {
    App.disableChips();
    App.addUserMessage(field);

    if (field === 'platform') {
      pendingPlatforms = new Set(briefing.platforms);
      await goToPlatform();
      return;
    }
    if (field === 'objective') {
      await goToObjective();
      return;
    }
    if (field === 'style') {
      await goToStyle();
      return;
    }
    if (field === 'text') {
      await goToTextSuggestions();
      return;
    }

    // Text fields
    const labels = {
      business: 'Qual é o seu negócio ou profissão?',
      services: 'Quais são os principais serviços ou produtos?',
      audience: 'Como é o seu cliente ideal?',
    };

    state = `ADJUST_${field.toUpperCase()}`;
    App.showTyping();
    await delay(500);
    App.hideTyping();
    App.addAIMessage(labels[field] || 'Me diz o que quer mudar 😊');

    // override state to catch next input
    state = STATES.ADJUST_FIELD;
    Agent._adjustTarget = field;
  }

  async function handleAdjustField(text) {
    const target = Agent._adjustTarget;
    if (target) {
      briefing[target] = text;
      Agent._adjustTarget = null;
    }
    await goToConfirm();
  }

  // ── Flow steps ────────────────────────────────────────

  async function goToServices() {
    state = STATES.SERVICES;
    App.showTyping();
    await delay(600);
    App.hideTyping();
    App.addAIMessage(
      'Quais são os principais serviços ou produtos que você quer divulgar? Me dá 2 ou 3 exemplos! 🙌'
    );
  }

  async function goToAudience() {
    state = STATES.AUDIENCE;
    App.showTyping();
    await delay(600);
    App.hideTyping();
    App.addAIMessage(
      'Quem você quer atingir com esse criativo?\nEx: mulheres 25-40 anos, empresários, jovens...\nComo é o seu cliente ideal? 🎯'
    );
  }

  async function goToPlatform() {
    state = STATES.PLATFORM;
    App.showTyping();
    await delay(600);
    App.hideTyping();

    const platformChips = [
      ...Object.entries(PLATFORM_KEYS).map(([label, key]) => ({
        label,
        cls: pendingPlatforms.has(key) ? 'selected' : '',
        multiselect: true,
        action: () => chipPlatform(key, label),
        key,
      })),
      { label: '✅ Confirmar escolha', cls: 'confirm', action: () => chipPlatformConfirm() },
    ];

    App.addAIMessage('Onde essa arte vai aparecer? 👇\n(Pode escolher mais de uma!)', platformChips);
  }

  async function goToObjective() {
    state = STATES.OBJECTIVE;
    App.showTyping();
    await delay(600);
    App.hideTyping();
    App.addAIMessage(
      'Qual é o objetivo principal dessa arte? 🚀',
      [
        { label: '💰 Vender produto/serviço', cls: '', action: () => chipObjective('vender', '💰 Vender produto/serviço') },
        { label: '👥 Ganhar seguidores',      cls: '', action: () => chipObjective('seguidores', '👥 Ganhar seguidores') },
        { label: '📩 Gerar leads/contatos',   cls: '', action: () => chipObjective('leads', '📩 Gerar leads/contatos') },
        { label: '🔥 Divulgar uma promoção',  cls: '', action: () => chipObjective('promocao', '🔥 Divulgar uma promoção') },
      ]
    );
  }

  async function goToStyle() {
    state = STATES.STYLE;
    App.showTyping();
    await delay(600);
    App.hideTyping();
    App.addAIMessage(
      'Tem alguma preferência de estilo visual? 🎨',
      [
        { label: '✨ Moderno e clean',      cls: '', action: () => chipStyle('moderno',  '✨ Moderno e clean') },
        { label: '🌈 Colorido e vibrante',  cls: '', action: () => chipStyle('colorido', '🌈 Colorido e vibrante') },
        { label: '💎 Elegante e sóbrio',    cls: '', action: () => chipStyle('elegante', '💎 Elegante e sóbrio') },
        { label: '🔥 Jovem e descolado',    cls: '', action: () => chipStyle('jovem',    '🔥 Jovem e descolado') },
        { label: '🎲 Você escolhe!',        cls: '', action: () => chipStyle('auto',     '🎲 Você escolhe!') },
      ]
    );
  }

  async function goToTextSuggestions() {
    state = STATES.TEXT;
    App.showTyping();
    await delay(800);
    App.hideTyping();

    // Generate suggestions via Claude
    App.addAIMessage('Gerando sugestões de texto... ✨');
    App.showTyping();

    try {
      textSuggestions = await ImageGen.generateTextSuggestions(briefing);
    } catch {
      textSuggestions = [`${briefing.business} — Resultados que transformam`, 'A solução que você precisava', 'Qualidade e confiança em primeiro lugar'];
    }

    App.hideTyping();

    const chips = [
      ...textSuggestions.map(s => ({
        label: `💡 "${s}"`,
        cls: 'suggestion',
        action: () => chipTextSuggestion(s),
      })),
      { label: '✏️ Quero escrever o meu próprio', cls: '', action: () => chipCustomText() },
    ];

    App.addAIMessage('Aqui vão algumas sugestões para te inspirar! ✍️', chips);
  }

  async function goToConfirm() {
    state = STATES.CONFIRM_BRIEF;
    App.showTyping();
    await delay(700);
    App.hideTyping();

    const platformLabels = (briefing.platforms || [])
      .map(p => PLATFORM_LABELS[p] || p)
      .join(', ');

    App.addSummaryCard(briefing, platformLabels, [
      { label: '🚀 Pode gerar!',      cls: 'confirm',     action: () => chipGenerate() },
      { label: '✏️ Quero ajustar algo', cls: 'outline-red', action: () => chipAdjust() },
    ]);
  }

  // ── Generate ─────────────────────────────────────────

  async function generate() {
    state = STATES.GENERATING;
    App.setInputEnabled(false);
    App.showPreviewLoading();

    const isCarousel = briefing.platforms?.includes('instagram_carrossel');
    const slideCount = isCarousel ? (briefing.carouselSlides || 3) : 1;

    // Build slide briefings
    const slides = [];
    if (isCarousel) {
      const slideTexts = buildCarouselTexts(briefing, slideCount);
      for (let i = 0; i < slideCount; i++) {
        slides.push({ ...briefing, text: slideTexts[i], slideIndex: i, slideType: getSlideType(i, slideCount) });
      }
    } else {
      slides.push({ ...briefing, slideIndex: 0 });
    }

    // Generate all images
    const results = [];
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      App.updateGenLabel(
        isCarousel
          ? `Gerando slide ${i + 1} de ${slides.length}...`
          : 'Gerando sua arte...'
      );
      App.updateGenProgress((i / slides.length) * 85);

      try {
        const imgUrl = await ImageGen.generateImage(slide, { index: i });
        results.push({ url: imgUrl, text: slide.text, subtext: slide.subtext || null, slideType: slide.slideType });
      } catch (err) {
        console.error('Image gen error:', err);
        results.push({ url: null, text: slide.text, slideType: slide.slideType, error: true });
      }
    }

    App.updateGenProgress(100);
    await delay(300);

    // Render on canvas
    await App.renderResults(results, briefing);

    state = STATES.DONE;
    App.setInputEnabled(true);

    App.addAIMessage(
      `Aqui está${isCarousel ? ' seu carrossel' : ' sua arte'}! 🎉\n\nGostou? Se quiser ajustar algo, é só me falar!\nPor exemplo:\n• "Muda o texto para..."\n• "Quero cores mais escuras"\n• "Gera para Stories também"\n• "Outra versão"`
    );
  }

  function buildCarouselTexts(briefing, count) {
    const base = briefing.services || briefing.business;
    const texts = [briefing.text || briefing.business];

    // Middle slides: benefits/points
    const midSlides = count - 2;
    for (let i = 0; i < midSlides; i++) {
      texts.push(`Benefício ${i + 1}: ${base}`);
    }
    // Last: CTA
    const ctas = {
      vender: 'Compre agora e transforme seu resultado!',
      seguidores: 'Siga e não perca nenhuma novidade!',
      leads: 'Entre em contato e saiba mais!',
      promocao: 'Aproveite a promoção — por tempo limitado!',
    };
    texts.push(ctas[briefing.objective] || 'Fale comigo agora!');

    return texts.slice(0, count);
  }

  function getSlideType(index, total) {
    if (index === 0) return 'capa';
    if (index === total - 1) return 'cta';
    return 'desenvolvimento';
  }

  // ── Post-gen feedback ──────────────────────────────────

  async function handlePostGenFeedback(text) {
    state = STATES.ADJUSTING;
    App.setInputEnabled(false);
    App.showTyping();

    const adjustment = await ImageGen.parseAdjustment(text, briefing);
    App.hideTyping();

    if (adjustment.newText) briefing.text = adjustment.newText;
    if (adjustment.newStyle) briefing.style = adjustment.newStyle;
    if (adjustment.newPlatform) briefing.platforms = [adjustment.newPlatform];

    const action = adjustment.action;

    if (action === 'update_text') {
      App.addAIMessage(`Atualizando o texto para: **"${briefing.text}"** ✍️`);
      App.setInputEnabled(false);
      await App.reRenderTextOnly(briefing);
      state = STATES.DONE;
      App.setInputEnabled(true);
      App.addAIMessage('Pronto! Ficou melhor? 😊');
    } else {
      App.addAIMessage('Deixa eu gerar uma nova versão... 🎨');
      await delay(400);
      await generate();
    }
  }

  // ── Helpers ───────────────────────────────────────────

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ── Public API ────────────────────────────────────────

  return {
    start,
    receive,
    getBriefing: () => briefing,
    getState: () => state,
    _adjustTarget: null,
  };

})();
