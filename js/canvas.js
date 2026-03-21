/* ─────────────────────────────────────
   KREIO — Canvas Text Overlay Engine
   ───────────────────────────────────── */

const Canvas = (() => {

  // Style configs: font, layout, overlay
  const STYLE_CONFIG = {
    'moderno':    { fontFamily: 'Inter', weight: '700', headlineSize: 0.062, bodySize: 0.032, textColor: '#FFFFFF', shadowBlur: 18, overlayStyle: 'gradient-bottom' },
    'colorido':   { fontFamily: 'Syne',  weight: '800', headlineSize: 0.072, bodySize: 0.034, textColor: '#FFFFFF', shadowBlur: 24, overlayStyle: 'gradient-bottom' },
    'elegante':   { fontFamily: 'Inter', weight: '300', headlineSize: 0.052, bodySize: 0.028, textColor: '#FFFFFF', shadowBlur: 10, overlayStyle: 'dark-vignette' },
    'jovem':      { fontFamily: 'Syne',  weight: '900', headlineSize: 0.08,  bodySize: 0.036, textColor: '#FFFFFF', shadowBlur: 30, overlayStyle: 'gradient-center' },
    'auto':       { fontFamily: 'Inter', weight: '700', headlineSize: 0.065, bodySize: 0.033, textColor: '#FFFFFF', shadowBlur: 20, overlayStyle: 'gradient-bottom' },
  };

  // Accent color per style
  const ACCENT_COLORS = {
    'moderno':  '#818CF8',
    'colorido': '#06B6D4',
    'elegante': '#F1F5F9',
    'jovem':    '#FBBF24',
    'auto':     '#818CF8',
  };

  function getStyleKey(styleLabel) {
    if (!styleLabel) return 'auto';
    const l = styleLabel.toLowerCase();
    if (l.includes('moderno') || l.includes('clean')) return 'moderno';
    if (l.includes('colorido') || l.includes('vibrante')) return 'colorido';
    if (l.includes('elegante') || l.includes('s') && l.includes('brio')) return 'elegante';
    if (l.includes('jovem') || l.includes('descolado')) return 'jovem';
    return 'auto';
  }

  // Fetch image through CORS proxy and return ImageBitmap
  async function loadImage(url) {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(blobUrl); resolve(img); };
      img.onerror = reject;
      img.src = blobUrl;
    });
  }

  // Draw overlay based on style
  function drawOverlay(ctx, w, h, overlayStyle) {
    if (overlayStyle === 'gradient-bottom') {
      const g = ctx.createLinearGradient(0, h * 0.4, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.45)');
      g.addColorStop(1, 'rgba(0,0,0,0.82)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    } else if (overlayStyle === 'dark-vignette') {
      const g = ctx.createRadialGradient(w/2, h/2, h*0.2, w/2, h/2, h*0.85);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Also darken bottom
      const g2 = ctx.createLinearGradient(0, h*0.5, 0, h);
      g2.addColorStop(0, 'rgba(0,0,0,0)');
      g2.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
    } else if (overlayStyle === 'gradient-center') {
      const g = ctx.createLinearGradient(0, h*0.3, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0.1)');
      g.addColorStop(1, 'rgba(0,0,0,0.88)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Wrap text to fit within maxWidth
  function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // Draw accent line (decorative underline)
  function drawAccentLine(ctx, x, y, width, color) {
    const g = ctx.createLinearGradient(x, y, x + width, y);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(6,182,212,0.5)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
  }

  /**
   * Main function: overlay text on a DALL-E image
   * @param {string} imageUrl  - URL from DALL-E API
   * @param {object} briefing  - { text, style, platform, objective, business }
   * @param {HTMLCanvasElement} canvas
   * @param {string} [subtext] - optional subtext (for carousel body)
   * @returns {Promise<string>} dataURL
   */
  async function render(imageUrl, briefing, canvas, subtext = null) {
    const styleKey = getStyleKey(briefing.style);
    const cfg = STYLE_CONFIG[styleKey];
    const accent = ACCENT_COLORS[styleKey];

    // Determine canvas dimensions from platform
    const dims = ImageGen.getPlatformSize(briefing.platforms?.[0] || 'instagram_feed');
    canvas.width  = dims.width;
    canvas.height = dims.height;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // 1. Draw background image
    let img;
    try {
      img = await loadImage(imageUrl);
    } catch(e) {
      // Fallback: draw a gradient background
      const fbg = ctx.createLinearGradient(0, 0, W, H);
      fbg.addColorStop(0, '#0D0D1F');
      fbg.addColorStop(1, '#06060F');
      ctx.fillStyle = fbg;
      ctx.fillRect(0, 0, W, H);
    }

    if (img) {
      // Cover-fit the image
      const scale = Math.max(W / img.width, H / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      const sx = (W - sw) / 2;
      const sy = (H - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh);
    }

    // 2. Draw overlay
    drawOverlay(ctx, W, H, cfg.overlayStyle);

    // 3. Text setup
    const margin = W * 0.09;
    const maxTextWidth = W - margin * 2;

    // Headline
    const headlineSize = Math.round(W * cfg.headlineSize);
    ctx.font = `${cfg.weight} ${headlineSize}px '${cfg.fontFamily}', sans-serif`;
    ctx.fillStyle = cfg.textColor;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = cfg.shadowBlur;
    ctx.textBaseline = 'alphabetic';

    const headlineText = briefing.text || 'Seu texto aqui';
    const headlineLines = wrapText(ctx, headlineText.toUpperCase(), maxTextWidth);
    const lineH = headlineSize * 1.2;
    const headlineBlockH = headlineLines.length * lineH;

    // Body text (optional)
    const bodySize = Math.round(W * cfg.bodySize);
    let bodyLines = [];
    let bodyBlockH = 0;
    if (subtext) {
      ctx.font = `400 ${bodySize}px '${cfg.fontFamily}', sans-serif`;
      bodyLines = wrapText(ctx, subtext, maxTextWidth);
      bodyBlockH = bodyLines.length * (bodySize * 1.4) + bodySize * 0.6;
    }

    // CTA badge
    const cta = getCTA(briefing);
    const ctaH = cta ? bodySize * 2.2 : 0;

    // Total text block height
    const accentLineH = 14;
    const totalBlock = headlineBlockH + accentLineH + bodyBlockH + ctaH + (subtext ? 16 : 0);

    // Position: bottom third, or vertically centered
    let startY = H - margin - totalBlock;
    if (startY < H * 0.45) startY = H * 0.45;

    // 4. Draw headline lines
    ctx.font = `${cfg.weight} ${headlineSize}px '${cfg.fontFamily}', sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = cfg.shadowBlur;
    let curY = startY;
    for (const line of headlineLines) {
      ctx.fillText(line, margin, curY);
      curY += lineH;
    }

    // 5. Accent underline
    curY += 6;
    drawAccentLine(ctx, margin, curY, Math.min(maxTextWidth * 0.45, 160), accent);
    curY += accentLineH + 8;

    // 6. Body text
    if (subtext) {
      ctx.font = `400 ${bodySize}px '${cfg.fontFamily}', sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.shadowBlur = 10;
      for (const line of bodyLines) {
        ctx.fillText(line, margin, curY);
        curY += bodySize * 1.4;
      }
      curY += 16;
    }

    // 7. CTA badge
    if (cta) {
      ctx.shadowBlur = 0;
      const badgePadX = Math.round(bodySize * 0.9);
      const badgePadY = Math.round(bodySize * 0.5);
      const badgeH = Math.round(bodySize * 2);
      const badgeW = Math.round(ctx.measureText(cta).width) + badgePadX * 2;

      // Draw pill background
      const gBadge = ctx.createLinearGradient(margin, curY - badgeH + badgePadY, margin + badgeW, curY - badgeH + badgePadY);
      gBadge.addColorStop(0, '#818CF8');
      gBadge.addColorStop(1, '#06B6D4');
      ctx.fillStyle = gBadge;
      roundRect(ctx, margin, curY - badgeH + badgePadY, badgeW, badgeH, badgeH / 2);
      ctx.fill();

      // CTA text on badge
      ctx.font = `700 ${Math.round(bodySize * 0.95)}px '${cfg.fontFamily}', sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(cta, margin + badgePadX, curY - badgeH + badgePadY + badgeH / 2);
      ctx.textBaseline = 'alphabetic';
    }

    // 8. Kreio watermark (bottom right)
    ctx.shadowBlur = 0;
    const wmSize = Math.max(10, Math.round(W * 0.022));
    ctx.font = `700 ${wmSize}px 'Syne', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textBaseline = 'alphabetic';
    const wmText = 'KREIO';
    const wmW = ctx.measureText(wmText).width;
    ctx.fillText(wmText, W - margin - wmW, H - margin * 0.5);

    return canvas.toDataURL('image/png');
  }

  function getCTA(briefing) {
    if (!briefing.objective) return null;
    const obj = briefing.objective.toLowerCase();
    if (obj.includes('vend')) return '→ Comprar agora';
    if (obj.includes('seguid')) return '→ Seguir perfil';
    if (obj.includes('lead') || obj.includes('contato')) return '→ Fale conosco';
    if (obj.includes('promo')) return '→ Ver promoção';
    return null;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI/2, 0);
    ctx.lineTo(x + w, y + h - r);
    ctx.arc(x + w - r, y + h - r, r, 0, Math.PI/2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + h - r, r, Math.PI/2, Math.PI);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, -Math.PI/2);
    ctx.closePath();
  }

  return { render };

})();
