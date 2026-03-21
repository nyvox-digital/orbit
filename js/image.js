/* ─────────────────────────────────────
   KREIO — Image Generation Engine
   ───────────────────────────────────── */

const ImageGen = (() => {

  // Platform → canvas dimensions + DALL-E size
  const PLATFORM_SIZES = {
    'instagram_feed':      { width: 1080, height: 1080, dalleSize: '1024x1024',  ratio: '1:1 square'            },
    'instagram_stories':   { width: 1080, height: 1920, dalleSize: '1024x1792',  ratio: '9:16 vertical portrait' },
    'instagram_carrossel': { width: 1080, height: 1080, dalleSize: '1024x1024',  ratio: '1:1 square'            },
    'meta_ads':            { width: 1200, height: 628,  dalleSize: '1792x1024',  ratio: '1.91:1 landscape wide'  },
    'tiktok_ads':          { width: 1080, height: 1920, dalleSize: '1024x1792',  ratio: '9:16 vertical portrait' },
    'pinterest_ads':       { width: 1000, height: 1500, dalleSize: '1024x1792',  ratio: '2:3 vertical portrait'  },
  };

  function getPlatformSize(platform) {
    return PLATFORM_SIZES[platform] || PLATFORM_SIZES['instagram_feed'];
  }

  // ── Niche detection ──────────────────────────────────────

  function detectNiche(business, services) {
    const text = `${business} ${services}`.toLowerCase();

    if (/advog|juríd|juridi|direito|lei|processo|tribunal/i.test(text))
      return 'juridico';
    if (/saúde|saude|médic|medic|clíni|clini|dentis|hospital|consulta|enferm/i.test(text))
      return 'saude';
    if (/fitness|academia|personal|musculaç|musculac|treino|nutri|emagrec/i.test(text))
      return 'fitness';
    if (/restau|comida|lanche|pizza|sushi|hamburgu|café|cafe|padaria|doceria|bolos/i.test(text))
      return 'alimentacao';
    if (/moda|roupa|vestid|blusa|calça|calca|acessóri|acessori|bolsa|loja/i.test(text))
      return 'moda';
    if (/beleza|cabelo|unhas|estética|estetica|maquiagem|spa|salão|salao/i.test(text))
      return 'beleza';
    if (/imóvel|imovel|casa|apartamento|aluguel|corretor|imobiliária|imobiliaria/i.test(text))
      return 'imoveis';
    if (/tecnolo|software|app|sistema|progr|dev|digital|marke|agênci|agenci|design/i.test(text))
      return 'tech';
    if (/curso|aula|mentori|coach|treinamento|educaç|educac|escola|professor/i.test(text))
      return 'educacao';
    if (/financ|invest|dinheiro|renda|bolsa|cripito|contas|contabil/i.test(text))
      return 'financas';
    if (/pet|animal|veterinário|veterinario|cachorro|gato/i.test(text))
      return 'pet';

    return 'geral';
  }

  // ── Scene descriptions per niche ────────────────────────

  const NICHE_SCENES = {
    juridico: [
      'a professional lawyer in a sharp dark suit at a modern law office desk, warm lamp light, bookshelf with legal volumes in background, confident posture, selective focus on hands near open documents',
      'elegant law office interior with polished mahogany desk, justice scales, gavel on dark wood, city skyline through floor-to-ceiling window, golden hour light streaming in',
      'close-up of professional hands reviewing a legal document with a fountain pen, premium leather-bound files, shallow depth of field, warm ambient lighting',
    ],
    saude: [
      'a friendly doctor or dentist in a white coat smiling warmly at camera, modern clean clinic with soft natural light, blurred medical equipment in background',
      'bright modern clinic interior, clean white surfaces, professional medical equipment, health and wellness aesthetic, natural daylight from large windows',
      'healthcare professional in scrubs with a warm genuine smile, modern hospital corridor, soft bokeh background, trust and care atmosphere',
    ],
    fitness: [
      'an athletic person in peak performance mid-workout at a premium modern gym, dramatic side lighting from large windows, energy and determination on face, motion blur on weights',
      'close-up of athletic body in movement, dynamic action shot, gym environment with professional lighting, sweat and determination, high-contrast dramatic light',
      'modern gym interior with premium equipment, motivational space, dramatic spotlights from above, selective lighting highlighting equipment and space',
    ],
    alimentacao: [
      'stunning close-up of a beautifully plated gourmet dish on a rustic wooden table, shallow depth of field, warm soft bokeh background, food photography studio lighting',
      'fresh colorful ingredients artfully arranged on a clean kitchen counter, natural window light from the side, vibrant colors, professional food styling',
      'cozy restaurant interior with warm amber lighting, elegant table setting, wine glasses, bokeh background of other diners, romantic and inviting atmosphere',
    ],
    moda: [
      'a stylish person in modern fashion forward outfit, editorial lifestyle photo, clean white studio background, dramatic side lighting, fashion magazine quality',
      'fashionable clothing and accessories flat lay on marble surface, minimalist composition, natural diffused light, editorial styling, luxury fashion aesthetic',
      'fashion editorial shoot in an urban environment, confident model in trendy outfit, architectural background, natural light, street style magazine quality',
    ],
    beleza: [
      'glamorous beauty salon interior with modern equipment, elegant styling stations, beautiful lighting, luxury spa atmosphere, clean and sophisticated',
      'close-up beauty portrait of a woman with perfect makeup, studio softbox lighting, healthy glowing skin, salon aesthetic, beauty commercial quality',
      'professional beauty products artfully arranged on marble surface, soft diffused light, elegant minimalist composition, luxury beauty brand aesthetic',
    ],
    imoveis: [
      'stunning modern house exterior with contemporary architecture, lush landscaping, golden hour light, luxury real estate photography, wide angle lens',
      'elegant modern apartment interior with floor-to-ceiling windows, designer furniture, city view, bright natural light, interior design magazine quality',
      'aerial view of a beautiful residential neighborhood, luxury homes, manicured gardens, real estate drone photography, golden hour warm light',
    ],
    tech: [
      'young professional working on a laptop at a modern startup office, open space with plants, warm Edison bulbs, creative energetic atmosphere, natural light from windows',
      'sleek modern office with creative professionals collaborating, glass walls, whiteboards with ideas, tech startup aesthetic, bright open space',
      'close-up of hands typing on a laptop with code or design work on screen, blurred modern office background, warm ambient lighting, productivity atmosphere',
    ],
    educacao: [
      'inspiring mentor or teacher presenting to a small engaged group, modern workshop space, whiteboards with diagrams, warm inviting light, education and growth atmosphere',
      'person studying with laptop and notebook at a bright desk, books in background, focused and motivated expression, natural window light, academic aesthetic',
      'successful student or professional with certificate or diploma, confident expression, achievement moment, warm flattering light, aspirational and inspiring',
    ],
    financas: [
      'successful businessman or investor at a modern high-rise office with city view, confident posture, financial charts on screen, wealth and success aesthetic',
      'financial growth concept with upward trending charts and graphs on a modern monitor, professional office setting, strategic lighting, success and prosperity',
      'premium financial planning setup: laptop, smartphone, coffee on a luxury desk, city skyline through window, success and prosperity atmosphere',
    ],
    pet: [
      'adorable happy pet (dog or cat) with owner in a bright home setting, warm natural light, genuine bond and joy, lifestyle photography quality',
      'professional veterinarian in white coat gently examining a cute pet, modern clean clinic, warm caring atmosphere, trust and expertise',
      'cute pet in a charming lifestyle setting, soft natural light, bokeh background, warm tones, emotional connection and joy',
    ],
    geral: [
      'confident entrepreneur smiling in a modern professional setting, warm ambient light, success and approachability, commercial photography quality',
      'professional lifestyle photo in a contemporary workspace, person engaged in work, natural light, productive and aspirational atmosphere',
      'clean professional product or service showcase with modern aesthetic, studio lighting, high quality commercial photography',
    ],
  };

  // ── Style modifiers ──────────────────────────────────────

  const STYLE_MODIFIERS = {
    'moderno':  'clean modern minimalist aesthetic, contemporary design, crisp sharp details, minimal color palette with one bold accent',
    'colorido': 'vibrant bold color palette, high saturation, energetic and dynamic composition, eye-catching visual impact',
    'elegante': 'sophisticated and understated elegance, muted refined tones, luxury brand aesthetic, tasteful restraint',
    'jovem':    'youthful energetic atmosphere, trendy Gen-Z aesthetic, bold and dynamic, social media native visual language',
    'auto':     'professional commercial photography aesthetic, balanced composition, broad visual appeal',
  };

  // ── Objective modifiers ──────────────────────────────────

  const OBJECTIVE_MODIFIERS = {
    'vender':    'conversion-focused composition, persuasive and aspirational visual, product benefit clearly implied',
    'seguidores':'highly engaging and shareable aesthetic, visually striking, scroll-stopping composition',
    'leads':     'professional and trustworthy visual language, credibility-building atmosphere, approachable expert tone',
    'promocao':  'exciting promotional energy, urgency implied through dynamic composition, attention-grabbing visual',
  };

  // ── Build DALL-E prompt ──────────────────────────────────

  function buildPrompt(briefing, slideContext = null) {
    const niche = detectNiche(briefing.business || '', briefing.services || '');
    const scenes = NICHE_SCENES[niche] || NICHE_SCENES.geral;

    // Pick scene — rotate based on slideContext index or random
    const idx = slideContext?.index ?? Math.floor(Math.random() * scenes.length);
    const scene = scenes[idx % scenes.length];

    const styleKey = getStyleKey(briefing.style);
    const styleMod = STYLE_MODIFIERS[styleKey] || STYLE_MODIFIERS.auto;

    const objKey = getObjectiveKey(briefing.objective);
    const objMod = OBJECTIVE_MODIFIERS[objKey] || '';

    const platform = briefing.platforms?.[0] || 'instagram_feed';
    const dims = PLATFORM_SIZES[platform] || PLATFORM_SIZES.instagram_feed;
    const ratioDesc = dims.ratio;

    const lightingOptions = [
      'warm golden hour light from a large window',
      'professional studio softbox lighting with subtle fill light',
      'dramatic Rembrandt lighting with beautiful shadow falloff',
      'bright airy natural light with soft diffused shadows',
      'cinematic side lighting with rich contrast and depth',
    ];
    const lighting = lightingOptions[Math.floor(Math.random() * lightingOptions.length)];

    return [
      `Professional commercial stock photography style.`,
      scene + '.',
      `${styleMod}.`,
      objMod ? objMod + '.' : '',
      `${lighting}.`,
      `Composition optimized for ${ratioDesc} format with visual breathing room at the lower portion for text overlay.`,
      `Freepik and Shutterstock premium stock photo aesthetic.`,
      `Shot on Canon EOS R5 or Sony A7R V, tack-sharp focus, beautiful bokeh background, rich color depth.`,
      `Photorealistic, high resolution, commercial advertising quality.`,
      `Absolutely NO text, NO words, NO letters, NO numbers, NO watermarks, NO logos anywhere in the image.`,
    ].filter(Boolean).join(' ');
  }

  function getStyleKey(label) {
    if (!label) return 'auto';
    const l = label.toLowerCase();
    if (l.includes('moderno') || l.includes('clean')) return 'moderno';
    if (l.includes('colorido') || l.includes('vibrante')) return 'colorido';
    if (l.includes('elegante')) return 'elegante';
    if (l.includes('jovem') || l.includes('descolado')) return 'jovem';
    return 'auto';
  }

  function getObjectiveKey(label) {
    if (!label) return '';
    const l = label.toLowerCase();
    if (l.includes('vend') || l.includes('produto')) return 'vender';
    if (l.includes('seguid')) return 'seguidores';
    if (l.includes('lead') || l.includes('contato')) return 'leads';
    if (l.includes('promo')) return 'promocao';
    return '';
  }

  // ── API call ─────────────────────────────────────────────

  async function generateImage(briefing, slideContext = null) {
    const prompt = buildPrompt(briefing, slideContext);
    const platform = briefing.platforms?.[0] || 'instagram_feed';
    const dims = PLATFORM_SIZES[platform] || PLATFORM_SIZES.instagram_feed;

    const body = {
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: dims.dalleSize,
      quality: 'hd',
      style: 'vivid',
    };

    const res = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Image API error: ${res.status}`);
    const data = await res.json();
    return data.data?.[0]?.url;
  }

  // ── Generate text suggestions via Claude ─────────────────

  async function generateTextSuggestions(briefing) {
    const prompt = `Você é um copywriter especialista em anúncios de alto impacto para redes sociais brasileiras.

Briefing:
- Negócio: ${briefing.business}
- Serviços: ${briefing.services}
- Público: ${briefing.audience}
- Objetivo: ${briefing.objective}
- Estilo: ${briefing.style}

Gere EXATAMENTE 3 opções de headline curto e impactante para artes de anúncio (máximo 6 palavras cada).
Deve ser direto, poderoso, memorável.

Retorne SOMENTE JSON válido:
{"sugestoes": ["texto1", "texto2", "texto3"]}`;

    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
        system: 'Você é especialista em copywriting para anúncios. Responda SOMENTE JSON válido.',
      }),
    });

    if (!res.ok) throw new Error('Claude API error');
    const data = await res.json();
    const raw = data.content?.[0]?.text || '{"sugestoes":[]}';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return parsed.sugestoes || [];
  }

  // ── Parse adjustment command via Claude ─────────────────

  async function parseAdjustment(userMessage, briefing) {
    const prompt = `O usuário quer ajustar um criativo gerado. Analise o pedido e retorne o que deve ser alterado.

Pedido: "${userMessage}"

Briefing atual:
- Texto: ${briefing.text}
- Estilo: ${briefing.style}
- Plataforma: ${briefing.platforms?.join(', ')}
- Objetivo: ${briefing.objective}

Retorne SOMENTE JSON:
{
  "action": "regenerate_image" | "update_text" | "change_platform" | "change_style" | "regenerate_all",
  "newText": "novo texto se mudar" | null,
  "newStyle": "novo estilo se mudar" | null,
  "newPlatform": "nova plataforma se mudar" | null,
  "promptModifier": "instrução adicional para nova imagem" | null
}`;

    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
        system: 'Responda SOMENTE JSON válido.',
      }),
    });

    if (!res.ok) return { action: 'regenerate_all' };
    const data = await res.json();
    const raw = data.content?.[0]?.text || '{}';
    try {
      return JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      return { action: 'regenerate_all' };
    }
  }

  return {
    generateImage,
    generateTextSuggestions,
    parseAdjustment,
    getPlatformSize,
    PLATFORM_SIZES,
  };

})();
